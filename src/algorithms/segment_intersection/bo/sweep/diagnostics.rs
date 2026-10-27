//! Opt-in logical accounting of the production sweep, only in test builds.
//! Accesses count tree index operations and explicit indexed/iterated records,
//! not stdlib node visits, scalar field loads, len/is_empty or destruction reads.
use super::*;
use std::cell::RefCell;

#[derive(Debug, Default)]
struct Counter {
    current: usize,
    peak: usize,
    created: usize,
    accessed: usize,
    updated: usize,
    deleted: usize,
}

#[derive(Default)]
struct Ledger {
    counters: BTreeMap<&'static str, Counter>,
    auxiliary: usize,
    peak_auxiliary: usize,
    bits: BTreeMap<&'static str, (u64, u64)>,
}

thread_local! {
    static LEDGER: RefCell<Option<Ledger>> = const { RefCell::new(None) };
}

fn with(f: impl FnOnce(&mut Ledger)) {
    LEDGER.with(|ledger| {
        if let Some(ledger) = ledger.borrow_mut().as_mut() {
            f(ledger);
        }
    });
}

pub(super) fn add(name: &'static str, n: usize) {
    with(|ledger| {
        let counter = ledger.counters.entry(name).or_default();
        counter.current += n;
        counter.created += n;
        counter.peak = counter.peak.max(counter.current);
        if name != "output" {
            ledger.auxiliary += n;
            ledger.peak_auxiliary = ledger.peak_auxiliary.max(ledger.auxiliary);
        }
    });
}

pub(super) fn delete(name: &'static str, n: usize) {
    with(|ledger| {
        let counter = ledger.counters.entry(name).or_default();
        counter.current = counter
            .current
            .checked_sub(n)
            .expect("balanced item lifetime");
        counter.deleted += n;
        if name != "output" {
            ledger.auxiliary -= n;
        }
    });
}

pub(super) fn access(name: &'static str, n: usize) {
    with(|ledger| ledger.counters.entry(name).or_default().accessed += n);
}

pub(super) fn update(name: &'static str, n: usize) {
    with(|ledger| ledger.counters.entry(name).or_default().updated += n);
}

pub(super) fn clear(name: &'static str) {
    let n = LEDGER.with(|ledger| {
        ledger
            .borrow()
            .as_ref()
            .and_then(|l| l.counters.get(name))
            .map_or(0, |c| c.current)
    });
    delete(name, n);
}

pub(super) fn bits(name: &'static str, value: &Rational) {
    with(|ledger| {
        let maximum = ledger.bits.entry(name).or_default();
        maximum.0 = maximum.0.max(value.numer().bits());
        maximum.1 = maximum.1.max(value.denom().bits());
    });
}

pub(super) fn point_bits(name: &'static str, point: &Point) {
    bits(name, &point.x);
    bits(name, &point.y);
}

pub(super) fn geometry_bits(name: &'static str, geometry: &Geometry) {
    match geometry {
        Geometry::Point(point) => point_bits(name, point),
        Geometry::Overlap { start, end } => {
            point_bits(name, start);
            point_bits(name, end);
        }
    }
}

/// A separately run diagnostic pass; timing samples never enable this ledger.
pub(crate) fn report(id: &str, segments: &[Segment]) -> Vec<Intersection> {
    LEDGER.with(|ledger| assert!(ledger.replace(Some(Ledger::default())).is_none()));
    for segment in segments {
        point_bits("input", &segment.start);
        point_bits("input", &segment.end);
    }
    let result = intersections(segments);
    let ledger = LEDGER.with(|ledger| ledger.take().expect("diagnostic pass"));
    assert_eq!(ledger.auxiliary, 0, "all auxiliary records have left scope");
    assert_eq!(
        ledger.counters.get("output").map_or(0, |c| c.current),
        result.len()
    );
    let candidates: usize = [
        "same_line_candidates",
        "cross_group_candidates",
        "point_member_candidates",
        "point_pair_candidates",
    ]
    .iter()
    .map(|name| ledger.counters.get(name).map_or(0, |c| c.accessed))
    .sum();
    assert_eq!(
        candidates,
        result.len(),
        "each enumerated candidate emits one new pair"
    );
    println!(
        "{id} logical_aux_current={} logical_aux_peak={} (simultaneous logical items, not bytes; excludes output and teaching)",
        ledger.auxiliary, ledger.peak_auxiliary
    );
    for (name, count) in ledger.counters {
        println!("{id} resource={name} {count:?}");
    }
    for (name, (numerator, denominator)) in ledger.bits {
        println!("{id} bits={name} max_numerator={numerator} max_denominator={denominator}");
    }
    result
}
