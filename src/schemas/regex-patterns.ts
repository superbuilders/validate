import type * as arkregex from "arkregex"

import type { HasBoundedQuantifier } from "#schemas/bounded-quantifier.ts"
import type { JsonSchemaArray } from "#schemas/schema-keywords.ts"
import type { IsWideSchema } from "#schemas/wide.ts"

/**
 * Validates every `pattern` in the schema against arkregex's type-level
 * regex parser, in the `u` dialect ajv compiles with. Assert-style: a clean
 * node yields `unknown`; a syntactically invalid pattern yields a poison
 * whose expected type is arkregex's error message. Patterns containing
 * bounded quantifiers skip the parser entirely (see HasBoundedQuantifier),
 * and wide (non-literal) schemas pass untouched — runtime ajv still rejects
 * bad patterns at compile().
 */
type ValidatePattern<Pattern extends string> =
	HasBoundedQuantifier<Pattern> extends true
		? unknown
		: arkregex.regex.validate<Pattern, "u"> extends Pattern
			? unknown
			: { pattern: arkregex.regex.validate<Pattern, "u"> }

type ValidateRegexPatterns<T> =
	IsWideSchema<T> extends true
		? unknown
		: T extends string | number | boolean | null | undefined
			? unknown
			: T extends JsonSchemaArray<unknown>
				? { readonly [K in keyof T]: ValidateRegexPatterns<T[K]> }
				: T extends { pattern: infer Pattern extends string }
					? ValidatePattern<Pattern> & {
							readonly [K in keyof T]: K extends "pattern" ? unknown : ValidateRegexPatterns<T[K]>
						}
					: T extends object
						? { readonly [K in keyof T]: ValidateRegexPatterns<T[K]> }
						: unknown

export type { ValidateRegexPatterns }
