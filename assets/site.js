/* Scorpion Stoves v2 — shared behaviour. No libraries, no trackers. Nothing is
   uploaded or posted anywhere: forms hand off to Gareth's WhatsApp / text. */
(function () {
  "use strict";
  var B = window.SS_BIZ || {}, P = window.SS_PRICES || {};
  var FIRES = P.fires || [], JOBS = P.jobs || [];
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return "£" + Math.round(n).toLocaleString("en-GB"); };
  var fire = function (id) { for (var i = 0; i < FIRES.length; i++) if (FIRES[i].id === id) return FIRES[i]; return null; };
  var job = function (id) { for (var i = 0; i < JOBS.length; i++) if (JOBS[i].id === id) return JOBS[i]; return null; };
  var priceTxt = function (j) { return j.lo === j.hi ? money(j.lo) : money(j.lo) + "–" + money(j.hi); };
  var qs = (function () { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } })();

  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- menu ---------- */
  var mbtn = $(".menubtn"), menu = $("#menu");
  function setMenu(open) {
    if (!mbtn || !menu) return;
    menu.hidden = !open; mbtn.setAttribute("aria-expanded", open);
    $("span", mbtn).textContent = open ? "Close" : "Menu";
    document.body.classList.toggle("menu-open", open);
  }
  if (mbtn) mbtn.addEventListener("click", function () { setMenu(menu.hidden); });
  if (menu) $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menu && !menu.hidden) setMenu(false); });

  /* ---------- reveal on scroll ---------- */
  var revealEls = $$(".rv, .gar--in, .say-in");
  if (!("IntersectionObserver" in window) || reduce) revealEls.forEach(function (el) { el.classList.add("in"); });
  else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- shared: a muted, inline, controls-free video ---------- */
  function quietVideo(cls) {
    var v = document.createElement("video");
    v.className = cls;
    v.setAttribute("muted", ""); v.muted = true; v.defaultMuted = true;
    v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
    v.setAttribute("preload", "auto"); v.setAttribute("aria-hidden", "true");
    v.setAttribute("disablepictureinpicture", ""); v.setAttribute("disableremoteplayback", "");
    v.controls = false;
    return v;
  }
  function onScreen(el, cb, margin) {
    if (!("IntersectionObserver" in window)) return cb(true);
    new IntersectionObserver(function (es) { es.forEach(function (e) { cb(e.isIntersecting); }); },
      { rootMargin: margin || "0px", threshold: 0.15 }).observe(el);
  }

  /* ---------- Gareth's transparent wave ----------
     Safari/iOS get HEVC-with-alpha (.mov), everything else VP9-with-alpha (.webm):
     Safari plays WebM but drops the alpha, Chrome plays HEVC but drops the alpha.
     The clip is invisible until it is genuinely playing; if it can't play it is
     removed and the still (its own first frame) stays. Never a play button. */
  var ua = navigator.userAgent;
  var webkitOnly = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ||
    (/Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|Edg|OPR|Android/.test(ua));
  $$(".gar[data-webm]").forEach(function (fig) {
    if (reduce) return;
    var v = quietVideo("gar__clip");
    v.setAttribute("loop", "");
    // the live clips come from GitHub Pages (Base44 can't send a video type); it sends
    // Access-Control-Allow-Origin: *, so load them CORS-clean
    v.crossOrigin = "anonymous";
    v.src = webkitOnly ? fig.getAttribute("data-hevc") : fig.getAttribute("data-webm");
    var everPlayed = false, killed = false, inView = false, timer = 0;
    function kill() { if (everPlayed || killed) return; killed = true; v.pause(); v.remove(); fig.classList.remove("has-clip", "clip-on"); }
    v.addEventListener("playing", function () { everPlayed = true; v.classList.add("is-playing"); fig.classList.add("clip-on"); });
    v.addEventListener("error", kill);
    fig.classList.add("has-clip");
    fig.appendChild(v);
    function tryPlay() {
      if (killed || document.hidden || !inView) return;
      if (!timer) timer = setTimeout(function () { if (!everPlayed) kill(); }, 6000);
      var p = v.play(); if (p && p.catch) p.catch(function () { if (!document.hidden) kill(); });
    }
    onScreen(fig, function (vis) { inView = vis; if (killed) return; if (vis) tryPlay(); else if (everPlayed) v.pause(); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (!everPlayed) { clearTimeout(timer); timer = 0; } return; }
      tryPlay();
    });
  });

  /* ---------- a little hop when you tap Gareth ---------- */
  $$(".gar[data-hop]").forEach(function (fig) {
    fig.addEventListener("click", function () {
      if (reduce) return;
      fig.classList.remove("hop"); void fig.offsetWidth; fig.classList.add("hop");
    });
    fig.addEventListener("animationend", function () { fig.classList.remove("hop"); });
  });

  /* ---------- films (sweeping page): loop, crossfade back to the poster ---------- */
  $$(".film[data-film]").forEach(function (box) {
    if (reduce) return;
    var v = null, everPlayed = false, killed = false, inView = false, timer = 0;
    function kill() { if (everPlayed || killed) return; killed = true; if (v) { v.pause(); v.remove(); } }
    function make() {
      v = quietVideo("film__v"); v.setAttribute("loop", "");
      v.src = box.getAttribute("data-film");
      v.addEventListener("playing", function () { everPlayed = true; v.classList.add("is-playing"); });
      v.addEventListener("error", kill);
      v.addEventListener("timeupdate", function () {
        if (!v.duration) return;
        v.classList.toggle("is-fading", v.currentTime > v.duration - 0.6 || v.currentTime < 0.15);
      });
      box.appendChild(v);
    }
    function tryPlay() {
      if (killed || document.hidden || !inView) return;
      if (!v) make();
      if (!timer) timer = setTimeout(function () { if (!everPlayed) kill(); }, 8000);
      var p = v.play(); if (p && p.catch) p.catch(function () { if (!document.hidden) kill(); });
    }
    onScreen(box, function (vis) { inView = vis; if (killed) return; if (vis) tryPlay(); else if (v && everPlayed) v.pause(); }, "120px 0px");
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (!everPlayed) { clearTimeout(timer); timer = 0; } return; }
      tryPlay();
    });
  });

  /* ---------- the hero chain: bare wall -> Classic, Slate, Showpiece ----------
     Two stacked videos, double-buffered: one plays, the other is already loaded
     with the next cycle. Each is invisible until its own "playing" event; at the
     end the frame holds on the finished fireplace, then the next cycle (which
     opens on the same bare wall) fades in over it. If the first clip never plays,
     both videos are removed and the poster (the bare wall) stays. */
  $$(".chain[data-chain]").forEach(function (box) {
    if (reduce) return;
    var data; try { data = JSON.parse(box.getAttribute("data-chain")); } catch (e) { return; }
    var phone = matchMedia("(max-width: 820px)").matches;
    var list = phone ? data.mobile : data.desktop;
    if (!list || !list.length) return;
    var chip = $(".chain__chip", box), sound = $(".chain__sound", box);
    var vids = [quietVideo("chain__v"), quietVideo("chain__v")];
    var seen = [];
    var active = null, everPlayed = false, killed = false, inView = false, timer = 0, holdT = 0, wantSound = false;
    var HOLD = 1800;
    function setChip(i) {
      var it = list[i]; if (!chip || !it) return;
      chip.classList.add("is-off");
      setTimeout(function () { $("b", chip).textContent = it.name; $("span", chip).textContent = it.price; chip.classList.remove("is-off"); }, 250);
    }
    function load(v, i) { v._i = i; v.src = list[i].src; v.load(); }
    function kill() {
      if (everPlayed || killed) return; killed = true;
      vids.forEach(function (v) { v.pause(); v.remove(); });
      if (sound) sound.hidden = true;
    }
    function play(v) {
      v.muted = !wantSound;
      if (wantSound) v.removeAttribute("muted"); else v.setAttribute("muted", "");
      var p = v.play();
      if (p && p.catch) p.catch(function () {
        if (!v.muted) { wantSound = false; syncSound(); v.muted = true; v.setAttribute("muted", ""); return play(v); }
        if (!document.hidden && !everPlayed) kill();
      });
    }
    vids.forEach(function (v) {
      v.addEventListener("playing", function () {
        everPlayed = true;
        if (active === v) return;
        var old = active; active = v; seen.push(v._i);
        v.classList.add("is-on");
        setChip(v._i);
        if (sound) sound.hidden = false;
        if (old) setTimeout(function () { old.classList.remove("is-on"); old.pause(); load(old, (v._i + 1) % list.length); }, 500);
      });
      v.addEventListener("ended", function () {
        if (v !== active) return;
        clearTimeout(holdT);
        holdT = setTimeout(function () { next(); }, HOLD);
      });
      v.addEventListener("error", function () { if (!everPlayed) kill(); else if (v === active) next(); });
      box.insertBefore(v, chip);
    });
    function next() {
      if (killed || !inView || document.hidden) return;
      var other = vids[0] === active ? vids[1] : vids[0];
      if (list.length === 1) { active.currentTime = 0; return play(active); }
      try { other.currentTime = 0; } catch (e) {}
      play(other);
    }
    load(vids[0], 0); if (list.length > 1) load(vids[1], 1);
    function go() {
      if (killed || document.hidden || !inView) return;
      if (!everPlayed) {
        if (!timer) timer = setTimeout(function () { if (!everPlayed) kill(); }, 9000);
        play(vids[0]);
      } else if (active && active.paused && !active.ended) play(active);
      else if (active && active.ended && !holdT) next();
    }
    onScreen(box, function (vis) {
      inView = vis; if (killed) return;
      if (vis) go(); else { vids.forEach(function (v) { if (!v.paused) v.pause(); }); }
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (!everPlayed) { clearTimeout(timer); timer = 0; } return; }
      go();
    });
    function syncSound() {
      if (!sound) return;
      sound.setAttribute("aria-pressed", wantSound);
      sound.textContent = wantSound ? "Sound off" : "Sound on";
    }
    if (sound) sound.addEventListener("click", function () {
      wantSound = !wantSound; syncSound();
      vids.forEach(function (v) { v.muted = !wantSound; if (wantSound) v.removeAttribute("muted"); else v.setAttribute("muted", ""); });
      if (active && !active.paused) { var p = active.play(); if (p && p.catch) p.catch(function () { wantSound = false; syncSound(); active.muted = true; active.play(); }); }
    });
    window.SS_chain = { list: list, vids: vids, seen: seen, active: function () { return active; }, killed: function () { return killed; } };
  });

  /* ---------- count-up ---------- */
  function countTo(el, to) {
    var from = +(el.getAttribute("data-n") || 0); el.setAttribute("data-n", to);
    if (el._raf) { cancelAnimationFrame(el._raf); el._raf = 0; }
    if (reduce || from === to || !from) { el.textContent = money(to); return; }
    var dur = 420, start = performance.now();
    (function tick() {
      var k = Math.min(1, (performance.now() - start) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = money(from + (to - from) * e);
      if (k < 1) el._raf = requestAnimationFrame(tick); else el.textContent = money(to);
    })();
  }

  /* ---------- "which job is yours?" gate ----------
     Lee, 2 Oct 2026: they choose before they see a price. No £ figure shows on
     the menu or the order until a job card is picked. The pick is kept for the
     visit (sessionStorage) and travels between pages as ?job=. */
  var JOB_KEY = "ss.job";
  function savedJob() {
    var j = qs.get("job"); if (job(j)) return j;
    try { j = sessionStorage.getItem(JOB_KEY); } catch (e) { j = null; }
    return job(j) ? j : null;
  }
  function gateInit(g, onPick, first) {
    var opts = $$(".gate__opt", g);
    function set(id, user) {
      opts.forEach(function (o) { o.setAttribute("aria-checked", o.getAttribute("data-job") === id); });
      g.classList.add("is-picked");
      if (user) { try { sessionStorage.setItem(JOB_KEY, id); } catch (e) {} }
      onPick(id, user);
    }
    opts.forEach(function (o) { o.addEventListener("click", function () { set(o.getAttribute("data-job"), true); }); });
    g.addEventListener("keydown", function (e) {   // arrow keys move between the radio cards
      var i = opts.indexOf(document.activeElement); if (i < 0) return;
      var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!d) return; e.preventDefault(); opts[(i + d + opts.length) % opts.length].focus();
    });
    if (first) set(first, false);
  }

  /* ---------- the job menu (home) ---------- */
  var fm = $("#fm");
  if (fm) {
    function panel(j, user) {
      var img = $("[data-fp-img]", fm);
      if (img.getAttribute("src") !== j.img) {
        img.classList.add("is-swapping");
        var pre = new Image(); pre.onload = pre.onerror = function () { img.src = j.img; img.alt = j.alt; img.classList.remove("is-swapping"); }; pre.src = j.img;
      }
      $("[data-fp-name]", fm).textContent = j.name;
      $("[data-fp-fuel]", fm).textContent = P.stoveNote[j.stove] + (j.days ? " · " + j.days : "");
      $("[data-fp-price]", fm).textContent = priceTxt(j);
      $("[data-fp-mode]", fm).textContent = j.stove === "extra" ? "Gareth’s guide price, plus your stove" : "Gareth’s guide price";
      $("[data-fp-spec]", fm).innerHTML = j.inc.map(function (s) { return "<li>" + s + "</li>"; }).join("");
      $("[data-fp-stove]", fm).hidden = j.stove !== "extra";
      $("[data-fp-order]", fm).href = "order.html?job=" + j.id;
      fm.classList.remove("is-locked");
      if (user) {
        var fp = $(".fp", fm), top = fp.getBoundingClientRect().top;
        if (top > innerHeight * 0.7 || top < 0) fp.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: matchMedia("(max-width: 900px)").matches ? "start" : "center" });
      }
    }
    gateInit($("#fm-gate"), function (id, user) { panel(job(id), user); }, savedJob());
  }

  /* ---------- before / after ---------- */
  $$(".ba").forEach(function (ba) {
    var r = $("input", ba); if (!r) return;
    var set = function () { ba.style.setProperty("--cut", r.value + "%"); };
    r.addEventListener("input", set); set();
  });

  /* ---------- hand-off to Gareth's phone (nothing is stored or posted) ---------- */
  function sendToGareth(text, via) {
    var t = encodeURIComponent(text);
    location.href = via === "sms" ? "sms:" + B.TEL + "?&body=" + t : "https://wa.me/" + B.WA + "?text=" + t;
  }
  window.SS_send = function (t, via) { sendToGareth(t, via); };
  function phoneOk(s) { return s.replace(/\D/g, "").length >= 10; }
  function wireForm(form, build, need) {
    if (!form) return;
    var msg = $("[data-msg]", form);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var via = (e.submitter && e.submitter.getAttribute("data-via")) || "wa";
      for (var i = 0; i < need.length; i++) {
        var el = $(need[i][0], form), v = el.value.trim();
        if (!v || (need[i][2] && !need[i][2](v))) {
          msg.hidden = false; msg.className = "msg msg--err"; msg.textContent = need[i][1];
          if (el.type === "hidden") { var g = $("[data-gate]"); if (g) { g.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); g.classList.remove("is-nudge"); void g.offsetWidth; g.classList.add("is-nudge"); } }
          else el.focus();
          return;
        }
      }
      msg.hidden = false; msg.className = "msg msg--ok";
      msg.textContent = via === "sms" ? "Opening your messages with it all filled in. Just press send." : "Opening WhatsApp with it all filled in. Just press send.";
      window.SS_send(build(), via);
    });
  }
  var val = function (form, s) { var el = $(s, form); return el ? el.value.trim() : ""; };

  var survey = $("#survey-form");
  wireForm(survey, function () {
    var f = survey;
    return "Hi Gareth, I'd like a free survey please.\nName: " + val(f, "#sv-name") + "\nNumber: " + val(f, "#sv-phone") +
      "\nPostcode: " + val(f, "#sv-pc") + (val(f, "#sv-fire") ? "\nJob: " + val(f, "#sv-fire") : "") +
      (val(f, "#sv-msg") ? "\nNotes: " + val(f, "#sv-msg") : "") + "\n(sent from the Scorpion Stoves website)";
  }, [["#sv-name", "Just need your name so Gareth knows who he's ringing."], ["#sv-phone", "And a phone number Gareth can ring you back on.", phoneOk], ["#sv-pc", "Your postcode tells Gareth how far he's travelling."]]);

  var sweepForm = $("#sweep-form");
  wireForm(sweepForm, function () {
    var f = sweepForm;
    return "Hi Gareth, I'd like to book a chimney job.\nName: " + val(f, "#sw-name") + "\nNumber: " + val(f, "#sw-phone") +
      "\nTown: " + val(f, "#sw-town") + "\nWhat: " + val(f, "#sw-job") + "\nFire: " + val(f, "#sw-fire") +
      (val(f, "#sw-msg") ? "\nNotes: " + val(f, "#sw-msg") : "") + "\n(sent from the Scorpion Stoves website)";
  }, [["#sw-name", "Just need your name so Gareth knows who he's ringing."], ["#sw-phone", "And a phone number for Gareth to ring.", phoneOk], ["#sw-town", "Which town is the chimney in?"]]);

  /* ---------- order builder ----------
     Step 1 the job (gated), step 2 the stove (included, or an extra Gareth
     prices on the survey), step 3 where and when. Hands off to WhatsApp/text. */
  var ob = $("#ob");
  if (ob) {
    var state = { job: null, stove: "help" };
    function calc(s) {
      s = s || state; var j = job(s.job);
      if (!j) return { lines: [], price: "", plus: "" };
      var lines = [[j.name, priceTxt(j)]];
      if (j.stove === "included") lines.push(["Stove", "Included"]);
      else lines.push(["Stove", s.stove === "own" ? "Using my own" : "Priced on the survey"]);
      return { lines: lines, price: priceTxt(j), plus: j.stove === "extra" && s.stove !== "own" ? "Plus your stove, which Gareth prices with you on the survey." : "" };
    }
    window.SS_order = { calc: calc, state: state };
    function renderStove() {
      var j = job(state.job), box = $("#o-stove");
      if (!j) { box.innerHTML = ""; return; }
      if (j.stove === "included") { box.innerHTML = '<p class="ostove ostove--in"><b>Stove included.</b> ' + (j.id === "knockout" ? "Supplied and installed as part of the knockout." : "A cylinder stove comes with this job.") + "</p>"; return; }
      box.innerHTML = '<p class="muted small" style="margin:0 0 10px">The stove is an extra cost on this job.</p><div class="ostoves" role="radiogroup" aria-label="Your stove">' +
        [["help", "Help me choose a stove", P.stoveHelp], ["own", "I’ve already got a stove", "Gareth fits the one you’ve bought."]].map(function (o) {
          var on = state.stove === o[0];
          return '<label class="ostove' + (on ? " is-on" : "") + '"><input type="radio" name="ostove" value="' + o[0] + '"' + (on ? " checked" : "") + '><span><b>' + o[1] + '</b><small>' + o[2] + '</small></span></label>';
        }).join("") + "</div>";
    }
    function renderSum() {
      var r = calc(), plus = $("#o-plus");
      if (!state.job) { $("#o-lines").innerHTML = '<li class="est__wait">Pick your job in step 1 to start.</li>'; $("#o-total").textContent = "–"; plus.hidden = true; return; }
      $("#o-lines").innerHTML = r.lines.map(function (l) { return "<li><span>" + l[0] + "</span><b>" + l[1] + "</b></li>"; }).join("");
      $("#o-total").textContent = r.price; plus.hidden = !r.plus; plus.textContent = r.plus;
    }
    function all() { renderStove(); renderSum(); }
    $("#o-stove").addEventListener("change", function (e) { if (e.target.name === "ostove") { state.stove = e.target.value; all(); } });
    gateInit($("#o-gate"), function (id, user) {
      state.job = id; $("#o-modeval").value = id; ob.classList.remove("is-locked"); all();
      if (user && matchMedia("(max-width: 1000px)").matches) {
        var nx = $("[data-needs-mode]", ob), top = nx.getBoundingClientRect().top;
        if (top > innerHeight * 0.7) nx.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    }, savedJob());
    all();

    var oform = $("#o-form");
    wireForm(oform, function () {
      var r = calc(), f = oform;
      return "Hi Gareth, I'd like to book this job, please.\n" +
        r.lines.map(function (l) { return "• " + l[0] + " — " + l[1]; }).join("\n") +
        "\nGuide price: " + r.price + (r.plus ? " (plus the stove)" : "") +
        "\n\nName: " + val(f, "#o-name") + "\nNumber: " + val(f, "#o-phone") + "\nPostcode: " + val(f, "#o-pc") +
        (val(f, "#o-addr") ? "\nAddress: " + val(f, "#o-addr") : "") +
        (val(f, "#o-when") ? "\nWhen: " + val(f, "#o-when") : "") + (val(f, "#o-chim") ? "\nChimney: " + val(f, "#o-chim") : "") +
        (val(f, "#o-notes") ? "\nNotes: " + val(f, "#o-notes") : "") +
        "\n(sent from the Scorpion Stoves website, nothing paid yet)";
    }, [["#o-modeval", "First pick your job, up at step 1."], ["#o-name", "Just need your name to send it."], ["#o-phone", "And a phone number so Gareth can ring to book the survey.", phoneOk], ["#o-pc", "Your postcode, so Gareth knows where the job is."]]);
  }

  /* ---------- try it on your wall (room tool) ----------
     Everything happens on a <canvas> in the browser. The photo is read with
     FileReader and never leaves the device: no fetch, no post. "Use our sample
     room" loads the bare chimney breast from the hero, so the tool works without
     a photo. Only the full-fireplace cut-outs exist, so that's all it offers. */
  var tryEl = $("#tryit-tool");
  if (tryEl) (function () {
    var stage = $(".try__stage", tryEl), cv = $("canvas", tryEl), ctx = cv.getContext("2d");
    var photo = null, over = null, oi = 0, pos = { x: 0.5, y: 0.66 }, scale = 0.42, flip = false, fade = 1;
    var picks = $("#try-picks"), name = $("#try-name"), price = $("#try-price"), send = $("#try-send");
    var start = qs.get("tier");
    FIRES.forEach(function (f, i) { if (f.id === start) oi = i; });
    picks.innerHTML = FIRES.map(function (f, i) {
      return '<button class="pick" type="button" data-i="' + i + '" aria-pressed="' + (i === oi) + '"><img src="' + f.cut.replace("cutout/", "cutout/thumb/") + '.webp" alt="" width="80" height="56" loading="lazy"><span>' + f.name.replace("The ", "") + '</span></button>';
    }).join("");
    function sizeCanvas() {
      var b = stage.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(2, Math.round(b.width * d)); cv.height = Math.max(2, Math.round(b.height * d));
    }
    function draw() {
      if (!photo) return;
      var w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      var s = Math.max(w / photo.width, h / photo.height), pw = photo.width * s, ph = photo.height * s;
      ctx.drawImage(photo, (w - pw) / 2, (h - ph) / 2, pw, ph);
      if (over && over.complete && over.naturalWidth) {
        var ow = w * scale, oh = ow * (over.naturalHeight / over.naturalWidth), x = pos.x * w - ow / 2, y = pos.y * h - oh;
        ctx.save(); ctx.globalAlpha = fade;
        if (flip) { ctx.translate(x + ow, y); ctx.scale(-1, 1); ctx.drawImage(over, 0, 0, ow, oh); }
        else ctx.drawImage(over, x, y, ow, oh);
        ctx.restore();
      }
    }
    function label() {
      var f = FIRES[oi];
      name.textContent = f.name; price.textContent = f.tag;
      send.href = "https://wa.me/" + B.WA + "?text=" + encodeURIComponent("Hi Gareth, I tried " + f.name + " on my own wall with your room tool. Can you price it for me? I'll attach my mock-up.");
    }
    function setOver(i) {
      oi = i;
      $$(".pick", picks).forEach(function (b, bi) { b.setAttribute("aria-pressed", bi === i); });
      var img = new Image(); img.onload = draw; img.src = FIRES[i].cut + ".webp"; over = img; label();
    }
    picks.addEventListener("click", function (e) { var b = e.target.closest(".pick"); if (b) setOver(+b.getAttribute("data-i")); });
    function usePhoto(img) { photo = img; stage.classList.add("has-photo"); sizeCanvas(); setOver(oi); draw(); $("#try-save").disabled = false; }
    function loadFile(f) {
      if (!f || !/^image\//.test(f.type)) return;
      var r = new FileReader();
      r.onload = function (ev) { var img = new Image(); img.onload = function () { usePhoto(img); }; img.src = ev.target.result; };
      r.readAsDataURL(f);               // stays on the device
    }
    $("#try-file").addEventListener("change", function (e) { loadFile(e.target.files[0]); });
    $("#try-sample").addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      var img = new Image(); img.onload = function () { pos = { x: 0.5, y: 0.66 }; usePhoto(img); }; img.src = "media/poster.jpg";
    });
    var drop = $(".try__drop", tryEl);
    ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { loadFile(e.dataTransfer.files[0]); });
    var dragging = false, off = { x: 0, y: 0 };
    function at(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
    cv.addEventListener("pointerdown", function (e) { dragging = true; try { cv.setPointerCapture(e.pointerId); } catch (er) {} var p = at(e); off = { x: pos.x - p.x, y: pos.y - p.y }; });
    cv.addEventListener("pointermove", function (e) { if (!dragging) return; var p = at(e); pos = { x: p.x + off.x, y: p.y + off.y }; draw(); });
    cv.addEventListener("pointerup", function () { dragging = false; });
    cv.addEventListener("pointercancel", function () { dragging = false; });
    $("#try-size").addEventListener("input", function (e) { scale = +e.target.value / 100; draw(); });
    $("#try-fade").addEventListener("input", function (e) { fade = +e.target.value / 100; draw(); });
    $("#try-flip").addEventListener("click", function () { flip = !flip; draw(); });
    $("#try-reset").addEventListener("click", function () { pos = { x: 0.5, y: 0.66 }; scale = 0.42; flip = false; fade = 1; $("#try-size").value = 42; $("#try-fade").value = 100; draw(); });
    $("#try-new").addEventListener("click", function () { photo = null; stage.classList.remove("has-photo"); $("#try-file").value = ""; $("#try-save").disabled = true; });
    $("#try-save").addEventListener("click", function () {
      if (!photo) return;
      var a = document.createElement("a");
      a.download = "scorpion-stoves-" + FIRES[oi].id + ".png"; a.href = cv.toDataURL("image/png");
      document.body.appendChild(a); a.click(); a.remove();
    });
    addEventListener("resize", function () { if (photo) { sizeCanvas(); draw(); } });
    label();
    window.SS_try = { state: function () { return { photo: !!photo, over: over && over.naturalWidth, oi: oi }; }, canvas: cv };
  })();

  /* ---------- compare all six in the same room ---------- */
  var cmp = $("#cmp");
  if (cmp) (function () {
    var frame = $(".cmp__frame", cmp), layers = $$(".cmp__frame img", cmp), thumbs = $(".thumbs", cmp);
    var cName = $("#cmp-name"), cPrice = $("#cmp-price"), cTag = $("#cmp-tag"), cSpec = $("#cmp-spec"), cTry = $("#cmp-try");
    var idx = 0, seq = 0;
    FIRES.forEach(function (f) { var p = new Image(); p.src = f.room; });
    thumbs.innerHTML = FIRES.map(function (f, i) {
      return '<button type="button" role="tab" aria-selected="' + (i === 0) + '" data-i="' + i + '" aria-label="' + f.name + '"><img src="' + f.thumb + '" alt="" width="160" height="90" loading="lazy"></button>';
    }).join("");
    function front() { return layers[0].classList.contains("is-shown") ? 0 : 1; }
    function show(src) {
      var mine = ++seq, back = layers[1 - front()], fired = false;
      var swap = function () { if (fired || mine !== seq) return; fired = true; var f = front(); layers[1 - f].classList.add("is-shown"); layers[f].classList.remove("is-shown"); };
      if (back.getAttribute("src") === src) return swap();
      back.onload = swap; back.onerror = swap; back.src = src;
      if (back.decode) back.decode().then(swap).catch(swap);
      setTimeout(swap, 350);
    }
    function render(i) {
      var f = FIRES[i]; idx = i; show(f.room);
      cName.textContent = f.name; cPrice.textContent = ""; cTag.textContent = f.tag;
      cSpec.innerHTML = f.spec.map(function (s) { return "<li>" + s + "</li>"; }).join("");
      $$("button", thumbs).forEach(function (b, bi) { b.setAttribute("aria-selected", bi === i); });
    }
    thumbs.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) render(+b.getAttribute("data-i")); });
    $(".cmp__prev", cmp).addEventListener("click", function () { render((idx + FIRES.length - 1) % FIRES.length); });
    $(".cmp__next", cmp).addEventListener("click", function () { render((idx + 1) % FIRES.length); });
    var fly = $("#cmp-fly"), flying = false;
    fly.addEventListener("click", function () {
      if (flying) return; flying = true; fly.disabled = true; frame.classList.add("flying");
      var n = 0, s = idx;
      (function step() {
        if (n >= FIRES.length) { flying = false; fly.disabled = false; frame.classList.remove("flying"); return; }
        n++; render((s + n) % FIRES.length);
        setTimeout(step, n === FIRES.length ? 900 : reduce ? 1200 : 620);
      })();
    });
    render(0);
  })();
})();
