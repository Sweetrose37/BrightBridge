(function () {
  "use strict";
  const databaseName = "brightbridge-parent-card-voices";
  const legacyStoreName = "voices";
  const storeName = "cardVoices";
  const parents = new WeakSet();
  let databasePromise;
  let migrationPromise;
  let activeAudio = null;
  let activeUrl = "";
  let playbackCache = [];
  let cacheReady = false;

  function normalize(value) {
    return window.BB_COMMUNICATION_CARDS?.equivalentKey(value) ||
      String(value || "").trim().toLocaleLowerCase();
  }

  function cardIdentity(details = {}) {
    const categoryId = String(details.categoryId || details.category || "Quick");
    return String(details.cardId ||
      window.BB_COMMUNICATION_CARDS?.cardId(categoryId, details.phrase) ||
      `${categoryId}:${normalize(details.phrase)}`);
  }

  function recordingId() {
    return crypto.randomUUID?.() ||
      `voice-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
      const request = indexedDB.open(databaseName, 2);
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("Private voice storage is taking too long. Close other BrightBridge tabs, reopen the app, and try again."));
      }, 7000);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(legacyStoreName)) {
          db.createObjectStore(legacyStoreName, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "recordingId" });
        }
      };
      request.onsuccess = () => {
        if (settled) { request.result.close(); return; }
        settled = true;clearTimeout(timer);
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () => {
        if (settled) return;
        settled = true;clearTimeout(timer);reject(request.error);
      };
      request.onblocked = () => {
        if (settled) return;
        settled = true;clearTimeout(timer);
        reject(new Error("Close other BrightBridge tabs, reopen the app, and try saving the voice again."));
      };
    }).catch(error => {
      databasePromise = null;
      throw error;
    });
    return databasePromise;
  }

  async function withStore(name, mode, operation) {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(name, mode);
      const request = operation(transaction.objectStore(name));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function migrateLegacy() {
    migrationPromise ||= (async () => {
      const db = await database();
      if (!db.objectStoreNames.contains(legacyStoreName)) return;
      const legacy = await withStore(legacyStoreName, "readonly", store => store.getAll());
      const current = await withStore(storeName, "readonly", store => store.getAll());
      for (const old of legacy || []) {
        const id = `legacy-${String(old.key || normalize(old.label)).replace(/[^a-z0-9-]/g, "-")}`;
        if (current.some(item => item.recordingId === id)) continue;
        const phrase = String(old.label || "").trim();
        if (!phrase || !old.blob) continue;
        await withStore(storeName, "readwrite", store => store.put({
          recordingId: id,
          cardId: cardIdentity({ categoryId: "Quick", phrase }),
          categoryId: "Quick",
          phrase,
          normalizedPhrase: normalize(phrase),
          childProfileIds: old.assignments?.length ? old.assignments : ["*"],
          parentAccountId: "local-parent",
          blob: old.blob,
          secureStorageReference: id,
          audioSource: old.source || "migration",
          fileType: old.type || old.blob.type || "audio/webm",
          duration: Number(old.duration || 0),
          createdAt: old.createdAt || old.updatedAt || new Date().toISOString(),
          updatedAt: old.updatedAt || new Date().toISOString(),
          enabled: true
        }));
      }
    })();
    return migrationPromise;
  }

  async function allRecords() {
    await migrateLegacy();
    return withStore(storeName, "readonly", store => store.getAll());
  }

  function publicRecord(record) {
    if (!record) return null;
    const { blob, ...safe } = record;
    return safe;
  }

  async function save(actor, details) {
    requireParent(actor);
    const phrase = String(details?.phrase || "").trim();
    const blob = details?.blob;
    const categoryId = String(details?.categoryId || "Quick");
    if (!window.BB_COMMUNICATION_CARDS?.isParentVoiceEligible(categoryId)) {
      throw new Error("Parent Voice is not enabled for this communication category.");
    }
    if (!phrase || !(blob instanceof Blob) || !blob.size) {
      throw new Error("A phrase and audio clip are required.");
    }
    const childProfileIds = details.allProfiles ? ["*"] :
      [...new Set((details.profileIds || details.childProfileIds || []).map(String).filter(Boolean))];
    if (!childProfileIds.length) throw new Error("Choose at least one child profile.");

    const cardId = cardIdentity({ cardId: details.cardId, categoryId, phrase });
    const records = await allRecords();
    const existingRecord = records.find(item => item.recordingId === details.recordingId);
    if (existingRecord && existingRecord.cardId !== cardId) {
      throw new Error("This recording belongs to a different communication card.");
    }

    for (const existing of records.filter(item => item.cardId === cardId && item.recordingId !== details.recordingId)) {
      if (childProfileIds.includes("*")) {
        await withStore(storeName, "readwrite", store => store.delete(existing.recordingId));
        continue;
      }
      if (existing.childProfileIds?.includes("*")) continue;
      const remaining = (existing.childProfileIds || []).filter(id => !childProfileIds.includes(id));
      if (!remaining.length) await withStore(storeName, "readwrite", store => store.delete(existing.recordingId));
      else await withStore(storeName, "readwrite", store => store.put({ ...existing, childProfileIds: remaining, updatedAt: new Date().toISOString() }));
    }

    const id = String(details.recordingId || recordingId());
    const record = {
      recordingId: id,
      cardId,
      categoryId,
      phrase,
      normalizedPhrase: normalize(phrase),
      childProfileIds,
      parentAccountId: "local-parent",
      blob,
      secureStorageReference: id,
      audioSource: String(details.source || details.audioSource || "recording"),
      fileType: blob.type || String(details.fileType || "audio/webm"),
      duration: Number(details.duration || 0),
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: true
    };
    await withStore(storeName, "readwrite", store => store.put(record));
    playbackCache = await withStore(storeName, "readonly", store => store.getAll());
    cacheReady = true;
    return publicRecord(record);
  }

  async function list(actor) {
    requireParent(actor);
    const records = await allRecords();
    return records.filter(item => item.enabled !== false)
      .sort((a, b) => a.phrase.localeCompare(b.phrase) || b.updatedAt.localeCompare(a.updatedAt))
      .map(publicRecord);
  }

  async function getForParent(actor, identity) {
    requireParent(actor);
    const records = await allRecords();
    const query = typeof identity === "string" ? { phrase: identity } : (identity || {});
    const result = query.recordingId
      ? records.find(item => item.recordingId === query.recordingId)
      : records.find(item =>
        (!query.cardId || item.cardId === query.cardId) &&
        (!query.categoryId || item.categoryId === query.categoryId) &&
        (!query.phrase || item.normalizedPhrase === normalize(query.phrase))
      );
    return result || null;
  }

  async function remove(actor, identity) {
    requireParent(actor);
    stop();
    const records = await allRecords();
    const query = typeof identity === "string" ? { recordingId: identity } : (identity || {});
    const matches = records.filter(item =>
      (query.recordingId && item.recordingId === query.recordingId) ||
      (!query.recordingId && (!query.cardId || item.cardId === query.cardId) &&
        (!query.categoryId || item.categoryId === query.categoryId) &&
        (!query.phrase || item.normalizedPhrase === normalize(query.phrase)))
    );
    for (const record of matches) {
      await withStore(storeName, "readwrite", store => store.delete(record.recordingId));
    }
    playbackCache = playbackCache.filter(item => !matches.some(match => match.recordingId === item.recordingId));
    cacheReady = true;
    return matches.length;
  }

  async function clear(actor) {
    requireParent(actor);
    stop();
    await withStore(storeName, "readwrite", store => store.clear());
    if ((await database()).objectStoreNames.contains(legacyStoreName)) {
      await withStore(legacyStoreName, "readwrite", store => store.clear());
    }
    playbackCache = [];
    cacheReady = true;
  }

  function selectForChild(records, details, profileId) {
    const query = typeof details === "string" ? { phrase: details, categoryId: "Quick" } : (details || {});
    const id = cardIdentity(query);
    const eligible = records.filter(item => item.enabled !== false);
    let matches = eligible.filter(item => item.cardId === id);
    if (!matches.length && query.categoryId && query.phrase) {
      matches = eligible.filter(item =>
        item.categoryId === query.categoryId &&
        item.normalizedPhrase === normalize(query.phrase)
      );
    }
    return matches
        .filter(item => item.childProfileIds?.includes(String(profileId)))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ||
        matches.filter(item => item.childProfileIds?.includes("*"))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ||
        null;
  }

  async function warm() {
    try {
      playbackCache = await allRecords();
      cacheReady = true;
      return playbackCache.length;
    } catch {
      cacheReady = false;
      return 0;
    }
  }

  function getCachedForChild(details, profileId) {
    return cacheReady ? selectForChild(playbackCache, details, profileId) : null;
  }

  async function getForChild(details, profileId) {
    try {
      if (!cacheReady) await warm();
      return selectForChild(playbackCache, details, profileId);
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

  async function playForChild(details, profileId, volume) {
    const record = await getForChild(details, profileId);
    return record ? playBlob(record.blob, volume) : false;
  }

  async function playForParent(actor, identity, volume) {
    const record = await getForParent(actor, identity);
    return record ? playBlob(record.blob, volume) : false;
  }

  window.BB = window.BB || {};
  BB.parentVoices = {
    authorize, close, save, list, getForParent, remove, clear,
    getForChild, playForChild, playForParent, playBlob, stop, pause, resume,
    cardIdentity, warm, getCachedForChild
  };
})();
