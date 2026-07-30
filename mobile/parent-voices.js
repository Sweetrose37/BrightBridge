(function () {
  "use strict";
  const databaseName = "brightbridge-parent-card-voices";
  const storeName = "voices";
  const parents = new WeakSet();
  let databasePromise;
  let activeAudio = null;
  let activeUrl = "";

  function normalize(value) {
    return window.BB_COMMUNICATION_CARDS?.equivalentKey(value) ||
      String(value || "").trim().toLocaleLowerCase();
  }

  function requireParent(actor) {
    if (!actor || !parents.has(actor)) throw new Error("Parent authorization is required.");
  }

  function authorize(enteredPin, expectedPin) {
    if (!/^\d{4}$/.test(String(enteredPin)) || String(enteredPin) !== String(expectedPin)) {
      throw new Error("Parent authorization failed.");
    }
    const actor = Object.freeze({});
    parents.add(actor);
    return actor;
  }

  function close(actor) {
    if (actor) parents.delete(actor);
    stop();
  }

  function database() {
    databasePromise ||= new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: "key" });
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
      const request = operation(transaction.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function save(actor, details) {
    requireParent(actor);
    const phrase = String(details?.phrase || "").trim();
    const blob = details?.blob;
    if (!phrase || !(blob instanceof Blob) || !blob.size) throw new Error("A phrase and audio clip are required.");
    const assignments = details.allProfiles ? ["*"] :
      [...new Set((details.profileIds || []).map(String).filter(Boolean))];
    if (!assignments.length) throw new Error("Choose at least one child profile.");
    const record = {
      key: normalize(phrase),
      cardId: String(details.cardId || ""),
      phrase,
      blob,
      type: blob.type || "audio/webm",
      source: String(details.source || "recording"),
      duration: Number(details.duration || 0),
      assignments,
      createdAt: String(details.createdAt || new Date().toISOString()),
      updatedAt: new Date().toISOString()
    };
    await withStore("readwrite", store => store.put(record));
    return { ...record, blob: undefined };
  }

  async function list(actor) {
    requireParent(actor);
    const records = await withStore("readonly", store => store.getAll());
    return records.sort((a, b) => a.phrase.localeCompare(b.phrase));
  }

  async function getForParent(actor, phrase) {
    requireParent(actor);
    return withStore("readonly", store => store.get(normalize(phrase)));
  }

  async function remove(actor, phrase) {
    requireParent(actor);
    stop();
    return withStore("readwrite", store => store.delete(normalize(phrase)));
  }

  async function clear(actor) {
    requireParent(actor);
    stop();
    return withStore("readwrite", store => store.clear());
  }

  async function getForChild(phrase, profileId) {
    try {
      const record = await withStore("readonly", store => store.get(normalize(phrase)));
      if (!record || !record.assignments?.some(id => id === "*" || id === String(profileId))) return null;
      return record;
    } catch {
      return null;
    }
  }

  function cleanup() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    if (activeUrl) {
      URL.revokeObjectURL(activeUrl);
      activeUrl = "";
    }
  }

  function stop() {
    cleanup();
  }

  function pause() {
    if (activeAudio && !activeAudio.paused) activeAudio.pause();
  }

  async function resume() {
    if (!activeAudio || !activeAudio.paused) return false;
    try { await activeAudio.play(); return true; } catch { return false; }
  }

  async function playBlob(blob, volume = 1) {
    cleanup();
    activeUrl = URL.createObjectURL(blob);
    activeAudio = new Audio(activeUrl);
    activeAudio.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    activeAudio.addEventListener("ended", cleanup, { once: true });
    activeAudio.addEventListener("error", cleanup, { once: true });
    try {
      await activeAudio.play();
      return true;
    } catch {
      cleanup();
      return false;
    }
  }

  async function playForChild(phrase, profileId, volume) {
    const record = await getForChild(phrase, profileId);
    return record ? playBlob(record.blob, volume) : false;
  }

  async function playForParent(actor, phrase, volume) {
    const record = await getForParent(actor, phrase);
    return record ? playBlob(record.blob, volume) : false;
  }

  window.BB = window.BB || {};
  BB.parentVoices = {
    authorize, close, save, list, getForParent, remove, clear,
    getForChild, playForChild, playForParent, playBlob, stop, pause, resume
  };
})();
