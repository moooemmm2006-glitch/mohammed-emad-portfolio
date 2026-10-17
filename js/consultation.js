/* Free consultation page: all text comes from js/i18n.js ("consult"). */
(function () {
  'use strict';
  const { t, esc, icon, contactLinesHTML } = window.App;
  const mount = document.getElementById('consult-page');
  const setMeta = (sel, val) => { const m = document.querySelector(sel); if (m) m.setAttribute('content', val); };

  function render() {
    const P = t('consult.page');
    document.title = P.metaTitle;
    setMeta('meta[name="description"]', P.metaDescription);

    const bookBtn = (size) => `<a class="btn btn--primary ${size}" data-wa="consult">${icon('calendar')}<span>${esc(t('consult.cta'))}</span></a>`;

    mount.innerHTML = `
      <section class="case-hero consult-hero">
        <div class="hero__bg" aria-hidden="true"><div class="hero__grid"></div><div class="hero__glow"></div></div>
        <div class="container consult-hero__inner">
          <p class="eyebrow reveal">${esc(t('consult.eyebrow'))}</p>
          <h1 class="consult-hero__title reveal" style="--d:.06s">${P.title}</h1>
          <p class="hero__lead reveal" style="--d:.12s">${esc(P.lead)}</p>
          <div class="hero__ctas reveal" style="--d:.18s">${bookBtn('btn--lg')}</div>
          <ul class="chips chips--center reveal" style="--d:.24s">${t('consult.chips').map((c) => `<li>${icon('check')}<span>${esc(c)}</span></li>`).join('')}</ul>
          <p class="consult__tasks consult__tasks--center reveal" style="--d:.3s">${icon('bulb')}<span>${esc(t('consult.tasks'))}</span></p>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <header class="section-head reveal"><h2 class="h2">${esc(P.coverTitle)}</h2></header>
          <div class="why-grid why-grid--3">
            ${t('consult.points').map((p, i) => `
              <article class="why-card spot reveal" style="--d:${i * 0.06}s">
                <span class="why-card__icon">${icon(p.icon)}</span>
                <h3>${esc(p.t)}</h3>
                <p>${esc(p.d)}</p>
              </article>`).join('')}
          </div>
        </div>
      </section>

      <section class="section section--light">
        <div class="container">
          <header class="section-head reveal"><h2 class="h2">${esc(P.stepsTitle)}</h2></header>
          <ol class="steps steps--3">
            ${P.steps.map((s, i) => `
              <li class="step reveal" style="--d:${i * 0.06}s">
                <span class="step__num">${String(i + 1).padStart(2, '0')}</span>
                <h3>${esc(s.t)}</h3>
                <p>${esc(s.d)}</p>
              </li>`).join('')}
          </ol>
        </div>
      </section>

      <section class="section">
        <div class="container consult-detail">
          <div class="reveal">
            <h2 class="h2 consult-detail__title">${esc(P.leaveTitle)}</h2>
            <ul class="built-list">${P.leave.map((l) => `<li>${icon('check')}<span>${esc(l)}</span></li>`).join('')}</ul>
          </div>
          <div class="reveal" style="--d:.08s">
            <h2 class="h2 consult-detail__title">${esc(P.faqTitle)}</h2>
            <div class="faq">
              ${P.faq.map((f, i) => `
                <details class="faq__item"${i === 0 ? ' open' : ''}>
                  <summary><span>${esc(f.q)}</span>${icon('plus')}</summary>
                  <p>${esc(f.a)}</p>
                </details>`).join('')}
            </div>
          </div>
        </div>
      </section>

      <section class="section section--tight-top">
        <div class="container">
          <div class="contact contact--compact reveal">
            <div class="contact__glow" aria-hidden="true"></div>
            <h2 class="contact__title">${esc(P.ctaTitle)}</h2>
            <p class="contact__lead">${esc(P.ctaLead)}</p>
            ${bookBtn('btn--xl')}
            <div class="contact__lines">${contactLinesHTML('contact-line')}</div>
          </div>
        </div>
      </section>`;
  }

  window.App.onLang(render);
  window.App.start();
})();
