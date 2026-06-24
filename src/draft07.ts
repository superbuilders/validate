import type { StandardJSONSchemaV1 } from "@standard-schema/spec"

import {
	DRAFT_07_SCHEMA_URL,
	ErrUnsupportedSchemaDialect,
	ErrUnsupportedSchemaTarget
} from "@superbuilders/validate/errors"
import type { JsonSchema } from "@superbuilders/validate/types/json-schema"

function assertDraft07SchemaDialect(schemaSource: JsonSchema): void {
	if (typeof schemaSource === "boolean") {
		return
	}
	if (schemaSource.$schema !== undefined && schemaSource.$schema !== DRAFT_07_SCHEMA_URL) {
		throw ErrUnsupportedSchemaDialect
	}
}

function draft07Schema(schemaSource: JsonSchema): Record<string, unknown> {
	if (schemaSource === true) {
		return { $schema: DRAFT_07_SCHEMA_URL }
	}
	if (schemaSource === false) {
		return { $schema: DRAFT_07_SCHEMA_URL, not: {} }
	}

	return { $schema: DRAFT_07_SCHEMA_URL, ...structuredClone(schemaSource) }
}

function assertDraft07Target(options: StandardJSONSchemaV1.Options): void {
	if (options.target !== "draft-07") {
		throw ErrUnsupportedSchemaTarget
	}
}

export { assertDraft07SchemaDialect, assertDraft07Target, draft07Schema }
