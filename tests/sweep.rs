use computational_geometry::{Intersection, Point, Rational, Segment, intersections};
use std::collections::{BTreeMap, BTreeSet};

fn rational(numerator: i64, denominator: i64) -> Rational {
    Rational::new(numerator.into(), denominator.into())
}

fn point(x: i64, y: i64) -> Point {
    Point {
        x: rational(x, 1),
        y: rational(y, 1),
    }
}

#[test]
fn reports_an_exact_fractional_crossing_with_original_input_indices() {
    // y = x and y = 3 - x/2 meet at (2, 2); translate x by 1/3.
    let shift = rational(1, 3);
    let segments = [
        Segment {
            start: Point {
                x: shift.clone(),
                y: rational(0, 1),
            },
            end: Point {
                x: rational(3, 1) + &shift,
                y: rational(3, 1),
            },
        },
        Segment {
            start: Point {
                x: rational(1, 1) + &shift,
                y: rational(5, 2),
            },
            end: Point {
                x: rational(5, 1) + &shift,
                y: rational(1, 2),
            },
        },
    ];
    assert_eq!(
        intersections(&segments).unwrap(),
        vec![Intersection {
            segments: [0, 1],
            point: Point {
                x: rational(7, 3),
                y: rational(2, 1)
            },
        }]
    );
}

fn segment(x1: i64, y1: i64, x2: i64, y2: i64) -> Segment {
    Segment {
        start: point(x1, y1),
        end: point(x2, y2),
    }
}

type PairResults = BTreeMap<[usize; 2], Point>;

fn results(segments: &[Segment]) -> PairResults {
    let mut pairs = BTreeMap::new();
    for intersection in intersections(segments).unwrap() {
        let [a, b] = intersection.segments;
        assert!(
            a < b && b < segments.len(),
            "invalid original input indices"
        );
        assert!(
            pairs.insert([a, b], intersection.point).is_none(),
            "duplicate unordered pair"
        );
    }
    pairs
}

#[test]
fn discovers_initially_nonadjacent_pairs_after_successive_crossings() {
    // y = x, y = 9 - x, y = 1 + x/3.
    // At x = 0 the last line separates the first two.
    let segments = [
        segment(-3, -3, 9, 9),
        segment(-2, 11, 10, -1),
        Segment {
            start: Point {
                x: rational(-1, 1),
                y: rational(2, 3),
            },
            end: Point {
                x: rational(11, 1),
                y: rational(14, 3),
            },
        },
    ];
    let expected = BTreeMap::from([
        (
            [0, 2],
            Point {
                x: rational(3, 2),
                y: rational(3, 2),
            },
        ),
        (
            [0, 1],
            Point {
                x: rational(9, 2),
                y: rational(9, 2),
            },
        ),
        ([1, 2], point(6, 3)),
    ]);
    assert_eq!(results(&segments), expected);
    assert_identity_invariance(&segments, &expected);
}

#[test]
fn discovers_a_crossing_after_the_separating_segment_ends() {
    let segments = [
        segment(0, 0, 10, 0),
        segment(1, 1, 3, 1),
        segment(2, 4, 9, -3),
    ];
    assert_eq!(results(&segments), BTreeMap::from([([0, 2], point(6, 0))]));
}

#[test]
fn empty_singleton_and_disjoint_inputs_have_no_pairs() {
    assert!(results(&[]).is_empty());
    assert!(results(&[segment(5, 7, -1, -2)]).is_empty());
    assert!(
        results(&[
            segment(0, 0, 6, 1),
            segment(1, 3, 7, 4),
            segment(8, -1, 10, -3),
        ])
        .is_empty()
    );
}

// Independent test-only oracle: solve p + t*r = q + u*s using determinants.
// Production uses slopes/intercepts and only neighboring segments. This oracle
// enumerates every input pair and shares only public data and rational arithmetic.
fn cross(ax: &Rational, ay: &Rational, bx: &Rational, by: &Rational) -> Rational {
    ax * by - ay * bx
}

fn oracle(segments: &[Segment]) -> Option<PairResults> {
    if segments.iter().any(|s| s.start == s.end) {
        return None;
    }
    let zero = rational(0, 1);
    let one = rational(1, 1);
    let mut expected = BTreeMap::new();
    for (i, a) in segments.iter().enumerate() {
        for (j, b) in segments.iter().enumerate().skip(i + 1) {
            let rx = &a.end.x - &a.start.x;
            let ry = &a.end.y - &a.start.y;
            let sx = &b.end.x - &b.start.x;
            let sy = &b.end.y - &b.start.y;
            let qx = &b.start.x - &a.start.x;
            let qy = &b.start.y - &a.start.y;
            let determinant = cross(&rx, &ry, &sx, &sy);
            if determinant == zero {
                if cross(&qx, &qy, &rx, &ry) == zero {
                    // Lexicographic projection preserves order on any line,
                    // including a vertical one. Only a single-point overlap is
                    // in this increment's domain; positive length is rejected.
                    let low = (&a.start).min(&a.end).max((&b.start).min(&b.end));
                    let high = (&a.start).max(&a.end).min((&b.start).max(&b.end));
                    if low < high {
                        return None;
                    }
                    if low == high {
                        expected.insert([i, j], low.clone());
                    }
                }
                continue;
            }
            let t = cross(&qx, &qy, &sx, &sy) / &determinant;
            let u = cross(&qx, &qy, &rx, &ry) / determinant;
            if zero <= t && t <= one && zero <= u && u <= one {
                expected.insert(
                    [i, j],
                    Point {
                        x: &a.start.x + &t * rx,
                        y: &a.start.y + &t * ry,
                    },
                );
            }
        }
    }
    Some(expected)
}

fn assert_identity_invariance(segments: &[Segment], expected: &PairResults) {
    let reversed: Vec<_> = segments
        .iter()
        .map(|s| Segment {
            start: s.end.clone(),
            end: s.start.clone(),
        })
        .collect();
    assert_eq!(&results(&reversed), expected, "endpoint reversal");

    let mut permutation: Vec<_> = (0..segments.len()).rev().collect();
    if permutation.len() > 1 {
        permutation.rotate_left(1);
    }
    let reordered: Vec<_> = permutation.iter().map(|&i| segments[i].clone()).collect();
    let mapped: PairResults = results(&reordered)
        .into_iter()
        .map(|([a, b], p)| {
            let mut pair = [permutation[a], permutation[b]];
            pair.sort_unstable();
            (pair, p)
        })
        .collect();
    assert_eq!(
        &mapped, expected,
        "input permutation with original identity mapping"
    );
}

#[test]
fn small_generated_general_position_sets_match_an_independent_exact_oracle() {
    // Deterministic rational coordinates, with no random-test dependency.
    let mut seed = 0x4d595df4d0f33173_u64;
    let mut next = || {
        seed = seed
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        rational(
            ((seed >> 32) % 101) as i64 - 50,
            ((seed >> 16) % 13 + 1) as i64,
        )
    };
    let mut accepted = 0;
    let mut crossing_pairs = 0;
    for case in 0..180 {
        let segments: Vec<_> = (0..2 + case % 8)
            .map(|_| Segment {
                start: Point {
                    x: next(),
                    y: next(),
                },
                end: Point {
                    x: next(),
                    y: next(),
                },
            })
            .collect();

        // Check the declared increment domain independently of the sweep. All
        // endpoint and crossing x coordinates must be distinct, and no pair of
        // supporting lines may be collinear. Rejected samples test no behavior.
        let mut event_x = BTreeSet::new();
        if !segments
            .iter()
            .all(|s| event_x.insert(s.start.x.clone()) && event_x.insert(s.end.x.clone()))
        {
            continue;
        }
        let collinear = segments.iter().enumerate().any(|(i, a)| {
            segments.iter().skip(i + 1).any(|b| {
                let rx = &a.end.x - &a.start.x;
                let ry = &a.end.y - &a.start.y;
                cross(
                    &rx,
                    &ry,
                    &(&b.start.x - &a.start.x),
                    &(&b.start.y - &a.start.y),
                ) == rational(0, 1)
                    && cross(&rx, &ry, &(&b.end.x - &a.start.x), &(&b.end.y - &a.start.y))
                        == rational(0, 1)
            })
        });
        if collinear {
            continue;
        }
        let expected = oracle(&segments).expect("general-position sample");
        if !expected.values().all(|p| event_x.insert(p.x.clone())) {
            continue;
        }

        assert_eq!(results(&segments), expected, "generated case {case}");
        assert_identity_invariance(&segments, &expected);
        crossing_pairs += expected.len();
        accepted += 1;
    }
    assert!(
        accepted > 100,
        "generator must exercise general-position inputs"
    );
    assert!(
        crossing_pairs > 100,
        "generator must exercise crossings, not just empty output"
    );
}

#[test]
fn coordinates_and_intermediate_products_are_not_limited_to_machine_integers() {
    let huge = Rational::from_integer(
        "100000000000000000000000000000000000000000000000000"
            .parse()
            .unwrap(),
    );
    let segments = [
        Segment {
            start: Point {
                x: huge.clone(),
                y: rational(0, 1),
            },
            end: Point {
                x: &huge + rational(3, 1),
                y: rational(3, 1),
            },
        },
        Segment {
            start: Point {
                x: &huge + rational(1, 1),
                y: rational(5, 2),
            },
            end: Point {
                x: &huge + rational(5, 1),
                y: rational(1, 2),
            },
        },
    ];
    assert_eq!(
        results(&segments),
        BTreeMap::from([(
            [0, 1],
            Point {
                x: huge + rational(2, 1),
                y: rational(2, 1)
            }
        )])
    );
}

#[test]
fn detected_unsupported_inputs_return_an_error_instead_of_a_partial_result() {
    assert!(intersections(&[segment(0, 0, 0, 0)]).is_err());
    assert!(intersections(&[segment(0, 0, 4, 0), segment(2, 0, 6, 0)]).is_err());
}

#[test]
fn vertical_segments_cross_and_touch_at_exact_fractional_coordinates() {
    let at = |y| Point {
        x: rational(1, 3),
        y: rational(y, 1),
    };
    let segments = [
        Segment {
            start: at(-2),
            end: at(3),
        },
        segment(-2, 0, 2, 0),
        Segment {
            start: point(-1, 1),
            end: at(1),
        },
        Segment {
            start: at(3),
            end: point(2, 4),
        },
        Segment {
            start: at(3),
            end: at(5),
        },
        segment(10, 0, 10, 1),
    ];
    let expected = BTreeMap::from([
        ([0, 1], at(0)),
        ([0, 2], at(1)),
        ([0, 3], at(3)),
        ([0, 4], at(3)),
        ([3, 4], at(3)),
    ]);
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), Some(expected.clone()));
    assert_identity_invariance(&segments, &expected);
    assert!(results(&[segments[0].clone()]).is_empty());
}

#[test]
fn groups_starts_ends_and_crossings_without_losing_earlier_or_later_pairs() {
    let segments = [
        segment(-3, -3, 3, 3),
        segment(-4, 4, 4, -4),
        segment(-2, 0, 0, 0),
        segment(0, 0, 5, 0),
        segment(-5, 1, 6, 1),
    ];
    let expected = BTreeMap::from([
        ([0, 1], point(0, 0)),
        ([0, 2], point(0, 0)),
        ([0, 3], point(0, 0)),
        ([1, 2], point(0, 0)),
        ([1, 3], point(0, 0)),
        ([2, 3], point(0, 0)),
        ([0, 4], point(1, 1)),
        ([1, 4], point(-1, 1)),
    ]);
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), Some(expected.clone()));
    assert_identity_invariance(&segments, &expected);
}

#[test]
fn distinct_events_at_the_same_x_remain_separate_and_discover_future_crossings() {
    // Two crossings at x=0, y=-2 and y=2. Their outgoing branches subsequently
    // cross at (2,0), so processing one equal-x group must not reorder the other.
    let segments = [
        segment(-1, -3, 3, 1),
        segment(-1, -1, 3, -5),
        segment(-1, 1, 3, 5),
        segment(-1, 3, 3, -1),
    ];
    let expected = BTreeMap::from([
        ([0, 1], point(0, -2)),
        ([2, 3], point(0, 2)),
        ([0, 3], point(2, 0)),
    ]);
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), Some(expected.clone()));
    assert_identity_invariance(&segments, &expected);
}

#[test]
fn collinear_contacts_and_disjoint_segments_follow_closed_segment_semantics() {
    for segments in [
        [
            segment(-3, 0, 0, 0),
            segment(0, 0, 2, 0),
            segment(3, 0, 4, 0),
        ],
        [
            segment(0, -3, 0, 0),
            segment(0, 0, 0, 2),
            segment(0, 3, 0, 4),
        ],
        [
            segment(-3, -3, 0, 0),
            segment(0, 0, 2, 2),
            segment(3, 3, 4, 4),
        ],
    ] {
        let expected = BTreeMap::from([([0, 1], point(0, 0))]);
        assert_eq!(results(&segments), expected);
        assert_eq!(oracle(&segments), Some(expected.clone()));
        assert_identity_invariance(&segments, &expected);
    }
}

#[test]
fn actively_generated_degeneracies_match_the_independent_oracle() {
    for case in 0..48 {
        let transform = |p: &Point| Point {
            x: &p.x * rational(case % 3 + 1, case % 4 + 1) + rational(case % 7, 3),
            y: &p.y * rational(case % 5 + 1, case % 3 + 1) + rational(case % 5, 2),
        };
        // Deliberately include a multiway crossing with a collinear endpoint
        // contact, vertical interior crossings and later mixed events. No sample
        // is filtered: each affine image must remain inside the supported domain.
        let segments: Vec<_> = [
            segment(-3, -3, 3, 3),
            segment(-3, 3, 3, -3),
            segment(0, -4, 0, 4),
            segment(-4, 0, 0, 0),
            segment(0, 0, 4, 0),
            segment(-5, 2, 5, 2),
            segment(2, -5, 2, 5),
            segment(6, 0, 7, 0),
        ]
        .iter()
        .map(|s| Segment {
            start: transform(&s.start),
            end: transform(&s.end),
        })
        .collect();
        let expected = oracle(&segments).expect("constructed nonoverlapping sample");
        assert_eq!(results(&segments), expected, "constructed case {case}");
        assert_identity_invariance(&segments, &expected);
    }
}

#[test]
fn small_grid_sets_cover_varied_endpoint_and_crossing_degeneracies() {
    let mut seed = 0x675a_12f0_u64;
    let mut next = || {
        seed = seed
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        ((seed >> 32) % 9) as i64 - 4
    };
    let mut accepted = 0;
    for case in 0..240 {
        let segments: Vec<_> = (0..2 + case % 7)
            .map(|_| segment(next(), next(), next(), next()))
            .collect();
        // Only exclude the two unsupported input classes, never equal-x events,
        // verticals, contacts or multiway intersections.
        let Some(expected) = oracle(&segments) else {
            continue;
        };
        assert_eq!(
            results(&segments),
            expected,
            "grid case {case}: {segments:?}"
        );
        assert_identity_invariance(&segments, &expected);
        accepted += 1;
    }
    assert!(accepted > 100, "must exercise nonoverlapping grid sets");
}
