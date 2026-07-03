type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"

/**
 * arkregex's type-level machinery is depth-bound, and bounded quantifiers
 * are its worst case twice over: inference expands them combinatorially
 * (`[0-9a-f]{8}` alone is 16^8 template branches) and even the syntax
 * parser's recursion dies on the long patterns they produce. Any pattern
 * containing `{<digit>` — a bounded repetition opener; unicode escapes like
 * `\p{L}` are unaffected — deterministically opts out of all type-level
 * treatment: no template-literal refinement (the base inference, usually
 * `string`, stands) and no compile-time syntax validation. Runtime ajv
 * still compiles and enforces the pattern in full.
 */
type HasBoundedQuantifier<Pattern extends string> = Pattern extends `${string}{${Digit}${string}` ? true : false

export type { HasBoundedQuantifier }
