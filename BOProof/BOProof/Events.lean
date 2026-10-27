/-
Copyright (c) 2026 Jiang Sheng. All rights reserved.
No project license is specified.
Authors: Jiang Sheng
-/
module

public import BOProof.Integerization

/-! Actual segment intersections, rather than arbitrary support-line intersections. -/
@[expose] public section

namespace BOProof

abbrev IPoint := ℤ × ℤ

def intPoint (p : IPoint) : RPoint := (p.1, p.2)

structure IntegerSegment where
  start : IPoint
  finish : IPoint

def IntegerSegment.points (l : IntegerSegment) : Set RPoint :=
  closedSegment (intPoint l.start) (intPoint l.finish)

def IntegerSegment.a (l : IntegerSegment) : ℤ := l.finish.2 - l.start.2
def IntegerSegment.b (l : IntegerSegment) : ℤ := l.start.1 - l.finish.1
def IntegerSegment.c (l : IntegerSegment) : ℤ := l.a * l.start.1 + l.b * l.start.2
def determinant (l k : IntegerSegment) : ℤ := l.a * k.b - k.a * l.b

/-- Nonparallel directions. Zero directions cannot satisfy this predicate. -/
def Nonparallel (l k : IntegerSegment) : Prop :=
  (l.finish.1 - l.start.1) * (k.finish.2 - k.start.2) ≠
    (k.finish.1 - k.start.1) * (l.finish.2 - l.start.2)

theorem determinant_ne_zero (l k : IntegerSegment) (h : Nonparallel l k) :
    determinant l k ≠ 0 := by
  dsimp [Nonparallel, determinant, IntegerSegment.a, IntegerSegment.b] at *
  intro he
  apply h
  nlinarith

theorem nonparallel_nonzero (l k : IntegerSegment) (h : Nonparallel l k) :
    l.start ≠ l.finish ∧ k.start ≠ k.finish := by
  constructor <;> intro he <;> apply h <;> simp [← he]

theorem line_equation (l : IntegerSegment) (p : RPoint) (hp : p ∈ l.points) :
    (l.a : ℝ) * p.1 + (l.b : ℝ) * p.2 = l.c := by
  obtain ⟨t, _, rfl⟩ := hp
  simp [interpolate, intPoint, IntegerSegment.a, IntegerSegment.b, IntegerSegment.c]
  ring

def crossing (l k : IntegerSegment) : QPoint :=
  (((l.c * k.b - k.c * l.b : ℤ) : ℚ) / determinant l k,
    ((l.a * k.c - k.a * l.c : ℤ) : ℚ) / determinant l k)

theorem actual_crossing (l k : IntegerSegment) (h : Nonparallel l k)
    (p : RPoint) (hl : p ∈ l.points) (hk : p ∈ k.points) :
    p = realPoint (crossing l k) := by
  have hd : (determinant l k : ℝ) ≠ 0 := by exact_mod_cast determinant_ne_zero l k h
  have h₁ := line_equation l p hl
  have h₂ := line_equation k p hk
  ext
  · simp only [realPoint, crossing, Rat.cast_div, Rat.cast_intCast]
    apply (eq_div_iff hd).mpr
    push_cast
    dsimp [determinant]
    push_cast
    nlinarith [congrArg (fun x : ℝ ↦ x * (k.b : ℝ)) h₁,
      congrArg (fun x : ℝ ↦ x * (l.b : ℝ)) h₂]
  · simp only [realPoint, crossing, Rat.cast_div, Rat.cast_intCast]
    apply (eq_div_iff hd).mpr
    push_cast
    dsimp [determinant]
    push_cast
    nlinarith [congrArg (fun x : ℝ ↦ x * (k.a : ℝ)) h₁,
      congrArg (fun x : ℝ ↦ x * (l.a : ℝ)) h₂]

def BoundedPoint (M : ℕ) (p : IPoint) : Prop :=
  |p.1| ≤ (M : ℤ) ∧ |p.2| ≤ (M : ℤ)

def BoundedSegment (M : ℕ) (l : IntegerSegment) : Prop :=
  BoundedPoint M l.start ∧ BoundedPoint M l.finish

theorem line_coefficients_bound (M : ℕ) (l : IntegerSegment) (h : BoundedSegment M l) :
    |l.a| ≤ 2 * (M : ℤ) ∧ |l.b| ≤ 2 * (M : ℤ) := by
  constructor
  · exact (abs_sub _ _).trans (by linarith [h.1.2, h.2.2])
  · exact (abs_sub _ _).trans (by linarith [h.1.1, h.2.1])

theorem determinant_bound (M : ℕ) (l k : IntegerSegment)
    (hl : BoundedSegment M l) (hk : BoundedSegment M k) :
    |determinant l k| ≤ 8 * (M : ℤ)^2 := by
  obtain ⟨ha, hb⟩ := line_coefficients_bound M l hl
  obtain ⟨hc, hd⟩ := line_coefficients_bound M k hk
  have hab := mul_le_mul ha hd (abs_nonneg _) (by positivity : (0 : ℤ) ≤ 2 * M)
  have hcd := mul_le_mul hc hb (abs_nonneg _) (by positivity : (0 : ℤ) ≤ 2 * M)
  calc
    |determinant l k| ≤ |l.a * k.b| + |k.a * l.b| := abs_sub _ _
    _ ≤ 8 * (M : ℤ)^2 := by rw [abs_mul, abs_mul]; nlinarith

theorem quotient_den_bound (a d : ℤ) (hd : d ≠ 0) :
    (((a : ℚ) / d).den : ℤ) ≤ |d| := by
  have h := Rat.den_dvd a d
  rw [Rat.divInt_eq_div] at h
  apply Int.le_of_dvd (abs_pos.mpr hd)
  simpa using (Int.dvd_natAbs.mpr h)

theorem crossing_den_bound (M : ℕ) (l k : IntegerSegment) (h : Nonparallel l k)
    (hl : BoundedSegment M l) (hk : BoundedSegment M k) :
    ((crossing l k).1.den : ℤ) ≤ 8 * (M : ℤ)^2 ∧
      ((crossing l k).2.den : ℤ) ≤ 8 * (M : ℤ)^2 := by
  constructor
  · exact (quotient_den_bound _ _ (determinant_ne_zero l k h)).trans
      (determinant_bound M l k hl hk)
  · exact (quotient_den_bound _ _ (determinant_ne_zero l k h)).trans
      (determinant_bound M l k hl hk)

theorem segment_height_bound (M : ℕ) (l : IntegerSegment) (h : BoundedSegment M l)
    (p : RPoint) (hp : p ∈ l.points) : |p.2| ≤ (M : ℝ) := by
  obtain ⟨t, ⟨ht₀, ht₁⟩, rfl⟩ := hp
  have ha : |(l.start.2 : ℝ)| ≤ M := by exact_mod_cast h.1.2
  have hb : |(l.finish.2 : ℝ)| ≤ M := by exact_mod_cast h.2.2
  obtain ⟨ha₀, ha₁⟩ := abs_le.mp ha
  obtain ⟨hb₀, hb₁⟩ := abs_le.mp hb
  apply abs_le.mpr
  dsimp [interpolate, intPoint]
  constructor <;> nlinarith [mul_nonneg (sub_nonneg.mpr ht₁) (sub_nonneg.mpr ha₁),
    mul_nonneg ht₀ (sub_nonneg.mpr hb₁),
    mul_nonneg (sub_nonneg.mpr ht₁) (sub_nonneg.mpr ha₀),
    mul_nonneg ht₀ (sub_nonneg.mpr hb₀)]

/-- Membership includes the segment-membership guard on every crossing. -/
def IsEvent {n : ℕ} (input : Fin n → IntegerSegment) (p : RPoint) : Prop :=
  (∃ i, p = intPoint (input i).start ∨ p = intPoint (input i).finish) ∨
    ∃ i j, Nonparallel (input i) (input j) ∧ p ∈ (input i).points ∧ p ∈ (input j).points

theorem event_finite {n : ℕ} (input : Fin n → IntegerSegment) :
    {p | IsEvent input p}.Finite := by
  apply Set.Finite.subset
    ((Set.finite_range (fun i ↦ intPoint (input i).start)).union
      ((Set.finite_range (fun i ↦ intPoint (input i).finish)).union
        (Set.finite_range (fun ij : Fin n × Fin n ↦
          realPoint (crossing (input ij.1) (input ij.2))))))
  rintro p (⟨i, h | h⟩ | ⟨i, j, h, hl, hk⟩)
  · exact Or.inl ⟨i, h.symm⟩
  · exact Or.inr (Or.inl ⟨i, h.symm⟩)
  · exact Or.inr (Or.inr ⟨(i, j), (actual_crossing _ _ h p hl hk).symm⟩)

theorem endpoint_mem (l : IntegerSegment) :
    intPoint l.start ∈ l.points ∧ intPoint l.finish ∈ l.points := by
  constructor
  · refine ⟨0, ⟨le_rfl, zero_le_one⟩, ?_⟩
    simp [interpolate]
  · refine ⟨1, ⟨zero_le_one, le_rfl⟩, ?_⟩
    simp [interpolate]

theorem event_on_segment {n : ℕ} (input : Fin n → IntegerSegment)
    (p : RPoint) (hp : IsEvent input p) : ∃ i, p ∈ (input i).points := by
  rcases hp with ⟨i, rfl | rfl⟩ | ⟨i, j, _, hl, _⟩
  · exact ⟨i, (endpoint_mem _).1⟩
  · exact ⟨i, (endpoint_mem _).2⟩
  · exact ⟨i, hl⟩

theorem event_height {n : ℕ} (input : Fin n → IntegerSegment) (M : ℕ)
    (hM : ∀ i, BoundedSegment M (input i)) (p : RPoint) (hp : IsEvent input p) :
    |p.2| ≤ (M : ℝ) := by
  obtain ⟨i, hi⟩ := event_on_segment input p hp
  exact segment_height_bound M _ (hM i) p hi

theorem event_height_difference {n : ℕ} (input : Fin n → IntegerSegment) (M : ℕ)
    (hM : ∀ i, BoundedSegment M (input i)) (p q : RPoint)
    (hp : IsEvent input p) (hq : IsEvent input q) : |p.2 - q.2| ≤ 2 * (M : ℝ) := by
  apply (abs_sub _ _).trans
  linarith [event_height input M hM p hp, event_height input M hM q hq]

theorem integer_endpoint_rational (p : IPoint) (M : ℕ) (hM : 1 ≤ M) :
    ∃ q : QPoint, realPoint q = intPoint p ∧
      (q.1.den : ℤ) ≤ 8 * (M : ℤ)^2 ∧ (q.2.den : ℤ) ≤ 8 * (M : ℤ)^2 := by
  refine ⟨((p.1 : ℚ), (p.2 : ℚ)), ?_, ?_, ?_⟩
  · ext <;> simp [realPoint, intPoint]
  all_goals
    simp only [Rat.den_intCast, Nat.cast_one]
    have hm : (1 : ℤ) ≤ M := by exact_mod_cast hM
    nlinarith

theorem event_rational_den_bound {n : ℕ} (input : Fin n → IntegerSegment) (M : ℕ)
    (hM : 1 ≤ M) (hb : ∀ i, BoundedSegment M (input i))
    (p : RPoint) (hp : IsEvent input p) :
    ∃ q : QPoint, realPoint q = p ∧
      (q.1.den : ℤ) ≤ 8 * (M : ℤ)^2 ∧ (q.2.den : ℤ) ≤ 8 * (M : ℤ)^2 := by
  rcases hp with ⟨i, rfl | rfl⟩ | ⟨i, j, hn, hl, hk⟩
  · exact integer_endpoint_rational _ M hM
  · exact integer_endpoint_rational _ M hM
  · exact ⟨crossing (input i) (input j), (actual_crossing _ _ hn p hl hk).symm,
      crossing_den_bound M _ _ hn (hb i) (hb j)⟩

def integerInput {n : ℕ} (input : Input n) (D : ℕ) (i : Fin n) : IntegerSegment where
  start := (integerCoordinate input D (i, false, false),
    integerCoordinate input D (i, false, true))
  finish := (integerCoordinate input D (i, true, false),
    integerCoordinate input D (i, true, true))

theorem integerInput_bounded {n : ℕ} (input : Input n) (D : ℕ) (i : Fin n) :
    BoundedSegment (coordinateBound input D) (integerInput input D i) := by
  have h (j : CoordinateIndex n) :
      |integerCoordinate input D j| ≤ (coordinateBound input D : ℤ) := by
    have hj := integerCoordinate_bound input D j
    have hj' : ((integerCoordinate input D j).natAbs : ℤ) ≤
        (coordinateBound input D : ℤ) := by exact_mod_cast hj
    simpa using hj'
  exact ⟨⟨h _, h _⟩, ⟨h _, h _⟩⟩

theorem integerInput_endpoints {n : ℕ} (input : Input n) (D : ℕ)
    (hD : LegalDenominator input D) (i : Fin n) :
    intPoint (integerInput input D i).start = scale D (realPoint (input i).start) ∧
      intPoint (integerInput input D i).finish = scale D (realPoint (input i).finish) := by
  have h (j : CoordinateIndex n) :
      (integerCoordinate input D j : ℝ) = D * (coordinate input j : ℝ) := by
    exact_mod_cast integerCoordinate_cast input D hD j
  constructor <;> ext
  · exact h (i, false, false)
  · exact h (i, false, true)
  · exact h (i, true, false)
  · exact h (i, true, true)

theorem integerInput_segment {n : ℕ} (input : Input n) (D : ℕ)
    (hD : LegalDenominator input D) (i : Fin n) :
    (integerInput input D i).points =
      scale D '' closedSegment (realPoint (input i).start) (realPoint (input i).finish) := by
  rw [scale_segment]
  simp only [IntegerSegment.points, (integerInput_endpoints input D hD i).1,
    (integerInput_endpoints input D hD i).2]

end BOProof
