/* terminal.js — guest shell overlay (⌘K / ` / nav chip) */
(function () {
    'use strict';

    var GJ = window.GJ = window.GJ || {};
    var root = document.getElementById('terminal');
    var out = document.getElementById('term-out');
    var input = document.getElementById('term-in');
    if (!root || !out || !input) return;

    var opener = null;
    var booted = false;
    var history = [];
    var histIdx = -1;

    var SECTIONS = ['about', 'experience', 'opensource', 'projects', 'skills', 'activity', 'contact'];
    var ALIASES = { oss: 'opensource', home: 'top', '~': 'top', top: 'top' };

    function esc(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function print(html, cls) {
        var line = document.createElement('div');
        line.className = 't-line' + (cls ? ' ' + cls : '');
        line.innerHTML = html;
        out.appendChild(line);
        out.scrollTop = out.scrollHeight;
    }

    function printText(text, cls) {
        print(esc(text), cls);
    }

    function link(href, label, external) {
        return '<a href="' + href + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(label) + '</a>';
    }

    function pad(s, n) {
        while (s.length < n) s += ' ';
        return s;
    }

    function goTo(section) {
        close();
        if (section === 'top') window.scrollTo({ top: 0, behavior: GJ.reducedMotion ? 'auto' : 'smooth' });
        else if (GJ.scrollToSection) GJ.scrollToSection(section);
    }

    var COMMANDS = {
        help: {
            desc: 'this list',
            run: function () {
                Object.keys(COMMANDS).forEach(function (name) {
                    print('<span class="t-ok">' + esc(pad(name + (COMMANDS[name].args || ''), 18)) + '</span>' + esc(COMMANDS[name].desc), '');
                });
            }
        },
        whoami: {
            desc: 'who am i',
            run: function () {
                printText('garvit joshi — software engineer 2 @ moveinsync, bengaluru');
                printText('builds routing & trip-optimization systems · contributes to spring');
                print('status: <span class="t-ok">open_to_opportunities</span>');
            }
        },
        ls: {
            desc: 'list sections',
            run: function () {
                print(SECTIONS.map(function (s) {
                    return '<span class="t-ok">' + s + '/</span>';
                }).join('  ') + '  resume.pdf');
            }
        },
        cd: {
            desc: 'jump to a section',
            args: ' <section>',
            run: function (args) {
                var target = (args[0] || 'top').replace(/\/$/, '');
                target = ALIASES[target] || target;
                if (target === 'top' || SECTIONS.indexOf(target) !== -1) goTo(target);
                else printText('cd: no such section: ' + args[0] + " — try 'ls'", 't-err');
            }
        },
        open: {
            desc: 'open section / resume / github / linkedin',
            args: ' <x>',
            run: function (args) {
                var t = (args[0] || '').replace(/\/$/, '');
                t = ALIASES[t] || t;
                if (!t) return printText("open: what? — try 'open projects'", 't-err');
                if (SECTIONS.indexOf(t) !== -1 || t === 'top') return goTo(t);
                if (/^resume(\.pdf)?$/.test(t)) return COMMANDS.resume.run();
                if (t === 'github') return COMMANDS.github.run();
                if (t === 'linkedin') return COMMANDS.linkedin.run();
                printText('open: cannot open: ' + args[0], 't-err');
            }
        },
        cat: {
            desc: 'cat resume → opens the pdf',
            args: ' <file>',
            run: function (args) {
                if (/^resume(\.pdf)?$/.test(args[0] || '')) return COMMANDS.resume.run();
                printText('cat: ' + (args[0] || '') + ': binary blob of ambition (try: cat resume)', 't-dim');
            }
        },
        resume: {
            desc: 'open the pdf',
            run: function () {
                print('opening ' + link('Resume.pdf', 'resume.pdf', true) + ' …');
                window.open('Resume.pdf', '_blank', 'noopener');
            }
        },
        skills: {
            desc: 'tech i use daily',
            run: function () {
                print('<span class="t-ok">[languages]</span>      java 8–21 · sql · python · javascript');
                print('<span class="t-ok">[frameworks]</span>     spring boot · security · data jpa · webflux · jooq · aspectj');
                print('<span class="t-ok">[databases]</span>      postgresql · mysql · redis · neo4j · redshift · dynamodb');
                print('<span class="t-ok">[infrastructure]</span> aws · docker · kubernetes · kafka · rabbitmq');
                print('<span class="t-ok">[concepts]</span>       distributed systems · virtual threads · reactive');
            }
        },
        oss: {
            desc: 'merged spring prs',
            run: function () {
                print('<span class="t-ok">merged ✓</span> spring-security ' + link('https://github.com/spring-projects/spring-security/pull/18235', '#18235', true) + ' — thread-safety fix, compromised-password checker');
                print('<span class="t-ok">merged ✓</span> spring-boot     ' + link('https://github.com/spring-projects/spring-boot/pull/48967', '#48967', true) + ' — truststore certs in ssl actuator endpoint');
                print('<span class="t-ok">merged ✓</span> spring-cloud-gateway ' + link('https://github.com/spring-cloud/spring-cloud-gateway/pull/4089', '#4089', true) + ' — StripContextPath filter');
            }
        },
        github: {
            desc: 'open github profile',
            run: function () {
                print('opening ' + link('https://github.com/garvit-joshi/', 'github.com/garvit-joshi', true) + ' …');
                window.open('https://github.com/garvit-joshi/', '_blank', 'noopener');
            }
        },
        linkedin: {
            desc: 'open linkedin',
            run: function () {
                print('opening ' + link('https://www.linkedin.com/in/garvitjoshi9/', 'linkedin.com/in/garvitjoshi9', true) + ' …');
                window.open('https://www.linkedin.com/in/garvitjoshi9/', '_blank', 'noopener');
            }
        },
        email: {
            desc: 'how to reach me',
            run: function () {
                print(link('mailto:garvitjoshi9@gmail.com', 'garvitjoshi9@gmail.com'));
            }
        },
        uptime: {
            desc: 'time since first commit at moveinsync',
            run: function () {
                var days = Math.floor((Date.now() - new Date('2021-10-01T00:00:00+05:30').getTime()) / 86400000);
                printText('up ' + days + ' days · shipping since 2021.10 · load average: high');
            }
        },
        sudo: {
            desc: 'escalate privileges',
            args: ' hire-me',
            run: function (args) {
                if (args.join(' ') === 'hire-me') {
                    print('<span class="t-ok">access granted ✓</span> — root@garvit needs a new challenge');
                    print('→ ' + link('mailto:garvitjoshi9@gmail.com', 'garvitjoshi9@gmail.com'));
                } else {
                    printText('sudo: permission denied — unless: sudo hire-me', 't-err');
                }
            }
        },
        clear: {
            desc: 'clear scrollback',
            run: function () {
                out.innerHTML = '';
            }
        },
        exit: {
            desc: 'close terminal',
            run: function () {
                close();
            }
        }
    };

    function boot() {
        print('<span class="t-dim">garvit-joshi.github.io — guest shell</span>');
        print("<span class=\"t-dim\">type '<span class=\"t-ok\">help</span>' for commands · tab completes · esc closes</span>");
    }

    function exec(raw) {
        var line = raw.trim();
        print('<span class="t-ps1">garvit@portfolio:~$</span> ' + esc(raw), 't-echo');
        if (!line) return;
        history.push(line);
        histIdx = history.length;
        var parts = line.split(/\s+/);
        var cmd = parts[0].toLowerCase();
        var args = parts.slice(1);
        if (COMMANDS[cmd]) COMMANDS[cmd].run(args);
        else printText('command not found: ' + cmd + " — try 'help'", 't-err');
    }

    function complete() {
        var val = input.value;
        var parts = val.split(/\s+/);
        if (parts.length > 1) {
            /* complete section names for cd/open */
            var last = parts[parts.length - 1].toLowerCase();
            var pool = SECTIONS.concat(['resume', 'github', 'linkedin']);
            var hits = pool.filter(function (s) { return s.indexOf(last) === 0 && last; });
            if (hits.length === 1) {
                parts[parts.length - 1] = hits[0];
                input.value = parts.join(' ');
            } else if (hits.length > 1) {
                print(hits.join('  '), 't-dim');
            }
            return;
        }
        var names = Object.keys(COMMANDS).filter(function (n) { return n.indexOf(val.toLowerCase()) === 0 && val; });
        if (names.length === 1) input.value = names[0] + ' ';
        else if (names.length > 1) print(names.join('  '), 't-dim');
    }

    function open() {
        if (!root.hidden) return;
        opener = document.activeElement;
        root.hidden = false;
        if (!booted) {
            booted = true;
            boot();
        }
        input.focus();
    }

    function close() {
        if (root.hidden) return;
        root.hidden = true;
        if (opener && opener.focus) opener.focus();
    }

    GJ.openTerminal = open;
    GJ.closeTerminal = close;

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            exec(input.value);
            input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (histIdx > 0) input.value = history[--histIdx];
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (histIdx < history.length - 1) input.value = history[++histIdx];
            else {
                histIdx = history.length;
                input.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            complete();
        }
    });

    root.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
    });

    root.querySelectorAll('[data-term-close]').forEach(function (el) {
        el.addEventListener('click', close);
    });

    /* keep focus in the shell while it's open */
    root.addEventListener('click', function (e) {
        if (e.target === root || e.target.classList.contains('term-backdrop')) return;
        if (e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON') input.focus();
    });
})();
