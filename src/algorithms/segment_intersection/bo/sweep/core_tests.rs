use super::*;
use crate::{Rational, Segment, brute_force_intersections};

#[derive(Default, Debug)]
struct Audit {
    events: usize,
    incident: usize,
    members: usize,
    queue_peak: usize,
    cert_peak: usize,
    sources_peak: usize,
}
impl Observer for Audit {
    fn observe(&mut self, view: View<'_>) -> Option<()> {
        let (buckets, certificates, references, sources) = view.queue.storage();
        assert_eq!(certificates, references);
        self.queue_peak = self.queue_peak.max(buckets);
        self.cert_peak = self.cert_peak.max(certificates);
        self.sources_peak = self.sources_peak.max(sources);
        if view.module == "event" && view.boundary == 1 {
            self.events += 1;
            self.incident += view.details.incident.len();
        }
        if view.module == "members" && view.boundary == 2 {
            self.members += view
                .details
                .members
                .unwrap()
                .iter()
                .map(Vec::len)
                .sum::<usize>();
        }
        Some(())
    }
}

#[test]
fn scale_families_pay_only_for_real_incidence_and_keep_live_queue_linear() {
    let r = |n: i64| Rational::from_integer(n.into());
    let segment = |x, y, u, v| Segment {
        start: Point { x: r(x), y: r(y) },
        end: Point { x: r(u), y: r(v) },
    };
    for size in [8_i64, 16, 32] {
        let families = [
            (
                "sparse",
                (0..size)
                    .map(|i| segment(0, i, size, i))
                    .collect::<Vec<_>>(),
            ),
            ("common", (0..size).map(|i| segment(-1, -i, 1, i)).collect()),
            (
                "overlap_points",
                (0..size)
                    .map(|i| segment(-size + i, 0, size - i, 0))
                    .chain((0..size).map(|i| segment(i, 0, i, 0)))
                    .collect(),
            ),
            (
                "changing_neighbors",
                (0..size)
                    .map(|i| segment(0, i, size, (i * 7) % size))
                    .collect(),
            ),
        ];
        for (name, input) in families {
            let shear = super::super::choose_shear(&input);
            let segments: Vec<_> = input.iter().map(|s| SweepSegment::new(s, &shear)).collect();
            let mut audit = Audit::default();
            let result = run(&segments, &shear, &mut audit, &|| false).unwrap();
            let key = |i: crate::Intersection| (i.segments, i.geometry);
            let actual: std::collections::BTreeMap<_, _> =
                result.iter().cloned().map(key).collect();
            assert_eq!(actual.len(), result.len(), "duplicates");
            assert_eq!(
                actual,
                brute_force_intersections(&input)
                    .into_iter()
                    .map(key)
                    .collect()
            );
            let n = input.len();
            let k = result.len();
            assert!(audit.events <= 2 * n + k);
            assert!(audit.incident <= 2 * n + 2 * k);
            assert!(audit.members <= 2 * k);
            assert!(audit.cert_peak <= n.saturating_sub(1));
            assert!(audit.queue_peak <= 3 * n);
            assert!(audit.sources_peak <= 2 * n);
            eprintln!("{name} n={n} k={k} {audit:?}");
        }
    }
}
