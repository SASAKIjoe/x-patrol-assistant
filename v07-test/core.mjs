/* Pure V0.7 rules. Never fetches URLs, metadata, credentials, or personal data. */
import * as legacy from './legacy-v05.mjs';
export const KEY = 'sns-watch-v07';
export const LEGACY_KEYS = Object.freeze([legacy.KEY, ...legacy.LEGACY_KEYS]);
export const STATES = legacy.STATES;
export const LIMITS = Object.freeze({ genres: 200, candidates: 5000, videos: 20000, posts: 20000, inbox: 10000, history: 50000, batch: 100, bytes: 10000000, input: 32000 });
export const uid = () => globalThis.crypto.randomUUID();
const now = () => new Date().toISOString();
const fail = message => { throw new Error(message); };
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const own = (x, k) => Object.prototype.hasOwnProperty.call(x, k);
const copy = x => JSON.parse(JSON.stringify(x));
function str(x, n, label, required = false) { if (typeof x !== 'string' || x.length > n || (required && !x.trim())) fail(label + 'を確認してください。'); return x; }
function arr(x, n, label) { if (!Array.isArray(x) || x.length > n) fail(label + 'の形式または件数を確認してください。'); return x; }
function ident(x, label = 'ID') { if (typeof x !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(x)) fail(label + 'が不正です。'); return x; }
function bool(x) { if (typeof x !== 'boolean') fail('選択状態を確認してください。'); return x; }
function atTime(x, required = false) {
  str(x, 40, '日時', required); if (!x) return x;
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(x) || !Number.isFinite(Date.parse(x))) fail('日時が不正です。');
  const date = new Date(x); if (date.toISOString().slice(0, 19) !== x.slice(0, 19)) fail('日時が不正です。'); return x;
}
function handle(x) { str(x, 15, 'Xユーザー名', true); if (!/^[A-Za-z0-9_]+$/.test(x) || /^(i|home|search|intent|share|messages|settings|explore|notifications|compose|hashtag)$/i.test(x)) fail('Xユーザー名は英数字・_の15文字以内で指定してください。'); return x.toLowerCase(); }
function ids(x, label = '選択') { return new Set(arr(Array.isArray(x) ? x : [x], LIMITS.inbox, label).map(id => str(id, 120, label, true))); }
function refs(x, gids) { return [...new Set(arr(x, LIMITS.genres, 'ジャンル').map(id => { if (!gids.has(id)) fail('存在しないジャンルが指定されています。'); return id; }))]; }
function status(x) { if (!STATES.includes(x)) fail('状態を確認してください。'); return x; }
function platform(x) { if (!['x', 'youtube'].includes(x)) fail('SNSの種類を確認してください。'); return x; }
function urlParts(value, hosts) {
  const raw = str(value, 2048, 'リンク', true).trim();
  if (/[\s\u0000-\u001f\u007f\\]/.test(raw)) fail('リンクに空白・制御文字を含めないでください。');
  const m = /^https:\/\/([^/?#]+)(\/[^?#]*)?(?:\?[^#]*)?(?:#.*)?$/i.exec(raw);
  if (!m || !hosts.includes(m[1].toLowerCase())) fail('対応するSNSのHTTPSリンクを指定してください。');
  let url; try { url = new URL(raw); } catch { fail('リンクの形式を確認してください。'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) fail('正規のHTTPSリンクを指定してください。');
  return { raw, url, path: m[2] ?? '/' };
}
export function parseXUrl(value) {
  const p = urlParts(value, ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com', 'mobile.x.com']);
  if (/\/status\//.test(p.path)) {
    // The copied V0.5 parser remains the authoritative strict X status validator.
    const parsed = legacy.parsePostUrl(p.raw.replace(/^https:\/\/mobile\.x\.com/i, 'https://x.com'));
    return { platform: 'x', kind: 'post', key: 'x:' + parsed.id, ...parsed };
  }
  const match = /^\/([A-Za-z0-9_]{1,15})\/?$/.exec(p.path); if (!match) fail('Xの投稿またはプロフィールのリンクを指定してください。');
  const h = handle(match[1]); return { platform: 'x', kind: 'profile', key: 'x-profile:' + h, id: h, handle: h, url: 'https://x.com/' + h };
}
export function parseYoutubeUrl(value) {
  const p = urlParts(value, ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']);
  let id, kind = 'video';
  if (p.url.hostname.endsWith('youtu.be')) { const m = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(p.path); id = m?.[1]; }
  else if (/^\/watch\/?$/.test(p.path)) {
    const all = p.url.searchParams.getAll('v'), rawQuery = p.raw.split('#', 1)[0].split('?')[1] ?? '';
    const rawIds = rawQuery.split('&').filter(pair => pair.startsWith('v=')).map(pair => pair.slice(2));
    if (all.length === 1 && rawIds.length === 1 && /^[A-Za-z0-9_-]{11}$/.test(rawIds[0])) id = rawIds[0];
  }
  else { const m = /^\/(shorts|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(p.path); if (m) { kind = m[1] === 'shorts' ? 'shorts' : 'live'; id = m[2]; } }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) fail('YouTubeの動画・Shorts・ライブの個別リンクを指定してください。');
  return { platform: 'youtube', kind, key: 'youtube:' + id, id, handle: '', url: 'https://www.youtube.com/watch?v=' + id };
}
export function parseChannelUrl(value) {
  const p = urlParts(value, ['youtube.com', 'www.youtube.com', 'm.youtube.com']);
  let path; try { path = decodeURIComponent(p.path); } catch { fail('チャンネルURLの文字コードが不正です。'); }
  const match = /^(\/(?:channel\/UC[A-Za-z0-9_-]{22}|@[\p{L}\p{N}\p{M}_.-]{1,100}|(?:c|user)\/[A-Za-z0-9_.-]{1,100}))\/?$/u.exec(path);
  if (!match || p.url.search || p.url.hash || /[<>%\s]/.test(path)) fail('YouTubeのチャンネルURLを手動入力してください。動画URLは指定できません。');
  // Handles are case-insensitive. Channel IDs retain their case-sensitive spelling.
  const normalized = match[1].startsWith('/@') ? '/@' + match[1].slice(2).toLowerCase() : match[1];
  return 'https://www.youtube.com' + normalized.split('/').map((part, index) => index ? encodeURIComponent(part).replace(/^%40/, '@') : '').join('/');
}
export function parseLink(value) {
  const host = /^https:\/\/([^/?#]+)/i.exec(typeof value === 'string' ? value.trim() : '')?.[1]?.toLowerCase();
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(host)) return parseYoutubeUrl(value);
  return parseXUrl(value);
}
export const shareText = legacy.shareText;
export function extractLinks(value) {
  const tokens = shareText(value).match(/https?:\/\/[^\s<>"'`\u3000,、。，））」』】〉》]+/gi) ?? [];
  if (!tokens.length) fail('XまたはYouTubeのリンクが見つかりません。');
  if (tokens.length > LIMITS.batch) fail('一度に取り込めるリンクは100件までです。');
  return tokens.map(x => x.replace(/[)\]}.,!;:。、！？，）」』】〉》]+$/u, ''));
}
export const parseWords = legacy.parseWords;
export const searchUrl = legacy.searchUrl;
export function defaults() { return { version: 7, genres: legacy.defaults().genres, candidates: [], videos: [], inbox: [], session: null, history: [], sourceBackups: [] }; }
export function validateData(input) {
  if (!object(input) || input.version !== 7) fail('対応するV0.7データではありません。旧版は移行またはバックアップ読込を使用してください。');
  const gids = new Set(), gnames = new Set();
  const genres = arr(input.genres, LIMITS.genres, 'ジャンル').map(g => {
    if (!object(g)) fail('ジャンルの形式を確認してください。'); const id = ident(g.id), name = str(g.name, 32, 'ジャンル名', true).trim();
    if (gids.has(id) || gnames.has(name)) fail('ジャンルIDまたは名前が重複しています。'); gids.add(id); gnames.add(name);
    if (!Number.isInteger(g.target) || g.target < 1 || g.target > 100000) fail('目標人数は1〜100000の整数にしてください。');
    const words = [...new Set(arr(g.words, 25, '検索キーワード').map(w => str(w, 120, '検索キーワード', true).trim()))]; return { id, name, target: g.target, words };
  });
  const candidateIds = new Set(), identities = new Set(), postOwners = new Map(); let posts = 0;
  const candidates = arr(input.candidates, LIMITS.candidates, '交流候補').map(c => {
    if (!object(c)) fail('候補の形式を確認してください。'); const id = ident(c.id), sns = platform(c.platform);
    const h = sns === 'x' ? handle(c.handle) : str(c.handle, 0, 'ユーザー名');
    const channelUrl = sns === 'youtube' ? parseChannelUrl(c.channelUrl) : str(c.channelUrl, 0, 'チャンネルURL');
    const identity = sns + ':' + (h || channelUrl); if (candidateIds.has(id) || identities.has(identity)) fail('候補IDまたはSNS候補が重複しています。'); candidateIds.add(id); identities.add(identity);
    const gs = refs(c.genres, gids);
    const candidate = { id, platform: sns, handle: h, channelUrl, name: str(c.name, 120, '候補名'), genres: gs, note: str(c.note, 500, 'メモ'), status: status(c.status), selected: bool(c.selected), checked: str(c.checked, 160, '確認記録'), checkedAt: atTime(c.checkedAt), posts: [] };
    for (const post of arr(c.posts, LIMITS.posts, '投稿')) {
      if (sns !== 'x' || !object(post) || ++posts > LIMITS.posts) fail('投稿の形式または件数を確認してください。');
      const parsed = parseXUrl(post.url); if (parsed.kind !== 'post' || parsed.handle !== h || post.id !== parsed.id || postOwners.has(post.id)) fail('投稿の候補名・IDが不正または重複しています。');
      postOwners.set(post.id, h); const pgs = refs(post.genres, gids); if (pgs.some(g => !gs.includes(g))) fail('投稿のジャンルが候補にありません。');
      candidate.posts.push({ id: parsed.id, url: parsed.url, genres: pgs, addedAt: atTime(post.addedAt) });
    }
    return candidate;
  });
  const videoIds = new Set();
  const videos = arr(input.videos, LIMITS.videos, '動画ウォッチ').map(v => {
    if (!object(v)) fail('動画の形式を確認してください。'); const parsed = parseYoutubeUrl(v.url);
    if (v.id !== parsed.id || videoIds.has(v.id) || !['video', 'shorts', 'live'].includes(v.kind)) fail('動画IDまたは種類が不正・重複しています。'); videoIds.add(v.id);
    return { id: v.id, url: parsed.url, kind: v.kind, title: str(v.title, 200, '動画名'), channelUrl: v.channelUrl ? parseChannelUrl(v.channelUrl) : str(v.channelUrl, 0, 'チャンネルURL'), channelName: str(v.channelName, 120, 'チャンネル名'), genres: refs(v.genres, gids), note: str(v.note, 500, 'メモ'), status: status(v.status), selected: bool(v.selected), checked: str(v.checked, 160, '確認記録'), checkedAt: atTime(v.checkedAt), addedAt: atTime(v.addedAt, true) };
  });
  const inboxKeys = new Set();
  const inbox = arr(input.inbox, LIMITS.inbox, '収集BOX').map(i => {
    if (!object(i)) fail('収集BOXの形式を確認してください。'); const parsed = parseLink(i.url);
    if (i.id !== parsed.id || i.platform !== parsed.platform || i.key !== parsed.key || (parsed.platform === 'x' && i.handle !== parsed.handle) || !['post', 'profile', 'video', 'shorts', 'live'].includes(i.kind) || (parsed.platform === 'x' && i.kind !== parsed.kind)) fail('収集BOXのリンクとIDが一致しません。');
    if (inboxKeys.has(i.key) || (i.platform === 'youtube' && videoIds.has(i.id)) || (i.kind === 'post' && postOwners.has(i.id)) || (i.kind === 'profile' && identities.has('x:' + i.handle))) fail('収集BOXに登録済みのリンクがあります。'); inboxKeys.add(i.key);
    if (!['share', 'manual'].includes(i.source)) fail('収集経路を確認してください。');
    return { ...parsed, kind: i.kind, addedAt: atTime(i.addedAt, true), source: i.source, selected: bool(i.selected) };
  });
  let session = null; if (input.session !== null) { if (!object(input.session) || !['朝', '夜'].includes(input.session.period)) fail('巡回情報を確認してください。'); session = { period: input.session.period, startedAt: atTime(input.session.startedAt, true) }; }
  const historyIds = new Set();
  const history = arr(input.history, LIMITS.history, '確認履歴').map(h => {
    if (!object(h)) fail('確認履歴の形式を確認してください。'); const id = ident(h.id); if (historyIds.has(id) || !['candidate', 'video'].includes(h.targetType) || !['朝', '夜', '手動'].includes(h.period)) fail('確認履歴のIDまたは種類を確認してください。'); historyIds.add(id);
    const at = atTime(h.at), legacyText = str(h.legacyText, 160, '旧版確認記録'); if (!at && !legacyText) fail('確認日時または旧版記録が必要です。');
    return { id, targetType: h.targetType, targetId: str(h.targetId, 100, '確認対象ID'), platform: platform(h.platform), label: str(h.label, 200, '確認対象'), at, period: h.period, sessionStartedAt: atTime(h.sessionStartedAt), legacyText };
  });
  const backupIds = new Set();
  const sourceBackups = arr(input.sourceBackups, 100, '移行元バックアップ').map(b => {
    if (!object(b)) fail('移行元バックアップの形式を確認してください。'); const id = ident(b.id); if (backupIds.has(id)) fail('移行元バックアップIDが重複しています。'); backupIds.add(id);
    return { id, source: str(b.source, 120, '移行元', true), at: atTime(b.at, true), raw: str(b.raw, LIMITS.bytes, '移行元の生データ', true) };
  });
  const data = { version: 7, genres, candidates, videos, inbox, session, history, sourceBackups };
  if (new TextEncoder().encode(JSON.stringify(data)).length > LIMITS.bytes) fail('データが10MBを超えています。バックアップ後に記録を整理してください。');
  return data;
}
function known(data) {
  const map = new Map(data.inbox.map(x => [x.key, x]));
  data.videos.forEach(v => map.set('youtube:' + v.id, v));
  data.candidates.forEach(c => { if (c.platform === 'x') { map.set('x-profile:' + c.handle, c); c.posts.forEach(p => map.set('x:' + p.id, { ...p, handle: c.handle })); } }); return map;
}
export function collectLinks(data, input, options = {}, makeId = uid, at = now()) {
  void makeId; const next = validateData(data), source = options.source ?? 'manual'; if (!['manual', 'share'].includes(source)) fail('収集経路を確認してください。'); atTime(at, true);
  const map = known(next), results = [];
  for (const raw of extractLinks(input)) {
    try {
      const p = parseLink(raw), prior = map.get(p.key);
      if (prior) {
        if (p.platform === 'x' && p.kind === 'post' && prior.handle && p.handle && prior.handle !== p.handle) fail('同じ投稿IDに異なるXユーザー名があります。');
        if (!prior.handle && p.handle && next.inbox.some(i => i.key === p.key)) Object.assign(prior, p);
        results.push({ raw, ...p, valid: true, added: false, duplicate: true, action: '登録済み' }); continue;
      }
      if (next.inbox.length >= LIMITS.inbox) fail('収集BOXは10000件までです。');
      const item = { ...p, addedAt: at, source, selected: true }; next.inbox.push(item); map.set(p.key, item);
      results.push({ raw, ...p, valid: true, added: true, duplicate: false, action: '収集BOXに追加' });
    } catch (error) { results.push({ raw, valid: false, error: error.message }); }
  }
  return { data: validateData(next), results };
}
function newCandidate(sns, makeId) { return { id: makeId(), platform: sns, handle: '', channelUrl: '', name: '', genres: [], note: '', status: STATES[0], selected: true, checked: '', checkedAt: '', posts: [] }; }
export function promoteInbox(data, values, genreId, overrides = {}, makeId = uid, at = now()) {
  const next = validateData(data), requested = ids(values), results = [], removed = new Set(); atTime(at, true);
  if (!next.genres.some(g => g.id === genreId)) fail('登録先のジャンルを選んでください。'); if (!object(overrides)) fail('手動指定を確認してください。');
  for (const key of requested) {
    const item = next.inbox.find(i => i.key === key); if (!item) { results.push({ key, valid: false, error: '収集BOXにリンクがありません。' }); continue; }
    try {
      if (item.platform === 'youtube') {
        if (next.videos.length >= LIMITS.videos) fail('動画ウォッチは20000件までです。');
        next.videos.push({ id: item.id, url: item.url, kind: item.kind, title: '', channelUrl: '', channelName: '', genres: [genreId], note: '', status: STATES[0], selected: true, checked: '', checkedAt: '', addedAt: at });
      } else {
        if (item.kind === 'post' && next.candidates.reduce((n, c) => n + c.posts.length, 0) >= LIMITS.posts) fail('投稿リンクは20000件までです。');
        const over = own(overrides, key) ? overrides[key] : own(overrides, item.id) ? overrides[item.id] : '';
        const requestedHandle = typeof over === 'string' ? over : object(over) ? over.handle ?? '' : fail('投稿者名を確認してください。');
        const h = item.handle || (requestedHandle ? handle(requestedHandle.trim().replace(/^@/, '')) : '');
        if (!h) fail('Xの投稿者名が不明です。リンクを開いて確認し、手動入力してください。');
        if (requestedHandle && handle(requestedHandle.trim().replace(/^@/, '')) !== h) fail('投稿リンクと指定したXユーザー名が一致しません。');
        let c = next.candidates.find(c => c.platform === 'x' && c.handle === h);
        if (!c) { if (next.candidates.length >= LIMITS.candidates) fail('候補は5000人までです。'); c = newCandidate('x', makeId); c.handle = h; next.candidates.push(c); }
        if (!c.genres.includes(genreId)) c.genres.push(genreId);
        if (item.kind === 'post') c.posts.push({ id: item.id, url: `https://x.com/${h}/status/${item.id}`, genres: [genreId], addedAt: at });
      }
      removed.add(key); results.push({ key, id: item.id, valid: true, action: item.platform === 'youtube' ? '動画ウォッチに登録' : '交流候補に登録' });
    } catch (error) { results.push({ key, id: item.id, valid: false, error: error.message }); }
  }
  next.inbox = next.inbox.filter(i => !removed.has(i.key));
  // Registering an X profile also consumes other selected profile duplicates by identity.
  const active = new Set(next.candidates.filter(c => c.platform === 'x').map(c => c.handle)); next.inbox = next.inbox.filter(i => i.kind !== 'profile' || !active.has(i.handle));
  return { data: validateData(next), results };
}
export function removeInbox(data, values) { const next = validateData(data), chosen = ids(values); next.inbox = next.inbox.filter(i => !chosen.has(i.key)); return next; }
export function setInboxSelected(data, values, value) { const next = validateData(data), chosen = ids(values); bool(value); next.inbox.forEach(i => { if (chosen.has(i.key)) i.selected = value; }); return next; }
export function upsertGenre(data, input, makeId = uid) {
  if (!object(input)) fail('ジャンルを確認してください。'); const next = validateData(data), name = str(input.name, 32, 'ジャンル名', true).trim();
  if (next.genres.some(g => g.name === name && g.id !== input.id)) fail('同名のジャンルがあります。');
  const value = { id: input.id || makeId(), name, target: input.target, words: Array.isArray(input.words) ? parseWords(input.words.join('\n')) : parseWords(input.words ?? '') };
  if (input.id) { const index = next.genres.findIndex(g => g.id === input.id); if (index < 0) fail('ジャンルがありません。'); next.genres[index] = value; } else next.genres.push(value);
  return validateData(next);
}
export function deleteGenre(data, id) { const next = validateData(data); next.genres = next.genres.filter(g => g.id !== id); [...next.candidates, ...next.videos].forEach(c => { c.genres = c.genres.filter(g => g !== id); c.posts?.forEach(p => { p.genres = p.genres.filter(g => g !== id); }); }); return validateData(next); }
function edit(next, type, id, input) {
  if (!object(input)) fail('編集内容を確認してください。'); const item = (type === 'candidate' ? next.candidates : type === 'video' ? next.videos : fail('対象を確認してください。')).find(i => i.id === id); if (!item) fail('対象がありません。');
  const fields = type === 'candidate' ? ['name', 'note', 'status', 'selected', 'genres', 'channelUrl'] : ['title', 'note', 'status', 'selected', 'genres', 'channelUrl', 'channelName'];
  for (const key of fields) if (own(input, key)) item[key] = copy(input[key]);
  if (type === 'candidate') item.posts.forEach(p => { p.genres = p.genres.filter(g => item.genres.includes(g)); }); return item;
}
export function upsertCandidate(data, input, makeId = uid) {
  if (!object(input)) fail('候補を確認してください。'); if (input.id) return updateCandidate(data, input.id, input);
  const next = validateData(data), sns = platform(input.platform), h = sns === 'x' ? handle(str(input.handle, 16, 'Xユーザー名', true).replace(/^@/, '')) : '', channelUrl = sns === 'youtube' ? parseChannelUrl(input.channelUrl) : '';
  let c = next.candidates.find(c => c.platform === sns && (sns === 'x' ? c.handle === h : c.channelUrl === channelUrl));
  if (!c) { c = newCandidate(sns, makeId); Object.assign(c, { handle: h, channelUrl }); next.candidates.push(c); }
  const gs = input.genres ? [...new Set([...c.genres, ...input.genres])] : c.genres; edit(next, 'candidate', c.id, { ...input, genres: gs });
  if (sns === 'x') next.inbox = next.inbox.filter(i => i.kind !== 'profile' || i.handle !== h); return validateData(next);
}
export function updateCandidate(data, id, input) { const next = validateData(data); edit(next, 'candidate', id, input); return validateData(next); }
export function updateVideo(data, id, input) { const next = validateData(data); edit(next, 'video', id, input); return validateData(next); }
export function deleteCandidate(data, id) { const next = validateData(data); next.candidates = next.candidates.filter(c => c.id !== id); return next; }
export function deleteVideo(data, id) { const next = validateData(data); next.videos = next.videos.filter(v => v.id !== id); return next; }
export function setSelected(data, type, values, value) { const next = validateData(data), chosen = ids(values); bool(value); const items = type === 'candidate' ? next.candidates : type === 'video' ? next.videos : fail('対象を確認してください。'); items.forEach(i => { if (chosen.has(i.id)) i.selected = value; }); return next; }
export function setStatus(data, type, id, value) { const next = validateData(data); edit(next, type, id, { status: value }); return validateData(next); }
export function startSession(data, period, at = now()) { const next = validateData(data); if (!['朝', '夜'].includes(period)) fail('朝または夜を選んでください。'); next.session = { period, startedAt: atTime(at, true) }; return next; }
export function markChecked(data, type, id, at = now(), makeId = uid) {
  const next = validateData(data); atTime(at, true); const item = edit(next, type, id, {}), period = next.session?.period ?? '手動'; item.checkedAt = at; item.checked = at + ' ' + period;
  next.history.push({ id: makeId(), targetType: type, targetId: id, platform: type === 'video' ? 'youtube' : item.platform, label: (type === 'video' ? item.title || item.id : item.name || item.handle || item.channelUrl).slice(0, 200), at, period, sessionStartedAt: next.session?.startedAt ?? '', legacyText: '' }); return validateData(next);
}
export function counts(data) { return data.genres.map(g => { const candidates = data.candidates.filter(c => c.genres.includes(g.id)); return { ...g, count: candidates.length, selectedCount: candidates.filter(c => c.selected).length, xCount: candidates.filter(c => c.platform === 'x').length, youtubeCount: candidates.filter(c => c.platform === 'youtube').length, videoCount: data.videos.filter(v => v.genres.includes(g.id)).length }; }); }
export function migrateLegacy(input, options = {}, makeId = uid) {
  const old = object(input) && own(input, 'users') ? legacy.migrateV02(input) : legacy.validateData(input), at = options.at ?? now();
  const data = defaults(); data.genres = old.genres; data.session = old.session;
  data.candidates = old.people.map(p => ({ id: p.id, platform: 'x', handle: p.handle, channelUrl: '', name: '', genres: p.genres, note: p.note, status: p.status, selected: p.selected, checked: p.checked, checkedAt: p.checkedAt ? new Date(p.checkedAt).toISOString() : '', posts: p.posts.map(post => ({ ...post, addedAt: post.addedAt ? new Date(post.addedAt).toISOString() : '' })) }));
  data.inbox = old.inbox.map(i => ({ ...parseXUrl(i.url), addedAt: new Date(i.addedAt).toISOString(), source: i.source, selected: i.selected }));
  data.history = old.history.map(h => ({ id: h.id, targetType: 'candidate', targetId: h.personId, platform: 'x', label: h.handle, at: h.at ? new Date(h.at).toISOString() : '', period: h.period, sessionStartedAt: h.sessionStartedAt ? new Date(h.sessionStartedAt).toISOString() : '', legacyText: h.legacyText }));
  if (data.session) data.session = { ...data.session, startedAt: new Date(data.session.startedAt).toISOString() };
  const raw = options.raw ?? JSON.stringify(input); data.sourceBackups.push({ id: makeId(), source: options.source ?? 'legacy-import', at, raw }); return validateData(data);
}
export function decodeBackup(text) {
  str(text, LIMITS.bytes, 'バックアップ', true); if (new TextEncoder().encode(text).length > LIMITS.bytes) fail('バックアップは10MB以内にしてください。');
  let input; try { input = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { fail('JSONバックアップを読み込めません。'); }
  return input?.version === 7 ? validateData(input) : migrateLegacy(input, { raw: text, source: 'legacy-backup' });
}
export function encodeBackup(data) { const json = JSON.stringify(validateData(data), null, 2); if (new TextEncoder().encode(json).length > LIMITS.bytes) fail('バックアップが10MBを超えています。'); return json; }
export function mergeBackup(data, incoming, makeId = uid, at = now()) {
  const next = validateData(data), source = validateData(incoming), gidMap = new Map(), cidMap = new Map(); atTime(at, true);
  const previous = copy(next); previous.sourceBackups = [];
  next.sourceBackups.push({ id: makeId(), source: 'v07-before-merge', at, raw: JSON.stringify(previous) });
  const original = copy(source); original.sourceBackups = [];
  next.sourceBackups.push({ id: makeId(), source: 'v07-merge-input', at, raw: JSON.stringify(original) });
  for (const g of source.genres) { let match = next.genres.find(x => x.name === g.name); if (!match) { match = { ...g, id: next.genres.some(x => x.id === g.id) ? makeId() : g.id }; next.genres.push(match); } gidMap.set(g.id, match.id); }
  const mapGs = gs => [...new Set(gs.map(g => gidMap.get(g)))]; const union = (a, b) => [...new Set([...a, ...b])];
  for (const c of source.candidates) {
    const match = next.candidates.find(x => x.platform === c.platform && (c.platform === 'x' ? x.handle === c.handle : x.channelUrl === c.channelUrl));
    if (match) { cidMap.set(c.id, match.id); match.genres = union(match.genres, mapGs(c.genres)); for (const p of c.posts) { const prior = match.posts.find(x => x.id === p.id); if (prior) prior.genres = union(prior.genres, mapGs(p.genres)); else match.posts.push({ ...p, genres: mapGs(p.genres) }); } if (!match.note) match.note = c.note; if (!match.name) match.name = c.name; }
    else { const added = { ...c, id: next.candidates.some(x => x.id === c.id) ? makeId() : c.id, genres: mapGs(c.genres), posts: c.posts.map(p => ({ ...p, genres: mapGs(p.genres) })) }; next.candidates.push(added); cidMap.set(c.id, added.id); }
  }
  for (const v of source.videos) { const prior = next.videos.find(x => x.id === v.id); if (prior) { prior.genres = union(prior.genres, mapGs(v.genres)); for (const k of ['title', 'note', 'channelName', 'channelUrl']) if (!prior[k]) prior[k] = v[k]; } else next.videos.push({ ...v, genres: mapGs(v.genres) }); }
  // Imported registered entities supersede matching unregistered inbox links.
  const registered = new Map(); next.videos.forEach(v => registered.set('youtube:' + v.id, v));
  next.candidates.forEach(c => { if (c.platform === 'x') { registered.set('x-profile:' + c.handle, c); c.posts.forEach(p => registered.set('x:' + p.id, { ...p, handle: c.handle })); } });
  next.inbox = next.inbox.filter(i => {
    const prior = registered.get(i.key); if (!prior) return true;
    if (i.platform === 'x' && i.kind === 'post' && prior.handle && i.handle && prior.handle !== i.handle) fail('同じ投稿IDのユーザー名が一致しません。復元を中止しました。'); return false;
  });
  const map = known(next); for (const i of source.inbox) { if (!map.has(i.key)) { next.inbox.push(i); map.set(i.key, i); } else if (i.platform === 'x' && i.kind === 'post' && map.get(i.key).handle && i.handle && map.get(i.key).handle !== i.handle) fail('同じ投稿IDのユーザー名が一致しません。復元を中止しました。'); }
  for (const h of source.history) { const entry = { ...h, targetId: h.targetType === 'candidate' ? cidMap.get(h.targetId) ?? h.targetId : h.targetId }; const prior = next.history.find(x => x.id === h.id); if (prior && JSON.stringify(prior) === JSON.stringify(entry)) continue; if (prior) entry.id = makeId(); next.history.push(entry); }
  for (const b of source.sourceBackups) { if (next.sourceBackups.some(x => x.source === b.source && x.raw === b.raw)) continue; next.sourceBackups.push({ ...b, id: next.sourceBackups.some(x => x.id === b.id) ? makeId() : b.id }); }
  return validateData(next);
}
