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
use std::sync::Arc;

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

type NeighborObserver<'a> = dyn FnMut(usize, &BTreeMap<Point, Event>, &[[usize; 2]], Vec<Variable>, Vec<ExecutionControl>)
    + 'a;

fn schedule_neighbors(
    active: &[usize],
    lower: usize,
    segments: &[SweepSegment],
    current: &Point,
    queue: &mut BTreeMap<Point, Event>,
    checked: &mut Vec<[usize; 2]>,
    mut observer: Option<&mut NeighborObserver<'_>>,
    cancelled: &dyn Fn() -> bool,
) -> Option<Point> {
    let mut controls = Vec::new();
    macro_rules! geometry_control {
        ($line:expr, $keyword:expr, $state:expr) => {
            if observer.is_some() {
                ExecutionControl::set(&mut controls, $line, $keyword, $state);
            }
        };
    }
    macro_rules! observe_geometry {
        ($boundary:expr, $neighbors:expr, $pair:expr, $point:expr, $returned:expr) => {
            if cancelled() {
                return None;
            }
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
                            if matches!($boundary, 8 | 9 | 10 | 11 | 12) {
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
                observer($boundary, queue, checked, locals, controls.clone());
            }
        };
    }
    observe_geometry!(0, None, None, None, None);
    let Some(neighbors) = active.get(lower..lower + 2) else {
        geometry_control!(1, "else", "entered");
        geometry_control!(1, "return", "pending");
        observe_geometry!(9, None, None, None, None);
        let return_value = None;
        geometry_control!(1, "return", "returned");
        observe_geometry!(11, None, None, None, Some(&return_value));
        return return_value;
    };
    geometry_control!(1, "else", "skipped");
    geometry_control!(1, "return", "skipped");
    observe_geometry!(1, Some(neighbors), None, None, None);
    checked.push([neighbors[0], neighbors[1]]);
    observe_geometry!(2, Some(neighbors), None, None, None);
    let (a, b) = (&segments[neighbors[0]], &segments[neighbors[1]]);
    observe_geometry!(3, Some(neighbors), Some((a, b)), None, None);
    if a.slope == b.slope {
        geometry_control!(4, "else", "entered");
        geometry_control!(4, "return", "pending");
        observe_geometry!(10, Some(neighbors), Some((a, b)), None, None);
        let return_value = None;
        geometry_control!(4, "return", "returned");
        observe_geometry!(12, Some(neighbors), Some((a, b)), None, Some(&return_value));
        return return_value;
    }
    let cross_x = (&b.intercept - &a.intercept)
        / (a.slope.as_ref().expect("active segment has a slope")
            - b.slope.as_ref().expect("active segment has a slope"));
    if cross_x < a.left.x || cross_x > a.right.x || cross_x < b.left.x || cross_x > b.right.x {
        geometry_control!(4, "else", "entered");
        geometry_control!(4, "return", "pending");
        observe_geometry!(10, Some(neighbors), Some((a, b)), None, None);
        let return_value = None;
        geometry_control!(4, "return", "returned");
        observe_geometry!(12, Some(neighbors), Some((a, b)), None, Some(&return_value));
        return return_value;
    }
    let point = Point {
        y: a.y_at(&cross_x),
        x: cross_x,
    };
    geometry_control!(4, "else", "skipped");
    geometry_control!(4, "return", "skipped");
    observe_geometry!(4, Some(neighbors), Some((a, b)), Some(&point), None);
    if point > *current {
        geometry_control!(5, "if", "true");
        observe_geometry!(5, Some(neighbors), Some((a, b)), Some(&point), None);
        queue.entry(point.clone()).or_default();
        observe_geometry!(6, Some(neighbors), Some((a, b)), Some(&point), None);
    } else {
        geometry_control!(5, "if", "false");
    }
    geometry_control!(8, "return", "pending");
    observe_geometry!(7, Some(neighbors), Some((a, b)), Some(&point), None);
    let return_value = Some(point);
    geometry_control!(8, "return", "returned");
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
    sweep(segments, None, None, &|| false).expect("ordinary computation is never cancelled")
}

/// Teaching snapshots expose original coordinates and lexicographic event order.
/// Captured only when requested; ordinary callers use the same exact sweep.
#[derive(Clone, PartialEq, Eq)]
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

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct Execution {
    pub(crate) module: &'static str,
    pub(crate) boundary: Option<usize>,
    pub(crate) entry: bool,
    pub(crate) context: ExecutionContext,
    pub(crate) outer: Vec<ExecutionContext>,
    pub(crate) returning: bool,
    pub(crate) resuming: bool,
    pub(crate) calls: Vec<ExecutionCall>,
    pub(crate) controls: Vec<ExecutionControl>,
    pub(crate) blocks: Vec<ExecutionBlock>,
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct ExecutionBlock {
    pub(crate) line: usize,
    pub(crate) phase: &'static str,
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct ExecutionControl {
    pub(crate) line: usize,
    pub(crate) keyword: &'static str,
    pub(crate) occurrence: usize,
    pub(crate) state: &'static str,
}

impl Execution {
    fn control(&mut self, line: usize, keyword: &'static str, state: &'static str) {
        ExecutionControl::set(&mut self.controls, line, keyword, state);
    }
}

impl ExecutionControl {
    fn exhaust_loop(steps: &mut Vec<SweepStep>, line: usize) {
        let completed = steps.last_mut().expect("loop exit was captured");
        completed.execution.control(line, "for", "exhausted");
        if let [.., previous, completed] = steps.as_slice()
            && previous.execution.module == completed.execution.module
            && previous.execution.context.id == completed.execution.context.id
            && previous.execution.controls.iter().any(|control| {
                control.line == line && control.keyword == "for" && control.state == "pending"
            })
        {
            // The exit already carries the cleared bindings and control state.
            // Keep head stops only when another iteration actually follows.
            steps.remove(steps.len() - 2);
        }
    }

    fn set(controls: &mut Vec<Self>, line: usize, keyword: &'static str, state: &'static str) {
        if let Some(control) = controls
            .iter_mut()
            .find(|control| control.line == line && control.keyword == keyword)
        {
            control.state = state;
        } else {
            controls.push(ExecutionControl {
                line,
                keyword,
                occurrence: 0,
                state,
            });
        }
    }
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct ExecutionCall {
    pub(crate) line: usize,
    pub(crate) function: &'static str,
    pub(crate) occurrence: usize,
    pub(crate) arguments: Vec<Variable>,
    pub(crate) result: Variable,
}

impl ExecutionCall {
    fn pending(
        line: usize,
        function: &'static str,
        occurrence: usize,
        arguments: Vec<Variable>,
        result_type: &'static str,
    ) -> Self {
        Self {
            line,
            function,
            occurrence,
            arguments,
            result: Variable::absent("return_value", result_type, "unassigned"),
        }
    }
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct ExecutionContext {
    pub(crate) id: usize,
    pub(crate) function: &'static str,
    pub(crate) parameters: Vec<Variable>,
    pub(crate) locals: Vec<Variable>,
    pub(crate) captures: Vec<Variable>,
}

// Keeps closure blocks intact under stable rustfmt without runtime work.
macro_rules! nop {
    () => {};
}

struct ClosureTrace {
    caller: SweepStep,
    current: SweepStep,
}

impl ClosureTrace {
    fn enter(
        steps: &mut Vec<SweepStep>,
        next_call: &std::cell::Cell<usize>,
        module: &'static str,
        function: &'static str,
        parameters: Vec<Variable>,
        captures: &[&str],
        result_type: &'static str,
    ) -> Self {
        let caller = steps.last().expect("call has a caller stop").clone();
        let mut current = caller.clone();
        current.action = "micro";
        current.execution.module = module;
        current.execution.boundary = Some(0);
        current.execution.entry = false;
        current.execution.resuming = false;
        current.execution.calls.clear();
        current.execution.controls.clear();
        current.execution.blocks.clear();
        current
            .execution
            .outer
            .push(caller.execution.context.clone());
        let id = next_call.get();
        next_call.set(id + 1);
        current.execution.context = ExecutionContext {
            id,
            function,
            parameters,
            locals: vec![Variable::absent("return_value", result_type, "unassigned")],
            captures: captures
                .iter()
                .map(|name| {
                    caller
                        .execution
                        .context
                        .locals
                        .iter()
                        .chain(&caller.execution.context.parameters)
                        .chain(&caller.execution.context.captures)
                        .find(|variable| variable.name == *name)
                        .expect("captured binding exists at the call site")
                        .clone()
                })
                .collect(),
        };
        steps.push(current.clone());
        Self { caller, current }
    }

    fn returned(mut self, steps: &mut Vec<SweepStep>, value: String) {
        self.current.execution.boundary = Some(1);
        self.current.execution.returning = true;
        let result_type = self.current.execution.context.locals[0].r#type;
        self.current.execution.context.locals[0] =
            Variable::available("return_value", result_type, value);
        steps.push(self.current);
        // Returning from one callback precedes any subsequent library callback.
        self.caller.execution.entry = false;
        self.caller.execution.resuming = true;
        self.caller.action = "micro";
        steps.push(self.caller);
    }
}

#[derive(Clone, PartialEq, Eq)]
pub(crate) struct Variable {
    pub(crate) scope: Option<&'static str>,
    pub(crate) name: &'static str,
    pub(crate) r#type: &'static str,
    pub(crate) availability: &'static str,
    pub(crate) value: Option<Arc<str>>,
}

impl Variable {
    fn available(name: &'static str, r#type: &'static str, value: impl Into<Arc<str>>) -> Self {
        Self {
            name,
            scope: None,
            r#type,
            availability: "available",
            value: Some(value.into()),
        }
    }

    fn absent(name: &'static str, r#type: &'static str, availability: &'static str) -> Self {
        Self {
            name,
            scope: None,
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

fn geometry_value(geometry: &Geometry) -> String {
    match geometry {
        Geometry::Point(point) => point_value(point),
        Geometry::Overlap { start, end } => {
            format!("{} → {}", point_value(start), point_value(end))
        }
    }
}

fn intersection_value(intersection: &Intersection) -> String {
    format!(
        "S{} × S{}: {}",
        intersection.segments[0],
        intersection.segments[1],
        geometry_value(&intersection.geometry)
    )
}

fn intersections_value(intersections: &[Intersection]) -> String {
    format!(
        "[{}]",
        intersections
            .iter()
            .map(intersection_value)
            .collect::<Vec<_>>()
            .join(", ")
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
    fn coalesce_block_successors(steps: &mut Vec<Self>, start: usize) {
        // A block-after observation and its immediate successor describe one
        // execution boundary. Compare every observable field (including call
        // identity, scope, availability and canvas), not merely the code line.
        // Finalize the event before publishing any of its frames: consumers
        // never have to revise an index they have already received.
        let observations = steps.split_off(start);
        for mut next in observations {
            if steps.len() > start {
                let previous = steps.last_mut().expect("preceding observation exists");
                if previous
                    .execution
                    .blocks
                    .iter()
                    .any(|block| block.phase == "after")
                {
                    let mut meanings = std::mem::take(&mut previous.execution.blocks);
                    let next_meanings = std::mem::take(&mut next.execution.blocks);
                    let same = *previous == next;
                    if same {
                        for meaning in next_meanings {
                            if !meanings.contains(&meaning) {
                                meanings.push(meaning);
                            }
                        }
                        previous.execution.blocks = meanings;
                        continue;
                    }
                    previous.execution.blocks = meanings;
                    next.execution.blocks = next_meanings;
                }
            }
            steps.push(next);
        }
    }

    fn block_before(steps: &mut Vec<Self>, boundary: usize, line: usize) {
        let mut before = steps.last().expect("block operation was captured").clone();
        before.execution.boundary = Some(boundary);
        before.execution.blocks = vec![ExecutionBlock {
            line,
            phase: "before",
        }];
        steps.insert(steps.len() - 1, before);
    }

    fn block_after(steps: &mut Vec<Self>, line: usize) {
        let mut after = steps.last().expect("block successor was captured").clone();
        after.execution.blocks = vec![ExecutionBlock {
            line,
            phase: "after",
        }];
        steps.insert(steps.len() - 1, after);
    }

    fn capture(
        action: &'static str,
        current: Option<&Point>,
        queue: &BTreeMap<Point, Event>,
        active: &[usize],
        results: &[Intersection],
        checked: &[[usize; 2]],
        subjects: &[usize],
        input_value: &Arc<str>,
    ) -> Self {
        Self {
            execution: Execution {
                outer: Vec::new(),
                returning: false,
                resuming: false,
                calls: Vec::new(),
                controls: Vec::new(),
                blocks: Vec::new(),
                module: action,
                boundary: None,
                entry: false,
                context: ExecutionContext {
                    id: 0,
                    captures: Vec::new(),
                    function: "sweep",
                    // The input binding has been shadowed by Vec<SweepSegment>.
                    parameters: vec![Variable {
                        scope: None,
                        name: "segments",
                        r#type: "&[Segment]",
                        availability: "shadowed",
                        value: Some(Arc::clone(input_value)),
                    }],
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
                            intersections_value(results),
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
        segments_value: &Arc<str>,
        shear: &Rational,
    ) {
        self.execution.module = "take";
        self.execution.boundary = Some(boundary);
        self.execution.entry = boundary == 0;
        self.sweep_context(segments_value, shear);
        self.take_bindings(boundary, next, bound);
    }

    fn sweep_context(&mut self, segments_value: &Arc<str>, shear: &Rational) {
        let locals = &mut self.execution.context.locals;
        locals.push(Variable::available(
            "segments",
            "Vec<SweepSegment>",
            Arc::clone(segments_value),
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

#[cfg(test)]
pub(crate) fn trace_intersections(segments: &[Segment]) -> (Vec<Intersection>, SweepTrace) {
    let mut trace = SweepTrace {
        shear: choose_shear(segments),
        steps: Vec::new(),
    };
    let results = sweep(segments, Some(&mut trace.steps), None, &|| false)
        .expect("collected computation is never cancelled");
    TraceProjection::new(&trace.shear).restore(&mut trace.steps);
    (results, trace)
}

pub(crate) fn stream_intersections(
    segments: &[Segment],
    emit: &mut dyn FnMut(Vec<SweepStep>) -> bool,
    cancelled: &dyn Fn() -> bool,
) -> Option<Vec<Intersection>> {
    sweep(segments, Some(&mut Vec::new()), Some(emit), cancelled)
}

// Compare and hash the stored integers, avoiding rational division on every
// cache lookup. Equivalent noncanonical representations may occupy two entries.
struct PointRepresentation(Point);

impl PartialEq for PointRepresentation {
    fn eq(&self, other: &Self) -> bool {
        self.0.x.numer() == other.0.x.numer()
            && self.0.x.denom() == other.0.x.denom()
            && self.0.y.numer() == other.0.y.numer()
            && self.0.y.denom() == other.0.y.denom()
    }
}

impl Eq for PointRepresentation {}

impl std::hash::Hash for PointRepresentation {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        std::hash::Hash::hash(self.0.x.numer(), state);
        std::hash::Hash::hash(self.0.x.denom(), state);
        std::hash::Hash::hash(self.0.y.numer(), state);
        std::hash::Hash::hash(self.0.y.denom(), state);
    }
}

struct TraceProjection<'a> {
    shear: &'a Rational,
    points: std::collections::HashMap<PointRepresentation, Point>,
}

impl<'a> TraceProjection<'a> {
    fn new(shear: &'a Rational) -> Self {
        Self {
            shear,
            points: std::collections::HashMap::new(),
        }
    }

    fn restore(&mut self, steps: &mut [SweepStep]) {
        for step in steps {
            for point in step.current.iter_mut().chain(step.pending.iter_mut()) {
                let original = self
                    .points
                    .entry(PointRepresentation(point.clone()))
                    .or_insert_with(|| {
                        let mut original = point.clone();
                        original.x -= self.shear * &original.y;
                        original
                    });
                point.clone_from(original);
            }
        }
    }
}

fn emit_steps(
    steps: &mut Vec<SweepStep>,
    projection: &mut TraceProjection<'_>,
    emit: &mut dyn FnMut(Vec<SweepStep>) -> bool,
    retained: &mut bool,
) -> bool {
    let previous = steps.last().cloned();
    let mut ready: Vec<_> = steps.drain(..).skip(usize::from(*retained)).collect();
    projection.restore(&mut ready);
    if let Some(previous) = previous {
        steps.push(previous);
        *retained = true;
    }
    ready.is_empty() || emit(ready)
}

fn sweep(
    segments: &[Segment],
    mut steps: Option<&mut Vec<SweepStep>>,
    mut emit: Option<&mut dyn FnMut(Vec<SweepStep>) -> bool>,
    cancelled: &dyn Fn() -> bool,
) -> Option<Vec<Intersection>> {
    if cancelled() {
        return None;
    }
    let mut retained = false;
    let next_call = std::cell::Cell::new(1);
    let shear = choose_shear(segments);
    let mut projection = TraceProjection::new(&shear);
    // Capture the binding immediately before it is shadowed, only for teaching.
    let input_value = steps.as_ref().map(|_| {
        Arc::<str>::from(format!(
            "[{}]",
            segments
                .iter()
                .map(|segment| format!(
                    "Segment {{ start: {}, end: {} }}",
                    point_value(&segment.start),
                    point_value(&segment.end)
                ))
                .collect::<Vec<_>>()
                .join(", ")
        ))
    });
    let segments: Vec<_> = segments
        .iter()
        .map(|segment| SweepSegment::new(segment, &shear))
        .collect();
    let trace_segments = steps
        .as_ref()
        .map(|_| Arc::<str>::from(sweep_segments_value(&segments)));
    let mut queue: BTreeMap<Point, Event> = BTreeMap::new();
    for (id, segment) in segments.iter().enumerate() {
        if cancelled() {
            return None;
        }
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
            input_value.as_ref().expect("tracing captures input"),
        ));
    }
    if let (Some(steps), Some(emit)) = (&mut steps, &mut emit)
        && !emit_steps(steps, &mut projection, *emit, &mut retained)
    {
        return None;
    }
    loop {
        if cancelled() {
            return None;
        }
        if let Some(steps) = &mut steps {
            let mut step = SweepStep::capture(
                "take-entry",
                None,
                &queue,
                &active,
                &result,
                &[],
                &[],
                input_value.as_ref().expect("tracing captures input"),
            );
            step.preserve_geometry(steps.last().expect("initial snapshot exists"));
            step.take_context(
                0,
                None,
                None,
                trace_segments.as_ref().expect("tracing captures segments"),
                &shear,
            );
            let queue_argument = step
                .execution
                .context
                .locals
                .iter()
                .find(|variable| variable.name == "queue")
                .and_then(|variable| variable.value.as_ref())
                .expect("queue is available")
                .clone();
            step.execution.calls.push(ExecutionCall::pending(
                1,
                "pop_first",
                0,
                vec![Variable::available(
                    "self",
                    "&mut BTreeMap<Point, Event>",
                    queue_argument,
                )],
                "Option<(Point, Event)>",
            ));
            steps.push(step);
        }
        let next = queue.pop_first();
        if let Some(steps) = &mut steps {
            let mut step = SweepStep::capture(
                "take-pop",
                None,
                &queue,
                &active,
                &result,
                &[],
                &[],
                input_value.as_ref().expect("tracing captures input"),
            );
            step.preserve_geometry(steps.last().expect("entry snapshot exists"));
            step.take_context(
                1,
                Some(&next),
                None,
                trace_segments.as_ref().expect("tracing captures segments"),
                &shear,
            );
            step.execution.calls.push(ExecutionCall {
                line: 1,
                function: "pop_first",
                occurrence: 0,
                arguments: vec![Variable::available(
                    "self",
                    "&mut BTreeMap<Point, Event>",
                    steps
                        .last()
                        .expect("take entry exists")
                        .execution
                        .context
                        .locals
                        .iter()
                        .find(|variable| variable.name == "queue")
                        .and_then(|variable| variable.value.as_ref())
                        .expect("queue is available")
                        .clone(),
                )],
                result: Variable::available(
                    "return_value",
                    "Option<(Point, Event)>",
                    next.as_ref().map_or_else(
                        || "None".to_owned(),
                        |(point, event)| {
                            format!("Some(({}, {}))", point_value(point), event_value(event))
                        },
                    ),
                ),
            });
            steps.push(step);
        }
        let Some((point, event)) = next else {
            if let Some(steps) = &mut steps {
                let mut step = SweepStep::capture(
                    "take-empty",
                    None,
                    &queue,
                    &active,
                    &result,
                    &[],
                    &[],
                    input_value.as_ref().expect("tracing captures input"),
                );
                step.preserve_geometry(steps.last().expect("pop snapshot exists"));
                step.take_context(
                    3,
                    Some(&next),
                    None,
                    trace_segments.as_ref().expect("tracing captures segments"),
                    &shear,
                );
                step.execution.control(2, "else", "entered");
                step.execution.control(2, "break", "pending");
                step.execution.calls.clone_from(
                    &steps
                        .last()
                        .expect("pop observation exists")
                        .execution
                        .calls,
                );
                step.action = "micro";
                steps.push(step.clone());
                step.execution.boundary = Some(4);
                step.execution.control(2, "break", "completed");
                step.action = "take-empty";
                steps.push(step);
            }
            break;
        };
        let first_step = steps.as_ref().map_or(0, |steps| steps.len());
        if let Some(steps) = &mut steps {
            let mut step = SweepStep::capture(
                "take",
                Some(&point),
                &queue,
                &active,
                &result,
                &[],
                &[],
                input_value.as_ref().expect("tracing captures input"),
            );
            step.take_context(
                2,
                None,
                Some((&point, &event)),
                trace_segments.as_ref().expect("tracing captures segments"),
                &shear,
            );
            step.execution.control(2, "else", "skipped");
            step.execution.control(2, "break", "skipped");
            step.execution.calls.clone_from(
                &steps
                    .last()
                    .expect("pop observation exists")
                    .execution
                    .calls,
            );
            steps.push(step);
        }
        // These observations execute beside the operations they describe. The
        // event-wide membership fields remain a separate teaching summary.
        macro_rules! observe {
            ($module:expr, $boundary:expr, $subjects:expr, $locals:expr) => {
                if cancelled() {
                    return None;
                }
                if let Some(steps) = &mut steps {
                    let mut step = SweepStep::capture(
                        "micro",
                        Some(&point),
                        &queue,
                        &active,
                        &result,
                        &[],
                        $subjects,
                        input_value.as_ref().expect("tracing captures input"),
                    );
                    step.sweep_context(
                        trace_segments.as_ref().expect("tracing captures segments"),
                        &shear,
                    );
                    step.execution.module = $module;
                    step.execution.boundary = Some($boundary);
                    step.execution.entry = $boundary == 0;
                    if let Some(previous) = steps.last()
                        && previous.execution.module == $module
                        && $boundary != 0
                    {
                        step.execution
                            .controls
                            .clone_from(&previous.execution.controls);
                    }
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
        macro_rules! call {
            ($line:expr, $function:expr, $arguments:expr, $result:expr) => {
                if let Some(steps) = &mut steps {
                    steps
                        .last_mut()
                        .expect("operation observation exists")
                        .execution
                        .calls
                        .push(ExecutionCall {
                            line: $line,
                            function: $function,
                            occurrence: 0,
                            arguments: $arguments,
                            result: $result,
                        });
                }
            };
        }
        macro_rules! control {
            ($line:expr, "for", "exhausted") => {
                if let Some(steps) = &mut steps {
                    ExecutionControl::exhaust_loop(steps, $line);
                }
            };
            ($line:expr, $keyword:expr, $state:expr) => {
                if let Some(steps) = &mut steps {
                    steps
                        .last_mut()
                        .expect("control observation exists")
                        .execution
                        .control($line, $keyword, $state);
                }
            };
        }
        macro_rules! reset_controls {
            ($line:expr) => {
                if let Some(steps) = &mut steps {
                    steps
                        .last_mut()
                        .expect("loop observation exists")
                        .execution
                        .controls
                        .retain(|control| control.line < $line);
                }
            };
        }
        macro_rules! pending_call {
            ($line:expr, $function:expr, $occurrence:expr, $arguments:expr, $result_type:expr) => {
                if let Some(steps) = &mut steps {
                    steps
                        .last_mut()
                        .expect("operation observation exists")
                        .execution
                        .calls
                        .push(ExecutionCall::pending(
                            $line,
                            $function,
                            $occurrence,
                            $arguments,
                            $result_type,
                        ));
                }
            };
        }
        macro_rules! block_end {
            ($boundary:expr, $line:expr) => {
                if let Some(steps) = &mut steps {
                    SweepStep::block_before(steps, $boundary, $line);
                    SweepStep::block_after(steps, $line);
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
                    if let Some(id) = locals.iter_mut().find(|variable| variable.name == "id") {
                        id.scope = Some(if members.is_some() {
                            "classify.incident"
                        } else {
                            "classify.active"
                        });
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
            reset_controls!(2);
            control!(2, "for", "entered");
            pending_call!(
                3,
                "y_at",
                0,
                vec![
                    Variable::available(
                        "self",
                        "&SweepSegment",
                        sweep_segment_value(&segments[id])
                    ),
                    Variable::available("x", "&Rational", point.x.to_string())
                ],
                "Rational"
            );
            pending_call!(
                3,
                "cmp",
                0,
                vec![
                    Variable::absent("self", "&Rational", "unassigned"),
                    Variable::available("other", "&Rational", point.y.to_string())
                ],
                "Ordering"
            );
            let height = segments[id].y_at(&point.x);
            height_order[id] = height.cmp(&point.y);
            classify!(3, Some(id), None);
            call!(
                3,
                "y_at",
                vec![
                    Variable::available(
                        "self",
                        "&SweepSegment",
                        sweep_segment_value(&segments[id])
                    ),
                    Variable::available("x", "&Rational", point.x.to_string())
                ],
                Variable::available("return_value", "Rational", height.to_string())
            );
            call!(
                3,
                "cmp",
                vec![
                    Variable::available("self", "&Rational", height.to_string()),
                    Variable::available("other", "&Rational", point.y.to_string())
                ],
                Variable::available(
                    "return_value",
                    "Ordering",
                    format!("{:?}", height_order[id])
                )
            );
            pending_call!(
                4,
                "is_eq",
                0,
                vec![Variable::available(
                    "self",
                    "Ordering",
                    format!("{:?}", height_order[id])
                )],
                "bool"
            );
            let equal = height_order[id].is_eq();
            if equal {
                classify!(4, Some(id), None);
                control!(4, "if", "true");
                call!(
                    4,
                    "is_eq",
                    vec![Variable::available(
                        "self",
                        "Ordering",
                        format!("{:?}", height_order[id])
                    )],
                    Variable::available("return_value", "bool", equal.to_string())
                );
                pending_call!(
                    5,
                    "push",
                    0,
                    vec![
                        Variable::available("self", "&mut Vec<usize>", format!("{incident:?}")),
                        Variable::available("value", "usize", id.to_string())
                    ],
                    "()"
                );
                let before = steps.as_ref().map(|_| format!("{incident:?}"));
                incident.push(id);
                classify!(5, Some(id), None);
                call!(
                    5,
                    "push",
                    vec![
                        Variable::available(
                            "self",
                            "&mut Vec<usize>",
                            before.expect("trace captures arguments")
                        ),
                        Variable::available("value", "usize", id.to_string())
                    ],
                    Variable::available("return_value", "()", "()".to_owned())
                );
                block_end!(18, 4);
            } else {
                classify!(5, Some(id), None);
                control!(4, "if", "false");
                call!(
                    4,
                    "is_eq",
                    vec![Variable::available(
                        "self",
                        "Ordering",
                        format!("{:?}", height_order[id])
                    )],
                    Variable::available("return_value", "bool", equal.to_string())
                );
            }
            if let Some(steps) = &mut steps {
                steps
                    .last_mut()
                    .expect("loop body completion exists")
                    .execution
                    .blocks
                    .push(ExecutionBlock {
                        line: 2,
                        phase: "before",
                    });
            }
            classify!(16, None, None);
            reset_controls!(2);
            control!(2, "for", "pending");
        }
        classify!(6, None, None);
        control!(2, "for", "exhausted");
        // Capture membership once from the same exact incident block used by
        // the sweep, before removals or insertions change the active state.
        let participants = if steps.is_some() {
            let mut starts = Vec::new();
            let mut ends = Vec::new();
            let mut passes = Vec::new();
            classify!(7, None, Some((&starts, &ends, &passes)));
            for &id in &incident {
                classify!(8, Some(id), Some((&starts, &ends, &passes)));
                reset_controls!(8);
                control!(8, "for", "entered");
                if segments[id].left == point {
                    classify!(9, Some(id), Some((&starts, &ends, &passes)));
                    control!(9, "if", "true");
                    pending_call!(
                        10,
                        "push",
                        0,
                        vec![
                            Variable::available("self", "&mut Vec<usize>", format!("{starts:?}")),
                            Variable::available("value", "usize", id.to_string())
                        ],
                        "()"
                    );
                    let before = format!("{starts:?}");
                    starts.push(id);
                    classify!(10, Some(id), Some((&starts, &ends, &passes)));
                    call!(
                        10,
                        "push",
                        vec![
                            Variable::available("self", "&mut Vec<usize>", before),
                            Variable::available("value", "usize", id.to_string())
                        ],
                        Variable::available("return_value", "()", "()".to_owned())
                    );
                    block_end!(19, 9);
                } else {
                    classify!(10, Some(id), Some((&starts, &ends, &passes)));
                    control!(9, "if", "false");
                }
                if segments[id].right == point {
                    classify!(11, Some(id), Some((&starts, &ends, &passes)));
                    control!(11, "if", "true");
                    pending_call!(
                        12,
                        "push",
                        0,
                        vec![
                            Variable::available("self", "&mut Vec<usize>", format!("{ends:?}")),
                            Variable::available("value", "usize", id.to_string())
                        ],
                        "()"
                    );
                    let before = format!("{ends:?}");
                    ends.push(id);
                    classify!(12, Some(id), Some((&starts, &ends, &passes)));
                    call!(
                        12,
                        "push",
                        vec![
                            Variable::available("self", "&mut Vec<usize>", before),
                            Variable::available("value", "usize", id.to_string())
                        ],
                        Variable::available("return_value", "()", "()".to_owned())
                    );
                    block_end!(20, 11);
                } else {
                    classify!(12, Some(id), Some((&starts, &ends, &passes)));
                    control!(11, "if", "false");
                }
                if segments[id].left != point && segments[id].right != point {
                    classify!(13, Some(id), Some((&starts, &ends, &passes)));
                    control!(13, "if", "true");
                    pending_call!(
                        14,
                        "push",
                        0,
                        vec![
                            Variable::available("self", "&mut Vec<usize>", format!("{passes:?}")),
                            Variable::available("value", "usize", id.to_string())
                        ],
                        "()"
                    );
                    let before = format!("{passes:?}");
                    passes.push(id);
                    classify!(14, Some(id), Some((&starts, &ends, &passes)));
                    call!(
                        14,
                        "push",
                        vec![
                            Variable::available("self", "&mut Vec<usize>", before),
                            Variable::available("value", "usize", id.to_string())
                        ],
                        Variable::available("return_value", "()", "()".to_owned())
                    );
                    block_end!(21, 13);
                } else {
                    classify!(14, Some(id), Some((&starts, &ends, &passes)));
                    control!(13, "if", "false");
                }
                if let Some(steps) = &mut steps {
                    steps
                        .last_mut()
                        .expect("loop body completion exists")
                        .execution
                        .blocks
                        .push(ExecutionBlock {
                            line: 8,
                            phase: "before",
                        });
                }
                classify!(17, None, Some((&starts, &ends, &passes)));
                reset_controls!(8);
                control!(8, "for", "pending");
            }
            classify!(15, None, Some((&starts, &ends, &passes)));
            control!(8, "for", "exhausted");
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
                        locals.push(if in_pair && matches!($boundary, 3..=14 | 19..=22) {
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
                                        if in_pair && matches!($boundary, 2..=10) {
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
                                    if matches!($boundary, 0..=12 | 19..=22) {
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
                                    geometry_value(geometry),
                                )
                            },
                        ));
                        for variable in &mut locals {
                            variable.scope = match variable.name {
                                "i" | "a" => Some("record.incident"),
                                "b" | "original" | "geometry" => Some("record.pair"),
                                "start" | "end" => Some("record.overlap"),
                                _ => variable.scope,
                            };
                        }
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
            reset_controls!(1);
            control!(1, "for", "entered");
            for &b in &incident[i + 1..] {
                record!(2, Some((i, a, Some(b))), (None, None), None);
                reset_controls!(2);
                control!(2, "for", "entered");
                let mut original_calls = steps.as_ref().map(|_| Vec::new());
                let mut original_line = 12;
                let mut original = |p: &Point, steps: &mut Option<&mut Vec<SweepStep>>| {
                    nop!();
                    let trace = steps.as_mut().map(|steps| {
                        ClosureTrace::enter(
                            steps,
                            &next_call,
                            "original",
                            "original closure",
                            vec![Variable::available("p", "&Point", point_value(p))],
                            &["shear"],
                            "Point",
                        )
                    });
                    let transformed = Point {
                        x: &p.x - &shear * &p.y,
                        y: p.y.clone(),
                    };
                    if let Some(calls) = &mut original_calls {
                        calls.push((point_value(p), point_value(&transformed)));
                    }
                    if let Some(trace) = trace {
                        trace.returned(
                            steps.as_mut().expect("tracing is enabled"),
                            point_value(&transformed),
                        );
                    }
                    transformed
                };
                record!(3, Some((i, a, Some(b))), (None, None), None);
                let geometry = if segments[a].slope == segments[b].slope {
                    record!(4, Some((i, a, Some(b))), (None, None), None);
                    control!(4, "if", "true");
                    control!(12, "else", "skipped");
                    pending_call!(
                        5,
                        "max",
                        0,
                        vec![
                            Variable::available("self", "&Point", point_value(&segments[a].left)),
                            Variable::available("other", "&Point", point_value(&segments[b].left))
                        ],
                        "&Point"
                    );
                    // Incident segments with equal slopes lie on the same line.
                    // Emit exactly at the later start, using both original ends
                    // rather than the next event (which may involve a third input).
                    let start = (&segments[a].left).max(&segments[b].left);
                    record!(5, Some((i, a, Some(b))), (Some(start), None), None);
                    call!(
                        5,
                        "max",
                        vec![
                            Variable::available("self", "&Point", point_value(&segments[a].left)),
                            Variable::available("other", "&Point", point_value(&segments[b].left))
                        ],
                        Variable::available("return_value", "&Point", point_value(start))
                    );
                    if start != &point {
                        record!(6, Some((i, a, Some(b))), (Some(start), None), None);
                        control!(6, "if", "true");
                        control!(7, "continue", "pending");
                        record!(17, Some((i, a, None)), (None, None), None);
                        reset_controls!(2);
                        control!(2, "for", "pending");
                        control!(7, "continue", "jumping");
                        continue;
                    }
                    record!(7, Some((i, a, Some(b))), (Some(start), None), None);
                    control!(6, "if", "false");
                    control!(7, "continue", "skipped");
                    pending_call!(
                        8,
                        "min",
                        0,
                        vec![
                            Variable::available("self", "&Point", point_value(&segments[a].right)),
                            Variable::available("other", "&Point", point_value(&segments[b].right))
                        ],
                        "&Point"
                    );
                    let end = (&segments[a].right).min(&segments[b].right);
                    record!(8, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                    call!(
                        8,
                        "min",
                        vec![
                            Variable::available("self", "&Point", point_value(&segments[a].right)),
                            Variable::available("other", "&Point", point_value(&segments[b].right))
                        ],
                        Variable::available("return_value", "&Point", point_value(end))
                    );
                    let branch_geometry = if start < end {
                        record!(9, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                        control!(9, "if", "true");
                        control!(11, "else", "skipped");
                        pending_call!(
                            10,
                            "original",
                            0,
                            vec![Variable::available("p", "&Point", point_value(start))],
                            "Point"
                        );
                        pending_call!(
                            10,
                            "original",
                            1,
                            vec![Variable::available("p", "&Point", point_value(end))],
                            "Point"
                        );
                        original_line = 10;
                        let value = Geometry::Overlap {
                            start: original(start, &mut steps),
                            end: original(end, &mut steps),
                        };
                        record!(19, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                        if let Some(steps) = &mut steps {
                            steps
                                .last_mut()
                                .expect("branch completion exists")
                                .execution
                                .blocks
                                .push(ExecutionBlock {
                                    line: 9,
                                    phase: "before",
                                });
                        }
                        value
                    } else {
                        record!(10, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                        control!(9, "if", "false");
                        control!(11, "else", "entered");
                        pending_call!(
                            11,
                            "original",
                            0,
                            vec![Variable::available("p", "&Point", point_value(start))],
                            "Point"
                        );
                        original_line = 11;
                        let value = Geometry::Point(original(start, &mut steps));
                        record!(20, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                        if let Some(steps) = &mut steps {
                            steps
                                .last_mut()
                                .expect("branch completion exists")
                                .execution
                                .blocks
                                .push(ExecutionBlock {
                                    line: 11,
                                    phase: "before",
                                });
                        }
                        value
                    };
                    record!(21, Some((i, a, Some(b))), (Some(start), Some(end)), None);
                    if let Some(steps) = &mut steps {
                        steps
                            .last_mut()
                            .expect("branch completion exists")
                            .execution
                            .blocks
                            .push(ExecutionBlock {
                                line: 4,
                                phase: "before",
                            });
                        SweepStep::block_after(steps, if start < end { 9 } else { 11 });
                    }
                    branch_geometry
                } else {
                    record!(11, Some((i, a, Some(b))), (None, None), None);
                    control!(4, "if", "false");
                    control!(12, "else", "entered");
                    pending_call!(
                        12,
                        "original",
                        0,
                        vec![Variable::available("p", "&Point", point_value(&point))],
                        "Point"
                    );
                    let value = Geometry::Point(original(&point, &mut steps));
                    record!(22, Some((i, a, Some(b))), (None, None), None);
                    if let Some(steps) = &mut steps {
                        steps
                            .last_mut()
                            .expect("branch completion exists")
                            .execution
                            .blocks
                            .push(ExecutionBlock {
                                line: 12,
                                phase: "before",
                            });
                    }
                    value
                };
                record!(13, Some((i, a, Some(b))), (None, None), Some(&geometry));
                if let Some(steps) = &mut steps {
                    steps
                        .last_mut()
                        .expect("geometry observation exists")
                        .execution
                        .calls
                        .extend(
                            original_calls
                                .expect("tracing records original calls")
                                .into_iter()
                                .enumerate()
                                .map(|(occurrence, (argument, returned))| ExecutionCall {
                                    line: original_line,
                                    function: "original",
                                    occurrence,
                                    arguments: vec![Variable::available("p", "&Point", argument)],
                                    result: Variable::available("return_value", "Point", returned),
                                }),
                        );
                }
                pending_call!(
                    14,
                    "min",
                    0,
                    vec![
                        Variable::available("self", "usize", a.to_string()),
                        Variable::available("other", "usize", b.to_string())
                    ],
                    "usize"
                );
                pending_call!(
                    14,
                    "max",
                    0,
                    vec![
                        Variable::available("self", "usize", a.to_string()),
                        Variable::available("other", "usize", b.to_string())
                    ],
                    "usize"
                );
                pending_call!(
                    14,
                    "push",
                    0,
                    vec![
                        Variable::available(
                            "self",
                            "&mut Vec<Intersection>",
                            intersections_value(&result)
                        ),
                        Variable::absent("value", "Intersection", "unassigned")
                    ],
                    "()"
                );
                if let Some(steps) = &mut steps {
                    SweepStep::block_after(
                        steps,
                        if segments[a].slope == segments[b].slope {
                            4
                        } else {
                            12
                        },
                    );
                }
                let lower_id = a.min(b);
                let upper_id = a.max(b);
                let intersection = Intersection {
                    segments: [lower_id, upper_id],
                    geometry,
                };
                let push_arguments = steps.as_ref().map(|_| {
                    vec![
                        Variable::available(
                            "self",
                            "&mut Vec<Intersection>",
                            intersections_value(&result),
                        ),
                        Variable::available(
                            "value",
                            "Intersection",
                            intersection_value(&intersection),
                        ),
                    ]
                });
                result.push(intersection);
                record!(14, Some((i, a, Some(b))), (None, None), None);
                call!(
                    14,
                    "min",
                    vec![
                        Variable::available("self", "usize", a.to_string()),
                        Variable::available("other", "usize", b.to_string())
                    ],
                    Variable::available("return_value", "usize", lower_id.to_string())
                );
                call!(
                    14,
                    "max",
                    vec![
                        Variable::available("self", "usize", a.to_string()),
                        Variable::available("other", "usize", b.to_string())
                    ],
                    Variable::available("return_value", "usize", upper_id.to_string())
                );
                call!(
                    14,
                    "push",
                    push_arguments.expect("trace captures arguments"),
                    Variable::available("return_value", "()", "()".to_owned())
                );
                record!(17, Some((i, a, None)), (None, None), None);
                reset_controls!(2);
                control!(2, "for", "pending");
            }
            record!(15, Some((i, a, None)), (None, None), None);
            control!(2, "for", "exhausted");
            record!(18, None, (None, None), None);
            reset_controls!(1);
            control!(1, "for", "pending");
        }
        record!(16, None, (None, None), None);
        control!(1, "for", "exhausted");
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
        macro_rules! closure_call {
            ($module:expr, $function:expr, $parameters:expr, $captures:expr, $type:expr, $body:expr, $format:expr) => {{
                let trace = steps.as_mut().map(|steps| {
                    ClosureTrace::enter(
                        steps,
                        &next_call,
                        $module,
                        $function,
                        $parameters,
                        $captures,
                        $type,
                    )
                });
                let value = $body;
                if let Some(trace) = trace {
                    trace.returned(
                        steps.as_mut().expect("tracing is enabled"),
                        ($format)(&value),
                    );
                }
                value
            }};
        }
        activity!(0, Some(&incident), None, None);
        let removed = steps.as_ref().map(|_| {
            active
                .iter()
                .copied()
                .filter(|&id| segments[id].right == point)
                .collect::<Vec<_>>()
        });
        let before = steps.as_ref().map(|_| format!("{active:?}"));
        pending_call!(
            1,
            "retain",
            0,
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.as_ref().expect("trace captures arguments").clone()
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| segments[id].right != point".to_owned()
                )
            ],
            "()"
        );
        active.retain(|&id| {
            nop!();
            closure_call!(
                "retain-end",
                "retain closure",
                vec![Variable::available("id", "usize", id.to_string())],
                &["segments", "point"],
                "bool",
                segments[id].right != point,
                |value: &bool| value.to_string()
            )
        });
        activity!(1, Some(&incident), None, None);
        call!(
            1,
            "retain",
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.expect("trace captures arguments")
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| segments[id].right != point".to_owned()
                )
            ],
            Variable::available("return_value", "()", "()".to_owned())
        );
        if let Some(steps) = &mut steps
            && let Some(removed) = &removed
            && !removed.is_empty()
        {
            let step = steps.last_mut().expect("removal observation was captured");
            step.action = "remove";
            step.subjects.clone_from(removed);
        }
        let previous_order = steps.as_ref().map(|_| active.clone());
        let before = steps.as_ref().map(|_| format!("{active:?}"));
        pending_call!(
            2,
            "retain",
            0,
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.as_ref().expect("trace captures arguments").clone()
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| !height_order[id].is_eq()".to_owned()
                )
            ],
            "()"
        );
        active.retain(|&id| {
            nop!();
            closure_call!(
                "retain-height",
                "retain closure",
                vec![Variable::available("id", "usize", id.to_string())],
                &["height_order"],
                "bool",
                !height_order[id].is_eq(),
                |value: &bool| value.to_string()
            )
        });
        activity!(2, Some(&incident), None, None);
        call!(
            2,
            "retain",
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.expect("trace captures arguments")
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| !height_order[id].is_eq()".to_owned()
                )
            ],
            Variable::available("return_value", "()", "()".to_owned())
        );
        let before = steps.as_ref().map(|_| format!("{incident:?}"));
        pending_call!(
            3,
            "retain",
            0,
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.as_ref().expect("trace captures arguments").clone()
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| segments[id].right != point".to_owned()
                )
            ],
            "()"
        );
        incident.retain(|&id| {
            nop!();
            closure_call!(
                "retain-end",
                "retain closure",
                vec![Variable::available("id", "usize", id.to_string())],
                &["segments", "point"],
                "bool",
                segments[id].right != point,
                |value: &bool| value.to_string()
            )
        });
        activity!(3, Some(&incident), None, None);
        call!(
            3,
            "retain",
            vec![
                Variable::available(
                    "self",
                    "&mut Vec<usize>",
                    before.expect("trace captures arguments")
                ),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| segments[id].right != point".to_owned()
                )
            ],
            Variable::available("return_value", "()", "()".to_owned())
        );
        let before = steps.as_ref().map(|_| format!("{incident:?}"));
        pending_call!(
            4,
            "sort_by",
            0,
            vec![
                Variable::available(
                    "self",
                    "&mut [usize]",
                    before.as_ref().expect("trace captures arguments").clone()
                ),
                Variable::available(
                    "compare",
                    "closure",
                    "|&a, &b| segments[a].slope.cmp(&segments[b].slope)".to_owned()
                )
            ],
            "()"
        );
        incident.sort_by(|&a, &b| {
            nop!();
            closure_call!(
                "sort-by",
                "sort_by closure",
                vec![
                    Variable::available("a", "usize", a.to_string()),
                    Variable::available("b", "usize", b.to_string())
                ],
                &["segments"],
                "Ordering",
                segments[a].slope.cmp(&segments[b].slope),
                |value: &std::cmp::Ordering| format!("{value:?}")
            )
        });
        activity!(4, Some(&incident), None, None);
        call!(
            4,
            "sort_by",
            vec![
                Variable::available(
                    "self",
                    "&mut [usize]",
                    before.expect("trace captures arguments")
                ),
                Variable::available(
                    "compare",
                    "closure",
                    "|&a, &b| segments[a].slope.cmp(&segments[b].slope)".to_owned()
                )
            ],
            Variable::available("return_value", "()", "()".to_owned())
        );
        // Equal-x events at different y remain separate. At the current y,
        // ascending slope is the order immediately after this event; other
        // equal-y blocks keep their pre-event order until their own event.
        pending_call!(
            5,
            "partition_point",
            0,
            vec![
                Variable::available("self", "&[usize]", format!("{active:?}")),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| height_order[id].is_lt()".to_owned()
                )
            ],
            "usize"
        );
        let position = active.partition_point(|&id| {
            nop!();
            closure_call!(
                "partition-point",
                "partition_point closure",
                vec![Variable::available("id", "usize", id.to_string())],
                &["height_order"],
                "bool",
                height_order[id].is_lt(),
                |value: &bool| value.to_string()
            )
        });
        activity!(5, Some(&incident), Some(position), None);
        call!(
            5,
            "partition_point",
            vec![
                Variable::available("self", "&[usize]", format!("{active:?}")),
                Variable::available(
                    "predicate",
                    "closure",
                    "|&id| height_order[id].is_lt()".to_owned()
                )
            ],
            Variable::available("return_value", "usize", position.to_string())
        );
        pending_call!(
            6,
            "len",
            0,
            vec![Variable::available(
                "self",
                "&Vec<usize>",
                format!("{incident:?}")
            )],
            "usize"
        );
        let inserted = incident.len();
        activity!(6, Some(&incident), Some(position), Some(inserted));
        call!(
            6,
            "len",
            vec![Variable::available(
                "self",
                "&Vec<usize>",
                format!("{incident:?}")
            )],
            Variable::available("return_value", "usize", inserted.to_string())
        );
        let splice_arguments = steps.as_ref().map(|_| {
            vec![
                Variable::available("self", "&mut Vec<usize>", format!("{active:?}")),
                Variable::available("range", "Range<usize>", format!("{position}..{position}")),
                Variable::available("replace_with", "Vec<usize>", format!("{incident:?}")),
            ]
        });
        pending_call!(
            7,
            "splice",
            0,
            splice_arguments
                .as_ref()
                .expect("trace captures arguments")
                .clone(),
            "Splice<IntoIter<usize>>"
        );
        active.splice(position..position, incident);
        activity!(7, None, Some(position), Some(inserted));
        call!(
            7,
            "splice",
            splice_arguments.expect("trace captures arguments"),
            Variable::absent("return_value", "Splice<IntoIter<usize>>", "unavailable")
        );
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
            (inserted > 0).then(|| {
                nop!();
                closure_call!(
                    "then",
                    "then closure",
                    vec![],
                    &["position", "inserted"],
                    "usize",
                    position + inserted - 1,
                    |value: &usize| value.to_string()
                )
            }),
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
            reset_controls!(3);
            control!(3, "for", "entered");
            pending_call!(
                4,
                "get",
                0,
                vec![
                    Variable::available("self", "&[usize]", format!("{active:?}")),
                    Variable::available("index", "Range<usize>", format!("{lower}..{}", lower + 2))
                ],
                "Option<&[usize]>"
            );
            let Some(neighbors) = active.get(lower..lower + 2) else {
                neighbors!(
                    7,
                    Some(&checked),
                    Some(&boundaries),
                    Some(lower),
                    None::<&[usize]>,
                    None
                );
                control!(4, "else", "entered");
                control!(4, "continue", "pending");
                call!(
                    4,
                    "get",
                    vec![
                        Variable::available("self", "&[usize]", format!("{active:?}")),
                        Variable::available(
                            "index",
                            "Range<usize>",
                            format!("{lower}..{}", lower + 2)
                        )
                    ],
                    Variable::available("return_value", "Option<&[usize]>", "None")
                );
                neighbors!(
                    8,
                    Some(&checked),
                    Some(&boundaries),
                    None,
                    None::<&[usize]>,
                    None
                );
                reset_controls!(3);
                control!(3, "for", "pending");
                control!(4, "continue", "jumping");
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
            control!(4, "else", "skipped");
            control!(4, "continue", "skipped");
            call!(
                4,
                "get",
                vec![
                    Variable::available("self", "&[usize]", format!("{active:?}")),
                    Variable::available("index", "Range<usize>", format!("{lower}..{}", lower + 2))
                ],
                Variable::available(
                    "return_value",
                    "Option<&[usize]>",
                    format!("Some({neighbors:?})")
                )
            );
            let schedule_arguments = steps.as_ref().map(|steps| {
                let locals = &steps
                    .last()
                    .expect("caller observation exists")
                    .execution
                    .context
                    .locals;
                [
                    ("active", "active", "&[usize]"),
                    ("lower", "lower", "usize"),
                    ("segments", "segments", "&[SweepSegment]"),
                    ("point", "current", "&Point"),
                    ("queue", "queue", "&mut BTreeMap<Point, Event>"),
                    ("checked", "checked", "&mut Vec<[usize; 2]>"),
                ]
                .into_iter()
                .map(|(source, name, r#type)| {
                    let mut argument = locals
                        .iter()
                        .find(|variable| variable.name == source)
                        .expect("caller argument exists")
                        .clone();
                    argument.name = name;
                    argument.r#type = r#type;
                    argument
                })
                .collect::<Vec<_>>()
            });
            pending_call!(
                5,
                "schedule_neighbors",
                0,
                schedule_arguments
                    .as_ref()
                    .expect("trace captures arguments")
                    .clone(),
                "Option<Point>"
            );
            let pending_count = queue.len();
            let tracing = steps.is_some();
            let caller = steps.as_ref().map(|steps| {
                steps
                    .last()
                    .expect("caller stop exists")
                    .execution
                    .context
                    .clone()
            });
            let call_id = next_call.get();
            if tracing {
                next_call.set(call_id + 1);
            }
            let mut observer = |boundary,
                                queue: &BTreeMap<Point, Event>,
                                checked: &[[usize; 2]],
                                locals,
                                controls| {
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
                        input_value.as_ref().expect("tracing captures input"),
                    );
                    let mut queue_parameter = step.execution.context.locals.remove(0);
                    queue_parameter.r#type = "&mut BTreeMap<Point, Event>";
                    step.execution.module = "geometry";
                    step.execution.boundary = Some(boundary);
                    step.execution.entry = boundary == 0;
                    step.execution.outer =
                        vec![caller.as_ref().expect("tracing captures caller").clone()];
                    step.execution.returning = matches!(boundary, 8 | 11 | 12);
                    step.execution.controls = controls;
                    step.execution.context = ExecutionContext {
                        id: call_id,
                        captures: Vec::new(),
                        function: "schedule_neighbors",
                        parameters: vec![
                            Variable::available("active", "&[usize]", format!("{active:?}")),
                            Variable::available("lower", "usize", lower.to_string()),
                            Variable::available(
                                "segments",
                                "&[SweepSegment]",
                                Arc::clone(
                                    trace_segments.as_ref().expect("tracing captures segments"),
                                ),
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
                    let locals = &step.execution.context.locals;
                    if boundary == 0 {
                        step.execution.calls.push(ExecutionCall::pending(
                            1,
                            "get",
                            0,
                            vec![
                                Variable::available("self", "&[usize]", format!("{active:?}")),
                                Variable::available(
                                    "index",
                                    "Range<usize>",
                                    format!("{lower}..{}", lower + 2),
                                ),
                            ],
                            "Option<&[usize]>",
                        ));
                    }
                    if matches!(boundary, 1 | 9 | 11) {
                        step.execution.calls.push(ExecutionCall {
                            line: 1,
                            function: "get",
                            occurrence: 0,
                            arguments: vec![
                                Variable::available("self", "&[usize]", format!("{active:?}")),
                                Variable::available(
                                    "index",
                                    "Range<usize>",
                                    format!("{lower}..{}", lower + 2),
                                ),
                            ],
                            result: Variable::available(
                                "return_value",
                                "Option<&[usize]>",
                                if boundary == 1 {
                                    format!("Some({neighbors:?})")
                                } else {
                                    "None".to_owned()
                                },
                            ),
                        });
                    }
                    if boundary == 1 {
                        step.execution.calls.push(ExecutionCall::pending(
                            2,
                            "push",
                            0,
                            vec![
                                Variable::available(
                                    "self",
                                    "&mut Vec<[usize; 2]>",
                                    format!("{checked:?}"),
                                ),
                                Variable::available(
                                    "value",
                                    "[usize; 2]",
                                    format!("{neighbors:?}"),
                                ),
                            ],
                            "()",
                        ));
                    }
                    if boundary == 3 {
                        let arguments = locals
                            .iter()
                            .filter(|variable| variable.name == "a" || variable.name == "b")
                            .cloned()
                            .collect();
                        step.execution.calls.push(ExecutionCall::pending(
                            4,
                            "intersection_candidate",
                            0,
                            arguments,
                            "Option<Point>",
                        ));
                    }
                    if boundary == 5 {
                        let point_argument = locals
                            .iter()
                            .find(|variable| variable.name == "point")
                            .and_then(|variable| variable.value.as_ref())
                            .expect("candidate exists before queue entry")
                            .clone();
                        let queue_argument = step
                            .execution
                            .context
                            .parameters
                            .iter()
                            .find(|variable| variable.name == "queue")
                            .and_then(|variable| variable.value.as_ref())
                            .expect("queue parameter exists")
                            .clone();
                        step.execution.calls.push(ExecutionCall::pending(
                            6,
                            "clone",
                            0,
                            vec![Variable::available("self", "&Point", point_argument)],
                            "Point",
                        ));
                        step.execution.calls.push(ExecutionCall::pending(
                            6,
                            "entry",
                            0,
                            vec![
                                Variable::available(
                                    "self",
                                    "&mut BTreeMap<Point, Event>",
                                    queue_argument,
                                ),
                                Variable::absent("key", "Point", "unassigned"),
                            ],
                            "Entry<Point, Event>",
                        ));
                        step.execution.calls.push(ExecutionCall::pending(
                            6,
                            "or_default",
                            0,
                            vec![Variable::absent(
                                "self",
                                "Entry<Point, Event>",
                                "unassigned",
                            )],
                            "&mut Event",
                        ));
                    }
                    let failed_candidate = matches!(boundary, 10 | 12);
                    if boundary == 4 || failed_candidate {
                        let arguments: Vec<_> = locals
                            .iter()
                            .filter(|variable| {
                                (variable.name == "a" || variable.name == "b")
                                    && variable.availability == "available"
                            })
                            .cloned()
                            .collect();
                        if arguments.len() == 2 {
                            let returned = if failed_candidate {
                                "None".to_owned()
                            } else {
                                format!(
                                    "Some({})",
                                    locals
                                        .iter()
                                        .find(|variable| variable.name == "point")
                                        .and_then(|variable| variable.value.as_ref())
                                        .expect("candidate point exists")
                                )
                            };
                            step.execution.calls.push(ExecutionCall {
                                line: 4,
                                function: "intersection_candidate",
                                occurrence: 0,
                                arguments,
                                result: Variable::available(
                                    "return_value",
                                    "Option<Point>",
                                    returned,
                                ),
                            });
                        }
                    }
                    if boundary != 0
                        && let Some(previous) = steps.last()
                        && previous.execution.module == "geometry"
                    {
                        for call in &previous.execution.calls {
                            if !step.execution.calls.iter().any(|current| {
                                current.line == call.line
                                    && current.function == call.function
                                    && current.occurrence == call.occurrence
                            }) {
                                let mut call = call.clone();
                                if boundary == 2 && call.function == "push" {
                                    call.result = Variable::available("return_value", "()", "()");
                                }
                                if boundary == 6 && call.line == 6 {
                                    call.result = if call.function == "clone" {
                                        let point = step
                                            .execution
                                            .context
                                            .locals
                                            .iter()
                                            .find(|variable| variable.name == "point")
                                            .and_then(|variable| variable.value.clone())
                                            .expect("queue insertion retains point");
                                        Variable::available("return_value", "Point", point)
                                    } else {
                                        Variable::absent(
                                            "return_value",
                                            call.result.r#type,
                                            "unavailable",
                                        )
                                    };
                                }
                                step.execution.calls.push(call);
                            }
                        }
                    }
                    if boundary == 6 {
                        step.execution.blocks.push(ExecutionBlock {
                            line: 5,
                            phase: "before",
                        });
                    }
                    let completed_if = boundary == 7
                        && step.execution.controls.iter().any(|control| {
                            control.line == 5 && control.keyword == "if" && control.state == "true"
                        });
                    steps.push(step);
                    if completed_if {
                        SweepStep::block_after(steps, 5);
                    }
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
                cancelled,
            );
            neighbors!(
                5,
                Some(&checked),
                Some(&boundaries),
                Some(lower),
                Some(neighbors),
                Some(&candidate)
            );
            control!(3, "for", "entered");
            control!(4, "else", "skipped");
            control!(4, "continue", "skipped");
            call!(
                5,
                "schedule_neighbors",
                schedule_arguments.expect("trace captures arguments"),
                Variable::available(
                    "return_value",
                    "Option<Point>",
                    optional_point_value(&candidate)
                )
            );
            neighbors!(
                8,
                Some(&checked),
                Some(&boundaries),
                None,
                None::<&[usize]>,
                None
            );
            reset_controls!(3);
            control!(3, "for", "pending");
        }
        neighbors!(
            6,
            Some(&checked),
            Some(&boundaries),
            None,
            None::<&[usize]>,
            None
        );
        control!(3, "for", "exhausted");
        if let Some(steps) = &mut steps {
            let completed = steps.last_mut().expect("neighbor loop exit was captured");
            completed.action = "complete";
            completed.phase = "processed";
            completed.checked.clone_from(&checked);
            let (starts, ends, passes) = participants.expect("tracing captures participants");
            for step in &mut steps[first_step..] {
                step.starts.clone_from(&starts);
                step.ends.clone_from(&ends);
                step.passes.clone_from(&passes);
            }
            SweepStep::coalesce_block_successors(steps, first_step);
        }
        if let (Some(steps), Some(emit)) = (&mut steps, &mut emit)
            && !emit_steps(steps, &mut projection, *emit, &mut retained)
        {
            return None;
        }
    }
    if let (Some(steps), Some(emit)) = (&mut steps, &mut emit)
        && !emit_steps(steps, &mut projection, *emit, &mut retained)
    {
        return None;
    }
    Some(result)
}

#[cfg(test)]
mod execution_value_tests {
    use super::*;

    #[test]
    fn unavailable_neighbor_returns_only_after_its_return_stop() {
        let point = Point {
            x: Rational::from_integer(0.into()),
            y: Rational::from_integer(0.into()),
        };
        let mut queue = BTreeMap::new();
        let mut checked = Vec::new();
        let mut observations = Vec::new();
        let mut observer = |boundary,
                            _: &BTreeMap<Point, Event>,
                            _: &[[usize; 2]],
                            locals: Vec<Variable>,
                            controls: Vec<ExecutionControl>| {
            observations.push((boundary, locals, controls));
        };
        assert_eq!(
            schedule_neighbors(
                &[],
                0,
                &[],
                &point,
                &mut queue,
                &mut checked,
                Some(&mut observer),
                &|| false
            ),
            None
        );
        assert_eq!(
            observations
                .iter()
                .map(|observation| observation.0)
                .collect::<Vec<_>>(),
            vec![0, 9, 11]
        );
        assert!(queue.is_empty() && checked.is_empty());
        let (_, pending, controls) = &observations[1];
        assert!(
            pending
                .iter()
                .any(|variable| variable.name == "return_value"
                    && variable.availability == "unassigned"
                    && variable.value.is_none())
        );
        assert!(controls.iter().any(|control| control.line == 1
            && control.keyword == "return"
            && control.state == "pending"));
        let (_, returned, controls) = &observations[2];
        assert!(
            returned
                .iter()
                .any(|variable| variable.name == "return_value"
                    && variable.value.as_deref() == Some("None"))
        );
        assert!(controls.iter().any(|control| control.line == 1
            && control.keyword == "return"
            && control.state == "returned"));
    }

    #[test]
    fn streaming_preserves_control_stops_and_scopes_in_collected_order() {
        let point = |x: i64, y: i64| Point {
            x: Rational::from_integer(x.into()),
            y: Rational::from_integer(y.into()),
        };
        let segments = [(0, 0, 4, 4), (0, 4, 4, 0), (1, 1, 3, 3)].map(|(x1, y1, x2, y2)| Segment {
            start: point(x1, y1),
            end: point(x2, y2),
        });
        let (expected_results, trace) = trace_intersections(&segments);
        let mut streamed = Vec::new();
        let mut batches = 0;
        let results = stream_intersections(
            &segments,
            &mut |batch| {
                batches += 1;
                streamed.extend(batch);
                true
            },
            &|| false,
        )
        .unwrap();
        assert_eq!(results, expected_results);
        assert!(batches > 1);
        assert_eq!(streamed.len(), trace.steps.len());
        for (actual, expected) in streamed.iter().zip(&trace.steps) {
            assert_eq!(
                (
                    actual.execution.module,
                    actual.execution.boundary,
                    actual.action
                ),
                (
                    expected.execution.module,
                    expected.execution.boundary,
                    expected.action
                )
            );
            let controls = |step: &SweepStep| {
                step.execution
                    .controls
                    .iter()
                    .map(|control| {
                        (
                            control.line,
                            control.keyword,
                            control.occurrence,
                            control.state,
                        )
                    })
                    .collect::<Vec<_>>()
            };
            assert_eq!(controls(actual), controls(expected));
            assert!(actual.execution.blocks == expected.execution.blocks);
            let locals = |step: &SweepStep| {
                step.execution
                    .context
                    .locals
                    .iter()
                    .map(|variable| {
                        (
                            variable.name,
                            variable.scope,
                            variable.availability,
                            variable.value.clone(),
                        )
                    })
                    .collect::<Vec<_>>()
            };
            assert_eq!(locals(actual), locals(expected));
        }
    }

    #[test]
    fn trace_values_share_compact_geometry_and_intersection_format() {
        let point = |x: i64, y: i64| Point {
            x: Rational::from_integer(x.into()),
            y: Rational::from_integer(y.into()),
        };
        for (coordinates, expected) in [
            ([(0, 0, 4, 4), (0, 4, 4, 0)], "(2, 2)"),
            ([(0, 0, 1, 1), (0, 1, 1, 0)], "(1/2, 1/2)"),
            ([(0, 0, 4, 0), (1, 0, 3, 0)], "(1, 0) → (3, 0)"),
        ] {
            let segments = coordinates.map(|(x1, y1, x2, y2)| Segment {
                start: point(x1, y1),
                end: point(x2, y2),
            });
            let (results, trace) = trace_intersections(&segments);
            assert_eq!(results.len(), 1);
            let expected_intersection = format!("S0 × S1: {expected}");
            let expected_results = format!("[{expected_intersection}]");
            let mut saw_geometry = false;
            let mut saw_pending_push = false;
            let mut saw_completed_push = false;
            for step in &trace.steps {
                for variable in &step.execution.context.locals {
                    if variable.name == "geometry" && variable.availability == "available" {
                        assert_eq!(variable.value.as_deref(), Some(expected));
                        saw_geometry = true;
                    }
                }
                for call in &step.execution.calls {
                    if call.function != "push"
                        || !call
                            .arguments
                            .iter()
                            .any(|value| value.r#type == "Intersection")
                    {
                        continue;
                    }
                    let receiver = call
                        .arguments
                        .iter()
                        .find(|value| value.name == "self")
                        .unwrap();
                    assert_eq!(receiver.value.as_deref(), Some("[]"));
                    let argument = call
                        .arguments
                        .iter()
                        .find(|value| value.name == "value")
                        .unwrap();
                    let result = step
                        .execution
                        .context
                        .locals
                        .iter()
                        .find(|value| value.name == "result")
                        .unwrap();
                    if call.result.availability == "available" {
                        assert_eq!(
                            argument.value.as_deref(),
                            Some(expected_intersection.as_str())
                        );
                        assert_eq!(result.value.as_deref(), Some(expected_results.as_str()));
                        saw_completed_push = true;
                    } else {
                        assert_eq!(result.value.as_deref(), receiver.value.as_deref());
                        saw_pending_push = true;
                    }
                }
            }
            assert!(
                saw_geometry && saw_pending_push && saw_completed_push,
                "{expected}"
            );
        }
    }
}

#[cfg(test)]
mod trace_projection_tests {
    use super::*;

    fn rational(numerator: i64, denominator: i64) -> Rational {
        Rational::new(numerator.into(), denominator.into())
    }

    #[test]
    fn representation_keys_preserve_exact_coordinates_for_equivalent_fractions() {
        let shear = rational(2, 3);
        let mut projection = TraceProjection::new(&shear);
        let mut step = SweepStep::capture(
            "initial",
            None,
            &BTreeMap::new(),
            &[],
            &[],
            &[],
            &[],
            &Arc::from("[]"),
        );
        step.pending = vec![
            Point {
                x: rational(7, 5),
                y: rational(3, 2),
            },
            Point {
                x: Rational::new_raw(14.into(), 10.into()),
                y: Rational::new_raw(9.into(), 6.into()),
            },
            Point {
                x: rational(8, 5),
                y: rational(3, 2),
            },
        ];
        projection.restore(std::slice::from_mut(&mut step));
        assert_eq!(step.pending[0].x, rational(2, 5));
        assert_eq!(step.pending[1].x, rational(2, 5));
        assert_eq!(step.pending[2].x, rational(3, 5));
        assert!(step.pending.iter().all(|point| point.y == rational(3, 2)));
        assert_eq!(projection.points.len(), 3);
    }

    #[test]
    fn emitted_batches_restore_exact_points_without_mutating_retained_sweep_coordinates() {
        let source = Point {
            x: rational(7, 5),
            y: rational(3, 2),
        };
        let queue = BTreeMap::from([(source.clone(), Event::default())]);
        // The same sweep coordinate belongs to different original points for
        // different requests. These expected coordinates are independent of
        // the projection implementation and the collected trace path.
        for (shear, expected_x) in [
            (rational(2, 3), rational(2, 5)),
            (rational(-4, 7), rational(79, 35)),
        ] {
            let expected = Point {
                x: expected_x,
                y: rational(3, 2),
            };
            let mut projection = TraceProjection::new(&shear);
            let mut retained = false;
            let mut steps = Vec::new();
            let mut batches = Vec::new();
            for _ in 0..3 {
                steps.push(SweepStep::capture(
                    "initial",
                    Some(&source),
                    &queue,
                    &[],
                    &[],
                    &[],
                    &[],
                    &Arc::from("[]"),
                ));
                assert!(emit_steps(
                    &mut steps,
                    &mut projection,
                    &mut |batch| {
                        batches.push(batch);
                        true
                    },
                    &mut retained,
                ));
                assert_eq!(steps.len(), 1);
                assert_eq!(steps[0].current.as_ref(), Some(&source));
                assert_eq!(steps[0].pending, vec![source.clone()]);
            }
            assert_eq!(batches.len(), 3);
            for batch in batches {
                assert_eq!(batch.len(), 1);
                assert_eq!(batch[0].current.as_ref(), Some(&expected));
                assert_eq!(batch[0].pending, vec![expected.clone()]);
            }
            assert_eq!(projection.points.len(), 1);
        }
    }
}
