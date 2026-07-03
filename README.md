# @superbuilders/validate

Max-strict JSON Schema draft-07 validation with one entry point: `compile()`. A schema goes in; a `Validator<T>` comes out that is simultaneously an ajv-backed parser, a [Standard Schema](https://standardschema.dev) validator, and a Standard JSON Schema provider — with `T` inferred from the schema literal itself, recursion included.

```typescript
import * as validate from "@superbuilders/validate"

const User = validate.compile({
	type: "object",
	additionalProperties: false,
	required: ["id"],
	properties: {
		id: { type: "string" },
		age: { type: "number" }
	}
})

const result = User.parse(input)
if (!result.success) {
	throw errors.wrap(result.error, "user payload")
}
result.data // { id: string; age?: number } — inferred, not annotated
```

## Install

```
pnpm add @superbuilders/validate
```

ESM only. TypeScript ^6 is a peer dependency; ajv, json-schema-to-ts, and arkregex are real dependencies and implementation details — none of them leak through the API.

## The doctrine

This library exists to make one opinionated dialect of JSON Schema the only expressible one. Three layers enforce the same law:

1. **Type-level guards** — instant editor feedback. An unlawful literal schema does not typecheck, and the error poisons the exact offending key.
2. **A runtime walker** — the enforcement layer of record. Every schema, statically typed or dynamically assembled, is walked before ajv sees it. The walker enforces everything the types express plus what they can't (key order, discriminated-union shape). Violations throw a wrap of `ErrSchemaCompilation` naming the rule and the JSON-pointer path.
3. **Max-strict ajv** — the validation authority. All strict flags on, no coercion, no defaults, no formats, unicode patterns, and no schema registry (every compile is anonymous and repeatable).

Because the law lives at runtime, the type layer is pure developer experience — there is nothing to bypass and no escape hatch to abuse. There is deliberately no `buildValidator<T>()`, no exported ajv instance, and no way to hand the compiler a type it didn't earn.

## The law

Object schemas declare intent explicitly, in canonical key order:

```
type < additionalProperties < required < properties
```

- `additionalProperties` is **mandatory** on object schemas and **boolean only** — `false` unless the boundary is deliberately open. (The schema form corrupts json-schema-to-ts inference; implicit openness hides the decision.)
- `required` may list only keys declared in `properties`, without duplicates.
- Typed keywords require their type: `pattern`/`minLength` ⇒ `type: "string"`, `minimum` ⇒ numeric, `items` ⇒ `"array"`, `properties` ⇒ `"object"`, and `const`/`enum` require an explicit `type`.
- `oneOf` is reserved for **discriminated unions**: every branch a closed object schema sharing one const-tagged discriminator, first in both `required` and `properties`. Use `anyOf` for other unions.
- **Banned outright**: `$id`, `$defs` (use `definitions`), `nullable`, `format` (use `pattern`), `default`, `patternProperties`, `additionalItems`, `dependencies`, tuple `items`, inline `type` arrays, unknown keywords, non-root `$schema`/`definitions`.

## Recursion

ajv compiles recursive schemas natively; json-schema-to-ts cannot infer them (its eager `$ref` expansion dies with ts2589, and an unresolvable ref silently infers `never`). This library reconciles the two with its own type-level ref inliner: every `$ref` is expanded with a cycle-cutting stack, and a ref that re-enters its own expansion becomes `unknown`.

```typescript
const Tree = validate.compile({
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
// Infer<typeof Tree> = { value: number; children: { value: number; children: unknown[] }[] }
// Runtime validation is fully recursive to any depth.
```

The rules: `$ref` is always `"#/definitions/<name>"`, the name must resolve (a bad path is a loud compile-time and runtime error, never a silent `never`), and a `$ref` node carries no sibling keywords. The root may be a ref itself — `{ definitions: {...}, $ref: "#/definitions/entry" }` — the classic recursive-document idiom. Whole-document `"#"` refs are banned.

## Patterns

`pattern` strings are validated syntactically at the type level (via arkregex, in the `u` dialect ajv compiles with) and refined into template-literal types:

```typescript
const Urn = validate.compile({ type: "string", pattern: "^urn:x:.+$" })
// Infer<typeof Urn> = `urn:x:${string}`
```

One deterministic exception: a pattern containing bounded repetition (`{8}`, `{2,4}` — anything matching `{<digit>`) opts out of all type-level treatment and infers as the base `string`. Bounded quantifiers are the type-level worst case twice over (inference expands `[0-9a-f]{8}` into 16⁸ branches; even the syntax parser drowns on the patterns they produce), so the rule is: the type system refines what it can prove cheaply, and runtime ajv enforces every pattern in full either way. UUID-shaped schemas validate perfectly — they just type as `string`.

## Dynamic schemas

A schema only known as the wide `JsonSchema` type compiles to an honest `Validator<unknown>`:

```typescript
function fromManifest(schema: validate.JsonSchema) {
	return validate.compile(schema) // Validator<unknown>; walker + ajv still enforce everything
}
```

The wide overload accepts **only** provably wide types. A literal schema that fails the guards cannot silently fall through to it and launder itself into `Validator<unknown>` — the call errors with the guard's poison visible.

## Errors

Sentinels, matchable through any wrap chain with [`@superbuilders/errors`](https://github.com/superbuilders/errors):

- **`ErrSchemaCompilation`** — house-rule violation (with rule and schema path in the message) or ajv compile failure
- **`ErrValidation`** — the error on every failed `parse`, with ajv's issues attached
- **`ErrUnsupportedSchemaDialect`** — root `$schema` present and not draft-07
- **`ErrUnsupportedSchemaTarget`** — Standard JSON Schema asked for a target other than `"draft-07"`

```typescript
const result = errors.trySync(() => validate.compile(schema))
if (result.error) {
	if (errors.is(result.error, validate.ErrSchemaCompilation)) {
		// e.g. "house rule at #/properties/x: keyword 'format' is banned: ..."
	}
}
```

## Interop

Every validator implements Standard Schema v1 (`"~standard".validate`, with JSON-pointer paths unescaped into real keys) and Standard JSON Schema (`"~standard".jsonSchema.input/output`, draft-07 target only) — so it plugs directly into the AI SDK's structured output, tRPC, and anything else that speaks the standard, with `StandardSchemaV1.InferOutput` agreeing with `validate.Infer`.

## Why not Zod

The schema **is** the artifact. It travels as JSON (to model providers, into manifests, across services), it is diffable, and it has no host-language runtime semantics. A builder API produces values that only mean something to the library that built them; a draft-07 document means the same thing to ajv, an LLM, and a reader. This library keeps the document primary and derives everything else — the TypeScript type, the parser, the standard interfaces — from it.

## License

[0BSD](./LICENSE) © Bjorn Pagen
