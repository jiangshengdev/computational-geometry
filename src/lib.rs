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

type NeighborObserver<'a> =
    dyn FnMut(usize, &BTreeMap<Point, Event>, &[[usize; 2]], Vec<Variable>) + 'a;

fn schedule_neighbors(
    active: &[usize],
    lower: usize,
    segments: &[SweepSegment],
    current: &Point,
    queue: &mut BTreeMap<Point, Event>,
    checked: &mut Vec<[usize; 2]>,
    mut observer: Option<&mut NeighborObserver<'_>>,
) -> Option<Point> {
    macro_rules! observe_geometry {
        ($boundary:expr, $neighbors:expr, $pair:expr, $point:expr, $returned:expr) => {
            if let Some(observer) = &mut observer {
                let neighbors: Option<&[usize]> = $neighbors;
                let pair: Option<(&SweepSegment, &SweepSegment)> = $pair;
                let point: Option<&Point> = $point;
                let returned: Option<&Option<Point>> = $returned;
                let mut locals = vec![neighbors.map_or_else(
                    || Variable::absent("neighbors", "&[usize]", "unassigned"),
                    |neighbors| {
                        Variable::available("neighbors", "&[usize]", format!("{neighbors:?}"))
                    },
                )];
                for (name, segment) in [
                    ("a", pair.map(|pair| pair.0)),
                    ("b", pair.map(|pair| pair.1)),
                ] {
                    locals.push(segment.map_or_else(
                        || Variable::absent(name, "&SweepSegment", "unassigned"),
                        |segment| {
                            Variable::available(name, "&SweepSegment", sweep_segment_value(segment))
                        },
                    ));
                }
                locals.push(point.map_or_else(
                    || {
                        Variable::absent(
                            "point",
                            "Point",
                            if $boundary == 8 {
                                "unavailable"
                            } else {
                                "unassigned"
                            },
                        )
                    },
                    |point| Variable::available("point", "Point", point_value(point)),
                ));
                locals.push(returned.map_or_else(
                    || Variable::absent("return_value", "Option<Point>", "unassigned"),
                    |returned| {
                        Variable::available(
                            "return_value",
                            "Option<Point>",
                            optional_point_value(returned),
                        )
                    },
                ));
                observer($boundary, queue, checked, locals);
            }
        };
    }
    observe_geometry!(0, None, None, None, None);
    let Some(neighbors) = active.get(lower..lower + 2) else {
        let return_value = None;
        observe_geometry!(1, None, None, None, Some(&return_value));
        return return_value;
    };
    observe_geometry!(1, Some(neighbors), None, None, None);
    checked.push([neighbors[0], neighbors[1]]);
    observe_geometry!(2, Some(neighbors), None, None, None);
    let (a, b) = (&segments[neighbors[0]], &segments[neighbors[1]]);
    observe_geometry!(3, Some(neighbors), Some((a, b)), None, None);
    if a.slope == b.slope {
        let return_value = None;
        observe_geometry!(4, Some(neighbors), Some((a, b)), None, Some(&return_value));
        return return_value;
    }
    let cross_x = (&b.intercept - &a.intercept)
        / (a.slope.as_ref().expect("active segment has a slope")
            - b.slope.as_ref().expect("active segment has a slope"));
    if cross_x < a.left.x || cross_x > a.right.x || cross_x < b.left.x || cross_x > b.right.x {
        let return_value = None;
        observe_geometry!(4, Some(neighbors), Some((a, b)), None, Some(&return_value));
        return return_value;
    }
    let point = Point {
        y: a.y_at(&cross_x),
        x: cross_x,
    };
    observe_geometry!(4, Some(neighbors), Some((a, b)), Some(&point), None);
    if point > *current {
        observe_geometry!(5, Some(neighbors), Some((a, b)), Some(&point), None);
        queue.entry(point.clone()).or_default();
        observe_geometry!(6, Some(neighbors), Some((a, b)), Some(&point), None);
    }
    observe_geometry!(7, Some(neighbors), Some((a, b)), Some(&point), None);
    let return_value = Some(point);
    observe_geometry!(8, Some(neighbors), Some((a, b)), None, Some(&return_value));
    return_value
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

fn optional_point_value(point: &Option<Point>) -> String {
    point.as_ref().map_or_else(
        || "None".to_owned(),
        |point| format!("Some({})", point_value(point)),
    )
}

fn sweep_segment_value(segment: &SweepSegment) -> String {
    format!(
        "SweepSegment {{ left: {}, right: {}, slope: {}, intercept: {} }}",
        point_value(&segment.left),
        point_value(&segment.right),
        segment
            .slope
            .as_ref()
            .map_or_else(|| "None".to_owned(), |slope| format!("Some({slope})")),
        segment.intercept
    )
}

fn sweep_segments_value(segments: &[SweepSegment]) -> String {
    format!(
        "[{}]",
        segments
            .iter()
            .map(sweep_segment_value)
            .collect::<Vec<_>>()
            .join(", ")
    )
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
        self.sweep_context(segments, shear);
        self.take_bindings(boundary, next, bound);
    }

    fn sweep_context(&mut self, segments: &[SweepSegment], shear: &Rational) {
        let locals = &mut self.execution.context.locals;
        locals.push(Variable::available(
            "segments",
            "Vec<SweepSegment>",
            sweep_segments_value(segments),
        ));
        locals.push(Variable::available("shear", "Rational", shear.to_string()));
    }

    fn take_bindings(
        &mut self,
        boundary: usize,
        next: Option<&Option<(Point, Event)>>,
        bound: Option<(&Point, &Event)>,
    ) {
        let locals = &mut self.execution.context.locals;
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
        // These observations execute beside the operations they describe. The
        // event-wide membership fields remain a separate teaching summary.
        macro_rules! observe {
            ($module:expr, $boundary:expr, $subjects:expr, $locals:expr) => {
                if let Some(steps) = &mut steps {
                    let mut step = SweepStep::capture(
                        "micro",
                        Some(&point),
                        &queue,
                        &active,
                        &result,
                        &[],
                        $subjects,
                    );
                    step.sweep_context(&segments, &shear);
                    step.execution.module = $module;
                    step.execution.boundary = Some($boundary);
                    step.execution.entry = $boundary == 0;
                    step.execution.context.locals.push(Variable::available(
                        "point",
                        "Point",
                        point_value(&point),
                    ));
                    step.execution.context.locals.push(Variable::available(
                        "height_order",
                        "Vec<Ordering>",
                        format!("{height_order:?}"),
                    ));
                    step.execution.context.locals.extend($locals);
                    steps.push(step);
                }
            };
        }
        observe!(
            "classify",
            0,
            &[],
            vec![
                Variable::available("event", "Event", event_value(&event)),
                Variable::absent("incident", "Vec<usize>", "unassigned"),
                Variable::absent("id", "usize", "unassigned"),
                Variable::absent("starts", "Vec<usize>", "unassigned"),
                Variable::absent("ends", "Vec<usize>", "unassigned"),
                Variable::absent("passes", "Vec<usize>", "unassigned"),
            ]
        );
        let mut incident = event.starts;
        macro_rules! classify {
            ($boundary:expr, $id:expr, $members:expr) => {
                observe!("classify", $boundary, &[], {
                    let id: Option<usize> = $id;
                    let members: Option<(&Vec<usize>, &Vec<usize>, &Vec<usize>)> = $members;
                    let mut locals = vec![
                        Variable::absent("event", "Event", "unavailable"),
                        Variable::available("incident", "Vec<usize>", format!("{incident:?}")),
                        id.map_or_else(
                            || {
                                Variable::absent(
                                    "id",
                                    "usize",
                                    if $boundary == 1 {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |id| Variable::available("id", "usize", id.to_string()),
                        ),
                    ];
                    for (name, value) in [
                        ("starts", members.map(|members| members.0)),
                        ("ends", members.map(|members| members.1)),
                        ("passes", members.map(|members| members.2)),
                    ] {
                        locals.push(value.map_or_else(
                            || Variable::absent(name, "Vec<usize>", "unassigned"),
                            |value| Variable::available(name, "Vec<usize>", format!("{value:?}")),
                        ));
                    }
                    locals
                });
            };
        }
        classify!(1, None, None);
        // Every active segment spans the current x. Recover the whole equal-y
        // block, including unscheduled participants in a multiway crossing.
        // Refresh every active entry for this event before consulting it. Only
        // its ordering against the event height is needed by the later removal
        // and insertion searches; newly starting segments are not read here.
        for &id in &active {
            classify!(2, Some(id), None);
            height_order[id] = segments[id].y_at(&point.x).cmp(&point.y);
            classify!(3, Some(id), None);
            if height_order[id].is_eq() {
                classify!(4, Some(id), None);
                incident.push(id);
                classify!(5, Some(id), None);
            } else {
                classify!(5, Some(id), None);
            }
        }
        classify!(6, None, None);
        // Capture membership once from the same exact incident block used by
        // the sweep, before removals or insertions change the active state.
        let participants = if steps.is_some() {
            let mut starts = Vec::new();
            let mut ends = Vec::new();
            let mut passes = Vec::new();
            classify!(7, None, Some((&starts, &ends, &passes)));
            for &id in &incident {
                classify!(8, Some(id), Some((&starts, &ends, &passes)));
                if segments[id].left == point {
                    classify!(9, Some(id), Some((&starts, &ends, &passes)));
                    starts.push(id);
                }
                classify!(10, Some(id), Some((&starts, &ends, &passes)));
                if segments[id].right == point {
                    classify!(11, Some(id), Some((&starts, &ends, &passes)));
                    ends.push(id);
                }
                classify!(12, Some(id), Some((&starts, &ends, &passes)));
                if segments[id].left != point && segments[id].right != point {
                    classify!(13, Some(id), Some((&starts, &ends, &passes)));
                    passes.push(id);
                }
                classify!(14, Some(id), Some((&starts, &ends, &passes)));
            }
            classify!(15, None, Some((&starts, &ends, &passes)));
            Some((starts, ends, passes))
        } else {
            None
        };
        macro_rules! record {
            ($boundary:expr, $indices:expr, $interval:expr, $geometry:expr) => {
                observe!(
                    "record",
                    $boundary,
                    &{
                        let indices: Option<(usize, usize, Option<usize>)> = $indices;
                        indices
                            .and_then(|(_, a, b)| b.map(|b| vec![a, b]))
                            .unwrap_or_default()
                    },
                    {
                        let indices: Option<(usize, usize, Option<usize>)> = $indices;
                        let (start, end): (Option<&Point>, Option<&Point>) = $interval;
                        let geometry: Option<&Geometry> = $geometry;
                        let mut locals = vec![
                            Variable::absent("event", "Event", "unavailable"),
                            Variable::available("incident", "Vec<usize>", format!("{incident:?}")),
                            Variable::available(
                                "participants",
                                "Option<(Vec<usize>, Vec<usize>, Vec<usize>)>",
                                format!("{participants:?}"),
                            ),
                        ];
                        for (name, value) in [
                            ("i", indices.map(|indices| indices.0)),
                            ("a", indices.map(|indices| indices.1)),
                            ("b", indices.and_then(|indices| indices.2)),
                        ] {
                            locals.push(value.map_or_else(
                                || {
                                    Variable::absent(
                                        name,
                                        "usize",
                                        if $boundary == 0 || ($boundary == 1 && name == "b") {
                                            "unassigned"
                                        } else {
                                            "unavailable"
                                        },
                                    )
                                },
                                |value| Variable::available(name, "usize", value.to_string()),
                            ));
                        }
                        let in_pair = indices.is_some_and(|indices| indices.2.is_some());
                        locals.push(if in_pair && $boundary >= 3 {
                            Variable::available(
                                "original",
                                "closure",
                                "|p| Point { x: p.x - shear * p.y, y: p.y }".to_owned(),
                            )
                        } else {
                            Variable::absent(
                                "original",
                                "closure",
                                if in_pair { "unassigned" } else { "unavailable" },
                            )
                        });
                        for (name, value) in [("start", start), ("end", end)] {
                            locals.push(value.map_or_else(
                                || {
                                    Variable::absent(
                                        name,
                                        "&Point",
                                        if in_pair && $boundary < 11 {
                                            "unassigned"
                                        } else {
                                            "unavailable"
                                        },
                                    )
                                },
                                |value| Variable::available(name, "&Point", point_value(value)),
                            ));
                        }
                        locals.push(geometry.map_or_else(
                            || {
                                Variable::absent(
                                    "geometry",
                                    "Geometry",
                                    if $boundary < 14 {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |geometry| {
                                Variable::available(
                                    "geometry",
                                    "Geometry",
                                    match geometry {
                                        Geometry::Point(point) => {
                                            format!("Point({})", point_value(point))
                                        }
                                        Geometry::Overlap { start, end } => format!(
                                            "Overlap {{ start: {}, end: {} }}",
                                            point_value(start),
                                            point_value(end)
                                        ),
                                    },
                                )
                            },
                        ));
                        locals
                    }
                );
                if $boundary == 14
                    && let Some(steps) = &mut steps
                {
                    steps
                        .last_mut()
                        .expect("record observation was captured")
                        .action = "record";
                }
            };
        }
        record!(0, None, (None, None), None);
        for (i, &a) in incident.iter().enumerate() {
            record!(1, Some((i, a, None)), (None, None), None);
            for &b in &incident[i + 1..] {
                record!(2, Some((i, a, Some(b))), (None, None), None);
                let original = |p: &Point| Point {
                    x: &p.x - &shear * &p.y,
                    y: p.y.clone(),
                };
                record!(3, Some((i, a, Some(b))), (None, None), None);
                let geometry = if segments[a].slope == segments[b].slope {
                    record!(4, Some((i, a, Some(b))), (None, None), None);
                    // Incident segments with equal slopes lie on the same line.
                    // Emit exactly at the later start, using both original ends
                    // rather than the next event (which may involve a third input).
                    let start = (&segments[a].left).max(&segments[b].left);
                    record!(5, Some((i, a, Some(b))), (Some(start), None), None);
                    if start != &point {
                        record!(6, Some((i, a, Some(b))), (Some(start), None), None);
                        continue;
                    }
                    record!(7, Some((i, a, Some(b))), (Some(start), None), None);
                    let end = (&segments[a].right).min(&segments[b].right);
                    record!(8, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                    if start < end {
                        record!(9, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                        Geometry::Overlap {
                            start: original(start),
                            end: original(end),
                        }
                    } else {
                        record!(10, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                        Geometry::Point(original(start))
                    }
                } else {
                    record!(11, Some((i, a, Some(b))), (None, None), None);
                    Geometry::Point(original(&point))
                };
                record!(13, Some((i, a, Some(b))), (None, None), Some(&geometry));
                result.push(Intersection {
                    segments: [a.min(b), a.max(b)],
                    geometry,
                });
                record!(14, Some((i, a, Some(b))), (None, None), None);
            }
            record!(15, Some((i, a, None)), (None, None), None);
        }
        record!(16, None, (None, None), None);
        macro_rules! activity {
            ($boundary:expr, $incident:expr, $position:expr, $inserted:expr) => {
                observe!("activity", $boundary, &[], {
                    let incident: Option<&Vec<usize>> = $incident;
                    let position: Option<usize> = $position;
                    let inserted: Option<usize> = $inserted;
                    let mut locals = vec![incident.map_or_else(
                        || Variable::absent("incident", "Vec<usize>", "unavailable"),
                        |incident| {
                            Variable::available("incident", "Vec<usize>", format!("{incident:?}"))
                        },
                    )];
                    for (name, value) in [("position", position), ("inserted", inserted)] {
                        locals.push(value.map_or_else(
                            || Variable::absent(name, "usize", "unassigned"),
                            |value| Variable::available(name, "usize", value.to_string()),
                        ));
                    }
                    locals
                });
            };
        }
        activity!(0, Some(&incident), None, None);
        let removed = steps.as_ref().map(|_| {
            active
                .iter()
                .copied()
                .filter(|&id| segments[id].right == point)
                .collect::<Vec<_>>()
        });
        active.retain(|&id| segments[id].right != point);
        activity!(1, Some(&incident), None, None);
        if let Some(steps) = &mut steps
            && let Some(removed) = &removed
            && !removed.is_empty()
        {
            let step = steps.last_mut().expect("removal observation was captured");
            step.action = "remove";
            step.subjects.clone_from(removed);
        }
        let previous_order = steps.as_ref().map(|_| active.clone());
        active.retain(|&id| !height_order[id].is_eq());
        activity!(2, Some(&incident), None, None);
        incident.retain(|&id| segments[id].right != point);
        activity!(3, Some(&incident), None, None);
        incident.sort_by(|&a, &b| segments[a].slope.cmp(&segments[b].slope));
        activity!(4, Some(&incident), None, None);
        // Equal-x events at different y remain separate. At the current y,
        // ascending slope is the order immediately after this event; other
        // equal-y blocks keep their pre-event order until their own event.
        let position = active.partition_point(|&id| height_order[id].is_lt());
        activity!(5, Some(&incident), Some(position), None);
        let inserted = incident.len();
        activity!(6, Some(&incident), Some(position), Some(inserted));
        active.splice(position..position, incident);
        activity!(7, None, Some(position), Some(inserted));
        if let Some(steps) = &mut steps {
            let previous_order = previous_order
                .as_ref()
                .expect("tracing captures the previous order");
            let added: Vec<_> = active
                .iter()
                .copied()
                .filter(|&id| segments[id].left == point)
                .collect();
            let continuing: Vec<_> = active
                .iter()
                .copied()
                .filter(|id| previous_order.contains(id))
                .collect();
            let step = steps.last_mut().expect("splice observation was captured");
            if !added.is_empty() {
                step.action = "insert";
                step.subjects = added;
            } else if &continuing != previous_order {
                step.action = "reorder";
                step.subjects = active[position..position + inserted].to_vec();
            }
        }
        macro_rules! neighbors {
            ($boundary:expr, $checked:expr, $boundaries:expr, $lower:expr, $neighbors:expr, $candidate:expr) => {
                observe!("neighbors", $boundary, $neighbors.unwrap_or(&[]), {
                    let checked: Option<&[[usize; 2]]> = $checked;
                    let boundaries: Option<&[Option<usize>; 2]> = $boundaries;
                    let lower: Option<usize> = $lower;
                    let neighbors: Option<&[usize]> = $neighbors;
                    let candidate: Option<&Option<Point>> = $candidate;
                    vec![
                        Variable::available("position", "usize", position.to_string()),
                        Variable::available("inserted", "usize", inserted.to_string()),
                        checked.map_or_else(
                            || Variable::absent("checked", "Vec<[usize; 2]>", "unassigned"),
                            |checked| {
                                Variable::available(
                                    "checked",
                                    "Vec<[usize; 2]>",
                                    format!("{checked:?}"),
                                )
                            },
                        ),
                        boundaries.map_or_else(
                            || Variable::absent("boundaries", "[Option<usize>; 2]", "unassigned"),
                            |boundaries| {
                                Variable::available(
                                    "boundaries",
                                    "[Option<usize>; 2]",
                                    format!("{boundaries:?}"),
                                )
                            },
                        ),
                        lower.map_or_else(
                            || {
                                Variable::absent(
                                    "lower",
                                    "usize",
                                    if $boundary < 3 {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |lower| Variable::available("lower", "usize", lower.to_string()),
                        ),
                        neighbors.map_or_else(
                            || {
                                Variable::absent(
                                    "neighbors",
                                    "&[usize]",
                                    if $boundary <= 3 {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |neighbors| {
                                Variable::available(
                                    "neighbors",
                                    "&[usize]",
                                    format!("{neighbors:?}"),
                                )
                            },
                        ),
                        candidate.map_or_else(
                            || {
                                Variable::absent(
                                    "candidate",
                                    "Option<Point>",
                                    if $boundary <= 4 {
                                        "unassigned"
                                    } else {
                                        "unavailable"
                                    },
                                )
                            },
                            |candidate| {
                                Variable::available(
                                    "candidate",
                                    "Option<Point>",
                                    optional_point_value(candidate),
                                )
                            },
                        ),
                    ]
                });
            };
        }
        neighbors!(0, None, None, None, None::<&[usize]>, None);
        let mut checked = Vec::new();
        neighbors!(1, Some(&checked), None, None, None::<&[usize]>, None);
        let boundaries = [
            position.checked_sub(1),
            (inserted > 0).then(|| position + inserted - 1),
        ];
        neighbors!(
            2,
            Some(&checked),
            Some(&boundaries),
            None,
            None::<&[usize]>,
            None
        );
        for lower in boundaries.into_iter().flatten() {
            neighbors!(
                3,
                Some(&checked),
                Some(&boundaries),
                Some(lower),
                None::<&[usize]>,
                None
            );
            let Some(neighbors) = active.get(lower..lower + 2) else {
                continue;
            };
            neighbors!(
                4,
                Some(&checked),
                Some(&boundaries),
                Some(lower),
                Some(neighbors),
                None
            );
            let pending_count = queue.len();
            let tracing = steps.is_some();
            let mut observer =
                |boundary, queue: &BTreeMap<Point, Event>, checked: &[[usize; 2]], locals| {
                    if let Some(steps) = &mut steps {
                        let action = if boundary == 2 {
                            "check"
                        } else if boundary == 6 && queue.len() > pending_count {
                            "discover"
                        } else {
                            "micro"
                        };
                        let mut step = SweepStep::capture(
                            action,
                            Some(&point),
                            queue,
                            &active,
                            &result,
                            checked,
                            neighbors,
                        );
                        let mut queue_parameter = step.execution.context.locals.remove(0);
                        queue_parameter.r#type = "&mut BTreeMap<Point, Event>";
                        step.execution.module = "geometry";
                        step.execution.boundary = Some(boundary);
                        step.execution.entry = boundary == 0;
                        step.execution.context = ExecutionContext {
                            function: "schedule_neighbors",
                            parameters: vec![
                                Variable::available("active", "&[usize]", format!("{active:?}")),
                                Variable::available("lower", "usize", lower.to_string()),
                                Variable::available(
                                    "segments",
                                    "&[SweepSegment]",
                                    sweep_segments_value(&segments),
                                ),
                                Variable::available("current", "&Point", point_value(&point)),
                                queue_parameter,
                                Variable::available(
                                    "checked",
                                    "&mut Vec<[usize; 2]>",
                                    format!("{checked:?}"),
                                ),
                            ],
                            locals,
                        };
                        steps.push(step);
                    }
                };
            let observer: Option<&mut NeighborObserver<'_>> =
                if tracing { Some(&mut observer) } else { None };
            let candidate = schedule_neighbors(
                &active,
                lower,
                &segments,
                &point,
                &mut queue,
                &mut checked,
                observer,
            );
            neighbors!(
                5,
                Some(&checked),
                Some(&boundaries),
                Some(lower),
                Some(neighbors),
                Some(&candidate)
            );
        }
        neighbors!(
            6,
            Some(&checked),
            Some(&boundaries),
            None,
            None::<&[usize]>,
            None
        );
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
