import Ajv from "ajv"

/**
 * The single, maximally strict ajv instance. Never exported from the package:
 * compile() is the only path to it, so nothing can register schemas, add
 * formats, or relax options behind the house law's back.
 *
 * Two pins beyond the strict flags: `unicodeRegExp: true` (ajv's default,
 * pinned so every `pattern` provably compiles with the `u` flag — the same
 * dialect the type-level pattern inference assumes), and `addUsedSchema:
 * false` (compiled schemas are never registered in the instance's ref cache,
 * so compiles are stateless and repeatable; internal `#/definitions/...`
 * refs still resolve within the schema being compiled).
 */
const ajv = new Ajv({
	allErrors: true,
	strict: true,
	strictSchema: true,
	strictNumbers: true,
	strictTypes: true,
	strictTuples: true,
	strictRequired: true,
	allowUnionTypes: false,
	allowMatchingProperties: false,
	validateFormats: true,
	coerceTypes: false,
	useDefaults: false,
	removeAdditional: false,
	unicodeRegExp: true,
	addUsedSchema: false
})

export { ajv }
