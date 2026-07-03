import type { JSONSchema as UpstreamJsonSchema } from "json-schema-to-ts"

import { buildValidator } from "#build-validator.ts"
import { assertDraft07SchemaDialect } from "#draft07.ts"
import type { ValidateHouseJsonSchema } from "#schemas/house-guards.ts"
import type { InferDraft07 } from "#schemas/infer-draft07.ts"
import type { ValidateRegexPatterns } from "#schemas/regex-patterns.ts"
import type { JsonSchema } from "#types/json-schema.ts"
import type { Validator } from "#types/validation-result.ts"

function compile<const TSchema extends UpstreamJsonSchema>(
	schemaSource: TSchema &
		ValidateRegexPatterns<TSchema> &
		ValidateHouseJsonSchema<TSchema> &
		JsonSchema
): Validator<UpstreamJsonSchema extends TSchema ? unknown : InferDraft07<TSchema>>
function compile(schemaSource: JsonSchema): Validator<unknown>
function compile(schemaSource: JsonSchema): Validator<unknown> {
	assertDraft07SchemaDialect(schemaSource)
	return buildValidator(schemaSource)
}

export { compile }
