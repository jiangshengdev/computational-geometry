import { Fragment } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heroui/react/card'
import { AnimatePresence, LayoutGroup } from 'motion/react'
import { formatPoint, samePoint } from '../../../../geometry/geometry'
import { formatGeometry, pairName } from '../../geometry'
import { HelpButton } from '../help/CaseHelp'
import { LearningRow } from './LearningMotion'
import { type LearningState } from './learningState'
import { type LearningReplay } from './useLearningReplay'
import type { I18n } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { Trans, Plural } from '@lingui/react/macro'

export function learningPanels(state: LearningState, replay: LearningReplay, translate: I18n['_']) {
  const {
    preset, trace, generated, step, complete, phase, pointInputs, recordedOverlap,
    overlaps, visibleOverlaps, endingOverlaps, continuingOverlapInputs, checkedInputs,
    neighborChange, checkedWithoutDiscovery, points, pointName, newlyScheduled,
  } = state
  const {
    navigation, reducedMotion, animationId, titleProps, eventProps, inputProps,
    attachCurrentPanel, attachPendingPanel, attachActivePanel, attachParticipantsPanel, attachExplanationPanel,
    destinations, sources,
  } = replay
  const listSeparator = translate(msg({ id: 'learning.listSeparator', message: ', ', comment: 'Separator between teaching list items. Preserve surrounding whitespace.' }))
  const conjunction = translate(msg({ id: 'learning.segmentConjunction', message: ' and ', comment: 'Connect crossing segment names in prose. Preserve surrounding whitespace.' }))
  const inputReferences = (ids: number[], separator = listSeparator) => ids.map((id, position) => <Fragment key={id}>
    {position > 0 && <span>{separator}</span>}
    <span className="learning-hover-item" data-input-id={id} {...inputProps(id)}>S{id}</span>
  </Fragment>)
  const subjects = inputReferences(step.subjects, ' × ')
  const explanations = <section aria-label={translate(msg`Action explanation`)} aria-live="polite" className="learning-panel learning-explanations"><Card className="learning-panel-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><div><CardTitle render={props => <h2 {...props} />}><Trans>Why take this action?</Trans></CardTitle><CardDescription><Trans>Use the drawing and state panels to understand the current teaching action.</Trans></CardDescription></div><div className="flex flex-wrap gap-2">
        <HelpButton topic="neighbors"><Trans>About neighbors</Trans></HelpButton>
        {trace.shear.numerator !== '0' && <HelpButton topic="vertical"><Trans>About vertical segments</Trans></HelpButton>}
        {preset.learning?.overlap && <HelpButton topic="overlap"><Trans>About overlaps</Trans></HelpButton>}
      </div></CardHeader>
      <CardContent ref={attachExplanationPanel} className="learning-panel-content flex flex-col gap-2">
        {step.action === 'initial' && (!preset.segments.length ? <p><Trans>There are no inputs, so there are no endpoints or events. The queue and active order are empty. Step through the microsteps to see event retrieval return None and exit the loop.</Trans></p> : <p><Trans>Place all endpoints in the event queue, keeping one event per point. Endpoint contacts are therefore already queued, but intersections are recorded only when that point is processed; undiscovered interior intersections are not added in advance. The active order is empty. Choose Next step to enter the event retrieval module.</Trans></p>)}
        {step.action === 'take' && <p><Trans>Take <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span> from the front of the queue and stop the sweep line here. The current event has left the pending queue; no insertion, removal, or reordering has happened yet. First check the participants at this point and record each pair's intersection, then update the active order following the real actions.</Trans></p>}
        {step.action === 'take-entry' && <p><Trans>Enter the event retrieval module before its first core statement executes. The current event and drawing retain the previous state; the next microstep will take the first queued event.</Trans></p>}
        {step.action === 'take-pop' && <p><Trans>queue.pop_first() has executed and its return value is stored in next. point and event have not been matched and bound yet, so the drawing retains its previous position. This is an intermediate module state.</Trans></p>}
        {step.action === 'take-empty' && <p>{generated ? <Trans>next is None: the event queue is empty and the sweep loop exits. Learning is complete.</Trans> : <Trans>next is None: the event queue is empty and the sweep loop exits. Confirming the final results.</Trans>}</p>}
        {step.action === 'micro' && <p><Trans>Algorithm microstep · intermediate state. The execution boundary, core variables, and drawing come from the same execution instant; the groups at this point are only a teaching summary of the event.</Trans></p>}
        {pointInputs.length > 0 && <p><Trans>The zero-length inputs <span className="coordinates">{inputReferences(pointInputs)}</span> have coincident endpoints, so they belong to both the start and end groups without entering the persistent active order. They participate in pairs only at this exact position: contact in a segment's interior or at a closed endpoint both counts. Coincident points retain separate input identities. Point events without a matching pair also complete normally.</Trans></p>}
        {step.action === 'insert' && <p><Trans>Insert <span className="coordinates">{subjects}</span>: the sweep line has reached the start, and these inputs now participate in the active order.</Trans>{' '}{step.passes.length > 1 && <><Trans>This step orders the starting and passing inputs together immediately to the right of the event, including the passing inputs' reordering. The same event is still being processed. Because a nonzero-length input starts here, insertion and reordering share one update; no second swap occurs.</Trans>{' '}</>}<Trans>Next, check whether the new neighbors intersect in the future.</Trans></p>}
        {step.action === 'remove' && <p><Trans>Remove <span className="coordinates">{subjects}</span>: the sweep line has reached the end and will no longer intersect these inputs; check for new neighbors after removal.</Trans>{endingOverlaps.length > 0 && <>{' '}{continuingOverlapInputs.length ? <Trans>This is an overlap end boundary: {inputReferences(continuingOverlapInputs)} continue while the ending inputs leave.</Trans> : <Trans>This is an overlap end boundary: all members of these pairs end here.</Trans>}{' '}<Trans>The intersection includes this boundary. Keep the complete recorded interval without recording its end again as an isolated intersection point.</Trans></>}</p>}
        {step.action === 'record' && (recordedOverlap ? <p><Trans>Record the overlap interval <span className="coordinates">{formatGeometry(recordedOverlap.geometry)}</span>: the participating segments <span className="coordinates">{inputReferences(recordedOverlap.segments, ' × ')}</span> overlap from the current, later start to the earlier end. Take the shared range of the two closed intervals, including both endpoints and every point between them, rather than only the current endpoint. The complete intersection follows from the known endpoints; the sweep line has not traversed the whole interval. The orange segment and its two endpoints mark the full intersection. The active order has not changed; membership changes follow after all pairs at this point are recorded.</Trans></p> : <p>{step.subjects.every(id => step.passes.includes(id)) ? <Trans>Record <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span>: the participating segments <span className="coordinates">{subjects}</span> cross here.</Trans> : <Trans>Record <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span>: the participating segments <span className="coordinates">{subjects}</span> touch here. Closed segments include their endpoints, so this intersection counts regardless of the approach direction.</Trans>}{' '}<Trans>The intersection has been recorded in the results; the active order has not changed yet.</Trans>{new Set([...step.starts, ...step.ends, ...step.passes]).size > 2 && <>{' '}<Trans>These pairwise records describe intersecting pairs at the same geometric point, not multiple intersection points. See the point groups for all participants; the event is not complete yet.</Trans></>}</p>)}
        {visibleOverlaps.length > 0 && <p><Trans>Overlapping members coincide throughout their shared range. The list preserves each input's identity and does not indicate that they swap vertically. Other events inside the range do not split the complete recorded interval.</Trans></p>}
        {step.action === 'reorder' && <p><Trans>Reorder to <span className="coordinates">{inputReferences(step.active, ' → ')}</span>: nonvertical participants of this event are ordered bottom to top immediately to its right. Vertical participants move above those passing through this point and continue upward, then new neighbors are checked. Other event points with the same x retain their own processing progress.</Trans></p>}
        {step.action === 'check' && <p><Trans>Check neighboring segments <span className="coordinates">{subjects}</span>.</Trans>{' '}
          {neighborChange?.action === 'insert' && <Trans>After inserting {neighborChange.subjects.map(id => `S${id}`).join(listSeparator)}, this pair lies at the boundary of the inserted segments and becomes a new pair of neighbors to check.</Trans>}
          {neighborChange?.action === 'remove' && <Trans>After removing {neighborChange.subjects.map(id => `S${id}`).join(listSeparator)}, the intervening segments are gone and the segments on either side become new neighbors.</Trans>}
          {neighborChange?.action === 'reorder' && <Trans>After the crossing segments {neighborChange.subjects.map(id => `S${id}`).join(conjunction)} reorder, this pair lies at the outer boundary of the reordered range and becomes a new pair of neighbors.</Trans>}
          {' '}<Trans>Unchanged neighbor relationships need no recheck. Bold segments in the drawing and borders in the state list mark the current pair. This step selects the pair to check without changing the queue. Endpoint events may already be queued, so contact points need not be queued again.</Trans></p>}
        {step.action === 'discover' && <p><Trans>Discover future intersections <span className="coordinates">{newlyScheduled.map((point, position) => <Fragment key={formatPoint(point)}>
          {position > 0 && <span>{listSeparator}</span>}
          <span className="learning-hover-item" {...eventProps(point)}>{pointName(point)}</span>
        </Fragment>)}</span>: after checking the exact intersection of <span className="coordinates">{subjects}</span>, add them to the queue and wait until the sweep line arrives to record the results.</Trans></p>}
        {step.action === 'complete' && <p><Trans>The event is complete: the active order and pending queue are consistent.</Trans>{' '}{complete ? <Trans>All events have been processed; no further steps are needed.</Trans> : checkedWithoutDiscovery ? <Trans>There are no future intersections to add to the queue.</Trans> : <Trans>The teaching actions for this event are complete. Next, process the first queued event.</Trans>}</p>}
    {complete && <section aria-label={translate(msg`Learning results`)}><Card variant="transparent">
      <CardHeader><CardTitle render={props => <h2 {...props} />}><Trans>Learning complete</Trans></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2"><p><Trans>The event queue and active order are empty. All inputs have been processed; zero-length points need no insertion into or removal from the active order.</Trans></p>
        {overlaps.length ? <p><Trans><Plural value={points.length} one="# point-result position" other="# point-result positions" />; <Plural value={visibleOverlaps.length} one="# overlap interval" other="# overlap intervals" />; <Plural value={step.results.length} one="# intersecting segment pair" other="# intersecting segment pairs" />. Point-type pair results are not necessarily isolated points in the overall intersection: they may lie on recorded overlap intervals. An interval contains infinitely many shared points. Each pair remains separate; no geometric union is computed.</Trans></p> : <p><Trans><Plural value={points.length} one="# distinct intersection position" other="# distinct intersection positions" />; <Plural value={step.results.length} one="# intersecting segment pair" other="# intersecting segment pairs" />. Multiple segment pairs may share the same position.</Trans></p>}
        {points.map(point => <p className="coordinates" key={formatPoint(point)}>{pointName(point)}：{step.results.filter(result => result.geometry.type === 'point' && samePoint(result.geometry.point, point)).map(pairName).join(listSeparator)}</p>)}
        {visibleOverlaps.map(result => <p className="coordinates" key={pairName(result)}><Trans>{formatGeometry(result.geometry)}: {pairName(result)} (including both endpoints and every point between them)</Trans></p>)}
        {!step.results.length && <p><Trans>The results are empty: no separate input pair intersects. See the mathematical check below for the geometric reasoning.</Trans></p>}
        <p className="coordinates"><Trans>Independent mathematical check: {preset.learning && translate(preset.learning.verification)}</Trans></p>
      </CardContent>
    </Card></section>}
      </CardContent>
    </Card></section>
  const currentEvent = <section aria-label={translate(msg`Current event`)} className="learning-panel learning-current"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><div><CardTitle render={props => <h2 {...props} />}><Trans>Current event</Trans></CardTitle><CardDescription>{phase}</CardDescription></div><HelpButton topic="ties"><Trans>About events</Trans></HelpButton></CardHeader>
          <CardContent ref={attachCurrentPanel} className="learning-panel-content relative flex flex-col gap-1">
            <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:current:${navigation.reset}:${reducedMotion}`}>
            <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
              {step.current && <LearningRow as="p" key={formatPoint(step.current)} identity={`event:${formatPoint(step.current)}`}
                existed={sources.includes(`event:${formatPoint(step.current)}`)} data-event-id={formatPoint(step.current)} {...eventProps(step.current)}>{pointName(step.current)}</LearningRow>}
            </AnimatePresence>
            </LayoutGroup>
            {!step.current && <p>{complete ? <Trans>No events</Trans> : <Trans>No event processed yet</Trans>}</p>}
          </CardContent>
        </Card></section>
  const participants = <section aria-label={translate(msg`Segments at this point`)} className="learning-panel learning-participants"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><CardTitle render={props => <h2 {...props} />}><Trans>Segments at this point</Trans></CardTitle><HelpButton topic="ties"><Trans>About shared points</Trans></HelpButton></CardHeader>
          <CardContent ref={attachParticipantsPanel} className="learning-panel-content flex flex-col gap-1">
            {step.current ? <>
              <p><Trans>Starting: {step.starts.length ? inputReferences(step.starts) : translate(msg`None`)}</Trans></p>
              <p><Trans>Ending: {step.ends.length ? inputReferences(step.ends) : translate(msg`None`)}</Trans></p>
              <p><Trans>Passing: {step.passes.length ? inputReferences(step.passes) : translate(msg`None`)}</Trans></p>
            </> : <p><Trans>Participants at this point appear after taking an event.</Trans></p>}
          </CardContent>
        </Card></section>
  const pendingEvents = <section aria-label={translate(msg`Pending event queue`)} className="learning-panel learning-pending"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><CardTitle render={props => <h2 {...props} />} {...titleProps('pending')}><Trans>Pending event queue</Trans></CardTitle><HelpButton topic="events"><Trans>About the queue</Trans></HelpButton></CardHeader>
          <CardContent ref={attachPendingPanel} className="learning-panel-content">
            <ol className="relative flex list-inside list-decimal flex-col gap-1">
              <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:pending:${navigation.reset}:${reducedMotion}`}>
              <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
                {step.pending.map(p => <LearningRow key={formatPoint(p)} identity={`event:${formatPoint(p)}`}
                  existed={sources.includes(`event:${formatPoint(p)}`)} data-event-id={formatPoint(p)} {...eventProps(p)}>{pointName(p)}</LearningRow>)}
              </AnimatePresence>
              </LayoutGroup>
            </ol>
            {!step.pending.length && <p><Trans>Empty</Trans></p>}
          </CardContent>
        </Card></section>
  const activeSegments = <section aria-label={translate(msg`Active segment order`)} className="learning-panel learning-active"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><CardTitle render={props => <h2 {...props} />} {...titleProps('active')}><Trans>Active segment order</Trans></CardTitle><HelpButton topic="active"><Trans>About the order</Trans></HelpButton></CardHeader>
          <CardContent ref={attachActivePanel} className="learning-panel-content flex flex-col gap-1"><p className="text-sm text-muted">{step.action === 'take' || step.action === 'record' ? <Trans>Keeping the order from before this event</Trans> : step.phase === 'processed' ? <Trans>Order after the processed event</Trans> : <Trans>Order after the current teaching action; the event is still in progress</Trans>}</p>
            <div data-testid="active-order"><ol className="relative flex list-inside list-decimal flex-col-reverse gap-1">
              <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:active:${navigation.reset}:${reducedMotion}`}>
              <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
                {step.active.map(id => <LearningRow key={id} identity={`segment:${id}`}
                  existed={sources.includes(`segment:${id}`)} data-input-id={id} data-checked={checkedInputs.includes(id)} {...inputProps(id)}>S{id}</LearningRow>)}
              </AnimatePresence>
              </LayoutGroup>
            </ol>{!step.active.length && <p><Trans>Empty</Trans></p>}</div>
          </CardContent>
        </Card></section>
  return { explanations, currentEvent, participants, pendingEvents, activeSegments }
}
