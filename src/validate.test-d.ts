import type { Infer, JsonSchema } from "#validate.ts"
import { compile } from "#validate.ts"

/**
 * Typecheck-only probes: this file is part of `tsc --noEmit` but excluded
 * from the build and never executed. Every `Assert<Equal<...>>` pins an
 * inference contract; every `@ts-expect-error` pins a house guard.
 */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
type Assert<T extends true> = T

const wide: JsonSchema = { type: "string" }
const wideValidator = compile(wide)
type _wideIsUnknown = Assert<Equal<Infer<typeof wideValidator>, unknown>>

const user = compile({
	type: "object",
	additionalProperties: false,
	required: ["id"],
	properties: {
		id: { type: "string" },
		age: { type: "number" }
	}
})
type _userShape = Assert<Equal<Infer<typeof user>, { id: string; age?: number }>>

const tree = compile({
	type: "object",
	additionalProperties: false,
	required: ["value", "children"],
	properties: {
		value: { type: "number" },
		children: { type: "array", items: { $ref: "#/definitions/node" } }
	},
	definitions: {
		node: {
			type: "object",
			additionalProperties: false,
			required: ["value", "children"],
			properties: {
				value: { type: "number" },
				children: { type: "array", items: { $ref: "#/definitions/node" } }
			}
		}
	}
})
type TreeShape = Infer<typeof tree>
type _treeRoot = Assert<Equal<TreeShape, { value: number; children: { value: number; children: unknown[] }[] }>>

const rootRef = compile({
	$ref: "#/definitions/person",
	definitions: {
		person: {
			type: "object",
			additionalProperties: false,
			required: ["name"],
			properties: {
				name: { type: "string" },
				parent: { $ref: "#/definitions/person" }
			}
		}
	}
})
type RootRef = Infer<typeof rootRef>
type _rootRefParentIsUnknownAtCycle = Assert<Equal<RootRef, { name: string; parent?: unknown }>>

const abc = compile({ type: "string", pattern: "^ab?c$" })
type _patternTemplate = Assert<Equal<Infer<typeof abc>, "ac" | "abc">>

const uuid = compile({
	type: "string",
	pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
})
type _boundedQuantifierFallsBackToString = Assert<Equal<Infer<typeof uuid>, string>>

const status = compile({
	type: "object",
	additionalProperties: false,
	required: ["result"],
	properties: {
		result: {
			oneOf: [
				{
					type: "object",
					additionalProperties: false,
					required: ["kind", "data"],
					properties: {
						kind: { type: "string", const: "ok" },
						data: { type: "string" }
					}
				},
				{
					type: "object",
					additionalProperties: false,
					required: ["kind", "message"],
					properties: {
						kind: { type: "string", const: "error" },
						message: { type: "string" }
					}
				}
			]
		}
	}
})
type _discriminatedUnion = Assert<
	Equal<Infer<typeof status>, { result: { kind: "ok"; data: string } | { kind: "error"; message: string } }>
>

/**
 * The caliper gate: primer's caliper package compiles this exact battery of
 * pattern schemas in one file, which blew tsc's instantiation depth under
 * eager arkregex expansion and forced a buildValidator<T> escape hatch. The
 * bounded-quantifier fallback must keep all of them compiling — via plain
 * compile, with no explicit output type — or the escape hatch comes back.
 */
const UUID_BODY = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const uuidCal = compile({ type: "string", pattern: `^${UUID_BODY}$` })
const urnUuidCal = compile({ type: "string", pattern: `^urn:uuid:${UUID_BODY}$` })
const isoDateTimeCal = compile({
	type: "string",
	pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{3})?Z$"
})
const httpsUrlCal = compile({ type: "string", pattern: "^https://.+$" })
const emailCal = compile({ type: "string", pattern: "^[^@\\s]+@[^@\\s]+$" })
const frontendUrnCal = compile({ type: "string", pattern: `^urn:primer:frontend:${UUID_BODY}$` })
const courseUrnCal = compile({ type: "string", pattern: `^urn:primer:course:${UUID_BODY}$` })
const frameUrnCal = compile({ type: "string", pattern: `^urn:primer:frame:${UUID_BODY}$` })
const frameCompletionUrnCal = compile({
	type: "string",
	pattern: `^urn:primer:frame-completion:${UUID_BODY}$`
})
const instructionalUrnCal = compile({
	type: "string",
	pattern: `^urn:primer:instructional:${UUID_BODY}$`
})
const instructionalCompletionUrnCal = compile({
	type: "string",
	pattern: `^urn:primer:instructional-completion:${UUID_BODY}$`
})
const metricsUrnCal = compile({ type: "string", pattern: `^urn:primer:metrics:${UUID_BODY}$` })
type _uuidCalIsString = Assert<Equal<Infer<typeof uuidCal>, string>>
type _metricsUrnCalIsString = Assert<Equal<Infer<typeof metricsUrnCal>, string>>

// @ts-expect-error object schemas must declare additionalProperties
compile({ type: "object", properties: { id: { type: "string" } } })

const typedMap = compile({ type: "object", additionalProperties: { type: "string" } })
type _typedMapIsRecord = Assert<Equal<Infer<typeof typedMap>, Record<string, string>>>

// @ts-expect-error schema-form additionalProperties next to properties is banned
compile({
	type: "object",
	additionalProperties: { type: "string" },
	properties: { id: { type: "string" } }
})

// @ts-expect-error typed-map value schemas are still guard-checked
compile({ type: "object", additionalProperties: { type: "string", format: "email" } })

// @ts-expect-error $id is banned
compile({ $id: "https://example.com/x", type: "string" })

// @ts-expect-error $defs is banned; use definitions
compile({ type: "string", $defs: { x: { type: "string" } } })

// @ts-expect-error nullable is banned
compile({ type: "string", nullable: true })

// @ts-expect-error format is banned; use pattern
compile({ type: "string", format: "email" })

// @ts-expect-error default is banned
compile({ type: "string", default: "x" })

// @ts-expect-error patternProperties is banned
compile({ type: "object", additionalProperties: false, patternProperties: {} })

const nullableString = compile({ type: ["string", "null"] })
type _nullablePairInfers = Assert<Equal<Infer<typeof nullableString>, string | null>>

// @ts-expect-error inline type unions other than [T, "null"] are banned
compile({ type: ["string", "number"] })

// @ts-expect-error ["null", "null"] is not a nullable pair
compile({ type: ["null", "null"] })

// @ts-expect-error tuple items are banned
compile({ type: "array", items: [{ type: "string" }, { type: "number" }] })

// @ts-expect-error const requires an explicit type
compile({ const: "x" })

// @ts-expect-error enum requires an explicit type
compile({ enum: ["a", "b"] })

// @ts-expect-error pattern requires type string
compile({ type: "number", pattern: "^a$" })

// @ts-expect-error minimum requires a numeric type
compile({ type: "string", minimum: 3 })

// @ts-expect-error required keys must exist in properties
compile({
	type: "object",
	additionalProperties: false,
	required: ["missing"],
	properties: { id: { type: "string" } }
})

// @ts-expect-error syntactically invalid regex pattern
compile({ type: "string", pattern: "^(unclosed$" })

// @ts-expect-error $ref must point at an existing definition
compile({
	type: "object",
	additionalProperties: false,
	required: ["x"],
	properties: { x: { $ref: "#/definitions/missing" } },
	definitions: { present: { type: "string" } }
})

// @ts-expect-error $ref must use the #/definitions/<name> form
compile({
	type: "object",
	additionalProperties: false,
	required: ["x"],
	properties: { x: { $ref: "http://example.com/schema.json" } }
})

// @ts-expect-error whole-document '#' refs are banned; name a definition
compile({
	type: "object",
	additionalProperties: false,
	required: ["name"],
	properties: { name: { type: "string" }, parent: { $ref: "#" } }
})

// @ts-expect-error $ref must be the only keyword in its node
compile({
	type: "object",
	additionalProperties: false,
	required: ["x"],
	properties: { x: { $ref: "#/definitions/present", type: "string" } },
	definitions: { present: { type: "string" } }
})

export type {
	_boundedQuantifierFallsBackToString,
	_discriminatedUnion,
	_metricsUrnCalIsString,
	_nullablePairInfers,
	_patternTemplate,
	_rootRefParentIsUnknownAtCycle,
	_treeRoot,
	_typedMapIsRecord,
	_userShape,
	_uuidCalIsString,
	_wideIsUnknown
}
export {
	courseUrnCal,
	emailCal,
	frameCompletionUrnCal,
	frameUrnCal,
	frontendUrnCal,
	httpsUrlCal,
	instructionalCompletionUrnCal,
	instructionalUrnCal,
	isoDateTimeCal,
	metricsUrnCal,
	urnUuidCal,
	uuidCal
}
