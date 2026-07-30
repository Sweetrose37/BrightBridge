(function () {
  "use strict";
  const databaseName = "brightbridge-family-voice";
  const storeName = "clips";
  let databasePromise;
  let activeAudio;
  let activeUrl;
  let activeFinish;
  let playbackGeneration = 0;

  function normalize(text) {
    return String(text)
      .trim()
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/[’‘`']/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function database() {
    databasePromise ||= new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return databasePromise;
  }

  async function withStore(mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function save(label, blob, source = "upload") {
    const cleanLabel = String(label).trim();
    if (!cleanLabel || !(blob instanceof Blob) || blob.size === 0) {
      throw new Error("A phrase and audio clip are required.");
    }
    const key = normalize(cleanLabel);
    const existing = (await list()).find(item => normalize(item.label) === key);
    if (existing && existing.key !== key) await remove(existing.key);
    const record = {
      key,
      label: cleanLabel,
      blob,
      type: blob.type || "audio/webm",
      source,
      size: blob.size,
      updatedAt: new Date().toISOString()
    };
    await withStore("readwrite", store => store.put(record));
    return record;
  }

  async function get(text) {
    if (!text) return null;
    try {
      const key = normalize(text);
      const exact = await withStore("readonly", store => store.get(key));
      if (exact) return exact;
      const records = await withStore("readonly", store => store.getAll());
      return records.find(record => normalize(record.label) === key) || null;
    } catch {
      return null;
    }
  }

  async function list() {
    try {
      const records = await withStore("readonly", store => store.getAll());
      return records.sort((a, b) => a.label.localeCompare(b.label));
    } catch {
      return [];
    }
  }

  async function remove(key) {
    await withStore("readwrite", store => store.delete(key));
  }

  async function clear() {
    stop();
    await withStore("readwrite", store => store.clear());
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function exportAll() {
    const records = await list();
    return Promise.all(records.map(async record => ({
      key: record.key,
      label: record.label,
      type: record.type,
      source: record.source,
      updatedAt: record.updatedAt,
      dataUrl: await blobToDataUrl(record.blob)
    })));
  }

  async function importAll(records = []) {
    for (const record of records) {
      if (!record?.label || !record?.dataUrl) continue;
      const blob = await fetch(record.dataUrl).then(response => response.blob());
      await save(record.label,blob,record.source || "backup");
    }
  }

  function cleanupActive(notify = true) {
    const finish = activeFinish;
    activeFinish = null;
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    if (activeUrl) {
      URL.revokeObjectURL(activeUrl);
      activeUrl = null;
    }
    if (notify && finish) finish(false);
  }

  function stop() {
    playbackGeneration += 1;
    cleanupActive();
  }

  function pause() {
    if (activeAudio && !activeAudio.paused) {
      activeAudio.pause();
      return true;
    }
    return false;
  }

  async function resume() {
    if (!activeAudio || !activeAudio.paused) return false;
    try {
      await activeAudio.play();
      return true;
    } catch {
      return false;
    }
  }

  async function startRecord(record, volume = 1) {
    cleanupActive();
    activeUrl = URL.createObjectURL(record.blob);
    activeAudio = new Audio(activeUrl);
    activeAudio.volume = Math.max(0, Math.min(1, volume));
    if (document.body.classList.contains("mobile-app")) activeAudio.playbackRate = Math.max(0.6,Math.min(1.25,BB.store?.data?.settings?.speechRate || 1));
    activeAudio.addEventListener("ended", cleanupActive, { once: true });
    try {
      await activeAudio.play();
      return true;
    } catch {
      cleanupActive();
      return false;
    }
  }

  function sequenceFor(text, records) {
    const words = normalize(text).split(" ").filter(Boolean);
    const candidates = records.map(record => ({
      record,
      words: normalize(record.label).split(" ").filter(Boolean)
    })).filter(item => item.words.length).sort((a,b) => b.words.length-a.words.length);
    const result = [];
    for (let index=0;index<words.length;) {
      const match = candidates.find(candidate =>
        candidate.words.every((word,offset) => words[index+offset] === word)
      );
      if (!match) return [];
      result.push(match.record);
      index += match.words.length;
    }
    return result;
  }

  function playRecordToEnd(record, volume, generation) {
    return new Promise(resolve => {
      if (generation !== playbackGeneration) { resolve(false); return; }
      cleanupActive();
      activeUrl = URL.createObjectURL(record.blob);
      activeAudio = new Audio(activeUrl);
      activeAudio.volume = Math.max(0,Math.min(1,volume));
      if (document.body.classList.contains("mobile-app")) activeAudio.playbackRate = Math.max(0.6,Math.min(1.25,BB.store?.data?.settings?.speechRate || 1));
      let finished = false;
      const finish = value => {
        if (finished) return;
        finished = true;
        activeFinish = null;
        cleanupActive(false);
        resolve(value);
      };
      activeFinish = finish;
      activeAudio.addEventListener("ended",() => finish(true),{once:true});
      activeAudio.addEventListener("error",() => finish(false),{once:true});
      activeAudio.play().catch(() => finish(false));
    });
  }

  async function runSequence(records, volume, generation) {
    for (const record of records) {
      if (generation !== playbackGeneration) return;
      const played = await playRecordToEnd(record,volume,generation);
      if (!played) return;
    }
  }

  async function play(text, volume = 1) {
    const record = await get(text);
    if (record) {
      stop();
      return startRecord(record,volume);
    }
    const records = await list();
    const sequence = sequenceFor(text,records);
    if (!sequence.length) return false;
    stop();
    const generation = playbackGeneration;
    runSequence(sequence,volume,generation);
    window.dispatchEvent(new CustomEvent("bb:voice-sequence",{detail:{text,count:sequence.length,labels:sequence.map(item=>item.label)}}));
    return true;
  }

  window.BB = window.BB || {};
  BB.voiceLibrary = { normalize, save, get, list, remove, clear, exportAll, importAll, play, stop, pause, resume, sequenceFor };
})();
