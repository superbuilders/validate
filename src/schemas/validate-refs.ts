import type { JsonSchemaArray } from "#schemas/schema-keywords.ts"
import type { IsWideSchema } from "#schemas/wide.ts"

/**
 * Compile-time mirror of the walker's $ref discipline: a `$ref` must be
 * `"#/definitions/<name>"` for a name that actually exists in the root
 * `definitions`, and must be the only keyword in its node — except at the
 * root, where `definitions` and `$schema` may accompany it (the classic
 * draft-07 recursive-document idiom). Assert-style: a clean node yields
 * `unknown`; an invalid ref poisons `$ref` with the set of refs the schema
 * actually admits, so the editor error names the fix.
 */
type KnownRefs<Root> = Root extends { definitions: infer D } ? `#/definitions/${Extract<keyof D, string>}` : never

type ValidateRefValue<R, Refs extends string> = R extends Refs ? unknown : { $ref: Refs }

type NoRefSiblings<T, Allowed extends string> =
	Exclude<keyof T, Allowed> extends never ? unknown : Record<Exclude<keyof T, Allowed>, never>

type ValidateRefsNode<T, Refs extends string> = T extends string | number | boolean | null | undefined
	? unknown
	: T extends JsonSchemaArray<unknown>
		? { readonly [K in keyof T]: ValidateRefsNode<T[K], Refs> }
		: T extends { $ref: infer R }
			? ValidateRefValue<R, Refs> & NoRefSiblings<T, "$ref">
			: T extends object
				? { readonly [K in keyof T]: ValidateRefsNode<T[K], Refs> }
				: unknown

type ValidateRefsMap<T, Refs extends string> =
	T extends Record<string, unknown> ? { readonly [K in keyof T]: ValidateRefsNode<T[K], Refs> } : unknown

type ValidateRootNode<T, Refs extends string> = T extends { $ref: infer R }
	? ValidateRefValue<R, Refs> &
			NoRefSiblings<T, "$ref" | "definitions" | "$schema"> & {
				readonly [K in keyof T]: K extends "definitions" ? ValidateRefsMap<T[K], Refs> : unknown
			}
	: ValidateRefsNode<T, Refs>

type ValidateSchemaRefs<TSchema> =
	IsWideSchema<TSchema> extends true ? unknown : ValidateRootNode<TSchema, KnownRefs<TSchema>>

export type { ValidateSchemaRefs }
