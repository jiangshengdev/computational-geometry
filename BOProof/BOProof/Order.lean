import BOProof.Overlap

/-! The explicit safety constant and strict order, for the positive branch only. -/
namespace BOProof

theorem rational_separation (q r : ℚ) (M : ℕ) (hM : 1 ≤ M)
    (hq : (q.den : ℤ) ≤ 8 * (M : ℤ) ^ 2)
    (hr : (r.den : ℤ) ≤ 8 * (M : ℤ) ^ 2) (hne : q ≠ r) :
    1 / (64 * (M : ℝ)^4) ≤ |(q : ℝ) - r| := by
  have hn : (q - r).num ≠ 0 := Rat.num_ne_zero.mpr (sub_ne_zero.mpr hne)
  have hn₁ : (1 : ℝ) ≤ |((q - r).num : ℝ)| := by exact_mod_cast Int.one_le_abs hn
  have hd₀ : (0 : ℝ) < (q - r).den := by exact_mod_cast (q - r).den_pos
  have hd := Nat.le_of_dvd (Nat.mul_pos q.den_pos r.den_pos) (Rat.sub_den_dvd q r)
  have hd' : ((q - r).den : ℝ) ≤ (q.den : ℝ) * r.den := by exact_mod_cast hd
  have hq' : (q.den : ℝ) ≤ 8 * (M : ℝ)^2 := by exact_mod_cast hq
  have hr' : (r.den : ℝ) ≤ 8 * (M : ℝ)^2 := by exact_mod_cast hr
  have hprod := mul_le_mul hq' hr' (by positivity : (0 : ℝ) ≤ r.den)
    (by positivity : (0 : ℝ) ≤ 8 * (M : ℝ)^2)
  have hbound : ((q - r).den : ℝ) ≤ 64 * (M : ℝ)^4 := by nlinarith
  have hM' : (0 : ℝ) < M := by exact_mod_cast (lt_of_lt_of_le Nat.zero_lt_one hM)
  calc
    1 / (64 * (M : ℝ)^4) ≤ 1 / ((q - r).den : ℝ) :=
      one_div_le_one_div_of_le hd₀ hbound
    _ ≤ |((q - r).num : ℝ)| / ((q - r).den : ℝ) :=
      (div_le_div_iff_of_pos_right hd₀).mpr hn₁
    _ = |(q : ℝ) - r| := by
      rw [← Rat.cast_sub, Rat.cast_def, abs_div, abs_of_pos hd₀]

def safeCoefficient (M : ℕ) : ℚ := 1 / (256 * ((M : ℚ) + 1)^5)

theorem safeCoefficient_bounds (M : ℕ) (hM : 1 ≤ M) :
    0 < (safeCoefficient M : ℝ) ∧
      (safeCoefficient M : ℝ) < 1 / (128 * (M : ℝ)^5) ∧
      2 * (M : ℝ) * (safeCoefficient M : ℝ) < 1 / (64 * (M : ℝ)^4) := by
  have hm : (0 : ℝ) < M := by exact_mod_cast (lt_of_lt_of_le Nat.zero_lt_one hM)
  have hs : (safeCoefficient M : ℝ) = 1 / (256 * ((M : ℝ) + 1)^5) := by
    simp [safeCoefficient]
  have hp : (M : ℝ)^5 < ((M : ℝ) + 1)^5 := by
    exact pow_lt_pow_left₀ (by linarith) (le_of_lt hm) (by decide)
  have hb : (safeCoefficient M : ℝ) < 1 / (128 * (M : ℝ)^5) := by
    rw [hs]
    apply one_div_lt_one_div_of_lt (by positivity)
    nlinarith [pow_pos hm 5]
  refine ⟨by rw [hs]; positivity, hb, ?_⟩
  have ht := mul_lt_mul_of_pos_left hb (by positivity : (0 : ℝ) < 2 * M)
  have he : 2 * (M : ℝ) * (1 / (128 * (M : ℝ)^5)) = 1 / (64 * (M : ℝ)^4) := by
    field_simp
    ring
  rwa [he] at ht

def LexLt (p q : RPoint) : Prop := p.1 < q.1 ∨ p.1 = q.1 ∧ p.2 < q.2

theorem event_separation {n : ℕ} (input : Fin n → IntegerSegment) (M : ℕ)
    (hM : 1 ≤ M) (hb : ∀ i, BoundedSegment M (input i))
    (p q : RPoint) (hp : IsEvent input p) (hq : IsEvent input q) (hne : p.1 ≠ q.1) :
    1 / (64 * (M : ℝ)^4) ≤ |p.1 - q.1| := by
  obtain ⟨a, rfl, ha, _⟩ := event_rational_den_bound input M hM hb p hp
  obtain ⟨b, rfl, hb', _⟩ := event_rational_den_bound input M hM hb q hq
  apply rational_separation a.1 b.1 M hM ha hb'
  intro he
  exact hne (by simp [realPoint, he])

theorem event_x_order {n : ℕ} (input : Fin n → IntegerSegment) (M : ℕ)
    (hM : 1 ≤ M) (hb : ∀ i, BoundedSegment M (input i))
    (p q : RPoint) (hp : IsEvent input p) (hq : IsEvent input q) (hlt : p.1 < q.1) :
    (shear (safeCoefficient M) p).1 < (shear (safeCoefficient M) q).1 := by
  have hgap := event_separation input M hM hb q p hq hp (ne_of_gt hlt)
  rw [abs_of_pos (sub_pos.mpr hlt)] at hgap
  have hh := (abs_le.mp (event_height_difference input M hb q p hq hp)).1
  obtain ⟨hs, _, hsafe⟩ := safeCoefficient_bounds M hM
  have hmul := mul_le_mul_of_nonneg_left hh (le_of_lt hs)
  dsimp [shear]
  nlinarith

theorem event_lex_order {n : ℕ} (input : Fin n → IntegerSegment) (M : ℕ)
    (hM : 1 ≤ M) (hb : ∀ i, BoundedSegment M (input i))
    (p q : RPoint) (hp : IsEvent input p) (hq : IsEvent input q) :
    LexLt p q ↔ (shear (safeCoefficient M) p).1 < (shear (safeCoefficient M) q).1 := by
  have hs := (safeCoefficient_bounds M hM).1
  constructor
  · rintro (h | ⟨hx, hy⟩)
    · exact event_x_order input M hM hb p q hp hq h
    · dsimp [shear]; nlinarith
  · intro h
    rcases lt_trichotomy p.1 q.1 with hx | hx | hx
    · exact Or.inl hx
    · right
      refine ⟨hx, ?_⟩
      dsimp [shear] at h
      nlinarith
    · exact False.elim (not_lt_of_gt (event_x_order input M hM hb q p hq hp hx) h)

theorem event_x_injective {n : ℕ} (input : Fin n → IntegerSegment) (M : ℕ)
    (hM : 1 ≤ M) (hb : ∀ i, BoundedSegment M (input i))
    (p q : RPoint) (hp : IsEvent input p) (hq : IsEvent input q) :
    (shear (safeCoefficient M) p).1 = (shear (safeCoefficient M) q).1 ↔ p = q := by
  constructor
  · intro he
    have hn := (event_lex_order input M hM hb p q hp hq).not.mpr (not_lt.mpr he.ge)
    have hn' := (event_lex_order input M hM hb q p hq hp).not.mpr (not_lt.mpr he.le)
    apply Prod.ext <;> dsimp [LexLt] at hn hn' <;> grind
  · rintro rfl; rfl

end BOProof
