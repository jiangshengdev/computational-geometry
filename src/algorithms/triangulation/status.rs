//! Deterministic AVL tree for sweep edges. The caller supplies the ordering at
//! the current event; a validated simple boundary never swaps active edges.

use std::cmp::Ordering;

#[derive(Default)]
pub(super) struct Status {
    root: Link,
}

type Link = Option<Box<Node>>;

struct Node {
    edge: usize,
    height: usize,
    left: Link,
    right: Link,
}

fn height(node: &Link) -> usize {
    node.as_ref().map_or(0, |node| node.height)
}

impl Node {
    fn update(&mut self) {
        self.height = 1 + height(&self.left).max(height(&self.right));
    }

    fn rotate_left(mut self: Box<Self>) -> Box<Self> {
        let mut root = self.right.take().expect("right child for AVL rotation");
        self.right = root.left.take();
        self.update();
        root.left = Some(self);
        root.update();
        root
    }

    fn rotate_right(mut self: Box<Self>) -> Box<Self> {
        let mut root = self.left.take().expect("left child for AVL rotation");
        self.left = root.right.take();
        self.update();
        root.right = Some(self);
        root.update();
        root
    }

    fn balance(mut self: Box<Self>) -> Box<Self> {
        self.update();
        if height(&self.left) > height(&self.right) + 1 {
            let left = self.left.as_ref().expect("heavy left child");
            if height(&left.right) > height(&left.left) {
                self.left = self.left.take().map(Node::rotate_left);
            }
            return self.rotate_right();
        }
        if height(&self.right) > height(&self.left) + 1 {
            let right = self.right.as_ref().expect("heavy right child");
            if height(&right.left) > height(&right.right) {
                self.right = self.right.take().map(Node::rotate_right);
            }
            return self.rotate_left();
        }
        self
    }
}

impl Status {
    pub(super) fn insert(&mut self, edge: usize, compare: &impl Fn(usize, usize) -> Ordering) {
        self.root = Some(insert(self.root.take(), edge, compare));
    }

    pub(super) fn remove(&mut self, edge: usize, compare: &impl Fn(usize, usize) -> Ordering) {
        self.root = remove(self.root.take(), edge, compare);
    }

    pub(super) fn neighbors(
        &self,
        edge: usize,
        compare: &impl Fn(usize, usize) -> Ordering,
    ) -> (Option<usize>, Option<usize>) {
        let mut lower = None;
        let mut upper = None;
        let mut cursor = self.root.as_deref();
        while let Some(node) = cursor {
            match compare(edge, node.edge) {
                Ordering::Less => {
                    upper = Some(node.edge);
                    cursor = node.left.as_deref();
                }
                Ordering::Greater => {
                    lower = Some(node.edge);
                    cursor = node.right.as_deref();
                }
                Ordering::Equal => {
                    let mut left = node.left.as_deref();
                    while let Some(child) = left {
                        lower = Some(child.edge);
                        left = child.right.as_deref();
                    }
                    let mut right = node.right.as_deref();
                    while let Some(child) = right {
                        upper = Some(child.edge);
                        right = child.left.as_deref();
                    }
                    break;
                }
            }
        }
        (lower, upper)
    }

    pub(super) fn left_of(&self, is_left: impl Fn(usize) -> bool) -> Option<usize> {
        let mut result = None;
        let mut cursor = self.root.as_deref();
        while let Some(node) = cursor {
            if is_left(node.edge) {
                result = Some(node.edge);
                cursor = node.right.as_deref();
            } else {
                cursor = node.left.as_deref();
            }
        }
        result
    }
}

fn insert(root: Link, edge: usize, compare: &impl Fn(usize, usize) -> Ordering) -> Box<Node> {
    let Some(mut root) = root else {
        return Box::new(Node {
            edge,
            height: 1,
            left: None,
            right: None,
        });
    };
    match compare(edge, root.edge) {
        Ordering::Less => root.left = Some(insert(root.left.take(), edge, compare)),
        Ordering::Greater => root.right = Some(insert(root.right.take(), edge, compare)),
        Ordering::Equal => return root,
    }
    root.balance()
}

fn remove(root: Link, edge: usize, compare: &impl Fn(usize, usize) -> Ordering) -> Link {
    let mut root = root?;
    match compare(edge, root.edge) {
        Ordering::Less => root.left = remove(root.left.take(), edge, compare),
        Ordering::Greater => root.right = remove(root.right.take(), edge, compare),
        Ordering::Equal => {
            if root.left.is_none() {
                return root.right;
            }
            if root.right.is_none() {
                return root.left;
            }
            let (successor, right) = take_min(root.right.take().expect("right subtree"));
            root.edge = successor;
            root.right = right;
        }
    }
    Some(root.balance())
}

fn take_min(mut root: Box<Node>) -> (usize, Link) {
    let Some(left) = root.left.take() else {
        return (root.edge, root.right);
    };
    let (edge, left) = take_min(left);
    root.left = left;
    (edge, Some(root.balance()))
}
