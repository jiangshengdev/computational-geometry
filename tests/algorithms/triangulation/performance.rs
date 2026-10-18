//! Public-API scaling workloads. Timings are observations, not complexity proofs.
//! Run the ignored measurement explicitly with --ignored --nocapture.

use std::{hint::black_box, time::Instant};

use computational_geometry::{Point, Rational, triangulate};

fn point(x: usize, y: usize) -> Point {
    Point {
        x: Rational::from_integer(x.into()),
        y: Rational::from_integer(y.into()),
    }
}

fn subdivided_rectangle(size: usize) -> Vec<Point> {
    (0..size)
        .map(|x| point(x, 0))
        .chain((0..size).map(|y| point(size, y)))
        .chain((1..=size).rev().map(|x| point(x, size)))
        .chain((1..=size).rev().map(|y| point(0, y)))
        .collect()
}

fn comb(teeth: usize) -> Vec<Point> {
    let width = 2 * teeth + 1;
    let mut input: Vec<_> = (0..=width).map(|x| point(x, 0)).collect();
    input.push(point(width, 4));
    for tooth in (1..=teeth).rev() {
        let right = 2 * tooth;
        input.extend([
            point(right, 4),
            point(right, 1),
            point(right - 1, 1),
            point(right - 1, 4),
        ]);
    }
    input.push(point(0, 4));
    input
}

fn verify(input: &[Point], triangles: &[[usize; 3]], expected_area: usize) {
    assert_eq!(triangles.len(), input.len() - 2);
    let zero = Rational::from_integer(0.into());
    let mut twice_area = zero.clone();
    let mut used = vec![false; input.len()];
    for triangle in triangles {
        for &index in triangle {
            assert!(index < input.len());
            used[index] = true;
        }
        let [a, b, c] = triangle.map(|index| &input[index]);
        let area = (&b.x - &a.x) * (&c.y - &a.y) - (&b.y - &a.y) * (&c.x - &a.x);
        assert!(area > zero);
        twice_area += area;
    }
    assert!(used.into_iter().all(|used| used));
    assert_eq!(
        twice_area,
        Rational::from_integer((2 * expected_area).into())
    );
}

#[test]
fn scale_workloads_preserve_all_vertices_and_exact_area() {
    for size in [8, 32] {
        for (input, area) in [
            (subdivided_rectangle(size), size * size),
            (comb(size), 5 * size + 4),
        ] {
            verify(&input, &triangulate(&input).unwrap(), area);
        }
    }
}

#[test]
#[ignore = "explicit scaling measurement; no wall-clock pass/fail threshold"]
fn public_api_scaling() {
    println!(
        "debug_assertions={}; durations include full API validation and triangulation, exclude input construction and result verification",
        cfg!(debug_assertions)
    );
    for size in [32, 128, 512] {
        for (name, input, area) in [
            (
                "long_collinear_rectangle",
                subdivided_rectangle(size),
                size * size,
            ),
            ("equal_height_comb", comb(size), 5 * size + 4),
        ] {
            for round in 0..3 {
                let start = Instant::now();
                let result = black_box(triangulate(black_box(&input))).unwrap();
                let elapsed = start.elapsed();
                verify(&input, &result, area);
                println!(
                    "{name} n={} triangles={} round={round} elapsed_ms={:.3}",
                    input.len(),
                    result.len(),
                    elapsed.as_secs_f64() * 1000.0
                );
            }
        }
    }
}
