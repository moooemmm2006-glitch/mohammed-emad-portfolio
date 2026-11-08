/* "Try a website for your business" page: live sample demos + free demo request.
   Text: js/i18n.js ("try"). The demos and /api/request are served by Demo Studio
   through the rewrites in vercel.json (same domain). */
(function () {
  'use strict';
  const { t, esc, icon, waLink } = window.App;
  const mount = document.getElementById('try-page');
  const setMeta = (sel, val) => { const m = document.querySelector(sel); if (m) m.setAttribute('content', val); };
  let state = { sent: false, busy: false, error: '' };
  const values = {};

  function phoneOk(v) {
    const d = String(v || '').replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[^\d+]/g, '').replace(/^(\+|00)?20/, '0');
    return /^01[0125]\d{8}$/.test(d);
  }

  function formHTML() {
    if (state.sent) {
      return `<div class="try-thanks" role="status">
        <span class="try-thanks__icon">${icon('checkCircle')}</span>
        <h3>${esc(t('try.thanks'))}</h3>
        <p>${esc(t('try.thanksLead'))}</p>
        <div class="try-thanks__btns">
          <a class="btn btn--primary" data-wa>${icon('whatsapp')}<span>${esc(t('contact.whatsapp'))}</span></a>
          <button class="btn btn--ghost" type="button" data-again>${esc(t('try.again'))}</button>
        </div>
      </div>`;
    }
    const n = t('try.niches');
    const v = (k) => esc(values[k] || '');
    return `<form class="try-form" novalidate>
      <div class="try-field"><label for="tf-name">${esc(t('try.fName'))} *</label><input id="tf-name" name="name" required maxlength="80" autocomplete="organization" value="${v('name')}"></div>
      <div class="try-field"><label for="tf-niche">${esc(t('try.fNiche'))} *</label>
        <select id="tf-niche" name="niche" required>
          <option value="" disabled ${values.niche ? '' : 'selected'}>${esc(t('try.choose'))}</option>
          ${Object.keys(n).map((k) => `<option value="${k}" ${values.niche === k ? 'selected' : ''}>${esc(n[k])}</option>`).join('')}
        </select></div>
      <div class="try-row">
        <div class="try-field"><label for="tf-phone">${esc(t('try.fPhone'))} *</label><input id="tf-phone" name="phone" type="tel" inputmode="tel" dir="ltr" required maxlength="20" autocomplete="tel" placeholder="01xxxxxxxxx" value="${v('phone')}"></div>
        <div class="try-field"><label for="tf-area">${esc(t('try.fArea'))}</label><input id="tf-area" name="area" maxlength="80" value="${v('area')}"></div>
      </div>
      <div class="try-field"><label for="tf-notes">${esc(t('try.fNotes'))}</label><textarea id="tf-notes" name="notes" rows="3" maxlength="600" placeholder="${esc(t('try.notesPh'))}">${v('notes')}</textarea></div>
      <div class="try-hp" aria-hidden="true"><label for="tf-website">Website</label><input id="tf-website" name="website" tabindex="-1" autocomplete="off"></div>
      ${state.error ? `<p class="try-error" role="alert">${esc(state.error)}</p>` : ''}
      <button class="btn btn--primary btn--lg btn--block" type="submit" ${state.busy ? 'disabled' : ''}>${icon('sparkles')}<span>${esc(state.busy ? t('try.sending') : t('try.send'))}</span></button>
      <p class="try-privacy">${esc(t('try.privacy'))}</p>
    </form>`;
  }

  function render() {
    document.title = t('try.metaTitle');
    setMeta('meta[name="description"]', t('try.metaDescription'));
    mount.innerHTML = `
      <section class="case-hero consult-hero">
        <div class="hero__bg" aria-hidden="true"><div class="hero__grid"></div><div class="hero__glow"></div></div>
        <div class="container consult-hero__inner">
          <p class="eyebrow reveal">${esc(t('try.eyebrow'))}</p>
          <h1 class="consult-hero__title reveal" style="--d:.06s">${t('try.title')}</h1>
          <p class="hero__lead reveal" style="--d:.12s">${esc(t('try.lead'))}</p>
          <div class="hero__ctas reveal" style="--d:.18s"><a class="btn btn--primary btn--lg" href="#request">${icon('sparkles')}<span>${esc(t('try.cta'))}</span></a></div>
          <ul class="chips chips--center reveal" style="--d:.24s">${t('try.chips').map((c) => `<li>${icon('check')}<span>${esc(c)}</span></li>`).join('')}</ul>
        </div>
      </section>

      <section class="section section--tight-top" id="samples">
        <div class="container">
          <header class="section-head section-head--center reveal">
            <h2 class="h2">${esc(t('try.showTitle'))}</h2>
            <p class="lead">${esc(t('try.showLead'))}</p>
          </header>
          <div class="try-phones">
            ${t('try.samples').map((s, i) => `
              <a class="try-phone spot reveal" style="--d:${i * 0.08}s" href="/demo/${esc(s.slug)}" target="_blank" rel="noopener">
                <span class="try-phone__frame">
                  <img src="/api/mockup/${esc(s.slug)}?w=540" alt="${esc(s.t)}" width="540" height="675" loading="lazy" decoding="async">
                </span>
                <span class="try-phone__meta">
                  <strong>${esc(s.t)}</strong>
                  <span>${esc(s.d)}</span>
                  <span class="try-phone__open">${esc(t('try.open'))} ${icon('arrowUpRight')}</span>
                </span>
              </a>`).join('')}
          </div>
        </div>
      </section>

      <section class="section section--tight-top" id="request">
        <div class="container try-request">
          <div class="try-request__intro reveal">
            <p class="eyebrow">${esc(t('try.eyebrow'))}</p>
            <h2 class="h2">${esc(t('try.formTitle'))}</h2>
            <p class="lead">${esc(t('try.formLead'))}</p>
          </div>
          <div class="try-card reveal" style="--d:.08s" id="try-form-box">${formHTML()}</div>
        </div>
      </section>`;
    bindForm();
  }

  function redrawForm() {
    const box = document.getElementById('try-form-box');
    box.innerHTML = formHTML();
    bindForm();
    window.App.reveal();
    box.querySelectorAll('[data-wa]').forEach((a) => { a.href = waLink(); a.target = '_blank'; a.rel = 'noopener'; });
  }

  function bindForm() {
    const again = mount.querySelector('[data-again]');
    if (again) again.addEventListener('click', () => { state = { sent: false, busy: false, error: '' }; Object.keys(values).forEach((k) => delete values[k]); redrawForm(); });
    const form = mount.querySelector('.try-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      ['name', 'niche', 'phone', 'area', 'notes'].forEach((k) => { values[k] = String(fd.get(k) || '').trim(); });
      if (!values.name) { state.error = t('try.errName'); return redrawForm(); }
      if (!values.niche) { state.error = t('try.fNiche') + ' *'; return redrawForm(); }
      if (!phoneOk(values.phone)) { state.error = t('try.errPhone'); return redrawForm(); }
      state = { sent: false, busy: true, error: '' }; redrawForm();
      try {
        const res = await fetch('/api/request', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...values, website: String(fd.get('website') || '') })
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || t('try.errGeneric'));
        state = { sent: true, busy: false, error: '' };
      } catch (err) {
        state = { sent: false, busy: false, error: (err && err.message) || t('try.errGeneric') };
      }
      redrawForm();
    });
  }

  window.App.onLang(render);
  window.App.start();
})();
