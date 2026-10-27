import BOProof.Events

/-! Collinear intersection endpoints are input endpoints, including singleton intersections. -/
namespace BOProof

theorem closedSegment_eq_segment (a b : RPoint) : closedSegment a b = segment ℝ a b := by
  rw [segment_eq_image_lineMap]
  ext p
  simp only [closedSegment, Set.mem_ofPred_eq, Set.mem_image]
  constructor
  · rintro ⟨t, ht, rfl⟩
    refine ⟨t, ht, ?_⟩
    ext <;> simp [AffineMap.lineMap_apply_module, interpolate]
  · rintro ⟨t, ht, rfl⟩
    refine ⟨t, ht, ?_⟩
    ext <;> simp [AffineMap.lineMap_apply_module, interpolate]

theorem affine_overlap (f : ℝ →ᵃ[ℝ] RPoint) (hf : Function.Injective f)
    (a b c d : ℝ) :
    closedSegment (f a) (f b) ∩ closedSegment (f c) (f d) = ∅ ∨
    ∃ u ∈ ({f a, f b, f c, f d} : Set RPoint),
      ∃ v ∈ ({f a, f b, f c, f d} : Set RPoint),
        closedSegment (f a) (f b) ∩ closedSegment (f c) (f d) = closedSegment u v := by
  let lo := max (min a b) (min c d)
  let hi := min (max a b) (max c d)
  have he : closedSegment (f a) (f b) ∩ closedSegment (f c) (f d) =
      f '' Set.Icc lo hi := by
    simp only [closedSegment_eq_segment, ← image_segment, ← Set.image_inter hf,
      segment_eq_Icc', Set.Icc_inter_Icc]
    rfl
  by_cases h : lo ≤ hi
  · right
    refine ⟨f lo, ?_, f hi, ?_, ?_⟩
    · dsimp [lo]
      simp only [min_def, max_def]
      split_ifs <;> simp
    · dsimp [hi]
      simp only [min_def, max_def]
      split_ifs <;> simp
    · rw [he, ← segment_eq_Icc h, image_segment, closedSegment_eq_segment]
  · left
    rw [he, Set.Icc_eq_empty_of_lt (lt_of_not_ge h), Set.image_empty]

theorem collinear_overlap (a b c d : RPoint)
    (h : Collinear ℝ ({a, b, c, d} : Set RPoint)) :
    closedSegment a b ∩ closedSegment c d = ∅ ∨
    ∃ u ∈ ({a, b, c, d} : Set RPoint), ∃ v ∈ ({a, b, c, d} : Set RPoint),
      closedSegment a b ∩ closedSegment c d = closedSegment u v := by
  obtain ⟨o, v, hv⟩ := (collinear_iff_exists_forall_eq_smul_vadd _).mp h
  obtain ⟨ra, ha⟩ := hv a (by simp)
  obtain ⟨rb, hb⟩ := hv b (by simp)
  obtain ⟨rc, hc⟩ := hv c (by simp)
  obtain ⟨rd, hd⟩ := hv d (by simp)
  by_cases hz : v = 0
  · simp only [hz, smul_zero, zero_vadd] at ha hb hc hd
    subst a; subst b; subst c; subst d
    right
    exact ⟨o, by simp, o, by simp, by simp⟩
  · let f := AffineMap.lineMap o (v +ᵥ o) (k := ℝ)
    have hf : Function.Injective f := AffineMap.lineMap_injective ℝ (by
      intro he
      apply hz
      have he' : (0 : RPoint) + o = v + o := by simpa using he
      exact (add_right_cancel he').symm)
    have hfa : f ra = a := by simpa [f, AffineMap.lineMap_apply] using ha.symm
    have hfb : f rb = b := by simpa [f, AffineMap.lineMap_apply] using hb.symm
    have hfc : f rc = c := by simpa [f, AffineMap.lineMap_apply] using hc.symm
    have hfd : f rd = d := by simpa [f, AffineMap.lineMap_apply] using hd.symm
    simpa only [hfa, hfb, hfc, hfd] using affine_overlap f hf ra rb rc rd

theorem overlap_endpoints_are_events {n : ℕ} (input : Fin n → IntegerSegment)
    (i j : Fin n)
    (h : Collinear ℝ ({intPoint (input i).start, intPoint (input i).finish,
      intPoint (input j).start, intPoint (input j).finish} : Set RPoint)) :
    (input i).points ∩ (input j).points = ∅ ∨
    ∃ u v, IsEvent input u ∧ IsEvent input v ∧
      (input i).points ∩ (input j).points = closedSegment u v := by
  rcases collinear_overlap _ _ _ _ h with he | ⟨u, hu, v, hv, he⟩
  · exact Or.inl he
  · right
    have endpoint_event (p : RPoint)
        (hp : p ∈ ({intPoint (input i).start, intPoint (input i).finish,
          intPoint (input j).start, intPoint (input j).finish} : Set RPoint)) :
        IsEvent input p := by
      simp only [Set.mem_insert_iff, Set.mem_singleton_iff] at hp
      rcases hp with hp | hp | hp | hp
      · exact Or.inl ⟨i, Or.inl hp⟩
      · exact Or.inl ⟨i, Or.inr hp⟩
      · exact Or.inl ⟨j, Or.inl hp⟩
      · exact Or.inl ⟨j, Or.inr hp⟩
    exact ⟨u, v, endpoint_event u hu, endpoint_event v hv, he⟩

end BOProof
