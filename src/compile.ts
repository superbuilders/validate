import type { JSONSchema as UpstreamJsonSchema } from "json-schema-to-ts"

import { buildValidator } from "@superbuilders/validate/build-validator"
import { assertDraft07SchemaDialect } from "@superbuilders/validate/draft07"
import type { ValidateHouseJsonSchema } from "@superbuilders/validate/schemas/house-guards"
import type { InferDraft07 } from "@superbuilders/validate/schemas/infer-draft07"
import type { ValidateRegexPatterns } from "@superbuilders/validate/schemas/regex-patterns"
import type { JsonSchema } from "@superbuilders/validate/types/json-schema"
import type { Validator } from "@superbuilders/validate/types/validation-result"

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
