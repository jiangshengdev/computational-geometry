import BOProof.Basic

/-! Common denominators and bounded integral endpoints, including empty input. -/
namespace BOProof

/-- Input identity, endpoint (`false` = start, `true` = finish), then coordinate
(`false` = x, `true` = y). Both endpoint and axis indices range over exactly two values. -/
abbrev CoordinateIndex (n : ℕ) := Fin n × Bool × Bool

def coordinate {n : ℕ} (input : Input n) (i : CoordinateIndex n) : ℚ :=
  let p := if i.2.1 then (input i.1).finish else (input i.1).start
  if i.2.2 then p.2 else p.1

def commonDenominator {n : ℕ} (input : Input n) : ℕ :=
  ∏ i : CoordinateIndex n, (coordinate input i).den

def LegalDenominator {n : ℕ} (input : Input n) (D : ℕ) : Prop :=
  0 < D ∧ ∀ i, (coordinate input i).den ∣ D

theorem commonDenominator_legal {n : ℕ} (input : Input n) :
    LegalDenominator input (commonDenominator input) := by
  constructor
  · exact Finset.prod_pos fun i _ ↦ Rat.den_pos (coordinate input i)
  · intro i
    exact Finset.dvd_prod_of_mem _ (Finset.mem_univ i)

@[simp] theorem commonDenominator_empty (input : Input 0) : commonDenominator input = 1 := by
  simp [commonDenominator]

theorem integral_of_den_dvd (q : ℚ) (D : ℕ) (h : q.den ∣ D) :
    ∃ z : ℤ, (z : ℚ) = D * q := by
  obtain ⟨k, rfl⟩ := h
  refine ⟨(k : ℤ) * q.num, ?_⟩
  have hd : (q.den : ℚ) ≠ 0 := by exact_mod_cast q.den_nz
  have hq := (div_eq_iff hd).mp q.num_div_den
  push_cast
  nlinarith [hq]

def integerCoordinate {n : ℕ} (input : Input n) (D : ℕ) (i : CoordinateIndex n) : ℤ :=
  (D * coordinate input i).num

theorem integerCoordinate_cast {n : ℕ} (input : Input n) (D : ℕ)
    (hD : LegalDenominator input D) (i : CoordinateIndex n) :
    (integerCoordinate input D i : ℚ) = D * coordinate input i := by
  obtain ⟨z, hz⟩ := integral_of_den_dvd (coordinate input i) D (hD.2 i)
  simp [integerCoordinate, ← hz]

/-- A natural number is used as the nonnegative integer coordinate bound. -/
def coordinateBound {n : ℕ} (input : Input n) (D : ℕ) : ℕ :=
  max 1 (Finset.univ.sup fun i ↦ (integerCoordinate input D i).natAbs)

theorem coordinateBound_pos {n : ℕ} (input : Input n) (D : ℕ) :
    1 ≤ coordinateBound input D := le_max_left _ _

theorem integerCoordinate_bound {n : ℕ} (input : Input n) (D : ℕ)
    (i : CoordinateIndex n) :
    (integerCoordinate input D i).natAbs ≤ coordinateBound input D :=
  (Finset.le_sup (f := fun i ↦ (integerCoordinate input D i).natAbs)
    (Finset.mem_univ i)).trans (le_max_right _ _)

@[simp] theorem coordinateBound_empty (input : Input 0) (D : ℕ) :
    coordinateBound input D = 1 := by
  simp [coordinateBound]

def scale (D : ℕ) (p : RPoint) : RPoint := (D * p.1, D * p.2)

theorem scale_shear (D : ℕ) (s : ℚ) (p : RPoint) :
    scale D (shear s p) = shear s (scale D p) := by
  ext <;> simp [scale, shear]; ring

theorem scale_interpolate (D : ℕ) (a b : RPoint) (t : ℝ) :
    scale D (interpolate a b t) = interpolate (scale D a) (scale D b) t := by
  ext <;> simp [scale, interpolate] <;> ring

theorem scale_injective (D : ℕ) (hD : 0 < D) : Function.Injective (scale D) := by
  have h : (D : ℝ) ≠ 0 := by exact_mod_cast (Nat.ne_of_gt hD)
  intro p q hpq
  have hx := congrArg Prod.fst hpq
  have hy := congrArg Prod.snd hpq
  apply Prod.ext <;> apply mul_left_cancel₀ h <;> assumption

theorem scale_segment (D : ℕ) (a b : RPoint) :
    scale D '' closedSegment a b = closedSegment (scale D a) (scale D b) := by
  ext p
  constructor
  · rintro ⟨q, ⟨t, ht, rfl⟩, rfl⟩
    exact ⟨t, ht, scale_interpolate D a b t⟩
  · rintro ⟨t, ht, rfl⟩
    exact ⟨interpolate a b t, ⟨t, ht, rfl⟩, scale_interpolate D a b t⟩

end BOProof
