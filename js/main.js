/* main.js — ui glue: nav, menu, reveals, metrics, github data */
(function () {
    'use strict';

    var GJ = window.GJ = window.GJ || {};
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    GJ.reducedMotion = reduced;

    GJ.scrollToSection = function (id) {
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    };

    /* ----- nav: scrolled state ----- */
    var nav = document.getElementById('navbar');
    function onScroll() {
        nav.classList.toggle('scrolled', window.scrollY > 40);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ----- nav: mobile menu ----- */
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    function closeMenu() {
        toggle.classList.remove('active');
        links.classList.remove('open');
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', function () {
        var open = links.classList.toggle('open');
        toggle.classList.toggle('active', open);
        document.body.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', closeMenu);
    });

    /* ----- nav: active section link ----- */
    var sections = document.querySelectorAll('section[id]');
    var navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');
    function setActive(id) {
        navAnchors.forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
    }
    var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) setActive(e.target.id);
        });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { spy.observe(s); });

    /* ----- scroll reveals ----- */
    var revealer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e, i) {
            if (e.isIntersecting) {
                e.target.style.transitionDelay = (i * 0.05) + 's';
                e.target.classList.add('revealed');
                revealer.unobserve(e.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -36px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { revealer.observe(el); });

    /* ----- count-up metrics ----- */
    function countUp(el) {
        var target = parseInt(el.getAttribute('data-count'), 10);
        var suffix = el.getAttribute('data-suffix') || '';
        if (isNaN(target)) return;
        if (reduced) {
            el.textContent = target + suffix;
            return;
        }
        var start = null;
        var dur = 900;
        function tick(ts) {
            if (!start) start = ts;
            var p = Math.min((ts - start) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(eased * target) + (p === 1 ? suffix : '');
            if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }
    GJ.countUp = countUp;

    var counter = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) {
                countUp(e.target);
                counter.unobserve(e.target);
            }
        });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-count]').forEach(function (el) { counter.observe(el); });

    /* ----- hero name: typed on load (skipped for reduced motion / no-js) ----- */
    var typedEl = document.getElementById('typed-name');
    if (typedEl && !reduced) {
        var fullName = typedEl.textContent;
        var nameH1 = typedEl.parentElement;
        var caret = nameH1.querySelector('.caret');
        /* reserve the final height so typing never shifts the layout */
        nameH1.style.minHeight = nameH1.offsetHeight + 'px';
        typedEl.textContent = '';
        if (caret) caret.classList.add('typing');
        var typedIdx = 0;
        setTimeout(function typeNext() {
            typedEl.textContent = fullName.slice(0, ++typedIdx);
            if (typedIdx < fullName.length) {
                setTimeout(typeNext, 62 + Math.random() * 75);
            } else if (caret) {
                setTimeout(function () { caret.classList.remove('typing'); }, 260);
            }
        }, 420);
    }

    /* ----- live github data (all failures are silent) ----- */
    var GH_USER = 'garvit-joshi';

    function escHTML(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function fetchJSON(url) {
        return fetch(url).then(function (r) {
            if (!r.ok) throw new Error(String(r.status));
            return r.json();
        });
    }

    fetchJSON('https://api.github.com/users/' + GH_USER).then(function (u) {
        var el = document.getElementById('gh-repos');
        if (el && typeof u.public_repos === 'number') {
            el.setAttribute('data-count', String(u.public_repos));
            counter.observe(el);
        }
    }).catch(function () {});

    fetchJSON('https://github-contributions-api.jogruber.de/v4/' + GH_USER + '?y=last').then(function (d) {
        var hm = document.getElementById('gh-heatmap');
        var sum = document.getElementById('gh-summary');
        if (!hm || !Array.isArray(d.contributions) || !d.contributions.length) throw new Error('shape');
        var frag = document.createDocumentFragment();
        d.contributions.forEach(function (c) {
            var cell = document.createElement('i');
            cell.className = 'lv' + (c.level || 0);
            cell.title = c.count + ' contribution' + (c.count === 1 ? '' : 's') + ' on ' + c.date;
            frag.appendChild(cell);
        });
        hm.appendChild(frag);
        hm.classList.add('on');
        if (sum && d.total && typeof d.total.lastYear === 'number') {
            sum.textContent = d.total.lastYear + ' contributions in the last 12 months';
        }
    }).catch(function () {
        var hm = document.getElementById('gh-heatmap');
        var sum = document.getElementById('gh-summary');
        if (hm) hm.hidden = true;
        if (sum) sum.hidden = true;
    });

    fetchJSON('https://api.github.com/users/' + GH_USER + '/repos?per_page=100&sort=pushed').then(function (repos) {
        var row = document.getElementById('gh-repos-row');
        var label = document.getElementById('gh-repos-label');
        if (!row || !Array.isArray(repos)) return;
        var LANG = {
            Java: '#b07219', Python: '#3572A5', 'C++': '#f34b7d', C: '#555555',
            JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26',
            CSS: '#663399', Shell: '#89e051', PHP: '#4F5D95', Go: '#00ADD8', Kotlin: '#A97BFF'
        };
        var picks = repos.filter(function (r) { return !r.fork; }).slice(0, 4);
        if (!picks.length) return;
        picks.forEach(function (r) {
            var a = document.createElement('a');
            a.className = 'gh-repo panel';
            a.href = r.html_url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.innerHTML = '<i class="tick" aria-hidden="true"></i>' +
                '<span class="gh-repo-name">' + escHTML(r.name) + '</span>' +
                '<span class="gh-repo-meta">' +
                (r.language ? '<span class="gh-lang"><i style="background:' + (LANG[r.language] || '#5d6b80') + '" aria-hidden="true"></i>' + escHTML(r.language) + '</span>' : '') +
                '<span class="gh-stars">★ ' + (r.stargazers_count || 0) + '</span>' +
                '</span>';
            row.appendChild(a);
        });
        if (label) label.hidden = false;
    }).catch(function () {});

    /* ----- terminal triggers ----- */
    var termChip = document.getElementById('term-chip');
    if (termChip) {
        termChip.addEventListener('click', function () {
            if (GJ.openTerminal) GJ.openTerminal();
        });
    }

    document.addEventListener('keydown', function (e) {
        var inField = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || e.target.isContentEditable;
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (GJ.openTerminal) GJ.openTerminal();
        } else if (e.key === '`' && !inField && !e.metaKey && !e.ctrlKey && !e.altKey) {
            e.preventDefault();
            if (GJ.openTerminal) GJ.openTerminal();
        }
    });

    if (/[?&]term=1/.test(location.search) && GJ.openTerminal) {
        GJ.openTerminal();
    }
})();
