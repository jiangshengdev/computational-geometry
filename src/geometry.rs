/// Arbitrary-precision rational coordinates; no floating-point approximation.
pub use num_rational::BigRational as Rational;

/// An exact position in the plane.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Point {
    pub x: Rational,
    pub y: Rational,
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
