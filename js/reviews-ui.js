/* Review cards (written and/or voice/video) shared by the home page and case studies.
   A review with a "video" field gets a custom voice-message player. */
(function () {
  'use strict';
  const { t, tx, esc, icon } = window.App;
  const PROJECTS = window.PROJECTS || [];

  const initials = (name) => String(name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  };

  // Deterministic waveform so the same review always draws the same bars.
  function waveBars(key, n) {
    let seed = [...String(key)].reduce((a, c) => a + c.charCodeAt(0), 7);
    const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    return Array.from({ length: n }, (_, i) => {
      const env = Math.sin((i / (n - 1)) * Math.PI) * 0.6 + 0.4;
      const h = Math.max(0.16, Math.min(1, env * (0.35 + rnd() * 0.75)));
      return `<i style="height:${Math.round(h * 100)}%"></i>`;
    }).join('');
  }

  const QUOTE = '<svg class="review__mark" viewBox="0 0 48 36" aria-hidden="true"><path d="M0 36V22C0 9.5 6.4 2.2 19 0l2 5.4C14 7.4 10.8 11.2 10.6 17H20v19H0zm28 0V22C28 9.5 34.4 2.2 47 0l1 5.4C42 7.4 38.8 11.2 38.6 17H48v19H28z"/></svg>';

  function player(r) {
    const name = tx(r.name);
    return `
      <div class="voice" data-voice>
        <figure class="voice__proof">
          <div class="voice__media">
            <video src="${esc(r.video)}"${r.poster ? ` poster="${esc(r.poster)}"` : ''} preload="metadata" playsinline webkit-playsinline aria-label="${esc(t('reviews.voiceLabel'))} — ${esc(name)}"></video>
          </div>
          <figcaption>${esc(t('reviews.proof'))}</figcaption>
        </figure>
        <div class="voice__bar">
          <button class="voice__btn" type="button" data-voice-toggle aria-label="${esc(t('reviews.play'))}">${icon('play', 'voice__ic-play')}${icon('pause', 'voice__ic-pause')}</button>
          <div class="voice__wave" data-voice-seek role="slider" tabindex="0" aria-label="${esc(t('reviews.seek'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${waveBars(r.video, 56)}</div>
          <span class="voice__time" dir="ltr"><span data-voice-cur>0:00</span><span class="voice__sep">/</span><span data-voice-dur>${esc(r.duration || '0:00')}</span></span>
        </div>
      </div>`;
  }

  // opts.caseLink: show the "Case study" link (off on the case study page itself).
  function card(r, opts) {
    const o = Object.assign({ caseLink: true, delay: 0 }, opts);
    const p = PROJECTS.find((x) => x.slug === r.project);
    const name = tx(r.name);
    const text = tx(r.text);
    // Voice reviews: the client's own words, transcribed from the recording.
    const quote = tx(r.quote);
    const transcript = tx(r.transcript);
    const translated = transcript && window.App.lang() === 'en';
    const avatar = r.photo ? `<img src="${esc(r.photo)}" alt="" loading="lazy" onerror="this.remove()">` : '';
    const links = p ? [
      p.url && `<a class="pill-link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(t('work.live'))}${icon('arrowUpRight')}</a>`,
      o.caseLink && `<a class="pill-link" href="project.html?p=${encodeURIComponent(p.slug)}">${esc(t('reviews.caseStudy'))}${icon('arrow')}</a>`
    ].filter(Boolean).join('') : '';

    return `
      <figure class="review${r.video ? ' review--voice' : ' spot'} reveal" style="--d:${o.delay}s">
        ${r.video
          ? `<div class="review__top">
               <span class="voice-badge"><span class="voice-badge__dot" aria-hidden="true"></span>${icon('mic')}<span>${esc(t('reviews.voiceLabel'))}</span></span>
               <span class="voice-hint">${icon('volume')}<span>${esc(t('reviews.soundOn'))}</span></span>
             </div>`
          : QUOTE}
        ${text ? `<blockquote>${esc(text)}</blockquote>` : ''}
        ${quote ? `<blockquote class="review__quote">${esc(quote)}</blockquote>` : ''}
        ${r.video ? player(r) : ''}
        ${transcript ? `<details class="transcript">
          <summary class="pill-link"><span class="transcript__open">${esc(t('reviews.readTranscript'))}</span><span class="transcript__close">${esc(t('reviews.hideTranscript'))}</span></summary>
          <p>${esc(transcript)}</p>
          ${translated ? `<small>${esc(t('reviews.translated'))}</small>` : ''}
        </details>` : ''}
        <figcaption>
          <span class="avatar"><span>${esc(initials(name))}</span>${avatar}</span>
          <span class="review__who"><b>${esc(name)}</b><small>${esc(tx(r.role))}</small></span>
          ${links ? `<span class="review__links">${links}</span>` : ''}
        </figcaption>
      </figure>`;
  }

  /* ---------- Player behavior (event delegation, works after re-renders) ---------- */
  const boxOf = (el) => el && el.closest && el.closest('[data-voice]');

  function sync(box) {
    const v = box.querySelector('video');
    // Fit the frame to the video's real shape (wide screen recording or vertical phone video).
    if (v.videoWidth && !box.dataset.sized) {
      box.dataset.sized = '1';
      const media = box.querySelector('.voice__media');
      media.style.aspectRatio = v.videoWidth + ' / ' + v.videoHeight;
      if (v.videoHeight > v.videoWidth) media.classList.add('is-tall');
    }
    const d = v.duration;
    const frac = d ? v.currentTime / d : 0;
    box.classList.toggle('is-playing', !v.paused && !v.ended);
    box.classList.toggle('has-started', v.currentTime > 0 || !v.paused);
    const cur = box.querySelector('[data-voice-cur]');
    const dur = box.querySelector('[data-voice-dur]');
    if (cur) cur.textContent = fmt(v.currentTime);
    if (dur && isFinite(d)) dur.textContent = fmt(d);
    const bars = box.querySelectorAll('.voice__wave i');
    const played = Math.round(frac * bars.length);
    bars.forEach((b, i) => b.classList.toggle('is-played', i < played));
    const wave = box.querySelector('[data-voice-seek]');
    if (wave) wave.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
    const label = t(v.paused ? 'reviews.play' : 'reviews.pause');
    box.querySelectorAll('[data-voice-toggle]').forEach((b) => b.setAttribute('aria-label', label));
  }

  function toggle(box) {
    const v = box.querySelector('video');
    if (v.paused || v.ended) {
      document.querySelectorAll('[data-voice] video').forEach((o) => { if (o !== v) o.pause(); });
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      v.pause();
    }
  }

  function seekTo(box, clientX) {
    const v = box.querySelector('video');
    const wave = box.querySelector('[data-voice-seek]');
    const r = wave.getBoundingClientRect();
    const rtl = getComputedStyle(wave).direction === 'rtl';
    let frac = (clientX - r.left) / r.width;
    if (rtl) frac = 1 - frac;
    frac = Math.min(1, Math.max(0, frac));
    if (isFinite(v.duration)) { v.currentTime = frac * v.duration; sync(box); }
  }

  document.addEventListener('click', (e) => {
    const box = boxOf(e.target);
    if (!box) return;
    if (e.target.closest('[data-voice-toggle]') || e.target.tagName === 'VIDEO') toggle(box);
    else if (e.target.closest('[data-voice-seek]')) seekTo(box, e.clientX);
  });

  document.addEventListener('keydown', (e) => {
    const wave = e.target.closest && e.target.closest('[data-voice-seek]');
    if (!wave) return;
    const box = boxOf(wave);
    const v = box.querySelector('video');
    const rtl = getComputedStyle(wave).direction === 'rtl';
    const step = { ArrowRight: rtl ? -5 : 5, ArrowLeft: rtl ? 5 : -5 }[e.key];
    if (step && isFinite(v.duration)) {
      e.preventDefault();
      v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + step));
      sync(box);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggle(box);
    }
  });

  // Media events don't bubble, but they do pass through the capture phase.
  ['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata', 'seeked'].forEach((type) => {
    document.addEventListener(type, (e) => { const box = boxOf(e.target); if (box) sync(box); }, true);
  });

  window.ReviewsUI = { card };
})();
