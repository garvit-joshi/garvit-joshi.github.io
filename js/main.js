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
})();
