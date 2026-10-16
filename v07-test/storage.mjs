/* V0.7 IndexedDB is isolated. Legacy stores are opened without upgrades and read only. */
import { KEY, LEGACY_KEYS, defaults, validateData, encodeBackup, decodeBackup, migrateLegacy, mergeBackup, uid } from './core.mjs';
export const DB_NAME = KEY;
const STORE = 'state', MAIN = 'main';
const copy = value => JSON.parse(JSON.stringify(value));
const clean = data => JSON.parse(encodeBackup(data));
const fail = message => { throw new Error(message); };
function record(value) {
  if (!value || value.schema !== 1 || value.data?.version !== 7 || !Number.isSafeInteger(value.revision) || value.revision < 1) fail('V0.7保存記録が破損しています。生データを保存してから復元してください。自動初期化は行いません。');
  return { schema: 1, revision: value.revision, data: clean(value.data) };
}
export function createStore(options = {}) {
  const factory = options.indexedDB ?? globalThis.indexedDB, dbName = options.dbName ?? DB_NAME, legacyDbName = options.legacyDbName ?? 'xpatrol-v05-test';
  if (dbName === legacyDbName || LEGACY_KEYS.includes(dbName)) fail('V0.7の保存先には旧版と異なる名前を指定してください。');
  let dbPromise, activeDb;
  const legacyStorage = () => Object.prototype.hasOwnProperty.call(options, 'localStorage') ? options.localStorage : globalThis.localStorage;
  function open() {
    if (!factory?.open) return Promise.reject(new Error('端末内保存（IndexedDB）を利用できません。対応ブラウザの通常モードで開いてください。'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      let request, settled = false;
      try { request = factory.open(dbName, 1); } catch (error) { reject(error); return; }
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
      request.onerror = () => { settled = true; reject(request.error ?? new Error('保存領域を開けません。')); };
      request.onblocked = () => { settled = true; reject(new Error('別の画面が保存領域を使用中です。画面を閉じて再度開いてください。')); };
      request.onsuccess = () => { const db = request.result; if (settled) { db.close(); return; } settled = true; activeDb = db; db.onversionchange = () => { db.close(); activeDb = undefined; dbPromise = undefined; }; resolve(db); };
    }).catch(error => { dbPromise = undefined; throw error; }); return dbPromise;
  }
  function read(db) {
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE)) { reject(new Error('保存領域にデータストアがありません。')); return; }
      const tx = db.transaction(STORE, 'readonly'), request = tx.objectStore(STORE).get(MAIN); let value;
      request.onsuccess = () => { value = request.result; }; tx.oncomplete = () => resolve(value); tx.onabort = () => reject(tx.error ?? new Error('保存データを読み取れません。'));
    });
  }
  async function readLegacy() {
    if (!factory?.open) fail('旧版保存領域を確認できません。');
    if (typeof factory.databases === 'function') { const databases = await factory.databases(); if (!databases.some(d => d.name === legacyDbName)) return undefined; }
    return new Promise((resolve, reject) => {
      let request, absent = false, settled = false;
      try { request = factory.open(legacyDbName); } catch (error) { reject(error); return; }
      // Abort a new database creation; never create or upgrade the V0.5 database.
      request.onupgradeneeded = event => { absent = event.oldVersion === 0; request.transaction.abort(); };
      request.onerror = () => { settled = true; if (absent) resolve(undefined); else reject(request.error ?? new Error('旧版データを読み取れません。')); };
      request.onblocked = () => { settled = true; reject(new Error('旧版の保存領域が使用中です。旧版画面を閉じて再度実行してください。')); };
      request.onsuccess = async () => { const db = request.result; if (settled) { db.close(); return; } try { const value = await read(db); resolve(value); } catch (error) { reject(error); } finally { db.close(); } };
    });
  }
  async function initial(db) {
    // An existing V0.7 record takes precedence; errors in unrelated old storage cannot hide it.
    if (await read(db) !== undefined) return undefined;
    const old = await readLegacy();
    if (old !== undefined) {
      if (!old || old.schema !== 1 || old.data?.version !== 5 || !Number.isSafeInteger(old.revision) || old.revision < 1) fail('V0.5保存記録が破損しています。旧版の生データを保存してください。移行を中止しました。');
      return { data: migrateLegacy(old.data, { source: 'v05-indexeddb', raw: JSON.stringify(old) }), source: 'v05-indexeddb' };
    }
    const storage = legacyStorage();
    if (storage != null && typeof storage.getItem !== 'function') fail('旧版保存領域を確認できません。');
    for (const key of LEGACY_KEYS) {
      const raw = storage?.getItem(key) ?? null;
      if (raw !== null) { const migrated = decodeBackup(raw); if (migrated.version !== 7) fail('旧版移行に失敗しました。'); if (migrated.sourceBackups.length) migrated.sourceBackups[0].source = key; return { data: migrated, source: key }; }
    }
    return { data: defaults(), source: 'new' };
  }
  async function transaction(mutator) {
    const db = await open(), seed = await initial(db);
    return new Promise((resolve, reject) => {
      let tx, answer, error;
      try { tx = db.transaction(STORE, 'readwrite'); } catch (cause) { reject(cause); return; }
      const store = tx.objectStore(STORE), request = store.get(MAIN);
      request.onsuccess = () => {
        try {
          const existing = request.result !== undefined, current = existing ? record(request.result) : { revision: 0, data: clean(seed?.data ?? fail('初期データを再確認してください。')) };
          let next = current.data, result = {};
          if (mutator) {
            const returned = mutator(copy(current.data)); if (returned?.then) fail('保存関数は同期処理で指定してください。');
            if (returned && typeof returned === 'object' && Object.prototype.hasOwnProperty.call(returned, 'data')) { const { data, ...rest } = returned; next = data; result = rest; } else next = returned;
          }
          const data = clean(next); if (current.revision >= Number.MAX_SAFE_INTEGER) fail('保存回数の上限です。バックアップしてください。');
          const revision = current.revision + (mutator || !existing ? 1 : 0);
          if (mutator || !existing) store.put({ schema: 1, revision, data }, MAIN);
          answer = { data, revision, source: existing ? 'v07' : seed.source, result };
        } catch (cause) { error = cause; tx.abort(); }
      };
      request.onerror = () => { error = request.error; }; tx.oncomplete = () => resolve(answer); tx.onabort = () => reject(error ?? tx.error ?? new Error('保存を中止しました。入力を再送してください。')); tx.onerror = () => { error ??= tx.error; };
    });
  }
  async function recover(incoming) {
    const valid = typeof incoming === 'string' ? decodeBackup(incoming) : validateData(incoming), db = await open();
    const currentRaw = await read(db);
    if (currentRaw !== undefined) {
      try { record(currentRaw); return transaction(data => mergeBackup(data, valid)); } catch { /* Preserve invalid current record below. */ }
    } else {
      try { await initial(db); return transaction(data => mergeBackup(data, valid)); } catch { /* Preserve invalid legacy seed below. */ }
    }
    let legacyIndexedDB; const legacy = {};
    try { legacyIndexedDB = await readLegacy() ?? null; } catch (error) { legacyIndexedDB = { readError: error.message }; }
    for (const key of LEGACY_KEYS) { try { legacy[key] = legacyStorage()?.getItem(key) ?? null; } catch (error) { legacy[key] = { readError: error.message }; } }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite'), store = tx.objectStore(STORE), request = store.get(MAIN); let answer, error;
      request.onsuccess = () => {
        try {
          // Re-read inside the transaction so another window's successful repair is never overwritten.
          const latest = request.result; let healthy;
          if (latest !== undefined) { try { healthy = record(latest); } catch { /* Invalid raw record is retained in a backup. */ } }
          let data;
          if (healthy) data = mergeBackup(healthy.data, valid);
          else {
            data = copy(valid);
            data.sourceBackups.push({ id: uid(), source: 'v07-recovery-raw', at: new Date().toISOString(), raw: JSON.stringify({ format: 'sns-watch-v07-recovery', primary: latest ?? null, legacyIndexedDB, legacy }) });
          }
          data = clean(data);
          const priorRevision = Number.isSafeInteger(latest?.revision) && latest.revision > 0 && latest.revision < Number.MAX_SAFE_INTEGER ? latest.revision : 0;
          const revision = priorRevision + 1; store.put({ schema: 1, revision, data }, MAIN);
          answer = { data, revision, source: 'recovery', result: { recovered: true } };
        } catch (cause) { error = cause; tx.abort(); }
      };
      request.onerror = () => { error = request.error; }; tx.oncomplete = () => resolve(answer); tx.onabort = () => reject(error ?? tx.error ?? new Error('復元を中止しました。元の生データは保持されています。')); tx.onerror = () => { error ??= tx.error; };
    });
  }
  return {
    load: () => transaction(),
    update: mutator => typeof mutator === 'function' ? transaction(mutator) : Promise.reject(new Error('更新関数が必要です。')),
    restore: incoming => { const valid = typeof incoming === 'string' ? decodeBackup(incoming) : validateData(incoming); return transaction(data => mergeBackup(data, valid)); },
    recover,
    raw: async () => {
      const db = await open(), legacy = {}; let old;
      try { old = await readLegacy(); } catch (error) { old = { readError: error.message }; }
      for (const key of LEGACY_KEYS) { try { legacy[key] = legacyStorage()?.getItem(key) ?? null; } catch (error) { legacy[key] = { readError: error.message }; } }
      return { format: 'sns-watch-v07-recovery', primary: await read(db) ?? null, legacyIndexedDB: old ?? null, legacy };
    },
    close: async () => { if (dbPromise) (await dbPromise).close(); activeDb = undefined; dbPromise = undefined; }
  };
}
