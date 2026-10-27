import Mathlib

/-! Rational input identities and real closed-segment geometry. -/
namespace BOProof

abbrev QPoint := ℚ × ℚ
abbrev RPoint := ℝ × ℝ

structure InputSegment where
  start : QPoint
  finish : QPoint

/-- Indices retain input identity, including geometrically duplicate segments. -/
abbrev Input (n : ℕ) := Fin n → InputSegment

def realPoint (p : QPoint) : RPoint := (p.1, p.2)

def interpolate (a b : RPoint) (t : ℝ) : RPoint :=
  ((1 - t) * a.1 + t * b.1, (1 - t) * a.2 + t * b.2)

/-- The parameter is real; irrational interior points are included. -/
def closedSegment (a b : RPoint) : Set RPoint :=
  {p | ∃ t ∈ Set.Icc (0 : ℝ) 1, p = interpolate a b t}

def shear (s : ℚ) (p : RPoint) : RPoint := (p.1 + (s : ℝ) * p.2, p.2)

@[simp] theorem shear_inverse (s : ℚ) (p : RPoint) :
    shear (-s) (shear s p) = p := by
  ext <;> simp [shear]

theorem shear_injective (s : ℚ) : Function.Injective (shear s) := by
  intro p q h
  simpa using congrArg (shear (-s)) h

@[simp] theorem shear_zero (p : RPoint) : shear 0 p = p := by
  ext <;> simp [shear]

theorem shear_interpolate (s : ℚ) (a b : RPoint) (t : ℝ) :
    shear s (interpolate a b t) = interpolate (shear s a) (shear s b) t := by
  ext <;> simp [shear, interpolate]; ring

theorem shear_segment (s : ℚ) (a b : RPoint) :
    shear s '' closedSegment a b = closedSegment (shear s a) (shear s b) := by
  ext p
  constructor
  · rintro ⟨q, ⟨t, ht, rfl⟩, rfl⟩
    exact ⟨t, ht, shear_interpolate s a b t⟩
  · rintro ⟨t, ht, rfl⟩
    exact ⟨interpolate a b t, ⟨t, ht, rfl⟩, shear_interpolate s a b t⟩

/-- Arbitrary sets: in particular empty, singleton and overlapping segment intersections. -/
theorem shear_intersection (s : ℚ) (A B : Set RPoint) :
    shear s '' (A ∩ B) = (shear s '' A) ∩ (shear s '' B) :=
  Set.image_inter (shear_injective s)

theorem restore_intersection (s : ℚ) (A B : Set RPoint) :
    shear (-s) '' ((shear s '' A) ∩ (shear s '' B)) = A ∩ B := by
  rw [← shear_intersection, Set.image_image]
  simp

theorem shear_segment_intersection (s : ℚ) (a b c d : RPoint) :
    shear s '' (closedSegment a b ∩ closedSegment c d) =
      closedSegment (shear s a) (shear s b) ∩
        closedSegment (shear s c) (shear s d) := by
  rw [shear_intersection, shear_segment, shear_segment]

@[simp] theorem closedSegment_self (a : RPoint) : closedSegment a a = {a} := by
  ext p
  simp only [closedSegment, Set.mem_ofPred_eq, Set.mem_singleton_iff]
  have h (t : ℝ) : interpolate a a t = a := by
    ext <;> simp [interpolate] <;> ring
  simp only [h]
  constructor
  · rintro ⟨_, _, rfl⟩; rfl
  · intro hp; exact ⟨0, ⟨le_rfl, zero_le_one⟩, hp⟩

end BOProof
