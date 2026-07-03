/**
 * The complete allowed keyword vocabulary. Anything outside this list is a
 * house-rule violation — both at the type level (NoUnknownSchemaKeywords) and
 * at runtime (the house walker). Deliberately absent: `$id` (mutates the ref
 * base URI and pollutes the shared ajv registry), `$defs` (draft-2020 spelling;
 * the house dialect is draft-07 `definitions`), `nullable` (OpenAPI dialect,
 * not JSON Schema), `format` (no formats are registered; use `pattern`),
 * `default` (silently flips a property to required in type inference),
 * `patternProperties`, `additionalItems`, `dependencies`.
 */
type SchemaNodeKeys =
	| "$schema"
	| "$ref"
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

const SCHEMA_NODE_KEYS: ReadonlySet<string> = new Set([
	"$schema",
	"$ref",
	"$comment",
	"definitions",
	"title",
	"description",
	"type",
	"const",
	"enum",
	"properties",
	"required",
	"additionalProperties",
	"propertyNames",
	"minProperties",
	"maxProperties",
	"items",
	"minItems",
	"maxItems",
	"uniqueItems",
	"contains",
	"oneOf",
	"anyOf",
	"allOf",
	"not",
	"if",
	"then",
	"else",
	"minimum",
	"maximum",
	"exclusiveMinimum",
	"exclusiveMaximum",
	"multipleOf",
	"minLength",
	"maxLength",
	"pattern",
	"readOnly",
	"writeOnly",
	"examples",
	"contentEncoding",
	"contentMediaType"
])

const STRING_KEYWORDS: ReadonlySet<string> = new Set(["minLength", "maxLength", "pattern"])
const NUMBER_KEYWORDS: ReadonlySet<string> = new Set([
	"minimum",
	"maximum",
	"exclusiveMinimum",
	"exclusiveMaximum",
	"multipleOf"
])
const ARRAY_KEYWORDS: ReadonlySet<string> = new Set(["items", "minItems", "maxItems", "uniqueItems", "contains"])
const OBJECT_KEYWORDS: ReadonlySet<string> = new Set([
	"properties",
	"required",
	"additionalProperties",
	"propertyNames",
	"minProperties",
	"maxProperties"
])

export type { ArrayKeyword, JsonSchemaArray, NumberKeyword, ObjectKeyword, SchemaNodeKeys, StringKeyword }
export { ARRAY_KEYWORDS, NUMBER_KEYWORDS, OBJECT_KEYWORDS, SCHEMA_NODE_KEYS, STRING_KEYWORDS }
