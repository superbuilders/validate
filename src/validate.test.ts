import assert from "node:assert/strict"
import { describe, it } from "node:test"

import * as errors from "@superbuilders/errors"

import * as validate from "#validate.ts"

describe("compile and parse", () => {
	it("parses a valid value and narrows the result", () => {
		const user = validate.compile({
			type: "object",
			additionalProperties: false,
			required: ["id"],
			properties: {
				id: { type: "string" },
				age: { type: "number" }
			}
		})
		const result = user.parse({ id: "u1", age: 30 })
		assert.strictEqual(result.success, true)
		if (result.success) {
			assert.strictEqual(result.data.id, "u1")
		}
	})

	it("rejects an invalid value with issues and a matchable error", () => {
		const user = validate.compile({
			type: "object",
			additionalProperties: false,
			required: ["id"],
			properties: { id: { type: "string" } }
		})
		const result = user.parse({ id: 42 })
		assert.strictEqual(result.success, false)
		if (!result.success) {
			assert.strictEqual(errors.is(result.error, validate.ErrValidation), true)
			assert.ok(result.issues.length > 0)
		}
	})

	it("rejects additional properties when closed", () => {
		const closed = validate.compile({
			type: "object",
			additionalProperties: false,
			required: ["id"],
			properties: { id: { type: "string" } }
		})
		const result = closed.parse({ id: "x", extra: true })
		assert.strictEqual(result.success, false)
	})

	it("compiles the same schema object twice without registry collisions", () => {
		const schema: validate.JsonSchema = { type: "string" }
		const first = validate.compile(schema)
		const second = validate.compile(schema)
		assert.strictEqual(first.parse("a").success, true)
		assert.strictEqual(second.parse("a").success, true)
	})

	it("compiles patterns in unicode mode", () => {
		const letters = validate.compile({ type: "string", pattern: "^\\p{L}+$" })
		assert.strictEqual(letters.parse("héllo").success, true)
		assert.strictEqual(letters.parse("a1").success, false)
	})

	it("validates bounded-quantifier patterns fully at runtime", () => {
		const uuid = validate.compile({
			type: "string",
			pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
		})
		assert.strictEqual(uuid.parse("0198c0c8-31ae-7000-8000-000000000000").success, true)
		assert.strictEqual(uuid.parse("not-a-uuid").success, false)
	})

	it("rejects a syntactically invalid pattern at compile time via ajv", () => {
		const bad: validate.JsonSchema = { type: "string", pattern: "^(unclosed$" }
		assert.throws(
			() => validate.compile(bad),
			(err: Error) => errors.is(err, validate.ErrSchemaCompilation)
		)
	})
})

describe("recursion", () => {
	const tree = validate.compile({
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

	it("validates deeply nested recursive structures", () => {
		const deep = {
			value: 1,
			children: [
				{ value: 2, children: [{ value: 3, children: [{ value: 4, children: [] }] }] },
				{ value: 5, children: [] }
			]
		}
		assert.strictEqual(tree.parse(deep).success, true)
	})

	it("rejects a violation deep inside the recursion", () => {
		const invalid = {
			value: 1,
			children: [{ value: 2, children: [{ value: "three", children: [] }] }]
		}
		const result = tree.parse(invalid)
		assert.strictEqual(result.success, false)
		if (!result.success) {
			const paths = result.issues.map((issue) => issue.instancePath)
			assert.ok(paths.some((path) => path.startsWith("/children/0/children/0")))
		}
	})

	it("validates a root that is itself a ref into definitions", () => {
		const linked = validate.compile({
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
		assert.strictEqual(linked.parse({ name: "leaf", parent: { name: "mid", parent: { name: "root" } } }).success, true)
		assert.strictEqual(linked.parse({ name: "leaf", parent: { name: 5 } }).success, false)
	})
})

describe("house walker", () => {
	/**
	 * Keywords like $defs and frobnicate are rejected by the static guards
	 * and by json-schema-to-ts's own type, so a literal can never carry them
	 * — they only arrive as dynamic data, which is exactly the walker's
	 * jurisdiction. JSON.parse produces them without any type laundering.
	 */
	function rawSchema(json: string): validate.JsonSchema {
		return JSON.parse(json)
	}

	const violations: { name: string; schema: validate.JsonSchema }[] = [
		{ name: "$id is banned", schema: { $id: "https://example.com/x", type: "string" } },
		{
			name: "$defs is banned",
			schema: rawSchema(`{"type":"string","$defs":{"x":{"type":"string"}}}`)
		},
		{ name: "nullable is banned", schema: { type: "string", nullable: true } },
		{ name: "format is banned", schema: { type: "string", format: "email" } },
		{ name: "default is banned", schema: { type: "string", default: "x" } },
		{
			name: "patternProperties is banned",
			schema: { type: "object", additionalProperties: false, patternProperties: {} }
		},
		{
			name: "unknown keywords are banned",
			schema: rawSchema(`{"type":"string","frobnicate":true}`)
		},
		{ name: "inline type unions are banned", schema: { type: ["string", "null"] } },
		{
			name: "tuple items are banned",
			schema: { type: "array", items: [{ type: "string" }] }
		},
		{
			name: "object schemas must declare additionalProperties",
			schema: { type: "object", properties: { id: { type: "string" } } }
		},
		{
			name: "schema-form additionalProperties is banned",
			schema: {
				type: "object",
				additionalProperties: { type: "string" },
				properties: { id: { type: "string" } }
			}
		},
		{
			name: "required keys must exist in properties",
			schema: {
				type: "object",
				additionalProperties: false,
				required: ["missing"],
				properties: { id: { type: "string" } }
			}
		},
		{
			name: "required must not repeat keys",
			schema: {
				type: "object",
				additionalProperties: false,
				required: ["id", "id"],
				properties: { id: { type: "string" } }
			}
		},
		{
			name: "canonical key order is enforced",
			schema: {
				type: "object",
				properties: { id: { type: "string" } },
				required: ["id"],
				additionalProperties: false
			}
		},
		{
			name: "definitions is root-only",
			schema: {
				type: "object",
				additionalProperties: false,
				required: ["x"],
				properties: {
					x: {
						type: "object",
						additionalProperties: false,
						definitions: { y: { type: "string" } }
					}
				}
			}
		},
		{
			name: "$schema is root-only",
			schema: {
				type: "object",
				additionalProperties: false,
				required: ["x"],
				properties: { x: { $schema: "http://json-schema.org/draft-07/schema#", type: "string" } }
			}
		},
		{
			name: "$ref must be the only keyword in its node",
			schema: {
				type: "object",
				additionalProperties: false,
				required: ["x"],
				properties: { x: { $ref: "#/definitions/y", type: "string" } },
				definitions: { y: { type: "string" } }
			}
		},
		{
			name: "$ref must use the internal definitions form",
			schema: {
				type: "object",
				additionalProperties: false,
				required: ["x"],
				properties: { x: { $ref: "http://example.com/schema.json" } }
			}
		},
		{
			name: "whole-document '#' refs are banned",
			schema: {
				type: "object",
				additionalProperties: false,
				required: ["x"],
				properties: { x: { $ref: "#" } }
			}
		},
		{
			name: "$ref must resolve to an existing definition",
			schema: {
				type: "object",
				additionalProperties: false,
				required: ["x"],
				properties: { x: { $ref: "#/definitions/missing" } },
				definitions: { present: { type: "string" } }
			}
		},
		{ name: "const requires a type", schema: { const: "x" } },
		{ name: "enum requires a type", schema: { enum: ["a"] } },
		{ name: "enum must be non-empty", schema: { type: "string", enum: [] } },
		{ name: "pattern requires type string", schema: { type: "number", pattern: "^a$" } },
		{ name: "minimum requires a numeric type", schema: { type: "string", minimum: 3 } },
		{ name: "minItems requires type array", schema: { type: "object", additionalProperties: false, minItems: 1 } },
		{ name: "properties requires type object", schema: { properties: { id: { type: "string" } } } },
		{ name: "oneOf must be non-empty", schema: { oneOf: [] } },
		{
			name: "oneOf branches must be closed object schemas",
			schema: { oneOf: [{ type: "string" }] }
		},
		{
			name: "oneOf branches must declare a discriminator",
			schema: {
				oneOf: [
					{
						type: "object",
						additionalProperties: false,
						properties: { kind: { type: "string", const: "a" } }
					}
				]
			}
		},
		{
			name: "oneOf discriminator must be first in properties",
			schema: {
				oneOf: [
					{
						type: "object",
						additionalProperties: false,
						required: ["kind"],
						properties: {
							data: { type: "string" },
							kind: { type: "string", const: "a" }
						}
					}
				]
			}
		},
		{
			name: "oneOf discriminator must be const-tagged",
			schema: {
				oneOf: [
					{
						type: "object",
						additionalProperties: false,
						required: ["kind"],
						properties: { kind: { type: "string" } }
					}
				]
			}
		},
		{
			name: "oneOf branches must share one discriminator",
			schema: {
				oneOf: [
					{
						type: "object",
						additionalProperties: false,
						required: ["kind"],
						properties: { kind: { type: "string", const: "a" } }
					},
					{
						type: "object",
						additionalProperties: false,
						required: ["variant"],
						properties: { variant: { type: "string", const: "b" } }
					}
				]
			}
		}
	]

	for (const violation of violations) {
		it(violation.name, () => {
			assert.throws(
				() => validate.compile(violation.schema),
				(err: Error) => errors.is(err, validate.ErrSchemaCompilation)
			)
		})
	}

	it("accepts a lawful discriminated union, including ref branches", () => {
		const union = validate.compile({
			oneOf: [
				{ $ref: "#/definitions/ok" },
				{
					type: "object",
					additionalProperties: false,
					required: ["kind", "message"],
					properties: {
						kind: { type: "string", const: "error" },
						message: { type: "string" }
					}
				}
			],
			definitions: {
				ok: {
					type: "object",
					additionalProperties: false,
					required: ["kind", "data"],
					properties: {
						kind: { type: "string", const: "ok" },
						data: { type: "string" }
					}
				}
			}
		})
		assert.strictEqual(union.parse({ kind: "ok", data: "x" }).success, true)
		assert.strictEqual(union.parse({ kind: "error", message: "boom" }).success, true)
		assert.strictEqual(union.parse({ kind: "nope" }).success, false)
	})

	it("names the violated rule and the schema path in the error", () => {
		const bad: validate.JsonSchema = {
			type: "object",
			additionalProperties: false,
			required: ["x"],
			properties: { x: { type: "string", format: "email" } }
		}
		const result = errors.trySync(() => validate.compile(bad))
		assert.ok(result.error)
		assert.match(result.error.message, /#\/properties\/x/)
		assert.match(result.error.message, /format/)
	})
})

describe("standard schema", () => {
	const user = validate.compile({
		type: "object",
		additionalProperties: false,
		required: ["id"],
		properties: { id: { type: "string" } }
	})

	it("exposes version and vendor", () => {
		assert.strictEqual(user["~standard"].version, 1)
		assert.strictEqual(user["~standard"].vendor, "@superbuilders/validate")
	})

	it("validate returns a value result on success", () => {
		const result = user["~standard"].validate({ id: "u1" })
		assert.ok(!(result instanceof Promise))
		if (!(result instanceof Promise)) {
			assert.deepStrictEqual(result, { value: { id: "u1" } })
		}
	})

	it("validate returns issues with unescaped JSON-pointer paths", () => {
		const slashed = validate.compile({
			type: "object",
			additionalProperties: false,
			required: ["a/b"],
			properties: { "a/b": { type: "string" } }
		})
		const result = slashed["~standard"].validate({ "a/b": 42 })
		assert.ok(!(result instanceof Promise))
		if (!(result instanceof Promise)) {
			assert.ok(result.issues)
			if (result.issues) {
				const paths = result.issues.flatMap((issue) => {
					if (issue.path === undefined) {
						return []
					}
					return issue.path
				})
				assert.deepStrictEqual(paths, [{ key: "a/b" }])
			}
		}
	})

	it("serves the draft-07 json schema and refuses other targets", () => {
		const schema = user["~standard"].jsonSchema.input({ target: "draft-07" })
		assert.strictEqual(schema.$schema, "http://json-schema.org/draft-07/schema#")
		assert.strictEqual(schema.type, "object")
		assert.throws(
			() => user["~standard"].jsonSchema.output({ target: "draft-2020-12" }),
			(err: Error) => errors.is(err, validate.ErrUnsupportedSchemaTarget)
		)
	})
})

describe("dialect", () => {
	it("accepts an explicit draft-07 $schema", () => {
		const ok = validate.compile({
			$schema: "http://json-schema.org/draft-07/schema#",
			type: "string"
		})
		assert.strictEqual(ok.parse("x").success, true)
	})

	it("refuses any other dialect", () => {
		const bad: validate.JsonSchema = {
			$schema: "https://json-schema.org/draft/2020-12/schema",
			type: "string"
		}
		assert.throws(
			() => validate.compile(bad),
			(err: Error) => errors.is(err, validate.ErrUnsupportedSchemaDialect)
		)
	})
})
