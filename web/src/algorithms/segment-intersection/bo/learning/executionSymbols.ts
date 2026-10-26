import type { I18n, MessageDescriptor } from '@lingui/core'
import type { ExecutionContext, ExecutionControl, ExecutionVariable, ExecutionVariableKind, SweepStep } from './trace'
import { formatExecutionValue } from './executionValue'

const meanings: Record<string, MessageDescriptor> = {
  queue: /*i18n*/ { id: "Pending events ordered by sweep coordinates", message: "Pending events ordered by sweep coordinates" }, next: /*i18n*/ { id: "The event just removed from the queue, possibly absent", message: "The event just removed from the queue, possibly absent" },
  point: /*i18n*/ { id: "Sweep coordinates of the current event", message: "Sweep coordinates of the current event" }, event: /*i18n*/ { id: "Segment information carried by the current event", message: "Segment information carried by the current event" },
  segments: /*i18n*/ { id: "Segments transformed into sweep coordinates; shadows the original input parameter with the same name", message: "Segments transformed into sweep coordinates; shadows the original input parameter with the same name" }, active: /*i18n*/ { id: "Indices of the currently active segments", message: "Indices of the currently active segments" },
  incident: /*i18n*/ { id: "Indices of segments incident to the current event point", message: "Indices of segments incident to the current event point" }, height_order: /*i18n*/ { id: "Exact height comparisons cached by segment index. The classification loop updates entries individually; unvisited entries retain earlier values and are not yet updated for this event", message: "Exact height comparisons cached by segment index. The classification loop updates entries individually; unvisited entries retain earlier values and are not yet updated for this event" },
  id: /*i18n*/ { id: "Segment index visited by the current loop", message: "Segment index visited by the current loop" }, starts: /*i18n*/ { id: "Segments starting at the current point", message: "Segments starting at the current point" }, ends: /*i18n*/ { id: "Segments ending at the current point", message: "Segments ending at the current point" },
  passes: /*i18n*/ { id: "Segments whose interiors pass through the current point", message: "Segments whose interiors pass through the current point" }, i: /*i18n*/ { id: "Current outer pairing index", message: "Current outer pairing index" }, a: /*i18n*/ { id: "First segment in the current pair (an index in the sweep loop)", message: "First segment in the current pair (an index in the sweep loop)" },
  b: /*i18n*/ { id: "Second segment in the current pair (an index in the sweep loop)", message: "Second segment in the current pair (an index in the sweep loop)" }, shear: /*i18n*/ { id: "Shear coefficient for sweep coordinates", message: "Shear coefficient for sweep coordinates" },
  p: /*i18n*/ { id: "Coordinate restoration closure parameter, valid only during that invocation", message: "Coordinate restoration closure parameter, valid only during that invocation" }, start: /*i18n*/ { id: "Start of the candidate overlap interval", message: "Start of the candidate overlap interval" },
  end: /*i18n*/ { id: "End of the candidate overlap interval", message: "End of the candidate overlap interval" }, geometry: /*i18n*/ { id: "Intersection of the current pair in original coordinates", message: "Intersection of the current pair in original coordinates" }, result: /*i18n*/ { id: "Intersections recorded up to the current step", message: "Intersections recorded up to the current step" },
  position: /*i18n*/ { id: "Position where new active segments enter the active sequence", message: "Position where new active segments enter the active sequence" }, inserted: /*i18n*/ { id: "Number of segments to insert in this event", message: "Number of segments to insert in this event" },
  boundaries: /*i18n*/ { id: "Outer boundaries of the insertion range that need checking", message: "Outer boundaries of the insertion range that need checking" }, lower: /*i18n*/ { id: "Active-sequence index of the first segment in the neighboring pair", message: "Active-sequence index of the first segment in the neighboring pair" },
  neighbors: /*i18n*/ { id: "Indices of the neighboring segments being checked", message: "Indices of the neighboring segments being checked" }, current: /*i18n*/ { id: "Sweep coordinates of the event being processed", message: "Sweep coordinates of the event being processed" },
  checked: /*i18n*/ { id: "Neighboring pairs already checked for this event", message: "Neighboring pairs already checked for this event" }, candidate: /*i18n*/ { id: "Intersection candidate returned by the completed neighbor call", message: "Intersection candidate returned by the completed neighbor call" },
  return_value: /*i18n*/ { id: "Return value already produced by the current call", message: "Return value already produced by the current call" },
}

export const functions: Record<string, { signature: string; purpose: MessageDescriptor; parameters: MessageDescriptor }> = {
  schedule_neighbors: { signature: 'schedule_neighbors(active, lower, segments, current, queue, checked) -> Option<Point>', purpose: /*i18n*/ { id: "Check actual neighbors, enqueue future intersections, and return a geometry candidate.", message: "Check actual neighbors, enqueue future intersections, and return a geometry candidate." }, parameters: /*i18n*/ { id: "active: active order; lower: neighbor index; segments: sweep segments; current: current event; queue: event queue; checked: checked pairs.", message: "active: active order; lower: neighbor index; segments: sweep segments; current: current event; queue: event queue; checked: checked pairs." } },
  intersection_candidate: { signature: 'intersection_candidate(a, b) -> Option<Point>', purpose: /*i18n*/ { id: "Atomic geometry operation in the teaching code, corresponding to the actual exact Rust computation without expanding its formulas.", message: "Atomic geometry operation in the teaching code, corresponding to the actual exact Rust computation without expanding its formulas." }, parameters: /*i18n*/ { id: "a, b: sweep segments used in this geometry computation.", message: "a, b: sweep segments used in this geometry computation." } },
  pop_first: { signature: 'pop_first(&mut self) -> Option<(Point, Event)>', purpose: /*i18n*/ { id: "Remove and return the earliest event in the queue.", message: "Remove and return the earliest event in the queue." }, parameters: /*i18n*/ { id: "self: the current queue; no explicit arguments.", message: "self: the current queue; no explicit arguments." } },
  y_at: { signature: 'y_at(&self, x: &Rational) -> Rational', purpose: /*i18n*/ { id: "Compute the exact segment height at the given x coordinate.", message: "Compute the exact segment height at the given x coordinate." }, parameters: /*i18n*/ { id: "self: the current segment; x: event x coordinate.", message: "self: the current segment; x: event x coordinate." } },
  cmp: { signature: 'cmp(&self, other: &Self) -> Ordering', purpose: /*i18n*/ { id: "Compare two values in the current expression.", message: "Compare two values in the current expression." }, parameters: /*i18n*/ { id: "self, other: the operands at this call site, such as heights or slopes.", message: "self, other: the operands at this call site, such as heights or slopes." } },
  is_eq: { signature: 'is_eq(self) -> bool', purpose: /*i18n*/ { id: "Check whether the comparison result is equal.", message: "Check whether the comparison result is equal." }, parameters: /*i18n*/ { id: "self: the current height comparison result; no explicit arguments.", message: "self: the current height comparison result; no explicit arguments." } },
  is_lt: { signature: 'is_lt(self) -> bool', purpose: /*i18n*/ { id: "Check whether the comparison result is less than.", message: "Check whether the comparison result is less than." }, parameters: /*i18n*/ { id: "self: the comparison result at this call site; no explicit arguments.", message: "self: the comparison result at this call site; no explicit arguments." } },
  push: { signature: 'push(&mut self, value: T) -> ()', purpose: /*i18n*/ { id: "Append an element to the target sequence.", message: "Append an element to the target sequence." }, parameters: /*i18n*/ { id: "self: the sequence to the left of the call; value: the element in parentheses.", message: "self: the sequence to the left of the call; value: the element in parentheses." } },
  new: { signature: 'Vec::new() -> Vec<T>', purpose: /*i18n*/ { id: "Create an empty sequence.", message: "Create an empty sequence." }, parameters: /*i18n*/ { id: "No arguments.", message: "No arguments." } },
  iter: { signature: 'iter(&self) -> Iter<T>', purpose: /*i18n*/ { id: "Visit sequence elements in order.", message: "Visit sequence elements in order." }, parameters: /*i18n*/ { id: "self: the sequence at this call site; no explicit arguments.", message: "self: the sequence at this call site; no explicit arguments." } },
  enumerate: { signature: 'enumerate(self) -> Enumerate<Self>', purpose: /*i18n*/ { id: "Attach zero-based indices to iterator elements.", message: "Attach zero-based indices to iterator elements." }, parameters: /*i18n*/ { id: "self: the iterator at this call site; no explicit arguments.", message: "self: the iterator at this call site; no explicit arguments." } },
  original: { signature: 'original(p: &Point) -> Point', purpose: /*i18n*/ { id: "Undo the shear to restore original coordinates.", message: "Undo the shear to restore original coordinates." }, parameters: /*i18n*/ { id: "p: the sweep-coordinate point for this call.", message: "p: the sweep-coordinate point for this call." } },
  min: { signature: 'min(self, other: Self) -> Self', purpose: /*i18n*/ { id: "Return the smaller of two values.", message: "Return the smaller of two values." }, parameters: /*i18n*/ { id: "self, other: the two operands at this call site.", message: "self, other: the two operands at this call site." } },
  max: { signature: 'max(self, other: Self) -> Self', purpose: /*i18n*/ { id: "Return the larger of two values.", message: "Return the larger of two values." }, parameters: /*i18n*/ { id: "self, other: the two operands at this call site.", message: "self, other: the two operands at this call site." } },
  retain: { signature: 'retain(&mut self, predicate) -> ()', purpose: /*i18n*/ { id: "Keep elements that satisfy the predicate.", message: "Keep elements that satisfy the predicate." }, parameters: /*i18n*/ { id: "predicate: the retention condition; self: the sequence to the left of the call.", message: "predicate: the retention condition; self: the sequence to the left of the call." } },
  sort_by: { signature: 'sort_by(&mut self, compare) -> ()', purpose: /*i18n*/ { id: "Sort using the comparison function.", message: "Sort using the comparison function." }, parameters: /*i18n*/ { id: "compare: the current ordering rule.", message: "compare: the current ordering rule." } },
  partition_point: { signature: 'partition_point(&self, predicate) -> usize', purpose: /*i18n*/ { id: "Locate the boundary of an ordered partition.", message: "Locate the boundary of an ordered partition." }, parameters: /*i18n*/ { id: "predicate: the current partition condition.", message: "predicate: the current partition condition." } },
  len: { signature: 'len(&self) -> usize', purpose: /*i18n*/ { id: "Read the sequence length.", message: "Read the sequence length." }, parameters: /*i18n*/ { id: "self: the sequence at this call site; no explicit arguments.", message: "self: the sequence at this call site; no explicit arguments." } },
  splice: { signature: 'splice(&mut self, range, replace_with) -> Splice', purpose: /*i18n*/ { id: "Replace elements in the specified range.", message: "Replace elements in the specified range." }, parameters: /*i18n*/ { id: "range: the range to replace; replace_with: the new elements.", message: "range: the range to replace; replace_with: the new elements." } },
  checked_sub: { signature: 'checked_sub(self, rhs: usize) -> Option<usize>', purpose: /*i18n*/ { id: "Subtract an index with an underflow check.", message: "Subtract an index with an underflow check." }, parameters: /*i18n*/ { id: "self: the index at this call site; rhs: the amount to subtract.", message: "self: the index at this call site; rhs: the amount to subtract." } },
  then: { signature: 'then(self, f) -> Option<T>', purpose: /*i18n*/ { id: "Run the closure and return its result when the condition is true; otherwise return None.", message: "Run the closure and return its result when the condition is true; otherwise return None." }, parameters: /*i18n*/ { id: "self: the condition; f: the closure producing the value.", message: "self: the condition; f: the closure producing the value." } },
  into_iter: { signature: 'into_iter(self) -> IntoIter<T>', purpose: /*i18n*/ { id: "Convert the collection into an iterator that consumes its elements.", message: "Convert the collection into an iterator that consumes its elements." }, parameters: /*i18n*/ { id: "self: the collection at this call site.", message: "self: the collection at this call site." } },
  flatten: { signature: 'flatten(self) -> Flatten<Self>', purpose: /*i18n*/ { id: "Flatten nested iterator values; None in an Option produces no element.", message: "Flatten nested iterator values; None in an Option produces no element." }, parameters: /*i18n*/ { id: "self: the iterator at this call site.", message: "self: the iterator at this call site." } },
  get: { signature: 'get(&self, range) -> Option<&[T]>', purpose: /*i18n*/ { id: "Get the specified range, returning None when out of bounds.", message: "Get the specified range, returning None when out of bounds." }, parameters: /*i18n*/ { id: "self: the sequence at this call site; range: the index range.", message: "self: the sequence at this call site; range: the index range." } },
  entry: { signature: 'entry(&mut self, key) -> Entry<K, V>', purpose: /*i18n*/ { id: "Get the map entry for the specified key.", message: "Get the map entry for the specified key." }, parameters: /*i18n*/ { id: "self: the map at this call site; key: the entry key.", message: "self: the map at this call site; key: the entry key." } },
  clone: { signature: 'clone(&self) -> Self', purpose: /*i18n*/ { id: "Clone the current value.", message: "Clone the current value." }, parameters: /*i18n*/ { id: "self: the value at this call site.", message: "self: the value at this call site." } },
  or_default: { signature: 'or_default(self) -> &mut V', purpose: /*i18n*/ { id: "Get the entry value, inserting a default when the key is absent.", message: "Get the entry value, inserting a default when the key is absent." }, parameters: /*i18n*/ { id: "self: the map entry at this call site.", message: "self: the map entry at this call site." } },
}

export function callExpression(name: string, after: string) {
  // Teaching source uses line comments. Exclude their prose from both the
  // parenthesis scan and the expression consumed by reference inspection.
  const source = after.replace(/\/\/[^\r\n]*/g, '')
  const open = source.search(/\S/)
  if (open < 0 || source[open] !== '(') return name
  let depth = 0
  for (let index = open; index < source.length; index++) {
    if (source[index] === '(') depth++
    if (source[index] === ')' && --depth === 0) return name + source.slice(0, index + 1)
  }
  return name + source
}

export const shadowedValueNote = /*i18n*/ { id: " (shadowed; last value before shadowing)", message: " (shadowed; last value before shadowing)" }

export function hasVariableValue(variable: ExecutionVariable | undefined) {
  return !!variable && (variable.availability === 'available' || variable.availability === 'shadowed') && variable.value !== null
}

export function variableValue(variable: ExecutionVariable | undefined, values: string[], _: I18n['_']) {
  if (!variable || variable.availability === 'unavailable') return _(/*i18n*/ { id: "Unavailable (not provided by the current scope)", message: "Unavailable (not provided by the current scope)" })
  if (variable.availability === 'unassigned') return _(/*i18n*/ { id: "Unassigned", message: "Unassigned" })
  if (variable.availability === 'shadowed') return variable.value === null
    ? _(/*i18n*/ { id: "Shadowed (last value before shadowing was not recorded)", message: "Shadowed (last value before shadowing was not recorded)" })
    : `${formatExecutionValue(values[variable.value])}${_(shadowedValueNote)}`
  return variable.value === null ? _(/*i18n*/ { id: "Unavailable (no value provided by the current trace)", message: "Unavailable (no value provided by the current trace)" }) : formatExecutionValue(values[variable.value])
}

export function symbolScope(name: string, module: string, line: number, _: I18n['_']) {
  if (module === 'classify' && name === 'id') return line <= 6 ? _(/*i18n*/ { id: "Active segment loop", message: "Active segment loop" }) : _(/*i18n*/ { id: "Incident segment loop", message: "Incident segment loop" })
  if (module === 'activity' && ['id', 'a', 'b'].includes(name)) return _(/*i18n*/ { id: "Closure on line {line}", message: "Closure on line {line}" , values: { line: String(line) }})
  if (module === 'record' && name === 'p') return _(/*i18n*/ { id: "original closure", message: "original closure" })
  if (module.startsWith('retain-')) return _(/*i18n*/ { id: "retain closure", message: "retain closure" })
  return _(/*i18n*/ { id: "{module} module", message: "{module} module" , values: { module: module }})
}

export function scopedVariable(name: string, step: SweepStep, line: number, _: I18n['_']) {
  const { module, context } = step.execution
  const variable = context.locals.find(item => item.name === name) ?? context.parameters.find(item => item.name === name) ?? context.captures.find(item => item.name === name)
  let visible = true
  if (module === 'classify' && name === 'id') visible = variable?.scope === (line <= 6 ? 'classify.active' : 'classify.incident')
  // Callback parameters are distinct bindings. The sweep's a/b/id and a
  // different invocation's arguments cannot stand in for these parameters.
  if (module === 'activity' && ['id', 'a', 'b'].includes(name)) visible = false
  if (module === 'record') {
    if (name === 'p') visible = false
  }
  return visible ? variable : { name, type: variable?.type ?? _(/*i18n*/ { id: "Variable in the current lexical scope", message: "Variable in the current lexical scope" }), availability: 'unavailable' as const, value: null, scope: null }
}

export function variableDetails(name: string, step: SweepStep, previous: SweepStep, values: string[], line: number, _: I18n['_']) {
  const context = step.execution.context
  // Locals deliberately win even while unassigned or unavailable: never expose
  // the input parameter hidden by the scan-coordinate local named segments.
  const variable = scopedVariable(name, step, line, _)
  const kind = context.locals.some(item => item.name === name) ? 'locals' : context.parameters.some(item => item.name === name) ? 'parameters' : 'captures'
  return describeVariable(name, variable, kind, step, previous, values, symbolScope(name, step.execution.module, line, _), line, context, _)
}

export function panelVariableDetails(variable: ExecutionVariable, kind: ExecutionVariableKind, step: SweepStep, previous: SweepStep, values: string[], context = step.execution.context, _: I18n['_']) {
  const scope = variable.scope === 'classify.active' ? _(/*i18n*/ { id: "Active segment loop", message: "Active segment loop" })
    : variable.scope === 'classify.incident' ? _(/*i18n*/ { id: "Incident segment loop", message: "Incident segment loop" })
    : variable.scope ?? (kind === 'parameters' ? _(/*i18n*/ { id: "{functionName} parameters", message: "{functionName} parameters" , values: { functionName: context.function }})
      : kind === 'captures' ? _(/*i18n*/ { id: "{functionName} captures", message: "{functionName} captures" , values: { functionName: context.function }})
      : context.id === step.execution.context.id ? _(/*i18n*/ { id: "{module} module", message: "{module} module" , values: { module: step.execution.module }}) : _(/*i18n*/ { id: "{functionName} locals", message: "{functionName} locals" , values: { functionName: context.function }}))
  return describeVariable(variable.name, variable, kind, step, previous, values, scope, undefined, context, _)
}

function describeVariable(name: string, variable: ExecutionVariable | undefined, kind: ExecutionVariableKind, step: SweepStep, previous: SweepStep, values: string[], scope: string, line: number | undefined, context: ExecutionContext, _: I18n['_']) {
  const { old, changed } = variableChange(variable, kind, step, previous, line, context, _)
  return {
    meaning: name === 'segments' && kind === 'parameters'
      ? context.function === 'sweep' ? _(/*i18n*/ { id: "Original input segments in original coordinates", message: "Original input segments in original coordinates" }) : _(/*i18n*/ { id: "Sweep-coordinate segments received by the current function", message: "Sweep-coordinate segments received by the current function" })
      : name === 'segments' && kind === 'captures' ? _(/*i18n*/ { id: "Sweep-coordinate segments captured by the current closure", message: "Sweep-coordinate segments captured by the current closure" })
      : meanings[name] ? _(meanings[name]) : undefined,
    type: variable?.type ?? _(/*i18n*/ { id: "Type not provided by the current scope", message: "Type not provided by the current scope" }),
    value: variableValue(variable, values, _),
    hasValue: hasVariableValue(variable),
    changed,
    previous: variableValue(old, values, _),
    previousHasValue: hasVariableValue(old),
    scope,
  }
}

export function variableChange(variable: ExecutionVariable | undefined, kind: ExecutionVariableKind, step: SweepStep, previous: SweepStep, line: number | undefined, context: ExecutionContext, _: I18n['_']) {
  const prior = [previous.execution.context, ...previous.execution.outer].find(frame => frame.id === context.id)
  const binding = prior?.[kind].find(item => item.name === variable?.name && item.scope === variable?.scope)
  const old = binding && line !== undefined && prior === previous.execution.context && previous.execution.module === step.execution.module ? scopedVariable(binding.name, previous, line, _) : binding
  return { old, changed: !!old && !!variable && (old.value !== variable.value || old.availability !== variable.availability) }
}

export function symbolKind(name: string, before: string, after: string) {
  if (['if', 'else', 'for', 'continue', 'return', 'break'].includes(name)) return 'control'
  if (functions[name] && (/^\s*\(/.test(after) || name === 'original')) return 'function'
  if (meanings[name] && !/(?:\.|::)\s*$/.test(before) && !/^\s*:/.test(after)) return 'variable'
  return null
}

export function controlDescription(keyword: string, control: ExecutionControl | undefined, _: I18n['_']) {
  if (!control) return _(/*i18n*/ { id: "Not executed in this step", message: "Not executed in this step" })
  switch (control.state) {
    case 'pending': return keyword === 'for' ? _(/*i18n*/ { id: "About to check the next iteration; no decision yet", message: "About to check the next iteration; no decision yet" }) : _(/*i18n*/ { id: "About to execute; no result yet", message: "About to execute; no result yet" })
    case 'true': return _(/*i18n*/ { id: "The condition is true; enter this branch", message: "The condition is true; enter this branch" })
    case 'false': return _(/*i18n*/ { id: "The condition is false; skip this branch", message: "The condition is false; skip this branch" })
    case 'entered': return keyword === 'for' ? _(/*i18n*/ { id: "An iteration element is available; enter the loop body", message: "An iteration element is available; enter the loop body" }) : _(/*i18n*/ { id: "Enter the else branch", message: "Enter the else branch" })
    case 'exhausted': return _(/*i18n*/ { id: "No next element; the loop has ended", message: "No next element; the loop has ended" })
    case 'skipped': return keyword === 'else' || keyword === 'if' ? _(/*i18n*/ { id: "This branch is skipped", message: "This branch is skipped" }) : _(/*i18n*/ { id: "This statement was not executed", message: "This statement was not executed" })
    case 'jumping': return keyword === 'continue' ? _(/*i18n*/ { id: "continue executed; move to the next iteration", message: "continue executed; move to the next iteration" }) : _(/*i18n*/ { id: "break executed; exit the loop", message: "break executed; exit the loop" })
    case 'returned': return _(/*i18n*/ { id: "return executed; the function has returned", message: "return executed; the function has returned" })
    case 'completed': return keyword === 'break' ? _(/*i18n*/ { id: "break executed; exit the loop", message: "break executed; exit the loop" }) : _(/*i18n*/ { id: "Execution completed in this step", message: "Execution completed in this step" })
  }
}
