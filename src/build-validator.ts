import type { StandardJSONSchemaV1, StandardSchemaV1 } from "@standard-schema/spec"
import * as errors from "@superbuilders/errors"

import { ajv } from "#ajv-instance.ts"
import { assertDraft07Target, draft07Schema } from "#draft07.ts"
import { ErrSchemaCompilation, ErrValidation } from "#errors.ts"
import { formatIssues, issues, validationIssues } from "#issue-format.ts"
import type { JsonSchema } from "#types/json-schema.ts"
import type { ValidationResult, Validator } from "#types/validation-result.ts"

/** Generic core: `ajv.compile<TOutput>` yields a type GUARD, so
 * `compiled(value)` narrows `value` to `TOutput` and every result below
 * is typed without a single cast. The public `compile` overloads choose
 * `TOutput`; the implementation never widens to `unknown`. */
function buildValidator<TOutput>(schemaSource: JsonSchema): Validator<TOutput> {
	const compiledResult = errors.trySync(function compileSchema() {
		return ajv.compile<TOutput>(schemaSource)
	})
	if (compiledResult.error) {
		throw errors.wrap(ErrSchemaCompilation, compiledResult.error.message)
	}
	const compiled = compiledResult.data

	function parse(value: unknown): ValidationResult<TOutput> {
		if (compiled(value)) {
			return { success: true, data: value }
		}
		const validationErrors = validationIssues(
			compiled.errors === null ? undefined : compiled.errors
		)
		return {
			success: false,
			error: errors.wrap(ErrValidation, formatIssues(validationErrors)),
			issues: validationErrors
		}
	}

	return {
		parse,
		"~standard": {
			version: 1,
			vendor: "@superbuilders/validate",
			validate(value: unknown): StandardSchemaV1.Result<TOutput> {
				const result = parse(value)
				if (result.success) {
					return { value: result.data }
				}
				return { issues: issues(result.issues) }
			},
			jsonSchema: {
				input(options: StandardJSONSchemaV1.Options): Record<string, unknown> {
					assertDraft07Target(options)
					return draft07Schema(schemaSource)
				},
				output(options: StandardJSONSchemaV1.Options): Record<string, unknown> {
					assertDraft07Target(options)
					return draft07Schema(schemaSource)
				}
			}
		}
	}
}

export { buildValidator }
