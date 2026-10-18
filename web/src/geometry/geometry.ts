export interface Rational { numerator: string; denominator: string }
export interface Point { x: Rational; y: Rational }
export function rational(value: string): Rational {
  const [numerator, denominator = '1'] = value.split('/')
  return { numerator, denominator }
}

export function point(x: string, y: string): Point {
  return { x: rational(x), y: rational(y) }
}

export const formatRational = (value: Rational) => value.denominator === '1'
  ? value.numerator : `${value.numerator}/${value.denominator}`
export const formatPoint = (p: Point) => `(${formatRational(p.x)}, ${formatRational(p.y)})`

// Only the drawing uses approximate coordinates. HTTP and details keep strings.
export function approximate(value: Rational): number {
  const n = BigInt(value.numerator)
  const d = BigInt(value.denominator)
  const whole = n / d
  const fraction = (n % d) * 1_000_000_000_000n / d
  return Number(whole) + Number(fraction) / 1_000_000_000_000
}

export function samePoint(a: Point, b: Point): boolean {
  return ['x', 'y'].every(axis => {
    const av = a[axis as keyof Point], bv = b[axis as keyof Point]
    return BigInt(av.numerator) * BigInt(bv.denominator) === BigInt(bv.numerator) * BigInt(av.denominator)
  })
}
