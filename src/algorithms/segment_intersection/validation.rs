use std::collections::BTreeMap;

use crate::{Geometry, Intersection, Segment, brute_force_intersections, intersections};

/// All disagreements between BO output and the independent exact reference.
/// Categories may overlap: a repeated extra pair is both extra and duplicated,
/// and each incorrect occurrence of a repeated pair is a geometry mismatch.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ValidationReport {
    /// Reference records whose unordered pairs are absent from BO output.
    pub missing: Vec<Intersection>,
    /// Every BO record whose unordered pair is absent from the reference.
    pub extra: Vec<Intersection>,
    /// Repeated BO pairs, retaining all occurrences, including the first.
    pub duplicates: Vec<DuplicatePair>,
    /// Each BO record with geometry different from the reference for its pair.
    pub geometry_mismatches: Vec<GeometryMismatch>,
}

impl ValidationReport {
    /// Whether no missing, extra, repeated or geometrically different records exist.
    pub fn is_consistent(&self) -> bool {
        self.missing.is_empty()
            && self.extra.is_empty()
            && self.duplicates.is_empty()
            && self.geometry_mismatches.is_empty()
    }
}

/// A repeated unordered pair in BO output.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct DuplicatePair {
    /// Original input indices in increasing order.
    pub segments: [usize; 2],
    /// Unmodified BO records in their original relative output order.
    pub occurrences: Vec<Intersection>,
}

/// A BO occurrence whose exact geometry differs from its reference.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GeometryMismatch {
    /// Unmodified BO record, including original input indices.
    pub reported: Intersection,
    /// The complete reference intersection of that unordered pair.
    pub reference: Geometry,
}

/// Run BO and independent brute force on the same input and report all differences.
///
/// Accepts the same input domain and normalized rationals as [intersections].
/// Compares exact geometry, ignoring output order, pair direction and overlap
/// endpoint presentation order. Duplicate pairs are never discarded. Report
/// records retain original geometry and identities; report order is unspecified.
/// Agreement is evidence, not an unconditional proof of either algorithm.
///
/// This optional check incurs both algorithms' costs. Ordinary [intersections]
/// calls never run brute force. Neither algorithm's output is corrected or used
/// as a fallback. For b BO records and r reference records, comparison uses
/// O((b+r) log(b+r+1)) pair-key operations and O(b+r) geometry comparisons/storage,
/// excluding arbitrary-precision coordinate comparison and copying costs.
pub fn validate_intersections(segments: &[Segment]) -> ValidationReport {
    compare_results(
        &intersections(segments),
        &brute_force_intersections(segments),
    )
}

fn pair_key(record: &Intersection) -> [usize; 2] {
    let [a, b] = record.segments;
    [a.min(b), a.max(b)]
}

fn equivalent(a: &Geometry, b: &Geometry) -> bool {
    match (a, b) {
        (Geometry::Point(a), Geometry::Point(b)) => a == b,
        (Geometry::Overlap { start: a, end: b }, Geometry::Overlap { start: c, end: d }) => {
            (a == c && b == d) || (a == d && b == c)
        }
        _ => false,
    }
}

// The reference is supplied only by brute_force_intersections, which emits each
// pair once. Tests inject BO records at this same comparison boundary.
fn compare_results(reported: &[Intersection], reference: &[Intersection]) -> ValidationReport {
    let expected: BTreeMap<_, _> = reference.iter().map(|r| (pair_key(r), r)).collect();
    let mut actual: BTreeMap<_, Vec<&Intersection>> = BTreeMap::new();
    let mut report = ValidationReport::default();
    for record in reported {
        let pair = pair_key(record);
        actual.entry(pair).or_default().push(record);
        match expected.get(&pair) {
            None => report.extra.push(record.clone()),
            Some(expected) if !equivalent(&record.geometry, &expected.geometry) => {
                report.geometry_mismatches.push(GeometryMismatch {
                    reported: record.clone(),
                    reference: expected.geometry.clone(),
                });
            }
            Some(_) => {}
        }
    }
    for (pair, record) in expected {
        if !actual.contains_key(&pair) {
            report.missing.push(record.clone());
        }
    }
    for (segments, occurrences) in actual {
        if occurrences.len() > 1 {
            report.duplicates.push(DuplicatePair {
                segments,
                occurrences: occurrences.into_iter().cloned().collect(),
            });
        }
    }
    report
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Point, Rational};

    fn point(x: i64, y: i64) -> Point {
        Point {
            x: Rational::from_integer(x.into()),
            y: Rational::from_integer(y.into()),
        }
    }

    fn at(x: i64, y: i64) -> Geometry {
        Geometry::Point(point(x, y))
    }

    fn interval(start: i64, end: i64) -> Geometry {
        Geometry::Overlap {
            start: point(start, 0),
            end: point(end, 0),
        }
    }

    fn record(segments: [usize; 2], geometry: Geometry) -> Intersection {
        Intersection { segments, geometry }
    }

    #[test]
    fn reports_every_difference_with_original_records_and_reference_geometry() {
        // Deliberately corrupt one BO collection: wrong point, shortened overlap,
        // wrong result type, missing pair, and repeated extra/conflicting pairs.
        let reference = vec![
            record([0, 1], at(1, 0)),
            record([0, 2], interval(0, 4)),
            record([0, 3], interval(1, 3)),
            record([0, 4], at(3, 0)),
        ];
        let reported = vec![
            record([1, 0], at(2, 0)),
            record([0, 2], interval(0, 3)),
            record([0, 3], at(1, 0)),
            record([1, 2], at(5, 0)),
            record([2, 1], at(6, 0)),
            record([0, 1], at(1, 0)),
            record([1, 0], interval(0, 2)),
        ];
        let report = compare_results(&reported, &reference);
        assert!(!report.is_consistent());
        assert_eq!(
            report,
            ValidationReport {
                missing: vec![record([0, 4], at(3, 0))],
                extra: vec![record([1, 2], at(5, 0)), record([2, 1], at(6, 0))],
                duplicates: vec![
                    DuplicatePair {
                        segments: [0, 1],
                        occurrences: vec![
                            record([1, 0], at(2, 0)),
                            record([0, 1], at(1, 0)),
                            record([1, 0], interval(0, 2))
                        ],
                    },
                    DuplicatePair {
                        segments: [1, 2],
                        occurrences: vec![record([1, 2], at(5, 0)), record([2, 1], at(6, 0))],
                    },
                ],
                geometry_mismatches: vec![
                    GeometryMismatch {
                        reported: record([1, 0], at(2, 0)),
                        reference: at(1, 0)
                    },
                    GeometryMismatch {
                        reported: record([0, 2], interval(0, 3)),
                        reference: interval(0, 4)
                    },
                    GeometryMismatch {
                        reported: record([0, 3], at(1, 0)),
                        reference: interval(1, 3)
                    },
                    GeometryMismatch {
                        reported: record([1, 0], interval(0, 2)),
                        reference: at(1, 0)
                    },
                ],
            }
        );
    }

    #[test]
    fn representation_changes_do_not_create_differences() {
        let reference = [record([0, 1], at(2, 0)), record([1, 2], interval(0, 4))];
        let reported = [record([2, 1], interval(4, 0)), record([1, 0], at(2, 0))];
        assert_eq!(
            compare_results(&reported, &reference),
            ValidationReport::default()
        );
        assert_eq!(compare_results(&[], &[]), ValidationReport::default());
    }

    #[test]
    fn equivalent_duplicate_occurrences_are_still_reported() {
        let reference = [record([0, 1], interval(0, 4))];
        for duplicate in [
            record([0, 1], interval(0, 4)),
            record([1, 0], interval(4, 0)),
        ] {
            let reported = [reference[0].clone(), duplicate];
            let report = compare_results(&reported, &reference);
            assert!(!report.is_consistent());
            assert_eq!(
                report,
                ValidationReport {
                    duplicates: vec![DuplicatePair {
                        segments: [0, 1],
                        occurrences: reported.to_vec()
                    }],
                    ..ValidationReport::default()
                }
            );
        }
    }

    #[test]
    fn exact_rationals_are_not_compared_through_rounded_coordinates() {
        let reference = [record([0, 1], at(1, 0))];
        let denominator = "100000000000000000000000000000000000000000000000000"
            .parse()
            .unwrap();
        let reported = [record(
            [0, 1],
            Geometry::Point(Point {
                x: Rational::from_integer(1.into()) + Rational::new(1.into(), denominator),
                y: Rational::from_integer(0.into()),
            }),
        )];
        let report = compare_results(&reported, &reference);
        assert!(!report.is_consistent());
        assert_eq!(
            report,
            ValidationReport {
                geometry_mismatches: vec![GeometryMismatch {
                    reported: reported[0].clone(),
                    reference: at(1, 0),
                }],
                ..ValidationReport::default()
            }
        );
    }

    #[test]
    fn missing_and_extra_pairs_independently_reject_agreement() {
        let reference = [record([0, 1], at(0, 0))];
        let missing = compare_results(&[], &reference);
        assert!(!missing.is_consistent());
        assert_eq!(
            missing,
            ValidationReport {
                missing: reference.to_vec(),
                ..ValidationReport::default()
            }
        );
        let extra = compare_results(&reference, &[]);
        assert!(!extra.is_consistent());
        assert_eq!(
            extra,
            ValidationReport {
                extra: reference.to_vec(),
                ..ValidationReport::default()
            }
        );
    }
}
