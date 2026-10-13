import { Fragment } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@heroui/react/card'
import { AnimatePresence, LayoutGroup } from 'motion/react'
import { formatGeometry, formatPoint, pairName, samePoint } from '../geometry/geometry'
import { HelpButton } from '../help/CaseHelp'
import { LearningRow } from './LearningMotion'
import { type LearningState } from './learningState'
import { type LearningReplay } from './useLearningReplay'

export function learningPanels(state: LearningState, replay: LearningReplay) {
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
  const inputReferences = (ids: number[], separator: string) => ids.map((id, position) => <Fragment key={id}>
    {position > 0 && <span>{separator}</span>}
    <span className="learning-hover-item" data-input-id={id} {...inputProps(id)}>S{id}</span>
  </Fragment>)
  const subjects = inputReferences(step.subjects, ' × ')
  const explanations = <section aria-label="操作解释" aria-live="polite" className="learning-panel learning-explanations"><Card className="learning-panel-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><div><CardTitle render={props => <h2 {...props} />}>这一步为什么这样做？</CardTitle><CardDescription>结合画布与各项状态，理解当前教学动作。</CardDescription></div><div className="flex flex-wrap gap-2">
        <HelpButton topic="neighbors">相邻性说明</HelpButton>
        {trace.shear.numerator !== '0' && <HelpButton topic="vertical">竖直线说明</HelpButton>}
        {preset.learning?.overlap && <HelpButton topic="overlap">重叠说明</HelpButton>}
      </div></CardHeader>
      <CardContent ref={attachExplanationPanel} className="learning-panel-content flex flex-col gap-2">
        {step.action === 'initial' && (!preset.segments.length ? <p>没有输入，因此没有端点和事件。队列与活动顺序为空，可以逐小步观察取事件返回 None 并退出循环。</p> : <p>先把所有端点放入事件队列，同一点只保留一个事件。端点接触的位置因此已在队列中，但交集要到处理该点时才记录；其他尚未发现的内部交点不预先加入。活动顺序为空，点击下一步进入取事件模块。</p>)}
        {step.action === 'take' && <p>从队首取出 <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span>，扫描线停在此处。当前事件已离开待处理队列；此刻还没有加入、退出或换序。先核对同点参与者并逐对记录交集，再按真实动作更新活动顺序。</p>}
        {step.action === 'take-entry' && <p>进入取事件模块，尚未执行第一条核心语句。当前事件与画布保留上一步状态；下一小步将取出队首事件。</p>}
        {step.action === 'take-pop' && <p>已执行 queue.pop_first()，返回值保存在 next 中。尚未匹配和绑定 point、event，所以画布仍保留上一步位置。这是模块中间状态。</p>}
        {step.action === 'take-empty' && <p>next 为 None，事件队列已空，退出扫描循环。{generated ? '学习完成。' : '正在确认最终结果。'}</p>}
        {step.action === 'micro' && <p>算法小步 · 中间状态。代码执行边界、核心变量与当前画布来自同一执行时刻；同点分组仅是事件教学摘要。</p>}
        {pointInputs.length > 0 && <p>零长度点 <span className="coordinates">{inputReferences(pointInputs, '、')}</span> 的两个端点重合，所以同时属于开始和结束，不进入持续活动顺序。它们只在当前精确位置参与配对：位于线段内部或闭端点都算接触；重合点仍保留独立输入身份。没有配对的点事件也会正常完成。</p>}
        {step.action === 'insert' && <p>加入 <span className="coordinates">{subjects}</span>：扫描线到达其起点，此后它参与活动顺序。{step.passes.length > 1 && '本步已将开始者与穿过者一起排成紧邻事件右侧的顺序，穿过者的换序也已显示；这仍是同一事件的处理中状态。本点有非零长度开始者，换序与加入是同一次更新，不会再次交换。'}接下来检查新邻居是否会在未来相交。</p>}
        {step.action === 'remove' && <p>退出 <span className="coordinates">{subjects}</span>：扫描线到达其终点，后续不再与它相交；检查删除后是否出现新邻居。{endingOverlaps.length > 0 && <>此处是重叠止界：{continuingOverlapInputs.length ? <>{inputReferences(continuingOverlapInputs, '、')} 继续，当前结束者退出。</> : '这些配对的成员均在此结束。'}交集包含这个边界；保留已记录的完整区间，不再把止界重复记成孤立交点。</>}</p>}
        {step.action === 'record' && (recordedOverlap ? <p>记录重叠区间 <span className="coordinates">{formatGeometry(recordedOverlap.geometry)}</span>：参与线段 <span className="coordinates">{inputReferences(recordedOverlap.segments, ' × ')}</span> 从当前较晚起点开始重合，到较早终点为止。取两个闭区间的公共范围，包含两端及其间全部点，不是只记录当前端点。这是根据已知端点确定完整交集，并非扫描线已走完整段。橙色线段和两个端点标出完整交集；活动顺序尚未更新，同点配对全部记录后再处理成员变化。</p> : <p>记录 <span className="coordinates learning-hover-item" {...eventProps(step.current!)}>{pointName(step.current!)}</span>：参与线段 <span className="coordinates">{subjects}</span> {step.subjects.every(id => step.passes.includes(id)) ? '在这里交叉。' : '在这里接触。闭线段包含端点，从哪一侧接近都不能忽略这个交集。'}交集已记入结果，活动顺序尚未更新。{new Set([...step.starts, ...step.ends, ...step.passes]).size > 2 && '这里逐对记录的是同一个几何点的相交配对，不是多个交点；全部参与者见同点分组，整个事件尚未完成。'}</p>)}
        {visibleOverlaps.length > 0 && <p>重叠成员在公共范围内几何并列，列表保留各自输入身份，不表示彼此上下交换。内部的其他事件不切碎已记录的完整区间。</p>}
        {step.action === 'reorder' && <p>换序为 <span className="coordinates">{inputReferences(step.active, ' → ')}</span>：本事件非竖直参与者按紧邻事件右侧从下到上的顺序排列，竖直参与者移到本点穿过者上方，继续向更高处处理，再检查新邻居。同 x 的其他事件点保留各自处理进度。</p>}
        {step.action === 'check' && <p>检查相邻线段 <span className="coordinates">{subjects}</span>：
          {neighborChange?.action === 'insert' && <>加入 {neighborChange.subjects.map(id => `S${id}`).join('、')} 后，这一对处在新插入线段的边界，成为需要检查的新邻居。</>}
          {neighborChange?.action === 'remove' && <>退出 {neighborChange.subjects.map(id => `S${id}`).join('、')} 后，原来隔在中间的线段消失，两侧线段成为新邻居。</>}
          {neighborChange?.action === 'reorder' && <>交叉的 {neighborChange.subjects.map(id => `S${id}`).join(' 与 ')} 换序后，这一对处在换序区间的外侧边界，成为新邻居。</>}
          其他未改变的邻接关系无需重查。图中加粗线段与状态列表边框标出当前配对；此步选定检查配对，尚未改变队列。端点事件可能已经在队列中，接触点无需重复入队。</p>}
        {step.action === 'discover' && <p>发现未来交点 <span className="coordinates">{newlyScheduled.map((point, position) => <Fragment key={formatPoint(point)}>
          {position > 0 && <span>、</span>}
          <span className="learning-hover-item" {...eventProps(point)}>{pointName(point)}</span>
        </Fragment>)}</span>：检查 <span className="coordinates">{subjects}</span> 的精确交集后加入队列，等扫描线到达再记录结果。</p>}
        {step.action === 'complete' && <p>事件处理完成：活动顺序和待处理队列保持一致。{complete ? '全部事件已处理，无需再推进。' : checkedWithoutDiscovery ? '没有需要加入队列的未来交点。' : '本事件的教学动作已完成，下一步处理队首事件。'}</p>}
    {complete && <section aria-label="学习结果"><Card variant="transparent">
      <CardHeader><CardTitle render={props => <h2 {...props} />}>学习完成</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2"><p>事件队列与活动顺序均为空，全部输入已处理完毕；零长度点无需加入或退出活动顺序。</p>
        {overlaps.length ? <p>点类型结果位置：{points.length}；重叠区间：{visibleOverlaps.length}；相交线段对：{step.results.length}。点类型配对结果不等于整体交集中的孤立点，它们也可能位于已记录的重叠区间上。区间包含无穷多个公共点，各配对保持独立，不计算几何并集。</p> : <p>独立交点位置：{points.length}；相交线段对：{step.results.length}。同一位置可由多个线段对共享。</p>}
        {points.map(point => <p className="coordinates" key={formatPoint(point)}>{pointName(point)}：{step.results.filter(result => result.geometry.type === 'point' && samePoint(result.geometry.point, point)).map(pairName).join('、')}</p>)}
        {visibleOverlaps.map(result => <p className="coordinates" key={pairName(result)}>{formatGeometry(result.geometry)}：{pairName(result)}（包含两端及其间全部点）</p>)}
        {!step.results.length && <p>结果为空：没有相交的独立输入配对。具体几何依据见下方数学核对。</p>}
        <p className="coordinates">独立数学核对：{preset.learning?.verification}</p>
      </CardContent>
    </Card></section>}
      </CardContent>
    </Card></section>
  const currentEvent = <section aria-label="当前事件" className="learning-panel learning-current"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><div><CardTitle render={props => <h2 {...props} />}>当前事件</CardTitle><CardDescription>{phase}</CardDescription></div><HelpButton topic="ties">事件说明</HelpButton></CardHeader>
          <CardContent ref={attachCurrentPanel} className="learning-panel-content relative flex flex-col gap-1">
            <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:current:${navigation.reset}:${reducedMotion}`}>
            <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
              {step.current && <LearningRow as="p" key={formatPoint(step.current)} identity={`event:${formatPoint(step.current)}`}
                existed={sources.includes(`event:${formatPoint(step.current)}`)} data-event-id={formatPoint(step.current)} {...eventProps(step.current)}>{pointName(step.current)}</LearningRow>}
            </AnimatePresence>
            </LayoutGroup>
            {!step.current && <p>{complete ? '没有事件' : '尚未处理事件'}</p>}
          </CardContent>
        </Card></section>
  const participants = <section aria-label="同点参与线段" className="learning-panel learning-participants"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><CardTitle render={props => <h2 {...props} />}>同点参与线段</CardTitle><HelpButton topic="ties">同点说明</HelpButton></CardHeader>
          <CardContent ref={attachParticipantsPanel} className="learning-panel-content flex flex-col gap-1">
            {step.current ? <>
              <p>开始：{step.starts.length ? inputReferences(step.starts, '、') : '无'}</p>
              <p>结束：{step.ends.length ? inputReferences(step.ends, '、') : '无'}</p>
              <p>穿过：{step.passes.length ? inputReferences(step.passes, '、') : '无'}</p>
            </> : <p>取出事件后显示同点参与者。</p>}
          </CardContent>
        </Card></section>
  const pendingEvents = <section aria-label="待处理事件队列" className="learning-panel learning-pending"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><CardTitle render={props => <h2 {...props} />} {...titleProps('pending')}>待处理事件队列</CardTitle><HelpButton topic="events">队列说明</HelpButton></CardHeader>
          <CardContent ref={attachPendingPanel} className="learning-panel-content">
            <ol className="relative flex list-inside list-decimal flex-col gap-1">
              <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:pending:${navigation.reset}:${reducedMotion}`}>
              <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
                {step.pending.map(p => <LearningRow key={formatPoint(p)} identity={`event:${formatPoint(p)}`}
                  existed={sources.includes(`event:${formatPoint(p)}`)} data-event-id={formatPoint(p)} {...eventProps(p)}>{pointName(p)}</LearningRow>)}
              </AnimatePresence>
              </LayoutGroup>
            </ol>
            {!step.pending.length && <p>空</p>}
          </CardContent>
        </Card></section>
  const activeSegments = <section aria-label="活动线段顺序" className="learning-panel learning-active"><Card className="learning-panel-card">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2"><CardTitle render={props => <h2 {...props} />} {...titleProps('active')}>活动线段顺序</CardTitle><HelpButton topic="active">顺序说明</HelpButton></CardHeader>
          <CardContent ref={attachActivePanel} className="learning-panel-content flex flex-col gap-1"><p className="text-sm text-muted">{step.action === 'take' || step.action === 'record' ? '保留该事件处理前顺序' : step.phase === 'processed' ? '当前已处理事件之后的顺序' : '当前教学动作后的顺序，事件尚未处理完成'}</p>
            <div data-testid="active-order"><ol className="relative flex list-inside list-decimal flex-col-reverse gap-1">
              <LayoutGroup key={`${navigation.reset}:${reducedMotion}`} id={`${animationId}:active:${navigation.reset}:${reducedMotion}`}>
              <AnimatePresence initial={false} mode="popLayout" custom={destinations}>
                {step.active.map(id => <LearningRow key={id} identity={`segment:${id}`}
                  existed={sources.includes(`segment:${id}`)} data-input-id={id} data-checked={checkedInputs.includes(id)} {...inputProps(id)}>S{id}</LearningRow>)}
              </AnimatePresence>
              </LayoutGroup>
            </ol>{!step.active.length && <p>空</p>}</div>
          </CardContent>
        </Card></section>
  return { explanations, currentEvent, participants, pendingEvents, activeSegments }
}
