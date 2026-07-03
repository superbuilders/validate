import type { JSONSchema as UpstreamJsonSchema } from "json-schema-to-ts"

/**
 * Detects schemas typed as the wide `JsonSchema` rather than a literal:
 * either the full union or its object member (what a `const x: JsonSchema =
 * {...}` narrows to). Guards pass wide schemas through untouched and
 * inference yields `unknown` — running literal machinery (FromSchema, the
 * house guards' mapped types) over the entire JSONSchema7 surface produces
 * unions too complex to represent.
 */
type IsWideSchema<T> = [UpstreamJsonSchema] extends [T]
	? true
	: [Extract<UpstreamJsonSchema, object>] extends [T]
		? true
		: false

export type { IsWideSchema }
