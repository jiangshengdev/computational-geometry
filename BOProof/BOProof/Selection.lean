import BOProof.Order

/-! Original-coordinate conclusions of the two coefficient-selection branches. -/
namespace BOProof

def HasVertical {n : ℕ} (input : Input n) : Prop :=
  ∃ i, (input i).start ≠ (input i).finish ∧ (input i).start.1 = (input i).finish.1

/-- Mathematical model of the choice, not a refinement proof of the Rust implementation. -/
noncomputable def chosenCoefficient {n : ℕ} (input : Input n) : ℚ := by
  classical
  exact if HasVertical input then safeCoefficient (coordinateBound input (commonDenominator input))
    else 0

/-- Pull back precisely the bounded, integerized events by the positive common scaling. -/
def OriginalEvent {n : ℕ} (input : Input n) (p : RPoint) : Prop :=
  IsEvent (integerInput input (commonDenominator input)) (scale (commonDenominator input) p)

theorem realPoint_injective : Function.Injective realPoint := by
  intro p q h
  apply Prod.ext
  · have hx := congrArg Prod.fst h
    dsimp [realPoint] at hx
    exact_mod_cast hx
  · have hy := congrArg Prod.snd h
    dsimp [realPoint] at hy
    exact_mod_cast hy

theorem original_event_finite {n : ℕ} (input : Input n) :
    {p | OriginalEvent input p}.Finite := by
  exact (event_finite _).preimage (scale_injective _ (commonDenominator_legal input).1).injOn

theorem original_endpoints {n : ℕ} (input : Input n) (i : Fin n) :
    OriginalEvent input (realPoint (input i).start) ∧
      OriginalEvent input (realPoint (input i).finish) := by
  obtain ⟨hs, hf⟩ := integerInput_endpoints input _ (commonDenominator_legal input) i
  constructor
  · exact Or.inl ⟨i, Or.inl hs.symm⟩
  · exact Or.inl ⟨i, Or.inr hf.symm⟩

theorem scale_lex (D : ℕ) (hD : 0 < D) (p q : RPoint) :
    LexLt (scale D p) (scale D q) ↔ LexLt p q := by
  have hd : (0 : ℝ) < D := by exact_mod_cast hD
  simp [LexLt, scale, mul_lt_mul_iff_right₀ hd, mul_right_inj' (ne_of_gt hd)]

theorem original_positive_order {n : ℕ} (input : Input n)
    (p q : RPoint) (hp : OriginalEvent input p) (hq : OriginalEvent input q) :
    LexLt p q ↔
      (shear (safeCoefficient (coordinateBound input (commonDenominator input))) p).1 <
        (shear (safeCoefficient (coordinateBound input (commonDenominator input))) q).1 := by
  have hd : (0 : ℝ) < commonDenominator input := by
    exact_mod_cast (commonDenominator_legal input).1
  have he := event_lex_order (integerInput input (commonDenominator input)) _
    (coordinateBound_pos input _) (integerInput_bounded input _)
    (scale (commonDenominator input) p) (scale (commonDenominator input) q) hp hq
  rw [scale_lex _ (commonDenominator_legal input).1, ← scale_shear, ← scale_shear] at he
  simpa only [scale, mul_lt_mul_iff_right₀ hd] using he

theorem original_positive_injective {n : ℕ} (input : Input n)
    (p q : RPoint) (hp : OriginalEvent input p) (hq : OriginalEvent input q) :
    (shear (safeCoefficient (coordinateBound input (commonDenominator input))) p).1 =
      (shear (safeCoefficient (coordinateBound input (commonDenominator input))) q).1 ↔ p = q := by
  have hd : (commonDenominator input : ℝ) ≠ 0 := by
    exact_mod_cast (Nat.ne_of_gt (commonDenominator_legal input).1)
  have he := event_x_injective (integerInput input (commonDenominator input)) _
    (coordinateBound_pos input _) (integerInput_bounded input _)
    (scale (commonDenominator input) p) (scale (commonDenominator input) q) hp hq
  rw [← scale_shear, ← scale_shear] at he
  rw [(scale_injective _ (commonDenominator_legal input).1).eq_iff] at he
  simpa only [scale, mul_right_inj' hd] using he

theorem chosen_positive {n : ℕ} (input : Input n) (h : HasVertical input) :
    chosenCoefficient input =
      safeCoefficient (coordinateBound input (commonDenominator input)) := by
  simp [chosenCoefficient, h]

theorem chosen_zero {n : ℕ} (input : Input n) (h : ¬HasVertical input) :
    chosenCoefficient input = 0 := by simp [chosenCoefficient, h]

theorem chosen_nonvertical {n : ℕ} (input : Input n) (i : Fin n)
    (hne : (input i).start ≠ (input i).finish) :
    (shear (chosenCoefficient input) (realPoint (input i).start)).1 ≠
      (shear (chosenCoefficient input) (realPoint (input i).finish)).1 := by
  by_cases hv : HasVertical input
  · rw [chosen_positive input hv]
    intro he
    apply hne
    apply realPoint_injective
    exact (original_positive_injective input _ _ (original_endpoints input i).1
      (original_endpoints input i).2).mp he
  · rw [chosen_zero input hv, shear_zero, shear_zero]
    intro he
    apply hv
    refine ⟨i, hne, ?_⟩
    dsimp [realPoint] at he
    exact_mod_cast he

def inputPoints {n : ℕ} (input : Input n) (i : Fin n) : Set RPoint :=
  closedSegment (realPoint (input i).start) (realPoint (input i).finish)

def directionDet (a b c d : RPoint) : ℝ :=
  (b.1 - a.1) * (d.2 - c.2) - (d.1 - c.1) * (b.2 - a.2)

theorem scaled_directionDet (D : ℕ) (a b c d : RPoint) :
    directionDet (scale D a) (scale D b) (scale D c) (scale D d) =
      (D : ℝ)^2 * directionDet a b c d := by
  simp only [directionDet, scale]
  ring

theorem integer_nonparallel_iff (l k : IntegerSegment) :
    Nonparallel l k ↔
      directionDet (intPoint l.start) (intPoint l.finish)
        (intPoint k.start) (intPoint k.finish) ≠ 0 := by
  have he : directionDet (intPoint l.start) (intPoint l.finish)
      (intPoint k.start) (intPoint k.finish) = (determinant l k : ℝ) := by
    simp [directionDet, intPoint, determinant, IntegerSegment.a, IntegerSegment.b]
    ring
  rw [he]
  constructor
  · intro h; exact_mod_cast determinant_ne_zero l k h
  · intro h hn
    apply h
    have he' : determinant l k = 0 := by
      dsimp [determinant, IntegerSegment.a, IntegerSegment.b]
      nlinarith
    simp [he']

/-- Exact event coverage in original coordinates; support-line intersections outside the
closed segments do not satisfy the right-hand side. -/
theorem original_event_iff {n : ℕ} (input : Input n) (p : RPoint) :
    OriginalEvent input p ↔
      (∃ i, p = realPoint (input i).start ∨ p = realPoint (input i).finish) ∨
      ∃ i j, directionDet (realPoint (input i).start) (realPoint (input i).finish)
        (realPoint (input j).start) (realPoint (input j).finish) ≠ 0 ∧
        p ∈ inputPoints input i ∧ p ∈ inputPoints input j := by
  let D := commonDenominator input
  have hD := commonDenominator_legal input
  have hi := scale_injective D hD.1
  have hd : (D : ℝ) ≠ 0 := by exact_mod_cast (Nat.ne_of_gt hD.1)
  have hm (i : Fin n) : scale D p ∈ (integerInput input D i).points ↔
      p ∈ inputPoints input i := by
    rw [integerInput_segment input D hD]
    simp only [Set.mem_image, hi.eq_iff, exists_eq_right, inputPoints]
  have hn (i j : Fin n) : Nonparallel (integerInput input D i) (integerInput input D j) ↔
      directionDet (realPoint (input i).start) (realPoint (input i).finish)
        (realPoint (input j).start) (realPoint (input j).finish) ≠ 0 := by
    rw [integer_nonparallel_iff, (integerInput_endpoints input D hD i).1,
      (integerInput_endpoints input D hD i).2, (integerInput_endpoints input D hD j).1,
      (integerInput_endpoints input D hD j).2, scaled_directionDet]
    simp [hd]
  change ((∃ i, scale D p = intPoint (integerInput input D i).start ∨
    scale D p = intPoint (integerInput input D i).finish) ∨
    ∃ i j, Nonparallel (integerInput input D i) (integerInput input D j) ∧
      scale D p ∈ (integerInput input D i).points ∧
      scale D p ∈ (integerInput input D j).points) ↔ _
  simp_rw [hn, hm, (integerInput_endpoints input D hD _).1,
    (integerInput_endpoints input D hD _).2, hi.eq_iff]

/-- No denominator, gap, safety, coverage or nondegeneracy assumptions are supplied by callers. -/
theorem chosen_postconditions {n : ℕ} (input : Input n) :
    (HasVertical input →
      0 < chosenCoefficient input ∧
      ∀ p q, OriginalEvent input p → OriginalEvent input q →
        (LexLt p q ↔ (shear (chosenCoefficient input) p).1 <
          (shear (chosenCoefficient input) q).1) ∧
        ((shear (chosenCoefficient input) p).1 = (shear (chosenCoefficient input) q).1 ↔ p = q)) ∧
    (¬HasVertical input → chosenCoefficient input = 0 ∧
      ∀ p, shear (chosenCoefficient input) p = p) ∧
    (∀ i, (input i).start ≠ (input i).finish →
      (shear (chosenCoefficient input) (realPoint (input i).start)).1 ≠
        (shear (chosenCoefficient input) (realPoint (input i).finish)).1) ∧
    (∀ i j, shear (chosenCoefficient input) '' (inputPoints input i ∩ inputPoints input j) =
      (shear (chosenCoefficient input) '' inputPoints input i) ∩
        (shear (chosenCoefficient input) '' inputPoints input j)) ∧
    (∀ i j, shear (-chosenCoefficient input) ''
      ((shear (chosenCoefficient input) '' inputPoints input i) ∩
        (shear (chosenCoefficient input) '' inputPoints input j)) =
      inputPoints input i ∩ inputPoints input j) := by
  refine ⟨?_, ?_, chosen_nonvertical input, ?_, ?_⟩
  · intro hv
    rw [chosen_positive input hv]
    constructor
    · exact_mod_cast (safeCoefficient_bounds _ (coordinateBound_pos input _)).1
    · intro p q hp hq
      exact ⟨original_positive_order input p q hp hq,
        original_positive_injective input p q hp hq⟩
  · intro hv
    exact ⟨chosen_zero input hv, fun p ↦ by rw [chosen_zero input hv, shear_zero]⟩
  · intro i j; exact shear_intersection _ _ _
  · intro i j; exact restore_intersection _ _ _

end BOProof
