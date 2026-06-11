# garvit-joshi.github.io

Personal portfolio — a "systems console" static site with a live vehicle-routing
simulation in the hero (click the map to add a pickup), a ⌘K terminal overlay,
and live GitHub activity. Vanilla HTML/CSS/JS, zero build step, served straight
from this repo by GitHub Pages.

## Preview locally

```sh
python3 -m http.server 8123
# open http://localhost:8123
```

## Layout

| Path | What it is |
|---|---|
| `index.html` | All markup + JSON-LD |
| `css/Main.css` | Styles (design tokens live in `:root`) |
| `js/sim.js` | Trip-optimizer simulation: jittered street graph, Dijkstra, greedy assignment |
| `js/terminal.js` | `⌘K` / `` ` `` terminal (`help`, `cd projects`, `sudo hire-me`, …) |
| `js/main.js` | Nav, reveals, count-up metrics, live GitHub fetches |
| `Resume.tex` / `Resume.pdf` / `resume.json` | Resume sources |
