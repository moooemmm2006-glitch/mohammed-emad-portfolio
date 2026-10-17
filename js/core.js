/* Shared runtime: language, header/footer, icons, animations.
   You don't need to edit this file to add projects or reviews. */
(function () {
  'use strict';

  const SITE = window.SITE || {};
  const DICT = window.I18N || {};
  const root = document.documentElement;
  const page = document.body.dataset.page || 'home';
  const listeners = [];

  /* ---------- Language ---------- */
  const lang = () => (root.lang === 'en' ? 'en' : 'ar');

  // Pick the current language from a plain value or an { ar, en } object.
  function tx(v) {
    if (v == null) return '';
    if (typeof v !== 'object' || Array.isArray(v)) return v;
    const l = lang();
    const other = l === 'ar' ? 'en' : 'ar';
    return v[l] != null && v[l] !== '' ? v[l] : (v[other] || '');
  }

  // Look up a dictionary key like "hero.title".
  function t(key) {
    const val = key.split('.').reduce((o, k) => (o == null ? o : o[k]), DICT[lang()]);
    return val == null ? key : val;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function applyI18n(scope) {
    (scope || document).querySelectorAll('[data-i18n]').forEach((el) => {
      el.innerHTML = t(el.dataset.i18n);
    });
    (scope || document).querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':');
        if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
      });
    });
  }

  function setLang(l, opts) {
    l = l === 'en' ? 'en' : 'ar';
    root.lang = l;
    root.dir = l === 'ar' ? 'rtl' : 'ltr';
    try { localStorage.setItem('lang', l); } catch (e) { /* private mode */ }
    if (!opts || !opts.silentUrl) {
      const url = new URL(location.href);
      url.searchParams.set('lang', l);
      history.replaceState(null, '', url);
    }
    refresh();
  }

  function refresh() {
    if (page === 'home') {
      document.title = t('meta.title');
      const d = document.querySelector('meta[name="description"]');
      if (d) d.setAttribute('content', t('meta.description'));
    } else if (page === '404') {
      document.title = '404 — ' + t('brand.name');
    }
    listeners.forEach((fn) => fn(lang()));
    applyI18n();
    updateWhatsAppLinks();
    observeReveals();
  }

  /* ---------- Links ---------- */
  function waLink(message) {
    const msg = message || tx(SITE.whatsappMessage) || '';
    return 'https://wa.me/' + (SITE.whatsapp || '') + (msg ? '?text=' + encodeURIComponent(msg) : '');
  }

  // data-wa opens WhatsApp with the default message, data-wa="consult" with the
  // free-consultation message, and data-wa-message="..." with a custom one.
  function updateWhatsAppLinks() {
    document.querySelectorAll('[data-wa]').forEach((a) => {
      const custom = a.dataset.waMessage || (a.dataset.wa === 'consult' ? tx(SITE.consultMessage) : '');
      a.href = waLink(custom || undefined);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  const mailto = () => (SITE.email ? 'mailto:' + SITE.email : '');

  // WhatsApp + email as clearly labeled links (number / address visible).
  function contactLinesHTML(cls) {
    const rows = [];
    if (SITE.whatsapp) {
      rows.push(`<a class="${cls}" data-wa>${icon('whatsapp')}<span dir="ltr">${esc(SITE.whatsappDisplay || '+' + SITE.whatsapp)}</span></a>`);
    }
    if (SITE.email) {
      rows.push(`<a class="${cls}" href="${esc(mailto())}">${icon('email')}<span dir="ltr">${esc(SITE.email)}</span></a>`);
    }
    return rows.join('');
  }

  function socials() {
    const list = [
      { key: 'whatsapp', href: SITE.whatsapp ? waLink() : '' },
      { key: 'email', href: mailto() },
      { key: 'youtube', href: SITE.youtube },
      { key: 'instagram', href: SITE.instagram },
      { key: 'tiktok', href: SITE.tiktok },
      { key: 'facebook', href: SITE.facebook }
    ];
    return list.filter((s) => s.href);
  }

  function socialLinksHTML(cls) {
    return socials().map((s) => {
      const ext = s.key === 'email' ? '' : ' target="_blank" rel="noopener"';
      return `<a class="${cls}" href="${esc(s.href)}"${ext} aria-label="${esc(t('social.' + s.key))}" title="${esc(t('social.' + s.key))}">${icon(s.key)}</a>`;
    }).join('');
  }

  // A local preview shows helpful "put your image here" hints; the live site never does.
  const isLocal = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  /* ---------- Icons (inline SVG, inherit currentColor) ---------- */
  const ICONS = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUpRight: '<path d="M7 17 17 7M8.5 7H17v8.5"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    whatsapp: '<path d="m3.6 20.4 1.2-4.1a8.6 8.6 0 1 1 3.1 3z"/><path d="M9.3 8.2c.3 0 .5.2.6.5l.6 1.4-.8 1c.5 1 1.3 1.8 2.3 2.3l1-.8 1.4.6c.3.1.5.3.5.6 0 .9-.9 1.6-1.9 1.5-2.6-.3-5-2.7-5.3-5.3-.1-1 .6-1.8 1.6-1.8z"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor"/>',
    tiktok: '<path d="M14 3.5v11.2a3.8 3.8 0 1 1-3.8-3.8"/><path d="M14 3.5c.4 2.7 2.2 4.5 5 4.8"/>',
    facebook: '<path d="M15.5 3.5h-2.2A3.8 3.8 0 0 0 9.5 7.3v13.2M6.5 10.5h8"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10.2 9.2 4.6 2.8-4.6 2.8z" fill="currentColor"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
    key: '<circle cx="8" cy="15.5" r="4"/><path d="m10.9 12.6 8.6-8.6M16.5 7l2.5 2.5M14 9.5l2 2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    chat: '<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" stroke-width="2.2"/>',
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    play: '<path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor" stroke="none"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
    volume: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
    bell: '<path d="M6 9.5a6 6 0 0 1 12 0c0 5.5 2.5 7 2.5 7h-17S6 15 6 9.5z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
    sheet: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>',
    form: '<rect x="4.5" y="3.5" width="15" height="17" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.3 2.4 2.4 4.6-4.9"/>',
    sparkles: '<path d="M11 3.5l1.8 4.7 4.7 1.8-4.7 1.8L11 16.5l-1.8-4.7L4.5 10l4.7-1.8z"/><path d="M18 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    building: '<path d="M4 21V5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5V21M16 9h1.5A2.5 2.5 0 0 1 20 11.5V21M2.5 21h19M8 7.5h4M8 11.5h4M8 15.5h4"/>',
    bag: '<path d="M5 8h14l-1.1 11.2A2 2 0 0 1 15.9 21H8.1a2 2 0 0 1-2-1.8z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    refresh: '<path d="M19.5 11A7.5 7.5 0 0 0 6 6.5L4.5 8M4.5 4v4h4M4.5 13A7.5 7.5 0 0 0 18 17.5l1.5-1.5M19.5 20v-4h-4"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'
  };
  // Directional icons get mirrored in RTL by CSS (.ic--dir).
  const DIRECTIONAL = { arrow: 1, arrowUpRight: 1 };

  function icon(name, extra) {
    const dir = DIRECTIONAL[name] ? ' ic--dir' : '';
    return `<svg class="ic${dir}${extra ? ' ' + extra : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  const MARK_SVG = `<svg class="mark" viewBox="0 0 40 32" aria-hidden="true"><path fill="currentColor" d="M4 28V4h4l8 11 8-11h4v24h-4V11l-8 11-8-11v17zM24 4h12v4H24zM24 24h12v4H24z"/><path class="logo__accent" d="M30 14h5v4h-5z"/></svg>`;
  const LOGO = `<span class="brand">${MARK_SVG}<span class="brand__name" data-i18n="brand.name"></span></span>`;

  const MARK = `<svg class="mark" viewBox="0 0 40 32" aria-hidden="true"><path fill="currentColor" d="M4 28V4h4l8 11 8-11h4v24h-4V11l-8 11-8-11v17zM24 4h12v4H24zM24 24h12v4H24z"/><path class="logo__accent" d="M30 14h5v4h-5z"/></svg>`;

  /* ---------- Browser-frame image with elegant placeholder ---------- */
  function shot(opts) {
    const host = (() => {
      try { return opts.url ? new URL(opts.url).hostname.replace(/^www\./, '') : ''; } catch (e) { return ''; }
    })();
    const file = (opts.src || '').split('/').pop();
    const hint = isLocal && file
      ? `<span class="ph__hint">${icon('spark')}<span class="ph__hint-label">${esc(t('img.missing'))}:</span> <b dir="ltr">${esc(opts.src)}</b><span class="ph__hint-size" dir="ltr">· ${esc(opts.size || '1600×1000')}</span></span>`
      : '';
    const img = opts.src
      ? `<img src="${esc(opts.src)}" alt="${esc(opts.alt || '')}" loading="${opts.eager ? 'eager' : 'lazy'}" decoding="async" onload="this.classList.add('is-loaded')" onerror="this.remove()">`
      : '';
    return `<div class="shot${opts.cls ? ' ' + opts.cls : ''}" style="--tint:${esc(opts.color || '#2E5BFF')}">
      <div class="shot__bar" aria-hidden="true"><i></i><i></i><i></i>${host ? `<span class="shot__url" dir="ltr">${esc(host)}</span>` : ''}</div>
      <div class="shot__view">
        <div class="ph" aria-hidden="true"><span class="ph__name">${esc(opts.label || '')}</span>${hint}</div>
        ${img}
      </div>
    </div>`;
  }

  /* ---------- Header & footer ---------- */
  function href(hash) { return (page === 'home' ? '' : 'index.html') + '#' + hash; }

  function navLinks() {
    // Links to a dedicated page; the rest are sections of the home page.
    const pages = { consult: 'consultation', automation: 'automation' };
    return ['work', 'services', 'automation', 'consult', 'about', 'contact'].map((k) => {
      const url = pages[k] ? pages[k] + '.html' : href(k);
      const current = pages[k] && page === pages[k] ? ' aria-current="page"' : '';
      return `<a href="${url}"${current} data-i18n="nav.${k}"></a>`;
    }).join('');
  }

  function renderHeader() {
    const el = document.getElementById('site-header');
    if (!el) return;
    const links = navLinks();
    el.className = 'nav';
    el.innerHTML = `
      <div class="container nav__inner">
        <a class="nav__logo" href="${page === 'home' ? '#top' : 'index.html'}" data-i18n-attr="aria-label:brand.name">${LOGO}</a>
        <nav class="nav__links" data-i18n-attr="aria-label:nav.primary">${links}</nav>
        <div class="nav__actions">
          <button class="lang-toggle" type="button" data-i18n-attr="aria-label:nav.switchLang;title:nav.switchLang"><span data-i18n="nav.langLabel"></span></button>
          <a class="btn btn--primary btn--sm nav__cta" data-wa="consult">${icon('calendar')}<span data-i18n="consult.cta"></span></a>
          <button class="nav__burger" type="button" aria-expanded="false" aria-controls="mobile-menu" data-i18n-attr="aria-label:nav.menu"><span></span><span></span></button>
        </div>
      </div>
      <div class="mobile-menu" id="mobile-menu">
        <nav class="container mobile-menu__links">${links}</nav>
        <div class="container mobile-menu__foot">
          <a class="btn btn--primary btn--lg btn--block" data-wa="consult">${icon('calendar')}<span data-i18n="consult.cta"></span></a>
          <div class="mobile-menu__contact">${contactLinesHTML('contact-line')}</div>
        </div>
      </div>`;

    el.querySelector('.lang-toggle').addEventListener('click', () => setLang(lang() === 'ar' ? 'en' : 'ar'));

    const burger = el.querySelector('.nav__burger');
    const toggleMenu = (open) => {
      const isOpen = open == null ? !el.classList.contains('is-open') : open;
      el.classList.toggle('is-open', isOpen);
      document.body.classList.toggle('no-scroll', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
    };
    burger.addEventListener('click', () => toggleMenu());
    el.querySelectorAll('.mobile-menu a').forEach((a) => a.addEventListener('click', () => toggleMenu(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });

    const onScroll = () => el.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    el.className = 'footer';
    const draw = () => {
      const links = ['work', 'why', 'services', 'process', 'about']
        .map((k) => `<li><a href="${href(k)}">${esc(t('nav.' + k))}</a></li>`).join('')
        + `<li><a href="automation.html">${esc(t('nav.automation'))}</a></li>`
        + `<li><a href="consultation.html">${esc(t('nav.consult'))}</a></li>`;
      const follow = socials().filter((s) => s.key !== 'whatsapp' && s.key !== 'email');
      el.innerHTML = `
        <div class="container">
          <div class="footer__top">
            <div class="footer__brand">
              <a href="${page === 'home' ? '#top' : 'index.html'}" class="footer__logo" aria-label="${esc(t('brand.name'))}">${LOGO}</a>
              <p>${esc(t('footer.tagline'))}</p>
            </div>
            <div class="footer__cols">
              <div><h4>${esc(t('footer.explore'))}</h4><ul>${links}</ul></div>
              <div>
                <h4>${esc(t('footer.connect'))}</h4>
                <div class="footer__contact">${contactLinesHTML('contact-line')}</div>
                ${follow.length ? `<div class="footer__social">${follow.map((s) =>
                  `<a class="icon-btn" href="${esc(s.href)}" target="_blank" rel="noopener" aria-label="${esc(t('social.' + s.key))}" title="${esc(t('social.' + s.key))}">${icon(s.key)}</a>`).join('')}</div>` : ''}
              </div>
            </div>
          </div>
          <div class="footer__bottom">
            <span>© ${new Date().getFullYear()} ${esc(t('brand.name'))}. ${esc(t('footer.rights'))}</span>
            <a href="#top" class="footer__top-link">${esc(t('footer.top'))} ${icon('arrowUp')}</a>
          </div>
        </div>`;
    };
    const drawAndName = () => { draw(); applyI18n(el); };
    drawAndName();
    listeners.push(drawAndName);
  }

  /* ---------- Scroll reveal ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = !reduceMotion && 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })
    : null;

  function observeReveals() {
    document.querySelectorAll('.reveal:not(.is-in)').forEach((el) => {
      if (io) io.observe(el); else el.classList.add('is-in');
    });
  }

  /* ---------- Cursor spotlight on cards ---------- */
  function spotlight() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.spot');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------- Boot ---------- */
  window.App = {
    SITE, lang, t, tx, esc, icon, shot, waLink, socials, socialLinksHTML, contactLinesHTML, mailto, setLang, isLocal, MARK, LOGO,
    onLang(fn) { listeners.push(fn); },
    reveal: observeReveals,
    start() {
      document.querySelectorAll('[data-icon]').forEach((el) => { el.outerHTML = icon(el.dataset.icon, el.dataset.iconClass); });
      if (!document.getElementById('top')) document.body.id = 'top';
      renderHeader();
      renderFooter();
      spotlight();
      refresh();
      setTimeout(() => root.classList.remove('is-loading'), 30);
    }
  };
})();
