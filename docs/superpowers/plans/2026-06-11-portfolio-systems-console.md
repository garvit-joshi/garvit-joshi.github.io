# Systems-Console Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild garvit-joshi.github.io as an engineering-console portfolio with a live routing simulation, terminal overlay, and live GitHub data — zero-build static site.

**Architecture:** One HTML page styled by one stylesheet; three deferred vanilla-JS IIFEs (`sim`, `terminal`, `main` glue) sharing a tiny `window.GJ` namespace. All data is resume-sourced, sim-derived, or fetched client-side from public GitHub APIs with silent degradation.

**Tech Stack:** HTML5, CSS (custom properties, grid), vanilla ES2020, Canvas 2D, GitHub REST + jogruber contributions API. Verified with `node --check` + headless Chrome screenshots.

**Spec:** `docs/superpowers/specs/2026-06-11-portfolio-systems-console-design.md`

---

## File structure

| File | Responsibility |
|---|---|
| `index.html` | All markup: meta/JSON-LD, nav, hero+sim panel, metrics, about, experience, oss, projects, skills, activity, footer, terminal dialog shell |
| `css/Main.css` | Full rewrite: tokens, grid background, bracket-tick panels, every section, terminal, heatmap, responsive + reduced-motion |
| `js/sim.js` | Routing simulation: street-graph gen, Dijkstra, greedy assignment, rAF renderer, click-to-spawn, telemetry, reduced-motion static frame |
| `js/terminal.js` | Terminal dialog: command table, history, tab-completion, focus management; exposes `GJ.openTerminal` |
| `js/main.js` | Nav scroll state, mobile menu, reveals, count-up metrics, GitHub fetches (profile/contributions/repos), `GJ.scrollToSection` |
| `README.md` | Refresh: what the site is, local preview command |

Verification screenshots go to `/tmp/gj-shots/` (never committed).
Chrome binary: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
Local server for checks: `python3 -m http.server 8123` from repo root.

### Shared contracts (used across tasks)

- `window.GJ = { openTerminal(), closeTerminal(), scrollToSection(id) }`.
- Section ids: `about`, `experience`, `opensource`, `projects`, `skills`, `activity`, `contact`.
- Debug hook: URL `?term=1` auto-opens the terminal (for headless screenshots).
- CSS tokens (single source in `:root`): `--bg:#05080f; --bg-raise:#0a101c; --bg-card:#0d1524;
  --ink:#e6edf6; --ink-2:#9aa8bc; --ink-3:#5d6b80; --green:#34d399; --green-soft:rgba(52,211,153,.12);
  --green-line:rgba(52,211,153,.3); --sky:#60a5fa; --violet:#a78bfa; --amber:#fbbf24;
  --line:rgba(154,168,188,.14); --line-soft:rgba(154,168,188,.07);
  --mono:'JetBrains Mono',monospace; --sans:'Space Grotesk',system-ui,sans-serif`.

---

### Task 1: Page skeleton + design system (nav, footer, tokens, motifs)

**Files:** Create `js/main.js`; rewrite `index.html`, `css/Main.css`.

- [ ] **Step 1:** Rewrite `index.html`: head (charset, viewport, title `Garvit Joshi — Software Engineer`, description, og:*, `theme-color #05080f`, favicon, fonts preconnect + Space Grotesk 400–700 / JetBrains Mono 400–600, relative `css/Main.css`, three deferred scripts), JSON-LD Person (`name`, `jobTitle: Software Engineer`, `worksFor MoveInSync`, `url`, `sameAs` GitHub+LinkedIn). Body: fixed nav (`~/garvit-joshi` brand, hamburger button, links `01.about → #about` … `05.skills → #skills`, `resume` button → `Resume.pdf`, `⌘K` chip `id="term-chip"`), empty `<main>` with seven placeholder `<section>`s carrying final ids + `data-num` attrs, footer (Let's connect, mono email, GitHub/LinkedIn/Email/Resume links, bottom line `© 2026 garvit joshi · vanilla html/css/js · view source` → repo URL).
- [ ] **Step 2:** Rewrite `css/Main.css` part 1: tokens above, reset, body graph-paper background (two crossed `linear-gradient` 1px lines at 32px spacing in `--line-soft` over `--bg`), selection/scrollbar, `.wrap` (max-width 1080px), `.sec-head` (`<span class="sec-num">01</span> / about` mono header + rule), `.panel` bracket-tick motif: 1px border + 4 corner ticks via `::before/::after` on panel and an inner `.tick` pair (8×8px, 2px solid `--green`, only two corners per pseudo — top-left/bottom-right on panel, top-right/bottom-left on `.panel > .tick`), nav styles (blur on `.scrolled`), mobile overlay menu (full-screen fixed, `z-index` above content — preserve behavior of current site), footer styles, `.reveal/.revealed` transitions, `prefers-reduced-motion` block forcing reveals visible and animations off.
- [ ] **Step 3:** Write `js/main.js`: IIFE with `GJ` namespace, `scrollToSection`, nav `.scrolled` toggle, active-link highlighting, mobile menu open/close (reuse current site's class pattern: `nav-toggle.active`, `nav-links.open`, `body.menu-open`), IntersectionObserver reveals, count-up helper `countUp(el)` reading `data-count`/`data-suffix` (skips animation under reduced motion).
- [ ] **Step 4:** Verify: `node --check js/main.js` → no output. Serve + screenshot 1440×900 and 390×844; check nav, grid background, footer, no horizontal scroll on mobile.
- [ ] **Step 5:** Commit `feat: console skeleton — tokens, nav, footer, reveal/count-up glue`.

### Task 2: Hero + simulation panel markup + metrics strip

**Files:** Modify `index.html`, `css/Main.css`, `js/main.js`. Create `js/sim.js` (stub).

- [ ] **Step 1:** Hero markup: two-column grid. Left: status chip `<span class="pulse"></span> open_to_opportunities` (mono), `h1 Garvit Joshi`, `h2` role, bio paragraph (current copy tightened, keep Spring project names bold), link buttons (GitHub/LinkedIn icons inline SVG from current site, Email, Resume accent button). Right: `.sim-panel.panel` with mono header `trip-optimizer — live` + pulsing dot, `<canvas id="sim-canvas" aria-label="Animated simulation of vehicles being routed to pickups on a street grid">`, footer `<div id="sim-stats">` + hint `click map to add a pickup`.
- [ ] **Step 2:** Metrics strip markup under hero: 4 `.metric` cells — labels/values: `spring_prs.merged → 3`, `maven_central.artifacts → 1`, `years.shipping → 4+` (`data-count="4" data-suffix="+"`), `github.public_repos → <span id="gh-repos">—</span>` (live, no count-up until fetch).
- [ ] **Step 3:** CSS: hero grid (stack < 960px), display type scale (`clamp`), chip pulse keyframe, link buttons, `.sim-panel` (aspect ~ 10/9, header/footer mono bars), metrics strip (4-col grid → 2-col mobile, mono labels `--ink-3`, values 2rem Space Grotesk).
- [ ] **Step 4:** `js/sim.js` stub: IIFE drawing static placeholder grid lines on the canvas (DPR-scaled) so layout is checkable.
- [ ] **Step 5:** Verify: `node --check` both JS; screenshots both sizes; metrics count up on scroll into view.
- [ ] **Step 6:** Commit `feat: hero with sim panel shell + impact metrics strip`.

### Task 3: Content sections (about, experience, oss, projects, skills)

**Files:** Modify `index.html`, `css/Main.css`.

- [ ] **Step 1:** `01/about` markup: grid of bracket-framed avatar (GitHub avatar URL, square, corner ticks), prose ("currently" paragraph: owns routing & trip-optimization services at MoveInSync; recently introduced Neo4j geocode storage and automated error-detection pipelines; outside work contributes to Spring — latest Spring Cloud Gateway PR #4089 — and builds Locksmith, on Maven Central), `garvit.yaml` panel rendered as definition rows (`location: bengaluru, india` / `role: software engineer 2 @ moveinsync` / `focus: routing, distributed coordination, gateway internals` / `status: open to opportunities ●`), education + community lines (BTech CS · LPU · 2018–2022; co-founded AWS Cloud Community–LPU).
- [ ] **Step 2:** `02/experience`: port the three roles + all bullets verbatim from current site; timeline with accent dot (active on current role), mono dates.
- [ ] **Step 3:** `03/open source`: three cards — mono eyebrow `spring-projects/spring-security` etc., `merged ✓` badge, PR number mono, existing descriptions, `view pull request →` links. `04/projects`: Locksmith (tech chips Java 17+/Spring Boot/Redis/Redisson/AspectJ, existing description+bullets, GitHub + Maven Central links) and Vault (existing content, GitHub link). `05/skills`: five groups from current site as panels with mono group labels and tag chips.
- [ ] **Step 4:** CSS for all five sections: cards on `.panel` motif, hover lift + green border-glow, timeline rail, yaml rows (mono key `--ink-3`, value `--ink`), chips.
- [ ] **Step 5:** Verify: screenshots both sizes; anchors from nav land correctly (scroll-padding).
- [ ] **Step 6:** Commit `feat: about/now, experience, oss, projects, skills in console skin`.

### Task 4: Routing simulation engine

**Files:** Rewrite `js/sim.js` (~300 lines).

- [ ] **Step 1:** Implement world gen: jittered grid of `COLS×ROWS` (7×6) intersection nodes within canvas padding; edges to right/down neighbors, each kept with p=0.82 (re-add until graph connected via BFS check); depot = most central node. Store `nodes[{x,y}]`, `adj` Map of `[nodeIdx, weight]`.
- [ ] **Step 2:** Implement `dijkstra(from)` → `prev[]` array; `pathBetween(a,b)` → node index list. Vehicles array (5): `{hue, pathPts, segIdx, t, queue[], served}` starting at depot. Stop spawner every 2.2–4s (cap 10 waiting) + `canvas` click/tap → nearest node spawn. Assignment on spawn: pick vehicle minimizing `graphDist(routeEnd → stop)`; append stop; extend `pathPts` with `pathBetween`.
- [ ] **Step 3:** Renderer (rAF): faint street edges; route polylines per vehicle in hue with animated dash draw-in; waiting stops amber pulsing rings; served flash green and fade; depot pulsing green square; vehicle dots travel `pathPts` at constant px/s; telemetry footer text `vehicles 5 · stops_served N · avg_route X.X blocks` updated from sim state. Pause loop on `document.hidden`; resize observer re-inits canvas at DPR.
- [ ] **Step 4:** Reduced-motion branch: generate world, pre-assign 8 stops, draw routes once, no rAF, no spawner.
- [ ] **Step 5:** Verify: `node --check js/sim.js`; screenshot desktop (routes visible), `--force-prefers-reduced-motion` screenshot (static frame still drawn). Watch a few seconds via repeated screenshots for motion sanity (different frames differ).
- [ ] **Step 6:** Commit `feat: live trip-optimizer simulation in hero`.

### Task 5: Terminal overlay

**Files:** Create `js/terminal.js`; modify `index.html` (dialog markup), `css/Main.css`, `js/main.js` (wire ⌘K/chip/backtick).

- [ ] **Step 1:** Markup: `<div id="terminal" role="dialog" aria-modal="true" aria-label="Terminal" hidden>` → backdrop + window (title bar `garvit@portfolio: ~` + close button, scrollable `#term-out`, input row `garvit@portfolio:~$` + `<input id="term-in" autocomplete="off" spellcheck="false">`).
- [ ] **Step 2:** `js/terminal.js`: command table — `help, whoami, ls, cd <sec>, open <sec|resume>, cat resume, resume, skills, oss, github, linkedin, email, uptime, sudo, clear, exit`; unknown → `command not found: X — try 'help'`; `sudo hire-me` → `access granted ✓ → garvitjoshi9@gmail.com`; `uptime` computes days since 2021-10-01; `cd/open <section>` closes dialog + `GJ.scrollToSection`; links print as real `<a>` anchors. History ↑/↓ (in-memory), Tab prefix completion (commands only), Esc/exit/× close. Focus to input on open, restore focus to opener on close. Boot lines printed on first open. Expose `GJ.openTerminal/closeTerminal`.
- [ ] **Step 3:** Wire in `js/main.js`: `keydown` ⌘K/Ctrl+K (preventDefault) and backtick (ignored when target is input/textarea); `#term-chip` click; `?term=1` auto-open.
- [ ] **Step 4:** CSS: backdrop blur, centered mono window (max-width 640px, max-height 70vh), output styling, mobile full-width.
- [ ] **Step 5:** Verify: `node --check js/terminal.js`; screenshot `http://localhost:8123/?term=1` shows open terminal with boot text at both sizes.
- [ ] **Step 6:** Commit `feat: ⌘K terminal with navigation commands`.

### Task 6: Live GitHub activity section

**Files:** Modify `js/main.js`, `index.html`, `css/Main.css`.

- [ ] **Step 1:** Markup `06/activity` (id `activity`, after skills): header with `[live]` badge, `#gh-summary` line, `#gh-heatmap` container, `#gh-repos-row` chips container, permanent fallback link `github.com/garvit-joshi →`.
- [ ] **Step 2:** `js/main.js` fetchers (all `try/catch`, silent): profile → fill `#gh-repos` metric (count-up); contributions `?y=last` → render 53-week grid of `<i>` cells, 5-level palette `--bg-card → --green`, `title="N contributions on DATE"`, summary `N contributions in the last year`; repos → non-fork top 4 by stars → chips `name ★n ·lang` with language color dot (small map: Java, Python, C++, JavaScript, TypeScript, HTML, Shell, PHP, default). On any failure `hidden` the affected block only.
- [ ] **Step 3:** CSS: heatmap grid (weeks × 7, 11px cells, 3px gap, horizontal scroll under 700px), repo chips, `[live]` badge pulse.
- [ ] **Step 4:** Verify: online screenshot shows heatmap+chips; failure pass with `--host-resolver-rules="MAP api.github.com 127.0.0.1, MAP github-contributions-api.jogruber.de 127.0.0.1"` shows section collapsed to fallback link, no console errors (`--enable-logging --v=0` stderr scan).
- [ ] **Step 5:** Commit `feat: live github activity — heatmap, repos, live metric`.

### Task 7: Polish, a11y, README, final verification

**Files:** Modify `css/Main.css`, `index.html`, `README.md`.

- [ ] **Step 1:** Full-page screenshots desktop/mobile; fix spacing/contrast/overflow issues found. Check focus-visible styles on all interactive elements.
- [ ] **Step 2:** Reduced-motion full pass (`--force-prefers-reduced-motion` full-page screenshot): content all visible, sim static.
- [ ] **Step 3:** Extract + `JSON.parse` the JSON-LD block via node one-liner to prove validity.
- [ ] **Step 4:** Update `README.md`: one-paragraph description, `python3 -m http.server` preview instructions, file map.
- [ ] **Step 5:** Grep for absolute `/css|/js` paths (must be relative), leftover `TODO`, dead links to removed assets.
- [ ] **Step 6:** Commit `feat: systems-console redesign — polish, a11y, readme`.

---

## Self-review (done at write time)

- Spec coverage: every spec section maps to a task (skeleton→1, hero/sim/metrics→2+4, about/exp/oss/projects/skills→3, terminal→5, activity→6, a11y/SEO/verify/README→1,7). Deployment = commit-only, no push — respected in all commit steps.
- No placeholders; commands and expected outcomes stated inline.
- Contract consistency: `GJ.*` names, section ids, token names identical across tasks.
