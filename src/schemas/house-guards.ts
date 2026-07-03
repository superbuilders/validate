import type { JSONSchema as UpstreamJsonSchema } from "json-schema-to-ts"

import type {
	ArrayKeyword,
	JsonSchemaArray,
	NumberKeyword,
	ObjectKeyword,
	SchemaNodeKeys,
	StringKeyword
} from "#schemas/schema-keywords.ts"

type RequireType<T> = T extends { type: unknown } ? T : T & { type: never }
type RequireSpecificType<T, U extends string> = T extends { type: U } ? T : T & { type: never }
type RequireNumberType<T> = T extends { type: "number" | "integer" } ? T : T & { type: never }

type NoUnknownSchemaKeywords<T> =
	Exclude<keyof T, SchemaNodeKeys> extends never
		? T
		: T & Record<Exclude<keyof T, SchemaNodeKeys>, never>

type NoInlineTypeUnion<T> = T extends { type: readonly unknown[] } ? T & { type: never } : T
type NoDefaultKeyword<T> = T extends { default: unknown } ? T & { default: never } : T
type NoPatternProperties<T> = T extends { patternProperties: unknown }
	? T & { patternProperties: never }
	: T

type NoAdditionalItems<T> = T extends { additionalItems: unknown }
	? T & { additionalItems: never }
	: T
type NoTupleItems<T> = T extends { items: readonly unknown[] } ? T & { items: never } : T
type NoFormatKeyword<T> = T extends { format: unknown } ? T & { format: never } : T

type RequireTypeForConst<T> = T extends { const: unknown } ? RequireType<T> : T
type RequireTypeForEnum<T> = T extends { enum: unknown } ? RequireType<T> : T

type RequireTypeForKeywords<T, Keys extends string, U extends string> =
	Extract<keyof T, Keys> extends never ? T : RequireSpecificType<T, U>

type RequireNumberTypeForKeywords<T> =
	Extract<keyof T, NumberKeyword> extends never ? T : RequireNumberType<T>

type RequiredKeys<T> = T extends { required: readonly (infer R)[] } ? R : never
type PropertyKeys<T> = T extends { properties: infer P } ? keyof P : never
type ValidateRequiredKeys<T> = T extends { required: readonly unknown[] }
	? T extends { properties: Record<string, unknown> }
		? Exclude<RequiredKeys<T>, PropertyKeys<T>> extends never
			? T
			: T & { required: never }
		: T & { properties: never }
	: T

type ValidatePropertyMap<T> =
	T extends Record<string, unknown> ? { readonly [K in keyof T]: ValidateHouseJsonSchema<T[K]> } : T

type ValidateSchemaArray<T> = T extends readonly unknown[]
	? { readonly [K in keyof T]: ValidateHouseJsonSchema<T[K]> }
	: T

type ValidateHouseObject<T> = NoUnknownSchemaKeywords<T> &
	NoInlineTypeUnion<T> &
	NoDefaultKeyword<T> &
	NoPatternProperties<T> &
	NoAdditionalItems<T> &
	NoTupleItems<T> &
	NoFormatKeyword<T> &
	RequireTypeForConst<T> &
	RequireTypeForEnum<T> &
	RequireTypeForKeywords<T, StringKeyword, "string"> &
	RequireNumberTypeForKeywords<T> &
	RequireTypeForKeywords<T, ArrayKeyword, "array"> &
	RequireTypeForKeywords<T, ObjectKeyword, "object"> &
	ValidateRequiredKeys<T> & {
		readonly [K in keyof T]: K extends "properties"
			? ValidatePropertyMap<T[K]>
			: K extends
						| "items"
						| "additionalProperties"
						| "propertyNames"
						| "contains"
						| "not"
						| "if"
						| "then"
						| "else"
				? ValidateHouseJsonSchema<T[K]>
				: K extends "oneOf" | "anyOf" | "allOf"
					? ValidateSchemaArray<T[K]>
					: K extends "$defs" | "definitions"
						? ValidatePropertyMap<T[K]>
						: T[K]
	}

type ValidateHouseJsonSchema<T> = [UpstreamJsonSchema] extends [T]
	? T
	: [T] extends [UpstreamJsonSchema]
		? T extends string | number | boolean | null | undefined
			? T
			: T extends JsonSchemaArray<unknown>
				? { readonly [K in keyof T]: ValidateHouseJsonSchema<T[K]> }
				: T extends object
					? ValidateHouseObject<T>
					: T
		: T

export type { ValidateHouseJsonSchema }
