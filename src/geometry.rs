/// Arbitrary-precision rational coordinates; no floating-point approximation.
pub use num_rational::BigRational as Rational;

/// An exact position in the plane.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Point {
    pub x: Rational,
    pub y: Rational,
}

/// A closed segment. Endpoint order does not determine input identity.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Segment {
    pub start: Point,
    pub end: Point,
}

/// One intersecting unordered pair of original input indices.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Intersection {
    /// Indices into the input slice, in increasing order.
    pub segments: [usize; 2],
    pub geometry: Geometry,
}

/// The complete mathematical intersection of a pair of closed segments.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Geometry {
    Point(Point),
    /// A nonzero closed interval. Endpoint presentation order is not a contract.
    Overlap {
        start: Point,
        end: Point,
    },
}

// Compare and hash the stored integers, avoiding rational division on every
// cache lookup. Equivalent noncanonical representations may occupy two entries.
pub(crate) struct PointRepresentation(pub(crate) Point);

impl PartialEq for PointRepresentation {
    fn eq(&self, other: &Self) -> bool {
        self.0.x.numer() == other.0.x.numer()
            && self.0.x.denom() == other.0.x.denom()
            && self.0.y.numer() == other.0.y.numer()
            && self.0.y.denom() == other.0.y.denom()
    }
}

impl Eq for PointRepresentation {}

impl std::hash::Hash for PointRepresentation {
    fn hash<H: std::hash::Hasher>(&self, state: &mut H) {
        std::hash::Hash::hash(self.0.x.numer(), state);
        std::hash::Hash::hash(self.0.x.denom(), state);
        std::hash::Hash::hash(self.0.y.numer(), state);
        std::hash::Hash::hash(self.0.y.denom(), state);
    }
}
