import Ajv from "ajv"

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
	removeAdditional: false
})

export { ajv }
