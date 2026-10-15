export const KEY = 'xpatrol-v04-test';
export const STATES = Object.freeze(['新規発見', '興味あり', '交流中', 'フォロー中', '保留']);
export const LIMITS = Object.freeze({ genres: 200, people: 5000, posts: 20000, batch: 100, bytes: 2000000 });
const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const RESERVED = new Set(['i', 'home', 'search', 'intent', 'share', 'messages', 'settings', 'explore', 'notifications', 'compose', 'hashtag']);
const fail = message => { throw new Error(message); };
const copy = value => JSON.parse(JSON.stringify(value));
export const uid = () => globalThis.crypto.randomUUID();
const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
function string(v, max, label, nonempty = false) {
  if (typeof v !== 'string' || v.length > max || (nonempty && !v.trim())) fail(label + 'を確認してください。');
  return v;
}
function ids(v, allowed, label) {
  if (!Array.isArray(v) || v.length > LIMITS.genres || v.some(id => typeof id !== 'string' || !allowed.has(id))) fail(label + 'に存在しないジャンルがあります。');
  return [...new Set(v)];
}
function timestamp(v, label) {
  if (typeof v !== 'string' || (v !== '' && (!/^\d{4}-\d\d-\d\dT/.test(v) || !Number.isFinite(Date.parse(v)))) || v.length > 40) fail(label + 'の日時が不正です。');
  return v;
}
export function parsePostUrl(value) {
  const raw = string(value, 2048, '投稿リンク', true).trim();
  // Inspect the original spelling too: URL alone normalizes ports, slashes and dot segments.
  if (/[\s\u0000-\u001f\u007f\\]/.test(raw) || !/^https:\/\/(?:x\.com|twitter\.com|www\.x\.com|www\.twitter\.com)\//i.test(raw)) fail('https://x.com/ユーザー名/status/数字 の投稿リンクを貼り付けてください。');
  const url = new URL(raw);
  if (url.username || url.password || url.port || url.protocol !== 'https:' || !['x.com', 'twitter.com', 'www.x.com', 'www.twitter.com'].includes(url.hostname)) fail('Xの正規投稿リンクではありません。');
  const originalPath = raw.replace(/^https:\/\/[^/]+/i, '').split(/[?#]/, 1)[0];
  const m = /^\/([A-Za-z0-9_]{1,15})\/status\/([1-9][0-9]{0,19})(?:\/(?:photo\/[1-4]|video\/1))?\/?$/.exec(originalPath);
  if (!m || RESERVED.has(m[1].toLowerCase()) || BigInt(m[2]) > 18446744073709551615n) fail('投稿者名付きの投稿リンクが必要です。プロフィール・短縮リンク・i/status形式は使えません。');
  const handle = m[1].toLowerCase();
  return { handle, id: m[2], url: `https://x.com/${handle}/status/${m[2]}` };
}
export function parseWords(value) {
  const words = [...new Set(string(value, 4000, '検索キーワード').split(/[,、\n]/).map(s => s.trim()).filter(Boolean))];
  if (words.length > 25 || words.some(w => w.length > 120)) fail('検索キーワードは25個まで、各120文字以内にしてください。');
  return words;
}
export function searchUrl(word) {
  string(word, 120, '検索キーワード', true);
  const url = new URL('https://x.com/search');
  url.search = new URLSearchParams({ q: word, f: 'live' }).toString();
  return url.href;
}
export function defaults() {
  return { version: 4, genres: [
    { id: 'g1', name: 'サバゲー', target: 30, words: ['サバゲー', 'サバゲー初心者'] },
    { id: 'g2', name: 'エアガン', target: 30, words: ['エアガン', '愛銃紹介'] },
    { id: 'g3', name: 'カスタム', target: 20, words: ['エアガンカスタム', '外装カスタム'] }
  ], people: [], session: null };
}
export function validateData(input) {
  if (!isObject(input) || ![undefined, 3, 4].includes(input.version)) fail('対応するV0.3 / V0.4データではありません。');
  if (!Array.isArray(input.genres) || input.genres.length > LIMITS.genres || !Array.isArray(input.people) || input.people.length > LIMITS.people) fail('ジャンル・候補の形式または件数を確認してください。');
  const gids = new Set();
  const genres = input.genres.map(g => {
    if (!isObject(g) || typeof g.id !== 'string' || !ID.test(g.id) || gids.has(g.id)) fail('ジャンルIDが不正または重複しています。');
    gids.add(g.id);
    const name = string(g.name, 32, 'ジャンル名', true).trim();
    if (!Number.isInteger(g.target) || g.target < 1 || g.target > 100000) fail('目標人数は1〜100000の整数にしてください。');
    if (!Array.isArray(g.words) || g.words.length > 25) fail('検索キーワードの形式を確認してください。');
    return { id: g.id, name, target: g.target, words: [...new Set(g.words.map(w => string(w, 120, '検索キーワード', true).trim()))] };
  });
  const people = [], pids = new Set(), postOwners = new Map();
  let postCount = 0;
  for (const p of input.people) {
    if (!isObject(p) || typeof p.id !== 'string' || !ID.test(p.id) || pids.has(p.id) || typeof p.handle !== 'string' || !HANDLE.test(p.handle) || RESERVED.has(p.handle.toLowerCase()) || !STATES.includes(p.status)) fail('候補ID・ユーザー名・状態を確認してください。');
    pids.add(p.id);
    const handle = p.handle.toLowerCase(), pg = ids(p.genres, gids, '候補');
    const person = { id: p.id, handle, genres: pg, note: string(p.note ?? '', 160, 'メモ'), status: p.status,
      checked: string(p.checked ?? '', 120, '最終確認'), checkedAt: timestamp(p.checkedAt ?? '', '最終確認'), posts: [] };
    if (input.version === 4 && !Array.isArray(p.posts)) fail('投稿リンクの形式を確認してください。');
    for (const post of p.posts ?? []) {
      if (++postCount > LIMITS.posts || !isObject(post)) fail('投稿リンクの件数または形式を確認してください。');
      const parsed = parsePostUrl(post.url);
      if (parsed.handle !== handle || post.id !== parsed.id) fail('投稿リンクと候補のユーザー名・投稿IDが一致しません。');
      const priorOwner = postOwners.get(parsed.id);
      if (priorOwner && priorOwner !== handle) fail('同じ投稿IDに異なるユーザー名が指定されています。');
      postOwners.set(parsed.id, handle);
      const refs = ids(post.genres, gids, '投稿リンク');
      if (refs.some(id => !pg.includes(id))) fail('投稿リンクのジャンルが候補に紐付いていません。');
      const prior = person.posts.find(x => x.id === parsed.id);
      if (prior) prior.genres = [...new Set([...prior.genres, ...refs])];
      else person.posts.push({ id: parsed.id, url: parsed.url, genres: refs, addedAt: timestamp(post.addedAt ?? '', '登録') });
    }
    const prior = people.find(x => x.handle === handle);
    if (prior) {
      prior.genres = [...new Set([...prior.genres, ...pg])];
      if (!prior.note) prior.note = person.note;
      if (!prior.checked) { prior.checked = person.checked; prior.checkedAt = person.checkedAt; }
      for (const post of person.posts) {
        const found = prior.posts.find(x => x.id === post.id);
        if (found) found.genres = [...new Set([...found.genres, ...post.genres])];
        else prior.posts.push(post);
      }
    } else people.push(person);
  }
  let session = null;
  if (input.session != null) {
    if (!isObject(input.session) || !['朝', '夜'].includes(input.session.period) || !input.session.startedAt) fail('巡回情報を確認してください。');
    session = { period: input.session.period, startedAt: timestamp(input.session.startedAt, '巡回') };
  }
  return { version: 4, genres, people, session };
}
export function migrateV02(input) {
  if (!isObject(input) || !Array.isArray(input.users) || !Array.isArray(input.logs) || input.users.length > 100 || input.logs.length > LIMITS.posts) fail('V0.2データの形式を確認してください。');
  const genreMap = new Map(), people = [];
  for (const u of input.users) {
    if (!isObject(u) || typeof u.h !== 'string' || !HANDLE.test(u.h)) fail('V0.2のユーザー名が不正です。');
    const name = string(u.k, 32, 'V0.2分類', true);
    if (!genreMap.has(name)) genreMap.set(name, { id: 'legacy-' + (genreMap.size + 1), name, target: 20, words: [name] });
    people.push({ id: 'legacy-person-' + (people.length + 1), handle: u.h, genres: [genreMap.get(name).id], status: STATES[0], note: '', checked: '', posts: [] });
  }
  for (const log of input.logs) {
    if (!isObject(log) || typeof log.h !== 'string' || !HANDLE.test(log.h) || !log.at) fail('V0.2の確認記録が不正です。');
    const at = timestamp(log.at, 'V0.2確認記録');
    const period = string(log.session ?? '', 160, 'V0.2巡回名');
    const p = people.find(p => p.handle.toLowerCase() === log.h.toLowerCase());
    if (p && (!p.checkedAt || Date.parse(at) > Date.parse(p.checkedAt))) { p.checkedAt = at; p.checked = at + (period ? ' ' + period : ''); p.checked = p.checked.slice(0, 120); }
  }
  return validateData({ version: 4, genres: [...genreMap.values()], people });
}
export function decodeBackup(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > LIMITS.bytes) fail('バックアップは2MB以内のJSONにしてください。');
  let input;
  try { input = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { fail('JSONを読み込めません。ファイルの内容を確認してください。'); }
  return isObject(input) && 'users' in input ? migrateV02(input) : validateData(input);
}
export function encodeBackup(data) {
  const value = JSON.stringify(validateData(data), null, 2);
  if (new TextEncoder().encode(value).length > LIMITS.bytes) fail('データが2MBを超えています。候補や投稿リンクを整理してください。');
  return value;
}
export function loadData(storage) {
  // A damaged new-format record must never silently fall back and overwrite the original.
  const current = storage.getItem(KEY);
  if (current !== null) return { data: decodeBackup(current), source: 'v04' };
  const old3 = storage.getItem('xpatrol-v03');
  if (old3 !== null) return { data: decodeBackup(old3), source: 'v03' };
  const old2 = storage.getItem('x-patrol-v01');
  if (old2 !== null) return { data: migrateV02(JSON.parse(old2)), source: 'v02' };
  return { data: defaults(), source: 'new' };
}
export function persist(storage, data) {
  const clean = validateData(data);
  const json = encodeBackup(clean);
  storage.setItem(KEY, json);
  return clean;
}
export function addPosts(data, text, genreId, makeId = uid, at = new Date().toISOString()) {
  if (!data.genres.some(g => g.id === genreId)) fail('登録先のジャンルを選んでください。');
  string(text, 32000, '貼り付け内容', true);
  const tokens = text.trim().split(/\s+/);
  if (tokens.length > LIMITS.batch) fail('一度に貼り付ける投稿リンクは100件までです。');
  const next = copy(data), results = [];
  for (const raw of tokens) {
    try {
      const post = parsePostUrl(raw);
      const otherOwner = next.people.find(p => p.handle !== post.handle && p.posts.some(x => x.id === post.id));
      if (otherOwner) fail('登録済みの投稿IDとユーザー名が異なります。リンクを確認してください。');
      let p = next.people.find(p => p.handle === post.handle);
      const existed = Boolean(p);
      if (!p && next.people.length >= LIMITS.people) fail('候補人数の上限に達しました。');
      let found = p?.posts.find(x => x.id === post.id);
      if (!found && next.people.reduce((n, p) => n + p.posts.length, 0) >= LIMITS.posts) fail('投稿リンクの上限に達しました。');
      const linked = Boolean(p && !p.genres.includes(genreId));
      const postLinked = Boolean(found && !found.genres.includes(genreId));
      if (!p) { p = { id: makeId(), handle: post.handle, genres: [], note: '', status: STATES[0], checked: '', checkedAt: '', posts: [] }; next.people.push(p); }
      if (!p.genres.includes(genreId)) p.genres.push(genreId);
      let action;
      if (found) {
        if (!found.genres.includes(genreId)) found.genres.push(genreId);
        action = linked || postLinked ? 'ジャンルを追加' : '登録済み';
      } else { p.posts.push({ id: post.id, url: post.url, genres: [genreId], addedAt: at }); action = existed ? '投稿リンクを追加' : '候補を追加'; }
      results.push({ raw, valid: true, handle: post.handle, action });
    } catch (error) { results.push({ raw, valid: false, error: error.message }); }
  }
  return { data: validateData(next), results };
}
export function upsertGenre(data, input, makeId = uid) {
  const next = copy(data), name = string(input.name, 32, 'ジャンル名', true).trim();
  if (next.genres.some(g => g.name === name && g.id !== input.id)) fail('同じジャンル名が登録されています。');
  if (!Number.isInteger(input.target) || input.target < 1 || input.target > 100000) fail('目標人数は1〜100000の整数にしてください。');
  const words = parseWords(input.words);
  if (input.id) {
    const g = next.genres.find(g => g.id === input.id);
    if (!g) fail('編集対象のジャンルがありません。');
    Object.assign(g, { name, target: input.target, words });
  } else {
    if (next.genres.length >= LIMITS.genres) fail('ジャンルは200個までです。');
    next.genres.push({ id: makeId(), name, target: input.target, words });
  }
  return validateData(next);
}
export function deleteGenre(data, id) {
  const next = copy(data);
  next.genres = next.genres.filter(g => g.id !== id);
  next.people.forEach(p => { p.genres = p.genres.filter(g => g !== id); p.posts.forEach(post => { post.genres = post.genres.filter(g => g !== id); }); });
  return validateData(next);
}
export function setStatus(data, id, status) {
  if (!STATES.includes(status)) fail('状態を確認してください。');
  const next = copy(data), p = next.people.find(p => p.id === id);
  if (!p) fail('候補がありません。');
  p.status = status;
  return next;
}
export function markChecked(data, id, at = new Date().toISOString()) {
  const next = copy(data), p = next.people.find(p => p.id === id);
  if (!p) fail('候補がありません。');
  p.checkedAt = at;
  p.checked = at + (next.session ? ' ' + next.session.period : ' 手動確認');
  return validateData(next);
}
export function counts(data) {
  return data.genres.map(g => ({ ...g, count: data.people.filter(p => p.genres.includes(g.id)).length }));
}
