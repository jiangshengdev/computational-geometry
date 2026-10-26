use super::Status;

fn audit(tree: &Status, expected: usize) {
    fn visit(link: &super::Link) -> (usize, usize) {
        let Some(node) = link else { return (0, 0) };
        let (left_count, left_height) = visit(&node.left);
        let (right_count, right_height) = visit(&node.right);
        assert!(left_height.abs_diff(right_height) <= 1);
        let height = 1 + left_height.max(right_height);
        assert_eq!(node.height, height);
        (1 + left_count + right_count, height)
    }
    assert_eq!(visit(&tree.root).0, expected);
}

#[test]
fn range_neighbors_and_reinsertion_follow_external_order() {
    let mut tree = Status::default();
    let before = |a: usize, b: usize| a.cmp(&b);
    for id in (0..128).rev() {
        tree.insert(id, &before);
        audit(&tree, 128 - id);
    }
    assert_eq!(tree.lower_bound(|id| id >= 40), Some(40));
    assert_eq!(tree.neighbors(40, &before), (Some(39), Some(41)));
    for id in 40..80 {
        tree.remove(id, &before);
        audit(&tree, 167 - id);
    }
    assert_eq!(tree.lower_bound(|id| id >= 40), Some(80));
    let key = |id: usize| if (40..80).contains(&id) { 119 - id } else { id };
    let after = |a, b| key(a).cmp(&key(b));
    for id in 40..80 {
        tree.insert(id, &after);
        audit(&tree, 49 + id);
    }
    assert_eq!(tree.neighbors(79, &after), (Some(39), Some(78)));
    assert_eq!(tree.neighbors(40, &after), (Some(41), Some(80)));
    for id in 0..128 {
        tree.remove(id, &after);
        audit(&tree, 127 - id);
    }
    assert_eq!(tree.lower_bound(|_| true), None);
}
