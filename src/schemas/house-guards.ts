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

/**
 * The only inline type array admitted is the nullable pair `[T, "null"]` —
 * the draft-07 convention primer's law (and OpenAI-style constrained
 * decoding) uses for nullable properties. Every other union spells itself
 * as anyOf of single-type schemas.
 */
type NoInlineTypeUnion<T> = T extends { type: readonly unknown[] }
	? T extends { type: readonly [infer S, "null"] }
		? S extends "null"
			? { type: never }
			: S extends string
				? unknown
				: { type: never }
		: { type: never }
	: unknown
type NoTupleItems<T> = T extends { items: readonly unknown[] } ? { items: never } : unknown

/**
 * Object schemas must declare `additionalProperties` explicitly — an implicit
 * (absent) `additionalProperties` silently means "open", and the house law
 * demands the openness decision be visible at the boundary. The value is
 * boolean, with one exception: a node with no `properties` may use the
 * schema form (`additionalProperties: <schema>`) as a typed map, which
 * json-schema-to-ts infers soundly as `Record<string, T>`. The schema form
 * next to `properties` stays banned — that combination corrupts the
 * inferred type.
 */
type RequireAdditionalProperties<T> = T extends { type: "object" } | { type: readonly ["object", "null"] }
	? T extends { additionalProperties: unknown }
		? unknown
		: { additionalProperties: boolean }
	: unknown
type BooleanAdditionalProperties<T> = T extends { additionalProperties: infer AP }
	? AP extends boolean
		? unknown
		: T extends { properties: unknown }
			? { additionalProperties: boolean }
			: unknown
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
	Extract<keyof T, Keys> extends never
		? unknown
		: T extends { type: U } | { type: readonly [U, "null"] }
			? unknown
			: { type: U }

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
				: K extends "additionalProperties"
					? T[K] extends boolean
						? unknown
						: ValidateHouseJsonSchema<T[K]>
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
