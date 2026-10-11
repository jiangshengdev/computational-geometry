//! Exact Bentley–Ottmann intersections of closed segments.
//!
//! Endpoint contacts, multiway crossings, vertical segments and distinct events
//! at the same sweep coordinate are supported, including positive-length
//! overlaps and duplicate inputs. Zero-length inputs participate as points;
//! empty and singleton collections return no pairs.
//!
//! An invertible exact shear (x, y) -> (x + s*y, y) avoids vertical segments in
//! sweep coordinates; s is bounded from input coordinates to preserve original
//! event order, without enumerating intersections. Point events group all
//! incident segments. Only adjacent active segments schedule future crossings;
//! pair enumeration is confined to segments incident at one event. Overlapping
//! pairs emit their full interval at its beginning, never fragments at later
//! endpoints or crossings. Coincident active segments retain separate identities.
//! Point inputs join their exact event but never enter the active sequence.
//! At a point inside an overlap group, all containing members participate:
//! point-member pairs are emitted while previously emitted member intervals
//! remain intact. Duplicate inputs retain their own pairs in mixed events too.
//!
//! With n inputs and k intersecting pairs, the number of events E is O(n + k).
//! Shear selection uses O(n) arithmetic operations; vector status scans and updates cost
//! O(E*n), and incident-block sorting costs O(E*n*log(n + 1)). Queue work,
//! including initialization from all n inputs, costs O((n + E)*log(E + 1)).
//! For m incident segments, each event inspects O(m*m) pairs; overlapping pairs
//! can be inspected at multiple events (including point-input events), so the
//! conservative total bound for these inspections is O(E*n*n), not O(k).
//! There are k outputs.
//! Storage is O(n + k), including the output. These operation counts exclude the
//! cost of arbitrary-precision rational arithmetic and comparisons, which
//! depends on operand bit lengths; this is not an O((n + k) log n) claim.

use std::collections::BTreeMap;

pub mod http;

mod brute_force;
pub use brute_force::brute_force_intersections;

mod validation;
pub use validation::{DuplicatePair, GeometryMismatch, ValidationReport, validate_intersections};

/// Arbitrary-precision rational coordinates; no floating-point approximation.
pub use num_rational::BigRational as Rational;

/// An exact position in the plane.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Point {
    pub x: Rational,
    pub y: Rational,
}

/// A closed segment. Endpoint order does not determine input identity.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Segment {
    pub start: Point,
    pub end: Point,
}

/// One intersecting unordered pair of original input indices.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Intersection {
    /// Indices into the input slice, in increasing order.
    pub segments: [usize; 2],
    pub geometry: Geometry,
}

/// The complete mathematical intersection of a pair of closed segments.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Geometry {
    Point(Point),
    /// A nonzero closed interval. Endpoint presentation order is not a contract.
    Overlap {
        start: Point,
        end: Point,
    },
}

struct SweepSegment {
    left: Point,
    right: Point,
    // Points have no supporting line and are removed before status insertion.
    slope: Option<Rational>,
    intercept: Rational,
}

impl SweepSegment {
    fn new(segment: &Segment, shear: &Rational) -> Self {
        let transform = |point: &Point| Point {
            x: &point.x + shear * &point.y,
            y: point.y.clone(),
        };
        let start = transform(&segment.start);
        let end = transform(&segment.end);
        let (left, right) = if start.x < end.x {
            (start, end)
        } else {
            (end, start)
        };
        let slope = (left != right).then(|| (&right.y - &left.y) / (&right.x - &left.x));
        let intercept = slope
            .as_ref()
            .map_or_else(|| left.y.clone(), |slope| &left.y - slope * &left.x);
        Self {
            left,
            right,
            slope,
            intercept,
        }
    }

    fn y_at(&self, x: &Rational) -> Rational {
        self.slope.as_ref().expect("active segment has a slope") * x + &self.intercept
    }
}

fn choose_shear(segments: &[Segment]) -> Rational {
    if !segments
        .iter()
        .any(|s| s.start.x == s.end.x && s.start.y != s.end.y)
    {
        return Rational::from_integer(0.into());
    }
    let coordinates = || {
        segments
            .iter()
            .flat_map(|s| [&s.start.x, &s.start.y, &s.end.x, &s.end.y])
    };
    // A common denominator D makes all endpoints integral.
    let mut denominator = Rational::from_integer(1.into());
    for coordinate in coordinates() {
        // Multiplication is deliberate: any common multiple is sufficient.
        denominator *= Rational::from_integer(coordinate.denom().clone());
    }
    let mut bound = Rational::from_integer(1.into());
    for coordinate in coordinates() {
        let scaled = coordinate * &denominator;
        bound = bound.max(scaled.clone()).max(-scaled);
    }
    // Let M bound the scaled endpoint coordinates. Intersection denominators
    // divide a determinant of magnitude <= 8 M^2, so distinct event x values
    // differ by >= 1/(64 M^4); event y values differ by <= 2 M. Scaling back
    // divides both bounds by D. Thus s = 1/(256 (M+1)^5) preserves every strict
    // x ordering and breaks equal x by y. Nonzero segments become nonvertical.
    // This is exact arithmetic, not a floating-point epsilon or pairwise oracle.
    let margin = bound + Rational::from_integer(1.into());
    Rational::from_integer(1.into()) / (Rational::from_integer(256.into()) * margin.pow(5))
}

#[derive(Default)]
struct Event {
    // Ends and interior crossings are recovered from the active sequence at
    // this exact point, so a discovered crossing needs no stored pair identity.
    starts: Vec<usize>,
}

fn schedule_neighbors(
    active: &[usize],
    lower: usize,
    segments: &[SweepSegment],
    current: &Point,
    queue: &mut BTreeMap<Point, Event>,
    checked: &mut Vec<[usize; 2]>,
) {
    let Some(neighbors) = active.get(lower..lower + 2) else {
        return;
    };
    checked.push([neighbors[0], neighbors[1]]);
    let (a, b) = (&segments[neighbors[0]], &segments[neighbors[1]]);
    if a.slope == b.slope {
        return;
    }
    let cross_x = (&b.intercept - &a.intercept)
        / (a.slope.as_ref().expect("active segment has a slope")
            - b.slope.as_ref().expect("active segment has a slope"));
    if cross_x < a.left.x || cross_x > a.right.x || cross_x < b.left.x || cross_x > b.right.x {
        return;
    }
    let point = Point {
        y: a.y_at(&cross_x),
        x: cross_x,
    };
    if point > *current {
        queue.entry(point).or_default();
    }
}

/// Return every intersecting input pair with its exact point or full overlap.
///
/// Input identity is the index in `segments`; results contain each unordered
/// pair once. Result order is not part of the contract. Coordinates must be
/// valid, normalized rationals (use `Rational::new` or `from_integer`, not
/// unchecked `new_raw`). See the crate documentation for the currently supported
/// input domain and cost. Zero-length segments are accepted as points.
pub fn intersections(segments: &[Segment]) -> Vec<Intersection> {
    sweep(segments, None)
}

/// Teaching snapshots expose original coordinates and lexicographic event order.
/// Captured only when requested; ordinary callers use the same exact sweep.
pub(crate) struct SweepStep {
    pub execution: Execution,
    pub phase: &'static str,
    pub action: &'static str,
    pub subjects: Vec<usize>,
    pub current: Option<Point>,
    pub pending: Vec<Point>,
    pub active: Vec<usize>,
    pub results: Vec<Intersection>,
    pub checked: Vec<[usize; 2]>,
    pub starts: Vec<usize>,
    pub ends: Vec<usize>,
    pub passes: Vec<usize>,
}

pub(crate) struct Execution {
    pub(crate) module: &'static str,
    pub(crate) boundary: Option<usize>,
    pub(crate) entry: bool,
    pub(crate) context: ExecutionContext,
}

pub(crate) struct ExecutionContext {
    pub(crate) function: &'static str,
    pub(crate) parameters: Vec<Variable>,
    pub(crate) locals: Vec<Variable>,
}

pub(crate) struct Variable {
    pub(crate) name: &'static str,
    pub(crate) r#type: &'static str,
    pub(crate) availability: &'static str,
    pub(crate) value: Option<String>,
}

impl Variable {
    fn available(name: &'static str, r#type: &'static str, value: String) -> Self {
        Self {
            name,
            r#type,
            availability: "available",
            value: Some(value),
        }
    }

    fn absent(name: &'static str, r#type: &'static str, availability: &'static str) -> Self {
        Self {
            name,
            r#type,
            availability,
            value: None,
        }
    }
}

fn point_value(point: &Point) -> String {
    format!("({}, {})", point.x, point.y)
}

fn event_value(event: &Event) -> String {
    format!("Event {{ starts: {:?} }}", event.starts)
}

impl SweepStep {
    fn capture(
        action: &'static str,
        current: Option<&Point>,
        queue: &BTreeMap<Point, Event>,
        active: &[usize],
        results: &[Intersection],
        checked: &[[usize; 2]],
        subjects: &[usize],
    ) -> Self {
        Self {
            execution: Execution {
                module: action,
                boundary: None,
                entry: true,
                context: ExecutionContext {
                    function: "sweep",
                    // The input binding has been shadowed by Vec<SweepSegment>.
                    parameters: vec![Variable::absent("segments", "&[Segment]", "unavailable")],
                    locals: vec![
                        Variable::available(
                            "queue",
                            "BTreeMap<Point, Event>",
                            format!(
                                "{{{}}}",
                                queue
                                    .iter()
                                    .map(|(point, event)| format!(
                                        "{}: {}",
                                        point_value(point),
                                        event_value(event)
                                    ))
                                    .collect::<Vec<_>>()
                                    .join(", ")
                            ),
                        ),
                        Variable::available("active", "Vec<usize>", format!("{active:?}")),
                        Variable::available(
                            "result",
                            "Vec<Intersection>",
                            format!(
                                "[{}]",
                                results
                                    .iter()
                                    .map(|intersection| {
                                        let geometry = match &intersection.geometry {
                                            Geometry::Point(point) => point_value(point),
                                            Geometry::Overlap { start, end } => format!(
                                                "{} → {}",
                                                point_value(start),
                                                point_value(end)
                                            ),
                                        };
                                        format!(
                                            "S{} × S{}: {geometry}",
                                            intersection.segments[0], intersection.segments[1]
                                        )
                                    })
                                    .collect::<Vec<_>>()
                                    .join(", ")
                            ),
                        ),
                    ],
                },
            },
            phase: match action {
                "initial" => "initial",
                "complete" => "processed",
                _ => "processing",
            },
            action,
            subjects: subjects.to_vec(),
            current: current.cloned(),
            pending: queue.keys().cloned().collect(),
            active: active.to_vec(),
            results: results.to_vec(),
            checked: checked.to_vec(),
            starts: Vec::new(),
            ends: Vec::new(),
            passes: Vec::new(),
        }
    }

    fn take_context(
        &mut self,
        boundary: usize,
        next: Option<&Option<(Point, Event)>>,
        bound: Option<(&Point, &Event)>,
        segments: &[SweepSegment],
        shear: &Rational,
    ) {
        self.execution.module = "take";
        self.execution.boundary = Some(boundary);
        self.execution.entry = boundary == 0;
        let locals = &mut self.execution.context.locals;
        locals.push(Variable::available(
            "segments",
            "Vec<SweepSegment>",
            format!(
                "[{}]",
                segments
                    .iter()
                    .map(|segment| format!(
                        "SweepSegment {{ left: {}, right: {}, slope: {}, intercept: {} }}",
                        point_value(&segment.left),
                        point_value(&segment.right),
                        segment
                            .slope
                            .as_ref()
                            .map_or_else(|| "None".to_owned(), |slope| format!("Some({slope})")),
                        segment.intercept
                    ))
                    .collect::<Vec<_>>()
                    .join(", ")
            ),
        ));
        locals.push(Variable::available("shear", "Rational", shear.to_string()));
        locals.push(match next {
            Some(next) => Variable::available(
                "next",
                "Option<(Point, Event)>",
                next.as_ref().map_or_else(
                    || "None".to_owned(),
                    |(point, event)| {
                        format!("Some(({}, {}))", point_value(point), event_value(event))
                    },
                ),
            ),
            None => Variable::absent(
                "next",
                "Option<(Point, Event)>",
                if boundary == 0 {
                    "unassigned"
                } else {
                    "unavailable"
                },
            ),
        });
        match bound {
            Some((point, event)) => {
                locals.push(Variable::available("point", "Point", point_value(point)));
                locals.push(Variable::available("event", "Event", event_value(event)));
            }
            None => {
                let availability = if boundary < 2 {
                    "unassigned"
                } else {
                    "unavailable"
                };
                locals.push(Variable::absent("point", "Point", availability));
                locals.push(Variable::absent("event", "Event", availability));
            }
        }
    }

    fn preserve_geometry(&mut self, previous: &Self) {
        self.current.clone_from(&previous.current);
        self.starts.clone_from(&previous.starts);
        self.ends.clone_from(&previous.ends);
        self.passes.clone_from(&previous.passes);
        self.checked.clone_from(&previous.checked);
        self.subjects.clone_from(&previous.subjects);
    }
}

pub(crate) struct SweepTrace {
    pub shear: Rational,
    pub steps: Vec<SweepStep>,
}

pub(crate) fn trace_intersections(segments: &[Segment]) -> (Vec<Intersection>, SweepTrace) {
    let mut trace = SweepTrace {
        shear: choose_shear(segments),
        steps: Vec::new(),
    };
    let results = sweep(segments, Some(&mut trace.steps));
    for step in &mut trace.steps {
        for point in step.current.iter_mut().chain(step.pending.iter_mut()) {
            point.x -= &trace.shear * &point.y;
        }
    }
    (results, trace)
}

fn sweep(segments: &[Segment], mut steps: Option<&mut Vec<SweepStep>>) -> Vec<Intersection> {
    let shear = choose_shear(segments);
    let segments: Vec<_> = segments
        .iter()
        .map(|segment| SweepSegment::new(segment, &shear))
        .collect();
    let mut queue: BTreeMap<Point, Event> = BTreeMap::new();
    for (id, segment) in segments.iter().enumerate() {
        queue
            .entry(segment.left.clone())
            .or_default()
            .starts
            .push(id);
        queue.entry(segment.right.clone()).or_default();
    }
    let mut active: Vec<usize> = Vec::new();
    let mut height_order = vec![std::cmp::Ordering::Equal; segments.len()];
    let mut result = Vec::new();
    if let Some(steps) = &mut steps {
        steps.push(SweepStep::capture(
            "initial",
            None,
            &queue,
            &active,
            &result,
            &[],
            &[],
        ));
    }
    loop {
        if let Some(steps) = &mut steps {
            let mut step =
                SweepStep::capture("take-entry", None, &queue, &active, &result, &[], &[]);
            step.preserve_geometry(steps.last().expect("initial snapshot exists"));
            step.take_context(0, None, None, &segments, &shear);
            steps.push(step);
        }
        let next = queue.pop_first();
        if let Some(steps) = &mut steps {
            let mut step = SweepStep::capture("take-pop", None, &queue, &active, &result, &[], &[]);
            step.preserve_geometry(steps.last().expect("entry snapshot exists"));
            step.take_context(1, Some(&next), None, &segments, &shear);
            steps.push(step);
        }
        let Some((point, event)) = next else {
            if let Some(steps) = &mut steps {
                let mut step =
                    SweepStep::capture("take-empty", None, &queue, &active, &result, &[], &[]);
                step.preserve_geometry(steps.last().expect("pop snapshot exists"));
                step.take_context(2, Some(&next), None, &segments, &shear);
                steps.push(step);
            }
            break;
        };
        let first_step = steps.as_ref().map_or(0, |steps| steps.len());
        if let Some(steps) = &mut steps {
            let mut step =
                SweepStep::capture("take", Some(&point), &queue, &active, &result, &[], &[]);
            step.take_context(2, None, Some((&point, &event)), &segments, &shear);
            steps.push(step);
        }
        let mut incident = event.starts;
        // Every active segment spans the current x. Recover the whole equal-y
        // block, including unscheduled participants in a multiway crossing.
        // Refresh every active entry for this event before consulting it. Only
        // its ordering against the event height is needed by the later removal
        // and insertion searches; newly starting segments are not read here.
        for &id in &active {
            height_order[id] = segments[id].y_at(&point.x).cmp(&point.y);
            if height_order[id].is_eq() {
                incident.push(id);
            }
        }
        // Capture membership once from the same exact incident block used by
        // the sweep, before removals or insertions change the active state.
        let participants = steps.as_ref().map(|_| {
            let mut starts = Vec::new();
            let mut ends = Vec::new();
            let mut passes = Vec::new();
            for &id in &incident {
                if segments[id].left == point {
                    starts.push(id);
                }
                if segments[id].right == point {
                    ends.push(id);
                }
                if segments[id].left != point && segments[id].right != point {
                    passes.push(id);
                }
            }
            (starts, ends, passes)
        });
        for (i, &a) in incident.iter().enumerate() {
            for &b in &incident[i + 1..] {
                let original = |p: &Point| Point {
                    x: &p.x - &shear * &p.y,
                    y: p.y.clone(),
                };
                let geometry = if segments[a].slope == segments[b].slope {
                    // Incident segments with equal slopes lie on the same line.
                    // Emit exactly at the later start, using both original ends
                    // rather than the next event (which may involve a third input).
                    let start = (&segments[a].left).max(&segments[b].left);
                    if start != &point {
                        continue;
                    }
                    let end = (&segments[a].right).min(&segments[b].right);
                    if start < end {
                        Geometry::Overlap {
                            start: original(start),
                            end: original(end),
                        }
                    } else {
                        Geometry::Point(original(start))
                    }
                } else {
                    Geometry::Point(original(&point))
                };
                result.push(Intersection {
                    segments: [a.min(b), a.max(b)],
                    geometry,
                });
                if let Some(steps) = &mut steps {
                    steps.push(SweepStep::capture(
                        "record",
                        Some(&point),
                        &queue,
                        &active,
                        &result,
                        &[],
                        &[a, b],
                    ));
                }
            }
        }
        if let Some(steps) = &mut steps {
            let removed: Vec<_> = active
                .iter()
                .copied()
                .filter(|&id| segments[id].right == point)
                .collect();
            if !removed.is_empty() {
                active.retain(|&id| segments[id].right != point);
                steps.push(SweepStep::capture(
                    "remove",
                    Some(&point),
                    &queue,
                    &active,
                    &result,
                    &[],
                    &removed,
                ));
            }
        }
        let previous_order = steps.as_ref().map(|_| active.clone());
        active.retain(|&id| !height_order[id].is_eq());
        incident.retain(|&id| segments[id].right != point);
        incident.sort_by(|&a, &b| segments[a].slope.cmp(&segments[b].slope));
        // Equal-x events at different y remain separate. At the current y,
        // ascending slope is the order immediately after this event; other
        // equal-y blocks keep their pre-event order until their own event.
        let position = active.partition_point(|&id| height_order[id].is_lt());
        let inserted = incident.len();
        active.splice(position..position, incident);
        if let Some(steps) = &mut steps {
            let previous_order = previous_order
                .as_ref()
                .expect("tracing captures the previous order");
            let added: Vec<_> = active
                .iter()
                .copied()
                .filter(|&id| segments[id].left == point)
                .collect();
            if !added.is_empty() {
                steps.push(SweepStep::capture(
                    "insert",
                    Some(&point),
                    &queue,
                    &active,
                    &result,
                    &[],
                    &added,
                ));
            }
            let continuing: Vec<_> = active
                .iter()
                .copied()
                .filter(|id| previous_order.contains(id))
                .collect();
            if &continuing != previous_order {
                steps.push(SweepStep::capture(
                    "reorder",
                    Some(&point),
                    &queue,
                    &active,
                    &result,
                    &[],
                    &active[position..position + inserted],
                ));
            }
        }
        let mut checked = Vec::new();
        let boundaries = [
            position.checked_sub(1),
            (inserted > 0).then(|| position + inserted - 1),
        ];
        for lower in boundaries.into_iter().flatten() {
            let Some(neighbors) = active.get(lower..lower + 2) else {
                continue;
            };
            if let Some(steps) = &mut steps {
                steps.push(SweepStep::capture(
                    "check",
                    Some(&point),
                    &queue,
                    &active,
                    &result,
                    &[[neighbors[0], neighbors[1]]],
                    neighbors,
                ));
            }
            let pending_count = queue.len();
            schedule_neighbors(&active, lower, &segments, &point, &mut queue, &mut checked);
            if let Some(steps) = &mut steps
                && queue.len() > pending_count
            {
                steps.push(SweepStep::capture(
                    "discover",
                    Some(&point),
                    &queue,
                    &active,
                    &result,
                    &[[neighbors[0], neighbors[1]]],
                    neighbors,
                ));
            }
        }
        if let Some(steps) = &mut steps {
            steps.push(SweepStep::capture(
                "complete",
                Some(&point),
                &queue,
                &active,
                &result,
                &checked,
                &[],
            ));
            let (starts, ends, passes) = participants.expect("tracing captures participants");
            for step in &mut steps[first_step..] {
                step.starts.clone_from(&starts);
                step.ends.clone_from(&ends);
                step.passes.clone_from(&passes);
            }
        }
    }
    result
}
