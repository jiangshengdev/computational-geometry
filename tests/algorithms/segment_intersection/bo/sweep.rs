use computational_geometry::{Geometry, Intersection, Point, Rational, Segment, intersections};
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
    let report = computational_geometry::validate_intersections(&segments);
    assert!(report.is_consistent(), "{report:?}");
    assert_eq!(
        computational_geometry::brute_force_intersections(&segments),
        vec![Intersection {
            segments: [0, 1],
            geometry: Geometry::Point(Point {
                x: rational(7, 3),
                y: rational(2, 1)
            }),
        }]
    );
    assert_eq!(
        intersections(&segments),
        vec![Intersection {
            segments: [0, 1],
            geometry: Geometry::Point(Point {
                x: rational(7, 3),
                y: rational(2, 1)
            }),
        }]
    );
}

fn segment(x1: i64, y1: i64, x2: i64, y2: i64) -> Segment {
    Segment {
        start: point(x1, y1),
        end: point(x2, y2),
    }
}

type PairResults = BTreeMap<[usize; 2], Geometry>;

fn point_intersections(entries: impl IntoIterator<Item = ([usize; 2], Point)>) -> PairResults {
    entries
        .into_iter()
        .map(|(pair, p)| (pair, Geometry::Point(p)))
        .collect()
}

fn normalized(geometry: Geometry) -> Geometry {
    match geometry {
        Geometry::Overlap { start, end } => {
            assert_ne!(start, end, "overlap must have positive length");
            if start < end {
                Geometry::Overlap { start, end }
            } else {
                Geometry::Overlap {
                    start: end,
                    end: start,
                }
            }
        }
        point => point,
    }
}

fn results(segments: &[Segment]) -> PairResults {
    let report = computational_geometry::validate_intersections(segments);
    assert!(report.is_consistent(), "{report:?}");
    let pairs = collect_results(segments.len(), intersections(segments));
    assert_eq!(
        pairs,
        oracle(segments),
        "independent public brute-force reference"
    );
    pairs
}

fn collect_results(input_count: usize, output: Vec<Intersection>) -> PairResults {
    let mut pairs = BTreeMap::new();
    for intersection in output {
        let [a, b] = intersection.segments;
        assert!(a < b && b < input_count, "invalid original input indices");
        assert!(
            pairs
                .insert([a, b], normalized(intersection.geometry))
                .is_none(),
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
    let expected = point_intersections([
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
    assert_eq!(
        results(&segments),
        point_intersections([([0, 2], point(6, 0))])
    );
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

// Used only to filter generated general-position samples, not to compute results.
fn cross(ax: &Rational, ay: &Rational, bx: &Rational, by: &Rational) -> Rational {
    ax * by - ay * bx
}

fn oracle(segments: &[Segment]) -> PairResults {
    collect_results(
        segments.len(),
        computational_geometry::brute_force_intersections(segments),
    )
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
        let expected = oracle(&segments);
        if !expected.values().all(|geometry| match geometry {
            Geometry::Point(p) => event_x.insert(p.x.clone()),
            Geometry::Overlap { .. } => panic!("general-position sample cannot overlap"),
        }) {
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
        point_intersections([(
            [0, 1],
            Point {
                x: huge + rational(2, 1),
                y: rational(2, 1)
            }
        )])
    );
}

#[test]
fn coincident_points_keep_independent_identity_and_separate_points_have_no_pairs() {
    let segments = [
        segment(0, 0, 0, 0),
        segment(0, 0, 0, 0),
        segment(0, 0, 0, 0),
        segment(0, 2, 0, 2),
        segment(3, 0, 3, 0),
    ];
    let expected = point_intersections([
        ([0, 1], point(0, 0)),
        ([0, 2], point(0, 0)),
        ([1, 2], point(0, 0)),
    ]);
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), expected);
    assert_identity_invariance(&segments, &expected);
    assert!(results(&[segments[0].clone()]).is_empty());
}

#[test]
fn points_on_fractional_segments_include_endpoints_but_exclude_off_line_and_extension() {
    for end in [point(0, 4), point(4, 0), point(4, 4)] {
        let shift = |p: Point| Point {
            x: p.x + rational(1, 3),
            y: p.y + rational(2, 7),
        };
        let start = shift(point(0, 0));
        let middle = shift(Point {
            x: &end.x / rational(2, 1),
            y: &end.y / rational(2, 1),
        });
        let beyond = shift(Point {
            x: &end.x * rational(2, 1),
            y: &end.y * rational(2, 1),
        });
        let end = shift(end);
        let mut segments = vec![Segment {
            start: start.clone(),
            end: end.clone(),
        }];
        for p in [
            start.clone(),
            middle.clone(),
            end.clone(),
            beyond,
            shift(point(1, 2)),
        ] {
            segments.push(Segment {
                start: p.clone(),
                end: p,
            });
        }
        let expected = point_intersections([([0, 1], start), ([0, 2], middle), ([0, 3], end)]);
        assert_eq!(results(&segments), expected);
        assert_eq!(oracle(&segments), expected);
        assert_identity_invariance(&segments, &expected);
    }
}

#[test]
fn points_join_mixed_events_without_losing_later_crossings() {
    let segments = [
        segment(-3, -3, 3, 3),
        segment(-4, 4, 4, -4),
        segment(-2, 0, 0, 0),
        segment(0, 0, 5, 0),
        segment(-5, 1, 6, 1),
        segment(0, 0, 0, 0),
        segment(0, 0, 0, 0),
        segment(0, 2, 0, 2),
    ];
    let mut expected = point_intersections([
        ([0, 1], point(0, 0)),
        ([0, 2], point(0, 0)),
        ([0, 3], point(0, 0)),
        ([1, 2], point(0, 0)),
        ([1, 3], point(0, 0)),
        ([2, 3], point(0, 0)),
        ([0, 4], point(1, 1)),
        ([1, 4], point(-1, 1)),
        ([5, 6], point(0, 0)),
    ]);
    for line in 0..4 {
        for p in [5, 6] {
            expected.insert([line, p], Geometry::Point(point(0, 0)));
        }
    }
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), expected);
    assert_identity_invariance(&segments, &expected);
}

#[test]
fn actively_generated_point_inputs_match_independent_exact_pairs() {
    for case in 0..48 {
        let transform = |p: &Point| Point {
            x: &p.x * rational(case % 3 + 1, case % 4 + 1) + rational(case % 7, 3),
            y: &p.y * rational(case % 5 + 1, case % 3 + 1) + rational(case % 5, 7),
        };
        let mut segments = vec![
            segment(-3, -3, 3, 3),
            segment(-3, 3, 3, -3),
            segment(0, -4, 0, 4),
            segment(-4, 0, 0, 0),
            segment(0, 0, 4, 0),
            segment(-5, 2, 5, 2),
        ];
        // Every case deliberately contains coincident points, isolated points,
        // endpoint contacts and interior contacts, without positive overlaps.
        for p in [
            point(0, 0),
            point(0, 0),
            point(0, 4),
            point(0, 2),
            point(2, 2),
            point(7, 7),
            point(case % 9 - 4, case % 7 - 3),
        ] {
            segments.push(Segment {
                start: p.clone(),
                end: p,
            });
        }
        let segments: Vec<_> = segments
            .iter()
            .map(|s| Segment {
                start: transform(&s.start),
                end: transform(&s.end),
            })
            .collect();
        for inputs in [&segments[..], &segments[6..]] {
            let expected = oracle(inputs);
            assert!(expected.values().all(|g| matches!(g, Geometry::Point(_))));
            assert_eq!(results(inputs), expected, "point case {case}");
            assert_identity_invariance(inputs, &expected);
        }
    }
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
    let expected = point_intersections([
        ([0, 1], at(0)),
        ([0, 2], at(1)),
        ([0, 3], at(3)),
        ([0, 4], at(3)),
        ([3, 4], at(3)),
    ]);
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), expected);
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
    let expected = point_intersections([
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
    assert_eq!(oracle(&segments), expected);
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
    let expected = point_intersections([
        ([0, 1], point(0, -2)),
        ([2, 3], point(0, 2)),
        ([0, 3], point(2, 0)),
    ]);
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), expected);
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
        let expected = point_intersections([([0, 1], point(0, 0))]);
        assert_eq!(results(&segments), expected);
        assert_eq!(oracle(&segments), expected);
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
        let expected = oracle(&segments);
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
        // Keep this earlier increment's nonzero domain. Point inputs are
        // deliberately generated in their own nonoverlapping cases below.
        if segments.iter().any(|s| s.start == s.end) {
            continue;
        }
        let expected = oracle(&segments);
        assert_eq!(
            results(&segments),
            expected,
            "grid case {case}: {segments:?}"
        );
        assert_identity_invariance(&segments, &expected);
        accepted += 1;
    }
    assert!(accepted > 100, "must exercise nonzero grid sets");
}

#[test]
fn nested_and_partial_overlaps_return_complete_pairwise_intervals() {
    let segments = [
        segment(0, 0, 6, 0),
        segment(2, 0, 8, 0),
        segment(3, 0, 4, 0),
    ];
    let expected = BTreeMap::from([
        (
            [0, 1],
            Geometry::Overlap {
                start: point(2, 0),
                end: point(6, 0),
            },
        ),
        (
            [0, 2],
            Geometry::Overlap {
                start: point(3, 0),
                end: point(4, 0),
            },
        ),
        (
            [1, 2],
            Geometry::Overlap {
                start: point(3, 0),
                end: point(4, 0),
            },
        ),
    ]);
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), expected);
    assert_identity_invariance(&segments, &expected);
}

#[test]
fn duplicate_and_reverse_oriented_inputs_keep_three_independent_overlap_pairs() {
    for (start, end) in [
        (point(0, 0), point(5, 0)),
        (point(2, -3), point(2, 4)),
        (
            Point {
                x: rational(-1, 3),
                y: rational(2, 5),
            },
            Point {
                x: rational(7, 3),
                y: rational(8, 5),
            },
        ),
    ] {
        let segments = [
            Segment {
                start: start.clone(),
                end: end.clone(),
            },
            Segment {
                start: end.clone(),
                end: start.clone(),
            },
            Segment {
                start: start.clone(),
                end: end.clone(),
            },
        ];
        let geometry = normalized(Geometry::Overlap { start, end });
        let expected = BTreeMap::from([
            ([0, 1], geometry.clone()),
            ([0, 2], geometry.clone()),
            ([1, 2], geometry),
        ]);
        assert_eq!(results(&segments), expected);
        assert_eq!(oracle(&segments), expected);
        assert_identity_invariance(&segments, &expected);
    }
}

#[test]
fn crossing_and_boundary_contacts_preserve_the_full_overlap_intervals() {
    let segments = [
        segment(0, 0, 6, 0),
        segment(2, 0, 8, 0),
        segment(3, 0, 4, 0),
        Segment {
            start: Point {
                x: rational(7, 2),
                y: rational(-1, 1),
            },
            end: Point {
                x: rational(7, 2),
                y: rational(1, 1),
            },
        },
        segment(2, -1, 2, 0),
    ];
    let mut expected = BTreeMap::from([
        (
            [0, 1],
            Geometry::Overlap {
                start: point(2, 0),
                end: point(6, 0),
            },
        ),
        (
            [0, 2],
            Geometry::Overlap {
                start: point(3, 0),
                end: point(4, 0),
            },
        ),
        (
            [1, 2],
            Geometry::Overlap {
                start: point(3, 0),
                end: point(4, 0),
            },
        ),
    ]);
    expected.extend(point_intersections([
        (
            [0, 3],
            Point {
                x: rational(7, 2),
                y: rational(0, 1),
            },
        ),
        (
            [1, 3],
            Point {
                x: rational(7, 2),
                y: rational(0, 1),
            },
        ),
        (
            [2, 3],
            Point {
                x: rational(7, 2),
                y: rational(0, 1),
            },
        ),
        ([0, 4], point(2, 0)),
        ([1, 4], point(2, 0)),
    ]));
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), expected);
    assert_identity_invariance(&segments, &expected);
}

#[test]
fn ending_a_shorter_overlap_member_does_not_hide_a_later_crossing() {
    let segments = [
        segment(0, 0, 10, 0),
        segment(0, 0, 4, 0),
        segment(2, 5, 8, -1),
    ];
    let expected = BTreeMap::from([
        (
            [0, 1],
            Geometry::Overlap {
                start: point(0, 0),
                end: point(4, 0),
            },
        ),
        ([0, 2], Geometry::Point(point(7, 0))),
    ]);
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), expected);
    assert_identity_invariance(&segments, &expected);
}

#[test]
fn generated_overlap_groups_with_crossings_match_independent_full_intersections() {
    for case in 0..64 {
        let transform = |p: &Point| {
            let (x, y) = match case % 4 {
                0 => (p.x.clone(), p.y.clone()),
                1 => (p.y.clone(), p.x.clone()),
                2 => (p.x.clone(), &p.x + &p.y),
                _ => (&p.y - &p.x, p.x.clone()),
            };
            Point {
                x: x * rational(case % 3 + 1, case % 5 + 1) + rational(case % 7, 3),
                y: y * rational(case % 4 + 1, case % 3 + 1) + rational(case % 5, 7),
            }
        };
        let extent = 9 + case % 5;
        let mut segments: Vec<_> = [
            segment(0, 0, extent, 0),
            segment(2, 0, extent + 2, 0),
            segment(3, 0, 5, 0),
            segment(extent, 0, 0, 0),
            segment(0, 0, extent, 0),
            segment(4, -3, 4, 3),
            segment(2, -2, 2, 0),
            segment(5, 0, 7, 0),
            segment(-1, -2, extent + 1, 2),
        ]
        .iter()
        .map(|s| Segment {
            start: transform(&s.start),
            end: transform(&s.end),
        })
        .collect();
        let expected = oracle(&segments);
        assert_eq!(results(&segments), expected, "overlap case {case}");
        assert_identity_invariance(&segments, &expected);

        // Keep the nonzero regression above, then combine its partial/nested
        // overlaps, reverse duplicates and crossings with deliberate points.
        for p in [
            point(4, 0),
            point(4, 0),
            point(2, 0),
            point(5, 0),
            point(extent, 0),
            point(extent + 2, 0),
            point(extent + 3, 0),
            point(case % (extent + 1), 0),
            point(4, 2),
        ] {
            let p = transform(&p);
            segments.push(Segment {
                start: p.clone(),
                end: p,
            });
        }
        let expected = oracle(&segments);
        assert_eq!(results(&segments), expected, "mixed overlap case {case}");
        assert_identity_invariance(&segments, &expected);
    }
}

#[test]
fn points_on_overlap_groups_preserve_full_intervals_and_all_incident_pairs() {
    for vertical in [false, true] {
        let at = |x, y| {
            let (x, y) = if vertical { (y, x) } else { (x, y) };
            Point {
                x: rational(x, 1) + rational(1, 3),
                y: rational(y, 1) + rational(2, 7),
            }
        };
        let segments: Vec<_> = [
            (0, 0, 6, 0),
            (6, 0, 0, 0),
            (2, 0, 4, 0),
            (2, -2, 2, 2),
            (1, -1, 2, 0),
            (2, 0, 2, 0),
            (2, 0, 2, 0),
            (4, 0, 4, 0),
            (6, 0, 6, 0),
        ]
        .into_iter()
        .map(|(x1, y1, x2, y2)| Segment {
            start: at(x1, y1),
            end: at(x2, y2),
        })
        .collect();
        // Inputs 0..=6 all meet at (2,0). Only the three collinear
        // nonzero pairs intersect in intervals; the other 18 pairs are points.
        let mut expected = point_intersections([
            ([0, 3], at(2, 0)),
            ([0, 4], at(2, 0)),
            ([0, 5], at(2, 0)),
            ([0, 6], at(2, 0)),
            ([1, 3], at(2, 0)),
            ([1, 4], at(2, 0)),
            ([1, 5], at(2, 0)),
            ([1, 6], at(2, 0)),
            ([2, 3], at(2, 0)),
            ([2, 4], at(2, 0)),
            ([2, 5], at(2, 0)),
            ([2, 6], at(2, 0)),
            ([3, 4], at(2, 0)),
            ([3, 5], at(2, 0)),
            ([3, 6], at(2, 0)),
            ([4, 5], at(2, 0)),
            ([4, 6], at(2, 0)),
            ([5, 6], at(2, 0)),
            ([0, 7], at(4, 0)),
            ([1, 7], at(4, 0)),
            ([2, 7], at(4, 0)),
            ([0, 8], at(6, 0)),
            ([1, 8], at(6, 0)),
        ]);
        expected.extend([
            (
                [0, 1],
                Geometry::Overlap {
                    start: at(0, 0),
                    end: at(6, 0),
                },
            ),
            (
                [0, 2],
                Geometry::Overlap {
                    start: at(2, 0),
                    end: at(4, 0),
                },
            ),
            (
                [1, 2],
                Geometry::Overlap {
                    start: at(2, 0),
                    end: at(4, 0),
                },
            ),
        ]);
        assert_eq!(results(&segments), expected);
        assert_eq!(oracle(&segments), expected);
        assert_identity_invariance(&segments, &expected);
    }
}

#[test]
fn equal_x_mixed_events_preserve_earlier_and_later_crossings() {
    // y=x-2, y=-x-2, y=x+2, y=-x+2. No vertical direction,
    // so x=0 really is one sweep coordinate with two different event positions.
    let segments = [
        segment(-3, -5, 3, 1),
        segment(-3, 1, 3, -5),
        segment(-3, -1, 3, 5),
        segment(-3, 5, 3, -1),
        segment(3, 1, -3, -5),
        segment(3, 5, -3, -1),
        segment(0, -2, 0, -2),
        segment(0, -2, 0, -2),
        segment(0, 2, 0, 2),
        segment(0, 7, 0, 7),
    ];
    let mut expected = point_intersections([
        ([1, 2], point(-2, 0)),
        ([1, 5], point(-2, 0)),
        ([0, 1], point(0, -2)),
        ([1, 4], point(0, -2)),
        ([2, 3], point(0, 2)),
        ([3, 5], point(0, 2)),
        ([0, 3], point(2, 0)),
        ([3, 4], point(2, 0)),
        ([0, 6], point(0, -2)),
        ([1, 6], point(0, -2)),
        ([4, 6], point(0, -2)),
        ([0, 7], point(0, -2)),
        ([1, 7], point(0, -2)),
        ([4, 7], point(0, -2)),
        ([6, 7], point(0, -2)),
        ([2, 8], point(0, 2)),
        ([3, 8], point(0, 2)),
        ([5, 8], point(0, 2)),
    ]);
    expected.extend([
        (
            [0, 4],
            Geometry::Overlap {
                start: point(-3, -5),
                end: point(3, 1),
            },
        ),
        (
            [2, 5],
            Geometry::Overlap {
                start: point(-3, -1),
                end: point(3, 5),
            },
        ),
    ]);
    assert_eq!(results(&segments), expected);
    assert_eq!(oracle(&segments), expected);
    assert_identity_invariance(&segments, &expected);
}
