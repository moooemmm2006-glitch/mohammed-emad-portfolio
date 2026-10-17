/* Automation building blocks shared by the home page and automation.html.
   All text comes from js/i18n.js ("auto"). */
(function () {
  'use strict';
  const { t, esc, icon } = window.App;

  // 3-step "how it works" visual with animated connectors.
  function flow() {
    const steps = t('auto.flow');
    return `<div class="flow">${steps.map((s, i) => `
      <div class="flow__step reveal" style="--d:${i * 0.12}s">
        <span class="flow__icon">${icon(s.icon)}</span>
        <span class="flow__num">${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(s.t)}</h3>
        <p>${esc(s.d)}</p>
      </div>${i < steps.length - 1 ? `
      <div class="flow__link" aria-hidden="true"><span class="flow__pulse"></span>${icon('arrow')}</div>` : ''}`).join('')}
    </div>`;
  }

  // Before → after cards, plus an invitation card that opens WhatsApp.
  function cards() {
    const items = t('auto.items').map((c, i) => `
      <article class="auto-card spot reveal" style="--d:${(i % 4) * 0.06}s">
        <span class="auto-card__icon">${icon(c.icon)}</span>
        <h3>${esc(c.t)}</h3>
        <div class="auto-card__ba">
          <p class="auto-card__before"><span class="auto-card__tag">${esc(t('auto.before'))}</span>${esc(c.b)}</p>
          <span class="auto-card__arrow" aria-hidden="true">${icon('arrowDown')}</span>
          <p class="auto-card__after"><span class="auto-card__tag">${esc(t('auto.after'))}</span>${esc(c.a)}</p>
        </div>
      </article>`).join('');
    const ask = `
      <a class="auto-card auto-card--ask spot reveal" style="--d:.18s" data-wa="consult">
        <span class="auto-card__icon">${icon('bulb')}</span>
        <h3>${esc(t('auto.askTitle'))}</h3>
        <p class="auto-card__ask">${esc(t('auto.askText'))}</p>
        <span class="auto-card__cta">${icon('calendar')}${esc(t('consult.cta'))}${icon('arrow')}</span>
      </a>`;
    return items + ask;
  }

  window.AutoUI = { flow, cards };
})();
