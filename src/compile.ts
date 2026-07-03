import type { JSONSchema as UpstreamJsonSchema } from "json-schema-to-ts"

import { buildValidator } from "#build-validator.ts"
import { assertDraft07SchemaDialect } from "#draft07.ts"
import { assertHouseSchema } from "#house-walker.ts"
import type { ValidateHouseJsonSchema } from "#schemas/house-guards.ts"
import type { InferDraft07 } from "#schemas/infer-draft07.ts"
import type { ValidateRegexPatterns } from "#schemas/regex-patterns.ts"
import type { ValidateSchemaRefs } from "#schemas/validate-refs.ts"
import type { IsWideSchema } from "#schemas/wide.ts"
import type { JsonSchema } from "#types/json-schema.ts"
import type { Validator } from "#types/validation-result.ts"

/**
 * The only constructor of validators. A literal schema gets the full
 * compile-time treatment — house-law guards, regex-pattern validation, $ref
 * resolution checks, and type inference (recursion included, cut to
 * `unknown` at cycle re-entry).
 *
 * The second overload exists for schemas only known as the wide `JsonSchema`
 * (dynamically assembled) and admits nothing else: its parameter collapses
 * to `never` unless `JsonSchema` itself is assignable to the argument's
 * type. A literal schema that fails the first overload's guards therefore
 * cannot silently launder through it as Validator<unknown> — the call errors
 * with the guard's poison visible. Either way the runtime path is identical:
 * the house walker enforces every rule the types express — plus the ones
 * they cannot, like key order and discriminated-union shape — then
 * max-strict ajv compiles the schema.
 */
function compile<const TSchema extends UpstreamJsonSchema>(
	schemaSource: TSchema &
		NoInfer<ValidateRegexPatterns<TSchema> & ValidateHouseJsonSchema<TSchema> & ValidateSchemaRefs<TSchema>>
): Validator<IsWideSchema<TSchema> extends true ? unknown : InferDraft07<TSchema>>
function compile<TSchema extends UpstreamJsonSchema>(
	schemaSource: TSchema & (IsWideSchema<TSchema> extends true ? unknown : never)
): Validator<unknown>
function compile(schemaSource: JsonSchema): Validator<unknown> {
	assertDraft07SchemaDialect(schemaSource)
	assertHouseSchema(schemaSource)
	return buildValidator(schemaSource)
}

export { compile }
