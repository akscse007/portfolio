/**
 * A small, safe expression parser for the function plotter.
 * Grammar (precedence low → high):
 *   expr   := term (('+' | '-') term)*
 *   term   := unary (('*' | '/') unary | <implicit multiplication>)*
 *   unary  := ('+' | '-') unary | power
 *   power  := primary ('^' unary)?            (right-associative)
 *   primary:= number | variable | constant | fn '(' expr ')' | '(' expr ')' | '|' expr '|'
 * No eval / Function; only whitelisted functions and the variable `x` are allowed.
 */

export type Node =
  | { t: 'num'; v: number }
  | { t: 'var' }
  | { t: 'neg'; a: Node }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node }
  | { t: 'fn'; name: FnName; a: Node };

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  sign: Math.sign,
  sigmoid: (z: number) => 1 / (1 + Math.exp(-z)),
  relu: (z: number) => Math.max(0, z),
} as const;
export type FnName = keyof typeof FUNCTIONS;
export const ALLOWED_FUNCTIONS = Object.keys(FUNCTIONS) as FnName[];

const CONSTANTS: Record<string, number> = Object.assign(Object.create(null), {
  pi: Math.PI,
  e: Math.E,
  tau: 2 * Math.PI,
});

export class ParseError extends Error {
  constructor(
    message: string,
    public position: number,
  ) {
    super(message);
  }
}

type Token =
  | { k: 'num'; v: number; p: number }
  | { k: 'id'; v: string; p: number }
  | { k: 'op'; v: string; p: number }
  | { k: 'end'; p: number };

const MAX_LENGTH = 160;
const MAX_DEPTH = 40;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = src.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
      if (!m) throw new ParseError(`Invalid number at ${i + 1}`, i);
      tokens.push({ k: 'num', v: Number(m[0]), p: i });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Zπ]/.test(c)) {
      const m = src.slice(i).match(/^(?:π|[a-zA-Z]+)/)!;
      tokens.push({ k: 'id', v: m[0] === 'π' ? 'pi' : m[0].toLowerCase(), p: i });
      i += m[0].length;
      continue;
    }
    if ('+-*/^()|'.includes(c)) {
      tokens.push({ k: 'op', v: c, p: i });
      i++;
      continue;
    }
    if (c === '×' || c === '·') {
      tokens.push({ k: 'op', v: '*', p: i });
      i++;
      continue;
    }
    throw new ParseError(`Unexpected character “${c}” at ${i + 1}`, i);
  }
  tokens.push({ k: 'end', p: src.length });
  return tokens;
}

export function parseExpression(src: string): Node {
  if (src.length > MAX_LENGTH)
    throw new ParseError(`Expression is longer than ${MAX_LENGTH} characters`, 0);
  if (!src.trim()) throw new ParseError('Expression is empty', 0);
  const tokens = tokenize(src);
  let pos = 0;
  let depth = 0;
  const peek = () => tokens[pos]!;
  const next = () => tokens[pos++]!;
  const isOp = (v: string) => {
    const t = peek();
    return t.k === 'op' && t.v === v;
  };
  const expect = (v: string) => {
    const t = next();
    if (t.k !== 'op' || t.v !== v) throw new ParseError(`Expected “${v}” at ${t.p + 1}`, t.p);
  };
  const enter = () => {
    if (++depth > MAX_DEPTH) throw new ParseError('Expression is nested too deeply', peek().p);
  };

  function expr(): Node {
    enter();
    let node = term();
    while (isOp('+') || isOp('-')) {
      const op = (next() as { v: '+' | '-' }).v;
      node = { t: 'bin', op, a: node, b: term() };
    }
    depth--;
    return node;
  }

  function startsPrimary(t: Token) {
    return t.k === 'num' || t.k === 'id' || (t.k === 'op' && t.v === '(');
  }

  function term(): Node {
    let node = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) {
        const op = (next() as { v: '*' | '/' }).v;
        node = { t: 'bin', op, a: node, b: unary() };
      } else if (startsPrimary(peek())) {
        node = { t: 'bin', op: '*', a: node, b: power() };
      } else break;
    }
    return node;
  }

  function unary(): Node {
    if (isOp('-')) {
      next();
      return { t: 'neg', a: unary() };
    }
    if (isOp('+')) {
      next();
      return unary();
    }
    return power();
  }

  function power(): Node {
    const base = primary();
    if (isOp('^')) {
      next();
      enter();
      const exp = unary();
      depth--;
      return { t: 'bin', op: '^', a: base, b: exp };
    }
    return base;
  }

  function primary(): Node {
    const t = next();
    if (t.k === 'num') {
      if (!Number.isFinite(t.v)) throw new ParseError('Number out of range', t.p);
      return { t: 'num', v: t.v };
    }
    if (t.k === 'id') {
      if (t.v === 'x') return { t: 'var' };
      // Own-property check: `in` would also match prototype members such as "constructor".
      if (Object.hasOwn(CONSTANTS, t.v)) return { t: 'num', v: CONSTANTS[t.v]! };
      if ((ALLOWED_FUNCTIONS as string[]).includes(t.v)) {
        expect('(');
        const arg = expr();
        expect(')');
        return { t: 'fn', name: t.v as FnName, a: arg };
      }
      throw new ParseError(
        `Unknown name “${t.v}”. Use x, pi, e or: ${ALLOWED_FUNCTIONS.join(', ')}`,
        t.p,
      );
    }
    if (t.k === 'op' && t.v === '(') {
      const inner = expr();
      expect(')');
      return inner;
    }
    if (t.k === 'op' && t.v === '|') {
      const inner = expr();
      expect('|');
      return { t: 'fn', name: 'abs', a: inner };
    }
    if (t.k === 'end') throw new ParseError('Unexpected end of expression', t.p);
    throw new ParseError(`Unexpected “${t.v}” at ${t.p + 1}`, t.p);
  }

  const tree = expr();
  if (peek().k !== 'end') {
    const t = peek();
    throw new ParseError(`Unexpected “${'v' in t ? t.v : ''}” at ${t.p + 1}`, t.p);
  }
  return tree;
}

export function evaluate(node: Node, x: number): number {
  switch (node.t) {
    case 'num':
      return node.v;
    case 'var':
      return x;
    case 'neg':
      return -evaluate(node.a, x);
    case 'fn':
      return FUNCTIONS[node.name](evaluate(node.a, x));
    case 'bin': {
      const a = evaluate(node.a, x);
      const b = evaluate(node.b, x);
      switch (node.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return a / b;
        case '^':
          return Math.pow(a, b);
      }
    }
  }
}

/** Compiles to a fast closure (still no dynamic code generation). */
export function compile(src: string): (x: number) => number {
  const tree = parseExpression(src);
  return (x: number) => evaluate(tree, x);
}
