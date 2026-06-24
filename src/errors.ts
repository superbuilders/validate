import * as errors from "@superbuilders/errors"

const DRAFT_07_SCHEMA_URL = "http://json-schema.org/draft-07/schema#"

const ErrValidation = errors.new("json schema validation")
const ErrSchemaCompilation = errors.new("json schema compilation")
const ErrUnsupportedSchemaTarget = errors.new("unsupported json schema target")
const ErrUnsupportedSchemaDialect = errors.new("unsupported json schema dialect")

export {
	DRAFT_07_SCHEMA_URL,
	ErrSchemaCompilation,
	ErrUnsupportedSchemaDialect,
	ErrUnsupportedSchemaTarget,
	ErrValidation
}
