#!/usr/bin/env node
/**
 * The CLAUDE.md conventions a machine can check. Runs from `npm run check`, so
 * the same command gates locally and in CI.
 *
 * Two kinds of rule:
 *
 *   Hard rules are already at zero and stay there — a single hit fails.
 *   Counted rules carry a per-file baseline in guidelines-baseline.json: a file
 *   may not get worse, and a file absent from the baseline may not have any
 *   violations at all. Per file, not a global total, so a new violation cannot
 *   hide behind someone else's fix.
 *
 * Fixes shrink the baseline: it rewrites itself locally (never in CI) and asks
 * you to commit it.
 *
 *   node scripts/guidelines.mjs                 # check
 *   node scripts/guidelines.mjs --diff <ref>    # also the docs-with-features rule
 *   node scripts/guidelines.mjs --update        # accept the current state as the baseline
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BASELINE_PATH = 'scripts/guidelines-baseline.json';
const argv = process.argv.slice(2);
const UPDATE = argv.includes('--update');
const DIFF_BASE = argv.includes('--diff') ? argv[argv.indexOf('--diff') + 1] : null;

const HEBREW = /[֐-׿]/;

// ─── how each rule explains itself ─────────────────────────────────────────
// Every rule says what it wants and how to satisfy it, so a red build is
// self-explanatory and nobody has to come back here to read the source.

const RULES = {
  i18n: {
    title: 'User-facing text belongs in a .i18n.ts',
    fix: [
      'Move the string into the sibling <Component>.i18n.ts (a folder-level file is fine),',
      'then read it with `const t = useTranslations(texts)`.',
      'Interpolated text is a function there, not a template built in the component:',
      '  attempt: (n: number) => `ניסיון ${n}`',
      'Outside a component, take `lang` and call `translate(texts, lang)`.',
    ],
  },
  svg: {
    title: 'SVG belongs in its own file',
    fix: [
      'Static art → a .svg file in client/public/images, used as <img src="/images/x.svg">.',
      'Parameterised by props, colour or state → a sibling <Component>.icons.tsx,',
      'the same co-location shape as .i18n.ts.',
    ],
  },
  css: {
    title: 'Styling is MUI + @emotion, not stylesheets',
    fix: [
      'Delete the stylesheet and express it with styled() or the sx prop.',
      'client/src/App.css is the one allowed file (the global reset).',
    ],
  },
  notes: {
    title: 'No leftover notes or commented-out code',
    fix: [
      'Delete it. A TODO that matters belongs in an issue; code that matters belongs',
      'in git history, which already has it.',
    ],
  },
  console: {
    title: 'No debug logging in client code',
    fix: [
      'Remove the console.log/debug — it ships to the browser and shows up in a',
      "participant's console. Server-side logging is deliberate and exempt, and so",
      'are *.test.ts / *.check.ts / *.selfcheck.ts files.',
    ],
  },
  structure: {
    title: 'The top level of each package is a deliberate list',
    fix: [
      'If the new entry belongs there, add it to "structure" in the baseline:',
      '  npm run guidelines -- --update   (then commit the baseline)',
      'If it does not, move it under an existing folder.',
    ],
  },
  docs: {
    title: 'A feature updates MEMORY.md in the same push',
    fix: [
      'MEMORY.md is the source of truth for routes, models and pages. Add the new',
      'endpoint/schema/page to it in this branch.',
      'Genuinely not worth documenting? Put [skip-docs] in the commit message.',
    ],
  },
};

const findings = [];
const fail = (rule, finding) => findings.push({ rule, ...finding });

// ─── output helpers ────────────────────────────────────────────────────────

const plain = process.env.NO_COLOR || process.env.CI || !process.stdout.isTTY;
const paint = (code, s) => (plain ? s : `[${code}m${s}[0m`);
const bold = (s) => paint('1', s);
const red = (s) => paint('31', s);
const dim = (s) => paint('90', s);
const green = (s) => paint('32', s);

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// ─── file helpers ──────────────────────────────────────────────────────────

const posix = (f) => f.split(path.sep).join('/');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    entry.isDirectory() ? walk(full, out) : out.push(posix(full));
  }
  return out;
}

const sources = (dir) => walk(dir).filter((f) => /\.tsx?$/.test(f));
const isSelfCheck = (f) => /\.(test|check|selfcheck)\.ts$/.test(f);
const read = (f) => fs.readFileSync(f, 'utf8');

/**
 * Blank out comments so a Hebrew word quoted inside an English comment is not a
 * violation. ponytail: not a real parser — a `//` inside a string literal ends
 * the line early, which can only ever hide a violation, never invent one.
 */
function stripComments(text) {
  let inBlock = false;
  return text.split('\n').map((line) => {
    let l = line;
    if (inBlock) {
      const end = l.indexOf('*/');
      if (end < 0) return '';
      l = l.slice(end + 2);
      inBlock = false;
    }
    const block = l.indexOf('/*');
    const slash = l.search(/(?<!:)\/\//); // not the // in https://
    if (block >= 0 && (slash < 0 || block < slash)) {
      const end = l.indexOf('*/', block + 2);
      if (end < 0) {
        inBlock = true;
        return l.slice(0, block);
      }
      return l.slice(0, block) + l.slice(end + 2);
    }
    return slash >= 0 ? l.slice(0, slash) : l;
  }).join('\n');
}

// ─── counted rules ─────────────────────────────────────────────────────────

/** Rule: user-facing text belongs in a sibling .i18n.ts. */
function hebrewOutsideI18n() {
  const counts = {};
  const examples = {};
  for (const f of sources('client/src')) {
    if (f.endsWith('.i18n.ts') || isSelfCheck(f)) continue;
    const lines = stripComments(read(f)).split('\n');
    const hits = lines.map((l, i) => [l, i + 1]).filter(([l]) => HEBREW.test(l));
    if (hits.length) {
      counts[f] = hits.length;
      examples[f] = hits[0];
    }
  }
  return { counts, examples };
}

/** Rule: SVG markup belongs in a .svg asset or a sibling *.icons.tsx. */
function inlineSvg() {
  const counts = {};
  const examples = {};
  for (const f of sources('client/src')) {
    if (f.endsWith('.icons.tsx')) continue;
    const lines = read(f).split('\n');
    const hits = lines.map((l, i) => [l, i + 1]).filter(([l]) => /<svg[\s>]/.test(l));
    if (hits.length) {
      counts[f] = hits.length;
      examples[f] = hits[0];
    }
  }
  return { counts, examples };
}

/** Rule: every route and model is described in MEMORY.md. */
function undocumentedModules() {
  const memory = read('MEMORY.md');
  const counts = {};
  for (const f of [...walk('server/src/routes'), ...walk('server/src/models')]) {
    if (!f.endsWith('.ts') || isSelfCheck(f)) continue;
    if (!memory.includes(path.basename(f, '.ts'))) counts[f] = 1;
  }
  return { counts, examples: {} };
}

// ─── hard rules ────────────────────────────────────────────────────────────

function hardRules(baseline) {
  for (const f of walk('client/src')) {
    if (/\.(css|scss)$/.test(f) && !f.endsWith('App.css')) {
      fail('css', { file: f, note: 'stylesheet' });
    }
  }

  for (const f of [...sources('client/src'), ...sources('server/src')]) {
    read(f).split('\n').forEach((line, i) => {
      const at = { file: f, line: i + 1, source: line.trim() };
      const note = line.match(/\/\/\s*(TODO|FIXME|XXX|HACK)\b/i);
      if (note) fail('notes', { ...at, note: `leftover ${note[1].toUpperCase()}` });
      if (/^\s*\/\/\s*(const|let|var|import|export|return|await|function|if\s*\()\b/.test(line)) {
        fail('notes', { ...at, note: 'commented-out code' });
      }
      if (f.startsWith('client/src/') && !isSelfCheck(f) && /console\.(log|debug)\(/.test(line)) {
        fail('console', { ...at, note: 'debug log' });
      }
    });
  }

  for (const [dir, allowed] of Object.entries(baseline.structure)) {
    for (const entry of fs.readdirSync(dir).sort()) {
      if (!allowed.includes(entry)) {
        fail('structure', { file: `${dir}/${entry}`, note: 'new top-level entry' });
      }
    }
  }
}

/** Rule: a feature commit updates MEMORY.md in the same push. */
function docsFollowFeatures(base) {
  let changed;
  try {
    changed = execSync(`git diff --name-status ${base}...HEAD`, { encoding: 'utf8' });
  } catch {
    console.log(dim(`  (docs rule skipped: cannot diff against ${base})`));
    return;
  }
  const rows = changed.trim().split('\n').filter(Boolean).map((l) => l.split('\t'));
  const paths = rows.map((r) => r[r.length - 1]);
  if (paths.includes('MEMORY.md')) return;
  if (execSync(`git log --format=%B ${base}...HEAD`, { encoding: 'utf8' }).includes('[skip-docs]')) return;

  const featureish = paths.filter((f) => /^server\/src\/(routes|models)\//.test(f))
    .concat(rows.filter((r) => r[0] === 'A' && /^client\/src\/pages\//.test(r[1])).map((r) => r[1]));
  for (const f of featureish) fail('docs', { file: f, note: 'changed, but MEMORY.md did not' });
}

// ─── baseline comparison ───────────────────────────────────────────────────

function compare(rule, { counts, examples }, baseline, describe) {
  const allowed = baseline[rule] ?? {};
  for (const [file, n] of Object.entries(counts)) {
    const was = allowed[file] ?? 0;
    if (n <= was) continue;
    if (was === 0) {
      // Nothing was allowed here, so the first hit is the violation — point at it.
      const [source, line] = examples[file] ?? [];
      fail(rule, { file, line, source: source?.trim(), note: describe(n) });
    } else {
      // The file already carried some. Which one is new is only knowable from the
      // diff, so say so rather than pointing at a line that was always there.
      fail(rule, { file, note: `${describe(n)} — the baseline allows ${was}; the new one is in your diff` });
    }
  }
  return Object.entries(allowed).some(([f, n]) => (counts[f] ?? 0) < n);
}

// ─── report ────────────────────────────────────────────────────────────────

function report() {
  const byRule = new Map();
  for (const f of findings) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push(f);
  }

  console.error('');
  console.error(red(bold(`✗ ${findings.length} problem${findings.length > 1 ? 's' : ''} ` +
    `across ${byRule.size} rule${byRule.size > 1 ? 's' : ''}.`)));

  for (const [rule, hits] of byRule) {
    const { title, fix } = RULES[rule];
    console.error('');
    console.error(bold(`── ${title} ${'─'.repeat(Math.max(0, 62 - title.length))}`));
    for (const line of fix) console.error(dim(`   ${line}`));
    console.error('');

    const shown = hits.slice(0, 15);
    const width = Math.max(...shown.map((h) => `${h.file}${h.line ? `:${h.line}` : ''}`.length));
    for (const h of shown) {
      const where = `${h.file}${h.line ? `:${h.line}` : ''}`;
      console.error(`   ${where.padEnd(width)}  ${h.note}`);
      if (h.source) console.error(`   ${' '.repeat(width)}  ${dim(clip(h.source, 88))}`);
    }
    if (hits.length > shown.length) {
      console.error(dim(`   … and ${hits.length - shown.length} more`));
    }
  }

  console.error('');
  console.error(dim('Re-check with `npm run guidelines`. The full rules are in CLAUDE.md.'));
  console.error('');
}

// ─── run ───────────────────────────────────────────────────────────────────

const baseline = fs.existsSync(BASELINE_PATH)
  ? JSON.parse(read(BASELINE_PATH))
  : { structure: {}, i18n: {}, svg: {}, docs: {} };

const measured = {
  i18n: hebrewOutsideI18n(),
  svg: inlineSvg(),
  docs: undocumentedModules(),
};

const current = {
  structure: {
    'client/src': fs.readdirSync('client/src').sort(),
    'server/src': fs.readdirSync('server/src').sort(),
  },
  i18n: measured.i18n.counts,
  svg: measured.svg.counts,
  docs: measured.docs.counts,
};

if (UPDATE) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Baseline written to ${BASELINE_PATH} — commit it.`);
  process.exit(0);
}

hardRules(baseline);
const improved = [
  compare('i18n', measured.i18n, baseline, (n) => `${n} Hebrew line${n > 1 ? 's' : ''} outside a .i18n.ts`),
  compare('svg', measured.svg, baseline, (n) => `${n} inline <svg>`),
  compare('docs', measured.docs, baseline, () => 'not mentioned anywhere in MEMORY.md'),
].some(Boolean);

if (DIFF_BASE) docsFollowFeatures(DIFF_BASE);

if (findings.length) {
  report();
  process.exit(1);
}

if (improved && !process.env.CI) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
  console.log(green('✓ Guidelines pass.') + ` Violations went down — ${BASELINE_PATH} updated, commit it.`);
} else {
  console.log(green('✓ Guidelines pass.'));
}
