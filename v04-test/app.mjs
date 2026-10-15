import { KEY, STATES, LIMITS, defaults, loadData, persist, encodeBackup, decodeBackup, addPosts, upsertGenre, deleteGenre, setStatus, markChecked, counts, searchUrl, validateData } from './core.mjs';
const $ = id => document.getElementById(id);
const node = (tag, text = '', cls = '') => { const el = document.createElement(tag); el.textContent = text; if (cls) el.className = cls; return el; };
const button = (text, fn, cls = 'secondary') => { const b = node('button', text, cls); b.type = 'button'; b.addEventListener('click', fn); return b; };
const clone = d => JSON.parse(JSON.stringify(d));
let data = null, pendingRestore = null, restoreToken = 0;
function notice(message, error = false) { $('notice').textContent = message; $('notice').classList.toggle('is-error', error); $('notice').hidden = false; }
function fieldError(id, message = '') { $(id).textContent = message; $(id).hidden = !message; }
function page(id) {
  document.querySelectorAll('.page').forEach(s => { s.hidden = s.id !== id; });
  document.querySelectorAll('[data-page]').forEach(b => { if (b.dataset.page === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
}
document.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => page(b.dataset.page)));
function external(url, label, cls = '') {
  const a = node('a', label, cls); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.referrerPolicy = 'no-referrer'; return a;
}
function commit(next, message = '') {
  try {
    const clean = persist(localStorage, next);
    data = clean;
    $('recovery').hidden = true;
    $('storageStatus').textContent = 'このブラウザに保存済み';
    render();
    if (message) notice(message);
    return true;
  } catch {
    $('storageStatus').textContent = '保存できませんでした。現在のデータは変更していません。';
    notice('保存できません。空き容量やブラウザの保存設定を確認してください。入力内容は残っています。', true);
    return false;
  }
}
function options(id, values, all = false) {
  const select = $(id), old = select.value;
  select.replaceChildren();
  if (all) select.add(new Option('すべて', ''));
  if (id === 'filterGenre') select.add(new Option('未分類', '__unclassified'));
  values.forEach(v => select.add(new Option(v.name, v.id)));
  if ([...select.options].some(o => o.value === old)) select.value = old;
}
function updateWords() {
  const old = $('keyword').value, genre = data?.genres.find(g => g.id === $('searchGenre').value);
  $('keyword').replaceChildren(...(genre?.words ?? []).map(w => new Option(w, w)));
  if ([...$('keyword').options].some(o => o.value === old)) $('keyword').value = old;
  updateSearch();
}
function updateSearch() {
  const word = $('keyword').value, a = $('searchX');
  a.removeAttribute('href'); a.setAttribute('aria-disabled', String(!word || !data));
  if (word && data) a.href = searchUrl(word);
}
$('searchGenre').addEventListener('change', () => { updateWords(); $('postGenre').value = $('searchGenre').value; });
$('keyword').addEventListener('change', updateSearch);
$('searchX').addEventListener('click', e => { if (!$('searchX').hasAttribute('href')) { e.preventDefault(); notice('ジャンルの検索キーワードを設定してください。', true); } });
$('editSearchWords').addEventListener('click', () => editGenre($('searchGenre').value));
function editGenre(id) {
  const genre = data?.genres.find(g => g.id === id);
  if (!genre) { page('genres'); $('gname').focus(); return; }
  $('genreId').value = genre.id; $('gname').value = genre.name; $('gtarget').value = genre.target; $('gwords').value = genre.words.join(', ');
  $('genreFormTitle').textContent = 'ジャンル編集'; $('saveGenre').textContent = '変更を保存'; $('cancelGenre').hidden = false;
  fieldError('genreError'); page('genres'); $('gwords').focus();
}
function resetGenreForm() {
  $('genreForm').reset(); $('genreId').value = ''; $('genreFormTitle').textContent = 'ジャンル追加'; $('saveGenre').textContent = 'ジャンルを追加'; $('cancelGenre').hidden = true; fieldError('genreError');
}
$('cancelGenre').addEventListener('click', resetGenreForm);
$('genreForm').addEventListener('submit', e => {
  e.preventDefault(); fieldError('genreError');
  if (!data) return;
  try {
    const next = upsertGenre(data, { id: $('genreId').value, name: $('gname').value, target: Number($('gtarget').value), words: $('gwords').value });
    if (commit(next, 'ジャンルを保存しました。')) resetGenreForm();
  } catch (error) { fieldError('genreError', error.message); }
});
$('addPosts').addEventListener('submit', e => {
  e.preventDefault(); fieldError('urlError'); $('postUrls').removeAttribute('aria-invalid');
  if (!data) return;
  try {
    const batch = addPosts(data, $('postUrls').value, $('postGenre').value);
    const valid = batch.results.filter(r => r.valid), invalid = batch.results.filter(r => !r.valid);
    if (valid.length && !commit(batch.data)) return;
    const summary = node('p', `処理 ${batch.results.length}件：登録・確認 ${valid.length}件 / エラー ${invalid.length}件`);
    const list = node('ul', '', 'result-list');
    batch.results.forEach(r => list.append(node('li', r.valid ? `@${r.handle}：${r.action}` : `${r.raw}：${r.error}`, r.valid ? '' : 'result-invalid')));
    $('pasteResults').replaceChildren(summary, list);
    $('postUrls').value = invalid.map(r => r.raw).join('\n');
    if (invalid.length) { $('postUrls').setAttribute('aria-invalid', 'true'); fieldError('urlError', '登録できなかったリンクを入力欄に残しました。内容を修正して、もう一度登録してください。'); }
    if (valid.length) notice('投稿リンクを登録しました。交流候補で確認できます。');
  } catch (error) { fieldError('urlError', error.message); $('postUrls').setAttribute('aria-invalid', 'true'); }
});
function genreNames(ids) { return ids.map(id => data.genres.find(g => g.id === id)?.name).filter(Boolean).join('・') || '未分類'; }
function checkedText(p) {
  return p.checkedAt ? new Date(p.checkedAt).toLocaleString('ja-JP') + (p.checked.endsWith('朝') ? ' 朝' : p.checked.endsWith('夜') ? ' 夜' : '') : p.checked || '未確認';
}
function postList(p) {
  const list = node('ul', '', 'post-list');
  p.posts.forEach(post => {
    const li = node('li');
    li.append(external(post.url, '投稿 ' + post.id + ' ↗'), node('span', ' · ' + genreNames(post.genres)));
    li.append(document.createTextNode(' '), button('リンク削除', () => {
      if (!confirm('この投稿リンクを削除しますか？ 候補とジャンルは残ります。')) return;
      const next = clone(data); next.people.find(x => x.id === p.id).posts = p.posts.filter(x => x.id !== post.id); commit(next, '投稿リンクを削除しました。');
    }));
    list.append(li);
  });
  return list;
}
function renderPeople() {
  const root = $('personList'); root.replaceChildren();
  if (!data) return;
  const gid = $('filterGenre').value, status = $('filterStatus').value;
  const selected = data.people.filter(p => (!gid || (gid === '__unclassified' ? !p.genres.length : p.genres.includes(gid))) && (!status || p.status === status));
  $('peopleCount').textContent = selected.length + '人';
  if (!selected.length) { root.append(node('p', data.people.length ? 'この条件の候補はまだいません。' : '気になる投稿のリンクを貼り付けると、ここに候補が並びます。', 'empty')); return; }
  selected.forEach(p => {
    const item = node('article', '', 'item'), top = node('div', '', 'item-head');
    top.append(external('https://x.com/' + p.handle, '@' + p.handle + ' ↗', 'person-link'));
    const label = node('label', '状態', 'status-label'), select = node('select', '', 'status-control');
    select.setAttribute('aria-label', '@' + p.handle + 'の状態'); STATES.forEach(s => select.add(new Option(s, s))); select.value = p.status;
    select.addEventListener('change', () => { if (!commit(setStatus(data, p.id, select.value), '状態を保存しました。')) select.value = p.status; });
    label.append(select); top.append(label); item.append(top, node('p', 'ジャンル：' + genreNames(p.genres), 'muted'), node('p', '最終確認：' + checkedText(p), 'muted'));
    if (p.posts.length) { const details = node('details'); details.append(node('summary', '投稿リンク ' + p.posts.length + '件'), postList(p)); item.append(details); }
    else item.append(node('p', '旧版からの候補です。投稿リンクを貼ると、この候補に追加されます。', 'muted'));
    const edit = node('details'), summary = node('summary', p.note ? 'メモ：' + p.note : 'メモ・ジャンルを編集'); edit.append(summary);
    const noteLabel = node('label', 'メモ'), noteInput = node('textarea'); noteInput.rows = 2; noteInput.maxLength = 160; noteInput.value = p.note; noteInput.setAttribute('aria-label', '@' + p.handle + 'のメモ'); noteLabel.append(noteInput); edit.append(noteLabel);
    edit.append(button('メモを保存', () => { const next = clone(data); next.people.find(x => x.id === p.id).note = noteInput.value.trim(); commit(next, 'メモを保存しました。'); }));
    const genreLabel = node('label', 'ジャンルを追加'), genreSelect = node('select'); genreSelect.setAttribute('aria-label', '@' + p.handle + 'に追加するジャンル');
    const available = data.genres.filter(g => !p.genres.includes(g.id)); available.forEach(g => genreSelect.add(new Option(g.name, g.id))); genreLabel.append(genreSelect); edit.append(genreLabel);
    const addGenreButton = button('このジャンルにも登録', () => { const next = clone(data); next.people.find(x => x.id === p.id).genres.push(genreSelect.value); commit(next, '候補のジャンルを追加しました。'); }); addGenreButton.disabled = !available.length; edit.append(addGenreButton); item.append(edit);
    const controls = node('div', '', 'row'); controls.append(button('確認済みにする', () => commit(markChecked(data, p.id), '確認を記録しました。')),
      button('候補を削除', () => { if (confirm('@' + p.handle + ' と、その投稿リンクを削除しますか？')) { const next = clone(data); next.people = next.people.filter(x => x.id !== p.id); commit(next, '候補を削除しました。'); } }, 'danger'));
    item.append(controls); root.append(item);
  });
}
function renderPatrol() {
  $('patrolList').replaceChildren();
  if (!data) return;
  $('session').textContent = data.session ? data.session.period + 'の巡回 · ' + new Date(data.session.startedAt).toLocaleString('ja-JP') + ' · 候補 ' + data.people.length + '人' : '朝か夜の巡回を選んでください。';
  if (!data.people.length) $('patrolList').append(node('p', '投稿リンクから候補を登録すると、巡回リストに並びます。', 'empty'));
  data.people.forEach(p => {
    const item = node('article', '', 'item'), row = node('div', '', 'row');
    row.append(external('https://x.com/' + p.handle, '@' + p.handle + ' ↗', 'person-link'));
    if (p.posts.length) row.append(external(p.posts.at(-1).url, '最近登録した投稿 ↗'));
    item.append(row, node('p', p.status + ' · 最終確認：' + checkedText(p), 'muted'), button('確認済みにする', () => commit(markChecked(data, p.id), '確認を記録しました。'))); $('patrolList').append(item);
  });
}
function render() {
  const locked = !data;
  ['addPostsButton', 'saveGenre', 'morning', 'night', 'export', 'editSearchWords'].forEach(id => { $(id).disabled = locked; });
  $('stats').replaceChildren(); $('genreList').replaceChildren();
  if (!data) { updateSearch(); return; }
  for (const [label, n] of [['ジャンル', data.genres.length], ['候補人数', data.people.length], ['目標合計', data.genres.reduce((sum, g) => sum + g.target, 0)]]) {
    const stat = node('div', '', 'stat'); stat.append(node('strong', n.toLocaleString('ja-JP')), node('span', label)); $('stats').append(stat);
  }
  counts(data).forEach(g => {
    const item = node('article', '', 'item'), top = node('div', '', 'item-head'); top.append(node('strong', g.name), node('span', `${g.count}人 / 目標 ${g.target}人`, 'count-pill'));
    const progress = node('progress', '', 'progress'); progress.max = g.target; progress.value = Math.min(g.target, g.count); progress.setAttribute('aria-label', g.name + 'の目標達成');
    item.append(top, progress, node('p', '検索：' + (g.words.join('、') || 'キーワードを設定してください'), 'muted'));
    const row = node('div', '', 'row'); row.append(button('編集', () => editGenre(g.id)), button('削除', () => {
      if (!confirm(g.name + ' を削除しますか？ 候補と投稿リンクは残り、このジャンルの紐付けだけ解除されます。')) return;
      if (commit(deleteGenre(data, g.id), 'ジャンルを削除しました。') && $('genreId').value === g.id) resetGenreForm();
    }, 'danger')); item.append(row); $('genreList').append(item);
  });
  if (!data.genres.length) $('genreList').append(node('p', 'ジャンルを追加して、投稿を探し始めましょう。', 'empty'));
  ['searchGenre', 'postGenre', 'filterGenre'].forEach(id => options(id, data.genres, id === 'filterGenre'));
  $('addPostsButton').disabled = !data.genres.length;
  updateWords(); renderPeople(); renderPatrol();
}
['filterGenre', 'filterStatus'].forEach(id => $(id).addEventListener('change', renderPeople));
$('filterStatus').add(new Option('すべて', '')); STATES.forEach(s => $('filterStatus').add(new Option(s, s)));
for (const [id, period] of [['morning', '朝'], ['night', '夜']]) $(id).addEventListener('click', () => {
  if (!data) return; const next = clone(data); next.session = { period, startedAt: new Date().toISOString() }; commit(next, period + 'の巡回を開始しました。');
});
function download(text, filename) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export').addEventListener('click', () => { if (data) download(encodeBackup(data), 'x-patrol-v04-backup.json'); });
function cancelRestore() { restoreToken++; pendingRestore = null; $('restorePreview').hidden = true; $('import').value = ''; }
$('cancelRestore').addEventListener('click', cancelRestore);
$('import').addEventListener('change', async e => {
  pendingRestore = null; $('restorePreview').hidden = true; fieldError('restoreError'); const token = ++restoreToken;
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > LIMITS.bytes) throw new Error('ファイルは2MB以内にしてください。');
    const clean = decodeBackup(await file.text());
    if (token !== restoreToken) return;
    pendingRestore = clean; $('restoreSummary').textContent = `ジャンル ${clean.genres.length}個 / 候補 ${clean.people.length}人 / 投稿リンク ${clean.people.reduce((n, p) => n + p.posts.length, 0)}件`;
    $('restorePreview').hidden = false;
  } catch (error) { if (token === restoreToken) fieldError('restoreError', '復元できません：' + error.message); }
});
$('confirmRestore').addEventListener('click', () => { if (pendingRestore && commit(validateData(pendingRestore), 'バックアップを復元しました。')) { cancelRestore(); resetGenreForm(); $('pasteResults').replaceChildren(); } });
$('exportRaw').addEventListener('click', () => {
  try {
    const raw = Object.fromEntries([KEY, 'xpatrol-v03', 'x-patrol-v01'].map(key => [key, localStorage.getItem(key)]));
    download(JSON.stringify(raw, null, 2), 'x-patrol-recovery-raw.json');
  } catch { notice('ブラウザの保存領域を読み出せません。保存設定を確認してください。', true); }
});
$('newData').addEventListener('click', () => {
  if (!confirm('V0.4の保存領域を初期化しますか？ 元データを必要に応じて先に保存してください。')) return;
  commit(defaults(), '新しいV0.4データを作成しました。');
});
try {
  const loaded = loadData(localStorage);
  data = persist(localStorage, loaded.data);
  $('storageStatus').textContent = 'このブラウザに保存済み';
  if (['v02', 'v03'].includes(loaded.source)) notice((loaded.source === 'v03' ? 'V0.3' : 'V0.2') + 'のデータをV0.4へコピーしました。旧版の保存データは残っています。');
} catch {
  data = null; $('storageStatus').textContent = '保存データを読み込み・保存できませんでした。'; $('recoveryReason').textContent = 'データの形式、空き容量、またはブラウザの保存設定を確認してください。'; $('recovery').hidden = false; page('backup');
}
render();
