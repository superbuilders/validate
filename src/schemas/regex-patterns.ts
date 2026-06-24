import type * as arkregex from "arkregex"

import type { JsonSchemaArray } from "@superbuilders/validate/schemas/schema-keywords"

type ValidateRegexPatterns<T> = T extends string | number | boolean | null | undefined
	? T
	: T extends JsonSchemaArray<unknown>
		? { readonly [K in keyof T]: ValidateRegexPatterns<T[K]> }
		: T extends { pattern: infer Pattern extends string }
			? Omit<{ readonly [K in keyof T]: ValidateRegexPatterns<T[K]> }, "pattern"> & {
					readonly pattern: arkregex.regex.validate<Pattern, "u">
				}
			: T extends object
				? { readonly [K in keyof T]: ValidateRegexPatterns<T[K]> }
				: T

export type { ValidateRegexPatterns }
