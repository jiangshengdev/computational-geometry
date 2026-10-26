use super::super::{choose_shear, core};
use super::*;

#[test]
fn disabled_recording_never_allocates_projection_or_text_state() {
    let p = |x: i64, y: i64| crate::Point {
        x: Rational::from_integer(x.into()),
        y: Rational::from_integer(y.into()),
    };
    let input = [
        Segment {
            start: p(0, 0),
            end: p(4, 0),
        },
        Segment {
            start: p(2, 0),
            end: p(6, 0),
        },
        Segment {
            start: p(3, -1),
            end: p(3, 1),
        },
        Segment {
            start: p(3, 0),
            end: p(3, 0),
        },
    ];
    let shear = choose_shear(&input);
    let segments: Vec<_> = input.iter().map(|s| SweepSegment::new(s, &shear)).collect();
    let mut recorder = Recording::new(&input, &segments, &shear, None, &|| false);
    let result = core::run(&segments, &shear, &mut recorder, &|| false).unwrap();
    assert_eq!(result.len(), 6);
    assert!(recorder.publication.is_none());
    assert!(recorder.capture.is_none());
    assert!(recorder.input.is_none());
    assert!(recorder.transformed.is_none());
    assert!(recorder.event_projection.is_none());
    assert!(recorder.group_values.is_none());
    assert!(recorder.context.is_none());
    assert_eq!(recorder.next_call, 1);
}
