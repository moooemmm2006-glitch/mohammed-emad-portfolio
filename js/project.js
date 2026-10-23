/* Case study page: built automatically from data/projects.js using ?p=<slug>. */
(function () {
  'use strict';
  const { t, tx, esc, icon, shot } = window.App;
  const PROJECTS = window.PROJECTS || [];
  const REVIEWS = window.REVIEWS || [];

  const slug = new URLSearchParams(location.search).get('p');
  const index = PROJECTS.findIndex((p) => p.slug === slug);
  const project = PROJECTS[index];
  const mount = document.getElementById('case');

  const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return url; } };
  const setMeta = (sel, val) => { const m = document.querySelector(sel); if (m) m.setAttribute('content', val); };

  function notFound() {
    document.title = t('notFound.title') + ' — ' + t('brand.name');
    setMeta('meta[name="description"]', t('caseStudy.notFound'));
    mount.innerHTML = `
      <section class="empty">
        <div class="container">
          <p class="eyebrow">404</p>
          <h1 class="h2">${esc(t('caseStudy.notFound'))}</h1>
          <a class="btn btn--ghost btn--lg" href="index.html#work">${icon('arrow', 'ic--back')}<span>${esc(t('caseStudy.back'))}</span></a>
        </div>
      </section>`;
  }

  function render() {
    if (!project) return notFound();
    const p = project;
    const name = tx(p.name);
    const summary = tx(p.summary);
    const built = tx(p.built) || [];
    const shots = p.screenshots || [];
    const reviews = REVIEWS.filter((r) => r.project === p.slug);
    const next = PROJECTS.length > 1 ? PROJECTS[(index + 1) % PROJECTS.length] : null;
    const waMsg = t('caseStudy.waAbout').replace('{name}', name);

    document.title = `${name} — ${t('brand.name')}`;
    setMeta('meta[name="description"]', summary);
    setMeta('meta[property="og:title"]', `${name} — ${t('brand.name')}`);
    setMeta('meta[property="og:description"]', summary);

    const meta = [
      p.type && `<div><dt>${esc(t('caseStudy.type'))}</dt><dd>${esc(tx(p.type))}</dd></div>`,
      p.year && `<div><dt>${esc(t('caseStudy.year'))}</dt><dd>${esc(p.year)}</dd></div>`,
      p.url && `<div><dt>${esc(t('caseStudy.website'))}</dt><dd><a href="${esc(p.url)}" target="_blank" rel="noopener" dir="ltr">${esc(hostOf(p.url))}${icon('arrowUpRight')}</a></dd></div>`
    ].filter(Boolean).join('');

    const row = (title, body) => body ? `
      <div class="case-row reveal">
        <h2 class="case-row__title">${esc(title)}</h2>
        <div class="case-row__body">${body}</div>
      </div>` : '';

    const liveBtn = (cls) => p.url
      ? `<a class="btn btn--primary ${cls} live-btn" href="${esc(p.url)}" target="_blank" rel="noopener"><span>${esc(t('work.live'))}</span>${icon('arrowUpRight')}</a>`
      : '';

    const gallery = shots.length ? `
      <section class="section section--tight-top">
        <div class="container">
          <header class="section-head section-head--row reveal"><p class="eyebrow">${esc(t('caseStudy.gallery'))}</p>${liveBtn('btn--sm')}</header>
          <div class="gallery">
            ${shots.map((src, i) => `<div class="gallery__item reveal" style="--d:${(i % 2) * 0.08}s">${shot({ src, color: p.color, label: name, alt: `${name} — ${i + 1}` })}</div>`).join('')}
          </div>
        </div>
      </section>` : '';

    const mobileBlock = p.mobile ? `
      <section class="section section--tight-top">
        <div class="container">
          <header class="section-head reveal">
            <p class="eyebrow">${esc(t('caseStudy.mobile'))}</p>
            <p class="lead">${esc(t('caseStudy.mobileText'))}</p>
          </header>
          <figure class="mobile-shot reveal">
            <img src="${esc(p.mobile)}" alt="${esc(name)} — ${esc(t('caseStudy.mobile'))}" width="1600" height="1000" loading="lazy" decoding="async" onerror="this.closest('section').remove()">
          </figure>
        </div>
      </section>` : '';

    const reviewBlock = reviews.length ? `
      <section class="section section--tight-top">
        <div class="container">
          <header class="section-head reveal"><p class="eyebrow">${esc(t('caseStudy.review'))}</p></header>
          <div class="reviews is-single">
            ${reviews.map((r) => window.ReviewsUI.card(r, { caseLink: false })).join('')}
          </div>
        </div>
      </section>` : '';

    const nextBlock = next ? `
      <a class="next-card spot reveal" href="project.html?p=${encodeURIComponent(next.slug)}">
        <span class="next-card__label">${esc(t('caseStudy.next'))}</span>
        <span class="next-card__name">${esc(tx(next.name))}</span>
        <span class="next-card__type">${esc(tx(next.type))}</span>
        <span class="circle-btn">${icon('arrow')}</span>
      </a>` : '';

    mount.innerHTML = `
      <section class="case-hero">
        <div class="hero__bg" aria-hidden="true"><div class="hero__grid"></div><div class="hero__glow"></div></div>
        <div class="container">
          <a class="back-link reveal" href="index.html#work">${icon('arrow', 'ic--back')}<span>${esc(t('caseStudy.back'))}</span></a>
          <p class="eyebrow reveal">${esc(tx(p.type))}</p>
          <h1 class="case-title reveal" style="--d:.06s">${esc(name)}</h1>
          <p class="case-lead reveal" style="--d:.12s">${esc(summary)}</p>
          <div class="case-head-row reveal" style="--d:.18s">
            ${meta ? `<dl class="case-meta">${meta}</dl>` : ''}
            <div class="case-ctas">
              ${liveBtn('btn--lg')}
              <a class="btn btn--ghost btn--lg" data-wa data-wa-message="${esc(waMsg)}">${icon('whatsapp')}<span>${esc(t('nav.cta'))}</span></a>
            </div>
          </div>
        </div>
        <div class="container case-cover reveal" style="--d:.24s">
          ${p.url
            ? `<a class="case-cover__link" href="${esc(p.url)}" target="_blank" rel="noopener" aria-label="${esc(t('work.live'))}: ${esc(name)}">
                 ${shot({ src: p.cover, url: p.url, color: p.color, label: name, alt: name, eager: true })}
                 <span class="case-cover__chip">${esc(t('work.live'))}${icon('arrowUpRight')}</span>
               </a>`
            : shot({ src: p.cover, url: p.url, color: p.color, label: name, alt: name, eager: true })}
        </div>
      </section>

      <section class="section case-body">
        <div class="container">
          ${row(t('caseStudy.idea'), tx(p.idea) ? `<p>${esc(tx(p.idea))}</p>` : '')}
          ${row(t('caseStudy.brief'), tx(p.brief) ? `<p>${esc(tx(p.brief))}</p>` : '')}
          ${row(t('caseStudy.built'), built.length ? `<ul class="built-list">${built.map((b) => `<li>${icon('check')}<span>${esc(b)}</span></li>`).join('')}</ul>` : '')}
        </div>
      </section>

      ${gallery}
      ${mobileBlock}
      ${reviewBlock}

      <section class="section section--tight-top">
        <div class="container">
          ${nextBlock}
          <div class="contact contact--compact reveal">
            <div class="contact__glow" aria-hidden="true"></div>
            <h2 class="contact__title">${esc(t('caseStudy.ctaTitle'))}</h2>
            <p class="contact__lead">${esc(t('caseStudy.ctaLead'))}</p>
            <a class="btn btn--primary btn--xl" data-wa data-wa-message="${esc(waMsg)}">${icon('whatsapp')}<span>${esc(t('contact.whatsapp'))}</span></a>
            <div class="contact__lines">${window.App.contactLinesHTML('contact-line')}</div>
            ${window.App.followBlockHTML()}
          </div>
        </div>
      </section>`;
  }

  window.App.onLang(render);
  window.App.start();
})();
