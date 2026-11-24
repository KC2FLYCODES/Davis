/* Blue Eclipse Pool & Spa — site script */
(function () {
  'use strict';

  var CONFIG = {
    phone: '',                       // e.g. '(919) 555-0123' — call/text buttons stay hidden until set
    email: 'blueeclipse.contact@gmail.com',
    formEndpoint: 'https://formspree.io/f/mgoprvjl',
    dbPath: 'blueeclipse/gallery',
    adminPin: '2025',                // NOTE: client-side PIN is visible in source. Real lock = RTDB rules + Firebase Auth.
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
  var CONN = navigator.connection || {};
  var LOW = !!(CONN.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2));

  /* ── phone wiring ── */
  var digits = CONFIG.phone.replace(/\D/g, '');
  $$('[data-phone]').forEach(function (el) {
    if (!digits) { el.hidden = true; return; }
    var mode = el.getAttribute('data-phone');
    if (el.tagName === 'A') el.href = (mode === 'sms' ? 'sms:+1' : 'tel:+1') + digits;
    var t = el.querySelector('[data-phone-text]');
    if (t) t.textContent = CONFIG.phone;
  });
  if (!digits) document.documentElement.classList.add('no-phone');

  /* ── header ── */
  var hdr = $('.hdr');
  var onScroll = function () { hdr.classList.toggle('scrolled', window.scrollY > 24); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ── reveal ── */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('in'); }); }

  /* ── plan preselect ── */
  $$('[data-plan]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-plan');
      var r = $('input[name="Plan"][value="' + v + '"]');
      if (r) { r.checked = true; var g = r.closest('.chips'); if (g) g.classList.remove('bad'); }
    });
  });

  /* ── quote form (2-step) ── */
  var form = $('#quoteForm');
  if (form) {
    var steps = $$('.step', form), bars = $$('.steps i', form), err = $('.form-err', form), cur = 0;
    var show = function (i) {
      cur = i;
      steps.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      bars.forEach(function (b, k) { b.classList.toggle('on', k <= i); });
      err.textContent = '';
      if (form.getBoundingClientRect().top < 0) form.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
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
      fd.append('_subject', '[Blue Eclipse] Quote — ' + (fd.get('Plan') || 'plan') + ' — ' + (fd.get('City') || ''));
      fetch(CONFIG.formEndpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('bad'); return r; })
        .then(function () {
          form.reset();
          steps.forEach(function (s) { s.classList.remove('on'); });
          $('.steps', form).hidden = true;
          err.textContent = '';
          var done = $('.form-done', form);
          done.classList.add('on');
          done.setAttribute('tabindex', '-1'); done.focus({ preventScroll: true });
          form.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' });
          if (window.gtag) window.gtag('event', 'generate_lead', { form: 'quote' });
        })
        .catch(function () {
          err.innerHTML = 'That didn’t go through. Email <a href="mailto:' + CONFIG.email + '">' + CONFIG.email + '</a> and I’ll get back to you.';
          btn.disabled = false; btn.textContent = 'Send request';
        });
    });
  }

  /* ── firebase gallery (loaded lazily: photos are stored inline, so keep them off the critical path) ── */
  var db = null;
  try {
    if (window.firebase) { firebase.initializeApp(CONFIG.firebase); db = firebase.database(); }
  } catch (e) { console.warn('Firebase init failed', e); }

  var photos = [], admOpen = false, galStarted = false;
  var order = function (p) { return p.order !== undefined ? p.order : -p.ts; };
  var gal = $('#gallery-grid');
  var lb = $('#lb'), lbImg = $('#lb img'), lbIdx = 0, lbLast = null;

  function renderGallery() {
    if (!gal) return;
    if (!photos.length) { gal.className = 'gal-empty'; gal.textContent = 'Recent work is posted here after each job.'; return; }
    gal.className = 'gal';
    gal.innerHTML = '';
    photos.forEach(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Open photo ' + (i + 1));
      var img = document.createElement('img');
      img.src = p.url; img.alt = 'Pool serviced by Blue Eclipse'; img.loading = 'lazy'; img.decoding = 'async';
      b.appendChild(img);
      b.addEventListener('click', function () { openLb(i); });
      gal.appendChild(b);
    });
    if (window.ScrollTrigger) requestAnimationFrame(function () { window.ScrollTrigger.refresh(); });
  }
  function startGallery() {
    if (galStarted) return; galStarted = true;
    if (!db) { renderGallery(); return; }
    db.ref(CONFIG.dbPath).on('value', function (snap) {
      var d = snap.val() || {};
      photos = Object.keys(d).map(function (k) { var v = d[k]; v.key = k; return v; })
        .filter(function (p) { return p && p.url; })
        .sort(function (a, b) { return order(a) - order(b); });
      renderGallery();
      if (admOpen) renderAdmin();
    }, function (e) { console.warn('Gallery read failed', e); renderGallery(); });
  }
  if (gal && 'IntersectionObserver' in window) {
    var gio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { gio.disconnect(); startGallery(); } }, { rootMargin: '900px 0px' });
    gio.observe(gal);
    window.addEventListener('load', function () { setTimeout(startGallery, 3500); });
  } else { startGallery(); }

  function closeLb() { lb.classList.remove('open'); document.body.classList.remove('lock'); if (lbLast) lbLast.focus(); }
  function openLb(i) { lbLast = document.activeElement; lbIdx = i; lbImg.src = photos[i].url; lb.classList.add('open'); document.body.classList.add('lock'); $('.lb-x', lb).focus(); }
  function stepLb(d) { if (!photos.length) return; lbIdx = (lbIdx + d + photos.length) % photos.length; lbImg.src = photos[lbIdx].url; }
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

  /* ── admin: triple-tap "Site by" in the footer → PIN ── */
  var adm = $('#adm'), pinVal = '', taps = 0, tapT = null;
  var trig = $('#admTrigger');
  function tap(e) {
    e.preventDefault();
    taps++; clearTimeout(tapT); tapT = setTimeout(function () { taps = 0; }, 800);
    if (taps >= 3) { taps = 0; openAdm(); }
  }
  if (trig) {
    trig.addEventListener('touchstart', tap, { passive: false });
    trig.addEventListener('click', function (e) { if (!('ontouchstart' in window)) tap(e); });
  }
  function dots() { $$('.pin-dots i', adm).forEach(function (d, i) { d.classList.toggle('on', i < pinVal.length); }); }
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
  function swap(a, b) {
    var u = {}; u[CONFIG.dbPath + '/' + a.key + '/order'] = order(b); u[CONFIG.dbPath + '/' + b.key + '/order'] = order(a);
    db.ref().update(u);
  }
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

  /* visit checklist: ticks off one by one after the hero lands */
  var visitItems = $$('.visit li');
  visitItems.forEach(function (li) {
    li.classList.add('has-tick');
    li.insertAdjacentHTML('beforeend', '<svg class="tick" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10"/><path pathLength="1" d="M6.5 11.5l3 3 6-6.5"/></svg>');
  });
  if (REDUCED) visitItems.forEach(function (li) { li.classList.add('done'); });
  else visitItems.forEach(function (li, i) { setTimeout(function () { li.classList.add('done'); }, 1100 + i * 420); });

  /* WebGL caustics: light through water, bent by the cursor */
  (function caustics() {
    var cv = $('.caustics'), hero = $('.hero');
    if (!cv || !hero) return;
    var gl;
    try { gl = cv.getContext('webgl', { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) return;
    var VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var FS = [
      'precision mediump float;',
      'uniform vec2 r;uniform float t;uniform vec2 m;uniform float mob;',
      'float layer(vec2 p,float t,float f){',
      '  vec2 q=p*(1.+f*.6)+vec2(sin(t*.23+f*1.7),cos(t*.19+f*2.3))*1.2;',
      '  q+=.5*vec2(sin(q.y*1.15+t*.5+f),sin(q.x*1.05-t*.42-f));',
      '  float a=sin(q.x*1.8+.9*sin(q.y*1.5+t*.55));',
      '  float b=sin(q.y*1.6+.9*sin(q.x*1.3-t*.47));',
      '  return pow(1.-abs(a),6.)+pow(1.-abs(b),6.);',
      '}',
      'void main(){',
      '  vec2 uv=gl_FragCoord.xy/r;float s=min(r.x,r.y);',
      '  vec2 p=(gl_FragCoord.xy-.5*r)/s*2.6;',
      '  vec2 mp=(m*r-.5*r)/s*2.6;',
      '  vec2 dv=p-mp;float d=dot(dv,dv);',
      '  p-=dv*.22*exp(-d*1.6);',
      '  float c=layer(p,t,0.)*.55+layer(p*1.35+3.1,t*1.1,1.)*.45;',
      '  c=pow(c,1.6)*.9;',
      '  float glow=exp(-d*.8);',
      '  float mask=mix(.35+.65*smoothstep(0.,.6,uv.x),.5,mob)*smoothstep(0.,.4,uv.y);',
      '  float a=clamp((c*.5+glow*.14)*mask,0.,.75);',
      '  vec3 col=mix(vec3(0.,.55,.8),vec3(.6,.96,1.),clamp(c*.6,0.,1.));',
      '  gl_FragColor=vec4(col*a,a);',
      '}'
    ].join('\n');
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) return;
    var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(pr, 'r'), uT = gl.getUniformLocation(pr, 't'), uM = gl.getUniformLocation(pr, 'm'), uMob = gl.getUniformLocation(pr, 'mob');
    var mobile = matchMedia('(max-width:760px)').matches;
    var scale = LOW ? 0.33 : 0.5, mx = 0.72, my = 0.55, tx = mx, ty = my, hasPointer = false;
    function size() {
      var w = cv.clientWidth, h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * scale)); cv.height = Math.max(1, Math.round(h * scale));
      gl.viewport(0, 0, cv.width, cv.height);
    }
    function draw(t) {
      gl.uniform2f(uR, cv.width, cv.height); gl.uniform1f(uT, t); gl.uniform2f(uM, mx, my); gl.uniform1f(uMob, mobile ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    size();
    window.addEventListener('resize', function () { mobile = matchMedia('(max-width:760px)').matches; size(); if (REDUCED) draw(14); });
    if (REDUCED) { draw(14); cv.classList.add('on'); return; }

    if (matchMedia('(pointer:fine)').matches) {
      hero.addEventListener('pointermove', function (e) {
        var b = cv.getBoundingClientRect(); hasPointer = true;
        tx = (e.clientX - b.left) / b.width; ty = 1 - (e.clientY - b.top) / b.height;
      }, { passive: true });
      hero.addEventListener('pointerleave', function () { hasPointer = false; });
    }
    var raf = 0, visible = true, t0 = performance.now(), last = t0, n = 0, acc = 0, downgrades = 0, dead = false;
    function frame(now) {
      raf = 0;
      if (!visible || document.hidden || dead) return;
      var dt = now - last; last = now; n++;
      if (n > 10 && n <= 70) acc += dt;
      if (n === 70) {
        if (acc / 60 > 30) {
          if (downgrades === 0) { downgrades = 1; scale *= 0.6; size(); n = 0; acc = 0; }
          else { dead = true; return; }   // keep the last frame as a still
        }
      }
      var t = (now - t0) / 1000 * 0.6 + 6;
      if (!hasPointer) { tx = 0.7 + Math.sin(t * 0.35) * 0.12; ty = 0.55 + Math.cos(t * 0.28) * 0.12; }
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
      draw(t);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible && !document.hidden && !dead) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }).observe(hero);
    }
    document.addEventListener('visibilitychange', kick);
    draw(6); cv.classList.add('on'); kick();
  })();

  /* GSAP layer: eclipse, heading weight, plan gauge */
  function gsapLayer() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST) return;
    gsap.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });

    /* plan gauge — how often I'm there */
    var gauge = $('.gauge'), water = $('.g-water'), num = $('.g-num b'), plans = $$('.plan[data-visits]');
    if (gauge && water && plans.length) {
      document.documentElement.classList.add('js-motion');
      var setPlan = function (p) {
        var v = +p.getAttribute('data-visits');
        plans.forEach(function (x) { x.classList.toggle('act', x === p); });
        water.style.transform = 'translateY(' + ((1 - v / 4) * 100 * 0.92) + '%)';
        num.textContent = v;
        $('.g-num span').innerHTML = v === 1 ? 'visit<br>a month' : 'visits<br>a month';
      };
      setPlan(plans[0]);
      plans.forEach(function (p) {
        ST.create({ trigger: p, start: 'top 62%', end: 'bottom 62%', onToggle: function (s) { if (s.isActive) setPlan(p); } });
      });
    }

    if (REDUCED) return;

    /* eclipse: moon slides into place, then deepens with scroll */
    var moon = $('.ec-moon'), ring = $('.ec-ring'), hero = $('.hero');
    if (moon && getComputedStyle($('.eclipse')).display !== 'none') {
      gsap.from(moon, { x: '16vw', duration: 2.2, ease: 'power3.out', delay: 0.15 });
      gsap.from(ring, { scale: 0.92, opacity: 0, duration: 1.8, ease: 'power2.out' });
      gsap.to(moon, { xPercent: -16, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    }

    /* section headings gain weight as they rise into view */
    $$('.sec-head h2, .quote-aside h2').forEach(function (h) {
      gsap.fromTo(h, { '--w': 300 }, { '--w': 520, ease: 'none', scrollTrigger: { trigger: h, start: 'top 88%', end: 'top 40%', scrub: 0.4 } });
    });
  }
  gsapLayer();   // deferred script: DOM is parsed; ScrollTrigger re-measures on load by itself
})();
