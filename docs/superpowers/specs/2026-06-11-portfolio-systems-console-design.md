# Portfolio "Systems Console" Redesign — Design Spec

Date: 2026-06-11
Status: Approved by Garvit (direction, feature set, and design summary approved interactively)

## Goal

Redesign garvit-joshi.github.io so it:

1. Reads as distinctly tech-oriented (engineering-console aesthetic, not generic portfolio).
2. Reflects the actual work — routing & trip optimization at MoveInSync, Spring open-source
   contributions, distributed-systems tooling (Locksmith).
3. Is more informative (about/now section, impact metrics, live GitHub activity).
4. Is interactive (live routing simulation, hidden terminal, live data, scroll/count animations).
5. Stays a zero-build static site deployable on GitHub Pages from master root.

## Decisions made with the user

- Direction: **Systems console** (rejected: full-terminal-only site; minimal polish of current look).
- Interactive features: routing simulation hero, terminal easter egg (⌘K), live GitHub data.
  (Rejected: copyable Locksmith code-block docs.)
- Content additions: impact metrics strip, about/now section.
  (Rejected: expandable project architecture notes; GitHub-PR-row restyle of OSS cards.)

## Non-goals

- No build step, no frameworks, no npm dependencies. Vanilla HTML/CSS/JS only.
- No fabricated metrics — every number is real (resume-sourced), sim-derived, or live from GitHub.
- Resume.pdf / Resume.tex / resume.json are untouched.
- No analytics, no cookies, no external JS.

## Architecture

```
index.html        — all markup, JSON-LD, meta
css/Main.css      — full stylesheet (design tokens in :root)
js/sim.js         — routing simulation (self-contained, renders into #sim-canvas)
js/main.js        — UI glue: nav, mobile menu, scroll reveals, count-up metrics, GitHub fetch
js/terminal.js    — terminal overlay (self-contained, exposes open/close, wired by main.js)
images/favicon.svg (existing, unchanged)
```

Scripts loaded with `defer`, relative paths everywhere (works on Pages and local preview).
Each JS file is an IIFE with no globals except a tiny `window.GJ` namespace for cross-wiring
(`GJ.openTerminal`, `GJ.scrollToSection`).

## Design system

- Palette (CSS vars): near-black blue base `#05080f` / `#0a101c`; card `#0d1524`;
  accent emerald `#34d399` family (existing brand); route hues: emerald, sky `#60a5fa`,
  violet `#a78bfa`, amber `#fbbf24` (sim + small accents only); text slate scale.
- Faint graph-paper grid background (CSS gradient lines, very low contrast) on body.
- Typography: Chakra Petch (display), IBM Plex Sans (body), JetBrains Mono (labels, dates,
  data, terminal). (Amended at implementation time: Space Grotesk swapped out per
  frontend-design guidance to avoid converging on overused display faces.)
- Signature motif: cards/panels with 1px borders plus corner-bracket ticks (pseudo-elements).
- Section headers numbered in mono: `01 / about` … with thin rule.
- Motion: IntersectionObserver reveals, metric count-ups, sim animation.
  `prefers-reduced-motion`: reveals visible, counters static, sim renders one solved frame.

## Page structure

1. **Nav (fixed)** — mono brand `~/garvit-joshi`; links `01.about 02.experience 03.oss
   04.projects 05.skills`; Resume button; `⌘K` chip opening terminal. Mobile: existing
   full-screen overlay pattern (preserve the z-index fixes from recent commits).
2. **Hero** — left column: status chip `● open_to_opportunities` (pulsing dot), name,
   role, bio (current copy, tightened), link buttons (GitHub/LinkedIn/Email/Resume).
   Right column: the simulation panel (below text on mobile).
3. **Metrics strip** — four count-up stats with mono labels:
   `spring_prs.merged = 3`, `maven_central.artifacts = 1`, `years.shipping = 4+`,
   `github.public_repos = <live>` (placeholder `—` until fetched, falls back to hiding value).
4. **01 / about** — avatar in bracket frame; "currently" prose (owning routing/trip
   optimization services; recent Neo4j geocoding + error-detection pipelines; latest OSS:
   Spring Cloud Gateway PR #4089; building Locksmith); a `garvit.yaml` styled status block
   (location / role / focus / status); education (BTech CS, LPU, 2018–2022) and
   AWS Cloud Community–LPU co-founder line.
5. **02 / experience** — existing three MoveInSync roles and bullets, console skin
   (mono dates, accent timeline dots).
6. **03 / open source** — existing three PR cards (Spring Security #18235, Spring Boot
   #48967, Spring Cloud Gateway #4089), new skin: mono `org/repo` eyebrow, merged badge,
   description, link. Content unchanged.
7. **04 / projects** — Locksmith + Vault cards, new skin, content unchanged
   (tech chips, bullets, GitHub/Maven Central links).
8. **05 / skills** — existing five groups as bracket-tick cards with mono group labels.
9. **06 / activity `[live]`** — client-side only:
   - `GET https://github-contributions-api.jogruber.de/v4/garvit-joshi?y=last` → render
     contribution heatmap (52×7 grid) in palette colors + "N contributions in the last year".
   - `GET https://api.github.com/users/garvit-joshi` → public_repos (feeds metric #4).
   - `GET https://api.github.com/users/garvit-joshi/repos?per_page=100&sort=updated` →
     non-fork repos, top 4 by stars → chips (name, ★, language dot).
   - Every fetch failure degrades silently: affected block hides, section shows a plain
     "github.com/garvit-joshi →" link. No errors surface to users.
10. **Contact / footer** — "Let's connect", mono email link, social links, mono bottom line
    (© 2026 · built with vanilla js · view source link to repo).

## Routing simulation (js/sim.js)

- Bordered panel, header `trip-optimizer — live` with pulsing dot; canvas; telemetry footer.
- World: jittered grid graph (~7×6 intersections) with some edges removed (city blocks),
  one depot node. Edge weights = euclidean distance.
- Stops spawn at random street nodes on a timer (cap ~10 unserved). Click/tap canvas →
  spawn stop at nearest node (hint text in footer: `click map to add a pickup`).
- Assignment: each stop greedily assigned to the vehicle with cheapest route-end insertion;
  vehicle path = Dijkstra shortest path through street graph; route polyline draws in
  animated-dash style; vehicle dot travels the polyline at constant speed; served stops
  flash then fade; vehicles return to depot when idle.
- 4–5 vehicles, one route hue each. Telemetry derived from real sim state:
  `vehicles`, `stops_served` (cumulative), `avg_route` (graph distance in blocks).
- DPR-aware canvas, rAF loop paused on `document.hidden`; reduced-motion renders a single
  pre-solved static frame (routes drawn, no loop).
- Budget: < 350 lines, zero allocations in the draw loop hot path beyond reuse.

## Terminal (js/terminal.js)

- Open: ⌘K / Ctrl+K, backtick (when not typing in an input), nav `⌘K` chip. Close: Esc, `exit`, ×.
- Dialog semantics: `role="dialog" aria-modal="true"`, focus moves to input on open and
  returns to trigger on close.
- Prompt `garvit@portfolio:~$`. History (↑/↓), Tab prefix-completion across command names.
- Commands: `help`, `whoami`, `ls`, `cd <section>` / `open <section>` (closes + scrolls),
  `cat resume` / `resume` (opens Resume.pdf), `skills`, `oss`, `github`, `linkedin`,
  `email`, `uptime` (days since Oct 2021), `sudo hire-me` (grants access, prints email),
  `clear`, `exit`. Unknown → `command not found: x — try 'help'`.

## Accessibility / SEO

- All interactive elements keyboard reachable; canvas has aria-label describing the sim;
  heatmap cells get title tooltips; color contrast ≥ 4.5:1 for text.
- `prefers-reduced-motion` honored globally (existing pattern kept).
- JSON-LD `Person` schema (name, jobTitle, worksFor, sameAs, url); updated meta/og tags;
  `theme-color`.

## Verification

- `node --check` on all three JS files.
- Headless Chrome screenshots at 1440×900 and 390×844; iterate on visual issues.
- Manual checklist: nav anchors, mobile menu, terminal open/close + commands, sim click,
  reduced-motion pass (emulated), GitHub-API-failure pass (offline emulation acceptable).

## Deployment

- Commit locally on master. Do **not** push — Garvit reviews locally
  (`python3 -m http.server`) and pushes himself; Pages then serves master root as today.
