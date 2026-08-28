/* =========================================================
LOVE LETTER GENERATOR — APP LOGIC
   Sections: 1. Ambient FX  2. Theme/Mode
   3. Validation  4. Letter Engine  5. Envelope + Typewriter
   6. Letter Actions (copy/txt/pdf/print/share)
   7. History + Favorites + Storage  8. Toasts  9. Init
   ========================================================= */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const STORAGE_KEY = 'llg_letters_v1';
  const PREF_KEY = 'llg_prefs_v1';
  const APP_PREFS_KEY = 'llg_upgrade_prefs_v1';
  let selectedPhotos = [];
  let aiDraft = '';
  let selectedAiStyle = 'romantic';
  let openAfterGenerate = false;
  // True once "Replace letter" has put an AI draft into the main letter
  // field (#memory) as the full letter text. While true, buildLetter()
  // uses that text verbatim instead of running it through the writing-style
  // templates, and the loveAbout/promise fields are not required — they're
  // template ingredients, not part of an AI-authored full letter.
  let aiFullLetterActive = false;

  function createIcon(name, extraClass = '') {
    const icons = {
      heart: '<svg viewBox="0 0 24 24" role="presentation"><path d="M12 20s-6.2-4.2-8.1-8.2C2.2 8.9 3.8 5 7.5 5c2.1 0 3.2 1.3 4.5 3.1C13.3 6.3 14.4 5 16.5 5c3.7 0 5.3 3.9 3.6 6.8C18.2 15.8 12 20 12 20Z" fill="currentColor"/></svg>',
      star: '<svg viewBox="0 0 24 24" role="presentation"><path d="m12 4 2.5 5.1 5.7.8-4.2 4.1 1 5.6L12 17.4 6.9 19.6l1-5.6L3.8 9.9l5.7-.8L12 4Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
      starFilled: '<svg viewBox="0 0 24 24" role="presentation"><path d="m12 4 2.5 5.1 5.7.8-4.2 4.1 1 5.6L12 17.4 6.9 19.6l1-5.6L3.8 9.9l5.7-.8L12 4Z" fill="currentColor"/></svg>',
      eye: '<svg viewBox="0 0 24 24" role="presentation"><path d="M2.5 12s3.2-6.2 9.5-6.2S21.5 12 21.5 12s-3.2 6.2-9.5 6.2S2.5 12 2.5 12Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
      trash: '<svg viewBox="0 0 24 24" role="presentation"><path d="M8 5h8M5 8h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 8Zm4 3v7m6-7v7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      copy: '<svg viewBox="0 0 24 24" role="presentation"><rect x="8" y="4" width="10" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M6 8h-2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      download: '<svg viewBox="0 0 24 24" role="presentation"><path d="M12 4v10m0 0 4-4m-4 4-4-4M5 18h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      close: '<svg viewBox="0 0 24 24" role="presentation"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };
    const markup = icons[name] || icons.heart;
    return `<span class="icon ${extraClass}" aria-hidden="true">${markup}</span>`;
  }

  /* ---------------- 1. AMBIENT FX ---------------- */
  function spawnHearts() {
    const field = $('#heartsField');
    const count = window.innerWidth < 600 ? 10 : 18;
    for (let i = 0; i < count; i++) {
      const h = document.createElement('span');
      h.className = 'floating-heart';
      h.innerHTML = createIcon('heart');
      const size = 12 + Math.random() * 22;
      h.style.left = Math.random() * 100 + 'vw';
      h.style.fontSize = size + 'px';
      h.style.setProperty('--drift', (Math.random() * 80 - 40) + 'px');
      const duration = 10 + Math.random() * 14;
      h.style.animationDuration = duration + 's';
      h.style.animationDelay = (Math.random() * duration) + 's';
      field.appendChild(h);
    }
  }

  function spawnPetals() {
    const field = $('#petalsField');
    const count = window.innerWidth < 600 ? 8 : 14;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'petal';
      p.style.left = Math.random() * 100 + 'vw';
      const scale = .6 + Math.random() * 1.1;
      p.style.transform = `scale(${scale})`;
      p.style.setProperty('--drift', (Math.random() * 100 - 50) + 'px');
      const duration = 9 + Math.random() * 12;
      p.style.animationDuration = duration + 's';
      p.style.animationDelay = (Math.random() * duration) + 's';
      field.appendChild(p);
    }
  }

  function sparkleBurst(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 70;
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--sx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--sy', Math.sin(angle) * dist + 'px');
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 950);
    }
  }

  // Lightweight confetti / heart-explosion on canvas
  function heartConfetti() {
    const canvas = $('#confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const colors = ['#e85d75', '#ff8fa3', '#ffd166', '#ffffff', '#c9184a'];
    const pieces = Array.from({ length: 70 }, () => ({
      x: canvas.width / 2 + (Math.random() * 200 - 100),
      y: canvas.height * 0.35,
      vx: (Math.random() - .5) * 12,
      vy: -(Math.random() * 10 + 4),
      g: 0.35 + Math.random() * .2,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: Math.random() > .5 ? 'heart' : 'square',
      rot: Math.random() * 360,
      vr: (Math.random() - .5) * 10,
      life: 0
    }));

    function drawHeart(cx, cy, size, color, rot) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot * Math.PI / 180);
      ctx.fillStyle = color;
      ctx.beginPath();
      const s = size / 2;
      ctx.moveTo(0, s * .3);
      ctx.bezierCurveTo(0, -s * .4, -s, -s * .4, -s, s * .1);
      ctx.bezierCurveTo(-s, s * .6, 0, s, 0, s * 1.2);
      ctx.bezierCurveTo(0, s, s, s * .6, s, s * .1);
      ctx.bezierCurveTo(s, -s * .4, 0, -s * .4, 0, s * .3);
      ctx.fill();
      ctx.restore();
    }

    let frame = 0;
    function tick() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      pieces.forEach(p => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.g;
        p.rot += p.vr;
        if (p.y < canvas.height + 40) alive = true;
        const fade = Math.max(0, 1 - p.life / 90);
        ctx.globalAlpha = fade;
        if (p.shape === 'heart') {
          drawHeart(p.x, p.y, p.size, p.color, p.rot);
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });
      ctx.globalAlpha = 1;
      if (alive && frame < 140) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    tick();
  }

  /* ---------------- 2. THEME / MODE ---------------- */
  function loadPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; }
    catch { return {}; }
  }
  function savePrefs(p) {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
  }

  function initThemeMode() {
    const prefs = loadPrefs();
    const themeSelect = $('#themeSelect');
    const modeToggle = $('#modeToggle');

    if (prefs.theme) {
      document.body.setAttribute('data-theme', prefs.theme);
      if (themeSelect) try { themeSelect.value = prefs.theme; } catch (e) {}
    }

    if (prefs.mode) {
      document.body.setAttribute('data-mode', prefs.mode);
      if (modeToggle) modeToggle.setAttribute('aria-pressed', prefs.mode === 'dark' ? 'true' : 'false');
    }

    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        document.body.setAttribute('data-theme', themeSelect.value);
        const p = loadPrefs(); p.theme = themeSelect.value; savePrefs(p);
      });
    }

    if (modeToggle) {
      modeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-mode') === 'dark';
        const next = isDark ? 'light' : 'dark';
        document.body.setAttribute('data-mode', next);
        modeToggle.setAttribute('aria-pressed', String(!isDark));
        const p = loadPrefs(); p.mode = next; savePrefs(p);
      });
    }
  }

/* ---------------- 4. VALIDATION ---------------- */
  const REQUIRED_FIELDS = ['yourName', 'partnerName', 'relationship', 'memory', 'loveAbout', 'promise'];

  function validateForm(form) {
    let valid = true;
    // When an AI draft has fully replaced the letter, loveAbout/promise are
    // just template ingredients the AI text doesn't use — don't block
    // generation on them being empty.
    const skip = aiFullLetterActive ? ['loveAbout', 'promise'] : [];
    REQUIRED_FIELDS.forEach(name => {
      const field = form.elements[name];
      const errorEl = $(`#err-${name}`);
      if (skip.includes(name)) {
        field.classList.remove('invalid');
        if (errorEl) errorEl.textContent = '';
        return;
      }
      const value = field.value.trim();
      if (!value) {
        valid = false;
        field.classList.add('invalid');
        if (errorEl) errorEl.textContent = 'This field helps write the letter — please fill it in.';
      } else {
        field.classList.remove('invalid');
        if (errorEl) errorEl.textContent = '';
      }
    });
    return valid;
  }

  // Clear error state as the user types/selects
  function wireLiveValidation(form) {
    REQUIRED_FIELDS.forEach(name => {
      const field = form.elements[name];
      field.addEventListener('input', () => {
        if (field.value.trim()) {
          field.classList.remove('invalid');
          const errorEl = $(`#err-${name}`);
          if (errorEl) errorEl.textContent = '';
        }
      });
    });
  }

/* ---------------- 5. LETTER ENGINE ---------------- */
  const OPENERS = {
    sweet: (p) => `My dearest ${p.partnerName},`,
    romantic: (p) => `To ${p.partnerName}, the one who rearranged my whole world,`,
    cute: (p) => `Hi hi, my favorite person, ${p.partnerName} 🤍`,
    poetic: (p) => `${p.partnerName} —`,
    longdistance: (p) => `My ${p.relationship.toLowerCase()}, ${p.partnerName}, wherever this finds you,`,
    anniversary: (p) => `To my ${p.relationship.toLowerCase()}, ${p.partnerName}, on another year of us,`,
    apology: (p) => `${p.partnerName},`,
    proposal: (p) => `${p.partnerName}, my love,`
  };

  const BODY_TEMPLATES = {
    sweet: (p) => [
      `I keep meaning to tell you something simple, so here it is: you make my ordinary days feel worth paying attention to.`,
      `I still think about ${p.memory}. It's such a small thing, maybe, but it's the kind of small thing I want a whole life of.`,
      `${p.loveAbout} — that's the part of you I fell for and the part I fall for again, most days, without even trying.`,
    ],
    romantic: (p) => [
      `${p.partnerName}, from the very first ordinary moment we shared to every quiet evening since, you have somehow turned the whole shape of my life into something softer, steadier, and warmer than I ever knew to hope for, and I still find myself thinking, in the middle of an unremarkable afternoon, about ${p.memory}, about how easily you make the smallest, most forgettable hours feel worth holding onto, about ${p.loveAbout}, and about the strange, steady certainty that grows in me a little more every single day that whatever else changes, whatever the years ask of us, and however far apart the calendar sometimes pulls us, I want to keep choosing you, again and again, without hesitation, without needing a reason beyond the simple truth of how you make me feel, for as long as you'll have me.`,
      `I still return, again and again, to ${p.memory} — it's carved into me now, one of the moments I'd choose to relive over anything new the world could offer. Some memories fade with time; that one has only grown warmer.`,
      `${p.loveAbout}. I notice it in the smallest, most unremarkable moments, and I don't think I'll ever stop noticing it, no matter how many years we're lucky enough to add to this.`,
    ],
    cute: (p) => [
      `Okay so, this is me being sappy on purpose, because you deserve it and I'm not sorry.`,
      `Remember ${p.memory}? I laughed about it again this week, randomly, like a person with a crush. Which — fair, I am.`,
      `${p.loveAbout}. Certified favorite thing about you. No notes.`,
    ],
    poetic: (p) => [
      `Some loves arrive like weather — sudden, undeniable. Ours arrived quieter, and stayed.`,
      `I hold ${p.memory} the way you'd hold something breakable: carefully, and often.`,
      `${p.loveAbout}, and in that, I found a kind of home I didn't know I was looking for.`,
    ],
    longdistance: (p) => [
      `Distance has a way of making the small things loud — a voice note, a good-morning text, the minutes until we're in the same room again.`,
      `I replay ${p.memory} on the nights the miles feel longer than usual. It still works, every time.`,
      `${p.loveAbout} — I notice it even through a screen, even from here, even from far away.`,
    ],
    anniversary: (p) => [
      `Another year, and somehow you're still my favorite decision.`,
      `I think back often to ${p.memory} — one of so many moments that quietly built the life we have now.`,
      `${p.loveAbout}. Truer today than it was when I first noticed it.`,
    ],
    apology: (p) => [
      `I've been turning this over for a while, and I want to say it plainly: I'm sorry, and I mean it without any conditions attached.`,
      `I think about ${p.memory} often — it reminds me who we are underneath whatever went wrong recently, and I don't want to lose that.`,
      `${p.loveAbout} is one of the reasons I'm not willing to let this sit unsaid. You matter too much for that.`,
    ],
    proposal: (p) => [
      `I've written this letter a dozen ways in my head, and every version ends the same place: with you.`,
      `I keep coming back to ${p.memory} — proof, if I ever needed it, that the ordinary days with you are the ones I want forever.`,
      `${p.loveAbout}. It's why I'm asking, plainly and without any doubt left in me: will you spend the rest of it with me?`,
    ],
  };

  const LENGTH_CONFIG = { short: 1, medium: 2, long: 3 };

  function getSignature(p) {
    const anonymous = p.senderPrivacy === 'anonymous';
    const name = anonymous ? 'Someone who cares about you ❤️' : (p.yourName || '').trim();
    if (!name) return '';
    const map = {
      dash: `— ${name}`,
      withlove: `With love, ${name}`,
      forever: `Forever yours, ${name}`,
      heart: `Love, ${name} ❤️`
    };
    return map[p.signatureStyle || 'dash'] || `— ${name}`;
  }

  function buildLetter(p) {
    const closing = (p.closing || '').trim() || "And that's everything my heart wanted to say...";

    // An AI draft that was inserted via "Replace letter" IS the letter —
    // use it exactly as written instead of splicing it into the
    // writing-style templates below (which would mangle a full letter into
    // a single template clause).
    if (aiFullLetterActive && p.memory) {
      return { paragraphs: p.memory.trim(), closing, signoff: getSignature(p) };
    }

    const opener = OPENERS[p.writingStyle](p);
    const bodyLines = BODY_TEMPLATES[p.writingStyle](p);
    const take = LENGTH_CONFIG[p.letterLength] || 2;
    const body = bodyLines.slice(0, take).join(' ');
    const promiseLine = `And so, I promise you this: ${lowerFirst(p.promise)}`;
    const paragraphs = [opener, body, promiseLine].filter(Boolean).join('\n\n');
    return { paragraphs, closing, signoff: getSignature(p) };
  }

  function lowerFirst(str) {
    const t = str.trim();
    if (!t) return t;
    return t.charAt(0).toLowerCase() + t.slice(1);
  }

  function collectFormData(form) {
    const fd = new FormData(form);
    return {
      yourName: (fd.get('yourName') || '').trim(),
      partnerName: (fd.get('partnerName') || '').trim(),
      relationship: fd.get('relationship'),
      writingStyle: fd.get('writingStyle'),
      letterLength: fd.get('letterLength'),
      memory: (fd.get('memory') || '').trim(),
      loveAbout: (fd.get('loveAbout') || '').trim(),
      promise: (fd.get('promise') || '').trim(),
      closing: (fd.get('closing') || '').trim(),
      senderPrivacy: $('#senderPrivacyToggle')?.checked ? 'anonymous' : 'named',
      signatureStyle: $('#signatureStyle')?.value || 'dash',
      typewriter: $('#typewriterToggle')?.checked || false,
      music: $('#musicToggle')?.checked || false,
      photos: selectedPhotos.map(x => x.dataUrl)
    };
  }

/* ---------------- 6. ENVELOPE + TYPEWRITER ---------------- */
  let typewriterTimer = null;

  function typeText(el, text, speed = 16) {
    return new Promise((resolve) => {
      clearInterval(typewriterTimer);
      el.textContent = '';
      el.classList.add('typing-cursor');
      let i = 0;
      const finish = () => {
        clearInterval(typewriterTimer);
        el.classList.remove('typing-cursor');
        el.textContent = text;
        resolve();
      };
      typewriterTimer = setInterval(() => {
        el.textContent += text[i] || '';
        i++;
        if (i >= text.length) finish();
      }, speed);
    });
  }

  let previousBodyOverflow = '';
  let previousDocumentOverflow = '';

  function lockBodyScroll() {
    previousBodyOverflow = document.body.style.overflow;
    previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  function unlockBodyScroll() {
    document.body.style.overflow = previousBodyOverflow || '';
    document.documentElement.style.overflow = previousDocumentOverflow || '';
  }

  function showLetterBackdrop() {
    lockBodyScroll();
    const backdrop = $('#letterBackdrop');
    if (!backdrop) return;
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add('visible'));
  }

  function hideLetterBackdrop() {
    document.body.classList.remove('letter-open');
    unlockBodyScroll();
    const backdrop = $('#letterBackdrop');
    if (!backdrop) return;
    backdrop.classList.remove('visible');
    setTimeout(() => {
      if (!backdrop.classList.contains('visible')) backdrop.hidden = true;
    }, 360);
  }

  function closeLetterOutput() {
    const section = $('#letterOutput');
    if (!section || section.hidden) return;
    section.hidden = true;
    hideLetterBackdrop();

    // The user is done with this letter — clear the form and photo picker,
    // and reset the preview panel back to its empty state so step 3 doesn't
    // keep showing what they just sent.
    const form = $('#letterFormEl');
    if (form) form.reset();
    selectedPhotos = [];
    renderPhotoPicker();
    resetPreview();
  }

  async function revealLetter(letter, options = {}) {
    prepareClosedEnvelope(letter, options);
    await playEnvelopeOpen(letter, options);
  }

  // Shows the closed envelope and its contents are queued up, but nothing
  // animates yet — used to set the stage before either an automatic
  // reveal or a click-to-open reveal.
  function prepareClosedEnvelope(letter, options = {}) {
    const section = $('#letterOutput');
    const envelope = $('#envelope');
    const textEl = $('#letterText');
    const signoffEl = $('#letterSignoff');
    const closingEl = $('#letterClosing');

    showLetterBackdrop();
    document.body.classList.add('letter-open');
    section.hidden = false;
    envelope.classList.remove('opened');
    textEl.textContent = '';
    signoffEl.textContent = '';
    closingEl.textContent = '';
    renderLetterPhotos(options.photos || []);
    applyEnvelopeSize('');
  }

  // Plays the envelope-opening animation and reveals the letter text.
  // Assumes prepareClosedEnvelope() already ran.
  async function playEnvelopeOpen(letter, options = {}) {
    const envelope = $('#envelope');
    const textEl = $('#letterText');
    const signoffEl = $('#letterSignoff');
    const closingEl = $('#letterClosing');
    const typewriter = options.typewriter ?? false;
    const fullText = [letter?.paragraphs, letter?.closing, letter?.signoff].filter(Boolean).join(' ');

    if (!options.skipAnimation && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await wait(250);
      envelope.classList.add('opened');
      applyEnvelopeSize(fullText);
      await wait(750);
    } else {
      envelope.classList.add('opened');
      applyEnvelopeSize(fullText);
    }

    const rect = envelope.getBoundingClientRect();
    if (!options.skipAnimation) sparkleBurst(rect.left + rect.width / 2, rect.top + rect.height * .3, 12);

    if (typewriter && !options.skipTypewriter) {
      await typeText(textEl, letter.paragraphs, 10);
    } else {
      textEl.textContent = letter.paragraphs;
    }
    closingEl.textContent = letter.closing || "And that's everything my heart wanted to say...";
    signoffEl.textContent = letter.signoff;
    heartConfetti();
  }

  // Shows a closed, sealed envelope and waits for the recipient to click
  // (or press Enter/Space on) it before playing the open animation —
  // used when someone opens a letter shared with them.
  function armEnvelopeForClickToOpen(letter, options = {}) {
    prepareClosedEnvelope(letter, options);
    const envelope = $('#envelope');
    const hint = $('#envelopeHint');
    const notice = $('#letterReceivedNotice');

    envelope.classList.add('awaiting-open');
    envelope.setAttribute('role', 'button');
    envelope.setAttribute('tabindex', '0');
    envelope.setAttribute('aria-label', 'Open your letter');
    if (hint) hint.hidden = false;
    if (notice) notice.hidden = false;

    const open = () => {
      // brief press feedback before the seal breaks
      envelope.classList.add('envelope-pressed');
      setTimeout(() => envelope.classList.remove('envelope-pressed'), 180);

      envelope.classList.remove('awaiting-open');
      envelope.removeAttribute('role');
      envelope.removeAttribute('tabindex');
      envelope.removeAttribute('aria-label');
      envelope.removeEventListener('click', open);
      envelope.removeEventListener('keydown', onKey);
      if (hint) hint.hidden = true;
      if (notice) notice.hidden = true;
      playEnvelopeOpen(letter, options);
    };
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    };

    envelope.addEventListener('click', open);
    envelope.addEventListener('keydown', onKey);
  }

  function renderLetterPhotos(photos) {
    const container = $('#letterPhotos');
    if (!container) return;
    container.innerHTML = '';
    const list = (photos || []).slice(0,3);
    list.forEach((src, i) => {
      const fig = document.createElement('figure');
      fig.className = 'photo-collage-item' + (list.length === 3 && i === 1 ? ' is-center' : '');
      fig.innerHTML = `<img src="${src}" alt="Photo memory ${i+1}" loading="lazy">`;
      container.appendChild(fig);
    });
  }

  // ---- Dynamic paper sizing ----
  // Estimates how "big" the generated letter is from its actual text length
  // and picks a size class so the paper grows to fit once the envelope has
  // opened — short notes stay compact, long/AI-generated letters get a
  // wide, full-page reading width instead of feeling squeezed.
  function getEnvelopeSizeClass(text) {
    const len = (text || '').length;
    if (len > 1100) return 'env-size-xl';
    if (len > 600) return 'env-size-lg';
    if (len > 300) return 'env-size-md';
    return '';
  }

  function applyEnvelopeSize(text) {
    const modal = document.querySelector('.letter-modal');
    if (!modal) return;
    modal.classList.remove('env-size-md', 'env-size-lg', 'env-size-xl');
    const cls = getEnvelopeSizeClass(text);
    if (cls) modal.classList.add(cls);
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  // The data behind whatever letter is currently shown in the envelope —
  // used by the share link / QR code, which encodes the letter itself
  // rather than pointing at any server-stored copy.
  function setCurrentLetterData(data) { window.__currentLetterData = data; }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

/* ---------------- 7. LETTER ACTIONS ---------------- */
  function currentLetterFullText() {
    const text = $('#letterText').textContent.trim();
    const signoff = $('#letterSignoff').textContent.trim();
    const closing = $('#letterClosing')?.textContent.trim() || '';
    return [text, closing, signoff].filter(Boolean).join('\n\n');
  }

  /* ---- Shareable link + QR code ----
     No backend exists, so the letter itself is packed into the URL's
     hash fragment (never sent to any server) as unicode-safe base64 JSON.
     Anyone who opens the link decodes it locally and sees the letter. */
  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      (_, hex) => String.fromCharCode(parseInt(hex, 16))));
  }
  function b64DecodeUnicode(str) {
    return decodeURIComponent(atob(str).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  }

  function buildShareLink(data) {
    const payload = { y: data.anonymous ? '' : data.yourName, p: data.partnerName, s: data.style, t: data.text, c: data.closing || '', g: data.signature || '', ph: data.photos || [] };
    const encoded = encodeURIComponent(b64EncodeUnicode(JSON.stringify(payload)));
    const base = location.origin + location.pathname;
    return `${base}#shared=${encoded}`;
  }

  function decodeShareLink(hash) {
    const match = hash.match(/#shared=(.+)/);
    if (!match) return null;
    try {
      const json = b64DecodeUnicode(decodeURIComponent(match[1]));
      const payload = JSON.parse(json);
      if (!payload.t) return null;
      return { yourName: payload.y || '', partnerName: payload.p || '', style: payload.s || 'sweet', text: payload.t, closing: payload.c || '', signature: payload.g || '', photos: Array.isArray(payload.ph) ? payload.ph.slice(0,3) : [], anonymous: !payload.y };
    } catch {
      return null;
    }
  }

  function renderQrCode(link) {
    const container = $('#qrCodeContainer');
    container.innerHTML = '';
    if (!window.QRCode) {
      container.textContent = 'QR code unavailable offline.';
      return;
    }
    try {
      // Lowest error-correction level = the most data a QR code can hold,
      // since the whole letter (and any attached photos) is encoded
      // straight into it — there's no server, so nothing else to point to.
      new QRCode(container, { text: link, width: 176, height: 176, colorDark: '#3a2230', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.L });
    } catch (err) {
      // Letters with a photo attached (or a very long letter) can outgrow
      // what a QR code can hold at all. That's a limit of QR codes
      // themselves, not something to let crash the rest of the share
      // dialog — the link below still works either way.
      container.innerHTML = '<p class="qr-fallback-msg">This letter is too long for a QR code — usually because of an attached photo. The link below still works.</p>';
    }
  }

  function openShareModal() {
    const data = window.__currentLetterData;
    if (!data) { showToast('Generate a letter first, then share it.'); return; }

    const link = buildShareLink(data);
    $('#shareLinkInput').value = link;
    renderQrCode(link);

    const deviceBtn = $('#deviceShareBtn');
    if (navigator.share) {
      deviceBtn.hidden = false;
      deviceBtn.onclick = async () => {
        try { await navigator.share({ title: `A letter for ${data.partnerName}`, url: link }); }
        catch { /* user cancelled */ }
      };
    } else {
      deviceBtn.hidden = true;
    }

    $('#shareModal').hidden = false;
  }

  function closeShareModal() { $('#shareModal').hidden = true; }

  function initShareModal() {
    $('#shareCloseBtn').addEventListener('click', closeShareModal);
    $('#shareModalBackdrop').addEventListener('click', closeShareModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#shareModal').hidden) closeShareModal();
    });
    $('#copyLinkBtn').addEventListener('click', async () => {
      const input = $('#shareLinkInput');
      try {
        await navigator.clipboard.writeText(input.value);
        showToast('Link copied — paste it anywhere.');
      } catch {
        input.select();
        showToast('Press Ctrl/Cmd+C to copy the selected link.');
      }
    });
  }

  // If this page was opened via a shared link, decode and display that
  // letter immediately, without touching the form.
  function initSharedLinkBootstrap() {
    const shared = decodeShareLink(location.hash);
    if (!shared) return;

    const parts = shared.text.split('\n\n');
    const data = {...shared, body: parts.slice(0,-2).join('\n\n'), closing: shared.closing || parts[parts.length-2] || '', signature: shared.signature || parts[parts.length-1] || ''};
    setCurrentLetterData(data);

    const letter = { paragraphs: data.body, closing: data.closing, signoff: data.signature };
    // The recipient gets a sealed envelope and opens it themselves —
    // it doesn't reveal automatically.
    armEnvelopeForClickToOpen(letter, { photos: data.photos || [] });

    const banner = $('#sharedBanner');
    $('#sharedBannerText').textContent = shared.yourName
      ? `💌 This letter was shared with you by ${shared.yourName}.`
      : '💌 Someone shared this letter with you.';
    banner.hidden = false;
    $('#sharedBannerClose').addEventListener('click', () => { banner.hidden = true; });

    // no scrollIntoView here; modal is fixed and centered in viewport
  }

  function initLetterActions() {
    $('#copyBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(currentLetterFullText());
        showToast('Letter copied to clipboard.');
      } catch {
        showToast('Could not copy — try selecting the text manually.');
      }
    });

    $('#txtBtn').addEventListener('click', () => {
      const blob = new Blob([currentLetterFullText()], { type: 'text/plain;charset=utf-8' });
      downloadBlob(blob, 'love-letter.txt');
      showToast('Letter downloaded as .txt');
    });

    const closeLetterBtn = $('#closeLetterBtn');
    if (closeLetterBtn) {
      closeLetterBtn.addEventListener('click', closeLetterOutput);
    }

    $('#pdfBtn').addEventListener('click', () => {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const margin = 60;
        const maxWidth = 495;
        doc.setFont('times', 'normal');
        doc.setFontSize(13);
        const lines = doc.splitTextToSize(currentLetterFullText(), maxWidth);
        doc.text(lines, margin, margin);
        doc.save('love-letter.pdf');
        showToast('Letter downloaded as PDF.');
      } catch (e) {
        showToast('PDF export needs an internet connection to load its library.');
      }
    });

    $('#printBtn').addEventListener('click', () => {
      const w = window.open('', '_blank', 'width=650,height=800');
      if (!w) { showToast('Please allow pop-ups to print.'); return; }
      w.document.write(`<html><head><title>Love Letter</title>
        <style>body{font-family:Georgia,serif;padding:60px;line-height:1.8;white-space:pre-wrap;font-size:16px;}</style>
        </head><body>${escapeHtml(currentLetterFullText())}</body></html>`);
      w.document.close();
      w.focus();
      setTimeout(() => w.print(), 300);
    });

    $('#shareBtn').addEventListener('click', openShareModal);

    const backdrop = $('#letterBackdrop');
    if (backdrop) {
      backdrop.addEventListener('click', closeLetterOutput);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#letterOutput').hidden) closeLetterOutput();
    });

    $('#favBtn').addEventListener('click', () => {
      const btn = $('#favBtn');
      const active = btn.getAttribute('aria-pressed') === 'true';
      const next = !active;
      btn.setAttribute('aria-pressed', String(next));
      btn.innerHTML = `${next ? createIcon('starFilled', 'is-active') : createIcon('star')}<span>${next ? 'Favorited' : 'Favorite'}</span>`;
      if (window.__currentLetterId) toggleFavorite(window.__currentLetterId, next);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[m]));
  }

  /* ---------------- 8. HISTORY + FAVORITES + STORAGE ---------------- */
  function loadLetters() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function saveLetters(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch { showToast('Could not save to this device\'s storage.'); }
  }

  function storeLetter(p, letter) {
    const list = loadLetters();
    const entry = {
      id: 'l_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      partnerName: p.partnerName,
      yourName: p.yourName,
      style: p.writingStyle,
      text: `${letter.paragraphs}\n\n${letter.closing}\n\n${letter.signoff}`,
      closing: letter.closing,
      signature: letter.signoff,
      photos: p.photos || [],
      anonymous: p.senderPrivacy === 'anonymous',
      timestamp: Date.now(),
      favorite: false,
    };
    list.unshift(entry);
    saveLetters(list);
    window.__currentLetterId = entry.id;
    renderHistory();
  }

  function toggleFavorite(id, value) {
    const list = loadLetters();
    const item = list.find(l => l.id === id);
    if (item) { item.favorite = value; saveLetters(list); renderHistory(); }
  }

  function deleteLetter(id) {
    const list = loadLetters().filter(l => l.id !== id);
    saveLetters(list);
    renderHistory();
  }

  let activeFilter = 'all';

  function renderHistory() {
    const list = loadLetters();
    const container = $('#historyList');
    const empty = $('#historyEmpty');
    const filtered = activeFilter === 'favorites' ? list.filter(l => l.favorite) : list;

    container.innerHTML = '';
    if (filtered.length === 0) {
      const li = document.createElement('li');
      li.className = 'history-empty';
      li.textContent = activeFilter === 'favorites'
        ? 'No favorites yet — tap the star on a letter to save it here.'
        : 'No letters yet — the ones you generate will be saved here on this device.';
      container.appendChild(li);
      return;
    }

    filtered.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

      li.innerHTML = `
        <div class="history-item-main">
          <div class="history-item-title">${item.favorite ? createIcon('starFilled', 'is-active') : createIcon('heart')}<span>To ${escapeHtml(item.partnerName)}</span></div>
          <div class="history-item-meta">${escapeHtml(styleLabel(item.style))} · ${dateStr} at ${timeStr}</div>
        </div>
        <div class="history-item-actions">
          <button class="icon-mini fav-toggle ${item.favorite ? 'is-fav' : ''}" title="Toggle favorite" aria-label="Toggle favorite">${createIcon('starFilled', item.favorite ? 'is-active' : '')}</button>
          <button class="icon-mini view-btn" title="View letter" aria-label="View letter">${createIcon('eye')}</button>
          <button class="icon-mini delete-btn" title="Delete letter" aria-label="Delete letter">${createIcon('trash')}</button>
        </div>`;

      li.querySelector('.fav-toggle').addEventListener('click', () => toggleFavorite(item.id, !item.favorite));
      li.querySelector('.delete-btn').addEventListener('click', () => { deleteLetter(item.id); showToast('Letter removed.'); });
      li.querySelector('.view-btn').addEventListener('click', () => viewStoredLetter(item));

      container.appendChild(li);
    });
  }

  function styleLabel(key) {
    const map = {
      sweet: 'Sweet', romantic: 'Deeply Romantic', cute: 'Cute', poetic: 'Poetic',
      longdistance: 'Long Distance', anniversary: 'Anniversary', apology: 'Apology', proposal: 'Proposal'
    };
    return map[key] || key;
  }

  async function viewStoredLetter(item) {
    const section = $('#letterOutput');
    const envelope = $('#envelope');
    const textEl = $('#letterText');
    const signoffEl = $('#letterSignoff');
    const [body, ...rest] = item.text.split('\n\n— ');
    showLetterBackdrop();
    document.body.classList.add('letter-open');
    section.hidden = false;
    envelope.classList.add('opened');
    textEl.textContent = body;
    signoffEl.textContent = rest.length ? '— ' + rest.join('\n\n— ') : '';
    applyEnvelopeSize(item.text || '');
    window.__currentLetterId = item.id;
    setCurrentLetterData({ yourName: item.yourName, partnerName: item.partnerName, style: item.style, text: item.text });
    const favBtn = $('#favBtn');
    favBtn.setAttribute('aria-pressed', String(item.favorite));
    favBtn.innerHTML = `${item.favorite ? createIcon('starFilled', 'is-active') : createIcon('star')}<span>${item.favorite ? 'Favorited' : 'Favorite'}</span>`;
  }

  function initHistoryFilters() {
    $$('.history-filters .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.chip').forEach(c => c.classList.remove('is-active'));
        chip.classList.add('is-active');
        activeFilter = chip.dataset.filter;
        renderHistory();
      });
    });
  }

  /* ---------------- 9. TOASTS ---------------- */
  function showToast(message) {
    const region = $('#toastRegion');
    if (!region || !message) return;

    // Avoid a stack of identical notifications when a request is clicked repeatedly.
    const existing = Array.from(region.children).find(t => t.textContent === message);
    if (existing) {
      existing.classList.remove('toast-refresh');
      void existing.offsetWidth;
      existing.classList.add('toast-refresh');
      return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    region.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  }


  /* ---------------- WORKFLOW UPGRADE ---------------- */
  function dataUrlToFileSize(dataUrl) {
    return Math.ceil((dataUrl.length * 3) / 4);
  }

  function readPhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/')) {
        return reject(new Error('Please choose an image file.'));
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 1200;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', .78));
        };
        img.onerror = () => reject(new Error('Unable to read this file. Please choose the file again.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Unable to read this file. Please choose the file again.'));
      reader.readAsDataURL(file);
    });
  }

  function renderPhotoPicker() {
    const container = $('#photoPreview');
    const count = $('#photoCount');
    if (!container) return;
    count.textContent = `${selectedPhotos.length}/3`;
    container.innerHTML = '';
    selectedPhotos.forEach((photo,i) => {
      const div=document.createElement('div'); div.className='photo-thumb';
      div.innerHTML=`<img src="${photo.dataUrl}" alt="Selected photo ${i+1}"><button type="button" class="photo-remove" aria-label="Remove photo ${i+1}">×</button>`;
      div.querySelector('button').addEventListener('click',()=>{
        selectedPhotos.splice(i,1);
        renderPhotoPicker();
        const livePreview = $('#livePreview');
        if (livePreview) livePreview.hidden = true;
      });
      container.appendChild(div);
    });
  }

  function signatureForPreview(data) {
    return getSignature(data);
  }

  function updatePreview(data, letter) {
    const livePreview = $('#livePreview');
    if (livePreview) livePreview.hidden = false;
    const anonymous = data.senderPrivacy === 'anonymous';
    $('#previewRecipient').textContent = `To ${data.partnerName || 'someone special'}`;
    $('#previewText').textContent = letter.paragraphs || '';
    $('#previewClosing').textContent = letter.closing || '';
    $('#previewSignature').textContent = signatureForPreview(data);
    const pc=$('#previewPhotos'); pc.innerHTML='';
    const previewPhotoList = (data.photos||[]).slice(0,3);
    previewPhotoList.forEach((src,i)=>{
      const fig=document.createElement('figure');
      fig.className = 'photo-collage-item' + (previewPhotoList.length === 3 && i === 1 ? ' is-center' : '');
      fig.innerHTML=`<img src="${src}" alt="Preview memory ${i+1}" loading="lazy">`;
      pc.appendChild(fig);
    });
    if (anonymous) $('#previewSignature').textContent='Someone who cares about you ❤️';
  }

  function updatePreviewFromForm() {
    const form=$('#letterFormEl'); if(!form) return;
    const data=collectFormData(form);
    if(!data.partnerName && !data.memory && !data.loveAbout && !data.promise) return;
    try { updatePreview(data, buildLetter(data)); } catch(e) {}
  }

  // Restores the preview panel to its original empty state — used once the
  // user has finished with a generated letter, so step 3 doesn't keep
  // showing a stale letter while they start writing a new one.
  function resetPreview() {
    $('#previewRecipient').textContent = 'To someone special';
    $('#previewText').textContent = 'Your letter preview will appear here after you write something.';
    $('#previewClosing').textContent = '';
    $('#previewSignature').textContent = '';
    const pc = $('#previewPhotos'); if (pc) pc.innerHTML = '';
    const livePreview = $('#livePreview');
    if (livePreview) livePreview.hidden = true;
  }

  let aiRequestInFlight = false;
  // Bumped on every new AI request and on every form reset. A response is
  // only applied if its token still matches — this stops a slow AI reply
  // from overwriting the letter after the user has cleared the form or
  // started a newer AI request in the meantime.
  let aiRequestToken = 0;

  async function requestAiDraft() {
    if (aiRequestInFlight) return;

    if (!checkRunningFromServer()) {
      const status = $('#aiStatus');
      const msg = 'Open this app at http://localhost:3000 (after running "npm start") to use the AI writer.';
      if (status) status.textContent = msg;
      showToast(msg);
      return;
    }

    const prompt = $('#aiPrompt')?.value.trim();
    const status = $('#aiStatus');
    const btn = $('#aiGenerateBtn');
    const resultActions = $('#aiResultActions');

    if (!prompt) {
      if (status) status.textContent = 'Tell me what you want the letter to say first.';
      $('#aiPrompt')?.focus();
      return;
    }

    aiRequestInFlight = true;
    const requestId = ++aiRequestToken;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Writing…';
    }
    if (resultActions) resultActions.hidden = true;
    if (status) status.textContent = 'Writing something heartfelt…';

    try {
      const form = $('#letterFormEl');
      const data = collectFormData(form);

      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          prompt,
          style: selectedAiStyle,
          recipient: data.partnerName,
          relationship: data.relationship,
          context: {
            memory: data.memory,
            loveAbout: data.loveAbout,
            promise: data.promise
          }
        })
      });

      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok) {
        const err = new Error(payload.error || `AI request failed (HTTP ${response.status})`);
        err.code = payload.code || 'AI_REQUEST_FAILED';
        err.status = response.status;
        throw err;
      }

      const draft = String(payload.text || '').trim();
      if (!draft) throw new Error('The AI service returned an empty draft.');

      // A newer AI request (or a form reset) has superseded this one while
      // it was in flight — drop this stale response instead of letting it
      // overwrite whatever the user is looking at now.
      if (requestId !== aiRequestToken) return;

      aiDraft = draft;

      // Connect the AI result to the real letter state immediately —
      // don't just leave it sitting in `aiDraft` waiting for a second
      // click. This is the same path "Replace letter" uses, so Generate
      // Letter, the Preview, and the Envelope all pick it up automatically.
      applyAiDraftToLetter();

      if (resultActions) resultActions.hidden = false;
      if (status) status.textContent = 'Draft ready and added to your letter below. Edit it, then click Generate Letter.';
      showToast('AI draft ready and added to your letter. ❤️');
    } catch (err) {
      if (requestId !== aiRequestToken) return; // superseded — don't surface a stale error either
      console.error('AI writer:', err);
      let message = 'The AI writer could not complete the request.';

      if (err instanceof TypeError) {
        message = 'Cannot reach the local AI server. Make sure npm start is still running and open the site at http://localhost:3000.';
      } else if (err.code === 'AI_NOT_CONFIGURED') {
        message = 'AI is not configured. Add GROQ_API_KEY to .env and restart npm start.';
      } else if (err.code === 'AI_AUTH_ERROR') {
        message = 'Your Groq API key was rejected. Check GROQ_API_KEY in .env and restart npm start.';
      } else if (err.code === 'AI_RATE_LIMIT') {
        message = 'The AI account is temporarily unavailable or has reached its usage limit.';
      } else if (err.code === 'AI_PROVIDER_ERROR') {
        message = err.message;
      } else if (err.message) {
        message = err.message;
      }

      if (status) status.textContent = message;
      showToast(message);
    } finally {
      aiRequestInFlight = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Generate with AI';
      }
    }
  }

  // Puts the current AI draft into the main Letter field (#memory) and
  // marks the app as being in AI full-letter mode. Shared by the automatic
  // insert-on-generate flow and the manual "Replace letter" button so
  // there's exactly one code path that connects an AI draft to the real
  // letter state.
  function applyAiDraftToLetter() {
    if (!aiDraft) return;
    $('#memory').value = aiDraft;
    $('#loveAbout').value = '';
    $('#promise').value = '';
    // The AI draft now IS the letter — Generate Letter must use it
    // verbatim (see buildLetter()) rather than treating it as a template
    // ingredient.
    aiFullLetterActive = true;
    $('#memory').dispatchEvent(new Event('input', { bubbles: true }));
  }

  function replaceWithAi() {
    if(!aiDraft) return;
    applyAiDraftToLetter();
    showToast('AI draft inserted. Edit it before generating.');
  }

  function insertAiDraft() {
    if(!aiDraft) return;
    const field=$('#memory');
    const current = field.value.trim();
    // "Generate with AI" already auto-applies the draft into #memory, so if
    // the field already IS this exact draft, appending it again would just
    // duplicate the same paragraph. Only append when there's something
    // genuinely different to combine it with (the user's own notes, or a
    // newer regenerated draft).
    if (current === aiDraft.trim()) {
      showToast('That AI draft is already in your letter.');
      return;
    }
    field.value = current ? `${current}\n\n${aiDraft}` : aiDraft;
    // The letter now contains AI-authored prose, not just template
    // ingredients — use it verbatim, same as "Replace letter".
    aiFullLetterActive = true;
    field.dispatchEvent(new Event('input',{bubbles:true}));
    showToast('AI draft inserted into your letter.');
  }

  async function checkAiServer() {
    const status = $('#aiStatus');
    if (!status) return;
    try {
      const res = await fetch('/api/health', { headers: { 'Accept': 'application/json' } });
      const data = await res.json();
      if (data.aiConfigured === false) {
        status.textContent = 'AI is not configured yet. Add GROQ_API_KEY to .env and restart npm start.';
      }
    } catch {
      status.textContent = 'AI server is not reachable. Keep npm start running and open this site at http://localhost:3000.';
    }
  }

  function initUpgradeFeatures() {
    const photoInput=$('#photoInput');
    photoInput?.addEventListener('change',async e=>{
      const files=Array.from(e.target.files||[]);
      const remaining=3-selectedPhotos.length;
      for(const file of files.slice(0,remaining)) {
        try { selectedPhotos.push({dataUrl:await readPhoto(file)}); } catch (err) { showToast(err?.message || 'Unable to read this file. Please choose the file again.'); }
      }
      if(files.length>remaining) showToast('You can add up to 3 photos.');
      e.target.value=''; renderPhotoPicker();
    });
    $$('.ai-style').forEach(btn=>btn.addEventListener('click',()=>{ $$('.ai-style').forEach(b=>b.classList.remove('is-active'));btn.classList.add('is-active');selectedAiStyle=btn.dataset.aiStyle; }));
    $('#aiGenerateBtn')?.addEventListener('click',requestAiDraft);
    $('#aiReplaceBtn')?.addEventListener('click',replaceWithAi);
    $('#aiInsertBtn')?.addEventListener('click',insertAiDraft);
    $('#previewGenerateBtn')?.addEventListener('click',()=>{ openAfterGenerate=true; $('#generateBtn')?.click(); });
    checkAiServer();
    // If the person starts filling loveAbout/promise back in after using
    // "Replace letter", they're returning to the template-based flow —
    // drop out of AI full-letter mode so those fields become required
    // again and buildLetter() goes back to the templates.
    $('#loveAbout')?.addEventListener('input', () => { aiFullLetterActive = false; });
    $('#promise')?.addEventListener('input', () => { aiFullLetterActive = false; });
    // NOTE: Live/auto preview updates while typing or toggling fields have been
    // intentionally removed. The Preview section must only update when the
    // "Generate Letter" button is clicked (see the form 'submit' handler in
    // initForm, which calls updatePreview()). Do not re-wire input/change/
    // keyup listeners here to call updatePreview()/updatePreviewFromForm().
  }

  /* ---------------- 10. INIT ---------------- */
  function initForm() {
    const form = $('#letterFormEl');
    const generateBtn = $('#generateBtn');
    const spinner = $('.btn-spinner', generateBtn);
    const label = $('.btn-label', generateBtn);

    wireLiveValidation(form);

    // Hide preview section while typing/editing
    const handleFormInput = () => {
      const livePreview = $('#livePreview');
      if (livePreview) livePreview.hidden = true;
    };
    form.addEventListener('input', handleFormInput);
    form.addEventListener('change', handleFormInput);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateForm(form)) {
        showToast('A few fields still need your words — please fill them in.');
        const firstInvalid = $('.invalid', form);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const overlay = $('#loadingOverlay');
      overlay.hidden = false;
      spinner.hidden = false;
      label.textContent = 'Sealing…';
      generateBtn.disabled = true;

      try {
        const data = collectFormData(form);
        await wait(650); // brief, honest loading moment — no network call is made

        const letter = buildLetter(data);

        const favBtn = $('#favBtn');
        favBtn.setAttribute('aria-pressed', 'false');
        favBtn.innerHTML = `${createIcon('star')}<span>Favorite</span>`;

        setCurrentLetterData({
          yourName: data.yourName,
          partnerName: data.partnerName,
          style: data.writingStyle,
          body: letter.paragraphs,
          text: `${letter.paragraphs}\n\n${letter.closing}\n\n${letter.signoff}`,
          closing: letter.closing, signature: letter.signoff, photos: data.photos || [], anonymous: data.senderPrivacy === 'anonymous', typewriter: data.typewriter
        });
        updatePreview(data, letter);
        storeLetter(data, letter);

        if (openAfterGenerate) {
          openAfterGenerate = false;
          // The envelope itself is the trigger — show it sealed and wait
          // for a click/tap/Enter/Space before playing the open animation.
          armEnvelopeForClickToOpen(letter, { photos: data.photos || [], typewriter: data.typewriter || false });
        } else {
          document.querySelector('#previewStep')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          showToast('Preview updated. Open the letter when you are ready.');
        }
      } finally {
        // Always runs, even if something above throws — guarantees the
        // loading overlay never gets stuck open and blocking clicks.
        overlay.hidden = true;
        spinner.hidden = true;
        label.textContent = 'Generate Love Letter';
        generateBtn.disabled = false;
      }
    });

    form.addEventListener('reset', () => {
      REQUIRED_FIELDS.forEach(name => {
        form.elements[name].classList.remove('invalid');
        const err = $(`#err-${name}`);
        if (err) err.textContent = '';
      });

      // "Clear form" (a type="reset" button) must also wipe the Preview
      // section so no previously generated letter stays visible.
      selectedPhotos = [];
      renderPhotoPicker();
      resetPreview();

      // ...and, if the Envelope/Letter reading view is currently open
      // (e.g. showing a previously generated AI letter), close and clear
      // it too instead of leaving stale letter text behind.
      const outputSection = $('#letterOutput');
      if (outputSection && !outputSection.hidden) {
        outputSection.hidden = true;
        hideLetterBackdrop();
        $('#letterText') && ($('#letterText').textContent = '');
        $('#letterClosing') && ($('#letterClosing').textContent = '');
        $('#letterSignoff') && ($('#letterSignoff').textContent = '');
        renderLetterPhotos([]);
      }

      // ...and fully clear any AI-generated draft/state so it can't leak
      // into a future "Generate Letter" click.
      aiFullLetterActive = false;
      aiDraft = '';
      aiRequestToken++; // invalidate any AI request still in flight from before the clear
      const aiResultActions = $('#aiResultActions');
      if (aiResultActions) aiResultActions.hidden = true;
      const aiStatus = $('#aiStatus');
      if (aiStatus) aiStatus.textContent = '';

      // Restore textarea sizes after form reset.
      setTimeout(() => {
        const areas = Array.from(form.querySelectorAll('textarea'));
        areas.forEach(resizeTextarea);
      }, 0);
    });
  }

  function initResizeHandlers() {
    window.addEventListener('resize', () => {
      const canvas = $('#confettiCanvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

  // Prevent images and inline SVGs from being draggable (improves UX on touch/desktop)
  function disableAssetDragging() {
    try {
      const setNoDrag = (el) => {
        try {
          el.setAttribute('draggable', 'false');
          el.classList.add('no-drag');
          // Prevent dragstart events explicitly
          el.addEventListener('dragstart', (ev) => ev.preventDefault());
          // If the element or its children are resizable (textarea etc.), disable resizing
          try {
            if (el.tagName === 'TEXTAREA') el.style.resize = 'none';
            const ta = el.querySelectorAll && el.querySelectorAll('textarea');
            if (ta && ta.length) ta.forEach(t => { t.style.resize = 'none'; });
          } catch (e) {}
        } catch (e) {}
      };

      // Apply to images, svgs and chat widget selectors if present
      const selectors = ['img', 'svg', '.chat-box', '#chatBox', '.chat-window'];
      selectors.forEach(sel => document.querySelectorAll(sel).forEach(setNoDrag));

      // Catch future additions (hearts/petals created dynamically or chat widgets)
      const obs = new MutationObserver(mutations => {
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            if (!n) continue;
            if (n.nodeType === Node.ELEMENT_NODE) {
              selectors.forEach(sel => {
                try { n.querySelectorAll && n.querySelectorAll(sel).forEach(setNoDrag); } catch (e) {}
                try { (n.matches && n.matches(sel)) && setNoDrag(n); } catch (e) {}
              });
            }
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* silently fail on older browsers */ }
  }

  /* ---------------- 0. ORIGIN GUARD ----------------
     If this page was opened as a local file (file://) or via a VS Code
     webview/Simple Browser pointed at a raw path instead of the running
     Express server, fetch() calls to /api/* will never reach the backend
     and some editors block the page outright ("...trusted folder...").
     Detect that case up front and tell the user how to fix it, instead of
     letting AI requests fail with a confusing error. */
  function checkRunningFromServer() {
    const bar = $('#originWarning');
    if (location.protocol === 'file:') {
      const port = 3000;
      const msg = `This page was opened directly as a file, so the AI writer and other server features can't work. Run "npm start" in the project folder, then open http://localhost:${port} in your browser.`;
      if (bar) {
        bar.textContent = msg;
        bar.hidden = false;
      } else {
        showToast(msg);
      }
      return false;
    }
    return true;
  }

  document.addEventListener('DOMContentLoaded', () => {
    checkRunningFromServer();
    const favBtn = $('#favBtn');
    if (favBtn) favBtn.innerHTML = `${createIcon('star')}<span>Favorite</span>`;

spawnHearts();
    spawnPetals();
    initThemeMode();
    // Ensure images/SVGs are not draggable for a smoother UX
    disableAssetDragging();
    initForm();
    initUpgradeFeatures();
    initLetterActions();
    initShareModal();
    initHistoryFilters();
    renderHistory();
    initResizeHandlers();
    // initialize auto-resizing textareas so they grow with content
    try { initAutoResize(); } catch (e) {}
    initSharedLinkBootstrap();
  });
})();

  function resizeTextarea(el) {
    if (!(el instanceof HTMLTextAreaElement)) return;
    el.style.height = 'auto';
    if (!el.value) {
      el.style.height = '';
      return;
    }
    el.style.height = `${el.scrollHeight + 2}px`;
  }

  function initAutoResize() {
    try {
      const areas = Array.from(document.querySelectorAll('textarea'));
      areas.forEach(el => {
        const resizeAnimated = () => {
          const current = el.clientHeight;
          resizeTextarea(el);
          const target = el.clientHeight;
          if (current === target) return;
          el.style.height = current + 'px';
          // Force reflow so the transition runs
          // eslint-disable-next-line no-unused-expressions
          el.offsetHeight;
          el.style.height = target + 'px';
        };

        // Initialize without animation (prevent jump on load)
        const prevTransition = el.style.transition;
        el.style.transition = 'none';
        resizeTextarea(el);
        // Force reflow then restore transition
        // eslint-disable-next-line no-unused-expressions
        el.offsetHeight;
        el.style.transition = prevTransition || '';

        el.addEventListener('input', resizeAnimated);
        el.addEventListener('change', resizeAnimated);
        el.addEventListener('paste', () => setTimeout(resizeAnimated, 50));
      });
    } catch (e) { /* ignore in older browsers */ }
  }