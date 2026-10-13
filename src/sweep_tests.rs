use super::*;

#[test]
fn unavailable_neighbor_returns_only_after_its_return_stop() {
    let point = Point {
        x: Rational::from_integer(0.into()),
        y: Rational::from_integer(0.into()),
    };
    let mut queue = BTreeMap::new();
    let mut checked = Vec::new();
    let mut observations = Vec::new();
    let mut observer = |boundary,
                        _: &BTreeMap<Point, Event>,
                        _: &[[usize; 2]],
                        locals: Vec<Variable>,
                        controls: Vec<ExecutionControl>| {
        observations.push((boundary, locals, controls));
    };
    assert_eq!(
        schedule_neighbors(
            &[],
            0,
            &[],
            &point,
            &mut queue,
            &mut checked,
            Some(&mut observer),
            &|| false
        ),
        None
    );
    assert_eq!(
        observations
            .iter()
            .map(|observation| observation.0)
            .collect::<Vec<_>>(),
        vec![0, 9, 11]
    );
    assert!(queue.is_empty() && checked.is_empty());
    let (_, pending, controls) = &observations[1];
    assert!(
        pending
            .iter()
            .any(|variable| variable.name == "return_value"
                && variable.availability == "unassigned"
                && variable.value.is_none())
    );
    assert!(controls.iter().any(|control| control.line == 1
        && control.keyword == "return"
        && control.state == "pending"));
    let (_, returned, controls) = &observations[2];
    assert!(returned.iter().any(
        |variable| variable.name == "return_value" && variable.value.as_deref() == Some("None")
    ));
    assert!(controls.iter().any(|control| control.line == 1
        && control.keyword == "return"
        && control.state == "returned"));
}
