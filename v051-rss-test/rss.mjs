/* Opt-in three-account pilot. A feed item is evidence only when both the
   canonical X URL and dc:creator identify the registered author. */
export const PILOT_HANDLES = Object.freeze(['tony_sunflower', 'iyokanlove', 'dusmel_clean']);
const PILOT_SET = new Set(PILOT_HANDLES);
const FEED_NAME = Object.freeze({ tony_sunflower: 'Tony_sunflower', iyokanlove: 'iyokanLOVE', dusmel_clean: 'dusmel_clean' });
export function feedUrl(handle) {
  if (!PILOT_SET.has(handle)) throw new Error('このユーザーはRSS試験対象外です。');
  return `https://keep.md/api/x-rss/${FEED_NAME[handle]}.xml?content=posts`;
}
export function newestOwnPost(doc, handle) {
  if (!PILOT_SET.has(handle) || doc.querySelector('parsererror') || doc.documentElement?.nodeName !== 'rss') throw new Error('RSSを読み取れません。');
  let newest = '';
  for (const item of doc.querySelectorAll('channel > item')) {
    const link = item.querySelector('link')?.textContent?.trim() || '';
    const creator = item.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'creator')[0]?.textContent?.trim().replace(/^@/, '').toLowerCase();
    if (creator !== handle) continue;
    const match = /^https:\/\/x\.com\/([A-Za-z0-9_]{1,15})\/status\/([1-9][0-9]{0,19})\/?$/.exec(link);
    if (!match || match[1].toLowerCase() !== handle || BigInt(match[2]) > 18446744073709551615n) continue;
    if (!newest || BigInt(match[2]) > BigInt(newest)) newest = match[2];
  }
  return newest;
}
export async function readFeed(handle, fetcher = fetch, Parser = DOMParser) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetcher(feedUrl(handle), { mode: 'cors', credentials: 'omit', cache: 'no-store', signal: controller.signal });
    if (!response.ok || response.type === 'opaque' || response.redirected) throw new Error('RSS取得失敗');
    const body = await response.text();
    if (body.length > 1000000 || !/\brss\b/.test(body)) throw new Error('RSS形式不正');
    return newestOwnPost(new Parser().parseFromString(body, 'application/xml'), handle);
  } finally { clearTimeout(timeout); }
}
export function applyFeedResults(data, results, at = new Date().toISOString()) {
  if (!Array.isArray(data.rss)) data.rss = [];
  for (const { handle, latestId } of results) {
    if (!PILOT_SET.has(handle) || !data.people.some(p => p.handle === handle) || !/^[1-9][0-9]{0,19}$/.test(latestId || '')) continue;
    let entry = data.rss.find(item => item.handle === handle);
    if (!entry) {
      // First observation is a baseline; existing posts never become false New.
      entry = { handle, latestId, ackId: latestId, undoAckId: '', fetchedAt: at };
      data.rss.push(entry);
    } else {
      if (BigInt(latestId) > BigInt(entry.latestId || '0')) entry.latestId = latestId;
      entry.fetchedAt = at;
    }
  }
  return data;
}
export function feedState(data, handle) {
  const entry = data?.rss?.find(item => item.handle === handle);
  if (!entry?.latestId) return { newPost: false, known: false, label: '−' };
  const newPost = BigInt(entry.latestId) > BigInt(entry.ackId || '0');
  return { newPost, known: true, label: newPost ? '●' : '' };
}
