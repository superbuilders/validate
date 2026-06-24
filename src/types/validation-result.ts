import type { StandardJSONSchemaV1, StandardSchemaV1 } from "@standard-schema/spec"
import type { ErrorObject } from "ajv"

type ValidationSuccess<T> = {
	success: true
	data: T
}

type ValidationFailure = {
	success: false
	error: Error
	issues: ErrorObject[]
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

type Validator<T> = StandardSchemaV1<unknown, T> &
	StandardJSONSchemaV1<unknown, T> & {
		parse(value: unknown): ValidationResult<T>
	}

type Infer<TValidator> = TValidator extends Validator<infer T> ? T : never

export type { Infer, ValidationResult, Validator }
