/* Local display rules only. No X requests and no edits to saved candidate data. */
export const DUE_HOURS = 12;
export function patrolState(person, now = Date.now()) {
  const at = Date.parse(person.checkedAt || '');
  if (!Number.isFinite(at)) return { key: person.checked ? 'unknown' : 'unchecked', label: person.checked ? '要確認' : '未確認', due: true, at: 0 };
  const due = now - at >= DUE_HOURS * 60 * 60 * 1000;
  return { key: due ? 'due' : 'recent', label: due ? '要確認' : '確認済', due, at };
}
export function relativeCheck(person, now = Date.now()) {
  const state = patrolState(person, now);
  if (!state.at) return person.checked ? '最終：時刻不明' : '最終：未確認';
  const minutes = Math.max(0, Math.floor((now - state.at) / 60000));
  return '最終：' + (minutes < 1 ? 'たった今' : minutes < 60 ? minutes + '分前' : minutes < 1440 ? Math.floor(minutes / 60) + '時間前' : Math.floor(minutes / 1440) + '日前');
}
export function firstRegistration(person) {
  const times = person.posts.map(post => Date.parse(post.addedAt || '')).filter(Number.isFinite);
  return times.length ? Math.min(...times) : 0;
}
export function sortCandidates(people, order = 'priority', now = Date.now()) {
  return people.map((person, index) => ({ person, index })).sort((a, b) => {
    if (order === 'newest') {
      const at = firstRegistration(a.person), bt = firstRegistration(b.person);
      return bt - at || b.index - a.index;
    }
    const as = patrolState(a.person, now), bs = patrolState(b.person, now);
    if (order === 'priority' && as.due !== bs.due) return as.due ? -1 : 1;
    return as.at - bs.at || a.index - b.index;
  }).map(row => row.person);
}
export function shortGenres(names) {
  if (!names.length) return '未分類';
  const first = [...names[0]].slice(0, 6).join('');
  return first + ([...names[0]].length > 6 ? '…' : '') + (names.length > 1 ? ' +' + (names.length - 1) : '');
}
