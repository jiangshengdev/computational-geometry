use super::*;
use crate::Segment;

#[test]
fn closed_members_cover_gaps_chains_nested_and_reversed_inputs() {
    let r = |n: i64| Rational::from_integer(n.into());
    let segments: Vec<_> = [(0, 2), (2, 4), (1, 3), (3, 1), (7, 8), (1, 2)]
        .into_iter()
        .map(|(a, b)| {
            SweepSegment::new(
                &Segment {
                    start: Point { x: r(a), y: r(0) },
                    end: Point { x: r(b), y: r(0) },
                },
                &r(0),
            )
        })
        .collect();
    let mut results = Vec::new();
    let groups = prepare(
        &segments,
        &r(0),
        &mut results,
        &mut |_, _| Some(()),
        &|| false,
    )
    .unwrap();
    assert_eq!(groups.covers.len(), 2);
    assert_eq!(
        (&groups.covers[0].left.x, &groups.covers[0].right.x),
        (&r(0), &r(4))
    );
    for (x, expected) in [(2, vec![0, 1, 2, 3, 5]), (5, vec![]), (7, vec![4])] {
        let mut actual = groups.lines[0].members(&r(x), &segments);
        actual.sort_unstable();
        assert_eq!(actual, expected);
    }
    let pairs: std::collections::BTreeSet<_> = results.iter().map(|i| i.segments).collect();
    assert_eq!(pairs.len(), results.len());
    assert_eq!(pairs.len(), 10);
    assert_eq!(
        results
            .iter()
            .find(|i| i.segments == [2, 3])
            .unwrap()
            .geometry,
        Geometry::Overlap {
            start: Point { x: r(1), y: r(0) },
            end: Point { x: r(3), y: r(0) }
        }
    );
}
