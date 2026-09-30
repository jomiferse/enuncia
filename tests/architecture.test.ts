import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../src/", import.meta.url));
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}
const boundaries: Record<string, string[]> = {
  domain: ["domain"],
  data: ["data", "domain"],
  infrastructure: ["infrastructure", "domain"],
  shared: ["shared", "domain"],
};
test("domain, data, infrastructure and shared modules respect dependency boundaries", () => {
  for (const [layer, allowed] of Object.entries(boundaries)) {
    for (const file of files(path.join(root, layer))) {
      const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
      for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
        const specifier = statement.moduleSpecifier;
        if (!specifier || !ts.isStringLiteral(specifier)) continue;
        const target = specifier.text;
        if (!target.startsWith(".")) {
          assert.equal(layer, "shared", `${file} must not depend on external libraries: ${target}`);
          continue;
        }
        const dependency = path.relative(root, path.resolve(path.dirname(file), target)).split(path.sep)[0];
        assert.ok(allowed.includes(dependency), `${path.relative(root, file)} must not depend on ${target}`);
      }
      if (layer === "domain") {
        const visit = (node: ts.Node) => {
          if (ts.isIdentifier(node)) assert.ok(!["window", "document", "localStorage", "sessionStorage", "File", "Blob"].includes(node.text), `${file} must not use browser APIs`);
          ts.forEachChild(node, visit);
        };
        visit(source);
      }
    }
  }
});
