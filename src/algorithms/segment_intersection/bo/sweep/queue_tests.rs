use super::*;
fn p(x: i64) -> Point {
    Point {
        x: crate::Rational::from_integer(x.into()),
        y: crate::Rational::from_integer(0.into()),
    }
}

#[test]
fn shared_sources_are_consumed_and_cancelled_without_history() {
    let mut queue = Queue::default();
    queue.buckets.entry(p(3)).or_default().points.push(7);
    queue.schedule(edge(0, 1), p(3), &p(0));
    queue.schedule(edge(1, 2), p(3), &p(0));
    queue.cancel(edge(0, 1));
    assert_eq!(queue.buckets.len(), 1);
    queue.cancel(edge(1, 2));
    assert_eq!(queue.pop().unwrap().1.points, vec![7]);
    for _ in 0..1000 {
        queue.schedule(edge(0, 1), p(5), &p(0));
        queue.schedule(edge(1, 2), p(5), &p(0));
        queue.cancel(edge(0, 1));
        assert_eq!(queue.certificates.len(), 1);
        queue.cancel(edge(1, 2));
        assert!(queue.buckets.is_empty());
        assert!(queue.certificates.is_empty());
    }
    queue.schedule(edge(0, 1), p(5), &p(0));
    assert_eq!(queue.pop().unwrap().0, p(5));
    queue.cancel(edge(0, 1));
    queue.schedule(edge(0, 1), p(5), &p(5));
    assert!(queue.pop().is_none());
}
