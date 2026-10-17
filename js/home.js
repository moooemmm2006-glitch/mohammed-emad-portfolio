/* Landing page: renders projects, services, process, reviews and contact from the data files. */
(function () {
  'use strict';
  const { t, tx, esc, icon, shot, SITE } = window.App;
  const PROJECTS = window.PROJECTS || [];
  const REVIEWS = window.REVIEWS || [];
  const $ = (id) => document.getElementById(id);

  const caseUrl = (slug) => 'project.html?p=' + encodeURIComponent(slug);

  function renderPillars() {
    $('pillars').innerHTML = t('hero.pillars').map((p) => `
      <li class="pillar"><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></li>`).join('');
  }

  function renderWork() {
    $('work-grid').innerHTML = PROJECTS.map((p, i) => {
      const name = tx(p.name);
      return `
      <article class="work-card reveal" style="--d:${(i % 2) * 0.08}s">
        <a class="work-card__link" href="${caseUrl(p.slug)}" aria-label="${esc(name)} — ${esc(t('work.view'))}"></a>
        ${shot({ src: p.cover, url: p.url, color: p.color, label: name, alt: name, cls: 'work-card__shot' })}
        <div class="work-card__meta">
          <div class="work-card__text">
            <h3 class="work-card__name">${esc(name)}</h3>
            <p class="work-card__type">${esc(tx(p.type))}</p>
          </div>
          <div class="work-card__actions">
            ${p.url ? `<a class="btn btn--primary btn--sm live-btn" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(t('work.live'))}${icon('arrowUpRight')}</a>` : ''}
            <span class="circle-btn" aria-hidden="true">${icon('arrow')}</span>
          </div>
        </div>
        <p class="work-card__summary">${esc(tx(p.summary))}</p>
      </article>`;
    }).join('');
  }

  function renderServices() {
    const items = t('services.items').map((s, i) => `
      <article class="service spot reveal" style="--d:${(i % 3) * 0.06}s">
        <span class="service__icon">${icon(s.icon)}</span>
        <h3>${esc(s.t)}</h3>
        <p>${esc(s.d)}</p>
      </article>`).join('');
    const b = t('services.bundle');
    const bundle = `
      <article class="bundle spot reveal">
        <div class="bundle__main">
          <span class="bundle__badge">${icon('star')}${esc(b.badge)}</span>
          <span class="bundle__icons" aria-hidden="true">${icon('building')}<i>+</i>${icon('bolt')}</span>
          <h3>${esc(b.t)}</h3>
          <p>${esc(b.d)}</p>
        </div>
        <div class="bundle__side">
          <ul class="bundle__points">${b.points.map((p) => `<li>${icon('check')}<span>${esc(p)}</span></li>`).join('')}</ul>
          <a class="btn btn--primary btn--lg" data-wa data-wa-message="${esc(b.wa)}">${icon('whatsapp')}<span>${esc(b.cta)}</span></a>
        </div>
      </article>`;
    const ask = `
      <a class="service service--ask spot reveal" style="--d:.12s" data-wa>
        <span class="service__icon">${icon('whatsapp')}</span>
        <h3>${esc(t('services.askTitle'))}</h3>
        <p>${esc(t('services.askText'))}</p>
        <span class="service__cta">${esc(t('services.askCta'))}${icon('arrow')}</span>
      </a>`;
    $('services-grid').innerHTML = items + bundle + ask;
  }

  function renderAuto() {
    $('auto-flow').innerHTML = window.AutoUI.flow();
    $('auto-grid').innerHTML = window.AutoUI.cards();
  }

  function renderProcess() {
    $('process-steps').innerHTML = t('process.steps').map((s, i) => `
      <li class="step reveal" style="--d:${i * 0.06}s">
        <span class="step__num">${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(s.t)}</h3>
        <p>${esc(s.d)}</p>
      </li>`).join('');
  }

  function renderReviews() {
    const section = $('testimonials');
    if (!REVIEWS.length) { section.hidden = true; return; }
    const list = $('reviews-list');
    list.classList.toggle('is-single', REVIEWS.length === 1);
    list.innerHTML = REVIEWS.map((r, i) => window.ReviewsUI.card(r, { delay: (i % 2) * 0.08 })).join('');
  }

  function renderWhy() {
    $('why-grid').innerHTML = t('why.items').map((w, i) => `
      <article class="why-card spot reveal" style="--d:${(i % 3) * 0.06}s">
        <span class="why-card__icon">${icon(w.icon)}</span>
        <h3>${esc(w.t)}</h3>
        <p>${esc(w.d)}</p>
      </article>`).join('');
  }

  function renderConsult() {
    $('consult-chips').innerHTML = t('consult.chips').map((c) => `<li>${icon('check')}<span>${esc(c)}</span></li>`).join('');
    $('consult-points').innerHTML = t('consult.points').map((p, i) => `
      <li class="consult-point">
        <span class="consult-point__icon">${icon(p.icon)}</span>
        <div><span class="consult-point__num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></div>
      </li>`).join('');
  }

  function renderAbout() {
    $('about-portrait').innerHTML = `
      <div class="about__mark">${window.App.MARK}</div>
      <img src="assets/about/me.jpg" alt="${esc(t('brand.name'))}" width="720" height="900" loading="lazy" decoding="async" onload="this.parentNode.classList.add('has-photo')" onerror="this.remove()">
      <figcaption class="about__badge"><b>${esc(t('brand.name'))}</b><span>${esc(t('about.role'))}</span></figcaption>`;
    const yt = SITE.youtube
      ? `<a class="about__yt" href="${esc(SITE.youtube)}" target="_blank" rel="noopener">${icon('youtube')}<span>${esc(t('about.creator'))}</span>${icon('arrowUpRight')}</a>`
      : `<span>${esc(t('about.creator'))}</span>`;
    $('about-roles').innerHTML = `
      <p class="about__role">${esc(t('about.role'))}</p>
      <p class="about__also"><span>${esc(t('about.lecturer'))}</span><i aria-hidden="true"></i>${yt}</p>`;
    $('principles').innerHTML = t('about.principles').map((p) => `
      <li><span class="principles__icon">${icon('check')}</span><div><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p></div></li>`).join('');
  }

  function renderContact() {
    const cards = [];
    if (SITE.whatsapp) {
      cards.push(`
        <a class="contact-card contact-card--wa" data-wa>
          <span class="contact-card__icon">${icon('whatsapp')}</span>
          <span class="contact-card__text"><small>${esc(t('contact.whatsappLabel'))} · ${esc(t('contact.whatsappHint'))}</small><b dir="ltr">${esc(SITE.whatsappDisplay || '+' + SITE.whatsapp)}</b></span>
          <span class="contact-card__go">${icon('arrowUpRight')}</span>
        </a>`);
    }
    if (SITE.email) {
      cards.push(`
        <a class="contact-card" href="mailto:${esc(SITE.email)}">
          <span class="contact-card__icon">${icon('email')}</span>
          <span class="contact-card__text"><small>${esc(t('contact.email'))} · ${esc(t('contact.emailHint'))}</small><b dir="ltr">${esc(SITE.email).replace('@', '@<wbr>')}</b></span>
          <span class="contact-card__go">${icon('arrowUpRight')}</span>
        </a>`);
    }
    $('contact-cards').innerHTML = cards.join('');

    const social = window.App.socials().filter((s) => s.key !== 'whatsapp' && s.key !== 'email');
    const box = $('contact-links');
    box.innerHTML = social.length
      ? `<div class="contact__social"><span>${esc(t('contact.follow'))}</span>${social.map((s) =>
        `<a class="icon-btn" href="${esc(s.href)}" target="_blank" rel="noopener" aria-label="${esc(t('social.' + s.key))}" title="${esc(t('social.' + s.key))}">${icon(s.key)}</a>`).join('')}</div>`
      : '';
    box.hidden = !social.length;
  }

  if (!SITE.available) $('hero-status').hidden = true;

  window.App.onLang(() => {
    renderPillars();
    renderWork();
    renderWhy();
    renderAuto();
    renderServices();
    renderConsult();
    renderProcess();
    renderReviews();
    renderAbout();
    renderContact();
  });
  window.App.start();
})();
