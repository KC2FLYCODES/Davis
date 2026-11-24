/* Vendetta Mobile Detailing — site script */
(function () {
  'use strict';

  var CONFIG = {
    phone: '(919) 671-0837',
    email: 'vendettadetailing.contact@gmail.com',
    formEndpoint: 'https://formspree.io/f/xojpyvol',
    dbPath: 'vendetta/gallery',
    adminPin: '2025',                // NOTE: client-side PIN is visible in source. Real lock = RTDB rules + Firebase Auth.
    // Starting prices per package. Leave null to hide prices. Fill only with numbers Davis confirms, e.g. { exterior: 120 }.
    prices: null,
    firebase: {
      apiKey: 'AIzaSyDrH2MXHrVdEKeIcDf6ebjkAboWQ3SAGmA',
      authDomain: 'davis-b07d9.firebaseapp.com',
      databaseURL: 'https://davis-b07d9-default-rtdb.firebaseio.com',
      projectId: 'davis-b07d9',
      storageBucket: 'davis-b07d9.firebasestorage.app',
      messagingSenderId: '968352935744',
      appId: '1:968352935744:web:a701d6177d85596e7214a5'
    }
  };

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* phone + email wiring */
  var digits = CONFIG.phone.replace(/\D/g, '');
  $$('[data-phone]').forEach(function (el) {
    if (!digits) { el.hidden = true; return; }
    if (el.tagName === 'A') el.href = (el.getAttribute('data-phone') === 'sms' ? 'sms:+1' : 'tel:+1') + digits;
    var t = el.querySelector('[data-phone-text]'); if (t) t.textContent = CONFIG.phone;
  });

  /* optional prices */
  if (CONFIG.prices) {
    $$('[data-pkg]').forEach(function (el) {
      var p = CONFIG.prices[el.getAttribute('data-pkg')];
      if (p) { var s = document.createElement('span'); s.className = 'price'; s.textContent = 'From $' + p; el.appendChild(s); }
    });
  }

  /* reveal */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }

  /* package preselect */
  $$('[data-book]').forEach(function (b) {
    b.addEventListener('click', function () {
      var r = $('input[name="Package"][value="' + b.getAttribute('data-book') + '"]');
      if (r) { r.checked = true; var g = r.closest('.chips'); if (g) g.classList.remove('bad'); }
    });
  });

  /* date floor = tomorrow, in the visitor's local calendar (toISOString is UTC and skipped a day in the evening) */
  var d = $('#f-date');
  if (d) {
    var t = new Date(); t.setDate(t.getDate() + 1);
    d.min = t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
  }

  /* booking form */
  var form = $('#bookForm');
  if (form) {
    var steps = $$('.step', form), bars = $$('.steps i', form), err = $('.form-err', form), cur = 0;
    var show = function (i) {
      cur = i;
      steps.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      bars.forEach(function (b, k) { b.classList.toggle('on', k <= i); });
      err.textContent = '';
      if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      var first = steps[i].querySelector('input,select,textarea'); if (first && window.innerWidth > 760) first.focus({ preventScroll: true });
    };
    var valid = function (i) {
      var s = steps[i], ok = true, first = null;
      $$('input[required],select[required],textarea[required]', s).forEach(function (f) {
        var bad;
        if (f.type === 'radio') {
          bad = !$('input[name="' + f.name + '"]:checked', s);
          var g = f.closest('.chips'); if (g) g.classList.toggle('bad', bad);
        } else {
          bad = !f.checkValidity();
          f.classList.toggle('bad', bad);
          f.setAttribute('aria-invalid', bad ? 'true' : 'false');
        }
        if (bad) { ok = false; if (!first) first = f; }
      });
      if (!ok) { err.textContent = 'Fill in the highlighted fields to continue.'; first.focus(); }
      return ok;
    };
    var clearBad = function (e) {
      var f = e.target;
      if (f.type === 'radio' || f.type === 'checkbox') { var g = f.closest('.chips'); if (g) g.classList.remove('bad'); }
      else if (f.classList.contains('bad') && f.checkValidity()) { f.classList.remove('bad'); f.setAttribute('aria-invalid', 'false'); }
    };
    form.addEventListener('change', clearBad);
    form.addEventListener('input', clearBad);
    $$('[data-next]', form).forEach(function (b) { b.addEventListener('click', function () { if (valid(cur)) show(cur + 1); }); });
    $$('[data-back]', form).forEach(function (b) { b.addEventListener('click', function () { show(cur - 1); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!valid(cur)) return;
      var btn = $('[type=submit]', form);
      btn.disabled = true; btn.textContent = 'Sending…';
      var fd = new FormData(form);
      fd.append('_subject', '[Vendetta] Booking request — ' + (fd.get('Package') || '') + ' — ' + (fd.get('Preferred Date') || ''));
      fetch(CONFIG.formEndpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('bad'); })
        .then(function () {
          form.reset();
          steps.forEach(function (s) { s.classList.remove('on'); });
          $('.steps', form).hidden = true;
          err.textContent = '';
          var done = $('.form-done', form);
          done.classList.add('on');
          done.setAttribute('tabindex', '-1'); done.focus({ preventScroll: true });
          form.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
          if (window.gtag) window.gtag('event', 'generate_lead', { form: 'booking' });
        })
        .catch(function () {
          err.innerHTML = 'That didn’t go through. Call or text <a href="tel:+1' + digits + '">' + CONFIG.phone + '</a>.';
          btn.disabled = false; btn.textContent = 'Request booking';
        });
    });
  }

  /* firebase gallery — photos are stored inline in RTDB, so load after first paint, never on the critical path */
  var db = null;
  try { if (window.firebase) { firebase.initializeApp(CONFIG.firebase); db = firebase.database(); } }
  catch (e) { console.warn('Firebase init failed', e); }

  var photos = [], admOpen = false, galStarted = false;
  var order = function (p) { return p.order !== undefined ? p.order : -p.ts; };
  var gal = $('#gallery-grid'), heroBg = $('.hero-bg');
  var lb = $('#lb'), lbImg = lb ? $('img', lb) : null, lbIdx = 0, lbLast = null;

  function renderGallery() {
    if (!gal) return;
    if (!photos.length) { gal.className = 'gal-empty'; gal.textContent = 'Recent work is posted here after each detail.'; return; }
    gal.className = 'gal'; gal.innerHTML = '';
    photos.forEach(function (p, i) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Open photo ' + (i + 1));
      var img = document.createElement('img'); img.src = p.url; img.alt = 'Vehicle detailed by Vendetta Mobile Detailing'; img.loading = 'lazy'; img.decoding = 'async';
      b.appendChild(img); b.addEventListener('click', function () { openLb(i); }); gal.appendChild(b);
    });
    if (heroBg && !heroBg.classList.contains('on')) {
      var pre = new Image();
      pre.onload = function () { heroBg.style.backgroundImage = 'url("' + photos[0].url + '")'; heroBg.classList.add('on'); sweepOnce(); };
      pre.src = photos[0].url;
    }
    if (window.ScrollTrigger) requestAnimationFrame(function () { window.ScrollTrigger.refresh(); });
  }
  function startGallery() {
    if (galStarted) return; galStarted = true;
    if (!db) { renderGallery(); return; }
    db.ref(CONFIG.dbPath).on('value', function (snap) {
      var v = snap.val() || {};
      photos = Object.keys(v).map(function (k) { var p = v[k]; p.key = k; return p; })
        .filter(function (p) { return p && p.url; })
        .sort(function (a, b) { return order(a) - order(b); });
      renderGallery();
      if (admOpen) renderAdmin();
    }, function (e) { console.warn('Gallery read failed', e); renderGallery(); });
  }
  // hero photo comes from the gallery, so start soon after load (idle), or immediately if the visitor scrolls toward the work
  if (document.readyState === 'complete') setTimeout(startGallery, 600);
  else window.addEventListener('load', function () { setTimeout(startGallery, 600); });
  if (gal && 'IntersectionObserver' in window) {
    var gio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { gio.disconnect(); startGallery(); } }, { rootMargin: '900px 0px' });
    gio.observe(gal);
  }

  function closeLb() { lb.classList.remove('open'); document.body.classList.remove('lock'); if (lbLast) lbLast.focus(); }
  function openLb(i) { lbLast = document.activeElement; lbIdx = i; lbImg.src = photos[i].url; lb.classList.add('open'); document.body.classList.add('lock'); $('.lb-x', lb).focus(); }
  function stepLb(n) { if (!photos.length) return; lbIdx = (lbIdx + n + photos.length) % photos.length; lbImg.src = photos[lbIdx].url; }
  if (lb) {
    $('.lb-x', lb).addEventListener('click', closeLb);
    $('.lb-prev', lb).addEventListener('click', function () { stepLb(-1); });
    $('.lb-next', lb).addEventListener('click', function () { stepLb(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    var sx = null;
    lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) stepLb(dx < 0 ? 1 : -1); sx = null; });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') stepLb(-1);
      if (e.key === 'ArrowRight') stepLb(1);
      if (e.key === 'Tab') { var f = $$('button', lb), a = f.indexOf(document.activeElement); e.preventDefault(); f[(a + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus(); }
    });
  }

  /* admin: triple-tap "Site by" in the footer → PIN */
  var adm = $('#adm'), pinVal = '', taps = 0, tapT = null, trig = $('#admTrigger');
  function tap(e) { e.preventDefault(); taps++; clearTimeout(tapT); tapT = setTimeout(function () { taps = 0; }, 800); if (taps >= 3) { taps = 0; openAdm(); } }
  if (trig) {
    trig.addEventListener('touchstart', tap, { passive: false });
    trig.addEventListener('click', function (e) { if (!('ontouchstart' in window)) tap(e); });
  }
  function dots() { $$('.pin-dots i', adm).forEach(function (x, i) { x.classList.toggle('on', i < pinVal.length); }); }
  function openAdm() { startGallery(); pinVal = ''; dots(); $('.pin', adm).hidden = false; $('.adm-panel', adm).classList.remove('on'); admOpen = false; adm.classList.add('open'); document.body.classList.add('lock'); }
  function closeAdm() { adm.classList.remove('open'); admOpen = false; document.body.classList.remove('lock'); }
  if (adm) {
    $('.adm-hd button', adm).addEventListener('click', closeAdm);
    adm.addEventListener('click', function (e) { if (e.target === adm) closeAdm(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && adm.classList.contains('open')) closeAdm(); });
    $$('.pad button', adm).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-k');
        if (k === 'c') pinVal = ''; else if (k === 'b') pinVal = pinVal.slice(0, -1); else if (pinVal.length < 4) pinVal += k;
        dots();
        if (pinVal.length === 4) {
          if (pinVal === CONFIG.adminPin) { $('.pin', adm).hidden = true; $('.adm-panel', adm).classList.add('on'); admOpen = true; renderAdmin(); }
          else { $('.pin-err', adm).textContent = 'Incorrect PIN'; pinVal = ''; dots(); setTimeout(function () { $('.pin-err', adm).textContent = ''; }, 1500); }
        }
      });
    });
    $('#photoUpload').addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files), lab = $('.drop-label', adm);
      if (!db || !files.length) return;
      lab.textContent = 'Uploading ' + files.length + '…';
      Promise.all(files.map(function (f) {
        return compress(f).then(function (url) { var ts = Date.now(); return db.ref(CONFIG.dbPath).push({ url: url, name: f.name, ts: ts, order: -ts }); });
      })).then(function () { lab.textContent = 'Upload photos'; })
        .catch(function (e) { console.warn(e); lab.textContent = 'Upload failed — try again'; });
      this.value = '';
    });
  }
  function renderAdmin() {
    var g = $('.adm-grid', adm);
    if (!photos.length) { g.innerHTML = '<p style="grid-column:1/-1;text-align:center;opacity:.6">No photos yet.</p>'; return; }
    g.innerHTML = '';
    photos.forEach(function (p, i) {
      var it = document.createElement('div'); it.className = 'adm-item';
      it.innerHTML = '<img alt=""><div class="adm-ctl"><span><button type="button" data-a="up" aria-label="Move up">▲</button> <button type="button" data-a="dn" aria-label="Move down">▼</button></span><button type="button" class="del" data-a="rm" aria-label="Remove">✕</button></div>';
      it.querySelector('img').src = p.url;
      if (i === 0) it.querySelector('[data-a=up]').disabled = true;
      if (i === photos.length - 1) it.querySelector('[data-a=dn]').disabled = true;
      it.querySelector('[data-a=up]').onclick = function () { swap(p, photos[i - 1]); };
      it.querySelector('[data-a=dn]').onclick = function () { swap(p, photos[i + 1]); };
      var rm = it.querySelector('[data-a=rm]');
      rm.onclick = function () {
        if (rm.classList.contains('arm')) { db.ref(CONFIG.dbPath + '/' + p.key).remove(); return; }
        rm.classList.add('arm'); rm.textContent = 'TAP';
        setTimeout(function () { rm.classList.remove('arm'); rm.textContent = '✕'; }, 2000);
      };
      g.appendChild(it);
    });
  }
  function swap(a, b) { var u = {}; u[CONFIG.dbPath + '/' + a.key + '/order'] = order(b); u[CONFIG.dbPath + '/' + b.key + '/order'] = order(a); db.ref().update(u); }
  function compress(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var M = 1600, w = img.width, h = img.height;
          if (w > h && w > M) { h = Math.round(h * M / w); w = M; } else if (h >= w && h > M) { w = Math.round(w * M / h); h = M; }
          var c = document.createElement('canvas'); c.width = w; c.height = h;
          var x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
          res(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = function () { rej(new Error('decode')); };
        img.src = e.target.result;
      };
      r.onerror = function () { rej(new Error('read')); };
      r.readAsDataURL(file);
    });
  }
  var y = $('#yr'); if (y) y.textContent = new Date().getFullYear();

  /* ════════════ MOTION ════════════ */
  var sweep = $('.sweep'), hero = $('.hero'), sx = { v: 115 };
  function applySx() { sweep.style.setProperty('--sx', sx.v.toFixed(2) + '%'); }
  function setSx(v, dur) { if (!sweep || !window.gsap) return; window.gsap.to(sx, { v: v, duration: dur || 0.9, ease: 'power3.out', overwrite: true, onUpdate: applySx }); }
  function sweepOnce() {
    if (!sweep || REDUCED || !window.gsap) return;
    sx.v = 115; window.gsap.to(sx, { v: -15, duration: 2.6, ease: 'power2.inOut', overwrite: true, onUpdate: applySx });
  }

  function gsapLayer() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST || REDUCED) return;
    gsap.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });
    document.documentElement.classList.add('js-motion');
    if (sweep) applySx();

    /* V watermark draws itself as a line, then settles into the ghost fill */
    var line = $('.vm-line'), fill = $('.vm-fill');
    if (line) {
      gsap.timeline({ delay: 0.3 })
        .to(line, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' })
        .to(fill, { opacity: 0.06, duration: 1.4, ease: 'power1.out' }, '-=0.6')
        .to(line, { opacity: 0.25, duration: 1.2 }, '<');
    }

    /* light sweep across the paint: once on load, then it tracks the cursor and the scroll */
    sweepOnce();
    if (sweep && hero) {
      if (matchMedia('(pointer:fine)').matches) {
        hero.addEventListener('pointermove', function (e) { setSx(110 - (e.clientX / window.innerWidth) * 125); }, { passive: true });
      }
      ST.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: function (s) { setSx(40 - s.progress * 70); } });
    }

    /* "In your driveway." leans from upright into italic as you scroll */
    var up = $('.hero h1 .up'), it = $('.hero h1 .it');
    if (up && it) {
      gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: '+=360', scrub: 0.5 } })
        .to(up, { skewX: -11, duration: 0.62, ease: 'power1.in' }, 0)          // roman leans to the italic's angle…
        .to(up, { opacity: 0, duration: 0.06, ease: 'none' }, 0.62)              // …then the true italic takes over in one short beat
        .fromTo(it, { opacity: 0 }, { opacity: 1, duration: 0.06, ease: 'none' }, 0.62)
        .to({}, { duration: 0.32 });
    }

    /* services: horizontal pinned run on desktop; stays a scannable list on phones */
    var menu = $('.menu'), sec = $('#services');
    if (menu && sec) {
      var mm = gsap.matchMedia();
      mm.add('(min-width:1024px)', function () {
        menu.classList.add('h');
        var bar = document.createElement('div'); bar.className = 'h-progress'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>';
        menu.after(bar);
        var dist = function () { return Math.max(0, menu.scrollWidth - menu.clientWidth); };
        var tl = gsap.timeline({
          // pin where the whole card row (incl. Book buttons) is on screen: centred if it fits, bottom-aligned if not
          scrollTrigger: { trigger: sec, start: function () { return sec.offsetHeight > window.innerHeight ? 'bottom bottom' : 'center center'; }, end: function () { return '+=' + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
        });
        tl.to(menu, { x: function () { return -dist(); }, ease: 'none' }, 0)
          .to(bar.firstChild, { scaleX: 1, ease: 'none' }, 0);
        /* keyboard users: tabbing to an off-screen card scrolls the page to it */
        var onFocus = function (e) {
          var card = e.target.closest('.item'); var s = tl.scrollTrigger; if (!card || !s || dist() === 0) return;
          var x = Math.min(dist(), Math.max(0, card.offsetLeft - 40));
          menu.scrollLeft = 0;
          window.scrollTo(0, s.start + (s.end - s.start) * (x / dist()));
        };
        menu.addEventListener('focusin', onFocus);
        ST.refresh();
        return function () { menu.removeEventListener('focusin', onFocus); menu.classList.remove('h'); bar.remove(); gsap.set(menu, { clearProps: 'transform' }); };
      });
    }
  }
  gsapLayer();   // deferred script: DOM is parsed; ScrollTrigger re-measures on load by itself
})();
