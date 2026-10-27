/* ==========================================================================
   LIENZOS Y ESTRIBOS  ·  Interacciones y animaciones

   Capas:
   1. Todo el contenido es visible sin JavaScript (mejora progresiva).
   2. Reveals, galería, cotizador, FAQ y formularios funcionan solo con JS nativo.
   3. GSAP + ScrollTrigger + Lenis añaden: scroll suave, scrub, pin y parallax.
      Si el CDN no carga, el sitio sigue completo y usable.

   Cambiar el WhatsApp del negocio: editar WA_NUMBER aquí y los enlaces
   wa.me/5212211919283 del HTML (búsqueda y reemplazo).
   ========================================================================== */
(() => {
    'use strict';

    /* ---------- Configuración ---------- */
    const WA_NUMBER = '5212211919283';
    const waLink = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

    /* ---------- Utilidades ---------- */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const safe = (name, fn) => { try { fn(); } catch (err) { console.warn(`[${name}]`, err); } };

    let lenis = null;
    const lockScroll = (on) => {
        if (lenis) { on ? lenis.stop() : lenis.start(); }
    };

    if (hasGSAP && !reduce) {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });
        root.classList.add('has-gsap');
    }
    const useGSAP = hasGSAP && !reduce;

    /* ==========================================================================
       1. LOADER  (progreso real + tiempo mínimo, salida en cortina)
       ========================================================================== */
    function runLoader() {
        const loader = $('#loader');
        const pctEl = $('#ld-pct');
        const bar = $('#ld-bar');
        const status = $('#ld-status');

        const finish = () => {
            root.classList.remove('is-loading');
            root.classList.add('is-ready');
            lockScroll(false);
            if (useGSAP) requestAnimationFrame(() => ScrollTrigger.refresh());
        };
        if (!loader) { finish(); return; }

        const phases = [[0, 'Calibrando rodillos'], [34, 'Midiendo el radio'], [68, 'Curvando el acero'], [95, 'Todo listo']];
        const MIN = reduce ? 250 : 2600;
        let loaded = document.readyState === 'complete';
        window.addEventListener('load', () => { loaded = true; }, { once: true });
        const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        let fontsOk = false;
        fontsReady.then(() => { fontsOk = true; });
        setTimeout(() => { fontsOk = true; }, 3500);

        const t0 = performance.now();
        let shown = 0;
        let lastPhase = -1;

        const tick = (now) => {
            const t = now - t0;
            const timeP = clamp(t / MIN, 0, 1);
            const ready = loaded && fontsOk;
            const target = ready ? timeP * 100 : Math.min(timeP * 100, 86);
            shown = Math.max(shown, shown + (target - shown) * .14);
            const v = Math.min(100, shown);

            pctEl.textContent = Math.round(v);
            bar.style.transform = `scaleX(${v / 100})`;
            let ph = 0;
            phases.forEach((p, i) => { if (v >= p[0]) ph = i; });
            if (ph !== lastPhase) { status.textContent = phases[ph][1]; lastPhase = ph; }

            if (ready && t >= MIN && v > 99.3) { exit(); return; }
            requestAnimationFrame(tick);
        };

        const exit = () => {
            pctEl.textContent = '100';
            bar.style.transform = 'scaleX(1)';
            status.textContent = 'Todo listo';
            setTimeout(() => {
                loader.classList.add('is-done');
                root.classList.remove('is-loading');
                setTimeout(() => { root.classList.add('is-ready'); lockScroll(false); }, 480);
                setTimeout(() => { loader.classList.add('is-gone'); if (useGSAP) ScrollTrigger.refresh(); }, 1500);
            }, 260);
        };

        requestAnimationFrame(tick);
    }

    /* ==========================================================================
       2. SCROLL SUAVE (Lenis) + anclas
       ========================================================================== */
    function smoothScroll() {
        if (!reduce && window.Lenis) {
            lenis = new Lenis({
                duration: 1.25,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                wheelMultiplier: .9,
            });
            lenis.stop();
            if (useGSAP) {
                lenis.on('scroll', ScrollTrigger.update);
                gsap.ticker.add((time) => lenis.raf(time * 1000));
                gsap.ticker.lagSmoothing(0);
            } else {
                const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
                requestAnimationFrame(raf);
            }
        }

        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a) return;
            const id = a.getAttribute('href');
            if (id.length < 2) return;
            const target = id === '#inicio' ? document.body : $(id);
            if (!target) return;
            e.preventDefault();
            closeMenu(true);
            const y = id === '#inicio' ? 0 : target;
            if (lenis) lenis.scrollTo(y, { offset: id === '#inicio' ? 0 : -76, duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
            else if (id === '#inicio') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
            else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
            history.replaceState(null, '', id);
        });
    }

    /* ==========================================================================
       3. NAVEGACIÓN + MENÚ MÓVIL
       ========================================================================== */
    const burger = $('#burger');
    const menu = $('#menu');
    let menuOpen = false;
    let menuTimer = null;

    function closeMenu(silent) {
        if (!menuOpen) return;
        menuOpen = false;
        menu.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Abrir menú');
        root.classList.remove('menu-open');
        lockScroll(false);
        clearTimeout(menuTimer);
        menuTimer = setTimeout(() => { menu.hidden = true; }, 850);
        if (!silent) burger.focus();
    }
    function openMenu() {
        if (menuOpen) return;
        menuOpen = true;
        clearTimeout(menuTimer);
        menu.hidden = false;
        void menu.offsetWidth;
        menu.classList.add('is-open');
        burger.classList.add('is-open');
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Cerrar menú');
        root.classList.add('menu-open');
        lockScroll(true);
        setTimeout(() => { const f = $('.menu-nav a', menu); if (f) f.focus({ preventScroll: true }); }, 450);
    }

    function nav() {
        if (burger && menu) {
            $$('.menu-nav a', menu).forEach((a, i) => a.style.setProperty('--i', i));
            burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
            document.addEventListener('keydown', (e) => {
                if (!menuOpen) return;
                if (e.key === 'Escape') closeMenu();
                if (e.key === 'Tab') {
                    const f = $$('a, button', menu).concat(burger).filter((n) => !n.disabled && n.offsetParent !== null);
                    if (!f.length) return;
                    const first = f[0], last = f[f.length - 1];
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                }
            });
            window.matchMedia('(min-width: 1100px)').addEventListener('change', (m) => { if (m.matches) closeMenu(true); });
        }

        const navEl = $('#nav');
        const sentinel = $('.nav-sentinel');
        if (navEl && sentinel && 'IntersectionObserver' in window) {
            new IntersectionObserver(([e]) => navEl.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);
        }

        const links = $$('.nav-links a');
        const map = new Map();
        links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) map.set(s, a); });
        if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) { links.forEach((l) => l.classList.remove('is-current')); map.get(e.target).classList.add('is-current'); }
                    else map.get(e.target).classList.remove('is-current');
                });
            }, { rootMargin: '-45% 0px -50% 0px' });
            map.forEach((_, s) => io.observe(s));
        }
    }

    /* ==========================================================================
       4. REVEALS + TEXTO DIVIDIDO POR PALABRAS
       ========================================================================== */
    function splitWords(el) {
        let i = 0;
        const walk = (node) => {
            Array.from(node.childNodes).forEach((n) => {
                if (n.nodeType === 3) {
                    const frag = document.createDocumentFragment();
                    n.textContent.split(/(\s+)/).forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const w = document.createElement('span'); w.className = 'w';
                        const wi = document.createElement('span'); wi.className = 'wi';
                        wi.style.setProperty('--i', i++); wi.textContent = part;
                        w.appendChild(wi); frag.appendChild(w);
                    });
                    n.replaceWith(frag);
                } else if (n.nodeType === 1) walk(n);
            });
        };
        walk(el);
    }

    function reveals() {
        $$('[data-split]').forEach(splitWords);
        const els = $$('[data-reveal], [data-split], .g-item');
        if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                e.target.classList.add('is-in');
                io.unobserve(e.target);
            });
        }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
        els.forEach((el) => io.observe(el));
    }

    /* ==========================================================================
       5. HERO: partículas orbitales + parallax
       ========================================================================== */
    function hero() {
        const section = $('.hero');
        const canvas = $('.hero-fx');
        if (!section || !canvas) return;

        if (!reduce) {
            const ctx = canvas.getContext('2d');
            const palette = ['220,36,48', '46,67,196', '255,198,26', '10,15,32'];
            let w = 0, h = 0, dpr = 1, parts = [], cx = 0, cy = 0, raf = 0, last = 0, visible = true;

            const build = () => {
                const n = Math.round(clamp((w * h) / 15000, 28, 90));
                const wide = w >= 1024;
                cx = wide ? w * .72 : w * .5;
                cy = wide ? h * .5 : h * .74;
                const maxR = Math.max(w, h) * .62;
                parts = Array.from({ length: n }, () => ({
                    r: 90 + Math.random() * maxR,
                    a: Math.random() * Math.PI * 2,
                    s: (Math.random() * .00022 + .00005) * (Math.random() < .5 ? -1 : 1),
                    size: Math.random() * 2 + .8,
                    c: palette[(Math.random() * palette.length) | 0],
                    o: Math.random() * .45 + .2,
                    f: .55 + Math.random() * .25,
                }));
            };
            const resize = () => {
                dpr = Math.min(window.devicePixelRatio || 1, 2);
                w = section.clientWidth; h = section.clientHeight;
                canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                build();
            };
            const frame = (now) => {
                raf = 0;
                if (!visible) return;
                const dt = Math.min(now - (last || now), 50); last = now;
                ctx.clearRect(0, 0, w, h);
                for (const p of parts) {
                    const prev = p.a;
                    p.a += p.s * dt;
                    const x = cx + Math.cos(p.a) * p.r, y = cy + Math.sin(p.a) * p.r * p.f;
                    const px = cx + Math.cos(prev - p.s * dt * 10) * p.r, py = cy + Math.sin(prev - p.s * dt * 10) * p.r * p.f;
                    ctx.strokeStyle = `rgba(${p.c},${p.o * .5})`; ctx.lineWidth = p.size * .7;
                    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
                    ctx.fillStyle = `rgba(${p.c},${p.o})`;
                    ctx.beginPath(); ctx.arc(x, y, p.size, 0, 6.2832); ctx.fill();
                }
                raf = requestAnimationFrame(frame);
            };
            resize();
            let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 200); });
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(([e]) => {
                    visible = e.isIntersecting;
                    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
                }).observe(section);
            }
            raf = requestAnimationFrame(frame);
        }

        if (!useGSAP) return;

        // Parallax con el scroll
        gsap.to('.hero-visual', { yPercent: -7, ease: 'none', scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.hero-copy', { yPercent: 12, opacity: .25, ease: 'none', scrollTrigger: { trigger: section, start: '15% top', end: 'bottom top', scrub: true } });

        // Parallax con el puntero (solo escritorio)
        if (finePointer) {
            const layers = $$('.hero-visual [data-depth]').map((el) => ({
                d: +el.dataset.depth,
                x: gsap.quickTo(el, 'x', { duration: .9, ease: 'power3.out' }),
                y: gsap.quickTo(el, 'y', { duration: .9, ease: 'power3.out' }),
            }));
            section.addEventListener('pointermove', (e) => {
                const r = section.getBoundingClientRect();
                const nx = (e.clientX - r.left) / r.width - .5;
                const ny = (e.clientY - r.top) / r.height - .5;
                layers.forEach((l) => { l.x(nx * -16 * l.d); l.y(ny * -12 * l.d); });
            });
            section.addEventListener('pointerleave', () => layers.forEach((l) => { l.x(0); l.y(0); }));
        }
    }

    /* ==========================================================================
       6. MANIFIESTO (texto que se ilumina) + CONTADORES
       ========================================================================== */
    function manifest() {
        const text = $('.manifest-text');
        if (text && useGSAP) {
            const walk = (node) => {
                Array.from(node.childNodes).forEach((n) => {
                    if (n.nodeType === 3) {
                        const frag = document.createDocumentFragment();
                        n.textContent.split(/(\s+)/).forEach((part) => {
                            if (!part) return;
                            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                            const s = document.createElement('span'); s.className = 'sw'; s.textContent = part; frag.appendChild(s);
                        });
                        n.replaceWith(frag);
                    } else if (n.nodeType === 1) walk(n);
                });
            };
            walk(text);
            gsap.to($$('.sw', text), {
                opacity: 1, stagger: .12, ease: 'none',
                scrollTrigger: { trigger: text, start: 'top 82%', end: 'bottom 52%', scrub: true },
            });
        }

        const counters = $$('[data-count]');
        if (!counters.length || !('IntersectionObserver' in window)) return;
        counters.forEach((c) => { c.textContent = '0'; });
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (!e.isIntersecting) return;
                io.unobserve(e.target);
                const el = e.target, to = +el.dataset.count;
                if (reduce) { el.textContent = to; return; }
                const o = { v: 0 };
                if (hasGSAP) gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } });
                else el.textContent = to;
            });
        }, { threshold: .6 });
        counters.forEach((c) => io.observe(c));
    }

    /* ==========================================================================
       7. MARQUEE reactivo al scroll (velocidad y dirección)
       ========================================================================== */
    function marquee() {
        const track = $('#marquee-track');
        if (!track || !useGSAP) return;
        track.classList.add('is-js');
        let x = 0, vel = 0, dirTarget = 1, dir = 1, speed = 70;
        ScrollTrigger.create({
            start: 0, end: 'max',
            onUpdate: (s) => { vel = Math.abs(s.getVelocity()); dirTarget = s.direction === 1 ? 1 : -1; },
        });
        gsap.ticker.add((time, deltaMs) => {
            const dt = Math.min(deltaMs, 50) / 1000;
            vel *= .94;
            dir += (dirTarget - dir) * Math.min(1, dt * 5);
            const boost = clamp(vel, 0, 3500) / 3500 * 700;
            x -= (speed + boost) * dir * dt;
            const half = track.scrollWidth / 2;
            if (x <= -half) x += half;
            if (x > 0) x -= half;
            track.style.transform = `translate3d(${x}px,0,0)`;
        });
    }

    /* ==========================================================================
       8. SERVICIOS: acordeón + escenario con imágenes
       ========================================================================== */
    function services() {
        const items = $$('.svc');
        const figs = $$('.svc-stage figure');
        if (!items.length) return;

        const setActive = (i) => {
            items.forEach((it, k) => {
                const on = k === i;
                it.classList.toggle('is-active', on);
                $('.svc-btn', it).setAttribute('aria-expanded', String(on));
            });
            if (i >= 0) figs.forEach((f, k) => f.classList.toggle('is-active', k === i));
        };

        items.forEach((it, i) => {
            $('.svc-btn', it).addEventListener('click', () => {
                const isOpen = it.classList.contains('is-active');
                const desktop = window.matchMedia('(min-width: 1024px)').matches;
                setActive(isOpen && !desktop ? -1 : i);
            });
        });

        $$('[data-wa]').forEach((a) => {
            a.href = waLink(`Hola, quiero cotizar: ${a.dataset.wa}.`);
        });
    }

    /* ==========================================================================
       9. SHOWREEL: la imagen se abre con el scroll
       ========================================================================== */
    function reel() {
        const sec = $('.reel');
        const video = $('#reel-video');
        const sound = $('#reel-sound');
        if (!sec || !video) return;

        const toggleSound = () => {
            video.muted = !video.muted;
            if (!video.muted) { video.volume = 1; const p = video.play(); if (p) p.catch(() => {}); }
            const on = !video.muted;
            sound.setAttribute('aria-pressed', String(on));
            sound.setAttribute('aria-label', on ? 'Silenciar video' : 'Activar sonido del video');
            $('i', sound).className = on ? 'ph-bold ph-speaker-high' : 'ph-bold ph-speaker-slash';
        };
        sound.addEventListener('click', toggleSound);

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([e]) => {
                if (e.isIntersecting && !reduce) { const p = video.play(); if (p) p.catch(() => {}); }
                else video.pause();
            }, { rootMargin: '150px 0px', threshold: 0 }).observe(sec);
        }
        if (reduce) { video.controls = true; video.removeAttribute('loop'); }

        if (!useGSAP) return;
        const desktopMQ = window.matchMedia('(min-width: 1024px)');
        sec.classList.add('is-live');

        const update = (p) => {
            const desktop = desktopMQ.matches;
            const open = easeInOut(clamp(p / .72, 0, 1));
            sec.style.setProperty('--s', lerp(desktop ? .4 : .58, 1, open).toFixed(4));
            sec.style.setProperty('--r', lerp(44, desktop ? 26 : 0, open).toFixed(1));
            sec.style.setProperty('--cap-o', clamp((p - .6) / .22, 0, 1).toFixed(3));
            sec.style.setProperty('--side-o', clamp((p - .5) / .25, 0, 1).toFixed(3));
        };
        update(0);
        ScrollTrigger.create({
            trigger: sec, start: 'top top', end: 'bottom bottom', scrub: true,
            onUpdate: (s) => update(s.progress),
            onRefresh: (s) => update(s.progress),
        });
    }

    /* ==========================================================================
       10. GALERÍA: filtros, parallax y visor
       ========================================================================== */
    function gallery() {
        const grid = $('#g-grid');
        if (!grid) return;
        const items = $$('.g-item', grid);

        // Parallax interno de cada imagen
        if (useGSAP) {
            $$('.g-btn img', grid).forEach((img) => {
                gsap.set(img, { scale: 1.14 });
                gsap.fromTo(img, { yPercent: -5 }, {
                    yPercent: 5, ease: 'none',
                    scrollTrigger: { trigger: img.closest('.g-btn'), start: 'top bottom', end: 'bottom top', scrub: true },
                });
            });
        }

        // Filtros
        const chips = $$('.chip');
        chips.forEach((chip) => chip.addEventListener('click', () => {
            const f = chip.dataset.filter;
            chips.forEach((c) => { const on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
            grid.style.transition = 'opacity .25s';
            grid.style.opacity = '0';
            setTimeout(() => {
                items.forEach((it) => it.classList.toggle('is-hidden', f !== 'all' && it.dataset.cat !== f));
                grid.style.opacity = '1';
                if (useGSAP) ScrollTrigger.refresh();
            }, 260);
        }));

        // Visor
        const lb = $('#lb');
        const stage = $('#lb-stage');
        const cap = $('#lb-cap');
        const cta = $('#lb-cta');
        let list = [], cur = 0;

        const render = () => {
            const it = list[cur];
            const caption = $('figcaption', it).textContent.trim();
            const img = $('img', it);
            stage.innerHTML = '';
            if (it.dataset.type === 'video') {
                const v = document.createElement('video');
                v.src = 'assets/video/taller-rolado-tubo.mp4';
                v.poster = img.getAttribute('src');
                v.controls = true; v.autoplay = true; v.playsInline = true; v.loop = true;
                v.setAttribute('aria-label', caption);
                stage.appendChild(v);
            } else {
                const im = document.createElement('img');
                im.src = img.getAttribute('src'); im.alt = img.alt;
                stage.appendChild(im);
            }
            cap.textContent = caption;
            cta.href = waLink(`Hola, vi en su página "${caption}" y quiero una pieza como esta. ¿Me pueden cotizar?`);
        };
        const open = (el) => {
            list = items.filter((i) => !i.classList.contains('is-hidden'));
            cur = Math.max(0, list.indexOf(el));
            render();
            if (!lb.open) lb.showModal();
            root.classList.add('lb-open');
            lockScroll(true);
        };
        const step = (d) => { cur = (cur + d + list.length) % list.length; render(); };

        items.forEach((it) => $('.g-btn', it).addEventListener('click', () => open(it)));
        $('.lb-close', lb).addEventListener('click', () => lb.close());
        $('.lb-prev', lb).addEventListener('click', () => step(-1));
        $('.lb-next', lb).addEventListener('click', () => step(1));
        lb.addEventListener('close', () => { stage.innerHTML = ''; root.classList.remove('lb-open'); lockScroll(false); });
        lb.addEventListener('click', (e) => { if (e.target === lb || e.target === stage) lb.close(); });
        lb.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') step(-1);
            if (e.key === 'ArrowRight') step(1);
        });
        let sx = 0;
        stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
        stage.addEventListener('pointerup', (e) => {
            const dx = e.clientX - sx;
            if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
        });
    }

    /* ==========================================================================
       11. COTIZADOR: curva en vivo + mensaje a WhatsApp
       ========================================================================== */
    function quote() {
        const form = $('#q-form');
        if (!form) return;

        const DATA = {
            tubo: {
                label: 'Diámetro del tubo', def: '2″', schedLabel: 'Cédula o calibre (opcional)', ph: 'Ej. cédula 40',
                opts: ['½″', '¾″', '1″', '1¼″', '1½″', '2″', '2½″', '3″', '3½″', '4″'],
                mm: { '½″': 12.7, '¾″': 19, '1″': 25.4, '1¼″': 32, '1½″': 38, '2″': 50.8, '2½″': 63.5, '3″': 76, '3½″': 89, '4″': 101.6 },
                piece: (s) => `Tubo de ${s}`,
            },
            placa: {
                label: 'Calibre o espesor', def: 'Cal. 14', schedLabel: 'Ancho de la placa (opcional)', ph: 'Ej. 1,000 mm',
                opts: ['Cal. 26', 'Cal. 24', 'Cal. 22', 'Cal. 20', 'Cal. 18', 'Cal. 16', 'Cal. 14', 'Cal. 12', 'Cal. 10', '3/16″', '¼″', '3/8″', '½″', '¾″', '1″'],
                piece: (s) => `Placa ${s}`,
            },
            perfil: {
                label: 'Serie o perfil', def: 'P-100 a P-400', schedLabel: 'Medida del claro (opcional)', ph: 'Ej. 1.20 x 2.10 m',
                opts: ['P-100 a P-400', 'M225-103', '101 a 106', '121', '126', 'K100 a K400', 'Bolsas dos y tres'],
                piece: (s) => `Perfil ${s}`,
            },
        };

        const el = {
            size: $('#q-size'), sizeLabel: $('#q-size-label'), sched: $('#q-sched'), schedLabel: $('#q-sched-label'),
            r: $('#q-radius'), rn: $('#q-radius-n'), a: $('#q-angle'), an: $('#q-angle-n'), qty: $('#q-qty'),
            svg: $('#q-svg'), arc: $('#q-arc'), guides: $('#q-guides'), dot: $('#q-dot'),
            rPiece: $('#r-piece'), rRadius: $('#r-radius'), rAngle: $('#r-angle'), rLen: $('#r-length'), send: $('#q-send'),
        };

        const state = { type: 'tubo', mat: 'Acero', r: +el.r.value, a: +el.a.value };
        const view = { r: state.r, a: state.a };
        const VW = 520, VH = 380, PAD = 52;
        let pts = [], map = (p) => p;
        const fmt = (n) => Math.round(n).toLocaleString('es-MX');
        const NS = 'http://www.w3.org/2000/svg';

        const setFill = (input) => {
            const min = +input.min, max = +input.max;
            input.style.setProperty('--fill', `${((input.value - min) / (max - min)) * 100}%`);
        };

        const buildSizes = () => {
            const d = DATA[state.type];
            el.sizeLabel.textContent = d.label;
            el.schedLabel.textContent = d.schedLabel;
            el.sched.placeholder = d.ph;
            el.sched.value = '';
            el.size.innerHTML = d.opts.map((o) => `<option value="${o}"${o === d.def ? ' selected' : ''}>${o}</option>`).join('');
        };

        const geometry = (r, a) => {
            const half = (a / 2) * Math.PI / 180;
            const n = Math.max(10, Math.round(a / 2.5));
            const out = [];
            for (let i = 0; i <= n; i++) {
                const phi = -half + (2 * half * i) / n;
                out.push([r * Math.sin(phi), -r * Math.cos(phi)]);
            }
            return out;
        };

        const mk = (tag, attrs) => {
            const n = document.createElementNS(NS, tag);
            Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
            return n;
        };

        const draw = () => {
            const r = view.r, a = view.a;
            pts = geometry(r, a);
            let minX = 0, maxX = 0, minY = 0, maxY = 0;
            pts.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
            const w = Math.max(maxX - minX, 1), h = Math.max(maxY - minY, 1);
            const sc = Math.min((VW - 2 * PAD) / w, (VH - 2 * PAD) / h);
            const ox = VW / 2 - ((minX + maxX) / 2) * sc, oy = VH / 2 - ((minY + maxY) / 2) * sc;
            map = ([x, y]) => [ox + x * sc, oy + y * sc];

            const P = pts.map(map);
            el.arc.setAttribute('d', 'M' + P.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L'));
            const d = DATA[state.type];
            const mm = d.mm && d.mm[el.size.value];
            const thick = clamp((mm || 26) * sc, 8, 26);
            el.arc.setAttribute('stroke-width', thick.toFixed(1));

            // Guías técnicas (se escalan cuando el SVG se muestra más pequeño que su viewBox)
            const k = clamp(VW / (el.svg.clientWidth || VW), 1, 1.9);
            el.dot.setAttribute('r', (6 * k).toFixed(1));
            const [cx, cy] = map([0, 0]);
            const first = P[0], last = P[P.length - 1];
            const mid = map([0, -r]);
            el.guides.innerHTML = '';
            const dash = { stroke: 'rgba(238,241,250,.42)', 'stroke-width': 1.2 * k, 'stroke-dasharray': `${5 * k} ${5 * k}`, fill: 'none' };
            el.guides.appendChild(mk('line', { x1: cx, y1: cy, x2: first[0], y2: first[1], ...dash }));
            if (a < 355) el.guides.appendChild(mk('line', { x1: cx, y1: cy, x2: last[0], y2: last[1], ...dash }));
            el.guides.appendChild(mk('line', { x1: cx, y1: cy, x2: mid[0], y2: mid[1], stroke: 'rgba(255,255,255,.85)', 'stroke-width': 1.4 * k, fill: 'none' }));
            el.guides.appendChild(mk('circle', { cx, cy, r: 4 * k, fill: '#FFC61A' }));

            const wr = 34 * k, half = (a / 2) * Math.PI / 180;
            if (a < 355) {
                const w1 = [cx + wr * Math.sin(-half), cy - wr * Math.cos(-half)];
                const w2 = [cx + wr * Math.sin(half), cy - wr * Math.cos(half)];
                el.guides.appendChild(mk('path', { d: `M${w1[0]} ${w1[1]}A${wr} ${wr} 0 ${a > 180 ? 1 : 0} 1 ${w2[0]} ${w2[1]}`, stroke: '#FFC61A', 'stroke-width': 2 * k, fill: 'none' }));
            } else {
                el.guides.appendChild(mk('circle', { cx, cy, r: wr, stroke: '#FFC61A', 'stroke-width': 2 * k, fill: 'none' }));
            }
            const txt = (x, y, s, anchor) => {
                const t = mk('text', { x, y, 'text-anchor': anchor || 'middle', fill: '#EEF1FA', 'font-size': 13 * k, 'font-family': 'Geist Mono, monospace', 'font-weight': 500, 'paint-order': 'stroke', stroke: '#070C22', 'stroke-width': 5 * k, 'stroke-linejoin': 'round' });
                t.textContent = s; return t;
            };
            const rx = cx + (mid[0] - cx) * .5, ry = cy + (mid[1] - cy) * .5;
            el.guides.appendChild(txt(rx + 10 * k, ry, `R ${fmt(r)}`, 'start'));
            el.guides.appendChild(txt(cx, cy + 26 * k, `${Math.round(a)}°`, 'middle'));
        };

        const updateReadout = () => {
            const d = DATA[state.type];
            const len = Math.PI * state.r * state.a / 180;
            el.rPiece.textContent = d.piece(el.size.value);
            el.rRadius.textContent = `${fmt(state.r)} mm`;
            el.rAngle.textContent = `${Math.round(state.a)}°`;
            el.rLen.textContent = `${fmt(len)} mm`;
            const qty = Math.max(1, parseInt(el.qty.value, 10) || 1);
            const lines = [
                'Hola, quiero cotizar un rolado:',
                `• Pieza: ${d.piece(el.size.value)}${el.sched.value.trim() ? ` (${el.sched.value.trim()})` : ''}`,
                `• Material: ${state.mat}`,
                `• Radio al centro: ${fmt(state.r)} mm`,
                `• Ángulo del arco: ${Math.round(state.a)}°`,
                `• Largo de arco aprox.: ${fmt(len)} mm`,
                `• Cantidad: ${qty} ${qty === 1 ? 'pieza' : 'piezas'}`,
            ];
            el.send.href = waLink(lines.join('\n'));
        };

        const update = () => {
            state.r = clamp(+el.r.value, 50, 3000);
            state.a = clamp(+el.a.value, 10, 360);
            setFill(el.r); setFill(el.a);
            updateReadout();
            if (hasGSAP && !reduce) {
                gsap.to(view, { r: state.r, a: state.a, duration: .6, ease: 'power3.out', overwrite: true, onUpdate: draw });
            } else { view.r = state.r; view.a = state.a; draw(); }
        };

        // Sincronización rango <-> número
        const link = (range, num, min, max) => {
            range.addEventListener('input', () => { num.value = range.value; update(); });
            num.addEventListener('input', () => {
                const v = parseFloat(num.value);
                if (!isNaN(v)) { range.value = clamp(v, min, max); update(); }
            });
            num.addEventListener('blur', () => { num.value = clamp(parseFloat(num.value) || min, min, max); range.value = num.value; update(); });
        };
        link(el.r, el.rn, 50, 3000);
        link(el.a, el.an, 10, 360);

        $$('.quick button').forEach((b) => b.addEventListener('click', () => {
            el.a.value = el.an.value = b.dataset.angle; update();
        }));
        $$('[data-step]').forEach((b) => b.addEventListener('click', () => {
            el.qty.value = clamp((parseInt(el.qty.value, 10) || 1) + (+b.dataset.step), 1, 999); updateReadout();
        }));
        el.qty.addEventListener('input', updateReadout);
        el.qty.addEventListener('blur', () => { el.qty.value = clamp(parseInt(el.qty.value, 10) || 1, 1, 999); updateReadout(); });
        el.size.addEventListener('change', () => { updateReadout(); draw(); });
        el.sched.addEventListener('input', updateReadout);
        $$('input[name="q-type"]').forEach((r) => r.addEventListener('change', () => {
            state.type = r.value; buildSizes(); updateReadout(); draw();
        }));
        $$('input[name="q-mat"]').forEach((r) => r.addEventListener('change', () => { state.mat = r.value; updateReadout(); }));
        form.addEventListener('submit', (e) => e.preventDefault());

        buildSizes();
        update();
        draw();
        let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(draw, 120); });

        // Punto que recorre la curva (movimiento continuo, solo si es visible)
        if (!reduce && 'IntersectionObserver' in window) {
            let vis = false, t = 0, last = 0, raf = 0;
            const loop = (now) => {
                raf = 0; if (!vis) return;
                const dt = Math.min(now - (last || now), 50); last = now;
                t = (t + dt * .00018) % 1;
                const p = t < .5 ? t * 2 : 2 - t * 2;
                const i = p * (pts.length - 1);
                const i0 = Math.floor(i), i1 = Math.min(pts.length - 1, i0 + 1);
                const a0 = map(pts[i0]), a1 = map(pts[i1]), f = i - i0;
                el.dot.setAttribute('cx', lerp(a0[0], a1[0], f).toFixed(1));
                el.dot.setAttribute('cy', lerp(a0[1], a1[1], f).toFixed(1));
                raf = requestAnimationFrame(loop);
            };
            new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis && !raf) { last = 0; raf = requestAnimationFrame(loop); } }).observe(el.svg);
        }
    }

    /* ==========================================================================
       12. PROCESO: recorrido horizontal fijado (escritorio)
       ========================================================================== */
    function process() {
        const sec = $('.process');
        const track = $('#process-track');
        if (!sec || !track || !useGSAP) return;

        const mm = gsap.matchMedia();
        mm.add('(min-width: 1024px)', () => {
            sec.classList.add('is-live');
            const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
            gsap.to(track, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: {
                    trigger: sec, start: 'top top', end: () => '+=' + dist(),
                    pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true,
                    onUpdate: (s) => sec.style.setProperty('--p', s.progress.toFixed(4)),
                },
            });
            return () => { sec.classList.remove('is-live'); sec.style.removeProperty('--p'); gsap.set(track, { clearProps: 'transform' }); };
        });
    }

    /* ==========================================================================
       13. BENTO (parallax), FAQ, progreso de lectura
       ========================================================================== */
    function bento() {
        if (!useGSAP) return;
        $$('.bn > img').forEach((img) => {
            gsap.fromTo(img, { yPercent: -5 }, {
                yPercent: 5, ease: 'none',
                scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
            });
        });
    }

    function faq() {
        const items = $$('.qa');
        items.forEach((it) => {
            const q = $('.qa-q', it);
            q.addEventListener('click', () => {
                const open = !it.classList.contains('is-open');
                items.forEach((o) => { o.classList.remove('is-open'); $('.qa-q', o).setAttribute('aria-expanded', 'false'); });
                if (open) { it.classList.add('is-open'); q.setAttribute('aria-expanded', 'true'); }
            });
        });
    }

    function progress() {
        const bar = $('.progress span');
        if (!bar || !useGSAP) return;
        gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
    }

    /* ==========================================================================
       14. BOTONES MAGNÉTICOS (solo puntero fino)
       ========================================================================== */
    function magnetic() {
        if (reduce || !finePointer) return;
        $$('[data-magnetic]').forEach((b) => {
            b.addEventListener('pointermove', (e) => {
                const r = b.getBoundingClientRect();
                b.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - .5) * 12}px`);
                b.style.setProperty('--my', `${((e.clientY - r.top) / r.height - .5) * 10}px`);
            });
            b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
        });
    }

    /* ==========================================================================
       15. FORMULARIO DE CONTACTO → WHATSAPP
       ========================================================================== */
    function contactForm() {
        const form = $('#wa-form');
        if (!form) return;
        const f = { name: $('#f-name'), phone: $('#f-phone'), service: $('#f-service'), msg: $('#f-msg') };
        const note = $('#f-note');

        const setErr = (input, text) => {
            const group = input.closest('.f-group');
            group.classList.toggle('has-error', !!text);
            const err = $('.f-err', group);
            if (err) err.textContent = text || '';
            input.setAttribute('aria-invalid', text ? 'true' : 'false');
        };
        [f.name, f.service, f.msg].forEach((i) => i.addEventListener('input', () => setErr(i, '')));
        f.service.addEventListener('change', () => setErr(f.service, ''));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let first = null;
            const check = (input, ok, text) => { setErr(input, ok ? '' : text); if (!ok && !first) first = input; };
            check(f.name, f.name.value.trim().length >= 2, 'Escribe tu nombre.');
            check(f.service, !!f.service.value, 'Elige qué necesitas.');
            check(f.msg, f.msg.value.trim().length >= 5, 'Cuéntanos las medidas o el detalle del trabajo.');
            if (first) { first.focus(); note.classList.remove('is-ok'); note.textContent = 'Revisa los campos marcados.'; return; }

            const lines = [
                `Hola, soy ${f.name.value.trim()}.`,
                `Quiero cotizar: ${f.service.value}.`,
                `Detalles: ${f.msg.value.trim()}`,
            ];
            if (f.phone.value.trim()) lines.push(`Mi teléfono: ${f.phone.value.trim()}`);
            const url = waLink(lines.join('\n'));
            note.classList.add('is-ok');
            note.textContent = 'Abriendo WhatsApp con tu solicitud...';
            const w = window.open(url, '_blank', 'noopener');
            if (!w) window.location.href = url;
        });
    }

    /* ==========================================================================
       ARRANQUE
       ========================================================================== */
    safe('scroll', smoothScroll);
    safe('nav', nav);
    safe('reveals', reveals);
    safe('hero', hero);
    safe('manifest', manifest);
    safe('marquee', marquee);
    safe('services', services);
    safe('reel', reel);
    safe('gallery', gallery);
    safe('quote', quote);
    safe('process', process);
    safe('bento', bento);
    safe('faq', faq);
    safe('progress', progress);
    safe('magnetic', magnetic);
    safe('contact', contactForm);
    safe('loader', runLoader);

    // Recalcular posiciones cuando cargan fuentes e imágenes
    if (useGSAP) {
        window.addEventListener('load', () => ScrollTrigger.refresh());
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
})();
