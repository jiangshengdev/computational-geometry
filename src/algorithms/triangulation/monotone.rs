use std::cmp::Ordering;

use super::{Boundary, EventSide, zero};
use crate::algorithms::status::Status;

#[derive(Clone, Copy, PartialEq, Eq)]
enum Kind {
    Start,
    End,
    Split,
    Merge,
    Regular,
}

fn kind(boundary: &Boundary, vertex: usize) -> Kind {
    let prev = boundary.prev(vertex);
    let next = boundary.next(vertex);
    let convex = boundary.turn(prev, vertex, next) > zero();
    // A retained straight vertex is between its neighbors. Distinct sweep
    // heights therefore classify it as Regular, never as a split or merge.
    match (
        boundary.above(vertex, prev),
        boundary.above(vertex, next),
        convex,
    ) {
        (true, true, true) => Kind::Start,
        (true, true, false) => Kind::Split,
        (false, false, true) => Kind::End,
        (false, false, false) => Kind::Merge,
        (true, false, _) | (false, true, _) => Kind::Regular,
    }
}

/// Maintain the left boundary edge of each active interior interval, with its
/// lowest processed helper vertex. Every split is joined to its left helper;
/// every merge helper is joined before its interval is replaced or removed.
pub(super) fn partition(boundary: &Boundary) -> Vec<[usize; 2]> {
    let kinds: Vec<_> = (0..boundary.points.len())
        .map(|i| kind(boundary, i))
        .collect();
    let mut helper = vec![0; boundary.points.len()];
    let mut status = Status::default();
    let mut diagonals = Vec::new();
    for &vertex in &boundary.events {
        let prev = boundary.prev(vertex);
        let y = &boundary.points[vertex].y;
        let compare = |a, b| boundary.edge_order(a, b, y, EventSide::Below);
        let finish = |edge: usize, diagonals: &mut Vec<[usize; 2]>| {
            if kinds[helper[edge]] == Kind::Merge {
                diagonals.push([vertex, helper[edge]]);
            }
        };
        match kinds[vertex] {
            Kind::Start => {
                status.insert(vertex, &compare);
                helper[vertex] = vertex;
            }
            Kind::End => {
                finish(prev, &mut diagonals);
                status.remove(prev, &compare);
            }
            Kind::Split => {
                let edge = status
                    .left_of(|edge| boundary.edge_x(edge, y) < boundary.points[vertex].x)
                    .expect("split vertex has an interior interval on its left");
                diagonals.push([vertex, helper[edge]]);
                helper[edge] = vertex;
                status.insert(vertex, &compare);
                helper[vertex] = vertex;
            }
            Kind::Merge => {
                finish(prev, &mut diagonals);
                status.remove(prev, &compare);
                let edge = status
                    .left_of(|edge| boundary.edge_x(edge, y) < boundary.points[vertex].x)
                    .expect("merge vertex has an interior interval on its left");
                finish(edge, &mut diagonals);
                helper[edge] = vertex;
            }
            Kind::Regular => {
                if boundary.above(vertex, boundary.next(vertex)) {
                    finish(prev, &mut diagonals);
                    status.remove(prev, &compare);
                    status.insert(vertex, &compare);
                    helper[vertex] = vertex;
                } else {
                    let edge = status
                        .left_of(|edge| boundary.edge_x(edge, y) < boundary.points[vertex].x)
                        .expect("right-chain vertex has an interior interval on its left");
                    finish(edge, &mut diagonals);
                    helper[edge] = vertex;
                }
            }
        }
    }
    diagonals
}

/// A rotation system builds every bounded face without repeatedly searching
/// the polygon. Half-edges are stored in twin pairs; the predecessor of the
/// incoming twin in CCW angular order keeps the traversed face on the left.
pub(super) fn faces(boundary: &Boundary, diagonals: &[[usize; 2]]) -> Vec<Vec<usize>> {
    let n = boundary.points.len();
    let mut edges = Vec::with_capacity(2 * (n + diagonals.len()));
    let mut outgoing = vec![Vec::new(); n];
    for [a, b] in (0..n)
        .map(|i| [i, boundary.next(i)])
        .chain(diagonals.iter().copied())
    {
        let index = edges.len();
        edges.push([a, b]);
        edges.push([b, a]);
        outgoing[a].push(index);
        outgoing[b].push(index + 1);
    }
    let mut next = vec![0; edges.len()];
    for (vertex, incident) in outgoing.iter_mut().enumerate() {
        incident.sort_unstable_by(|&a, &b| angle_order(boundary, vertex, edges[a][1], edges[b][1]));
        for i in 0..incident.len() {
            next[incident[i] ^ 1] = incident[(i + incident.len() - 1) % incident.len()];
        }
    }
    let mut visited = vec![false; edges.len()];
    let mut faces = Vec::new();
    for start in 0..edges.len() {
        if visited[start] {
            continue;
        }
        let mut face = Vec::new();
        let mut cursor = start;
        let mut area = zero();
        while !visited[cursor] {
            visited[cursor] = true;
            let [a, b] = edges[cursor];
            face.push(a);
            area += &boundary.points[a].x * &boundary.points[b].y
                - &boundary.points[a].y * &boundary.points[b].x;
            cursor = next[cursor];
        }
        if area > zero() {
            faces.push(face);
        }
    }
    faces
}

fn angle_order(boundary: &Boundary, origin: usize, a: usize, b: usize) -> Ordering {
    let upper = |vertex: usize| {
        let p = &boundary.points[vertex];
        let o = &boundary.points[origin];
        p.y > o.y || (p.y == o.y && p.x > o.x)
    };
    upper(b)
        .cmp(&upper(a))
        .then_with(|| boundary.turn(origin, b, a).cmp(&zero()))
        .then(a.cmp(&b))
}

pub(super) fn triangulate_face(boundary: &Boundary, face: &[usize], output: &mut Vec<[usize; 3]>) {
    let n = face.len();
    let top = (0..n)
        .max_by(|&a, &b| boundary.points[face[a]].y.cmp(&boundary.points[face[b]].y))
        .expect("nonempty face");
    let bottom = (0..n)
        .min_by(|&a, &b| boundary.points[face[a]].y.cmp(&boundary.points[face[b]].y))
        .expect("nonempty face");
    // CCW order from the top follows the left chain. Merge the two already
    // sorted chains in linear time, retaining a side tag only for interior
    // chain vertices (the extrema belong to both chains).
    let mut ordered = Vec::with_capacity(n);
    ordered.push((face[top], true));
    let mut left = (top + 1) % n;
    let mut right = (top + n - 1) % n;
    while left != bottom || right != bottom {
        if right == bottom || (left != bottom && boundary.above(face[left], face[right])) {
            ordered.push((face[left], true));
            left = (left + 1) % n;
        } else {
            ordered.push((face[right], false));
            right = (right + n - 1) % n;
        }
    }
    ordered.push((face[bottom], true));
    let mut stack = vec![ordered[0], ordered[1]];
    for i in 2..n - 1 {
        let (vertex, left_chain) = ordered[i];
        if left_chain != stack.last().expect("nonempty stack").1 {
            while stack.len() > 1 {
                let last = stack.pop().expect("stack edge").0;
                boundary.emit(vertex, last, stack.last().expect("stack edge").0, output);
            }
            stack.clear();
            stack.push(ordered[i - 1]);
            stack.push(ordered[i]);
        } else {
            let mut last = stack.pop().expect("chain predecessor");
            while let Some(&(other, _)) = stack.last() {
                let turn = boundary.turn(vertex, last.0, other);
                // Strict visibility retains collinear stack vertices. A later
                // noncollinear vertex connects them individually, preserving
                // all original boundary indices without zero-area triangles.
                let visible = if left_chain {
                    turn < zero()
                } else {
                    turn > zero()
                };
                if !visible {
                    break;
                }
                boundary.emit(vertex, last.0, other, output);
                last = stack.pop().expect("visible predecessor");
            }
            stack.push(last);
            stack.push(ordered[i]);
        }
    }
    let vertex = face[bottom];
    while stack.len() > 1 {
        let last = stack.pop().expect("final stack edge").0;
        boundary.emit(
            vertex,
            last,
            stack.last().expect("final stack edge").0,
            output,
        );
    }
}
