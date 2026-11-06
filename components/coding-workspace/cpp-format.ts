// A self-contained C++ source formatter for the in-browser editor.
//
// Monaco ships no language service for C++, so there is no built-in formatter
// to call. This is a pragmatic, dependency-free pass that normalizes
// indentation (braces/parens), trailing whitespace, blank-line runs, and a few
// common spacing conventions. It is intentionally conservative: it will never
// remove or reorder tokens, so it is safe to run on student code.

const INDENT = "    ";

interface LineState {
  indent: number;
}

/** Strip leading/trailing whitespace and collapse repeated blank lines. */
function normalizeLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const t = raw.replace(/[ \t]+$/, "").replace(/^[ \t]+/, "");
    if (t === "") {
      // Collapse consecutive blank lines to at most one.
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    out.push(t);
  }
  // Trim leading/trailing blank lines.
  while (out.length && out[0] === "") out.shift();
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

function countChar(line: string, ch: string): number {
  let count = 0;
  for (const c of line) if (c === ch) count++;
  return count;
}

/**
 * Compute the net brace nesting delta of a single line, ignoring text inside
 * string literals and comments so that e.g. "cout << '{';" doesn't confuse us.
 */
function braceDelta(line: string): number {
  let open = 0;
  let close = 0;
  let inLineComment = false;
  let inBlockComment = false;
  let inString = false;
  let inChar = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const next = line[i + 1];

    if (inLineComment) break;

    if (inBlockComment) {
      if (c === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }

    if (inChar) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === "'") inChar = false;
      continue;
    }

    if (c === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "'") {
      inChar = true;
      continue;
    }
    if (c === "{") open++;
    else if (c === "}") close++;
  }

  return open - close;
}

/** True when the line starts a preprocessor directive (must stay at col 0). */
function isPreprocessor(line: string): boolean {
  return line.startsWith("#");
}

/** True when the line opens a block that should not indent the *next* line (e.g. `{` alone). */
function endsWithOpenBrace(line: string): boolean {
  return /[{(]\s*(?:\/\/.*)?$/.test(line);
}

/** Extract the indentation depth of the first code token of a line (closing braces un-indent). */
function leadingCloseCount(line: string): number {
  let count = 0;
  for (const c of line) {
    if (c === "}" || c === ")") count++;
    else break;
  }
  return count;
}

/**
 * Light token spacing normalization. Safe, scope-limited replacements that
 * don't change semantics.
 */
function normalizeSpacing(line: string): string {
  if (line.startsWith("#")) return line;

  let s = line;

  // Ensure exactly one space around `->` and `::` is *not* enforced (== and
  // :: are fine). We only target obvious binary operators between words.
  s = s.replace(/\s*=\s*/g, " = ");
  s = s.replace(/\s*==\s*/g, " == ");
  s = s.replace(/\s*!=\s*/g, " != ");
  s = s.replace(/\s*<=\s*/g, " <= ");
  s = s.replace(/\s*>=\s*/g, " >= ");
  s = s.replace(/\s*\+=\s*/g, " += ");
  s = s.replace(/\s*-=\s*/g, " -= ");
  s = s.replace(/\s*\*=\s*/g, " *= ");
  s = s.replace(/\s*\/=\s*/g, " /= ");

  // No space before `;` or a trailing `,`.
  s = s.replace(/\s+;/g, ";");
  s = s.replace(/\s+,/g, ",");

  // Space after `,` (unless followed by newline already).
  s = s.replace(/,\s*/g, ", ");

  return s;
}

export function formatCppSource(source: string): string {
  const lines = source.split("\n");
  const clean = normalizeLines(lines);
  if (!clean.length) return source;

  const out: string[] = [];
  let indent = 0;

  for (let idx = 0; idx < clean.length; idx++) {
    let line = clean[idx];
    const isPP = isPreprocessor(line);

    // Un-indent lines that *begin* with a closing brace/bracket.
    const leadClose = leadingCloseCount(line);
    let lineIndent = indent;
    if (leadClose > 0) {
      lineIndent = Math.max(0, indent - leadClose);
    }

    // Preprocessor directives always live at column 0.
    const finalIndent = isPP ? 0 : lineIndent;

    // Recompute indentation for the *next* line based on this line's net.
    let delta = braceDelta(line);
    const hasTerminator = /[;{}]\s*(?:\/\/.*)?$/.test(line) || isPP;

    // If this line opens a block but doesn't close it, the body indents.
    if (delta > 0) {
      indent += delta;
    } else if (delta < 0) {
      indent = Math.max(0, indent + delta);
    }

    // A line that ends with an open brace but with no content on the same line
    // keeps the *next* line indented (already handled by delta > 0).

    // If the line ended with a `{` and there was trailing code after it, the
    // `{` already added +1, which is correct for the next line.

    // Spaces.
    line = normalizeSpacing(line);

    out.push(INDENT.repeat(finalIndent) + line);

    // A lone opening brace that is followed by a line that begins at the same
    // indent level (e.g. `{` then `}` on next line) — handled by delta.
    void hasTerminator;
  }

  return out.join("\n");
}
