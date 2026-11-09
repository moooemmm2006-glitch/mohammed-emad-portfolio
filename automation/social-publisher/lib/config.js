'use strict';
// Parses and validates accounts.json. Returns Arabic error messages so they
// can be shown on the form directly.

const DEFAULT_SETTINGS = {
  graphApiVersion: 'v27.0',
  keepCloudCopy: false,
  pollTimeoutMinutes: 10,
  igShareToFeed: true,
};

const TIKTOK_PRIVACY = ['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR', 'SELF_ONLY'];
const YOUTUBE_PRIVACY = ['public', 'unlisted', 'private'];
const ENV_NAME = /^[A-Z][A-Z0-9_]*$/;

function parseConfig(input) {
  const errors = [];
  let raw = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input.replace(/^﻿/, '')); // Notepad on Windows may add a BOM
    } catch (e) {
      return { ok: false, errors: ['ملف accounts.json فيه غلطة في الكتابة (JSON مش سليم): ' + e.message], config: null };
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['ملف accounts.json لازم يكون object {…}.'], config: null };
  }

  const s = Object.assign({}, DEFAULT_SETTINGS, raw.settings || {});
  if (!/^v\d+\.\d+$/.test(String(s.graphApiVersion))) errors.push('settings.graphApiVersion لازم يكون زي "v27.0".');
  s.keepCloudCopy = s.keepCloudCopy === true;
  s.pollTimeoutMinutes = Number(s.pollTimeoutMinutes) > 0 ? Number(s.pollTimeoutMinutes) : 10;
  s.igShareToFeed = s.igShareToFeed !== false;

  const destinations = [];
  const labels = new Set();
  const addDest = (d) => {
    if (labels.has(d.label)) {
      errors.push('فيه اسمين متكررين: "' + d.label + '". غيّر الاسم في accounts.json.');
      return;
    }
    labels.add(d.label);
    destinations.push(d);
  };

  const pages = raw.facebookPages || [];
  if (!Array.isArray(pages)) errors.push('facebookPages لازم تكون قائمة [ ].');
  else
    pages.forEach((p, i) => {
      const where = 'facebookPages[' + i + ']';
      if (!p || p.enabled === false) return;
      if (!p.name) errors.push(where + ': ناقص "name".');
      if (!/^\d+$/.test(String(p.pageId || ''))) errors.push(where + ': "pageId" لازم يكون أرقام بس.');
      if (!ENV_NAME.test(String(p.tokenEnv || ''))) errors.push(where + ': "tokenEnv" لازم يكون اسم متغير في .env زي FB_TOKEN_PAGE_1.');
      if (p.name && p.pageId && p.tokenEnv)
        addDest({ platform: 'facebook', key: 'fb:' + p.pageId, label: 'فيسبوك — ' + p.name, name: p.name, pageId: String(p.pageId), tokenEnv: p.tokenEnv });
    });

  const igs = raw.instagramAccounts || [];
  if (!Array.isArray(igs)) errors.push('instagramAccounts لازم تكون قائمة [ ].');
  else
    igs.forEach((a, i) => {
      const where = 'instagramAccounts[' + i + ']';
      if (!a || a.enabled === false) return;
      if (!a.name) errors.push(where + ': ناقص "name".');
      if (!/^\d+$/.test(String(a.igUserId || ''))) errors.push(where + ': "igUserId" لازم يكون أرقام بس (ده instagram_business_account id).');
      if (!ENV_NAME.test(String(a.tokenEnv || ''))) errors.push(where + ': "tokenEnv" لازم يكون اسم متغير في .env (توكن الصفحة المربوطة بالحساب).');
      if (a.name && a.igUserId && a.tokenEnv)
        addDest({ platform: 'instagram', key: 'ig:' + a.igUserId, label: 'إنستجرام — ' + a.name, name: a.name, igUserId: String(a.igUserId), tokenEnv: a.tokenEnv });
    });

  const tt = raw.tiktok || {};
  if (tt.enabled === true) {
    const privacy = tt.privacyLevel || 'SELF_ONLY';
    if (!TIKTOK_PRIVACY.includes(privacy)) errors.push('tiktok.privacyLevel لازم يكون واحد من: ' + TIKTOK_PRIVACY.join(', '));
    addDest({
      platform: 'tiktok',
      key: 'tiktok',
      label: 'تيك توك' + (tt.name ? ' — ' + tt.name : ''),
      name: tt.name || 'TikTok',
      privacyLevel: privacy,
      disableComment: tt.disableComment === true,
      disableDuet: tt.disableDuet === true,
      disableStitch: tt.disableStitch === true,
      isAigc: tt.isAigc === true,
    });
  }

  const yt = raw.youtube || {};
  if (yt.enabled === true) {
    const privacy = yt.privacyStatus || 'public';
    if (!YOUTUBE_PRIVACY.includes(privacy)) errors.push('youtube.privacyStatus لازم يكون public أو unlisted أو private.');
    addDest({
      platform: 'youtube',
      key: 'youtube',
      label: 'يوتيوب شورتس' + (yt.name ? ' — ' + yt.name : ''),
      name: yt.name || 'YouTube Shorts',
      privacyStatus: privacy,
      categoryId: String(yt.categoryId || '22'),
      madeForKids: yt.madeForKids === true,
      containsSyntheticMedia: yt.containsSyntheticMedia === true,
    });
  }

  if (!destinations.length && !errors.length) {
    errors.push('مفيش ولا صفحة أو حساب مفعّل في accounts.json. ضيف صفحة فيسبوك أو فعّل tiktok/youtube.');
  }

  return { ok: errors.length === 0, errors, config: { settings: s, destinations } };
}

/** Map the checkbox labels the form returns back to destination objects. */
function selectDestinations(config, selectedLabels) {
  const list = Array.isArray(selectedLabels) ? selectedLabels : selectedLabels ? [selectedLabels] : [];
  const set = new Set(list.map(String));
  return config.destinations.filter((d) => set.has(d.label));
}

module.exports = { parseConfig, selectDestinations, DEFAULT_SETTINGS, TIKTOK_PRIVACY, YOUTUBE_PRIVACY };
