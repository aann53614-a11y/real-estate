/* ============================================================
   MERIDIAN & CO. — Interactions
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const clamp  = (v, min, max) => Math.min(Math.max(v, min), max);
  const lerp   = (a, b, t) => a + (b - a) * t;

  /* ==========================================================
     1. PRELOADER
     ========================================================== */
  (function preloader() {
    const el    = $("#preloader");
    const bar   = $("#preloaderBar");
    const count = $("#preloaderCount");
    const hero  = $("#hero");

    if (!el) return;

    let progress = 0;
    let finished = false;

    // Simulated + real progress: advance toward 100 while assets load.
    const timer = setInterval(() => {
      const ceiling = finished ? 100 : 92;
      progress = lerp(progress, ceiling, finished ? 0.22 : 0.06);
      if (ceiling - progress < 0.6) progress = ceiling;

      if (bar)   bar.style.transform = `scaleX(${progress / 100})`;
      if (count) count.textContent = Math.round(progress);

      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(reveal, 320);
      }
    }, 60);

    function reveal() {
      el.classList.add("is-done");
      document.body.classList.remove("is-locked");
      if (hero) hero.classList.add("is-ready");
      initReveals();
      setTimeout(() => el.remove(), 900);
    }

    // Don't trap the user if images are slow.
    const guard = setTimeout(() => { finished = true; }, 2600);

    window.addEventListener("load", () => {
      finished = true;
      clearTimeout(guard);
    });

    document.body.classList.add("is-locked");
  })();

  /* ==========================================================
     2. CUSTOM CURSOR
     ========================================================== */
  (function cursor() {
    if (isTouch || prefersReduced) return;
    const root = $("#cursor");
    if (!root) return;

    const dot   = $(".cursor__dot", root);
    const ring  = $(".cursor__ring", root);
    const label = $("#cursorLabel", root);

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let dx = mx, dy = my;   // dot
    let rx = mx, ry = my;   // ring
    let scale = 1;

    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
    }, { passive: true });

    window.addEventListener("mousedown", () => root.classList.add("is-down"));
    window.addEventListener("mouseup",   () => root.classList.remove("is-down"));

    function raf() {
      dx = lerp(dx, mx, 0.55);
      dy = lerp(dy, my, 0.55);
      rx = lerp(rx, mx, 0.14);
      ry = lerp(ry, my, 0.14);

      dot.style.transform  = `translate3d(${dx}px, ${dy}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) scale(${scale})`;
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Hover / view states via delegation
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (!t) return;
      const mode = t.getAttribute("data-cursor");
      if (mode === "view") {
        root.classList.add("is-view");
        if (label) label.textContent = "View";
      } else {
        root.classList.add("is-hover");
      }
    });

    document.addEventListener("mouseout", (e) => {
      const t = e.target.closest("[data-cursor]");
      if (!t) return;
      root.classList.remove("is-hover", "is-view");
    });

    // Grow ring over native interactive elements too
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("a, button, input, select, textarea");
      if (t && !t.hasAttribute("data-cursor")) root.classList.add("is-hover");
    });
    document.addEventListener("mouseout", (e) => {
      const t = e.target.closest("a, button, input, select, textarea");
      if (t && !t.hasAttribute("data-cursor")) root.classList.remove("is-hover");
    });

    document.addEventListener("mouseleave", () => { root.style.opacity = "0"; });
    document.addEventListener("mouseenter", () => { root.style.opacity = "1"; });
  })();

  /* ==========================================================
     3. NAV — sticky, auto-hide, mobile menu
     ========================================================== */
  (function nav() {
    const el     = $("#nav");
    const burger = $("#navBurger");
    const menu   = $("#mobileMenu");
    if (!el) return;

    let lastY = window.scrollY;

    function onScroll() {
      const y = window.scrollY;

      el.classList.toggle("is-stuck", y > 40);
      // Auto-hide when scrolling down past the hero, show on scroll up.
      if (y > 520 && y > lastY + 4) el.classList.add("is-hidden");
      else if (y < lastY - 4 || y < 520) el.classList.remove("is-hidden");

      lastY = y;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (burger && menu) {
      const toggle = (open) => {
        burger.classList.toggle("is-open", open);
        menu.classList.toggle("is-open", open);
        burger.setAttribute("aria-expanded", String(open));
        menu.setAttribute("aria-hidden", String(!open));
        document.body.classList.toggle("is-locked", open);
        if (open) el.classList.remove("is-hidden");
      };

      burger.addEventListener("click", () =>
        toggle(!burger.classList.contains("is-open"))
      );

      $$(".mobileMenu__link", menu).forEach((a) =>
        a.addEventListener("click", () => toggle(false))
      );

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") toggle(false);
      });
    }
  })();

  /* ==========================================================
     4. SCROLL PROGRESS BAR
     ========================================================== */
  (function progressBar() {
    const bar = $("#progressBar");
    if (!bar) return;

    let ticking = false;
    function update() {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? clamp(window.scrollY / h, 0, 1) : 0;
      bar.style.transform = `scaleX(${p})`;
      ticking = false;
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
  })();

  /* ==========================================================
     5. SCROLL REVEALS (IntersectionObserver)
     ========================================================== */
  function initReveals() {
    const items = $$("[data-reveal], [data-split-words]");
    if (!items.length) return;

    if (prefersReduced) {
      items.forEach((n) => n.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;

          // Stagger siblings inside a shared grid
          const parent = el.parentElement;
          if (parent) {
            const sibs = $$("[data-reveal]", parent).filter(
              (s) => s.parentElement === parent
            );
            const idx = sibs.indexOf(el);
            if (idx > -1 && sibs.length > 1) {
              el.style.transitionDelay = `${Math.min(idx * 90, 450)}ms`;
            }
          }

          el.classList.add("is-in");
          io.unobserve(el);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach((n) => io.observe(n));
  }

  /* ==========================================================
     6. WORD-SPLIT HEADLINE
     ========================================================== */
  (function splitWords() {
    const els = $$("[data-split-words]");
    els.forEach((el) => {
      const text = el.textContent.trim().replace(/\s+/g, " ");
      el.textContent = "";
      text.split(" ").forEach((word, i) => {
        const wrap = document.createElement("span");
        wrap.className = "w";
        const inner = document.createElement("i");
        inner.textContent = word;
        inner.style.transitionDelay = `${Math.min(i * 34, 700)}ms`;
        wrap.appendChild(inner);
        el.appendChild(wrap);
        if (i < text.split(" ").length) el.appendChild(document.createTextNode(" "));
      });
    });
  })();

  /* ==========================================================
     7. PARALLAX
     ========================================================== */
  (function parallax() {
    if (prefersReduced) return;

    const nodes = $$("[data-parallax]");
    if (!nodes.length) return;

    let ticking = false;

    function update() {
      const vh = window.innerHeight;

      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;

        const speed = parseFloat(node.getAttribute("data-parallax")) || 0.2;
        // Centre-relative offset, so motion is symmetric around the middle.
        const offset = (rect.top + rect.height / 2 - vh / 2) * speed;

        const img = node.querySelector("img");
        const target = img || node;
        target.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      });

      ticking = false;
    }

    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
  })();

  /* ==========================================================
     8. ANIMATED COUNTERS
     ========================================================== */
  (function counters() {
    const els = $$(".count");
    if (!els.length) return;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function run(el) {
      const target   = parseFloat(el.getAttribute("data-count")) || 0;
      const decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
      const dur      = 1900;
      const start    = performance.now();

      function tick(now) {
        const t = clamp((now - start) / dur, 0, 1);
        const v = target * easeOutCubic(t);
        el.textContent = decimals > 0
          ? v.toFixed(decimals)
          : Math.round(v).toLocaleString("en-US");
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = decimals > 0
          ? target.toFixed(decimals)
          : target.toLocaleString("en-US");
      }
      requestAnimationFrame(tick);
    }

    if (prefersReduced) {
      els.forEach((el) => {
        const target = parseFloat(el.getAttribute("data-count")) || 0;
        const d = parseInt(el.getAttribute("data-decimals") || "0", 10);
        el.textContent = d > 0 ? target.toFixed(d) : target.toLocaleString("en-US");
      });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    els.forEach((el) => io.observe(el));
  })();

  /* ==========================================================
     9. NAV WORD-MARK MARQUEE (infinite, duplicated content)
     ========================================================== */
  (function marquee() {
    const track = $("#marqueeTrack");
    if (!track || prefersReduced) return;

    // Duplicate once so the loop is seamless.
    track.innerHTML += track.innerHTML;

    const base = track.scrollWidth / 2;
    let x = 0;
    let dir = 1;

    function tick() {
      x -= 0.55 * dir;
      if (Math.abs(x) >= base) x = 0;
      track.style.transform = `translate3d(${x}px, 0, 0)`;
      requestAnimationFrame(tick);
    }
    if (base > 0) requestAnimationFrame(tick);
  })();

  /* ==========================================================
     10. LISTING FILTERS
     ========================================================== */
  (function filter() {
    const buttons = $$(".filter");
    const cards   = $$("#listingGrid .card");
    if (!buttons.length || !cards.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-filter");

        buttons.forEach((b) => b.classList.toggle("is-active", b === btn));

        let delay = 0;
        cards.forEach((card) => {
          const match =
            key === "all" || card.getAttribute("data-cat") === key;

          card.classList.remove("is-showing");

          if (match) {
            card.classList.remove("is-filtered", "is-hiding");
            card.style.animationDelay = `${delay}ms`;
            // force reflow so the animation restarts
            void card.offsetWidth;
            card.classList.add("is-showing");
            delay += 70;
          } else {
            card.classList.remove("is-showing");
            card.classList.add("is-filtered");
          }
        });
      });
    });
  })();

  /* ==========================================================
     11. 3D TILT CARDS
     ========================================================== */
  (function tilt() {
    if (isTouch || prefersReduced) return;

    const nodes = $$("[data-tilt]");

    nodes.forEach((node) => {
      const inner = node.querySelector(".card__link, .person__media") || node;
      const MAX = 7; // degrees

      node.addEventListener("mousemove", (e) => {
        const r = node.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width  - 0.5;
        const py = (e.clientY - r.top)  / r.height - 0.5;

        const ry =  px * MAX * 2;
        const rx = -py * MAX * 2;

        node.style.transition = "transform 0.12s linear";
        node.style.transform =
          `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-6px)`;
      });

      node.addEventListener("mouseleave", () => {
        node.style.transition = "transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)";
        node.style.transform = "perspective(1000px) rotateX(0) rotateY(0) translateY(0)";
      });
    });
  })();

  /* ==========================================================
     12. MAGNETIC BUTTONS
     ========================================================== */
  (function magnetic() {
    if (isTouch || prefersReduced) return;

    $$("[data-magnetic]").forEach((el) => {
      el.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";

      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.24}px, ${y * 0.34}px)`;
      });

      el.addEventListener("mouseleave", () => {
        el.style.transform = "translate(0, 0)";
      });
    });
  })();

  /* ==========================================================
     13. SMOOTH ANCHOR SCROLL (offset for fixed nav)
     ========================================================== */
  (function anchors() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;

      const id = a.getAttribute("href");
      if (!id || id === "#") return;

      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();

      const navH = $("#nav") ? $("#nav").offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navH - 12;

      window.scrollTo({
        top: Math.max(top, 0),
        behavior: prefersReduced ? "auto" : "smooth",
      });

      if (history.replaceState) history.replaceState(null, "", id);
    });
  })();

  /* ==========================================================
     14. CONTACT FORM
     ========================================================== */
  (function form() {
    const el = $("#contactForm");
    if (!el) return;

    const success = $("#formSuccess");

    el.addEventListener("submit", (e) => {
      e.preventDefault();

      let ok = true;
      $$("input[required], textarea[required]", el).forEach((input) => {
        const field = input.closest(".field");
        const valid = input.type === "email"
          ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())
          : input.value.trim().length > 0;

        if (field) field.classList.toggle("has-error", !valid);
        if (!valid && ok) { input.focus(); ok = false; }
      });

      if (!ok) return;

      const btn = el.querySelector('button[type="submit"]');
      if (btn) {
        btn.style.pointerEvents = "none";
        btn.style.opacity = "0.65";
      }

      setTimeout(() => {
        if (success) {
          success.textContent = "Thank you — your enquiry is with our advisory desk. We reply within one business day.";
          success.classList.add("is-on");
        }
        el.reset();
        if (btn) { btn.style.pointerEvents = ""; btn.style.opacity = ""; }
        setTimeout(() => success && success.classList.remove("is-on"), 7000);
      }, 700);
    });

    // Clear error state as the user types
    el.addEventListener("input", (e) => {
      const field = e.target.closest(".field");
      if (field) field.classList.remove("has-error");
    });
  })();

  /* ==========================================================
     15. FOOTER YEAR
     ========================================================== */
  (function year() {
    const el = $("#year");
    if (el) el.textContent = new Date().getFullYear();
  })();

})();
