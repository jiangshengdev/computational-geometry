//! Fixed supporting lines and two indexes of the same dynamic membership.
use super::{Point, Rational, SweepSegment};
use std::cell::{Ref, RefCell};
use std::cmp::Ordering;
use std::collections::{BTreeMap, BTreeSet};

pub(super) struct Group {
    pub(super) slope: Rational,
    pub(super) intercept: Rational,
    pub(super) members: BTreeSet<usize>,
    right_ends: BTreeSet<(Rational, usize)>,
    height_cache: RefCell<Option<(Rational, Rational)>>,
}

impl Group {
    pub(super) fn height(&self, u: &Rational) -> Rational {
        &self.slope * u + &self.intercept
    }

    fn cached_height(&self, u: &Rational) -> Ref<'_, Rational> {
        // Supporting geometry never changes with membership. Cache only the
        // height, not the event-side order: same-x events still compare slopes
        // against their own y and Before/After phase below. No global clearing.
        account!(access("height_cache", 1));
        let mut cache = self.height_cache.borrow_mut();
        if cache.as_ref().is_none_or(|(x, _)| x != u) {
            // This private comparison-only fraction need not be reduced.
            // All denominators are positive; public geometry and teaching values
            // still use height(), which returns a normalized rational.
            // Construct directly from fixed coefficients, never a past height,
            // so numerator/denominator bit lengths cannot accumulate by event.
            let denominator = self.slope.denom() * u.denom();
            let height = Rational::new_raw(
                self.slope.numer() * u.numer() * self.intercept.denom()
                    + self.intercept.numer() * &denominator,
                denominator * self.intercept.denom(),
            );
            if cache.is_some() {
                account!(update("height_cache", 1));
            } else {
                account!(add("height_cache", 1));
            }
            account!(bits("cached_height", &height));
            *cache = Some((u.clone(), height));
        }
        drop(cache);
        Ref::map(self.height_cache.borrow(), |cache| {
            &cache.as_ref().expect("height initialized").1
        })
    }

    pub(super) fn compare_height(&self, point: &Point) -> Ordering {
        compare_heights(&self.cached_height(&point.x), &point.y)
    }

    pub(super) fn insert(&mut self, id: usize, segment: &SweepSegment) {
        account!(access("members", 1));
        account!(access("right_ends", 1));
        account!(add("members", 1));
        account!(add("right_ends", 1));
        self.members.insert(id);
        self.right_ends.insert((segment.right.x.clone(), id));
    }

    pub(super) fn remove(&mut self, id: usize, segment: &SweepSegment) {
        account!(access("members", 1));
        account!(access("right_ends", 1));
        account!(delete("members", 1));
        account!(delete("right_ends", 1));
        self.members.remove(&id);
        self.right_ends.remove(&(segment.right.x.clone(), id));
    }

    pub(super) fn farthest(&self) -> &(Rational, usize) {
        account!(access("right_ends", 1));
        self.right_ends.last().expect("active group has a member")
    }
}

pub(super) fn initialize(
    segments: &[SweepSegment],
    cancelled: &dyn Fn() -> bool,
) -> Option<(Vec<Group>, Vec<Option<usize>>)> {
    let mut keys = BTreeMap::new();
    let mut groups = Vec::new();
    let mut group_of = Vec::with_capacity(segments.len());
    for segment in segments {
        if cancelled() {
            return None;
        }
        account!(add("group_of", 1));
        account!(access("segments", 1));
        let Some(slope) = &segment.slope else {
            group_of.push(None);
            continue;
        };
        account!(access("group_keys", 1));
        let id = *keys
            .entry((slope.clone(), segment.intercept.clone()))
            .or_insert_with(|| {
                account!(add("group_keys", 1));
                account!(add("groups", 1));
                let id = groups.len();
                groups.push(Group {
                    slope: slope.clone(),
                    intercept: segment.intercept.clone(),
                    members: BTreeSet::new(),
                    right_ends: BTreeSet::new(),
                    height_cache: RefCell::new(None),
                });
                id
            });
        group_of.push(Some(id));
    }
    account!(delete("group_keys", keys.len()));
    Some((groups, group_of))
}

#[derive(Clone, Copy)]
pub(super) enum Side {
    Before,
    After,
}

// Positive denominators and arbitrary-precision integers make cross products
// exact and overflow-free. Avoid Ratio's generic continued-division comparison,
// which must also support bounded integer types. Reduction is unnecessary.
fn compare_heights(a: &Rational, b: &Rational) -> Ordering {
    if a.denom() == b.denom() {
        a.numer().cmp(b.numer())
    } else {
        (a.numer() * b.denom()).cmp(&(b.numer() * a.denom()))
    }
}

pub(super) fn compare(groups: &[Group], a: usize, b: usize, point: &Point, side: Side) -> Ordering {
    if a == b {
        return Ordering::Equal;
    }
    account!(access("groups", 2));
    let height = groups[a].cached_height(&point.x);
    compare_heights(&height, &groups[b].cached_height(&point.x)).then_with(|| {
        account!(access("groups", 2));
        let slopes = groups[a].slope.cmp(&groups[b].slope);
        let position = compare_heights(&height, &point.y);
        if position.is_lt() || (position.is_eq() && matches!(side, Side::After)) {
            slopes
        } else {
            slopes.reverse()
        }
    })
}
