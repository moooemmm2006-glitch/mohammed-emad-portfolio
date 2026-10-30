import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import ar from "../messages/ar.json";
import de from "../messages/de.json";
import en from "../messages/en.json";
import { dirOf, translateMessage, type Messages } from "../src/lib/client/i18n";

const locales = { ar, de, en } as const;

function sourceFiles(folder: string): string[] {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(folder, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : target.endsWith(".tsx") ? [target] : [];
  });
}

describe("interface translations", () => {
  it("keeps Arabic, English, and German keys in sync with nonempty values", () => {
    const keys = Object.keys(ar).sort();
    for (const [locale, messages] of Object.entries(locales)) {
      expect(Object.keys(messages).sort(), `${locale} translation keys`).toEqual(keys);
      for (const [key, value] of Object.entries(messages)) expect(value.trim(), `${locale}.${key}`).not.toBe("");
    }
  });

  it("covers every literal useUI translation key in the UI source", () => {
    const keys = new Set(Object.keys(ar));
    const missing = new Set<string>();
    for (const file of [...sourceFiles("src/app"), ...sourceFiles("src/components")]) {
      const text = fs.readFileSync(file, "utf8");
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t") {
          const arg = node.arguments[0];
          if (arg && ts.isStringLiteral(arg) && !keys.has(arg.text)) missing.add(`${path.relative(".", file)} → ${arg.text}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect([...missing]).toEqual([]);
  });

  it("uses RTL for Arabic, LTR for English and German, and never silently substitutes a missing key", () => {
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
    expect(dirOf("de")).toBe("ltr");
    expect(translateMessage(ar as Messages, "community_nav")).toBe("المجتمع");
    expect(translateMessage(ar as Messages, "cafe_nav")).toBe("كافيه المحادثة");
    expect(translateMessage(ar as Messages, "level_progress")).toBe("تقدّمك في المستوى ده");
    expect(translateMessage(ar as Messages, "missing_example" as keyof typeof ar)).toBe("[missing_example]");
  });
});
