// Turns the Vitest JSON report (and the coverage summary, when the run produced
// one) into a Markdown block for the GitHub Actions run summary. That way a
// green CI run says what it verified on its own page, instead of hiding the
// numbers inside a job log.
//
// Usage: node scripts/ci-summary.mjs [vitest-report.json]

import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { basename, relative } from "node:path";

const reportPath = process.argv[2] ?? "vitest-report.json";
const coveragePath = "coverage/coverage-summary.json";
const summaryPath = process.env.GITHUB_STEP_SUMMARY;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function relativeToRoot(file) {
  return relative(process.cwd(), file).replaceAll("\\", "/");
}

function renderReport(report) {
  const files = report.testResults ?? [];
  const tests = files.flatMap((file) => file.assertionResults ?? []);
  const failed = tests.filter((test) => test.status === "failed");
  const passed = tests.filter((test) => test.status === "passed");
  const skipped = tests.filter(
    (test) => test.status === "pending" || test.status === "skipped" || test.status === "todo",
  );

  const lines = [];
  const icon = report.success ? "✅" : "❌";
  const suites = `${files.length} test ${files.length === 1 ? "file" : "files"}`;

  lines.push(`## ${icon} Vitest — ${passed.length} passed${failed.length ? `, ${failed.length} failed` : ""}`);
  lines.push("");
  lines.push(`**${suites} · ${tests.length} tests · ${passed.length} passed · ${skipped.length} skipped · ${failed.length} failed**`);
  lines.push("");

  lines.push("| File | Tests | Passed | Failed |");
  lines.push("| --- | ---: | ---: | ---: |");
  for (const file of [...files].sort((a, b) => relativeToRoot(a.name).localeCompare(relativeToRoot(b.name)))) {
    const results = file.assertionResults ?? [];
    const fileFailed = results.filter((test) => test.status === "failed").length;
    lines.push(
      `| \`${relativeToRoot(file.name)}\` | ${results.length} | ${results.length - fileFailed} | ${fileFailed} |`,
    );
  }
  lines.push("");

  if (failed.length > 0) {
    lines.push("### Failed");
    lines.push("");
    for (const test of failed) {
      lines.push(`- ${test.fullName ?? test.title}`);
    }
    lines.push("");
  }

  return lines;
}

function renderCoverage(coverage) {
  const total = coverage?.total;
  if (!total) return [];

  const percent = (metric) => `${total[metric]?.pct ?? "?"}%`;
  const counts = (metric) => `${total[metric]?.covered}/${total[metric]?.total}`;

  return [
    "### Coverage",
    "",
    "| Statements | Branches | Functions | Lines |",
    "| ---: | ---: | ---: | ---: |",
    `| ${percent("statements")} | ${percent("branches")} | ${percent("functions")} | ${percent("lines")} |`,
    `| ${counts("statements")} | ${counts("branches")} | ${counts("functions")} | ${counts("lines")} |`,
    "",
    "Thresholds enforced by `vite.config.ts` (statements/branches/functions/lines): 72 / 74 / 70 / 76.",
    "",
  ];
}

const report = existsSync(reportPath) ? readJson(reportPath) : undefined;
const coverage = existsSync(coveragePath) ? readJson(coveragePath) : undefined;

const body = [
  `### ${basename(process.cwd())} test suite`,
  "",
  ...(report ? renderReport(report) : ["> Vitest JSON report not found; skipping test totals.", ""]),
  ...renderCoverage(coverage),
].join("\n");

process.stdout.write(`${body}\n`);
if (summaryPath) {
  appendFileSync(summaryPath, `${body}\n`);
}
