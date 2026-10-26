import { Link } from '@heroui/react/link'
import { Trans, useLingui } from '@lingui/react/macro'

export function LearningIntroduction() {
  const { t } = useLingui()
  return <section aria-label={t({ id: 'help.LearningIntroduction.label', message: 'Learning goals' })} className="flex flex-col gap-3">
    <h2 className="text-xl font-semibold"><Trans id="help.LearningIntroduction.0">Understanding the Bentley–Ottmann sweep from scratch</Trans></h2>
    <p><Trans id="help.LearningIntroduction.1">Goal: explain when segments enter, when intersections are discovered, why the order changes, and when segments leave. Segment intersection finds the points or intervals shared by input segments.</Trans></p>
    <p><Trans id="help.LearningIntroduction.2">The most direct approach checks every pair: <span className="coordinates">n</span> segments require <span className="coordinates">n(n−1)/2</span> pair checks. A sweep line is a vertical line moving from left to right. It stops only at endpoints or discovered intersections; these stopping positions are called events.</Trans></p>
    <p><Trans id="help.LearningIntroduction.3">The event queue stores pending events in increasing <span className="coordinates">x</span>, then <span className="coordinates">y</span> order. Active segments have entered but have not yet left, and are ordered from bottom to top. Neighbors are consecutive segments in this order.</Trans></p>
    <p><Trans id="help.LearningIntroduction.4">At an ordinary crossing, two segments exchange their vertical order and must be neighbors just before they cross. Checking new neighbors after insertion, removal, or reordering discovers future intersections without rechecking every pair at every step.</Trans></p>
    <p className="text-muted"><Trans id="help.LearningIntroduction.5">Conventions: exact rational numbers determine intersections and ordering; pixel approximations are used only for drawing. Distinct events with the same <span className="coordinates">x</span> are processed in <span className="coordinates">y</span> order. Completing an event updates the order only at that position; other positions with the same <span className="coordinates">x</span> retain their own processing progress. At a crossing, segments are ordered as they appear immediately to the right of the event.</Trans></p>
    <p className="text-muted"><Trans id="help.LearningIntroduction.6">The exact core handles crossings, endpoints, coincident points, vertical segments and collinear overlaps. It first groups support lines and records same-line intersections, then sweeps maximal coverage intervals. The teaching display restores original coordinates and original input identities.</Trans></p>
    </section>
}

export function LearningReferences() {
  const { t } = useLingui()
  return <section aria-label={t({ id: 'help.LearningReferences.label', message: 'Learning references' })} className="flex flex-col gap-2 text-sm">
    <h2 className="font-semibold"><Trans id="help.LearningReferences.0">Further reading</Trans></h2>
    <Link href="https://www.cs.umd.edu/class/fall2023/cmsc754/Lects/lect04-intersection.pdf"><Trans id="help.LearningReferences.1">Dave Mount · CMSC 754 Lecture 4: events, active order, and neighbor checks</Trans></Link>
    <p className="text-muted"><Trans id="help.LearningReferences.2">Source: the lecture's Plane Sweep, Adjacent-segment rule, and event-handling sections (the adjacency argument in Figure 4 and insertion, deletion, and crossing in Figure 5). The lecture initially assumes general position; here we also specify the processing order for endpoints with the same <span className="coordinates">x</span>. Its balanced-tree complexity results are not performance guarantees for this demonstration.</Trans></p>
    <Link href="https://i11www.iti.kit.edu/_media/teaching/winter2015/compgeom/algogeom-ws15-vl02.pdf"><Trans id="help.LearningReferences.3">KIT · Line Segment Intersection: closed segments and grouping events at the same point</Trans></Link>
    <p className="text-muted"><Trans id="help.LearningReferences.4">Source: lecture item 4 defines closed segments, item 6 orders events by both coordinates, and handleEvent in item 8 groups starting, ending, and interior-crossing segments. It reports the intersection and all participants before removing and reinserting segments to update the order (PDF pages 39–42). The lecture sweeps downward; this page sweeps left to right, then upward at the same x. Both use the same exact lexicographic rule, without numerical perturbation.</Trans></p>
    <p className="text-muted"><Trans id="help.LearningReferences.5">Vertical cases follow the same closed-segment, lexicographic, and same-point grouping rules. The vertical status marker represents this page's processing frontier, not a unique intersection between the sweep line and the segment. Internally, a reversible exact shear (x + s·y, y) is used. Rational bounds on s are derived from the input coordinates to preserve the original lexicographic order of all endpoints and segment intersections; the display restores the original coordinates. This order-preserving derivation belongs to this implementation: the lecture is not cited as proof of the shear bound, and floating-point epsilon is not used to decide geometric relations.</Trans></p>
    <Link href="https://github.com/CGAL/cgal/blob/v6.1.1/Kernel_23/doc/Kernel_23/CGAL/intersections.h"><Trans id="help.LearningReferences.6">CGAL 6.1.1 · 2D Intersections: an intersection can be a point or a segment</Trans></Link>
    <Link href="https://github.com/CGAL/cgal/blob/v6.1.1/Surface_sweep_2/doc/Surface_sweep_2/Surface_sweep_2.txt"><Trans id="help.LearningReferences.7">CGAL 6.1.1 · 2D Intersection of Curves: overlaps and degeneracies</Trans></Link>
    <p className="text-muted"><Trans id="help.LearningReferences.8">Source: CGAL lists a nonempty segment intersection as a point or segment and explicitly treats overlapping curves. Here, same-line pairs are reported during preprocessing using their common closed interval. This implementation uses its own line-group sweep; it does not reproduce CGAL or borrow its guarantees.</Trans></p>
  </section>
}

export function SamePointRules() {
  const { t } = useLingui()
  return <section aria-label={t({ id: 'help.SamePointRules.label', message: 'Same-point and tie rules' })} className="flex flex-col gap-2 text-sm">
      <h2 className="font-semibold"><Trans id="help.SamePointRules.0">The same x coordinate does not imply the same point</Trans></h2>
      <p><Trans id="help.SamePointRules.1">The sweep direction determines which segments start, end, or pass through the interior. These three groups belong to one exact geometric point and do not change during intermediate actions. Closed segments include endpoints: record the intersections of all participants first, then remove ending segments, insert starting segments, and order those that remain active.</Trans></p>
      <p><Trans id="help.SamePointRules.2">A zero-length input has coincident start and end points, so it belongs to both groups. It never enters the continuing active order and has no corresponding insertion or removal action. Its intersections with segments or other points at the same location are recorded pair by pair; coincident coordinates do not merge input identities. The active order of a point-only set is always empty, but real events and pair results still exist.</Trans></p>
      <p><Trans id="help.SamePointRules.3">Compare x first, then y. Only exact equality of both coordinates groups inputs into one event point. Sharing a sweep coordinate does not mean that all segments meet at one point. Each point in the queue is processed separately, with all participants at that point grouped together.</Trans></p>
      <p><Trans id="help.SamePointRules.4">During event processing, the display shows an update in progress, not a completed state. Once the event is complete, continuing nonvertical segments at the current point are ordered as they appear immediately to its right; vertical segments continue toward higher pending positions. Lower positions at the same x have been processed, while higher positions retain their pre-event order. The list therefore does not represent a uniform rightward shift of the entire sweep line.</Trans></p>
    </section>
}

export function VerticalRules() {
  const { t } = useLingui()
  return <section aria-label={t({ id: 'help.VerticalRules.label', message: 'Vertical segment rules' })} className="flex flex-col gap-2 text-sm">
      <h2 className="font-semibold"><Trans id="help.VerticalRules.0">Vertical segments: one x coordinate, one height at a time</Trans></h2>
      <p><Trans id="help.VerticalRules.1">A vertical segment overlaps the sweep line along an interval, so a single ordinary line intersection cannot represent it. The x-then-y convention still applies: insert it at its lower endpoint, process crossings and contacts at successive heights, then record closed-segment contacts at its upper endpoint before removing it.</Trans></p>
      <p><Trans id="help.VerticalRules.2">A vertical segment in the active list represents an unfinished upward processing frontier. Its rank in the drawing is placed at the current processing height, not at a unique intersection with the sweep line. When it meets a crossing segment, processing first retains the previous order and records the intersection. Once complete, the vertical segment is placed above that crossing segment and checks new neighbors higher up. The whole vertical segment is complete only after removal at its upper endpoint.</Trans></p>
      <p><Trans id="help.VerticalRules.3">The current event, queue, and results in the drawing all use original coordinates. The sweep line may stay at the same x while the current event moves upward in y. Completing a lower intersection does not clear higher pending events.</Trans></p>
    </section>
}

export function OverlapRules() {
  const { t } = useLingui()
  return <section aria-label={t({ id: 'help.OverlapRules.label', message: 'Overlap rules' })} className="flex flex-col gap-2 text-sm">
      <h2 className="font-semibold"><Trans id="help.OverlapRules.0">Collinear overlap: the intersection is a segment</Trans></h2>
      <p><Trans id="help.OverlapRules.1">If the common range of collinear segments has nonzero length, infinitely many points between its endpoints are shared. The isolated-point event assumption of ordinary BO does not apply here; swapping vertical order cannot handle overlap. If only one closed endpoint is shared, the intersection is still a point.</Trans></p>
      <p><Trans id="help.OverlapRules.2">During preprocessing, take the later start and earlier end of each intersecting same-line pair and record its complete closed intersection. There is no sweep position yet. The known endpoints determine the full interval exactly; horizontal, slanted and vertical segments use the same rule, preserving rational coordinates.</Trans></p>
      <p><Trans id="help.OverlapRules.3">The sweep queues only maximal coverage endpoints, point inputs and live neighbor certificates. Original member endpoints inside a coverage interval need not be events. At a real event, a closed interval query recovers the original members. The recorded pair intervals are never split or shortened by later events.</Trans></p>
      <p><Trans id="help.OverlapRules.4">Contained, identical and reversed inputs retain distinct input IDs. Each intersecting pair produces one complete intersection. Overlapping members are geometrically tied; list positions identify them rather than indicate a vertical swap. Coverage is merged for the sweep, while output intersections remain separate for each original pair.</Trans></p>
    </section>
}

export function NeighborRules() {
  const { t } = useLingui()
  return <section aria-label={t({ id: 'help.NeighborRules.label', message: 'Why intersections are not missed' })} className="flex flex-col gap-3">
      <h2 className="font-semibold"><Trans id="help.NeighborRules.0">Why do neighbor checks find every intersection?</Trans></h2>
        <p><Trans id="help.NeighborRules.1">In general position, consider the next crossing: exactly two segments intersect in their interiors, no third segment passes through that point, and no endpoint coincides with the crossing.</Trans></p>
        <p><Trans id="help.NeighborRules.2">The closer we get to the intersection, the smaller the gap between the two segments. If a third segment stayed between them, it would also have to pass through the intersection, contradicting the assumption that no three segments meet. Thus, sufficiently close before the crossing, the intersecting segments must be neighbors.</Trans></p>
        <p><Trans id="help.NeighborRules.3">Now look back to the most recent event. Between events there are no endpoints or crossings, so active membership and vertical order remain unchanged. This pair was therefore already adjacent after the previous event. Checking and scheduling the intersection when that adjacency forms ensures the sweep line stops in time.</Trans></p>
        <p><Trans id="help.NeighborRules.4">Insertion creates neighbors on both sides of the new segment; deletion makes the previously separated sides adjacent; crossing reorders the outer neighbors. Only these changed boundaries need checking, without enumerating every segment pair.</Trans></p>
        <p className="text-muted"><Trans id="help.NeighborRules.5">Scope: shared endpoints, endpoints in segment interiors, multiple segments meeting at one point, vertical segments, events at the same sweep coordinate, and collinear overlaps require additional rules. The ordinary examples and adjacency argument here do not replace a complete proof of handling these degeneracies.</Trans></p>
    </section>
}

export function EventQueueRules() {
  const { t } = useLingui()
  return <section aria-label={t({ id: 'help.EventQueueRules.label', message: 'Event queue explanation' })} className="flex flex-col gap-3">
    <h2 className="font-semibold"><Trans id="help.EventQueueRules.0">Event queue</Trans></h2>
    <p><Trans id="help.EventQueueRules.1">First <span className="coordinates">x</span>, then <span className="coordinates">y</span>; the front of the queue is processed first.</Trans></p>
    <p><Trans id="help.EventQueueRules.2">After preprocessing, queue coverage endpoints and zero-length inputs. Neighbor certificates add strictly future intersections; cancellation removes an empty candidate bucket immediately. Equal positions share one bucket. The current event is displayed separately after removal from the queue.</Trans></p>
  </section>
}

export function ActiveOrderRules({ overlap }: { overlap: boolean }) {
  const { t } = useLingui()
  return <section aria-label={t({ id: 'help.ActiveOrderRules.label', message: 'Active segment order' })} className="flex flex-col gap-3">
    <h2 className="font-semibold"><Trans id="help.ActiveOrderRules.0">Active segment order</Trans></h2>
    <p><Trans id="help.ActiveOrderRules.1">The list projects original inputs present before, at or after the current event, ordered from bottom to top. The core tree stores coverage intervals instead. Cover IDs and original input IDs are separate; neighbor certificates refer to coverage intervals.</Trans></p>
    {overlap && <p><Trans id="help.ActiveOrderRules.2">Overlapping members are tied at the same height. List positions identify them individually, not a difference in vertical position. Their ranks in the drawing also point to the same geometric location.</Trans></p>}
  </section>
}
