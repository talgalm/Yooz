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
const failures = [];
const fail = (rule, detail) => failures.push({ rule, detail });

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

/** Rule 1 — user-facing text belongs in a sibling .i18n.ts. */
function hebrewOutsideI18n() {
  const counts = {};
  for (const f of sources('client/src')) {
    if (f.endsWith('.i18n.ts') || isSelfCheck(f)) continue;
    const n = stripComments(read(f)).split('\n').filter((l) => HEBREW.test(l)).length;
    if (n) counts[f] = n;
  }
  return counts;
}

/** Rule 9 — SVG markup belongs in a .svg asset or a sibling *.icons.tsx. */
function inlineSvg() {
  const counts = {};
  for (const f of sources('client/src')) {
    if (f.endsWith('.icons.tsx')) continue;
    const n = (read(f).match(/<svg[\s>]/g) || []).length;
    if (n) counts[f] = n;
  }
  return counts;
}

/** Rule 6 — every route and model is described in MEMORY.md. */
function undocumentedModules() {
  const memory = read('MEMORY.md');
  const counts = {};
  for (const f of [...walk('server/src/routes'), ...walk('server/src/models')]) {
    if (!f.endsWith('.ts') || isSelfCheck(f)) continue;
    const name = path.basename(f, '.ts');
    if (!memory.includes(name)) counts[f] = 1;
  }
  return counts;
}

// ─── hard rules ────────────────────────────────────────────────────────────

function hardRules(baseline) {
  // Rule 2 — MUI + @emotion only.
  for (const f of walk('client/src')) {
    if (/\.(css|scss)$/.test(f) && !f.endsWith('App.css')) {
      fail('css', `${f} — styling is MUI + @emotion; App.css is the one exception`);
    }
  }

  for (const f of [...sources('client/src'), ...sources('server/src')]) {
    const lines = read(f).split('\n');
    lines.forEach((line, i) => {
      const at = `${f}:${i + 1}`;
      // Rule 3 — no leftover notes, no commented-out code.
      const note = line.match(/\/\/\s*(TODO|FIXME|XXX|HACK)\b/i);
      if (note) fail('notes', `${at} — leftover ${note[1].toUpperCase()}`);
      if (/^\s*\/\/\s*(const|let|var|import|export|return|await|function|if\s*\()\b/.test(line)) {
        fail('notes', `${at} — commented-out code`);
      }
      // Rule 4 — no debug logging shipped to the browser. The server logs on purpose.
      if (f.startsWith('client/src/') && !isSelfCheck(f) && /console\.(log|debug)\(/.test(line)) {
        fail('console', `${at} — console.log/debug ships to the browser`);
      }
    });
  }

  // Rule 5 — the top level of each package is a deliberate choice.
  for (const [dir, allowed] of Object.entries(baseline.structure)) {
    for (const entry of fs.readdirSync(dir).sort()) {
      if (!allowed.includes(entry)) {
        fail('structure', `${dir}/${entry} is new — add it to "structure" in ${BASELINE_PATH} if that is deliberate`);
      }
    }
  }
}

/** Rule 7 — a feature commit updates MEMORY.md in the same push. */
function docsFollowFeatures(base) {
  let changed;
  try {
    changed = execSync(`git diff --name-status ${base}...HEAD`, { encoding: 'utf8' });
  } catch {
    console.log(`  (skipped the docs-with-features rule: cannot diff against ${base})`);
    return;
  }
  const rows = changed.trim().split('\n').filter(Boolean).map((l) => l.split('\t'));
  const paths = rows.map((r) => r[r.length - 1]);
  if (paths.includes('MEMORY.md')) return;

  const messages = execSync(`git log --format=%B ${base}...HEAD`, { encoding: 'utf8' });
  if (messages.includes('[skip-docs]')) return;

  const featureish = paths.filter((f) => /^server\/src\/(routes|models)\//.test(f))
    .concat(rows.filter((r) => r[0] === 'A' && /^client\/src\/pages\//.test(r[1])).map((r) => r[1]));
  if (featureish.length) {
    fail('docs', `these changed but MEMORY.md did not: ${featureish.slice(0, 5).join(', ')}` +
      `${featureish.length > 5 ? ` (+${featureish.length - 5} more)` : ''}` +
      ' — document it, or put [skip-docs] in the commit message');
  }
}

// ─── baseline comparison ───────────────────────────────────────────────────

function compare(rule, counts, baseline, describe) {
  const allowed = baseline[rule] ?? {};
  for (const [file, n] of Object.entries(counts)) {
    const was = allowed[file] ?? 0;
    if (n > was) {
      fail(rule, was === 0
        ? `${file} — ${describe(n)} (this file had none)`
        : `${file} — ${describe(n)}, up from ${was}`);
    }
  }
  const improved = Object.entries(allowed).some(([f, n]) => (counts[f] ?? 0) < n);
  return improved;
}

// ─── run ───────────────────────────────────────────────────────────────────

const baseline = fs.existsSync(BASELINE_PATH)
  ? JSON.parse(read(BASELINE_PATH))
  : { structure: {}, hebrewOutsideI18n: {}, inlineSvg: {}, undocumentedModules: {} };

const current = {
  structure: {
    'client/src': fs.readdirSync('client/src').sort(),
    'server/src': fs.readdirSync('server/src').sort(),
  },
  hebrewOutsideI18n: hebrewOutsideI18n(),
  inlineSvg: inlineSvg(),
  undocumentedModules: undocumentedModules(),
};

if (UPDATE) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Baseline written to ${BASELINE_PATH} — commit it.`);
  process.exit(0);
}

hardRules(baseline);
const improvements = [
  compare('hebrewOutsideI18n', current.hebrewOutsideI18n, baseline,
    (n) => `${n} Hebrew line${n > 1 ? 's' : ''} outside a .i18n.ts`),
  compare('inlineSvg', current.inlineSvg, baseline,
    (n) => `${n} inline <svg>; move it to a .svg asset or a sibling *.icons.tsx`),
  compare('undocumentedModules', current.undocumentedModules, baseline,
    () => 'not mentioned anywhere in MEMORY.md'),
].some(Boolean);

if (DIFF_BASE) docsFollowFeatures(DIFF_BASE);

if (failures.length) {
  const byRule = {};
  for (const { rule, detail } of failures) (byRule[rule] ??= []).push(detail);
  console.error('\nGuideline violations:\n');
  for (const [rule, details] of Object.entries(byRule)) {
    console.error(`  ${rule} (${details.length})`);
    for (const d of details.slice(0, 20)) console.error(`    - ${d}`);
    if (details.length > 20) console.error(`    ... and ${details.length - 20} more`);
    console.error('');
  }
  process.exit(1);
}

if (improvements && !process.env.CI) {
  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Guidelines pass. Violations went down — ${BASELINE_PATH} updated, commit it.`);
} else {
  console.log('Guidelines pass.');
}
