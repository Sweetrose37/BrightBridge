(function () {
  "use strict";
  const databaseName = "brightbridge-family-voice";
  const storeName = "clips";
  let databasePromise;
  let activeAudio;
  let activeUrl;

  function normalize(text) {
    return String(text)
      .trim()
      .toLocaleLowerCase()
      .replace(/[.!?]+$/g, "")
      .replace(/\s+/g, " ");
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
    const record = {
      key: normalize(cleanLabel),
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
      return await withStore("readonly", store => store.get(normalize(text)));
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

  function stop() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    if (activeUrl) {
      URL.revokeObjectURL(activeUrl);
      activeUrl = null;
    }
  }

  async function play(text, volume = 1) {
    const record = await get(text);
    if (!record) return false;
    stop();
    activeUrl = URL.createObjectURL(record.blob);
    activeAudio = new Audio(activeUrl);
    activeAudio.volume = Math.max(0, Math.min(1, volume));
    activeAudio.addEventListener("ended", stop, { once: true });
    try {
      await activeAudio.play();
      return true;
    } catch {
      stop();
      return false;
    }
  }

  window.BB = window.BB || {};
  BB.voiceLibrary = { normalize, save, get, list, remove, clear, exportAll, importAll, play, stop };
})();
