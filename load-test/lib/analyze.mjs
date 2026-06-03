/**
 * Analyze k6 summary JSON + health probes → pass/fail, bottlenecks, improvements.
 */

import { formatMs, formatPct } from './shared.mjs';
import { extractEndpointBreakdown, printEndpointBreakdown } from './endpoints.mjs';

const BOTTLENECK_RULES = [
  {
    id: 'atlas_saturation',
    when: (m) => m.loginP95 > 2000 || m.progressP95 > 1500,
    symptom: 'Login or progress writes slow under load',
    cause: 'Atlas Flex cluster CPU/IOPS saturated under write storm. 2 PM2 instances × 100 pool = 200 open connections; Atlas Flex caps vary by tier.',
    fix: 'Open Atlas Performance Advisor during the test — look for slow queries, high CPU, or disk IOPS hitting the limit. Upgrade Atlas tier if CPU > 80% sustained.',
    priority: 'high',
  },
  {
    id: 'cpu_saturation',
    when: (m) => m.overallP95 > 3000 && m.errorRate < 0.02,
    symptom: 'High latency but low error rate — system stays up but feels slow',
    cause: '2 PM2 instances share 2 vCPUs on t3.medium; each Node process gets ~1 vCPU. CPU queue buildup increases p95 without causing hard errors.',
    fix: 'Run `top` or `mpstat 1 10` on EC2 during the test. If CPU > 90%, upgrade to t3.large (4 vCPU) or reduce concurrent VUs.',
    priority: 'medium',
  },
  {
    id: 'write_contention',
    when: (m) => m.progressFailRate > 0.02 || m.scoresFailRate > 0.02,
    symptom: 'Progress or score saves failing above 2%',
    cause: 'Concurrent Report.findOneAndUpdate with $ne array check — on a cache miss it fires a second query. Under wave load both queries race on Atlas.',
    fix: 'Check Atlas slow query log for PATCH /progress during the test. If p99 > 5s, consider removing the duplicate-itemIndex guard (idempotency is already handled by upsert logic).',
    priority: 'high',
  },
  {
    id: 'nginx_timeout',
    when: (m) => m.errorRate > 0.05 && m.http502 > 0,
    symptom: '502/504 errors from nginx',
    cause: 'Upstream Node process overwhelmed or restarting (PM2 max_memory_restart: 400M per instance).',
    fix: 'Check /var/log/yooz/error.log and `pm2 monit` during test. If memory restarts, increase limit or profile for leaks with `pm2 trigger yooz km:heapdump`.',
    priority: 'high',
  },
  {
    id: 'atlas_health_degraded',
    when: (m) => m.healthAfter?.latencyMs > 500 || m.healthAfter?.body?.status === 'down',
    symptom: 'Health check degraded after load test',
    cause: 'Atlas cluster still draining connections or recovering from write burst after test ended.',
    fix: 'Open Atlas Metrics → Connections + CPU during the test window. If CPU peaked > 80%, upgrade tier. If connections maxed out, reduce maxPoolSize per instance.',
    priority: 'high',
  },
];

function metricValues(summary, names) {
  for (const name of names) {
    const m = summary?.metrics?.[name];
    if (!m) continue;
    if (m.values) return m.values;
    if (m['p(95)'] != null || m.avg != null || m.count != null) return m;
  }
  return null;
}

function rateValue(summary, names) {
  for (const name of names) {
    const m = summary?.metrics?.[name];
    if (!m) continue;
    if (m.values?.rate != null) return m.values.rate;
    if (typeof m.value === 'number') return m.value;
  }
  return null;
}

function trendP95(summary, names) {
  const v = metricValues(summary, names);
  return v?.['p(95)'] ?? null;
}

function requestCount(summary) {
  const m = summary?.metrics?.http_reqs;
  if (!m) return 0;
  return m.count ?? m.values?.count ?? 0;
}

export function extractMetrics(summary, level, healthBefore, healthAfter, logText = '') {
  const httpFailed = rateValue(summary, ['http_req_failed']);
  const endpointBreakdown = extractEndpointBreakdown(summary, logText);

  return {
    level,
    errorRate: httpFailed ?? 0,
    checksPassRate: null,
    overallP95: trendP95(summary, ['http_req_duration']),
    loginP95: trendP95(summary, ['custom_login_ms', 'http_req_duration{endpoint:login}']),
    moduleP95: trendP95(summary, ['custom_module_ms', 'http_req_duration{endpoint:module}']),
    progressP95: trendP95(summary, ['custom_progress_ms', 'http_req_duration{endpoint:progress}']),
    scoresP95: trendP95(summary, ['custom_scores_ms', 'http_req_duration{endpoint:scores}']),
    leaderboardP95: trendP95(summary, ['custom_leaderboard_ms', 'http_req_duration{endpoint:leaderboard}']),
    loginFailRate: rateValue(summary, ['custom_login_fail']) ?? 0,
    progressFailRate: rateValue(summary, ['custom_progress_fail']) ?? 0,
    scoresFailRate: rateValue(summary, ['custom_scores_fail']) ?? 0,
    httpReqs: requestCount(summary),
    vusMax: summary?.metrics?.vus_max?.max ?? summary?.metrics?.vus_max?.values?.max ?? level.vus,
    healthBefore,
    healthAfter,
    endpointBreakdown,
    http502: 0,
    thresholdsFailed: Object.entries(summary.metrics || {})
      .filter(([, m]) => m.thresholds)
      .flatMap(([name, m]) =>
        Object.entries(m.thresholds)
          .filter(([, t]) => t.ok === false)
          .map(([th]) => `${name}: ${th}`),
      ),
  };
}

export function evaluateLevel(metrics) {
  const c = metrics.level.passCriteria || {};
  const maxOverall = c.httpReqFailedRate ?? 0.05;
  const maxEndpoint = c.endpointMaxFailRate ?? 0.01;
  const failures = [];

  if (metrics.errorRate > maxOverall) {
    failures.push(`Overall HTTP error rate ${formatPct(metrics.errorRate)} > ${formatPct(maxOverall)}`);
  }
  if (metrics.overallP95 != null && c.p95Ms != null && metrics.overallP95 > c.p95Ms) {
    failures.push(`Overall p95 ${formatMs(metrics.overallP95)} > ${formatMs(c.p95Ms)}`);
  }
  if (metrics.loginP95 != null && c.loginP95Ms != null && metrics.loginP95 > c.loginP95Ms) {
    failures.push(`Login p95 ${formatMs(metrics.loginP95)} > ${formatMs(c.loginP95Ms)}`);
  }
  if (!metrics.healthAfter?.ok) {
    failures.push(`Health check failed after test (${metrics.healthAfter?.status || 'timeout'})`);
  }

  for (const row of metrics.endpointBreakdown?.rows || []) {
    if (row.fails === 0) continue;
    if (row.failRate > maxEndpoint) {
      failures.push(
        `${row.method} ${row.path}: ${row.fails}/${row.total} failed (${formatPct(row.failRate)} > ${formatPct(maxEndpoint)})`,
      );
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

export function diagnose(metrics) {
  const hits = BOTTLENECK_RULES.filter((r) => r.when(metrics));
  const recommendations = [];

  if (metrics.overallP95 > 2000) {
    recommendations.push({
      priority: 'medium',
      action: 'Run Atlas Performance Advisor and `pm2 monit` during the test to confirm whether the bottleneck is Atlas CPU/IOPS or EC2 CPU.',
    });
  }

  if (metrics.level.vus >= 1000 && metrics.errorRate < 0.02) {
    recommendations.push({
      priority: 'info',
      action: '1000 VUs passed — run wave-scores and manager-polling edge scenarios to validate concurrent final-submit and manager dashboard under live load.',
    });
  }

  for (const rule of hits) {
    recommendations.push({
      priority: rule.priority,
      action: rule.fix,
      context: `${rule.symptom}. Likely cause: ${rule.cause}`,
    });
  }

  if (recommendations.length === 0 && metrics.passed) {
    recommendations.push({
      priority: 'info',
      action: 'No obvious bottleneck at this level — proceed to the next level.',
    });
  }

  return { hits, recommendations };
}

export function printLevelReport(metrics, evaluation, diagnosis) {
  const status = evaluation.passed ? '✅ PASS' : '❌ FAIL';
  const bar = '═'.repeat(60);

  console.log(`\n${bar}`);
  console.log(`Level ${metrics.level.id}: ${metrics.level.name} — ${status}`);
  console.log(`${metrics.level.description} (${metrics.level.vus} VUs)`);
  console.log(bar);

  console.log('\n📊 Metrics');
  console.log(`  HTTP requests:     ${metrics.httpReqs}`);
  console.log(`  Max VUs:           ${metrics.vusMax}`);
  console.log(`  Error rate:        ${formatPct(metrics.errorRate)}`);
  console.log(`  Overall p95:       ${formatMs(metrics.overallP95)}`);
  console.log(`  Login p95:         ${formatMs(metrics.loginP95)}`);
  console.log(`  Module p95:        ${formatMs(metrics.moduleP95)}`);
  console.log(`  Progress p95:      ${formatMs(metrics.progressP95)}`);
  console.log(`  Scores p95:        ${formatMs(metrics.scoresP95)}`);
  console.log(`  Leaderboard p95:   ${formatMs(metrics.leaderboardP95)}`);

  console.log('\n🏥 Health');
  console.log(`  Before: ${metrics.healthBefore?.ok ? 'ok' : 'FAIL'} ${formatMs(metrics.healthBefore?.latencyMs)}`);
  console.log(`  After:  ${metrics.healthAfter?.ok ? 'ok' : 'FAIL'} ${formatMs(metrics.healthAfter?.latencyMs)}`);

  if (evaluation.failures.length) {
    console.log('\n⚠️  Criteria & endpoint failures');
    for (const f of evaluation.failures) console.log(`  • ${f}`);
  }

  printEndpointBreakdown(metrics.endpointBreakdown);

  if (diagnosis.hits.length) {
    console.log('\n🔍 Likely bottlenecks');
    for (const h of diagnosis.hits) {
      console.log(`  • [${h.priority}] ${h.symptom}`);
      console.log(`    → ${h.fix}`);
    }
  }

  if (diagnosis.recommendations.length) {
    console.log('\n💡 How to improve');
    for (const r of diagnosis.recommendations) {
      console.log(`  • [${r.priority}] ${r.action}`);
      if (r.context) console.log(`    (${r.context})`);
    }
  }

  console.log(`\n${bar}\n`);
}

export function printFinalSummary(allResults, title = 'FINAL SUMMARY') {
  console.log('\n' + '═'.repeat(72));
  console.log(title);
  console.log('═'.repeat(72));
  console.log('Test          │ VUs  │ Status │ Errors  │ Worst endpoint failure');
  console.log('──────────────┼──────┼────────┼─────────┼────────────────────────────');

  for (const r of allResults) {
    const m = r.metrics;
    const label = r.testLabel || `${m.level.id} ${m.level.name}`;
    const status = r.evaluation.passed ? 'PASS' : 'FAIL';
    const worst = worstEndpointFailure(m.endpointBreakdown);
    console.log(
      `${label.padEnd(13)} │ ${String(m.level.vus ?? '—').padEnd(4)} │ ${status.padEnd(6)} │ ${formatPct(m.errorRate).padEnd(7)} │ ${worst}`,
    );
  }

  console.log('\n📍 Aggregated failures by endpoint (all tests)');
  const agg = aggregateEndpointFailures(allResults);
  if (agg.length === 0) {
    console.log('  (none)');
  } else {
    for (const a of agg) {
      console.log(`  • ${a.method} ${a.path}: ${a.totalFails} fails across ${a.tests} test(s)`);
      for (const [err, n] of Object.entries(a.logErrors).sort((x, y) => y[1] - x[1]).slice(0, 5)) {
        console.log(`      └─ ${err}: ${n}`);
      }
    }
  }

  const failed = allResults.filter((r) => !r.evaluation.passed);
  if (failed.length) {
    console.log(`\n🛑 ${failed.length} test(s) failed strict criteria (endpoint fail rate > limit or health down).`);
  } else if (allResults.length) {
    console.log('\n✅ All tests passed strict endpoint criteria.');
  }

  console.log('\n📁 Results: load-test/results/');
  console.log('═'.repeat(72));
}

function worstEndpointFailure(breakdown) {
  const rows = breakdown?.rows?.filter((r) => r.fails > 0) || [];
  if (!rows.length) return 'none';
  const w = rows[0];
  return `${w.method} ${w.endpoint} ${w.fails} fails (${formatPct(w.failRate)})`;
}

function aggregateEndpointFailures(allResults) {
  const map = new Map();
  for (const r of allResults) {
    for (const row of r.metrics.endpointBreakdown?.rows || []) {
      if (row.fails === 0) continue;
      const k = `${row.method}:${row.path}`;
      const cur = map.get(k) || {
        method: row.method,
        path: row.path,
        totalFails: 0,
        tests: 0,
        logErrors: {},
      };
      cur.totalFails += row.fails;
      cur.tests += 1;
      const epLog = r.metrics.endpointBreakdown.logBreakdown?.byEndpoint?.[row.endpoint] || {};
      for (const [err, n] of Object.entries(epLog)) {
        cur.logErrors[err] = (cur.logErrors[err] || 0) + n;
      }
      map.set(k, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.totalFails - a.totalFails);
}
