import {STATES,LIMITS,defaults,collectPosts,promoteInbox,removeInbox,setInboxSelected,setSelected,startSession,markChecked,updatePerson,deletePerson,removePost,upsertGenre,deleteGenre,counts,searchUrl,decodeBackup,encodeBackup} from './core.mjs';
import {createStore} from './storage.mjs';
const $=id=>document.getElementById(id);
const el=(tag,text='',cls='')=>{const n=document.createElement(tag);n.textContent=text;if(cls)n.className=cls;return n;};
const on=(id,type,fn)=>$(id).addEventListener(type,e=>{try{Promise.resolve(fn(e)).catch(error=>notice(error.message||'処理できませんでした。',true));}catch(error){notice(error.message||'処理できませんでした。',true);}});
const btn=(text,fn,cls='secondary')=>{const b=el('button',text,cls);b.type='button';b.addEventListener('click',()=>Promise.resolve().then(fn).catch(e=>notice(e.message,true)));return b;};
const link=(url,text,cls='')=>{const a=el('a',text,cls);a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';return a;};
const label=(text,input)=>{const n=el('label',text);n.append(input);return n;};
const check=(text,checked,fn)=>{const n=el('label','','pick'),c=el('input');c.type='checkbox';c.checked=checked;c.addEventListener('change',()=>Promise.resolve(fn(c.checked)).catch(e=>{c.checked=!c.checked;notice(e.message,true);}));n.append(c,document.createTextNode(text));return n;};
let data=null,revision=-1,store,pendingRestore=null,restoreToken=0,queue=Promise.resolve(),installPrompt=null;
const handleDrafts=new Map();
let channel;try{channel=new BroadcastChannel('xp05-changed');channel.onmessage=()=>refresh();}catch{}
function notice(text,error=false){$('notice').textContent=text;$('notice').classList.toggle('is-error',error);$('notice').hidden=false;}
function page(id){document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==id);document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>page(b.dataset.page)));
function save(fn,message=''){
  const work=queue.catch(()=>{}).then(async()=>{
    if(!store||!data)throw new Error('保存データを読み込めません。保存・設定を確認してください。');
    try{const r=await store.update(fn);data=r.data;revision=r.revision;render();channel?.postMessage('changed');$('storageStatus').textContent='この端末に保存済み';if(message)notice(message);return r.result;}
    catch(e){$('storageStatus').textContent='保存できませんでした。入力を残しています。';throw e;}
  });queue=work;return work;
}
async function refresh(){if(!store||document.visibilityState==='hidden')return;try{await queue.catch(()=>{});const r=await store.load();if(r.revision!==revision){data=r.data;revision=r.revision;render();}}catch(e){notice('保存領域の再読込に失敗しました：'+e.message,true);}}
window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
function options(id,all=false,unclassified=false){const s=$(id),old=s.value;s.replaceChildren();if(all)s.add(new Option('すべて',''));if(unclassified)s.add(new Option('未分類','__none'));for(const g of data.genres)s.add(new Option(g.name,g.id));if([...s.options].some(o=>o.value===old))s.value=old;}
function genreNames(ids){return ids.map(id=>data.genres.find(g=>g.id===id)?.name).filter(Boolean).join('・')||'未分類';}
function time(at){return at?new Date(at).toLocaleString('ja-JP'):'日時不明';}
function results(rows){const root=$('pasteResults');root.replaceChildren();if(!rows)return;const list=el('ul','','result-list');rows.forEach(r=>list.append(el('li',(r.raw||r.url||r.id||r.handle||'')+'：'+(r.action||r.error||(r.valid?'処理済み':'登録不可')),r.valid===false?'result-invalid':'')));root.append(list);}
function pickedInbox(){return data.inbox.filter(x=>x.selected).map(x=>x.id);}
function visiblePeople(){const gid=$('filterGenre').value,status=$('filterStatus').value;return data.people.filter(p=>(!gid||(gid==='__none'?!p.genres.length:p.genres.includes(gid)))&&(!status||p.status===status));}
function renderInbox(){
  const root=$('inboxList');root.querySelectorAll('input[id^="handle-"]').forEach(input=>handleDrafts.set(input.id.slice(7),input.value));root.replaceChildren();$('inboxCount').textContent=data.inbox.length+'件';
  $('promote').disabled=!pickedInbox().length||!data.genres.length;$('deleteInbox').disabled=!pickedInbox().length;
  if(!data.inbox.length){root.append(el('p','まだリンクはありません。Xから共有するか、上の「リンクを貼り付けて収集する」を開いて追加してください。','empty'));return;}
  for(const p of [...data.inbox].reverse()){
    const item=el('article','','item');item.append(check(p.handle?'@'+p.handle:'投稿者名を確認してください',p.selected,value=>save(d=>setInboxSelected(d,[p.id],value))));
    item.append(link(p.url,'投稿 '+p.id+' ↗','url-text'),el('p',time(p.addedAt)+' · '+(p.source==='share'?'共有から':'手動取込'),'muted'));
    if(!p.handle){const input=el('input');input.type='text';input.maxLength=15;input.placeholder='example_user（@なし）';input.id='handle-'+p.id;input.value=handleDrafts.get(p.id)||'';input.autocapitalize='off';input.spellcheck=false;item.append(label('Xで投稿を確認し、投稿者のユーザー名を入力',input));}
    root.append(item);
  }
}
function renderPeople(){
  const root=$('personList');root.replaceChildren();const people=visiblePeople();$('peopleCount').textContent=people.length+'人';
  if(!people.length){root.append(el('p','候補はまだありません。収集BOXから候補に登録してください。','empty'));return;}
  for(const p of people){
    const item=el('article','','item'),top=el('div','','item-head'),status=el('select');for(const s of STATES)status.add(new Option(s,s));status.value=p.status;status.setAttribute('aria-label','@'+p.handle+'の状態');status.addEventListener('change',()=>save(d=>{const current=d.people.find(x=>x.id===p.id);if(!current)throw new Error('候補がありません。');current.status=status.value;return d;},'状態を保存しました。').catch(e=>{status.value=p.status;notice(e.message,true);}));
    top.append(link('https://x.com/'+p.handle,'@'+p.handle+' ↗','person-link'),status);item.append(top,check('巡回する',p.selected,v=>save(d=>setSelected(d,[p.id],v))),el('p','ジャンル：'+genreNames(p.genres),'muted'),el('p','最終確認：'+(p.checkedAt?time(p.checkedAt):p.checked||'未確認'),'muted'));
    const posts=el('details');posts.append(el('summary','投稿リンク '+p.posts.length+'件'));for(const post of p.posts){const row=el('div','','row');row.append(link(post.url,'投稿 '+post.id+' ↗','url-text'),btn('リンク削除',async()=>{if(confirm('この投稿リンクを削除しますか？'))await save(d=>removePost(d,p.id,post.id),'リンクを削除しました。');},'danger'));posts.append(row);}item.append(posts);
    const edit=el('details');edit.append(el('summary',p.note?'メモ：'+p.note:'メモ・ジャンルを編集'));const note=el('textarea');note.rows=2;note.maxLength=160;note.value=p.note;note.setAttribute('aria-label','@'+p.handle+'のメモ');edit.append(label('メモ',note));const picks=el('div','','genre-picks');const boxes=[];for(const g of data.genres){const box=el('input');box.type='checkbox';box.value=g.id;box.checked=p.genres.includes(g.id);boxes.push(box);picks.append(label(g.name,box));}edit.append(picks,btn('編集内容を保存',()=>save(d=>updatePerson(d,p.id,{note:note.value,genres:boxes.filter(b=>b.checked).map(b=>b.value)}),'候補を保存しました。')));item.append(edit);
    const row=el('div','','row');row.append(btn('確認を記録',()=>save(d=>markChecked(d,p.id),'確認を記録しました。')),btn('候補を削除',async()=>{if(confirm('@'+p.handle+' と投稿リンクを削除しますか？確認履歴は残ります。'))await save(d=>deletePerson(d,p.id),'候補を削除しました。');},'danger'));item.append(row);root.append(item);
  }
}
function editGenre(g){$('genreId').value=g.id;$('gname').value=g.name;$('gtarget').value=g.target;$('gwords').value=g.words.join(', ');$('genreFormTitle').textContent='ジャンル編集';page('genres');$('gname').focus();}
function resetGenre(){$('genreForm').reset();$('genreId').value='';$('genreFormTitle').textContent='ジャンル追加';}
function renderGenres(){const root=$('genreList');root.replaceChildren();for(const g of counts(data)){const item=el('article','','item'),top=el('div','','item-head');top.append(el('strong',g.name),el('span',g.count+'人 / 目標 '+g.target+'人','count-pill'));const progress=el('progress','','progress');progress.max=g.target;progress.value=Math.min(g.count,g.target);progress.setAttribute('aria-label',g.name+'の目標達成');const row=el('div','','row');row.append(btn('編集',()=>editGenre(g)),btn('削除',async()=>{if(confirm(g.name+'を削除しますか？候補・投稿リンクは残ります。'))await save(d=>deleteGenre(d,g.id),'ジャンルを削除しました。');},'danger'));for(const word of g.words)row.append(link(searchUrl(word),word+' ↗'));item.append(top,progress,row);root.append(item);}if(!data.genres.length)root.append(el('p','ジャンルを追加すると、収集BOXから候補に登録できます。','empty'));}
function renderPatrol(){
  $('session').textContent=data.session?data.session.period+'の巡回 · '+time(data.session.startedAt):'朝か夜の巡回を選んでください。';const root=$('patrolList');root.replaceChildren();const people=data.people.filter(p=>p.selected);if(!people.length)root.append(el('p','交流候補で「巡回する」を選択してください。','empty'));
  for(const p of people){const item=el('article','','item'),row=el('div','','row');row.append(link('https://x.com/'+p.handle,'@'+p.handle+' ↗','person-link'));if(p.posts.length)row.append(link(p.posts.at(-1).url,'最近の登録投稿 ↗'));item.append(row,el('p',p.status+' · '+(p.checkedAt?time(p.checkedAt):p.checked||'未確認'),'muted'),btn('確認を記録',()=>save(d=>markChecked(d,p.id),'確認を記録しました。')));root.append(item);}
  $('historyCount').textContent='全'+data.history.length+'件（最新200件を表示・全件はバックアップへ）';$('historyList').replaceChildren(...[...data.history].reverse().slice(0,200).map(h=>el('div','@'+h.handle+' · '+(h.at?time(h.at):h.legacyText||'日時不明')+' · '+h.period,'history-row')));
}
function render(){document.querySelectorAll('[data-write]').forEach(b=>b.disabled=!data);if(!data)return;const stats=$('stats');stats.replaceChildren();for(const [title,n] of [['収集BOX',data.inbox.length],['交流候補',data.people.length],['巡回対象',data.people.filter(p=>p.selected).length]]){const s=el('div','','stat');s.append(el('strong',String(n)),el('span',title));stats.append(s);}options('promoteGenre');options('filterGenre',true,true);renderInbox();renderPeople();renderGenres();renderPatrol();}
on('collectForm','submit',async e=>{e.preventDefault();const text=$('postUrls').value;const r=await save(d=>collectPosts(d,text,{source:'manual'}),'収集結果を確認してください。');results(r.results);const invalid=(r.results||[]).filter(x=>x.valid===false);if($('postUrls').value===text)$('postUrls').value=invalid.map(x=>x.raw).filter(Boolean).join('\n');});
on('selectInbox','click',()=>save(d=>setInboxSelected(d,d.inbox.map(x=>x.id),true)));on('clearInbox','click',()=>save(d=>setInboxSelected(d,d.inbox.map(x=>x.id),false)));
on('promote','click',async()=>{const ids=pickedInbox(),overrides={};for(const id of ids){const input=$('handle-'+id);if(input)overrides[id]=input.value.trim().replace(/^@/,'');}const gid=$('promoteGenre').value;const r=await save(d=>promoteInbox(d,ids,gid,overrides),'候補への登録結果を確認してください。');results(r.results);});
on('deleteInbox','click',async()=>{const ids=pickedInbox();if(ids.length&&confirm(ids.length+'件を収集BOXから削除しますか？'))await save(d=>removeInbox(d,ids),'収集BOXから削除しました。');});
on('filterGenre','change',renderPeople);on('filterStatus','change',renderPeople);$('filterStatus').add(new Option('すべて',''));for(const s of STATES)$('filterStatus').add(new Option(s,s));
on('selectPeople','click',()=>{const ids=visiblePeople().map(x=>x.id);return save(d=>setSelected(d,ids,true));});on('clearPeople','click',()=>{const ids=visiblePeople().map(x=>x.id);return save(d=>setSelected(d,ids,false));});
on('genreForm','submit',async e=>{e.preventDefault();const input={id:$('genreId').value,name:$('gname').value,target:Number($('gtarget').value),words:$('gwords').value};await save(d=>upsertGenre(d,input),'ジャンルを保存しました。');resetGenre();});on('cancelGenre','click',resetGenre);
on('morning','click',()=>save(d=>startSession(d,'朝'),'朝の巡回を開始しました。'));on('night','click',()=>save(d=>startSession(d,'夜'),'夜の巡回を開始しました。'));
function download(value,name){const u=URL.createObjectURL(new Blob([value],{type:'application/json;charset=utf-8'})),a=el('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);}
on('export','click',async()=>{await queue.catch(()=>{});const r=await store.load();data=r.data;revision=r.revision;render();download(encodeBackup(data),'XPatrolV05Backup.json');});
function cancelRestore(){restoreToken++;pendingRestore=null;$('restorePreview').hidden=true;$('import').value='';}
on('cancelRestore','click',cancelRestore);on('import','change',async e=>{const token=++restoreToken;pendingRestore=null;$('restorePreview').hidden=true;const f=e.target.files[0];if(!f)return;if(f.size>LIMITS.bytes)throw new Error('JSONは10MB以内にしてください。');const clean=decodeBackup(await f.text());if(token!==restoreToken)return;pendingRestore=clean;$('restoreSummary').textContent='ジャンル '+clean.genres.length+'個 / 候補 '+clean.people.length+'人 / 収集BOX '+clean.inbox.length+'件 / 履歴 '+clean.history.length+'件';$('restorePreview').hidden=false;});
on('confirmRestore','click',async()=>{const target=pendingRestore,token=restoreToken;if(!target)return;await queue.catch(()=>{});if(token!==restoreToken)return;const r=await store.replace(target);data=r.data;revision=r.revision;handleDrafts.clear();render();$('recovery').hidden=true;$('storageStatus').textContent='この端末に保存済み';cancelRestore();channel?.postMessage('changed');notice('バックアップを復元しました。');});
on('exportRaw','click',async()=>download(JSON.stringify(await store.raw(),null,2),'XPatrolRecovery.json'));on('newData','click',async()=>{if(!confirm('V0.5の保存領域を初期化しますか？必要なら先に元データを保存してください。旧版データは残ります。'))return;await queue.catch(()=>{});const r=await store.replace(defaults());data=r.data;revision=r.revision;handleDrafts.clear();$('recovery').hidden=true;$('storageStatus').textContent='この端末に保存済み';render();channel?.postMessage('changed');notice('新しいV0.5データを保存しました。');});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});on('install','click',async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('install').hidden=true;});on('persistent','click',async()=>{const granted=await navigator.storage?.persist?.();notice(granted?'この端末での保存保護が許可されました。バックアップも保存してください。':'保存保護は許可されませんでした。定期的にバックアップしてください。');});
async function setupPwa(){
  if(!('serviceWorker'in navigator)){$('pwaStatus').textContent='このブラウザではオフライン機能を利用できません。';return;}
  try{
    const reg=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    const status=()=>{$('pwaStatus').textContent=reg.waiting&&reg.active?'更新があります。V0.5の画面をすべて閉じ、開き直してください。':reg.active?.state==='activated'?'オフライン起動の準備済み。実機の共有動作は要確認。':'オフライン起動を準備しています。';};
    const watch=worker=>{if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='redundant')$('pwaStatus').textContent='オフライン準備に失敗しました。オンラインで開き直してください。';else status();});};
    watch(reg.installing);reg.addEventListener('updatefound',()=>{watch(reg.installing);status();});navigator.serviceWorker.addEventListener('controllerchange',status);status();
  }catch(e){$('pwaStatus').textContent='オフライン準備に失敗しました。オンラインで再度開いてください。';}
}
const shareParams=new URL(location.href).searchParams,shared={title:shareParams.get('title')||'',text:shareParams.get('text')||'',url:shareParams.get('url')||''};const hasShare=['title','text','url'].some(k=>shareParams.has(k));
if(hasShare){history.replaceState(null,'',location.pathname);$('postUrls').value=[shared.title,shared.text,shared.url].filter(Boolean).join('\n');$('manualImport').open=true;}
render();
try{let legacyStorage;try{legacyStorage=localStorage;}catch{}store=createStore({indexedDB:globalThis.indexedDB,localStorage:legacyStorage});const loaded=await store.load();data=loaded.data;revision=loaded.revision;$('storageStatus').textContent='この端末に保存済み';render();if(['v02','v03','v04'].includes(loaded.source))notice('旧版からV0.5へコピーしました。旧版データは残っています。');}
catch(e){data=null;render();$('storageStatus').textContent='保存領域を読み込み・保存できませんでした。';$('recovery').hidden=false;notice(e.message,true);if(!hasShare)page('backup');}
if(hasShare&&data){try{const r=await save(d=>collectPosts(d,shared,{source:'share'}),'共有を受信しました。収集結果を確認してください。');results(r.results);if(!(r.results||[]).some(x=>x.valid===false)){$('postUrls').value='';$('manualImport').open=false;}}catch(e){notice('共有を保存できませんでした。手動取込欄の内容を確認して再送してください：'+e.message,true);}}
setupPwa();
