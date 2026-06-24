# @superbuilders/validate

JSON Schema Draft 7 validation primitives for Superbuilders applications.

This package is a small, typed wrapper around AJV. It gives one compiled schema artifact that works as:

- an AJV-backed parser
- a Standard Schema validator
- a Standard JSON Schema provider
- an AI SDK structured-output schema input

It deliberately does not transform data. It validates unknown input and returns the same value with a narrowed TypeScript type when validation succeeds.

## Installation

```bash
bun add @superbuilders/validate
```

```bash
npm install @superbuilders/validate
```

## Basic Usage

```typescript
import * as validate from "@superbuilders/validate"

const UserSchema = validate.compile({
	type: "object",
	additionalProperties: false,
	required: ["id", "email"],
	properties: {
		id: { type: "string", minLength: 1 },
		email: { type: "string", minLength: 1 }
	}
} as const)

type User = validate.Infer<typeof UserSchema>

const result = UserSchema.parse(input)
if (!result.success) {
	throw result.error
}

const user: User = result.data
```

## API

### `validate.compile(schema)`

Compiles a JSON Schema Draft 7 schema with AJV and returns a `Validator<T>`.

```typescript
const Schema = validate.compile({ type: "string" } as const)
```

Do not pass explicit output generics. The output type is inferred from the schema when `json-schema-to-ts` can represent it. String `pattern` schemas are additionally refined with `arkregex` when the pattern is a literal.

```typescript
const SlugSchema = validate.compile({
	type: "string",
	pattern: "^post_[0-9]+$"
} as const)

type Slug = validate.Infer<typeof SlugSchema>
// `post_${number}`
```

JSON Schema patterns are not implicitly anchored. Use `^` and `$` when you need full-string validation.

### `Schema.parse(value)`

Validates an unknown value.

```typescript
const result = Schema.parse(value)
if (result.success) {
	result.data
} else {
	result.error
	result.issues
}
```

### `validate.Infer<typeof Schema>`

Extracts the inferred output type from a compiled validator.

```typescript
type Output = validate.Infer<typeof Schema>
```

### Standard Schema

Compiled validators implement `StandardSchemaV1`.

```typescript
Schema["~standard"].validate(value)
```

### Standard JSON Schema

Compiled validators implement `StandardJSONSchemaV1`.

Only `target: "draft-07"` is supported.

```typescript
const jsonSchema = Schema["~standard"].jsonSchema.input({ target: "draft-07" })
```

Unsupported targets throw.

## Strictness

AJV is configured with explicit strict options:

- `strict: true`
- `strictSchema: true`
- `strictNumbers: true`
- `strictTypes: true`
- `strictTuples: true`
- `strictRequired: true`
- `allowUnionTypes: false`
- `allowMatchingProperties: false`
- `validateFormats: true`
- `coerceTypes: false`
- `useDefaults: false`
- `removeAdditional: false`

Non-null `type` unions are rejected by AJV strict mode:

```typescript
// Avoid this
{ type: ["string", "number"] }

// Prefer this
{ anyOf: [{ type: "string" }, { type: "number" }] }
```

Nullable schemas are permitted:

```typescript
{ type: ["string", "null"] }
```

## Additional Properties

Always make `additionalProperties` explicit on object schemas.

Prefer closed objects:

```typescript
{
	type: "object",
	additionalProperties: false,
	required: ["id"],
	properties: { id: { type: "string" } }
}
```

Use `additionalProperties: true` only for intentional external/open-object projection boundaries, such as third-party API payloads where you validate and consume a subset of upstream fields.

## Recursive Schemas

Recursive runtime schemas should use Draft 7 `$ref` and `definitions`.

`json-schema-to-ts` does not infer recursive schemas. For recursive data, write an explicit TypeScript domain type and expose a named parse function that validates with this library and returns `ValidationResult<YourType>`.

## No Transforms

This library does not coerce, default, strip, or transform values.

If validation succeeds, `data` is the original value narrowed to the schema type.
