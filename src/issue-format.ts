import type { StandardSchemaV1 } from "@standard-schema/spec"
import type { ErrorObject } from "ajv"

function formatIssues(validationErrors?: readonly ErrorObject[]): string {
	if (validationErrors === undefined || validationErrors.length === 0) {
		return "json schema validation failed"
	}
	return validationErrors
		.map(function formatIssue(issue) {
			let message = issue.message
			if (message === undefined) {
				message = "json schema validation failed"
			}
			if (issue.instancePath.length === 0) {
				return message
			}
			return `${issue.instancePath}: ${message}`
		})
		.join("; ")
}

function issues(validationErrors?: readonly ErrorObject[]): StandardSchemaV1.Issue[] {
	if (validationErrors === undefined || validationErrors.length === 0) {
		return [{ message: "json schema validation failed" }]
	}
	return validationErrors.map(function issueFromError(issue) {
		const path = issue.instancePath
			.split("/")
			.filter(function nonEmpty(part) {
				return part.length > 0
			})
			.map(function pathSegment(part) {
				return { key: part.replaceAll("~1", "/").replaceAll("~0", "~") }
			})
		let message = issue.message
		if (message === undefined) {
			message = "json schema validation failed"
		}
		return { message, path }
	})
}

function validationIssues(validationErrors?: ErrorObject[]): ErrorObject[] {
	if (validationErrors === undefined) {
		return []
	}
	return validationErrors
}

export { formatIssues, issues, validationIssues }
