// Pre-render step: turns pubs.bib into HTML fragments that the {{< pubs >}} shortcode on the
// Publications page and home page include. Runs with Quarto's own
// Deno, so no R/Python packages are needed.
//
//   _generated/pubs-all.html       full list, grouped by year
//   _generated/pubs-selected.html  entries with keywords = {selected}

// ---- settings -------------------------------------------------------
const ME_FAMILY = "Balint"; // your surname, as it appears in pubs.bib
const ME_GIVEN_INITIAL = "S"; // first initial, to avoid bolding a namesake
const MAX_AUTHORS = 8; // longer lists are shortened (your name always shown)
// ---------------------------------------------------------------------

const root = Deno.env.get("QUARTO_PROJECT_DIR") ?? ".";
const bibPath = `${root}/pubs.bib`;
const outDir = `${root}/_generated`;

type Name = { family?: string; given?: string; literal?: string };
type Entry = {
  id: string;
  type: string;
  title?: string;
  author?: Name[];
  "container-title"?: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  URL?: string;
  note?: string;
  keyword?: string;
  issued?: { "date-parts"?: number[][] };
};

// ---- 1. Let pandoc parse the BibTeX (handles LaTeX accents, names) ----
async function pandocCsl(): Promise<Entry[]> {
  const bin = Deno.env.get("QUARTO_BIN_PATH");
  const candidates = [
    ...(bin ? [`${bin}/quarto`, `${bin}/quarto.cmd`] : []),
    "quarto",
  ];
  let lastErr: unknown;
  for (const cmd of candidates) {
    try {
      const out = await new Deno.Command(cmd, {
        args: ["pandoc", bibPath, "-f", "bibtex", "-t", "csljson"],
        stdout: "piped",
        stderr: "piped",
      }).output();
      if (!out.success) {
        throw new Error(new TextDecoder().decode(out.stderr));
      }
      return JSON.parse(new TextDecoder().decode(out.stdout));
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Could not convert pubs.bib with pandoc: ${lastErr}`);
}

// ---- 2. Pull the raw entries + custom fields pandoc drops --------------
const EXTRA_FIELDS = ["pdf", "code", "data", "slides", "preprint", "url"];
function rawEntries(src: string): Map<string, { raw: string; extra: Record<string, string> }> {
  const map = new Map();
  const starts = [...src.matchAll(/@(\w+)\s*\{\s*([^,\s]+)\s*,/g)];
  starts.forEach((m, i) => {
    if (/^(comment|string|preamble)$/i.test(m[1])) return;
    const end = i + 1 < starts.length ? starts[i + 1].index! : src.length;
    let raw = src.slice(m.index!, end).trim();
    raw = raw.replace(/\n%[^\n]*/g, "").trim(); // drop trailing comments
    const extra: Record<string, string> = {};
    for (const f of EXTRA_FIELDS) {
      const r = new RegExp(`\\b${f}\\s*=\\s*[{"]([^}"]*)[}"]`, "i").exec(raw);
      if (r) extra[f] = r[1].trim();
    }
    // BibTeX shown in the "Cite" box: drop website-only fields
    const clean = raw
      .split("\n")
      .filter((l) => !/^\s*(pdf|code|data|slides|keywords)\s*=/i.test(l))
      .join("\n")
      .replace(/,(\s*\n\s*\})\s*$/, "$1");
    map.set(m[2], { raw: clean, extra });
  });
  return map;
}

// ---- 3. Formatting helpers --------------------------------------------
const esc = (s = "") =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const initials = (given = "") =>
  given.split(/[\s.]+/).filter(Boolean)
    .map((p) => p.split("-").map((q) => q[0]).join("-")).join("");

const isMe = (a: Name) =>
  a.family === ME_FAMILY && (a.given ?? "").startsWith(ME_GIVEN_INITIAL);

function fmtAuthor(a: Name) {
  const s = a.literal ?? `${a.family ?? ""} ${initials(a.given)}`.trim();
  return isMe(a) ? `<span class="me">${esc(s)}</span>` : esc(s);
}

function fmtAuthors(list: Name[] = []) {
  if (list.length <= MAX_AUTHORS) return list.map(fmtAuthor).join(", ");
  const meIdx = list.findIndex(isMe);
  const head = list.slice(0, MAX_AUTHORS - 2).map(fmtAuthor);
  if (meIdx >= MAX_AUTHORS - 2) head.push("…", fmtAuthor(list[meIdx]));
  const shown = meIdx >= MAX_AUTHORS - 2 ? MAX_AUTHORS - 1 : MAX_AUTHORS - 2;
  return `${head.join(", ")}, <span class="more">+${list.length - shown} more</span>`;
}

const TYPE_BADGE: Record<string, string> = {
  article: "Preprint",
  "paper-conference": "Conference",
  chapter: "Chapter",
  book: "Book",
  thesis: "Thesis",
  report: "Report",
  dataset: "Dataset",
  software: "Software",
};

const year = (e: Entry) => e.issued?.["date-parts"]?.[0]?.[0];

function venue(e: Entry) {
  let v = e["container-title"] ? `<em>${esc(e["container-title"])}</em>` : esc(e.publisher);
  if (e.volume) v += ` ${esc(e.volume)}`;
  if (e.issue) v += `(${esc(e.issue)})`;
  if (e.page) v += `${e.volume ? ":" : ","} ${esc(e.page.replace(/-+/, "–"))}`;
  return v;
}

function link(label: string, href: string, icon: string) {
  return `<a class="pub-btn" href="${esc(href)}"><i class="bi bi-${icon}"></i>${label}</a>`;
}

function entryHtml(e: Entry, raw: ReturnType<typeof rawEntries>, compact = false) {
  const x = raw.get(e.id);
  const extra = x?.extra ?? {};
  const main = e.DOI ? `https://doi.org/${e.DOI}` : extra.url ?? e.URL;
  const title = main ? `<a href="${esc(main)}">${esc(e.title)}</a>` : esc(e.title);
  const badge = TYPE_BADGE[e.type]
    ? `<span class="pub-badge">${TYPE_BADGE[e.type]}</span>` : "";

  const btns: string[] = [];
  if (e.DOI) btns.push(link("DOI", `https://doi.org/${e.DOI}`, "link-45deg"));
  if (extra.pdf) btns.push(link("PDF", extra.pdf, "file-earmark-pdf"));
  if (extra.preprint) btns.push(link("Preprint", extra.preprint, "file-earmark-text"));
  if (extra.code) btns.push(link("Code", extra.code, "github"));
  if (extra.data) btns.push(link("Data", extra.data, "database"));
  if (extra.slides) btns.push(link("Slides", extra.slides, "easel"));

  const cite = !compact && x
    ? `<details class="pub-cite"><summary><i class="bi bi-quote"></i>Cite</summary><pre><code>${esc(x.raw)}</code></pre></details>`
    : "";

  return `<article class="pub${compact ? " pub-compact" : ""}">
  <div class="pub-title">${title}${badge}</div>
  <div class="pub-authors">${fmtAuthors(e.author)}</div>
  <div class="pub-venue">${venue(e)}${compact && year(e) ? ` · ${year(e)}` : ""}</div>
  ${e.note ? `<div class="pub-note">${esc(e.note)}</div>` : ""}
  ${compact ? "" : `<div class="pub-links">${btns.join("")}${cite}</div>`}
</article>`;
}

const html = (s: string) => s + "\n";

// ---- 4. Build --------------------------------------------------------
const src = await Deno.readTextFile(bibPath);
const raw = rawEntries(src);
const entries = (await pandocCsl()).sort(
  (a, b) => (year(b) ?? 9999) - (year(a) ?? 9999) ||
    (a.title ?? "").localeCompare(b.title ?? ""),
);

const byYear = new Map<string, Entry[]>();
for (const e of entries) {
  const y = String(year(e) ?? "In press");
  byYear.set(y, [...(byYear.get(y) ?? []), e]);
}

let all = "";
for (const [y, list] of byYear) {
  all += `<section class="pub-year"><h2 class="pub-year-label" id="y${esc(y)}">${esc(y)}</h2><div class="pub-year-list">
${list.map((e) => entryHtml(e, raw)).join("\n")}
</div></section>\n`;
}

const selected = entries.filter((e) => /\bselected\b/i.test(e.keyword ?? ""));

await Deno.mkdir(outDir, { recursive: true });
await Deno.writeTextFile(`${outDir}/pubs-all.html`, html(all));
await Deno.writeTextFile(
  `${outDir}/pubs-selected.html`,
  html(selected.map((e) => entryHtml(e, raw, true)).join("\n")),
);
console.log(`publications: ${entries.length} entries (${selected.length} selected)`);
