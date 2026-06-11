/* sim.js — trip-optimizer: a miniature of the real job.
   Stops spawn on a jittered street grid, a greedy optimizer assigns each to
   the vehicle whose route ends nearest (graph distance), vehicles drive
   Dijkstra shortest paths. Click the map to add a pickup. */
(function () {
    'use strict';

    var canvas = document.getElementById('sim-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var statsEl = document.getElementById('sim-stats');
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var COLS = 7;
    var ROWS = 6;
    var PAD = 30;
    var SPEED = 46;            /* px/s */
    var MAX_WAITING = 10;
    var HUES = ['#34d399', '#60a5fa', '#a78bfa', '#fbbf24', '#f472b6'];

    var W = 0;
    var H = 0;
    var nodes = [];
    var adj = [];
    var depot = 0;
    var vehicles = [];
    var stops = [];
    var servedCount = 0;
    var routeBlocks = 0;       /* cumulative blocks across assignments */
    var assignments = 0;
    var lastSpawn = 0;
    var spawnEvery = 2600;
    var lastFrame = 0;
    var dashPhase = 0;
    var rafId = 0;
    var statsAt = 0;

    function dist(a, b) {
        var dx = a.x - b.x;
        var dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function rand(a, b) {
        return a + Math.random() * (b - a);
    }

    /* ----- world ----- */
    function addEdge(a, b) {
        var d = dist(nodes[a], nodes[b]);
        adj[a].push([b, d]);
        adj[b].push([a, d]);
    }

    function connected() {
        var seen = [0];
        var mark = {};
        mark[0] = true;
        while (seen.length) {
            var u = seen.pop();
            adj[u].forEach(function (e) {
                if (!mark[e[0]]) {
                    mark[e[0]] = true;
                    seen.push(e[0]);
                }
            });
        }
        return Object.keys(mark).length === nodes.length;
    }

    function buildWorld() {
        var cw = (W - 2 * PAD) / (COLS - 1);
        var ch = (H - 2 * PAD) / (ROWS - 1);
        nodes = [];
        var r, c, i;
        for (r = 0; r < ROWS; r++) {
            for (c = 0; c < COLS; c++) {
                nodes.push({
                    x: PAD + c * cw + rand(-cw * 0.16, cw * 0.16),
                    y: PAD + r * ch + rand(-ch * 0.16, ch * 0.16)
                });
            }
        }
        var tries = 0;
        do {
            adj = nodes.map(function () { return []; });
            for (r = 0; r < ROWS; r++) {
                for (c = 0; c < COLS; c++) {
                    i = r * COLS + c;
                    if (c < COLS - 1 && Math.random() < 0.84) addEdge(i, i + 1);
                    if (r < ROWS - 1 && Math.random() < 0.84) addEdge(i, i + COLS);
                }
            }
        } while (!connected() && ++tries < 60);
        if (!connected()) {
            adj = nodes.map(function () { return []; });
            for (r = 0; r < ROWS; r++) {
                for (c = 0; c < COLS; c++) {
                    i = r * COLS + c;
                    if (c < COLS - 1) addEdge(i, i + 1);
                    if (r < ROWS - 1) addEdge(i, i + COLS);
                }
            }
        }
        depot = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2);
    }

    /* ----- dijkstra (n is tiny; O(n^2) is plenty) ----- */
    function shortestPath(from, to) {
        var n = nodes.length;
        var best = new Array(n);
        var prev = new Array(n);
        var done = new Array(n);
        var i, k, u;
        for (i = 0; i < n; i++) {
            best[i] = Infinity;
            prev[i] = -1;
            done[i] = false;
        }
        best[from] = 0;
        for (k = 0; k < n; k++) {
            u = -1;
            var b = Infinity;
            for (i = 0; i < n; i++) {
                if (!done[i] && best[i] < b) {
                    b = best[i];
                    u = i;
                }
            }
            if (u < 0 || u === to) break;
            done[u] = true;
            for (i = 0; i < adj[u].length; i++) {
                var e = adj[u][i];
                if (best[u] + e[1] < best[e[0]]) {
                    best[e[0]] = best[u] + e[1];
                    prev[e[0]] = u;
                }
            }
        }
        if (best[to] === Infinity) return null;
        var path = [to];
        while (path[0] !== from) path.unshift(prev[path[0]]);
        return { path: path, cost: best[to] };
    }

    /* ----- fleet ----- */
    function makeVehicles() {
        vehicles = HUES.map(function (hue) {
            return {
                hue: hue,
                node: depot,                       /* last node reached / route end basis */
                pos: { x: nodes[depot].x, y: nodes[depot].y },
                route: [],                         /* upcoming node ids */
                idleSince: 0
            };
        });
    }

    function routeEnd(v) {
        return v.route.length ? v.route[v.route.length - 1] : v.node;
    }

    function spawnStop(nodeId, now) {
        if (nodeId === depot) return;
        var waiting = 0;
        for (var i = 0; i < stops.length; i++) {
            if (stops[i].state === 'waiting') {
                waiting++;
                if (stops[i].node === nodeId) return;
            }
        }
        if (waiting >= MAX_WAITING) return;
        var stop = { node: nodeId, born: now, state: 'waiting' };
        stops.push(stop);
        assign(stop);
    }

    function assign(stop) {
        var bestV = null;
        var bestSp = null;
        var bestCost = Infinity;
        vehicles.forEach(function (v) {
            var sp = shortestPath(routeEnd(v), stop.node);
            if (sp) {
                /* queue length discourages piling onto one vehicle */
                var cost = sp.cost + v.route.length * 14;
                if (cost < bestCost) {
                    bestCost = cost;
                    bestV = v;
                    bestSp = sp;
                }
            }
        });
        if (!bestV) return;
        bestV.route = bestV.route.concat(bestSp.path.slice(1));
        routeBlocks += bestSp.path.length - 1;
        assignments++;
    }

    function arrive(v, nodeId, now) {
        v.node = nodeId;
        stops.forEach(function (s) {
            if (s.state === 'waiting' && s.node === nodeId) {
                s.state = 'served';
                s.servedAt = now;
                servedCount++;
            }
        });
    }

    function step(v, dt, now) {
        if (!v.route.length) {
            if (!v.idleSince) v.idleSince = now;
            if (now - v.idleSince > 4200 && v.node !== depot) {
                var home = shortestPath(v.node, depot);
                if (home) v.route = home.path.slice(1);
            }
            return;
        }
        v.idleSince = 0;
        var left = SPEED * (dt / 1000);
        while (left > 0 && v.route.length) {
            var target = nodes[v.route[0]];
            var d = dist(v.pos, target);
            if (d <= left) {
                v.pos.x = target.x;
                v.pos.y = target.y;
                left -= d;
                arrive(v, v.route.shift(), now);
            } else {
                v.pos.x += (target.x - v.pos.x) / d * left;
                v.pos.y += (target.y - v.pos.y) / d * left;
                left = 0;
            }
        }
    }

    /* ----- drawing ----- */
    function drawWorld() {
        var i, j;
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(154, 168, 188, 0.11)';
        ctx.beginPath();
        for (i = 0; i < nodes.length; i++) {
            for (j = 0; j < adj[i].length; j++) {
                if (adj[i][j][0] > i) {
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[adj[i][j][0]].x, nodes[adj[i][j][0]].y);
                }
            }
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(154, 168, 188, 0.22)';
        for (i = 0; i < nodes.length; i++) {
            ctx.fillRect(nodes[i].x - 1, nodes[i].y - 1, 2, 2);
        }
    }

    function drawDepot(now) {
        var d = nodes[depot];
        var ring = ((now / 1400) % 1);
        ctx.strokeStyle = 'rgba(52, 211, 153, ' + (0.5 * (1 - ring)) + ')';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(d.x - 5 - ring * 7, d.y - 5 - ring * 7, 10 + ring * 14, 10 + ring * 14);
        ctx.fillStyle = '#34d399';
        ctx.fillRect(d.x - 4, d.y - 4, 8, 8);
        ctx.fillStyle = '#05080f';
        ctx.fillRect(d.x - 1.5, d.y - 1.5, 3, 3);
    }

    function drawRoute(v) {
        if (!v.route.length) return;
        ctx.beginPath();
        ctx.moveTo(v.pos.x, v.pos.y);
        for (var i = 0; i < v.route.length; i++) {
            ctx.lineTo(nodes[v.route[i]].x, nodes[v.route[i]].y);
        }
        ctx.strokeStyle = v.hue + '14';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.strokeStyle = v.hue + '7a';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.lineDashOffset = -dashPhase;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function drawStop(s, now) {
        var p = nodes[s.node];
        if (s.state === 'waiting') {
            var ph = ((now - s.born) / 1500) % 1;
            ctx.strokeStyle = 'rgba(251, 191, 36, ' + (0.55 * (1 - ph)) + ')';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3.5 + ph * 9, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            var t = (now - s.servedAt) / 1100;
            if (t > 1) return;
            ctx.strokeStyle = 'rgba(52, 211, 153, ' + (0.7 * (1 - t)) + ')';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3 + t * 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(52, 211, 153, ' + (0.9 * (1 - t)) + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    var BAYS = [[-12, -9], [12, -9], [-12, 9], [12, 9], [0, 14]];

    function drawVehicle(v, idx) {
        var x = v.pos.x;
        var y = v.pos.y;
        /* parked at the depot: fan out into bays so the fleet is visible */
        if (!v.route.length && v.node === depot) {
            x += BAYS[idx % BAYS.length][0];
            y += BAYS[idx % BAYS.length][1];
        }
        ctx.fillStyle = v.hue + '2e';
        ctx.beginPath();
        ctx.arc(x, y, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = v.hue;
        ctx.beginPath();
        ctx.arc(x, y, 3.6, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw(now) {
        ctx.clearRect(0, 0, W, H);
        drawWorld();
        vehicles.forEach(drawRoute);
        drawDepot(now);
        var alive = [];
        stops.forEach(function (s) {
            drawStop(s, now);
            if (s.state === 'waiting' || now - s.servedAt < 1200) alive.push(s);
        });
        stops = alive;
        vehicles.forEach(drawVehicle);
    }

    function updateStats(now) {
        if (!statsEl || now - statsAt < 400) return;
        statsAt = now;
        var queue = 0;
        stops.forEach(function (s) { if (s.state === 'waiting') queue++; });
        var avg = assignments ? (routeBlocks / assignments).toFixed(1) : '0.0';
        statsEl.textContent = 'fleet ' + vehicles.length +
            ' · served ' + servedCount +
            ' · queue ' + queue +
            ' · avg_route ' + avg + ' blk';
    }

    /* ----- loop ----- */
    function frame(now) {
        var dt = Math.min(now - lastFrame, 50);
        lastFrame = now;
        dashPhase += dt * 0.012;
        if (now - lastSpawn > spawnEvery) {
            lastSpawn = now;
            spawnEvery = rand(2100, 3900);
            spawnStop(Math.floor(Math.random() * nodes.length), now);
        }
        vehicles.forEach(function (v) { step(v, dt, now); });
        draw(now);
        updateStats(now);
        rafId = requestAnimationFrame(frame);
    }

    /* ----- sizing / init ----- */
    function sizeCanvas() {
        var dpr = window.devicePixelRatio || 1;
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function reset() {
        sizeCanvas();
        if (W < 60 || H < 60) return false;
        buildWorld();
        makeVehicles();
        stops = [];
        servedCount = 0;
        routeBlocks = 0;
        assignments = 0;
        return true;
    }

    function staticFrame() {
        /* reduced motion: one believable solved state, no animation */
        var now = performance.now();
        for (var i = 0; i < 6; i++) {
            spawnStop(Math.floor(Math.random() * nodes.length), now - 800);
        }
        /* advance vehicles partway along their routes for a lived-in look */
        vehicles.forEach(function (v) {
            step(v, 2600, now);
        });
        draw(now - 700);
        updateStats(now);
    }

    function start() {
        if (!reset()) {
            if (start.tries == null) start.tries = 0;
            if (++start.tries < 90) requestAnimationFrame(start);
            return;
        }
        if (reduced) {
            staticFrame();
            return;
        }
        lastFrame = performance.now();
        lastSpawn = lastFrame - 1400;
        rafId = requestAnimationFrame(frame);
    }

    canvas.addEventListener('click', function (ev) {
        var rect = canvas.getBoundingClientRect();
        var x = ev.clientX - rect.left;
        var y = ev.clientY - rect.top;
        var bestN = -1;
        var bestD = Infinity;
        for (var i = 0; i < nodes.length; i++) {
            var d = dist({ x: x, y: y }, nodes[i]);
            if (d < bestD) {
                bestD = d;
                bestN = i;
            }
        }
        if (bestN >= 0) {
            spawnStop(bestN, performance.now());
            if (reduced) draw(performance.now());
        }
    });

    document.addEventListener('visibilitychange', function () {
        if (reduced) return;
        if (document.hidden) {
            cancelAnimationFrame(rafId);
        } else {
            lastFrame = performance.now();
            rafId = requestAnimationFrame(frame);
        }
    });

    var resizeTimer = 0;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            var wasW = W;
            if (Math.abs(canvas.clientWidth - wasW) < 4) return;
            cancelAnimationFrame(rafId);
            if (reset()) {
                if (reduced) staticFrame();
                else {
                    lastFrame = performance.now();
                    rafId = requestAnimationFrame(frame);
                }
            }
        }, 180);
    });

    start();
})();
