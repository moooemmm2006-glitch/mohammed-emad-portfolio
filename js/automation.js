/* Business automation page: all text comes from js/i18n.js ("auto"). */
(function () {
  'use strict';
  const { t, esc, icon, contactLinesHTML } = window.App;
  const mount = document.getElementById('auto-page');
  const setMeta = (sel, val) => { const m = document.querySelector(sel); if (m) m.setAttribute('content', val); };

  function render() {
    const P = t('auto.page');
    document.title = P.metaTitle;
    setMeta('meta[name="description"]', P.metaDescription);

    const bookBtn = (size) => `<a class="btn btn--primary ${size}" data-wa="consult">${icon('calendar')}<span>${esc(t('consult.cta'))}</span></a>`;

    mount.innerHTML = `
      <section class="case-hero consult-hero auto-hero">
        <div class="hero__bg" aria-hidden="true"><div class="hero__grid"></div><div class="hero__glow"></div></div>
        <div class="container consult-hero__inner">
          <p class="eyebrow reveal">${esc(t('auto.eyebrow'))}</p>
          <h1 class="consult-hero__title reveal" style="--d:.06s">${t('auto.title')}</h1>
          <p class="hero__lead reveal" style="--d:.12s">${esc(P.lead)}</p>
          <div class="hero__ctas reveal" style="--d:.18s">${bookBtn('btn--lg')}</div>
        </div>
      </section>

      <section class="section section--tight-top">
        <div class="container">
          <div class="flow-panel reveal">
            <p class="flow-panel__label">${esc(t('auto.flowTitle'))}</p>
            ${window.AutoUI.flow()}
          </div>
        </div>
      </section>

      <section class="section section--tight-top">
        <div class="container">
          <header class="section-head reveal"><h2 class="h2">${esc(P.examplesTitle)}</h2></header>
          <div class="auto-grid">${window.AutoUI.cards()}</div>
        </div>
      </section>

      <section class="section section--light">
        <div class="container">
          <header class="section-head reveal"><h2 class="h2">${esc(P.benefitsTitle)}</h2></header>
          <ol class="steps steps--3">
            ${P.benefits.map((b, i) => `
              <li class="step reveal" style="--d:${i * 0.06}s">
                <span class="step__num step__num--icon">${icon(b.icon)}</span>
                <h3>${esc(b.t)}</h3>
                <p>${esc(b.d)}</p>
              </li>`).join('')}
          </ol>
        </div>
      </section>

      <section class="section">
        <div class="container auto-faq">
          <h2 class="h2 consult-detail__title reveal">${esc(P.faqTitle)}</h2>
          <div class="faq reveal">
            ${P.faq.map((f, i) => `
              <details class="faq__item"${i === 0 ? ' open' : ''}>
                <summary><span>${esc(f.q)}</span>${icon('plus')}</summary>
                <p>${esc(f.a)}</p>
              </details>`).join('')}
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
