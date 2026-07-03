import type { JSONSchema as UpstreamJsonSchema } from "json-schema-to-ts"

import type {
	ArrayKeyword,
	JsonSchemaArray,
	NumberKeyword,
	ObjectKeyword,
	SchemaNodeKeys,
	StringKeyword
} from "#schemas/schema-keywords.ts"
import type { IsWideSchema } from "#schemas/wide.ts"

/**
 * Every guard in this file asserts rather than transforms: a clean node
 * yields `unknown` (so `TSchema & Guard<TSchema>` collapses to `TSchema` at
 * zero normalization cost), and a violation yields only the small poison
 * object naming the offending key. Identity-mapping the whole schema tree
 * through each guard and intersecting the results — the previous design —
 * forces the compiler to normalize three deep mapped types against every
 * fresh literal and dies with ts2590.
 */
type NoUnknownSchemaKeywords<T> =
	Exclude<keyof T, SchemaNodeKeys> extends never ? unknown : Record<Exclude<keyof T, SchemaNodeKeys>, never>

type NoInlineTypeUnion<T> = T extends { type: readonly unknown[] } ? { type: never } : unknown
type NoTupleItems<T> = T extends { items: readonly unknown[] } ? { items: never } : unknown

/**
 * Object schemas must declare `additionalProperties` explicitly, and only
 * the boolean form is admitted: json-schema-to-ts corrupts the inferred type
 * when a schema-form `additionalProperties` coexists with `properties`, and
 * an implicit (absent) `additionalProperties` silently means "open" — the
 * house law demands the openness decision be visible at the boundary.
 */
type RequireAdditionalProperties<T> = T extends { type: "object" }
	? T extends { additionalProperties: unknown }
		? unknown
		: { additionalProperties: boolean }
	: unknown
type BooleanAdditionalProperties<T> = T extends { additionalProperties: infer AP }
	? AP extends boolean
		? unknown
		: { additionalProperties: boolean }
	: unknown

type RequireTypeForConst<T> = T extends { const: unknown }
	? T extends { type: unknown }
		? unknown
		: { type: never }
	: unknown
type RequireTypeForEnum<T> = T extends { enum: unknown }
	? T extends { type: unknown }
		? unknown
		: { type: never }
	: unknown

type RequireTypeForKeywords<T, Keys extends string, U extends string> =
	Extract<keyof T, Keys> extends never ? unknown : T extends { type: U } ? unknown : { type: U }

type RequiredKeys<T> = T extends { required: readonly (infer R)[] } ? R : never
type PropertyKeys<T> = T extends { properties: infer P } ? keyof P : never
type ValidateRequiredKeys<T> = T extends { required: readonly unknown[] }
	? T extends { properties: Record<string, unknown> }
		? Exclude<RequiredKeys<T>, PropertyKeys<T>> extends never
			? unknown
			: { required: readonly PropertyKeys<T>[] }
		: { properties: never }
	: unknown

type ValidatePropertyMap<T> =
	T extends Record<string, unknown> ? { readonly [K in keyof T]: ValidateHouseJsonSchema<T[K]> } : unknown

type ValidateSchemaArray<T> = T extends readonly unknown[]
	? { readonly [K in keyof T]: ValidateHouseJsonSchema<T[K]> }
	: unknown

type ValidateChildren<T> = {
	readonly [K in keyof T]: K extends "properties" | "definitions"
		? ValidatePropertyMap<T[K]>
		: K extends "items" | "propertyNames" | "contains" | "not" | "if" | "then" | "else"
			? ValidateHouseJsonSchema<T[K]>
			: K extends "oneOf" | "anyOf" | "allOf"
				? ValidateSchemaArray<T[K]>
				: unknown
}

type ValidateHouseObject<T> = NoUnknownSchemaKeywords<T> &
	NoInlineTypeUnion<T> &
	NoTupleItems<T> &
	RequireAdditionalProperties<T> &
	BooleanAdditionalProperties<T> &
	RequireTypeForConst<T> &
	RequireTypeForEnum<T> &
	RequireTypeForKeywords<T, StringKeyword, "string"> &
	RequireTypeForKeywords<T, NumberKeyword, "number" | "integer"> &
	RequireTypeForKeywords<T, ArrayKeyword, "array"> &
	RequireTypeForKeywords<T, ObjectKeyword, "object"> &
	ValidateRequiredKeys<T> &
	ValidateChildren<T>

type ValidateHouseJsonSchema<T> =
	IsWideSchema<T> extends true
		? unknown
		: [T] extends [UpstreamJsonSchema]
			? T extends string | number | boolean | null | undefined
				? unknown
				: T extends JsonSchemaArray<unknown>
					? { readonly [K in keyof T]: ValidateHouseJsonSchema<T[K]> }
					: T extends object
						? ValidateHouseObject<T>
						: unknown
			: unknown

export type { ValidateHouseJsonSchema }
