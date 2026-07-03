/**
 * Type-level internal-$ref inliner with cycle cutting.
 *
 * json-schema-to-ts cannot infer recursive schemas: its $ref expansion is
 * eager, has no cycle guard, and dies with ts2589 — and a ref whose path
 * does not resolve silently infers `never`. ajv, by contrast, compiles
 * recursion natively. This layer reconciles the two: before FromSchema ever
 * runs, every `{ $ref: "#/definitions/<name>" }` node is inlined by us,
 * carrying an expansion stack of the refs currently being expanded. A ref
 * that re-enters its own expansion is replaced with the boolean schema
 * `true`, which FromSchema maps to `unknown` — so a recursive schema infers
 * the best finite approximation of its type (everything typed except the
 * cycle re-entry points), while ajv validates the full recursion at runtime.
 */
type ResolveRefs<TSchema> = ResolveNode<TSchema, TSchema, never>

type ResolveNode<T, Root, Stack extends string> = T extends { $ref: infer R }
	? R extends string
		? ResolveRef<R, Root, Stack>
		: true
	: T extends readonly unknown[]
		? { [K in keyof T]: ResolveNode<T[K], Root, Stack> }
		: T extends object
			? { [K in keyof T]: K extends "definitions" ? T[K] : ResolveNode<T[K], Root, Stack> }
			: T

type ResolveRef<R extends string, Root, Stack extends string> = R extends Stack
	? true
	: R extends `#/definitions/${infer Name}`
		? Root extends { definitions: infer D }
			? Name extends keyof D
				? ResolveNode<D[Name], Root, Stack | R>
				: true
			: true
		: true

export type { ResolveRefs }
