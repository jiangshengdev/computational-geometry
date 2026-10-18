use computational_geometry::{Point, Rational, Segment, validate_intersections};

#[test]
fn unified_validation_reports_agreement_for_empty_and_nonempty_results() {
    let p = |x, y| Point {
        x: Rational::from_integer(x),
        y: Rational::from_integer(y),
    };
    let inputs = [
        Segment {
            start: p(0.into(), 0.into()),
            end: p(2.into(), 2.into()),
        },
        Segment {
            start: p(0.into(), 2.into()),
            end: p(2.into(), 0.into()),
        },
    ];
    for segments in [&[][..], &inputs[..1], &inputs[..]] {
        let report = validate_intersections(segments);
        assert!(report.is_consistent(), "{report:?}");
        assert!(report.missing.is_empty());
        assert!(report.extra.is_empty());
        assert!(report.duplicates.is_empty());
        assert!(report.geometry_mismatches.is_empty());
    }
}
