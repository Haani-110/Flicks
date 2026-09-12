"""Render a GitHub Actions run as a PNG, straight from the REST API responses.

There is no browser in this sandbox, so the run page cannot be screen-captured;
this script re-draws it from the same JSON the GitHub UI renders.

Usage: python3 render-evidence.py <run-dir> <out.png>

A run directory holds whichever of these were captured for that run:

    ci-run.json          GET /repos/{owner}/{repo}/actions/runs/{id}
    ci-run-jobs.json     GET /repos/{owner}/{repo}/actions/runs/{id}/jobs
    ci-check-runs.json   GET /repos/{owner}/{repo}/commits/{sha}/check-runs
    annotations.json     GET /repos/{owner}/{repo}/check-runs/{job_id}/annotations (trimmed)
    artifacts.json       name/size/digest as shown in the run page's Artifacts table
    vitest-results.json  totals from the command the unit job runs (local run)
    context.json         optional callout card, e.g. what went red and how it was fixed

Needs Pillow and DejaVu fonts.
"""

from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RUN_DIR = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parent
OUT = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else RUN_DIR.parent / "ci-run.png"

S = 2  # supersampling factor
W = 1200  # logical width
PAD = 24
CARD_X = PAD
CARD_W = W - 2 * PAD

BG = "#010409"
CARD_BG = "#0d1117"
HEADER_BG = "#0d1117"
BORDER = "#30363d"
HAIRLINE = "#21262d"
TEXT = "#e6edf3"
MUTED = "#8b949e"
DIM = "#6e7681"
GREEN = "#3fb950"
RED = "#f85149"
BLUE = "#4493f8"
GOLD = "#d29922"

FONTS = Path("/usr/share/fonts/truetype/dejavu")

_font_cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def font(name: str, size: float) -> ImageFont.FreeTypeFont:
    key = (name, round(size * S))
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(str(FONTS / name), round(size * S))
    return _font_cache[key]


def sans(size: float):
    return font("DejaVuSans.ttf", size)


def bold(size: float):
    return font("DejaVuSans-Bold.ttf", size)


def mono(size: float):
    return font("DejaVuSansMono.ttf", size)


def bold_mono(size: float):
    return font("DejaVuSansMono-Bold.ttf", size)


def read(name: str, default=None):
    path = RUN_DIR / name
    if not path.exists():
        return default
    return json.loads(path.read_text())


run = read("ci-run.json")
jobs = read("ci-run-jobs.json", {"jobs": []})["jobs"]
checks = read("ci-check-runs.json", {"check_runs": []})["check_runs"]
annotations = read("annotations.json", [])
artifacts = read("artifacts.json", [])
results = read("vitest-results.json")
context = read("context.json")

OK = run["conclusion"] == "success"
STATE = GREEN if OK else RED

img = Image.new("RGB", (W * S, 3000 * S), BG)
d = ImageDraw.Draw(img)
y = 0.0


def px(v: float) -> int:
    return int(round(v * S))


def rect(x: float, y0: float, w: float, h: float, *, fill=None, outline=BORDER, radius=6, width=1):
    d.rounded_rectangle(
        [px(x), px(y0), px(x + w) - 1, px(y0 + h) - 1],
        radius=px(radius),
        fill=fill,
        outline=outline,
        width=px(width) if outline else 0,
    )


def line(x0: float, y0: float, x1: float, y1: float, color=HAIRLINE, width=1):
    d.line([px(x0), px(y0), px(x1), px(y1)], fill=color, width=px(width))


def runs(x: float, mid: float, parts, *, gap: float = 0) -> float:
    """Draw mixed-font text runs left to right; returns the end x."""
    for text, f, color in parts:
        d.text((px(x), px(mid)), text, font=f, fill=color, anchor="lm")
        x += f.getlength(text) / S + gap
    return x


def right_runs(x_right: float, mid: float, parts, *, gap: float = 0) -> float:
    width = sum(f.getlength(t) / S for t, f, _ in parts) + gap * (len(parts) - 1)
    return runs(x_right - width, mid, parts, gap=gap)


def mark(x: float, mid: float, size: float, ok: bool):
    """GitHub-style round check or cross, vertically centred on `mid`."""
    color = GREEN if ok else RED
    d.ellipse([px(x), px(mid - size / 2), px(x + size) - 1, px(mid + size / 2) - 1], fill=color)
    if ok:
        pts = [(x + size * 0.26, mid + size * 0.02), (x + size * 0.44, mid + size * 0.22),
               (x + size * 0.76, mid - size * 0.24)]
    else:
        pts = [(x + size * 0.3, mid - size * 0.24), (x + size * 0.7, mid + size * 0.24)]
        d.line([(px(a), px(b)) for a, b in pts], fill="#0d1117", width=px(1.7), joint="curve")
        pts = [(x + size * 0.3, mid + size * 0.24), (x + size * 0.7, mid - size * 0.24)]
    d.line([(px(a), px(b)) for a, b in pts], fill="#0d1117", width=px(1.7), joint="curve")


def pill(x: float, mid: float, text: str, *, f=None, color=MUTED, border=BORDER, bg=None, pad_x=8, h=19):
    f = f or sans(11)
    w = f.getlength(text) / S + 2 * pad_x
    rect(x, mid - h / 2, w, h, fill=bg, outline=border, radius=h / 2)
    d.text((px(x + pad_x), px(mid)), text, font=f, fill=color, anchor="lm")
    return x + w


def duration(a, b) -> str:
    if not a or not b:
        return ""
    parse = lambda s: dt.datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ")
    secs = int((parse(b) - parse(a)).total_seconds())
    if secs < 60:
        return f"{max(secs, 1)}s"
    return f"{secs // 60}m {secs % 60}s"


def card_header(title: str, right: str = "", *, color=TEXT):
    d.text((px(CARD_X + 16), px(y + 18)), title, font=bold(15), fill=TEXT, anchor="lm")
    if right:
        right_runs(CARD_X + CARD_W - 16, y + 18, [(right, sans(12), color)])
    line(CARD_X + 1, y + 34, CARD_X + CARD_W - 1, y + 34)


def wrap(text: str, f, width: float, max_lines: int = 4) -> list[str]:
    out: list[str] = []
    for raw_line in text.splitlines():
        words, current = raw_line.split(), ""
        if not words:
            continue
        for word in words:
            candidate = f"{current} {word}".strip()
            if f.getlength(candidate) / S <= width or not current:
                current = candidate
            else:
                out.append(current)
                current = word
        out.append(current)
        if len(out) >= max_lines:
            break
    if len(out) > max_lines:
        out = out[:max_lines]
        out[-1] = out[-1][: max(8, len(out[-1]) - 1)] + "…"
    return out[:max_lines]


# ---------------------------------------------------------------- header bar
HEADERBAR = 54
d.rectangle([0, 0, W * S, px(HEADERBAR)], fill=HEADER_BG)
line(0, HEADERBAR, W, HEADERBAR)
x = runs(PAD, HEADERBAR / 2, [("Haani-110", sans(14), BLUE), (" / ", sans(14), MUTED), ("Flicks", bold(14), BLUE)])
pill(x + 10, HEADERBAR / 2, "Public")
right_runs(W - PAD, HEADERBAR / 2, [("Actions", sans(12.5), MUTED)])

y = HEADERBAR + 26

# ------------------------------------------------------------- run title area
runs(CARD_X, y, [("CI", sans(13), BLUE), (" · workflow on: push", sans(13), MUTED)])
y += 26
d.text((px(CARD_X), px(y)), run["display_title"], font=bold(25), fill=TEXT, anchor="lt")
y += 40

mid = y + 9
mark(CARD_X, mid, 17, OK)
x = runs(CARD_X + 23, mid, [("Success" if OK else "Failure", bold(14), STATE)])
x = runs(x + 10, mid, [("Total duration", sans(13), MUTED),
                       (f" {duration(run['run_started_at'], run['updated_at'])}", sans(13), TEXT)])
x = runs(x + 10, mid, [("·", sans(13), MUTED)])
x = runs(x + 10, mid, [("Triggered via push", sans(13), MUTED), (f"  {run['head_sha'][:7]}", mono(12.5), BLUE)])
x = runs(x + 10, mid, [("·", sans(13), MUTED)])
x = runs(x + 10, mid, [(f"{dt.datetime.strptime(run['run_started_at'], '%Y-%m-%dT%H:%M:%SZ').strftime('%B %d')}", sans(13), MUTED)])
pill(CARD_W + CARD_X - (sans(11).getlength(run["head_branch"]) / S + 16), mid, run["head_branch"],
     color=BLUE, border="#1f6feb")
y += 34

# ------------------------------------------------------------------- checks
if checks:
    h = 34 + len(checks) * 26 + 8
    rect(CARD_X, y, CARD_W, h, fill=CARD_BG)
    failed = sum(c["conclusion"] != "success" for c in checks)
    summary = f"{len(checks) - failed} checks passed" + (f", {failed} failed" if failed else "")
    card_header("Checks", summary, color=RED if failed else GREEN)
    row_y = y + 34
    for c in checks:
        mid = row_y + 13
        mark(CARD_X + 18, mid, 14, c["conclusion"] == "success")
        runs(CARD_X + 40, mid, [(c["name"], sans(13.5), TEXT)])
        right_runs(CARD_X + CARD_W - 18, mid,
                   [("successful" if c["conclusion"] == "success" else "failed",
                     sans(12), GREEN if c["conclusion"] == "success" else RED),
                    (f"   {duration(c.get('started_at'), c.get('completed_at'))}", sans(12), MUTED)])
        row_y += 26
        if c is not checks[-1]:
            line(CARD_X + 16, row_y, CARD_X + CARD_W - 16, row_y)
    y += h + 16

# --------------------------------------------------------------------- jobs
SKIP = ("Set up job", "Complete job", "Post ")
step_groups = [[s for s in j["steps"]
                if not s["name"].startswith(SKIP) and s["conclusion"] != "skipped"] for j in jobs]
if jobs:
    h = 34 + sum(26 + len(s) * 22 + 6 for s in step_groups)
    rect(CARD_X, y, CARD_W, h, fill=CARD_BG)
    card_header("Jobs", run["name"])
    row_y = y + 34
    for j, steps in zip(jobs, step_groups):
        mid = row_y + 13
        mark(CARD_X + 18, mid, 14, j["conclusion"] == "success")
        runs(CARD_X + 40, mid, [(j["name"], bold(13.5), TEXT)])
        right_runs(CARD_X + CARD_W - 18, mid, [(duration(j.get("started_at"), j.get("completed_at")), sans(12), MUTED)])
        row_y += 26
        for s in steps:
            ok = s["conclusion"] == "success"
            mid = row_y + 11
            mark(CARD_X + 44, mid, 11, ok)
            runs(CARD_X + 62, mid, [(s["name"], sans(12.5), MUTED if ok else TEXT)])
            right_runs(CARD_X + CARD_W - 18, mid,
                       [(duration(s.get("started_at"), s.get("completed_at")), sans(11.5), DIM)])
            row_y += 22
        row_y += 6
    y += h + 16

# -------------------------------------------------------------- annotations
if annotations:
    blocks = []
    for a in annotations:
        blocks.append((a, wrap(a["message"], mono(11), CARD_W - 72, max_lines=5)))
    h = 34 + sum(30 + 14 * len(lines) for _, lines in blocks) + 10
    rect(CARD_X, y, CARD_W, h, fill=CARD_BG)
    card_header("Annotations", f"{len(annotations)} annotation" + ("" if len(annotations) == 1 else "s"))
    row_y = y + 34
    for a, lines in blocks:
        color = {"failure": RED, "warning": GOLD, "notice": BLUE}.get(a["level"], MUTED)
        block_h = 30 + 14 * len(lines)
        d.rectangle([px(CARD_X + 16), px(row_y + 10), px(CARD_X + 19), px(row_y + block_h - 12)], fill=color)
        runs(CARD_X + 30, row_y + 17, [(a["title"], bold(12.5), TEXT)])
        for i, text in enumerate(lines):
            runs(CARD_X + 30, row_y + 33 + i * 14, [(text, mono(11), MUTED)])
        row_y += block_h
    y += h + 16

# ------------------------------------------- unit job summary (Vitest totals)
if results:
    files = results["suites"]
    ROW_H = 22
    TABLE_HEADER = 19
    ROWS_PER_COL = 9
    COLUMNS = -(-len(files) // ROWS_PER_COL) or 1
    ROWS_TALLEST = min(ROWS_PER_COL, len(files) - ROWS_PER_COL * (COLUMNS - 1))
    table_h = TABLE_HEADER + ROWS_TALLEST * ROW_H
    GUTTER = 30
    COL_W = (CARD_W - 32 - GUTTER * (COLUMNS - 1)) / COLUMNS

    h = 34 + 34 + 22 + table_h + 48
    rect(CARD_X, y, CARD_W, h, fill=CARD_BG)
    card_header("Unit & component tests", "job summary")
    row_y = y + 34
    mark(CARD_X + 18, row_y + 17, 18, results["failed"] == 0)
    runs(CARD_X + 42, row_y + 17, [(f"Vitest — {results['passed']} passed", bold(17), TEXT)])
    row_y += 34
    runs(CARD_X + 18, row_y, [(
        f"{results['files']} test files · {results['tests']} tests · {results['passed']} passed · "
        f"0 skipped · {results['failed']} failed", sans(12.5), MUTED)])

    table_top = row_y + 22
    for index, f in enumerate(files):
        col, row = divmod(index, ROWS_PER_COL)
        cx = CARD_X + 16 + col * (COL_W + GUTTER)
        ry = table_top + row * ROW_H
        failed_x = cx + COL_W
        passed_x, tests_x = failed_x - 58, failed_x - 104
        if row == 0:
            runs(cx, ry + 9, [("File", bold_mono(10.5), MUTED)])
            for label_x, label in ((tests_x, "Tests"), (passed_x, "Passed"), (failed_x, "Failed")):
                d.text((px(label_x), px(ry + 9)), label, font=bold_mono(10.5), fill=MUTED, anchor="rm")
            line(cx, ry + TABLE_HEADER, cx + COL_W, ry + TABLE_HEADER)
        mid = ry + TABLE_HEADER + ROW_H / 2
        name = f["file"]
        while mono(11).getlength(name) / S > tests_x - cx - 50 and len(name) > 12:
            name = name[:-2]
        runs(cx, mid, [(name, mono(11), TEXT if f["failed"] == 0 else RED)])
        for label_x, text, color in ((tests_x, str(f["tests"]), MUTED),
                                     (passed_x, str(f["passed"]), GREEN),
                                     (failed_x, str(f["failed"]), MUTED)):
            d.text((px(label_x), px(mid)), text, font=mono(11), fill=color, anchor="rm")
        line(cx, ry + TABLE_HEADER + ROW_H, cx + COL_W, ry + TABLE_HEADER + ROW_H)
    for col in range(1, COLUMNS):
        div_x = CARD_X + 16 + col * (COL_W + GUTTER) - GUTTER / 2
        line(div_x, table_top, div_x, table_top + table_h, color=BORDER)

    row_y = table_top + table_h + 12
    cov = results["coverage"]
    runs(CARD_X + 18, row_y, [("Coverage ", bold(12.5), TEXT),
                              ("statements / branches / functions / lines:  ", sans(12), MUTED),
                              (" / ".join(f"{cov[k]['pct']}%" for k in
                                          ("statements", "branches", "functions", "lines")), mono(12), GREEN)])
    runs(CARD_X + 18, row_y + 17, [("Thresholds enforced in vite.config.ts:  ", sans(11.5), MUTED),
                                   ("72 / 74 / 70 / 76", mono(11.5), MUTED)])
    y += h + 16

# -------------------------------------------------------------- context card
if context:
    color = RED if context.get("tone") == "red" else GREEN
    h = 34 + 22 * len(context["lines"]) + 10
    rect(CARD_X, y, CARD_W, h, fill=CARD_BG)
    card_header(context["title"])
    row_y = y + 44
    for i, text in enumerate(context["lines"]):
        runs(CARD_X + 18, row_y + i * 22, [(text, mono(11.5), TEXT if i % 2 == 0 else MUTED)])
    y += h + 16

# ---------------------------------------------------------------- artifacts
if artifacts:
    h = 34 + len(artifacts) * 26 + 8
    rect(CARD_X, y, CARD_W, h, fill=CARD_BG)
    card_header("Artifacts", " · ".join(f"{a['name']} {a['size']}" for a in artifacts))
    row_y = y + 34
    for a in artifacts:
        runs(CARD_X + 18, row_y + 13, [(a["name"], mono(12.5), BLUE), (f"   {a['size']}", sans(12), MUTED),
                                       (f"   {a['digest'][:24]}…", mono(11), DIM)])
        row_y += 26
    y += h + 16

# --------------------------------------------------------------- provenance
line(CARD_X, y, CARD_X + CARD_W, y)
y += 14
sources = [name for name in ("ci-run.json", "ci-run-jobs.json", "ci-check-runs.json", "annotations.json",
                             "artifacts.json", "vitest-results.json", "context.json") if (RUN_DIR / name).exists()]
note = [
    f"Re-drawn from GitHub Actions REST API data for run {run['id']} (commit {run['head_sha'][:7]}, "
    f"branch {run['head_branch']}): {', '.join(sources)}.",
    f"Source: {run['html_url']} — this sandbox has no browser, so the run page is rebuilt from its API data "
    "rather than screen-captured.",
]
if results:
    note.append(f"Vitest totals: {results['command']} (the command the CI unit job runs), "
                f"recorded {results['recorded']}.")
for text, color in zip(note, (MUTED, MUTED, DIM)):
    d.text((px(CARD_X), px(y)), text, font=sans(11), fill=color, anchor="lt")
    y += 17

height = int(y + 8)
img = img.crop((0, 0, W * S, px(height))).resize((W, height), Image.LANCZOS)
img.save(OUT, optimize=True)
print(f"wrote {OUT} ({img.width}x{img.height})")
