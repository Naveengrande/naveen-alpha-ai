export type TokType = "kw" | "str" | "com" | "num" | "fn" | "plain";
export interface Tok { t: TokType; s: string }

const KW = new Set(
  (
    "abstract as async await break case catch class const continue debugger default def del do elif else enum except export extends final finally for from function " +
    "global goto if implements import in instanceof interface is lambda let match namespace new nonlocal not of or and package pass private protected public raise " +
    "return self static struct super switch this throw throws try type typeof union unsafe use using var virtual void volatile while with yield true false null None True False " +
    "undefined nil fn impl mut pub trait mod crate where loop go func chan defer select package range map " +
    "int long float double char bool boolean string byte short unsigned signed auto template typename operator inline " +
    "SELECT FROM WHERE JOIN LEFT RIGHT INNER OUTER ON GROUP BY ORDER HAVING LIMIT INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE ALTER DROP INDEX AS AND OR NOT NULL IS IN LIKE DISTINCT UNION ALL CASE WHEN THEN END WITH " +
    "select from where join left right inner outer on group by order having limit insert into values update set delete create table alter drop index as and or not null is in like distinct union all case when then end with " +
    "echo fi done then export local readonly"
  ).split(/\s+/)
);

const HASH = new Set(["python", "py", "bash", "sh", "shell", "zsh", "yaml", "yml", "ruby", "rb", "r", "toml", "dockerfile", "makefile", "perl", "ini", "powershell", "ps1"]);
const DASH = new Set(["sql", "lua", "haskell"]);
const MARKUP = new Set(["html", "xml", "svg", "vue"]);

function buildRegex(lang: string): RegExp {
  let com: string;
  if (HASH.has(lang)) com = "#[^\\n]*";
  else if (DASH.has(lang)) com = "--[^\\n]*|/\\*[\\s\\S]*?\\*/";
  else if (MARKUP.has(lang)) com = "<!--[\\s\\S]*?-->";
  else if (lang === "json") com = "(?!)";
  else com = "//[^\\n]*|/\\*[\\s\\S]*?\\*/";
  const triple = lang === "python" || lang === "py" ? `"""[\\s\\S]*?"""|'''[\\s\\S]*?'''|` : "";
  return new RegExp(
    `(${com})|(${triple}"(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(\\b\\d[\\d_.]*(?:e[+-]?\\d+)?\\b)|([A-Za-z_$][\\w$]*)`,
    "g"
  );
}

const cache = new Map<string, RegExp>();

export function highlight(code: string, langRaw: string): Tok[] {
  const lang = langRaw.toLowerCase();
  if (code.length > 60_000) return [{ t: "plain", s: code }];
  let re = cache.get(lang);
  if (!re) cache.set(lang, (re = buildRegex(lang)));
  re.lastIndex = 0;
  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) out.push({ t: "plain", s: code.slice(last, m.index) });
    if (m[1]) out.push({ t: "com", s: m[1] });
    else if (m[2]) out.push({ t: "str", s: m[2] });
    else if (m[3]) out.push({ t: "num", s: m[3] });
    else if (m[4]) {
      const next = code[m.index + m[4].length];
      out.push({ t: KW.has(m[4]) ? "kw" : next === "(" ? "fn" : "plain", s: m[4] });
    }
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < code.length) out.push({ t: "plain", s: code.slice(last) });
  return out;
}

export const EXT: Record<string, string> = {
  python: "py", py: "py", javascript: "js", js: "js", typescript: "ts", ts: "ts", tsx: "tsx", jsx: "jsx", html: "html", css: "css", sql: "sql", json: "json",
  bash: "sh", sh: "sh", shell: "sh", java: "java", cpp: "cpp", "c++": "cpp", c: "c", csharp: "cs", cs: "cs", go: "go", rust: "rs", rs: "rs", ruby: "rb", php: "php",
  yaml: "yml", yml: "yml", markdown: "md", md: "md", xml: "xml", kotlin: "kt", swift: "swift", r: "r", dockerfile: "Dockerfile", toml: "toml",
};

export const LANG_LABEL: Record<string, string> = {
  py: "Python", python: "Python", js: "JavaScript", javascript: "JavaScript", ts: "TypeScript", typescript: "TypeScript", tsx: "TSX", jsx: "JSX", html: "HTML",
  css: "CSS", sql: "SQL", json: "JSON", bash: "Bash", sh: "Bash", shell: "Bash", java: "Java", cpp: "C++", "c++": "C++", c: "C", cs: "C#", csharp: "C#",
  go: "Go", rust: "Rust", rs: "Rust", ruby: "Ruby", php: "PHP", yaml: "YAML", yml: "YAML", md: "Markdown", markdown: "Markdown", xml: "XML", kotlin: "Kotlin",
  swift: "Swift", r: "R", text: "Text", toml: "TOML", dockerfile: "Dockerfile",
};
