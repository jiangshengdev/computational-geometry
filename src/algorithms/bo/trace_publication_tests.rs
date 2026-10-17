use super::super::sweep::Event;
use super::super::teaching::TraceCapture;
use super::*;
use std::{cell::RefCell, collections::BTreeMap, sync::Arc};

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
        &RefCell::new(TraceCapture::default()),
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
        let mut batches = Vec::new();
        let mut emit = |batch: SweepTrace| {
            batches.push(batch);
            true
        };
        let mut publication = TracePublication::new(&shear, &mut emit);
        for _ in 0..3 {
            publication.steps().push(SweepStep::capture(
                "initial",
                Some(&source),
                &queue,
                &[],
                &[],
                &[],
                &[],
                &Arc::from("[]"),
                &RefCell::new(TraceCapture::default()),
            ));
            assert!(publication.publish());
            assert_eq!(publication.steps.len(), 1);
            assert_eq!(publication.steps[0].current.as_ref(), Some(&source));
            assert_eq!(publication.steps[0].pending, vec![source.clone()]);
        }
        assert!(publication.publish(), "retained tail must not be resent");
        assert_eq!(publication.projection.points.len(), 1);
        assert_eq!(batches.len(), 3);
        for batch in batches {
            assert_eq!(batch.shear, shear);
            let batch = batch.steps;
            assert_eq!(batch.len(), 1);
            assert_eq!(batch[0].current.as_ref(), Some(&expected));
            assert_eq!(batch[0].pending, vec![expected.clone()]);
        }
    }
}
