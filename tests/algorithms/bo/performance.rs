//! Fixed exact workloads for #68, not a speed assertion or a product benchmark API.
//! `just perf-check` checks the independent expectations; `just perf` measures.
//! Optional BO_PERF_SAMPLE selects one of the four names below; BO_PERF_ALGORITHM
//! selects sweep or brute_force. BO_PERF_ROUNDS defaults to 11 (at least 3).
//! All durations are individual calls, excluding preparation, verification and
//! result destruction. Keep the test profile, compiler, machine and load fixed
//! for comparisons; do not compare a release run against this debug baseline.
//! `just perf-profile` requires both selectors and repeats only that algorithm
//! for BO_PERF_SECONDS (default 15), printing its PID for an external sampler.
//! Profiling is separate from baseline timing; it must not run concurrently.

use computational_geometry::{
    Geometry, Intersection, Point, Rational, Segment, brute_force_intersections, intersections,
};
use std::{env, hint::black_box, time::Duration, time::Instant};

const SAMPLE_NAMES: [&str; 4] = [
    "integer_shear",
    "integer_no_shear",
    "fractional_shear",
    "fractional_no_shear",
];
type Algorithm = fn(&[Segment]) -> Vec<Intersection>;
const ALGORITHMS: [(&str, Algorithm); 2] = [
    ("sweep", intersections),
    ("brute_force", brute_force_intersections),
];

fn point(x: i64, y: i64) -> Point {
    Point {
        x: Rational::from_integer(x.into()),
        y: Rational::from_integer(y.into()),
    }
}

struct Sample {
    name: &'static str,
    segments: Vec<Segment>,
    expected: Vec<Intersection>,
}

fn sample(name: &'static str) -> Sample {
    // Same affine family as the constructed degeneracy test in sweep.rs,
    // augmented with a reversed duplicate and a point at the multiway event.
    // x -> 4*x+y eliminates verticals without changing pair identities or
    // incidence. The fractional transform is (x/3+1/3, y/2+1/2).
    let transform = |x, y| {
        let mut p = point(
            if name.ends_with("no_shear") {
                4 * x + y
            } else {
                x
            },
            y,
        );
        if name.starts_with("fractional") {
            p.x = (p.x + Rational::from_integer(1.into())) / Rational::from_integer(3.into());
            p.y = (p.y + Rational::from_integer(1.into())) / Rational::from_integer(2.into());
        }
        p
    };
    let segments = [
        (-3, -3, 3, 3),
        (-3, 3, 3, -3),
        (0, -4, 0, 4),
        (-4, 0, 0, 0),
        (0, 0, 4, 0),
        (-5, 2, 5, 2),
        (2, -5, 2, 5),
        (6, 0, 7, 0),
        (3, 3, -3, -3),
        (0, 0, 0, 0),
    ]
    .into_iter()
    .map(|(x1, y1, x2, y2)| Segment {
        start: transform(x1, y1),
        end: transform(x2, y2),
    })
    .collect();
    // Independently derived complete pair list: y=x, y=-x, x=0,
    // two touching horizontal halves, y=2, x=2, a disjoint segment,
    // reversed y=x, and the origin. Neither algorithm generates this oracle.
    let mut expected: Vec<_> = [
        (0, 1, 0, 0),
        (0, 2, 0, 0),
        (0, 3, 0, 0),
        (0, 4, 0, 0),
        (0, 5, 2, 2),
        (0, 6, 2, 2),
        (1, 2, 0, 0),
        (1, 3, 0, 0),
        (1, 4, 0, 0),
        (1, 5, -2, 2),
        (1, 6, 2, -2),
        (2, 3, 0, 0),
        (2, 4, 0, 0),
        (2, 5, 0, 2),
        (3, 4, 0, 0),
        (4, 6, 2, 0),
        (5, 6, 2, 2),
        (1, 8, 0, 0),
        (2, 8, 0, 0),
        (3, 8, 0, 0),
        (4, 8, 0, 0),
        (5, 8, 2, 2),
        (6, 8, 2, 2),
        (0, 9, 0, 0),
        (1, 9, 0, 0),
        (2, 9, 0, 0),
        (3, 9, 0, 0),
        (4, 9, 0, 0),
        (8, 9, 0, 0),
    ]
    .into_iter()
    .map(|(a, b, x, y)| Intersection {
        segments: [a, b],
        geometry: Geometry::Point(transform(x, y)),
    })
    .collect();
    expected.push(Intersection {
        segments: [0, 8],
        geometry: Geometry::Overlap {
            start: transform(-3, -3),
            end: transform(3, 3),
        },
    });
    normalize(&mut expected);
    Sample {
        name,
        segments,
        expected,
    }
}

fn normalize(records: &mut [Intersection]) {
    for record in records.iter_mut() {
        if let Geometry::Overlap { start, end } = &mut record.geometry {
            if *start > *end {
                std::mem::swap(start, end);
            }
        }
    }
    // Sorting (rather than collecting into a map) preserves unexpected duplicates.
    records.sort_by_key(|record| record.segments);
}

fn verify(sample: &Sample, mut result: Vec<Intersection>) {
    normalize(&mut result);
    assert_eq!(result, sample.expected, "{}", sample.name);
}

fn selected_samples() -> Vec<Sample> {
    let selected = env::var("BO_PERF_SAMPLE").ok();
    let samples: Vec<_> = SAMPLE_NAMES
        .into_iter()
        .filter(|name| selected.as_deref().is_none_or(|selected| selected == *name))
        .map(sample)
        .collect();
    assert!(!samples.is_empty(), "unknown BO_PERF_SAMPLE: {selected:?}");
    samples
}

fn selected_algorithms() -> Vec<(&'static str, Algorithm)> {
    let selected = env::var("BO_PERF_ALGORITHM").ok();
    let algorithms: Vec<_> = ALGORITHMS
        .into_iter()
        .filter(|(name, _)| selected.as_deref().is_none_or(|selected| selected == *name))
        .collect();
    assert!(
        !algorithms.is_empty(),
        "unknown BO_PERF_ALGORITHM: {selected:?}"
    );
    algorithms
}

fn positive_setting(name: &str, default: usize) -> usize {
    let value = env::var(name).map_or(default, |value| value.parse().expect("positive integer"));
    assert!(value > 0, "{name} must be positive");
    value
}

#[test]
fn fixed_samples_have_known_exact_results() {
    for sample in selected_samples() {
        let mut results = ALGORITHMS.map(|(_, algorithm)| algorithm(&sample.segments));
        for result in &mut results {
            normalize(result);
            assert_eq!(*result, sample.expected, "{}", sample.name);
        }
        assert_eq!(results[0], results[1], "{}", sample.name);
    }
}

#[test]
#[ignore = "explicit independent performance measurement; use just perf"]
fn independent_timings() {
    let rounds = positive_setting("BO_PERF_ROUNDS", 11);
    assert!(
        rounds >= 3,
        "at least three rounds are needed to report variation"
    );
    let algorithms = selected_algorithms();
    println!(
        "test profile; debug_assertions={}; rounds={rounds}; one untimed warmup; milliseconds/call",
        cfg!(debug_assertions)
    );
    for sample in selected_samples() {
        for (_, algorithm) in ALGORITHMS {
            verify(&sample, algorithm(&sample.segments));
        }
        let mut timings = vec![Vec::new(); algorithms.len()];
        for round in 0..rounds {
            // Alternate first algorithm to reduce systematic order/thermal bias.
            for offset in 0..algorithms.len() {
                let index = (round + offset) % algorithms.len();
                let (_, algorithm) = algorithms[index];
                let input = black_box(sample.segments.as_slice());
                let start = Instant::now();
                let result = black_box(algorithm(input));
                let elapsed = start.elapsed();
                timings[index].push(elapsed.as_secs_f64() * 1000.0);
                verify(&sample, result);
            }
        }
        for ((name, _), times) in algorithms.iter().zip(timings.iter_mut()) {
            println!(
                "{} {name} n={} pairs={} results={} raw_ms={times:?}",
                sample.name,
                sample.segments.len(),
                sample.segments.len() * (sample.segments.len() - 1) / 2,
                sample.expected.len()
            );
            times.sort_by(f64::total_cmp);
            let median = if times.len() % 2 == 0 {
                (times[times.len() / 2 - 1] + times[times.len() / 2]) / 2.0
            } else {
                times[times.len() / 2]
            };
            let mean = times.iter().sum::<f64>() / times.len() as f64;
            let stddev = (times.iter().map(|time| (time - mean).powi(2)).sum::<f64>()
                / times.len() as f64)
                .sqrt();
            println!(
                "min={:.6} median={median:.6} max={:.6} mean={mean:.6} stddev={stddev:.6} cv={:.2}%",
                times[0],
                times[times.len() - 1],
                stddev / mean * 100.0
            );
        }
    }
}

#[test]
#[ignore = "external sampling workload; use just perf-profile with both selectors"]
fn profile_one_algorithm() {
    assert!(env::var("BO_PERF_SAMPLE").is_ok(), "select one sample");
    assert!(
        env::var("BO_PERF_ALGORITHM").is_ok(),
        "select one algorithm"
    );
    let sample = selected_samples().remove(0);
    let (name, algorithm) = selected_algorithms()[0];
    let duration = Duration::from_secs(positive_setting("BO_PERF_SECONDS", 15) as u64);
    verify(&sample, algorithm(&sample.segments));
    println!(
        "PROFILE pid={} sample={} algorithm={name} seconds={}",
        std::process::id(),
        sample.name,
        duration.as_secs()
    );
    let start = Instant::now();
    let mut calls = 0;
    while start.elapsed() < duration {
        black_box(algorithm(black_box(&sample.segments)));
        calls += 1;
    }
    println!("PROFILE completed calls={calls}; includes result destruction; not baseline timing");
}
