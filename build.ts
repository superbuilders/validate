import { rm } from "node:fs/promises"
import { join } from "node:path"

const srcDir = join(import.meta.dirname, "src")
const outDir = join(import.meta.dirname, "dist")

await rm(outDir, { recursive: true, force: true })

const entrypoints = [
	"validate.ts",
	"ajv-instance.ts",
	"build-validator.ts",
	"compile.ts",
	"draft07.ts",
	"errors.ts",
	"issue-format.ts",
	"schemas/house-guards.ts",
	"schemas/infer-draft07.ts",
	"schemas/regex-patterns.ts",
	"schemas/schema-keywords.ts",
	"types/json-schema.ts",
	"types/validation-result.ts"
].map((entry) => join(srcDir, entry))

const build = await Bun.build({
	entrypoints,
	outdir: outDir,
	root: srcDir,
	format: "esm",
	target: "node",
	splitting: false,
	sourcemap: "external",
	external: [
		"@standard-schema/spec",
		"@superbuilders/errors",
		"ajv",
		"arkregex",
		"json-schema-to-ts",
		"@superbuilders/validate/*"
	]
})

if (!build.success) {
	for (const log of build.logs) {
		process.stderr.write(`${log.message}\n`)
	}
	process.exit(1)
}

const tsc = Bun.spawn(
	["tsgo", "--emitDeclarationOnly", "--noEmit", "false", "--rootDir", "src", "--outDir", outDir],
	{ cwd: import.meta.dirname, stdout: "inherit", stderr: "inherit" }
)

const tscExit = await tsc.exited
if (tscExit !== 0) {
	process.exit(tscExit)
}

const resolvePaths = Bun.spawn(["bun", "--bun", "resolve-tspaths", "--out", outDir], {
	cwd: import.meta.dirname,
	stdout: "inherit",
	stderr: "inherit"
})

const resolveExit = await resolvePaths.exited
if (resolveExit !== 0) {
	process.exit(resolveExit)
}
