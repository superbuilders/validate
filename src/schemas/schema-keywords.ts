type SchemaNodeKeys =
	| "$schema"
	| "$id"
	| "$ref"
	| "$defs"
	| "$comment"
	| "definitions"
	| "title"
	| "description"
	| "type"
	| "const"
	| "enum"
	| "properties"
	| "required"
	| "additionalProperties"
	| "propertyNames"
	| "minProperties"
	| "maxProperties"
	| "items"
	| "minItems"
	| "maxItems"
	| "uniqueItems"
	| "contains"
	| "oneOf"
	| "anyOf"
	| "allOf"
	| "not"
	| "if"
	| "then"
	| "else"
	| "minimum"
	| "maximum"
	| "exclusiveMinimum"
	| "exclusiveMaximum"
	| "multipleOf"
	| "minLength"
	| "maxLength"
	| "pattern"
	| "nullable"
	| "readOnly"
	| "writeOnly"
	| "examples"
	| "contentEncoding"
	| "contentMediaType"

type StringKeyword = "minLength" | "maxLength" | "pattern"
type NumberKeyword = "minimum" | "maximum" | "exclusiveMinimum" | "exclusiveMaximum" | "multipleOf"
type ArrayKeyword = "items" | "minItems" | "maxItems" | "uniqueItems" | "contains"
type ObjectKeyword =
	| "properties"
	| "required"
	| "additionalProperties"
	| "propertyNames"
	| "minProperties"
	| "maxProperties"

type JsonSchemaArray<T> = readonly T[]

export type {
	ArrayKeyword,
	JsonSchemaArray,
	NumberKeyword,
	ObjectKeyword,
	SchemaNodeKeys,
	StringKeyword
}
