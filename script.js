/* WISE Scales theme script.
   Each feature finds its own elements and does nothing if they aren't on the page.
   Content (phrases, numbers, logos) always comes from the HTML; this file only animates it.
   Everything here is optional: with JS off, the page still reads correctly. */
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasObserver = "IntersectionObserver" in window;

  /* ---- Mobile menu (mirrors the Navigation block's overlay) ---- */
  function initMenu() {
    var nav = document.querySelector(".site-header .site-nav");
    if (!nav) return;
    var open = nav.querySelector(".site-nav__toggle");
    var close = nav.querySelector(".site-nav__close");
    if (!open || !close) return;
    function setOpen(isOpen) {
      nav.classList.toggle("is-open", isOpen);
      open.setAttribute("aria-expanded", String(isOpen));
      document.body.style.overflow = isOpen ? "hidden" : "";
      (isOpen ? close : open).focus();
    }
    open.addEventListener("click", function () { setOpen(true); });
    close.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) setOpen(false);
    });
  }

  /* ---- Counters: count up to the number written in the page ("100+", "25,000+") ---- */
  function initCounters() {
    var els = document.querySelectorAll(".stat__num.is-counter");
    if (!els.length || reduceMotion || !hasObserver) return;
    els.forEach(function (el) {
      var text = el.textContent.trim();
      var match = text.match(/^([^\d]*)([\d,]+)(.*)$/);
      if (!match) return;
      el._final = text;
      el._prefix = match[1];
      el._target = parseInt(match[2].replace(/,/g, ""), 10);
      el._suffix = match[3];
      el.setAttribute("aria-label", text);
    });
    function run(el) {
      var start = null;
      cancelAnimationFrame(el._raf);
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1400, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = el._prefix + Math.round(el._target * eased).toLocaleString("en-US") + el._suffix;
        if (p < 1) el._raf = requestAnimationFrame(step);
        else el.textContent = el._final;
      }
      el._raf = requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (el._target === undefined) return;
        if (entry.isIntersecting) run(el);
        else { cancelAnimationFrame(el._raf); el.textContent = el._prefix + "0" + el._suffix; }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---- Hero: rotating phrase, read from the hidden list in the page ---- */
  var rotator = { timer: null, paused: false };
  function initRotator() {
    var el = document.querySelector(".rotator");
    var list = document.querySelector(".rotator-phrases");
    if (!el || !list) return;
    var phrases = Array.prototype.map.call(list.querySelectorAll("li"), function (li) { return li.textContent.trim(); });
    if (phrases.length < 2 || reduceMotion) return;
    var i = 0;
    rotator.tick = function () {
      el.classList.add("is-leaving");
      setTimeout(function () {
        i = (i + 1) % phrases.length;
        el.textContent = phrases[i];
        el.classList.remove("is-leaving");
        el.classList.add("is-entering");
        requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove("is-entering"); }); });
      }, 380);
    };
    rotator.start = function () { if (!rotator.timer) rotator.timer = setInterval(rotator.tick, 3800); };
    rotator.stop = function () { clearInterval(rotator.timer); rotator.timer = null; };
    rotator.start();
  }

  /* ---- Hero: one pause button for the video and the rotating phrase (WCAG 2.2.2) ---- */
  function initMotionToggle() {
    var hero = document.querySelector(".wise-hero");
    if (!hero) return;
    var video = hero.querySelector("video");
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var slow = !!(conn && (conn.saveData || /2g/.test(conn.effectiveType || "")));
    if (video && slow) { video.remove(); video = null; }
    if (video && reduceMotion) { video.removeAttribute("autoplay"); video.pause(); }
    function playVideo() {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});   /* autoplay blocked: the poster stays */
    }
    if (!video && !rotator.start) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "motion-toggle";
    btn.setAttribute("aria-label", "Pause motion");
    btn.innerHTML =
      '<svg class="icon-pause" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14"></rect><rect x="14" y="5" width="4" height="14"></rect></svg>' +
      '<svg class="icon-play" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" hidden><path d="M8 5v14l11-7z"></path></svg>';
    hero.appendChild(btn);

    var paused = reduceMotion;
    function render() {
      btn.setAttribute("aria-pressed", String(paused));
      btn.querySelector(".icon-pause").toggleAttribute("hidden", paused);
      btn.querySelector(".icon-play").toggleAttribute("hidden", !paused);
    }
    btn.addEventListener("click", function () {
      paused = !paused;
      if (video) { if (paused) video.pause(); else playVideo(); }
      if (rotator.start) { if (paused) rotator.stop(); else rotator.start(); }
      render();
    });
    render();
    if (video && !paused) playVideo();
  }

  /* ---- Flip cards: build the 3D wrapper, add keyboard and screen reader support ---- */
  function initFlipCards() {
    document.querySelectorAll(".flip-card").forEach(function (card) {
      var front = card.querySelector(".flip-card__front");
      var back = card.querySelector(".flip-card__back");
      if (!front || !back) return;
      var inner = document.createElement("div");
      inner.className = "flip-card__inner";
      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-pressed", "false");
      function toggle() {
        var flipped = card.classList.toggle("is-flipped");
        card.setAttribute("aria-pressed", String(flipped));
      }
      card.addEventListener("click", toggle);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    });
  }

  /* ---- Find Your Scale selector ----
     Steps, tiles and results are ordinary blocks in the page. A tile's answer is its
     "choice--{value}" class; a result's answers are in its "result--{where}-{who}-{length}" class. */
  function initSelector() {
    var root = document.querySelector(".selector");
    if (!root) return;
    var steps = {
      where: root.querySelector(".selector__step--where"),
      who: root.querySelector(".selector__step--who"),
      length: root.querySelector(".selector__step--length")
    };
    if (!steps.where || !steps.who || !steps.length) return;
    var stepList = root.querySelector(".selector__steps");
    var summary = root.querySelector(".selector__summary");
    var results = root.querySelectorAll(".result");
    var state = {};

    function valueOf(choice) {
      var m = choice.className.match(/choice--([\w-]+)/);
      return m ? m[1] : null;
    }
    function titleOf(choice) {
      var t = choice.querySelector(".choice__title");
      return t ? t.textContent.trim() : "";
    }
    function render() {
      var outside = state.where === "schools" || state.where === "hcf";
      steps.who.classList.toggle("is-hidden", outside);
      steps.length.classList.toggle("is-hidden", outside);
      steps.who.classList.toggle("is-waiting", !state.where);
      steps.length.classList.toggle("is-waiting", !state.who);
      ["where", "who", "length"].forEach(function (k) { steps[k].classList.toggle("is-answered", !!state[k]); });
      root.classList.toggle("is-short", state.length === "short");
      root.classList.toggle("is-full", state.length === "full");

      var key = outside ? state.where : (state.where && state.who && state.length ? [state.where, state.who, state.length].join("-") : null);
      var shown = null;
      results.forEach(function (r) {
        var on = !!key && r.classList.contains("result--" + key);
        r.classList.toggle("is-active", on);
        if (on) shown = r;
      });
      root.classList.toggle("is-done", !!shown);

      var answered = ["where", "who", "length"].filter(function (k) { return state[k]; }).length;
      stepList.style.setProperty("--progress", outside ? 1 : answered / 3);

      var parts = [];
      root.querySelectorAll(".choice.is-selected").forEach(function (c) {
        if (!(outside && !c.closest(".selector__step--where"))) parts.push(titleOf(c));
      });
      if (summary) summary.textContent = parts.join("  \u00b7  ");
      return shown;
    }
    function ripple(choice, e) {
      if (reduceMotion) return;
      var rect = choice.getBoundingClientRect();
      var dot = document.createElement("span");
      dot.className = "ripple";
      dot.style.left = ((e && e.clientX ? e.clientX - rect.left : rect.width / 2)) + "px";
      dot.style.top = ((e && e.clientY ? e.clientY - rect.top : rect.height / 2)) + "px";
      choice.appendChild(dot);
      setTimeout(function () { dot.remove(); }, 900);
    }
    function choose(choice, e) {
      var step = choice.closest(".selector__step");
      var k = step === steps.where ? "where" : step === steps.who ? "who" : "length";
      state[k] = valueOf(choice);
      if (k === "where") { delete state.who; delete state.length; clearStep(steps.who); clearStep(steps.length); }
      if (k === "who") { delete state.length; clearStep(steps.length); }
      step.querySelectorAll(".choice").forEach(function (c) {
        var on = c === choice;
        c.classList.toggle("is-selected", on);
        c.classList.toggle("is-dimmed", !on);
        c.setAttribute("aria-pressed", String(on));
      });
      ripple(choice, e);
      var shown = render();
      var next = shown || (k === "where" ? steps.who : k === "who" ? steps.length : null);
      if (next && !reduceMotion && next.scrollIntoView) {
        setTimeout(function () { next.scrollIntoView({ behavior: "smooth", block: shown ? "center" : "nearest" }); }, 250);
      }
    }
    function clearStep(step) {
      step.querySelectorAll(".choice").forEach(function (c) {
        c.classList.remove("is-selected", "is-dimmed");
        c.setAttribute("aria-pressed", "false");
      });
    }

    root.querySelectorAll(".choice").forEach(function (choice) {
      choice.setAttribute("role", "button");
      choice.setAttribute("tabindex", "0");
      choice.setAttribute("aria-pressed", "false");
      choice.addEventListener("click", function (e) { choose(choice, e); });
      choice.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(choice); }
      });
    });
    /* Preview the 12-vs-4 icons while hovering step 3 */
    ["full", "short"].forEach(function (v) {
      var c = steps.length.querySelector(".choice--" + v);
      if (!c) return;
      c.addEventListener("mouseenter", function () { if (!state.length) { root.classList.add("is-" + v); } });
      c.addEventListener("mouseleave", function () { if (!state.length) { root.classList.remove("is-" + v); } });
    });
    var reset = root.querySelector(".selector__reset");
    if (reset) reset.addEventListener("click", function () {
      state = {};
      [steps.where, steps.who, steps.length].forEach(clearStep);
      render();
      if (root.scrollIntoView) root.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      var first = steps.where.querySelector(".choice");
      if (first) first.focus({ preventScroll: true });
    });
    render();
  }


  [initMenu, initCounters, initRotator, initMotionToggle, initFlipCards, initSelector]
    .forEach(function (init) {
      try { init(); } catch (err) { if (window.console) console.error(err); }
    });
})();
