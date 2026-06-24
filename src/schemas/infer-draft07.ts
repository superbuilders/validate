import type { JSONSchema as UpstreamJsonSchema } from "json-schema-to-ts"
import type * as JsonSchemaToTs from "json-schema-to-ts"
import type * as arkregex from "arkregex"

type RefinePattern<Base, Pattern extends string> = Base extends unknown
	? Base extends string
		? string extends Base
			? arkregex.regex.infer<Pattern, "u">
			: Extract<Base, arkregex.regex.infer<Pattern, "u">>
		: Base
	: never

type ApplyArrayPatternInference<Base, Items> = Items extends readonly unknown[]
	? Base extends readonly unknown[]
		? {
				readonly [K in keyof Base]: K extends keyof Items
					? ApplyPatternInference<Base[K], Items[K]>
					: Base[K]
			}
		: Base
	: Items extends UpstreamJsonSchema
		? Base extends readonly (infer Element)[]
			? ApplyPatternInference<Element, Items>[]
			: Base
		: Base

type ApplyObjectPatternInference<Base, Props> = Base extends object
	? {
			[K in keyof Base]: K extends keyof Props ? ApplyPatternInference<Base[K], Props[K]> : Base[K]
		}
	: Base

type ApplyAllOfPatternInference<Base, Branches> = Branches extends readonly [
	infer Head,
	...infer Tail
]
	? Head extends UpstreamJsonSchema
		? ApplyAllOfPatternInference<ApplyPatternInference<Base, Head>, Tail>
		: ApplyAllOfPatternInference<Base, Tail>
	: Base

type InferBranchPatterns<Branches> = Branches extends readonly (infer Branch)[]
	? Branch extends UpstreamJsonSchema
		? InferDraft07<Branch>
		: never
	: never

type ApplyPatternInference<Base, Schema> = Schema extends { oneOf: infer Branches }
	? InferBranchPatterns<Branches>
	: Schema extends { anyOf: infer Branches }
		? InferBranchPatterns<Branches>
		: Schema extends { allOf: infer Branches }
			? ApplyAllOfPatternInference<Base, Branches>
			: Schema extends { type: "string"; pattern: infer Pattern extends string }
				? RefinePattern<Base, Pattern>
				: Schema extends { type: readonly unknown[]; pattern: infer Pattern extends string }
					? RefinePattern<Base, Pattern>
					: Schema extends { properties: infer Props }
						? ApplyObjectPatternInference<Base, Props>
						: Schema extends { items: infer Items }
							? ApplyArrayPatternInference<Base, Items>
							: Base

type InferDraft07<TSchema extends UpstreamJsonSchema> = ApplyPatternInference<
	JsonSchemaToTs.FromSchema<TSchema>,
	TSchema
>

export type { InferDraft07 }
