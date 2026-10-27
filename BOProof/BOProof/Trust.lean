/-
Copyright (c) 2026 Jiang Sheng. All rights reserved.
No project license is specified.
Authors: Jiang Sheng
-/
module

public import BOProof.Selection

/-! Kernel-reported trust dependencies of the public acceptance theorems. -/
#print axioms BOProof.shear_inverse
#print axioms BOProof.shear_injective
#print axioms BOProof.shear_zero
#print axioms BOProof.shear_interpolate
#print axioms BOProof.shear_segment
#print axioms BOProof.shear_intersection
#print axioms BOProof.restore_intersection
#print axioms BOProof.shear_segment_intersection
#print axioms BOProof.closedSegment_self

/- Audit every project declaration, including transitive dependencies and declarations
that are not reached by the final theorem. New project axioms are rejected too. -/
run_cmd do
  let env ← Lean.getEnv
  let allowed : Array Lean.Name := #[``propext, ``Classical.choice, ``Quot.sound]
  let mut checked : Nat := 0
  for (name, _) in env.constants.toList do
    if (`BOProof).isPrefixOf name then
      let axioms ← Lean.collectAxioms name
      for axiomName in axioms do
        unless allowed.contains axiomName do
          throwError "{name}: unexpected trust dependency {axiomName}"
      checked := checked + 1
  if checked == 0 then
    throwError "No BOProof declarations found"
  Lean.logInfo m!"Audited {checked} BOProof declarations; allowed axioms: {allowed}"

#print axioms BOProof.commonDenominator_legal
#print axioms BOProof.commonDenominator_empty
#print axioms BOProof.integerCoordinate_cast
#print axioms BOProof.coordinateBound_pos
#print axioms BOProof.integerCoordinate_bound
#print axioms BOProof.coordinateBound_empty
#print axioms BOProof.actual_crossing
#print axioms BOProof.crossing_den_bound
#print axioms BOProof.event_rational_den_bound
#print axioms BOProof.event_finite
#print axioms BOProof.event_height_difference
#print axioms BOProof.collinear_overlap
#print axioms BOProof.overlap_endpoints_are_events
#print axioms BOProof.rational_separation
#print axioms BOProof.safeCoefficient_bounds
#print axioms BOProof.event_lex_order
#print axioms BOProof.event_x_injective
#print axioms BOProof.scale_shear
#print axioms BOProof.original_event_iff
#print axioms BOProof.original_event_finite
#print axioms BOProof.chosen_postconditions
