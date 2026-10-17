import * as C from './core.mjs';
import { createStore } from './storage.mjs';

const $ = id => document.getElementById(id), store = createStore();
let data, busy = false, pendingRestore, installPrompt, recoveryMode = false;
const channel = 'BroadcastChannel' in globalThis ? new BroadcastChannel('swb07-updates') : null;
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
const formatAt = value => value ? new Date(value).toLocaleString('ja-JP') : '未確認';
function notice(message, error = false) { $('notice').textContent = message; $('notice').className = 'notice' + (error ? ' error' : ''); $('notice').hidden = !message; }
function page(name) { document.querySelectorAll('.page').forEach(x => x.hidden = x.id !== name); document.querySelectorAll('[data-page]').forEach(x => { if (x.dataset.page === name) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); }); }
function button(label, action, type, id, style = 'secondary') { const b = el('button', label, style); b.type = 'button'; b.dataset.action = action; if (type) b.dataset.type = type; if (id) b.dataset.id = id; b.dataset.write = ''; return b; }
function external(label, url) { const a = el('a', label, 'link'); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.referrerPolicy = 'no-referrer'; return a; }
function selectGenre(select, all = false) { const prior = select.value; select.replaceChildren(); if (all) { const option = el('option', 'すべて'); option.value = ''; select.append(option); } for (const g of data.genres) { const option = el('option', g.name); option.value = g.id; select.append(option); } if ([...select.options].some(x => x.value === prior)) select.value = prior; }
function field(label, name, value, {type = 'text', max = 120} = {}) { const l = el('label', label), input = el(type === 'textarea' ? 'textarea' : 'input'); input.name = name; if (type !== 'textarea') input.type = type; else input.rows = 2; input.maxLength = max; input.value = value || ''; l.append(input); return l; }
function genreChecks(values) { const wrap = el('div', undefined, 'genre-checks'); for (const g of data.genres) { const label = el('label'), box = el('input'); box.type = 'checkbox'; box.name = 'genres'; box.value = g.id; box.checked = values.includes(g.id); label.append(box, document.createTextNode(g.name)); wrap.append(label); } return wrap; }
function empty(list, text) { list.replaceChildren(el('p', text, 'empty')); }
function tags(item) { const wrap = el('div'); wrap.append(el('span', item.platform === 'x' ? '𝕏 X' : '▶ YouTube', 'tag ' + (item.platform || 'youtube'))); for (const id of item.genres || []) { const g = data.genres.find(x => x.id === id); if (g) wrap.append(el('span', g.name, 'tag')); } return wrap; }
function editForm(item, type) {
  const details = el('details'), summary = el('summary', '詳細を編集'); details.append(summary);
  const form = el('form'); form.dataset.editType = type; form.dataset.editId = item.id;
  if (type === 'video') { form.append(field('動画タイトル（手入力）', 'title', item.title, {max:200}), field('チャンネル名（手入力・任意）', 'channelName', item.channelName), field('公開チャンネルURL（手入力・任意）', 'channelUrl', item.channelUrl, {type:'url',max:2048})); }
  else { form.append(field('表示名（手入力・任意）', 'name', item.name)); if (item.platform === 'youtube') form.append(field('公開チャンネルURL', 'channelUrl', item.channelUrl, {type:'url',max:2048})); }
  const statusLabel = el('label', '状態'), status = el('select'); status.name = 'status'; for (const s of C.STATES) { const o = el('option', s); o.value = s; o.selected = s === item.status; status.append(o); } statusLabel.append(status); form.append(statusLabel, field('メモ', 'note', item.note, {type:'textarea',max:500}), el('p', 'ジャンル', 'hint'), genreChecks(item.genres));
  const row = el('div', undefined, 'row'), save = el('button', '変更を保存'); save.type = 'submit'; save.dataset.write = ''; row.append(save, button('削除', 'delete', type, item.id, 'danger')); form.append(row); details.append(form); return details;
}
function recordCard(item, type, patrol = false) {
  const card = el('article', undefined, 'item'); card.dataset.recordType = type; card.dataset.recordId = item.id;
  const head = el('div', undefined, 'item-head'), selected = el('input'); selected.type = 'checkbox'; selected.checked = item.selected; selected.dataset.selectType = type; selected.dataset.id = item.id; selected.setAttribute('aria-label', '巡回対象にする');
  const body = el('div'), isVideo = type === 'video', label = isVideo ? item.title || 'タイトル未登録 · ' + item.id : item.name || item.handle || item.channelUrl;
  body.append(tags({...item, platform:isVideo?'youtube':item.platform}), el('h3', label));
  const url = isVideo ? item.url : item.platform === 'x' ? 'https://x.com/' + item.handle : item.channelUrl;
  body.append(external(isVideo ? 'YouTubeで動画を開く ↗' : '公開プロフィールを開く ↗', url));
  if (isVideo) { body.append(el('p', item.channelName || 'チャンネル未登録（手動で確認してください）', 'hint')); if (item.channelUrl) body.append(external('チャンネルを開く ↗', item.channelUrl)); }
  body.append(el('p', item.status + ' · 最終確認：' + formatAt(item.checkedAt), 'hint'));
  if (!isVideo && item.posts?.length) { const posts=el('details');posts.append(el('summary',`収集したX投稿（${item.posts.length}件）`));for(const p of item.posts.slice(-50).reverse())posts.append(external(p.url,p.url));if(item.posts.length>50)posts.append(el('p','最新50件を表示。全投稿はJSONに含まれます。','hint'));body.append(posts); }
  if (item.note) body.append(el('p', item.note));
  const row = el('div', undefined, 'row'); row.append(button('確認を記録', 'check', type, item.id));
  if (isVideo && item.channelUrl) row.append(button('このチャンネルを交流候補へ', 'channel-candidate', type, item.id));
  body.append(row); if (!patrol) body.append(editForm(item, type)); head.append(selected, body); card.append(head); return card;
}
function render() {
  if (!data) return;
  $('stats').replaceChildren(); for (const [n,label] of [[data.inbox.length,'収集リンク'],[data.videos.length,'動画ウォッチ'],[data.candidates.length,'交流候補'],[data.history.length,'確認記録']]) { const s = el('div', undefined, 'stat'); s.append(el('strong',String(n)),el('span',label)); $('stats').append(s); }
  for (const id of ['promoteGenre','cgenre']) selectGenre($(id));
  $('inboxCount').textContent = data.inbox.length + '件';
  const inbox = $('inboxList'); inbox.replaceChildren();
  if (!data.inbox.length) empty(inbox, 'まだリンクはありません。共有するか、リンクを貼り付けて収集を始めましょう。');
  for (const item of data.inbox) { const card = el('article', undefined, 'item'), head = el('div', undefined, 'item-head'), label = el('label'), box = el('input'); box.type = 'checkbox'; box.checked = item.selected; box.dataset.inboxKey = item.key; box.setAttribute('aria-label','登録するリンクを選択'); label.append(box); const body = el('div'); body.append(tags(item), external(item.url,item.url),el('p',item.kind + ' · ' + formatAt(item.addedAt),'hint')); if (item.platform === 'x' && !item.handle) { const f = field('投稿者のXユーザー名（公開投稿で確認して入力）','handle','',{max:15}); f.querySelector('input').dataset.overrideKey = item.key; body.append(f); } head.append(label,body); card.append(head); inbox.append(card); }
  for (const [id,items,type] of [['videoList',data.videos,'video'],['personList',data.candidates,'candidate']]) { $(id).replaceChildren(); if (!items.length) empty($(id), type === 'video' ? '登録したYouTube動画がここに並びます。' : '候補はまだありません。BOXから登録するか、公開チャンネルURLを手入力してください。'); else for (const item of items) $(id).append(recordCard(item,type)); }
  const list = $('genreList'); list.replaceChildren();
  for (const genre of C.counts(data)) { const card = el('article', undefined, 'item'); card.append(el('h3',genre.name),el('p',`${genre.count} / ${genre.target} 人 · X ${genre.xCount} 人 · YouTube ${genre.youtubeCount} 人`),el('p',`動画 ${genre.videoCount} 件 · 巡回候補 ${genre.selectedCount} 人`,'hint')); const progress = el('div',undefined,'genre-progress'),meter = el('meter'); meter.min = 0; meter.max = genre.target; meter.value = Math.min(genre.count,genre.target); meter.setAttribute('aria-label','目標達成状況'); progress.append(meter); card.append(progress); if (genre.words?.length) card.append(el('p',genre.words.join(' / '),'hint')); const row=el('div',undefined,'row'); row.append(button('編集','edit-genre',null,genre.id),button('削除','delete-genre',null,genre.id,'danger'));card.append(row);list.append(card); }
  $('session').textContent = data.session ? `${data.session.period}の巡回 · ${formatAt(data.session.startedAt)} 開始` : '朝・夜を選んで巡回を開始してください。';
  const patrol = $('patrolList'); patrol.replaceChildren(); for (const [items,type] of [[data.candidates,'candidate'],[data.videos,'video']]) for (const item of items.filter(x=>x.selected)) patrol.append(recordCard(item,type,true)); if (!patrol.children.length) empty(patrol,'動画ウォッチ・交流候補で巡回対象のチェックを付けてください。');
  $('historyList').replaceChildren(); if (!data.history.length) empty($('historyList'),'確認記録はまだありません。'); for (const h of data.history.slice(-200).reverse()) { $('historyList').append(el('p',`${formatAt(h.at)} · ${h.period} · ${h.label || h.targetId}${h.legacyText ? ' · '+h.legacyText : ''}`,'hint')); }
  if (data.history.length>200) $('historyList').prepend(el('p','最新200件を表示しています。全履歴はJSONに含まれます。','hint'));
  $('storageStatus').textContent = 'この端末に保存済み · V0.7専用保存領域';
}
function report(results = []) { const added = results.filter(x=>x.added || x.action === 'added' || x.valid && !x.duplicate && !x.error).length, duplicate=results.filter(x=>x.duplicate).length, errors=results.filter(x=>x.error); return `${added}件処理 · 重複${duplicate}件 · エラー${errors.length}件` + (errors.length ? '\n'+errors.map(x=>x.error).join('\n') : ''); }
async function write(mutator, message) {
  if (busy) return;
  busy = true; document.querySelectorAll('[data-write]').forEach(x=>x.disabled = true);
  try { const answer = await store.update(mutator); data = answer.data; render(); channel?.postMessage('updated'); notice(typeof message === 'function' ? message(answer) : message || '保存しました。'); return answer; }
  catch (error) { notice(error.message,true); return null; }
  finally { busy = false; document.querySelectorAll('[data-write]').forEach(x=>x.disabled = false); }
}
function download(name, value) { const blob = new Blob([typeof value === 'string' ? value : JSON.stringify(value,null,2)], {type:'application/json'}), url=URL.createObjectURL(blob),a=el('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
const stamp = () => new Date().toISOString().replace(/[:.]/g,'-');
document.querySelectorAll('[data-page]').forEach(x=>x.addEventListener('click',()=>page(x.dataset.page)));
$('collectForm').addEventListener('submit',async event=>{event.preventDefault(); const answer=await write(d=>C.collectLinks(d,$('postUrls').value,{source:'manual'}), a=>report(a.result?.results)); if(answer)$('postUrls').value=''; });
$('selectInbox').onclick = () => write(d=>C.setInboxSelected(d,d.inbox.map(x=>x.key),true),'すべて選択しました。');
$('clearInbox').onclick = () => write(d=>C.setInboxSelected(d,d.inbox.map(x=>x.key),false),'選択を解除しました。');
$('promote').onclick = () => { const overrides={}; document.querySelectorAll('[data-override-key]').forEach(x=>{if(x.value.trim())overrides[x.dataset.overrideKey]=x.value.trim().replace(/^@/,'');}); return write(d=>C.promoteInbox(d,d.inbox.filter(x=>x.selected).map(x=>x.key),$('promoteGenre').value,overrides),a=>report(a.result?.results)); };
$('deleteInbox').onclick = () => { if(data?.inbox.some(x=>x.selected)&&confirm('選択した収集リンクを削除しますか？')) return write(d=>C.removeInbox(d,d.inbox.filter(x=>x.selected).map(x=>x.key)),'削除しました。'); };
$('candidateForm').onsubmit = async e => {e.preventDefault(); const answer=await write(d=>{const sns=$('cplatform').value,input={platform:sns,name:$('cname').value,genres:[$('cgenre').value]};if(sns==='x')input.handle=C.parseXUrl($('curl').value).handle;else input.channelUrl=$('curl').value;return C.upsertCandidate(d,input);},'交流候補へ登録しました。'); if(answer){$('curl').value='';$('cname').value='';} };
$('genreForm').onsubmit = async e => {e.preventDefault(); const answer=await write(d=>C.upsertGenre(d,{id:$('genreId').value||undefined,name:$('gname').value,target:Number($('gtarget').value),words:$('gwords').value.split(/[,、\n]/).map(x=>x.trim()).filter(Boolean)}),'ジャンルを保存しました。');if(answer)$('cancelGenre').click();};
$('cancelGenre').onclick = () => {$('genreForm').reset();$('genreId').value='';$('genreFormTitle').textContent='ジャンル追加';};
$('morning').onclick = () => write(d=>C.startSession(d,'朝'),'朝の巡回を開始しました。');
$('night').onclick = () => write(d=>C.startSession(d,'夜'),'夜の巡回を開始しました。');
document.addEventListener('change',e=> {const x=e.target;if(x.dataset.inboxKey)write(d=>C.setInboxSelected(d,[x.dataset.inboxKey],x.checked),'選択を保存しました。'); if(x.dataset.selectType)write(d=>C.setSelected(d,x.dataset.selectType,[x.dataset.id],x.checked),'巡回対象を保存しました。');});
document.addEventListener('submit',async e=>{const form=e.target;if(!form.dataset.editType)return;e.preventDefault();const input=Object.fromEntries(new FormData(form));input.genres=new FormData(form).getAll('genres'); await write(d=>form.dataset.editType==='video'?C.updateVideo(d,form.dataset.editId,input):C.updateCandidate(d,form.dataset.editId,input),'変更を保存しました。');});
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(!b||busy||!data)return;const {action,type,id}=b.dataset;
  if(action==='check')write(d=>C.markChecked(d,type,id),'確認を記録しました。');
  if(action==='delete'&&confirm('この登録を削除しますか？確認履歴は残ります。'))write(d=>type==='video'?C.deleteVideo(d,id):C.deleteCandidate(d,id),'登録を削除しました。');
  if(action==='edit-genre'){const g=data.genres.find(x=>x.id===id);$('genreId').value=g.id;$('gname').value=g.name;$('gtarget').value=g.target;$('gwords').value=g.words.join(', ');$('genreFormTitle').textContent='ジャンル編集';$('gname').focus();}
  if(action==='delete-genre'&&confirm('このジャンルを削除しますか？リンクと候補は残ります。'))write(d=>C.deleteGenre(d,id),'ジャンルを削除しました。');
  if(action==='channel-candidate'){const v=data.videos.find(x=>x.id===id);write(d=>C.upsertCandidate(d,{platform:'youtube',channelUrl:v.channelUrl,name:v.channelName,genres:v.genres}),'手動登録されたチャンネルを交流候補へ登録しました。');}
});
$('export').onclick = () => download('sns-watch-v07-'+stamp()+'.json',C.encodeBackup(data));
$('exportSources').onclick = () => download('sns-watch-v07-source-backups-'+stamp()+'.json',{format:'sns-watch-source-archive',sourceBackups:data.sourceBackups});
$('exportRaw').onclick = async () => {try{download('sns-watch-v07-recovery-'+stamp()+'.json',await store.raw());}catch(e){notice(e.message,true);}};
$('import').onchange = async e => {pendingRestore=null;$('restorePreview').hidden=true;try{const f=e.target.files[0];if(!f)return;if(f.size>10000000)throw new Error('バックアップは10MBまでです。');pendingRestore=C.decodeBackup(await f.text());$('restoreSummary').textContent=`ジャンル${pendingRestore.genres.length}件・候補${pendingRestore.candidates.length}人・動画${pendingRestore.videos.length}件・BOX${pendingRestore.inbox.length}件`+(recoveryMode?'\n破損した現在データは統合できません。破損原本をV0.7内に退避し、このJSONを有効なデータとして復旧します。先に「生データを保存」で端末外にも保管してください。':'');$('confirmRestore').textContent=recoveryMode?'破損原本を残してこのJSONで復旧':'この内容を統合して復元'; $('restorePreview').hidden=false;}catch(e){notice(e.message,true);}finally{$('import').value='';}};
$('cancelRestore').onclick=()=>{pendingRestore=null;$('restorePreview').hidden=true;};
$('confirmRestore').onclick=async()=>{if(!pendingRestore||busy)return;busy=true;try{const recovering=recoveryMode,answer=await(recovering?store.recover(pendingRestore):store.restore(pendingRestore));data=answer.data;recoveryMode=false;render();$('recovery').hidden=true;$('cancelRestore').click();document.querySelectorAll('[data-write]').forEach(x=>x.disabled=false);channel?.postMessage('updated');notice(recovering?'破損原本を残して復旧しました。保存・設定から移行前・復元前の原本を書き出せます。':'現在のデータを残して統合・復元しました。');}catch(e){notice(e.message,true);}finally{busy=false;}};
$('persistent').onclick=async()=>{try{const granted=await navigator.storage?.persist?.();notice(granted?'永続保存が許可されました。JSONバックアップも保存してください。':'永続保存の許可は得られませんでした。JSONバックアップを保存してください。');}catch(e){notice(e.message,true);}};
addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;$('install').hidden=false;});
$('install').onclick=async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('install').hidden=true;};
async function refresh(){if(!data||busy)return;try{const result=await store.load();data=result.data;render();}catch(e){notice(e.message,true);}}
if(channel)channel.onmessage=refresh;
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
async function init(){
  try{const answer=await store.load();data=answer.data;render();if(answer.source&&!['v07','new','empty'].includes(answer.source))notice('旧版を変更せず、データをV0.7へコピーしました。移行前の原本は保存・設定から書き出せます。');
    const params=new URLSearchParams(location.search);if(['title','text','url'].some(k=>params.has(k))){const shared=Object.fromEntries(['title','text','url'].map(k=>[k,params.get(k)||''])); const saved=await write(d=>C.collectLinks(d,shared,{source:'share'}),a=>'共有を受信しました。'+report(a.result?.results));if(saved)history.replaceState(null,'',location.pathname+location.hash);}
  }catch(e){recoveryMode=true;$('storageStatus').textContent='保存領域を読み込めません';$('recovery').hidden=false;notice(e.message,true);document.querySelectorAll('[data-write]').forEach(x=>x.disabled=true);}
  if('serviceWorker'in navigator){try{const workerURL=new URL('./sw.js',location.href).href,r=await navigator.serviceWorker.register(workerURL,{scope:'./',updateViaCache:'none'});const show=()=>{$('pwaStatus').textContent=navigator.serviceWorker.controller?.scriptURL===workerURL?'V0.7専用のオフライン保存を準備済み。Androidの共有は実機確認が必要です。':'オフライン保存を準備中、または更新待ちです。必要ならすべてのV0.7画面を閉じて開き直してください。';};show();navigator.serviceWorker.addEventListener('controllerchange',show);r.addEventListener('updatefound',()=>r.installing?.addEventListener('statechange',show));r.installing?.addEventListener('statechange',show);}catch(e){$('pwaStatus').textContent='オフライン保存を準備できません。通信中の操作とJSONバックアップを利用してください。';}}
}
init();
