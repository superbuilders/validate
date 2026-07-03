import * as errors from "@superbuilders/errors"

import { ErrSchemaCompilation } from "#errors.ts"
import {
	ARRAY_KEYWORDS,
	NUMBER_KEYWORDS,
	OBJECT_KEYWORDS,
	SCHEMA_NODE_KEYS,
	STRING_KEYWORDS
} from "#schemas/schema-keywords.ts"
import type { JsonSchema } from "#types/json-schema.ts"

/**
 * Guidance for keywords that are banned by design rather than merely unknown.
 * The generic unknown-keyword error names the key; these add the reason and
 * the sanctioned alternative.
 */
const BANNED_KEYWORD_GUIDANCE: Record<string, string> = {
	$id: "schemas must not register identities; every compile is anonymous",
	$defs: "use draft-07 'definitions'",
	nullable: "'nullable' is OpenAPI dialect; use an explicit type instead",
	format: "no formats are registered; express the constraint with 'pattern'",
	default: "'default' corrupts type inference by making the property required; model defaults in code",
	patternProperties: "'patternProperties' defeats closed-object typing; enumerate 'properties'",
	additionalItems: "tuple forms are banned; 'items' takes a single schema",
	dependencies: "'dependencies' is banned; model conditionality with if/then/else"
}

const CANONICAL_OBJECT_KEY_ORDER = ["type", "additionalProperties", "required", "properties"]

const REF_PATTERN = /^#\/definitions\/[^/~]+$/

function houseError(path: string, message: string): Error {
	return errors.wrap(ErrSchemaCompilation, `house rule at ${path}: ${message}`)
}

function isSchemaObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function checkKeys(keys: string[], path: string): void {
	for (const key of keys) {
		if (SCHEMA_NODE_KEYS.has(key)) {
			continue
		}
		const guidance = BANNED_KEYWORD_GUIDANCE[key]
		if (guidance !== undefined) {
			throw houseError(path, `keyword '${key}' is banned: ${guidance}`)
		}
		throw houseError(path, `unknown keyword '${key}'`)
	}
}

function definitionsOf(root: Record<string, unknown>): Record<string, unknown> {
	const definitions = root.definitions
	if (isSchemaObject(definitions)) {
		return definitions
	}
	return {}
}

function checkRefNode(
	node: Record<string, unknown>,
	keys: string[],
	root: Record<string, unknown>,
	path: string
): void {
	for (const key of keys) {
		if (key === "$ref") {
			continue
		}
		if (path === "#" && (key === "definitions" || key === "$schema")) {
			continue
		}
		throw houseError(
			path,
			"'$ref' must be the only keyword in its node (root may add 'definitions' and '$schema'); draft-07 ignores siblings silently"
		)
	}
	const ref = node.$ref
	if (typeof ref !== "string") {
		throw houseError(path, "'$ref' must be a string")
	}
	if (!REF_PATTERN.test(ref)) {
		throw houseError(path, `'$ref' must be '#/definitions/<name>', got '${ref}'`)
	}
	const name = ref.slice("#/definitions/".length)
	if (!Object.hasOwn(definitionsOf(root), name)) {
		throw houseError(path, `'$ref' target '${ref}' does not resolve; no such definition`)
	}
}

function checkRootOnlyKeywords(node: Record<string, unknown>, path: string): void {
	if (path === "#") {
		return
	}
	if (node.$schema !== undefined) {
		throw houseError(path, "'$schema' is only allowed at the schema root")
	}
	if (node.definitions !== undefined) {
		throw houseError(path, "'definitions' is only allowed at the schema root")
	}
}

/**
 * The single type name a node validates when non-null: the plain `type`
 * string, or the first element of the nullable pair `[T, "null"]` — the one
 * inline type array the house dialect admits.
 */
function effectiveType(node: Record<string, unknown>): string | undefined {
	const type = node.type
	if (typeof type === "string") {
		return type
	}
	if (Array.isArray(type) && typeof type[0] === "string") {
		return type[0]
	}
	return undefined
}

function checkTypeKeyword(node: Record<string, unknown>, path: string): void {
	if (node.type === undefined) {
		return
	}
	if (Array.isArray(node.type)) {
		const isNullablePair =
			node.type.length === 2 && typeof node.type[0] === "string" && node.type[0] !== "null" && node.type[1] === "null"
		if (!isNullablePair) {
			throw houseError(
				path,
				'inline type unions are banned except the nullable pair [T, "null"]; use anyOf of single-type schemas'
			)
		}
		return
	}
	if (typeof node.type !== "string") {
		throw houseError(path, "'type' must be a string")
	}
}

function checkTypedKeywordCoherence(node: Record<string, unknown>, keys: string[], path: string): void {
	const type = effectiveType(node)
	for (const key of keys) {
		if (STRING_KEYWORDS.has(key) && type !== "string") {
			throw houseError(path, `'${key}' requires type 'string'`)
		}
		if (NUMBER_KEYWORDS.has(key) && type !== "number" && type !== "integer") {
			throw houseError(path, `'${key}' requires type 'number' or 'integer'`)
		}
		if (ARRAY_KEYWORDS.has(key) && type !== "array") {
			throw houseError(path, `'${key}' requires type 'array'`)
		}
		if (OBJECT_KEYWORDS.has(key) && type !== "object") {
			throw houseError(path, `'${key}' requires type 'object'`)
		}
	}
}

function checkConstEnum(node: Record<string, unknown>, path: string): void {
	if (Object.hasOwn(node, "const") && node.type === undefined) {
		throw houseError(path, "'const' requires an explicit 'type'")
	}
	if (!Object.hasOwn(node, "enum")) {
		return
	}
	if (node.type === undefined) {
		throw houseError(path, "'enum' requires an explicit 'type'")
	}
	if (!Array.isArray(node.enum) || node.enum.length === 0) {
		throw houseError(path, "'enum' must be a non-empty array")
	}
}

function checkKeyOrder(keys: string[], path: string): void {
	let lastIndex = -1
	for (const canonical of CANONICAL_OBJECT_KEY_ORDER) {
		const index = keys.indexOf(canonical)
		if (index === -1) {
			continue
		}
		if (index < lastIndex) {
			throw houseError(
				path,
				`object schema keys must be authored in the order ${CANONICAL_OBJECT_KEY_ORDER.join(" < ")}`
			)
		}
		lastIndex = index
	}
}

function checkRequiredKeys(node: Record<string, unknown>, path: string): void {
	const required = node.required
	if (required === undefined) {
		return
	}
	if (!Array.isArray(required)) {
		throw houseError(path, "'required' must be an array of strings")
	}
	const properties = node.properties
	const propertyKeys = isSchemaObject(properties) ? properties : {}
	const seen = new Set<string>()
	for (const entry of required) {
		if (typeof entry !== "string") {
			throw houseError(path, "'required' must be an array of strings")
		}
		if (seen.has(entry)) {
			throw houseError(path, `'required' lists '${entry}' twice`)
		}
		seen.add(entry)
		if (!Object.hasOwn(propertyKeys, entry)) {
			throw houseError(path, `'required' lists '${entry}' which is not declared in 'properties'`)
		}
	}
}

function checkObjectShape(node: Record<string, unknown>, keys: string[], path: string): void {
	if (effectiveType(node) !== "object") {
		return
	}
	if (!Object.hasOwn(node, "additionalProperties")) {
		throw houseError(
			path,
			"object schemas must declare 'additionalProperties' explicitly (false unless the boundary is deliberately open)"
		)
	}
	if (typeof node.additionalProperties !== "boolean" && Object.hasOwn(node, "properties")) {
		throw houseError(
			path,
			"'additionalProperties' next to 'properties' must be a boolean; the schema form there corrupts type inference (typed maps drop 'properties')"
		)
	}
	checkKeyOrder(keys, path)
	checkRequiredKeys(node, path)
}

/**
 * Follows at most one chain of internal refs so oneOf branches authored as
 * `{ $ref: "#/definitions/x" }` can be shape-checked. Ref validity itself is
 * enforced by checkRefNode when the branch node is walked.
 */
function resolveForShape(node: unknown, root: Record<string, unknown>): unknown {
	let current = node
	const seen = new Set<string>()
	while (isSchemaObject(current) && typeof current.$ref === "string") {
		const ref = current.$ref
		if (seen.has(ref)) {
			return current
		}
		seen.add(ref)
		if (!REF_PATTERN.test(ref)) {
			return current
		}
		current = definitionsOf(root)[ref.slice("#/definitions/".length)]
	}
	return current
}

function discriminatorOf(branch: Record<string, unknown>, root: Record<string, unknown>, path: string): string {
	if (branch.type !== "object" || branch.additionalProperties !== false) {
		throw houseError(path, "oneOf branches must be closed object schemas (type 'object', additionalProperties false)")
	}
	const required = branch.required
	if (!Array.isArray(required) || required.length === 0) {
		throw houseError(path, "oneOf branches must declare a non-empty 'required' beginning with the discriminator tag")
	}
	const tag = required[0]
	if (typeof tag !== "string") {
		throw houseError(path, "oneOf branch discriminator tag must be a string")
	}
	const properties = branch.properties
	if (!isSchemaObject(properties)) {
		throw houseError(path, "oneOf branches must declare 'properties'")
	}
	const firstProperty = Object.keys(properties)[0]
	if (firstProperty !== tag) {
		throw houseError(path, `oneOf branch discriminator '${tag}' must be the first key of 'properties'`)
	}
	const tagSchema = resolveForShape(properties[tag], root)
	if (!isSchemaObject(tagSchema) || !Object.hasOwn(tagSchema, "const")) {
		throw houseError(path, `oneOf branch discriminator '${tag}' must be a const-tagged schema`)
	}
	return tag
}

function checkOneOf(node: Record<string, unknown>, root: Record<string, unknown>, path: string): void {
	const branches = node.oneOf
	if (branches === undefined) {
		return
	}
	if (!Array.isArray(branches) || branches.length === 0) {
		throw houseError(path, "'oneOf' must be a non-empty array")
	}
	let sharedTag: string | undefined
	for (const [index, rawBranch] of branches.entries()) {
		const branchPath = `${path}/oneOf/${index}`
		const branch = resolveForShape(rawBranch, root)
		if (!isSchemaObject(branch)) {
			throw houseError(branchPath, "oneOf branches must be object schemas")
		}
		const tag = discriminatorOf(branch, root, branchPath)
		if (sharedTag === undefined) {
			sharedTag = tag
			continue
		}
		if (tag !== sharedTag) {
			throw houseError(branchPath, `oneOf branches must share one discriminator; found '${tag}' after '${sharedTag}'`)
		}
	}
}

function recurse(node: Record<string, unknown>, root: Record<string, unknown>, path: string): void {
	const properties = node.properties
	if (isSchemaObject(properties)) {
		for (const [key, child] of Object.entries(properties)) {
			walkNode(child, root, `${path}/properties/${key}`)
		}
	}
	const definitions = node.definitions
	if (path === "#" && isSchemaObject(definitions)) {
		for (const [key, child] of Object.entries(definitions)) {
			walkNode(child, root, `${path}/definitions/${key}`)
		}
	}
	for (const keyword of ["items", "additionalProperties", "propertyNames", "contains", "not", "if", "then", "else"]) {
		const child = node[keyword]
		if (child !== undefined) {
			if (keyword === "items" && Array.isArray(child)) {
				throw houseError(path, "tuple 'items' arrays are banned; 'items' takes a single schema")
			}
			walkNode(child, root, `${path}/${keyword}`)
		}
	}
	for (const keyword of ["oneOf", "anyOf", "allOf"]) {
		const branches = node[keyword]
		if (branches === undefined) {
			continue
		}
		if (!Array.isArray(branches) || branches.length === 0) {
			throw houseError(path, `'${keyword}' must be a non-empty array`)
		}
		for (const [index, branch] of branches.entries()) {
			walkNode(branch, root, `${path}/${keyword}/${index}`)
		}
	}
}

function walkNode(node: unknown, root: Record<string, unknown>, path: string): void {
	if (typeof node === "boolean") {
		return
	}
	if (!isSchemaObject(node)) {
		throw houseError(path, "schema nodes must be objects or booleans")
	}
	const keys = Object.keys(node)
	checkKeys(keys, path)
	if (node.$ref !== undefined) {
		checkRefNode(node, keys, root, path)
		const definitions = node.definitions
		if (path === "#" && isSchemaObject(definitions)) {
			for (const [key, child] of Object.entries(definitions)) {
				walkNode(child, root, `${path}/definitions/${key}`)
			}
		}
		return
	}
	checkRootOnlyKeywords(node, path)
	checkTypeKeyword(node, path)
	checkTypedKeywordCoherence(node, keys, path)
	checkConstEnum(node, path)
	checkObjectShape(node, keys, path)
	checkOneOf(node, root, path)
	recurse(node, root, path)
}

/**
 * Enforces the entire house schema law at runtime, before ajv ever sees the
 * schema. This is the enforcement layer of record: the type-level guards give
 * instant editor feedback, but every schema — statically typed or dynamically
 * assembled — passes through here. Throws a wrap of ErrSchemaCompilation
 * naming the violated rule and the JSON-pointer path of the offending node.
 */
function assertHouseSchema(schemaSource: JsonSchema): void {
	if (typeof schemaSource === "boolean") {
		return
	}
	walkNode(schemaSource, schemaSource, "#")
}

export { assertHouseSchema }
