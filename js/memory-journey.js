(function () {
  "use strict";

  const stages = [
    { id:"early-explorer", icon:"🌱", name:"Early Explorer", ages:"Approx. ages 2–4", focus:"Cause and effect, first AAC, colors, shapes, animals, sounds, sensory play, and routines." },
    { id:"growing-learner", icon:"🌿", name:"Growing Learner", ages:"Approx. ages 5–8", focus:"Reading readiness, math, daily living, social skills, expanded communication, and Reward Garden growth." },
    { id:"independent-communicator", icon:"🌳", name:"Independent Communicator", ages:"Approx. ages 9–12", focus:"Sentence building, journaling, goals, school support, emotional regulation, problem solving, and independence." },
    { id:"teen-young-adult", icon:"✨", name:"Teen & Young Adult", ages:"Approx. ages 13+", focus:"Life skills, work readiness, community navigation, financial literacy, self-advocacy, wellness, and future goals." }
  ];
  const defaultTags = ["Happy","Excited","Practicing","Laughing","Singing","New Sound","Family","School","Therapy","Milestone","Favorite"];
  const letterPrompts = [
    "Today you smiled when…","Today you surprised me by…","Today you learned…",
    "I am proud of you because…","Something that made us laugh…","A challenge you overcame…",
    "Your favorite thing today…","A memory I never want to forget…","A message for your future…"
  ];
  let dbPromise;
  let section = "hub";
  let voiceRecorder;
  let voiceStream;
  let voiceChunks = [];
  let voiceStarted = 0;
  let voiceFilters = { query:"", sort:"newest" };
  let objectUrls = [];
  let slideItems = [];
  let slideIndex = 0;
  let renderToken = 0;
  let memoryViewActive = false;

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[character]);
  }

  function activeProfile() {
    const data = BB.store.data;
    return data.profiles.find(profile => profile.id === data.activeProfile) || data.profiles[0];
  }

  function memoryState() {
    return BB.store.data.memoryJourney;
  }

  function growthPathState() {
    const profile=activeProfile();
    profile.growthPath ||= JSON.parse(JSON.stringify(memoryState().growthPath));
    return profile.growthPath;
  }

  function database() {
    dbPromise ||= new Promise((resolve,reject) => {
      const request = indexedDB.open("brightbridge-private-journey",1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("voices")) db.createObjectStore("voices",{keyPath:"id"});
        if (!db.objectStoreNames.contains("letters")) db.createObjectStore("letters",{keyPath:"id"});
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function store(name, mode, operation) {
    const db = await database();
    return new Promise((resolve,reject) => {
      const request = operation(db.transaction(name,mode).objectStore(name));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function list(name) {
    try {
      const records = await store(name,"readonly",objectStore => objectStore.getAll());
      return records.filter(record => record.profileId === BB.store.data.activeProfile);
    } catch {
      return [];
    }
  }

  async function listAll(name) {
    try {
      return await store(name,"readonly",objectStore => objectStore.getAll());
    } catch {
      return [];
    }
  }

  function saveRecord(name, record) {
    return store(name,"readwrite",objectStore => objectStore.put(record));
  }

  function getRecord(name, id) {
    return store(name,"readonly",objectStore => objectStore.get(id));
  }

  function removeRecord(name, id) {
    return store(name,"readwrite",objectStore => objectStore.delete(id));
  }

  function download(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href),500);
  }

  function localDateTime(date = new Date()) {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60000).toISOString().slice(0,16);
  }

  function formatDate(value) {
    if (!value) return "Date not added";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString([],{
      year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"
    });
  }

  function formatDuration(seconds = 0) {
    const whole = Math.max(0,Math.round(seconds));
    return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,"0")}`;
  }

  function safeFileName(value, fallback = "memory") {
    return String(value || fallback).replace(/[<>:"/\\|?*\u0000-\u001f]/g,"-").slice(0,80);
  }

  function requirePin() {
    return prompt("Enter the parent PIN to continue:") === BB.store.data.settings.parentPin;
  }

  function shell(title, subtitle, content, current = section) {
    const tabs = [
      ["hub","✨","Memory Home"],["voice","🎤","Voice Journey"],["timeline","🌈","Growth Timeline"],
      ["letters","💌","Future Letters"],["celebrate","🎂","Celebrations"],["growth","🌱","Growth Paths"]
    ];
    return `<section class="memory-page">
      ${BB.navigation.pageHead(title,subtitle,"parent")}
      <nav class="memory-tabs" aria-label="Grown-up memory features">${tabs.map(([id,icon,label]) =>
        `<button class="${current===id?"active":""}" type="button" data-memory-open="${id}">${icon} ${label}</button>`).join("")}</nav>
      ${content}
    </section>`;
  }

  async function open(next = "hub", options = {}) {
    if (!BB.app?.isParentUnlocked?.()) {
      BB.navigation.go("parent");
      return;
    }
    if (BB.navigation.current !== "memory") {
      if (options.withinRoute) return;
      BB.navigation.go("memory",{section:next});
      return;
    }
    const token=++renderToken;
    memoryViewActive=true;
    section = next;
    revokeUrls();
    const view = document.querySelector("#view");
    view.innerHTML = shell("Private Memory Studio","Loading this child’s private journey…",`<div class="panel memory-loading">💜 Gathering memories kept on this device…</div>`,next);
    const renderers = {
      hub:renderHub, voice:renderVoiceJourney, timeline:renderTimeline,
      letters:renderLetters, celebrate:renderCelebrations, growth:renderGrowthPaths
    };
    const content=await renderers[next]();
    if(token!==renderToken||!memoryViewActive||BB.navigation.current!=="memory"||!BB.app?.isParentUnlocked?.())return;
    view.innerHTML = content;
    view.focus({preventScroll:true});
    window.scrollTo({top:0,behavior:BB.store.data.settings.reducedMotion?"auto":"smooth"});
  }

  function revokeUrls() {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
  }

  function cancelView() {
    memoryViewActive=false;
    renderToken++;
    revokeUrls();
  }

  async function renderHub() {
    const voices = await list("voices");
    const letters = await list("letters");
    const milestones = voices.filter(item => item.milestone).length;
    const profile = activeProfile();
    const stage = stages.find(item => item.id === growthPathState().stage) || stages[0];
    const birthday = isBirthday(profile.birthDate);
    return shell("Private Memory Studio",`One continuous story for ${escapeHtml(profile.name)}—kept locally and controlled by caregivers.`,`
      ${birthday ? `<button class="birthday-banner" type="button" data-memory-open="celebrate">🎉 Happy Birthday, ${escapeHtml(profile.name)}! Your celebration is ready.</button>` : ""}
      <div class="privacy-banner"><span>🔒</span><div><strong>Private by default</strong><p>Voice Journey and letters stay on this device. Nothing is translated, decoded, diagnosed, uploaded, shared, advertised, analyzed, or used for AI training.</p></div></div>
      <div class="memory-card-grid">
        <button class="memory-feature-card voice" type="button" data-memory-open="voice"><span>🎤</span><div><h2>Voice Journey™</h2><p>Preserve meaningful sounds and caregiver-defined milestones.</p><strong>${voices.length} recordings · ${milestones} milestones</strong></div></button>
        <button class="memory-feature-card timeline" type="button" data-memory-open="timeline"><span>🌈</span><div><h2>Look How Far I’ve Come™</h2><p>A gentle timeline celebrating only this child’s own growth.</p><strong>${computedEvents().length + voices.length + letters.length} memories</strong></div></button>
        <button class="memory-feature-card letters" type="button" data-memory-open="letters"><span>💌</span><div><h2>Letters to My Future Self™</h2><p>Private messages, photos, achievements, and keepsakes.</p><strong>${letters.length} letters</strong></div></button>
        <button class="memory-feature-card growth" type="button" data-memory-open="growth"><span>${stage.icon}</span><div><h2>BrightBridge Growth Paths™</h2><p>Caregiver-controlled stages that never erase history.</p><strong>${stage.name}</strong></div></button>
      </div>
      <div class="panel memory-philosophy"><h3>Caregiver promise</h3><p>Voice Journey is a memory journal. BrightBridge never claims to understand, translate, decode, infer thoughts or emotions from, or diagnose a child’s vocalizations. Every title, tag, note, and milestone comes from the caregiver.</p></div>
    `,"hub");
  }

  function voiceForm() {
    return `<form class="memory-form" data-vj-form>
      <div class="form-grid">
        <label><span>Recording title *</span><input data-vj-title maxlength="80" placeholder='First “Mama”' required></label>
        <label><span>Date and time *</span><input type="datetime-local" data-vj-date value="${localDateTime()}" required></label>
        <label><span>Child age</span><input data-vj-age maxlength="30" placeholder="3 years, 2 months"></label>
        <label><span>Tags</span><input data-vj-tags list="voice-journey-tags" maxlength="160" placeholder="Happy, Practicing, Family"></label>
      </div>
      <datalist id="voice-journey-tags">${defaultTags.map(tag=>`<option value="${tag}">`).join("")}</datalist>
      <label><span>Optional notes</span><textarea data-vj-notes rows="3" maxlength="1000" placeholder="What made this moment meaningful?"></textarea></label>
      <div class="form-grid compact">
        <label class="check-row"><input type="checkbox" data-vj-milestone> Mark as caregiver-defined milestone</label>
        <label><span>Milestone name</span><input data-vj-milestone-label list="voice-milestone-ideas" maxlength="80" placeholder="First Vocal Imitation"></label>
        <label class="check-row"><input type="checkbox" data-vj-favorite> Favorite recording</label>
        <label class="check-row"><input type="checkbox" data-vj-replay> Include in anniversary replay</label>
      </div>
      <datalist id="voice-milestone-ideas"><option value="First Vocal Imitation"><option value="First Consonant"><option value="First Recognizable Word"><option value="New Sound"><option value="First Song"><option value="Favorite Recording"><option value="Big Milestone"><option value="Personal Achievement"></datalist>
      <div class="voice-capture">
        <label class="secondary-button">Choose audio file<input class="sr-only" type="file" accept="audio/*" data-vj-file></label>
        <button class="primary-button" type="button" data-vj-record>⏺ Record a short clip</button>
        <button class="danger-button" type="button" data-vj-stop hidden>■ Stop and save</button>
        <span class="muted" data-vj-status>Audio stays on this device unless a caregiver exports it.</span>
      </div>
    </form>`;
  }

  async function filteredVoices() {
    let voices = await list("voices");
    const query = voiceFilters.query.trim().toLowerCase();
    if (query) voices = voices.filter(item => [
      item.title,item.age,item.notes,item.milestoneLabel,(item.tags||[]).join(" "),item.dateTime,formatDate(item.dateTime)
    ].join(" ").toLowerCase().includes(query));
    const sorters = {
      newest:(a,b)=>new Date(b.dateTime)-new Date(a.dateTime),
      oldest:(a,b)=>new Date(a.dateTime)-new Date(b.dateTime),
      age:(a,b)=>String(a.age||"").localeCompare(String(b.age||"")),
      milestones:(a,b)=>Number(b.milestone)-Number(a.milestone)||new Date(b.dateTime)-new Date(a.dateTime),
      tags:(a,b)=>String(a.tags?.[0]||"").localeCompare(String(b.tags?.[0]||"")),
      favorites:(a,b)=>Number(b.favorite)-Number(a.favorite)||new Date(b.dateTime)-new Date(a.dateTime)
    };
    return voices.sort(sorters[voiceFilters.sort] || sorters.newest);
  }

  async function renderVoiceJourney() {
    const voices = await filteredVoices();
    return shell("Voice Journey™","A private, caregiver-authored journal of meaningful vocal moments.",`
      <div class="privacy-banner compact"><span>🎤</span><div><strong>Memories, not interpretations</strong><p>Recordings are organized only by details a caregiver enters. BrightBridge does not translate or infer meaning from sounds.</p></div></div>
      <details class="memory-details" open><summary>Add a Voice Journey recording</summary>${voiceForm()}</details>
      <div class="memory-toolbar">
        <label class="search-field"><span class="sr-only">Search recordings</span><input data-vj-search value="${escapeHtml(voiceFilters.query)}" placeholder="Search title, date, age, tags, milestone, or notes"></label>
        <label><span class="sr-only">Sort recordings</span><select data-vj-sort>
          ${[["newest","Newest"],["oldest","Oldest"],["age","Age"],["milestones","Milestones"],["tags","Tags"],["favorites","Favorites"]].map(([value,label])=>`<option value="${value}" ${voiceFilters.sort===value?"selected":""}>${label}</option>`).join("")}
        </select></label>
        <button class="secondary-button" type="button" data-vj-compare>Compare two</button>
        <button class="secondary-button" type="button" data-vj-export-selected>ZIP selected</button>
      </div>
      <div class="voice-timeline">${voices.length ? voices.map(voiceCard).join("") : `<div class="panel empty-memory"><span>🎙️</span><h2>Your first recording will begin the timeline</h2><p>Try “Morning Babble,” “Story Time,” or any title meaningful to your family.</p></div>`}</div>
      <div class="flash-actions"><button class="secondary-button" type="button" data-memory-print="milestones">Milestone summary PDF</button><button class="secondary-button" type="button" data-memory-print="voice-timeline">Timeline summary PDF</button></div>
    `,"voice");
  }

  function voiceCard(item) {
    const url = URL.createObjectURL(item.blob);
    objectUrls.push(url);
    return `<article class="voice-memory-card ${item.milestone?"is-milestone":""}">
      <label class="memory-select"><input type="checkbox" data-vj-select="${item.id}"><span class="sr-only">Select ${escapeHtml(item.title)}</span></label>
      <div class="voice-memory-heading"><div><p class="eyebrow">${item.milestone?"⭐ "+escapeHtml(item.milestoneLabel||"Milestone"):"Voice memory"}</p><h3>${item.favorite?"💜 ":""}${escapeHtml(item.title)}</h3><p>${formatDate(item.dateTime)} · Age ${escapeHtml(item.age||"not added")} · ${formatDuration(item.duration)}</p></div></div>
      <audio controls preload="metadata" src="${url}"></audio>
      ${item.notes?`<p class="voice-notes">${escapeHtml(item.notes)}</p>`:""}
      <div class="tag-list">${(item.tags||[]).map(tag=>`<span>${escapeHtml(tag)}</span>`).join("")}${item.replay?`<span>🎞️ Replay</span>`:""}</div>
      <div class="memory-actions">
        <button class="compact-button" type="button" data-vj-favorite-toggle="${item.id}" aria-label="Toggle favorite">${item.favorite?"💜":"♡"}</button>
        <button class="compact-button" type="button" data-vj-download="${item.id}" aria-label="Download audio">⬇️ Audio</button>
        <button class="compact-button" type="button" data-vj-summary="${item.id}" aria-label="Export recording summary">PDF</button>
        <button class="compact-button danger-lite" type="button" data-vj-delete="${item.id}" aria-label="Delete recording">🗑️</button>
      </div>
    </article>`;
  }

  function formVoiceMetadata() {
    return {
      title:document.querySelector("[data-vj-title]")?.value.trim(),
      dateTime:document.querySelector("[data-vj-date]")?.value,
      age:document.querySelector("[data-vj-age]")?.value.trim(),
      tags:(document.querySelector("[data-vj-tags]")?.value||"").split(",").map(tag=>tag.trim()).filter(Boolean),
      notes:document.querySelector("[data-vj-notes]")?.value.trim(),
      milestone:document.querySelector("[data-vj-milestone]")?.checked || false,
      milestoneLabel:document.querySelector("[data-vj-milestone-label]")?.value.trim(),
      favorite:document.querySelector("[data-vj-favorite]")?.checked || false,
      replay:document.querySelector("[data-vj-replay]")?.checked || false
    };
  }

  function validVoiceMeta(meta) {
    if (!meta.title || !meta.dateTime) {
      BB.app.toast("Add a title and date before saving.");
      return false;
    }
    if (meta.milestone && !meta.milestoneLabel) meta.milestoneLabel = "Personal Achievement";
    return true;
  }

  async function mediaDuration(blob) {
    return new Promise(resolve => {
      const audio = document.createElement("audio");
      const url = URL.createObjectURL(blob);
      audio.preload = "metadata";
      audio.onloadedmetadata = () => { const value = Number.isFinite(audio.duration)?audio.duration:0;URL.revokeObjectURL(url);resolve(value); };
      audio.onerror = () => { URL.revokeObjectURL(url);resolve(0); };
      audio.src = url;
    });
  }

  async function saveVoice(blob, duration) {
    const meta = formVoiceMetadata();
    if (!validVoiceMeta(meta)) return;
    if (!blob || !blob.type.startsWith("audio/") || blob.size > 25*1024*1024) {
      BB.app.toast("Use an audio clip smaller than 25 MB.");
      return;
    }
    const record = {
      id:`voice-${Date.now()}`, profileId:BB.store.data.activeProfile, ...meta,
      duration:duration || await mediaDuration(blob), type:blob.type || "audio/webm",
      size:blob.size, blob, createdAt:new Date().toISOString()
    };
    await saveRecord("voices",record);
    track("voice","First Voice Journey recording",{icon:"🎤",detail:record.title,onceKey:"first-voice"});
    if (record.milestone) track("milestone",record.milestoneLabel,{icon:"🏆",detail:record.title,onceKey:`voice-milestone-${record.id}`});
    BB.app.toast("Voice Journey memory saved privately.");
    await open("voice");
  }

  async function uploadVoice(file) {
    if (!file) return;
    await saveVoice(file,await mediaDuration(file));
  }

  async function startRecording() {
    const meta = formVoiceMetadata();
    if (!validVoiceMeta(meta)) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      BB.app.toast("Recording is unavailable here. Choose an audio file instead.");
      return;
    }
    try {
      voiceStream = await navigator.mediaDevices.getUserMedia({audio:true});
      const preferred = ["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      voiceRecorder = preferred ? new MediaRecorder(voiceStream,{mimeType:preferred}) : new MediaRecorder(voiceStream);
      voiceChunks = [];
      voiceStarted = Date.now();
      voiceRecorder.ondataavailable = event => { if(event.data.size) voiceChunks.push(event.data); };
      voiceRecorder.onstop = async () => {
        const duration = (Date.now()-voiceStarted)/1000;
        const blob = new Blob(voiceChunks,{type:voiceRecorder.mimeType||"audio/webm"});
        voiceStream?.getTracks().forEach(track=>track.stop());
        voiceStream = null;
        await saveVoice(blob,duration);
      };
      voiceRecorder.start();
      document.querySelector("[data-vj-record]").hidden = true;
      document.querySelector("[data-vj-stop]").hidden = false;
      document.querySelector("[data-vj-status]").innerHTML = '<i class="recording-light"></i> Recording… tap Stop when this memory is complete.';
    } catch {
      BB.app.toast("Microphone access was unavailable. You can choose an audio file.");
    }
  }

  function stopRecording() {
    if (voiceRecorder?.state === "recording") voiceRecorder.stop();
  }

  async function compareVoices() {
    const voices = (await list("voices")).sort((a,b)=>new Date(a.dateTime)-new Date(b.dateTime));
    if (voices.length < 2) {
      BB.app.toast("Save at least two recordings to compare.");
      return;
    }
    const first = voices[0], second = voices[voices.length-1];
    document.querySelector("#view").innerHTML = shell("Voice Comparison","Listen side-by-side without scoring, labeling, or interpreting.",`
      <div class="privacy-banner compact"><span>↔️</span><div><strong>Compare memories, never children</strong><p>This view only displays caregiver-entered information and audio. It makes no judgment about development.</p></div></div>
      <div class="compare-selects">${["left","right"].map((side,index)=>`<label><span>${index?"Recording two":"Recording one"}</span><select data-compare-${side}>${voices.map((voice,i)=>`<option value="${voice.id}" ${(index?i===voices.length-1:i===0)?"selected":""}>${escapeHtml(voice.title)} — ${escapeHtml(voice.age||formatDate(voice.dateTime))}</option>`).join("")}</select></label>`).join("")}</div>
      <div class="comparison-grid" data-comparison-grid>${comparisonCard(first,"Earlier memory")}${comparisonCard(second,"Later memory")}</div>
    `,"voice");
    await refreshComparison();
  }

  function comparisonCard(record, label) {
    if (!record) return `<article class="panel"><p>Choose a recording.</p></article>`;
    const url = URL.createObjectURL(record.blob); objectUrls.push(url);
    return `<article class="comparison-card"><p class="eyebrow">${label}</p><h2>${escapeHtml(record.title)}</h2><audio controls src="${url}"></audio><dl>
      <div><dt>Date</dt><dd>${formatDate(record.dateTime)}</dd></div><div><dt>Age</dt><dd>${escapeHtml(record.age||"Not added")}</dd></div>
      <div><dt>Duration</dt><dd>${formatDuration(record.duration)}</dd></div><div><dt>Milestone</dt><dd>${escapeHtml(record.milestoneLabel||"Not marked")}</dd></div>
      <div><dt>Tags</dt><dd>${escapeHtml((record.tags||[]).join(", ")||"None")}</dd></div><div><dt>Notes</dt><dd>${escapeHtml(record.notes||"None")}</dd></div>
    </dl></article>`;
  }

  async function refreshComparison() {
    const left = await getRecord("voices",document.querySelector("[data-compare-left]")?.value);
    const right = await getRecord("voices",document.querySelector("[data-compare-right]")?.value);
    revokeUrls();
    const grid = document.querySelector("[data-comparison-grid]");
    if (grid) grid.innerHTML = comparisonCard(left,"Recording one") + comparisonCard(right,"Recording two");
  }

  function track(type, title, options = {}) {
    const state = memoryState();
    const onceKey = options.onceKey || "";
    if (onceKey && state.events.some(event => event.profileId===BB.store.data.activeProfile && event.onceKey===onceKey)) return;
    state.events.push({
      id:`event-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      profileId:BB.store.data.activeProfile,type,title,detail:options.detail||"",
      icon:options.icon||"⭐",onceKey,date:options.date||new Date().toISOString()
    });
    BB.store.save();
  }

  function computedEvents() {
    const data = BB.store.data;
    const profileId = data.activeProfile;
    const events = memoryState().events.filter(item=>item.profileId===profileId);
    if (data.flowers > 0 && !events.some(item=>item.onceKey==="first-flower")) events.push({id:"computed-flower",profileId,type:"reward",title:"First flower grown",detail:`${data.flowers} flowers now growing`,icon:"🌸",onceKey:"first-flower",date:new Date().toISOString()});
    if (data.butterflies > 0 && !events.some(item=>item.onceKey==="first-butterfly")) events.push({id:"computed-butterfly",profileId,type:"reward",title:"First butterfly earned",detail:`${data.butterflies} butterflies earned`,icon:"🦋",onceKey:"first-butterfly",date:new Date().toISOString()});
    return events;
  }

  async function timelineItems() {
    const voices = await list("voices");
    const letters = await list("letters");
    return [
      ...computedEvents(),
      ...voices.map(item=>({id:item.id,type:"voice",title:item.title,detail:item.milestoneLabel||item.notes||"Voice Journey recording",icon:item.milestone?"🏆":"🎤",date:item.dateTime})),
      ...letters.map(item=>({id:item.id,type:"letter",title:item.title,detail:`Letter by ${item.author}`,icon:"💌",date:item.date}))
    ].sort((a,b)=>new Date(b.date)-new Date(a.date));
  }

  async function renderTimeline() {
    const items = await timelineItems();
    const data = BB.store.data;
    return shell("Look How Far I’ve Come™","A celebration of this child’s own journey—never a comparison.",`
      <div class="journey-summary">
        <div><span>🌸</span><strong>${data.flowers}</strong><small>flowers grown</small></div>
        <div><span>🦋</span><strong>${data.butterflies}</strong><small>butterflies earned</small></div>
        <div><span>📚</span><strong>${Object.values(data.progress).reduce((sum,value)=>sum+value,0)}</strong><small>activities completed</small></div>
        <div><span>💬</span><strong>${Object.values(data.wordUse).reduce((sum,value)=>sum+value,0)}</strong><small>cards used</small></div>
      </div>
      <div class="growth-timeline">${items.length ? items.map(item=>`<article class="timeline-memory"><span>${item.icon}</span><div><time>${formatDate(item.date)}</time><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.detail||"A meaningful moment")}</p></div></article>`).join("") : `<div class="panel empty-memory"><span>🌱</span><h2>This journey is ready to grow</h2><p>First moments will appear automatically as BrightBridge is used.</p></div>`}</div>
      <div class="flash-actions"><button class="primary-button" type="button" data-memory-print="full-timeline">Save timeline as PDF</button><button class="secondary-button" type="button" data-memory-slideshow>Play Journey Through Time</button></div>
    `,"timeline");
  }

  function sanitizeRichText(html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    const allowed = new Set(["B","STRONG","I","EM","U","P","BR","UL","OL","LI"]);
    [...template.content.querySelectorAll("*")].forEach(node => {
      if (!allowed.has(node.tagName)) node.replaceWith(...node.childNodes);
      else [...node.attributes].forEach(attribute=>node.removeAttribute(attribute.name));
    });
    return template.innerHTML.slice(0,20000);
  }

  async function renderLetters() {
    const letters = (await list("letters")).sort((a,b)=>new Date(b.date)-new Date(a.date));
    const voices = await list("voices");
    return shell("Letters to My Future Self™","A private digital time capsule of love, encouragement, and memories.",`
      <div class="privacy-banner compact"><span>💌</span><div><strong>Caregiver-controlled access</strong><p>Letters never auto-open or send. They stay local and private until a caregiver chooses to read or export them.</p></div></div>
      <details class="memory-details"><summary>Write a new letter</summary>
        <form class="memory-form" data-letter-form>
          <div class="form-grid">
            <label><span>Title *</span><input data-letter-title maxlength="100" required></label>
            <label><span>Date *</span><input type="date" data-letter-date value="${new Date().toISOString().slice(0,10)}" required></label>
            <label><span>Child’s age</span><input data-letter-age maxlength="30" placeholder="5 years"></label>
            <label><span>Author *</span><input data-letter-author maxlength="80" placeholder="Mom, Grandpa, Teacher…" required></label>
            <label><span>Future reading</span><select data-letter-unlock><option>Read Anytime</option><option>Read Next Birthday</option><option>Read at Age 10</option><option>Read at Age 13</option><option>Read at Age 18</option><option>Never Auto-Open</option></select></label>
            <label><span>Optional photo</span><input type="file" accept="image/*" data-letter-photo></label>
            <label><span>Optional Voice Journey memory</span><select data-letter-voice><option value="">No voice attached</option>${voices.map(item=>`<option value="${item.id}">${escapeHtml(item.title)}</option>`).join("")}</select></label>
            <label><span>Optional achievement links</span><input data-letter-achievements maxlength="250" placeholder="First word, Garden Friend…"></label>
            <label><span>Other memory attachments</span><input data-letter-memories maxlength="400" placeholder="Drawing, favorite song, AAC phrase, birthday…"></label>
          </div>
          <label class="check-row"><input type="checkbox" data-letter-garden> Attach today’s Reward Garden snapshot</label>
          <label><span>Optional My Day Replay summary</span><textarea data-letter-day rows="2" maxlength="1000"></textarea></label>
          <label><span>Choose a writing idea</span><select data-letter-prompt><option value="">Start from a blank page</option>${letterPrompts.map(prompt=>`<option>${escapeHtml(prompt)}</option>`).join("")}</select></label>
          <div class="rich-toolbar" aria-label="Text formatting">
            <button type="button" data-rich-command="bold"><b>B</b></button><button type="button" data-rich-command="italic"><i>I</i></button>
            <button type="button" data-rich-command="underline"><u>U</u></button><button type="button" data-rich-command="insertUnorderedList">• List</button>
          </div>
          <div class="letter-editor" contenteditable="true" data-letter-body aria-label="Letter text"></div>
          <button class="primary-button" type="button" data-letter-save>Save private letter</button>
        </form>
      </details>
      <div class="letter-grid">${letters.length ? letters.map(item=>`<article class="letter-card">
        ${item.photo ? `<img src="${rememberUrl(item.photo)}" alt="">` : `<div class="letter-seal">💌</div>`}
        <p class="eyebrow">${escapeHtml(item.unlockRule)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.author)} · ${escapeHtml(item.age||"Age not added")} · ${formatDate(item.date)}</p>
        <div class="tag-list">${item.voiceId?`<span>🎤 Voice attached</span>`:""}${item.garden?`<span>🌸 Garden snapshot</span>`:""}${item.achievements?.length?`<span>🏆 Achievements</span>`:""}${item.memories?.length?`<span>✨ Memories</span>`:""}</div>
        <div class="memory-actions"><button class="compact-button" type="button" data-letter-read="${item.id}">Read</button><button class="compact-button" type="button" data-letter-export="${item.id}">PDF</button><button class="compact-button danger-lite" type="button" data-letter-delete="${item.id}">🗑️</button></div>
      </article>`).join("") : `<div class="panel empty-memory"><span>💌</span><h2>A loving message can begin here</h2><p>Letters remain locked and private until a caregiver chooses to share them.</p></div>`}</div>
      <div class="flash-actions"><button class="primary-button" type="button" data-memory-keepsake>Generate Keepsake Book</button></div>
    `,"letters");
  }

  function rememberUrl(blob) {
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    return url;
  }

  async function saveLetter() {
    const title=document.querySelector("[data-letter-title]")?.value.trim();
    const date=document.querySelector("[data-letter-date]")?.value;
    const author=document.querySelector("[data-letter-author]")?.value.trim();
    if (!title || !date || !author) { BB.app.toast("Add a title, date, and author.");return; }
    const photo=document.querySelector("[data-letter-photo]")?.files[0]||null;
    if (photo && (!photo.type.startsWith("image/") || photo.size>8*1024*1024)) {BB.app.toast("Use a photo smaller than 8 MB.");return;}
    const data=BB.store.data;
    const record={
      id:`letter-${Date.now()}`,profileId:data.activeProfile,title,date,
      age:document.querySelector("[data-letter-age]").value.trim(),author,
      unlockRule:document.querySelector("[data-letter-unlock]").value,
      voiceId:document.querySelector("[data-letter-voice]").value,
      achievements:document.querySelector("[data-letter-achievements]").value.split(",").map(item=>item.trim()).filter(Boolean),
      memories:document.querySelector("[data-letter-memories]").value.split(",").map(item=>item.trim()).filter(Boolean),
      garden:document.querySelector("[data-letter-garden]").checked?{stars:data.stars,flowers:data.flowers,butterflies:data.butterflies}:null,
      dayReplay:document.querySelector("[data-letter-day]").value.trim(),
      body:sanitizeRichText(document.querySelector("[data-letter-body]").innerHTML),photo,createdAt:new Date().toISOString()
    };
    await saveRecord("letters",record);
    track("letter","First future letter written",{icon:"💌",detail:record.title,onceKey:"first-letter"});
    BB.app.toast("Private letter saved.");
    await open("letters");
  }

  async function readLetter(id, print = false) {
    const letter=await getRecord("letters",id);
    if (!letter) return;
    const body=`<article class="print-letter"><p>${escapeHtml(letter.date)} · Age ${escapeHtml(letter.age||"not added")}</p><h1>${escapeHtml(letter.title)}</h1><p><strong>From ${escapeHtml(letter.author)}</strong></p>${letter.body||"<p></p>"}
      ${letter.dayReplay?`<h2>My Day Replay</h2><p>${escapeHtml(letter.dayReplay)}</p>`:""}
      ${letter.achievements?.length?`<h2>Achievements remembered</h2><p>${escapeHtml(letter.achievements.join(", "))}</p>`:""}
      ${letter.memories?.length?`<h2>Memory attachments</h2><p>${escapeHtml(letter.memories.join(", "))}</p>`:""}
      ${letter.garden?`<h2>Reward Garden snapshot</h2><p>${letter.garden.stars} stars · ${letter.garden.flowers} flowers · ${letter.garden.butterflies} butterflies</p>`:""}
      <p><em>Future reading choice: ${escapeHtml(letter.unlockRule)}</em></p></article>`;
    if (print) { printHtml(letter.title,body);return; }
    BB.app.modal(`<div class="modal-head"><h2>${escapeHtml(letter.title)}</h2><button class="close-button" type="button" data-action="close-modal">×</button></div>${body}<button class="primary-button" type="button" data-letter-export="${letter.id}">Save as PDF</button>`,"Private future letter");
  }

  function ageFromBirthDate(value) {
    if (!value) return null;
    const birth=new Date(`${value}T12:00:00`), now=new Date();
    if(Number.isNaN(birth.getTime()))return null;
    let age=now.getFullYear()-birth.getFullYear();
    if(now < new Date(now.getFullYear(),birth.getMonth(),birth.getDate())) age--;
    return Math.max(0,age);
  }

  function suggestedStage(age) {
    if(age===null)return null;
    return age<5?"early-explorer":age<9?"growing-learner":age<13?"independent-communicator":"teen-young-adult";
  }

  function applyGrowthPath() {
    const path=growthPathState();
    const profile=activeProfile();
    let changed=false;
    if(path.automatic&&!path.locked){
      const suggestion=suggestedStage(ageFromBirthDate(profile.birthDate));
      if(suggestion&&path.stage!==suggestion){path.stage=suggestion;changed=true;}
    }
    document.body.dataset.growthStage=path.stage;
    document.body.classList.toggle("mature-content",!!path.matureContent);
    Object.entries(path.enabledFeatures).forEach(([feature,on])=>document.body.classList.toggle(`feature-disabled-${feature}`,!on));
    if(changed)BB.store.save();
  }

  function stageVocabulary() {
    const stage=growthPathState().stage;
    const vocabulary={
      "early-explorer":[["Look with me","👀"],["Listen with me","👂"],["Again please","🔁"],["My favorite","💜"]],
      "growing-learner":[["I can read","📖"],["I can count","🔢"],["What comes next?","➡️"],["I need a schedule","📅"],["Let’s practice","🌱"],["I have homework","📝"]],
      "independent-communicator":[["I have a goal","🎯"],["I need a quiet place","🤫"],["I need more time","⏳"],["Can you explain?","💡"],["I want to write","✍️"],["Let’s solve it","🧩"]],
      "teen-young-adult":[["I can speak up for myself","📣"],["I have an appointment","📆"],["I need transportation","🚌"],["I want to apply","📄"],["Let’s check my budget","💵"],["My future goal","✨"]]
    };
    return vocabulary[stage]||vocabulary["early-explorer"];
  }

  function homeBanner() {
    const stage=stages.find(item=>item.id===growthPathState().stage)||stages[0];
    return `<div class="growth-home-banner"><span>${stage.icon}</span><div><p class="eyebrow">My BrightBridge Growth Path</p><strong>${stage.name}</strong><small>${stage.focus}</small></div></div>`;
  }

  async function renderGrowthPaths() {
    const path=growthPathState();
    const profile=activeProfile();
    const age=ageFromBirthDate(profile.birthDate);
    return shell("BrightBridge Growth Paths™","The experience grows with the child while every memory and achievement stays intact.",`
      <div class="privacy-banner compact"><span>🌱</span><div><strong>Caregiver-controlled growth</strong><p>Stages may follow age or be chosen independently. Changing a stage never deletes Voice Journey, letters, rewards, progress, or communication history.</p></div></div>
      <div class="setting-group"><h3>Child birthday and progression</h3>
        <label class="setting-row"><span><strong>Birthday</strong><small>Used only on this device for optional age progression and celebrations.</small></span><input class="select" type="date" data-profile-birth value="${escapeHtml(profile.birthDate||"")}"></label>
        <label class="setting-row"><span><strong>Automatic age suggestion</strong><small>${age===null?"Add a birthday to use this option.":`Current age: ${age}`}</small></span><button class="switch ${path.automatic?"on":""}" type="button" role="switch" aria-checked="${path.automatic}" data-growth-toggle="automatic"><i></i></button></label>
        <label class="setting-row"><span><strong>Lock current stage</strong><small>Prevents automatic progression until unlocked.</small></span><button class="switch ${path.locked?"on":""}" type="button" role="switch" aria-checked="${path.locked}" data-growth-toggle="locked"><i></i></button></label>
        <label class="setting-row"><span><strong>Caregiver-approved mature content</strong><small>Allows teen life-skills topics. Off by default.</small></span><button class="switch ${path.matureContent?"on":""}" type="button" role="switch" aria-checked="${path.matureContent}" data-growth-toggle="matureContent"><i></i></button></label>
      </div>
      <div class="stage-grid">${stages.map((stage,index)=>`<article class="stage-card ${path.stage===stage.id?"active":""}">
        <span>${stage.icon}</span><p class="eyebrow">Stage ${index+1}</p><h2>${stage.name}</h2><strong>${stage.ages}</strong><p>${stage.focus}</p>
        <div class="memory-actions"><button class="${path.stage===stage.id?"primary-button":"secondary-button"}" type="button" data-growth-stage="${stage.id}">${path.stage===stage.id?"Current stage":"Choose stage"}</button><button class="compact-button" type="button" data-growth-preview="${stage.id}">Preview</button></div>
      </article>`).join("")}</div>
      <details class="memory-details"><summary>Customize available child features</summary><div class="feature-toggle-grid">${Object.entries(path.enabledFeatures).map(([key,on])=>`<label class="check-row"><input type="checkbox" data-growth-feature="${key}" ${on?"checked":""}> ${key[0].toUpperCase()+key.slice(1)}</label>`).join("")}</div></details>
      <div class="panel preservation-list"><h3>Always preserved</h3><p>🎤 Voice Journey · 💌 Future Letters · 🌸 Reward Garden · 📈 My Progress · 🌈 Memory Timeline · 💬 Communication history · 📚 Learning achievements · 🎂 Birthday celebrations · ✨ Keepsake memories</p></div>
    `,"growth");
  }

  function birthdayStats() {
    const data=BB.store.data;
    return {
      flowers:data.flowers,butterflies:data.butterflies,
      activities:Object.values(data.progress).reduce((sum,value)=>sum+value,0),
      cards:Object.values(data.wordUse).reduce((sum,value)=>sum+value,0),
      recordings:0
    };
  }

  function isBirthday(value) {
    if(!value)return false;
    const birth=new Date(`${value}T12:00:00`),today=new Date();
    return birth.getMonth()===today.getMonth()&&birth.getDate()===today.getDate();
  }

  async function celebrationData() {
    const profile=activeProfile();
    const totals=birthdayStats();
    totals.recordings=(await list("voices")).length;
    const year=new Date().getFullYear();
    const snapshots=memoryState().birthdaySnapshots.filter(item=>item.profileId===profile.id).sort((a,b)=>b.year-a.year);
    const previous=snapshots.find(item=>item.year<year);
    const stats={};
    Object.keys(totals).forEach(key=>stats[key]=Math.max(0,totals[key]-(previous?.totals?.[key]||0)));
    if(isBirthday(profile.birthDate)&&!snapshots.some(item=>item.year===year)){
      memoryState().birthdaySnapshots.push({profileId:profile.id,year,date:new Date().toISOString(),totals});
      BB.store.save();
    }
    return {profile,stats};
  }

  async function renderCelebrations() {
    const {profile,stats}=await celebrationData();
    return shell("Celebrations & Replays","Save birthdays and annual journeys as private family keepsakes.",`
      <div class="birthday-keepsake">
        <div class="birthday-sparkles" aria-hidden="true">⭐ 🌸 🦋 ✨</div>
        <p class="eyebrow">${isBirthday(profile.birthDate)?"Today is a special day":"Birthday keepsake preview"}</p>
        <h1>Happy Birthday, ${escapeHtml(profile.name)}!</h1><p class="lead">Look how much you’ve grown in your own wonderful way.</p>
        <div class="celebration-list"><p>🌸 Grew <strong>${stats.flowers}</strong> flowers</p><p>🦋 Earned <strong>${stats.butterflies}</strong> butterflies</p><p>📚 Completed <strong>${stats.activities}</strong> learning activities</p><p>💬 Used <strong>${stats.cards}</strong> communication cards</p><p>🎤 Preserved <strong>${stats.recordings}</strong> Voice Journey memories</p></div>
        <p><strong>Every step belongs to your story. Look how far you’ve come!</strong></p>
      </div>
      <div class="flash-actions"><button class="primary-button" type="button" data-birthday-export="pdf">Save PDF</button><button class="secondary-button" type="button" data-birthday-export="image">Save image</button><button class="secondary-button" type="button" data-memory-slideshow>Play keepsake slideshow</button></div>
      <div class="panel anniversary-panel"><h2>Journey Through Time</h2><p>Create an anniversary replay from caregiver-selected Voice Journey recordings, learning milestones, Reward Garden growth, communication moments, letters, notes, and achievements. The slideshow uses calming transitions and optional soft music.</p><button class="primary-button" type="button" data-memory-slideshow>Start anniversary replay</button></div>
    `,"celebrate");
  }

  async function startSlideshow() {
    const voices=(await list("voices")).filter(item=>item.replay);
    const letters=await list("letters");
    const timeline=await timelineItems();
    slideItems=[
      ...timeline.slice().reverse().map(item=>({title:item.title,detail:item.detail,icon:item.icon,date:item.date})),
      ...voices.map(item=>({title:item.title,detail:"A caregiver-selected Voice Journey memory",icon:"🎤",date:item.dateTime,voiceId:item.id})),
      ...letters.filter(item=>item.photo).map(item=>({title:item.title,detail:`A photo memory from ${item.author}`,icon:"📷",date:item.date,photo:item.photo}))
    ];
    if(!slideItems.length)slideItems=[{title:"Your journey begins here",detail:"Every meaningful moment can become part of this private story.",icon:"🌱",date:new Date().toISOString()}];
    slideIndex=0;
    BB.app.modal(`<div class="slideshow" data-slideshow-stage></div><div class="slideshow-controls"><button class="secondary-button" type="button" data-slide-prev>← Previous</button><button class="secondary-button" type="button" data-slide-music>♫ Soft music</button><button class="primary-button" type="button" data-slide-next>Next →</button><button class="close-button" type="button" data-action="close-modal" aria-label="Close slideshow">×</button></div>`,"Journey Through Time");
    renderSlide();
  }

  async function renderSlide() {
    const item=slideItems[slideIndex],target=document.querySelector("[data-slideshow-stage]");
    if(!target)return;
    let audio="";
    if(item.voiceId){
      const record=await getRecord("voices",item.voiceId);
      if(record){const url=rememberUrl(record.blob);audio=`<audio controls src="${url}"></audio>`;}
    }
    const photo=item.photo?`<img class="slide-photo" src="${rememberUrl(item.photo)}" alt="">`:"";
    target.innerHTML=`${photo}<div class="slide-icon">${item.icon}</div><p class="eyebrow">Memory ${slideIndex+1} of ${slideItems.length}</p><h1>${escapeHtml(item.title)}</h1><p class="lead">${escapeHtml(item.detail||"A meaningful part of this journey")}</p><time>${formatDate(item.date)}</time>${audio}`;
  }

  function printHtml(title,body) {
    const printWindow=window.open("","_blank");
    if(!printWindow){BB.app.toast("Allow pop-ups to save this PDF.");return;}
    printWindow.opener=null;
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:40px auto;color:#26334c;line-height:1.55}h1{color:#7055b8}article{break-inside:avoid;border-bottom:1px solid #ddd;padding:18px 0}.print-cover{text-align:center;padding:80px 20px}.print-cover div{font-size:72px}.tag{display:inline-block;padding:4px 9px;border-radius:99px;background:#eee8fc;margin:3px}@media print{button{display:none}}</style></head><body>${body}<script>setTimeout(()=>window.print(),250)<\/script></body></html>`);
    printWindow.document.close();
  }

  async function printSummary(kind,id) {
    if(!requirePin()){BB.app.toast("That PIN did not match.");return;}
    const profile=activeProfile();
    if(id){
      const item=await getRecord("voices",id);
      if(item)printHtml(item.title,`<div class="print-cover"><div>🎤</div><h1>${escapeHtml(item.title)}</h1><p>Voice Journey™ private memory</p></div>${voicePrintCard(item)}`);
      return;
    }
    if(kind==="milestones"||kind==="voice-timeline"){
      let voices=(await list("voices")).sort((a,b)=>new Date(a.dateTime)-new Date(b.dateTime));
      if(kind==="milestones")voices=voices.filter(item=>item.milestone);
      printHtml(kind==="milestones"?"Milestone Summary":"Voice Journey Timeline",`<h1>${escapeHtml(profile.name)} — ${kind==="milestones"?"Milestone Summary":"Voice Journey Timeline"}</h1><p>Caregiver-authored memories. No vocalizations were translated, interpreted, or diagnosed.</p>${voices.map(voicePrintCard).join("")||"<p>No matching memories yet.</p>"}`);
      return;
    }
    const items=await timelineItems();
    printHtml("Look How Far I’ve Come",`<h1>${escapeHtml(profile.name)} — Look How Far I’ve Come™</h1><p>This timeline celebrates only this child’s own journey.</p>${items.slice().reverse().map(item=>`<article><h2>${item.icon} ${escapeHtml(item.title)}</h2><p>${formatDate(item.date)} · ${escapeHtml(item.detail||"")}</p></article>`).join("")}`);
  }

  function voicePrintCard(item) {
    return `<article><h2>${item.milestone?"⭐ ":""}${escapeHtml(item.title)}</h2><p>${formatDate(item.dateTime)} · Age ${escapeHtml(item.age||"not added")} · ${formatDuration(item.duration)}</p><p>${escapeHtml(item.notes||"")}</p><p>${(item.tags||[]).map(tag=>`<span class="tag">${escapeHtml(tag)}</span>`).join("")}</p>${item.milestone?`<p><strong>Caregiver-defined milestone:</strong> ${escapeHtml(item.milestoneLabel)}</p>`:""}</article>`;
  }

  async function exportSelectedZip() {
    if(!requirePin()){BB.app.toast("That PIN did not match.");return;}
    const ids=[...document.querySelectorAll("[data-vj-select]:checked")].map(input=>input.dataset.vjSelect);
    if(!ids.length){BB.app.toast("Select one or more recordings first.");return;}
    const records=(await Promise.all(ids.map(id=>getRecord("voices",id)))).filter(Boolean);
    const entries=[];
    entries.push({name:"Voice Journey metadata.json",data:new TextEncoder().encode(JSON.stringify(records.map(({blob,...record})=>record),null,2))});
    for(const record of records)entries.push({name:`audio/${safeFileName(record.title)}.${audioExtension(record.type)}`,data:new Uint8Array(await record.blob.arrayBuffer())});
    download(createZip(entries),`brightbridge-voice-journey-${new Date().toISOString().slice(0,10)}.zip`);
  }

  function audioExtension(type="") {
    return type.includes("mp4")||type.includes("m4a")?"m4a":type.includes("mpeg")?"mp3":type.includes("ogg")?"ogg":"webm";
  }

  function crc32(bytes) {
    let crc=-1;
    for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    return (crc^-1)>>>0;
  }

  function writeU16(view,offset,value){view.setUint16(offset,value,true);}
  function writeU32(view,offset,value){view.setUint32(offset,value,true);}
  function concatBytes(parts){
    const length=parts.reduce((sum,part)=>sum+part.length,0),result=new Uint8Array(length);
    let offset=0;parts.forEach(part=>{result.set(part,offset);offset+=part.length;});return result;
  }

  function createZip(entries) {
    const encoder=new TextEncoder(),locals=[],centrals=[];let offset=0;
    entries.forEach(entry=>{
      const name=encoder.encode(entry.name),data=entry.data,crc=crc32(data);
      const local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
      writeU32(lv,0,0x04034b50);writeU16(lv,4,20);writeU16(lv,6,0x0800);writeU16(lv,8,0);writeU32(lv,14,crc);writeU32(lv,18,data.length);writeU32(lv,22,data.length);writeU16(lv,26,name.length);local.set(name,30);
      locals.push(local,data);
      const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);
      writeU32(cv,0,0x02014b50);writeU16(cv,4,20);writeU16(cv,6,20);writeU16(cv,8,0x0800);writeU32(cv,16,crc);writeU32(cv,20,data.length);writeU32(cv,24,data.length);writeU16(cv,28,name.length);writeU32(cv,42,offset);central.set(name,46);centrals.push(central);
      offset+=local.length+data.length;
    });
    const directory=concatBytes(centrals),end=new Uint8Array(22),view=new DataView(end.buffer);
    writeU32(view,0,0x06054b50);writeU16(view,8,entries.length);writeU16(view,10,entries.length);writeU32(view,12,directory.length);writeU32(view,16,offset);
    return new Blob([...locals,directory,end],{type:"application/zip"});
  }

  async function birthdayExport(type) {
    if(!requirePin()){BB.app.toast("That PIN did not match.");return;}
    const {profile,stats}=await celebrationData();
    const lines=[`Happy Birthday, ${profile.name}!`,`🌸 Grew ${stats.flowers} flowers`,`🦋 Earned ${stats.butterflies} butterflies`,`📚 Completed ${stats.activities} learning activities`,`💬 Used ${stats.cards} communication cards`,`🎤 Preserved ${stats.recordings} wonderful voice memories`,`Look how much you’ve grown in your own wonderful way!`];
    if(type==="pdf"){printHtml(`Happy Birthday, ${profile.name}`,`<div class="print-cover"><div>⭐ 🌸 🦋</div><h1>${escapeHtml(lines[0])}</h1>${lines.slice(1).map(line=>`<p>${escapeHtml(line)}</p>`).join("")}</div>`);return;}
    const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=1500;const ctx=canvas.getContext("2d");
    const gradient=ctx.createLinearGradient(0,0,1200,1500);gradient.addColorStop(0,"#ede5ff");gradient.addColorStop(1,"#ddf7f0");ctx.fillStyle=gradient;ctx.fillRect(0,0,1200,1500);
    ctx.fillStyle="#26334c";ctx.textAlign="center";ctx.font="72px system-ui";ctx.fillText("⭐  🌸  🦋",600,180);ctx.font="bold 64px system-ui";ctx.fillText(lines[0],600,310);
    ctx.font="38px system-ui";lines.slice(1).forEach((line,index)=>ctx.fillText(line,600,470+index*120));ctx.font="bold 34px system-ui";ctx.fillText("BrightBridge — Look How Far I’ve Come™",600,1350);
    canvas.toBlob(blob=>download(blob,`happy-birthday-${safeFileName(profile.name)}.png`),"image/png");
  }

  async function keepsakeBook() {
    if(!requirePin()){BB.app.toast("That PIN did not match.");return;}
    const profile=activeProfile(),letters=await list("letters"),items=await timelineItems();
    const body=`<div class="print-cover"><div>💌 🌸 🎤</div><h1>${escapeHtml(profile.name)}’s BrightBridge Keepsake Book</h1><p>Letters, memories, growth, and encouragement</p></div>
      <h1>Journey Timeline</h1>${items.slice().reverse().map(item=>`<article><h2>${item.icon} ${escapeHtml(item.title)}</h2><p>${formatDate(item.date)} · ${escapeHtml(item.detail||"")}</p></article>`).join("")}
      <h1>Letters</h1>${letters.sort((a,b)=>new Date(a.date)-new Date(b.date)).map(letter=>`<article><h2>💌 ${escapeHtml(letter.title)}</h2><p>From ${escapeHtml(letter.author)} · ${formatDate(letter.date)}</p>${letter.body}</article>`).join("")}`;
    printHtml(`${profile.name} Keepsake Book`,body);
  }

  async function encryptedBackup() {
    if(!requirePin()){BB.app.toast("That PIN did not match.");return;}
    const passphrase=prompt("Create a backup passphrase. Keep it somewhere safe:");
    if(!passphrase||passphrase.length<8){BB.app.toast("Use a passphrase with at least 8 characters.");return;}
    const voices=await list("voices"),letters=await list("letters");
    const encodeBlob=blob=>new Promise((resolve,reject)=>{if(!blob){resolve(null);return;}const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
    const payload={format:"BrightBridge Private Memory Backup",version:1,profile:activeProfile(),state:memoryState(),
      voices:await Promise.all(voices.map(async({blob,...record})=>({...record,dataUrl:await encodeBlob(blob)}))),
      letters:await Promise.all(letters.map(async({photo,...record})=>({...record,photoDataUrl:await encodeBlob(photo)})))};
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),enc=new TextEncoder();
    const baseKey=await crypto.subtle.importKey("raw",enc.encode(passphrase),"PBKDF2",false,["deriveKey"]);
    const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},baseKey,{name:"AES-GCM",length:256},false,["encrypt"]);
    const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,enc.encode(JSON.stringify(payload))));
    download(new Blob([JSON.stringify({format:"BrightBridge Encrypted Memory Backup",version:1,salt:Array.from(salt),iv:Array.from(iv),cipher:bytesToBase64(cipher)})],{type:"application/json"}),`brightbridge-private-memories-${new Date().toISOString().slice(0,10)}.bbsecure`);
  }

  function bytesToBase64(bytes) {
    let binary="";
    for(let index=0;index<bytes.length;index+=32768)binary+=String.fromCharCode(...bytes.subarray(index,index+32768));
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary=atob(value),bytes=new Uint8Array(binary.length);
    for(let index=0;index<binary.length;index++)bytes[index]=binary.charCodeAt(index);
    return bytes;
  }

  async function restoreEncrypted(file) {
    if(!requirePin()){BB.app.toast("That PIN did not match.");return;}
    const passphrase=prompt("Enter the backup passphrase:");
    if(!passphrase)return;
    try{
      const packageData=JSON.parse(await file.text());
      if(packageData.format!=="BrightBridge Encrypted Memory Backup")throw new Error("Invalid backup");
      const enc=new TextEncoder(),dec=new TextDecoder(),salt=new Uint8Array(packageData.salt),iv=new Uint8Array(packageData.iv);
      const baseKey=await crypto.subtle.importKey("raw",enc.encode(passphrase),"PBKDF2",false,["deriveKey"]);
      const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:250000,hash:"SHA-256"},baseKey,{name:"AES-GCM",length:256},false,["decrypt"]);
      const cipher=typeof packageData.cipher==="string"?base64ToBytes(packageData.cipher):new Uint8Array(packageData.cipher);
      const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,cipher);
      const payload=JSON.parse(dec.decode(plain));
      if(payload.format!=="BrightBridge Private Memory Backup")throw new Error("Invalid payload");
      if(!confirm("Restore this encrypted memory backup for the active child profile? Existing Voice Journey recordings and letters for this profile will be replaced."))return;
      const profileId=BB.store.data.activeProfile;
      await clearProfile(profileId);
      await importAll({voices:payload.voices,letters:payload.letters},profileId);
      if(payload.state){
        const current=memoryState(),sourceProfile=payload.profile?.id;
        current.events=current.events.filter(item=>item.profileId!==profileId).concat((payload.state.events||[]).filter(item=>!sourceProfile||item.profileId===sourceProfile).map(item=>({...item,profileId})));
        current.birthdaySnapshots=current.birthdaySnapshots.filter(item=>item.profileId!==profileId).concat((payload.state.birthdaySnapshots||[]).filter(item=>!sourceProfile||item.profileId===sourceProfile).map(item=>({...item,profileId})));
        activeProfile().growthPath={...growthPathState(),...(payload.profile?.growthPath||payload.state.growthPath||{})};
      }
      BB.store.save();
      BB.app.toast("Encrypted private memories restored.");
      await open("hub");
    }catch{
      BB.app.toast("The backup or passphrase did not match.");
    }
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve,reject)=>{
      if(!blob){resolve(null);return;}
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);
    });
  }

  async function exportAll() {
    const voices=await listAll("voices"),letters=await listAll("letters");
    return {
      voices:await Promise.all(voices.map(async({blob,...record})=>({...record,dataUrl:await blobToDataUrl(blob)}))),
      letters:await Promise.all(letters.map(async({photo,...record})=>({...record,photoDataUrl:await blobToDataUrl(photo)})))
    };
  }

  async function clearAll() {
    await Promise.all([
      store("voices","readwrite",objectStore=>objectStore.clear()),
      store("letters","readwrite",objectStore=>objectStore.clear())
    ]);
  }

  async function clearProfile(profileId) {
    const [voices,letters]=await Promise.all([listAll("voices"),listAll("letters")]);
    await Promise.all([
      ...voices.filter(item=>item.profileId===profileId).map(item=>removeRecord("voices",item.id)),
      ...letters.filter(item=>item.profileId===profileId).map(item=>removeRecord("letters",item.id))
    ]);
  }

  async function importAll(backup = {}, profileOverride = null) {
    for(const record of backup.voices||[]){
      if(!record.dataUrl)continue;
      const blob=await fetch(record.dataUrl).then(response=>response.blob());
      const {dataUrl,...metadata}=record;
      await saveRecord("voices",{...metadata,blob,profileId:profileOverride||metadata.profileId||BB.store.data.activeProfile});
    }
    for(const record of backup.letters||[]){
      const photo=record.photoDataUrl?await fetch(record.photoDataUrl).then(response=>response.blob()):null;
      const {photoDataUrl,...metadata}=record;
      await saveRecord("letters",{...metadata,photo,profileId:profileOverride||metadata.profileId||BB.store.data.activeProfile});
    }
  }

  document.addEventListener("click",async event=>{
    if(event.target.closest("[data-route]"))cancelView();
    const openButton=event.target.closest("[data-memory-open]");if(openButton){await open(openButton.dataset.memoryOpen);return;}
    if(event.target.closest("[data-vj-record]")){startRecording();return;}
    if(event.target.closest("[data-vj-stop]")){stopRecording();return;}
    if(event.target.closest("[data-vj-compare]")){compareVoices();return;}
    if(event.target.closest("[data-vj-export-selected]")){exportSelectedZip();return;}
    const favorite=event.target.closest("[data-vj-favorite-toggle]");if(favorite){const item=await getRecord("voices",favorite.dataset.vjFavoriteToggle);if(item){item.favorite=!item.favorite;await saveRecord("voices",item);await open("voice");}return;}
    const audio=event.target.closest("[data-vj-download]");if(audio){if(!requirePin()){BB.app.toast("That PIN did not match.");return;}const item=await getRecord("voices",audio.dataset.vjDownload);if(item)download(item.blob,`${safeFileName(item.title)}.${audioExtension(item.type)}`);return;}
    const summary=event.target.closest("[data-vj-summary]");if(summary){printSummary("record",summary.dataset.vjSummary);return;}
    const voiceDelete=event.target.closest("[data-vj-delete]");if(voiceDelete&&confirm("Permanently delete this Voice Journey recording from this device?")){await removeRecord("voices",voiceDelete.dataset.vjDelete);await open("voice");return;}
    const print=event.target.closest("[data-memory-print]");if(print){printSummary(print.dataset.memoryPrint);return;}
    if(event.target.closest("[data-letter-save]")){saveLetter();return;}
    const read=event.target.closest("[data-letter-read]");if(read){readLetter(read.dataset.letterRead);return;}
    const exportLetter=event.target.closest("[data-letter-export]");if(exportLetter){if(requirePin())readLetter(exportLetter.dataset.letterExport,true);else BB.app.toast("That PIN did not match.");return;}
    const deleteLetter=event.target.closest("[data-letter-delete]");if(deleteLetter&&confirm("Permanently delete this private letter?")){await removeRecord("letters",deleteLetter.dataset.letterDelete);await open("letters");return;}
    const rich=event.target.closest("[data-rich-command]");if(rich){document.querySelector("[data-letter-body]")?.focus();document.execCommand(rich.dataset.richCommand,false);return;}
    const growth=event.target.closest("[data-growth-stage]");if(growth){growthPathState().stage=growth.dataset.growthStage;BB.store.save();applyGrowthPath();BB.app.toast("Growth stage updated. All history was preserved.");await open("growth");return;}
    const preview=event.target.closest("[data-growth-preview]");if(preview){const stage=stages.find(item=>item.id===preview.dataset.growthPreview);BB.app.modal(`<div class="modal-head"><h2>${stage.icon} ${stage.name}</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><p class="lead">${stage.ages}</p><p>${stage.focus}</p><p class="privacy-note">Preview only. No stage or memory was changed.</p>`,"Growth Path preview");return;}
    const toggle=event.target.closest("[data-growth-toggle]");if(toggle){const key=toggle.dataset.growthToggle;growthPathState()[key]=!growthPathState()[key];BB.store.save();applyGrowthPath();await open("growth");return;}
    if(event.target.closest("[data-memory-slideshow]")){startSlideshow();return;}
    if(event.target.closest("[data-slide-next]")){slideIndex=(slideIndex+1)%slideItems.length;renderSlide();return;}
    if(event.target.closest("[data-slide-prev]")){slideIndex=(slideIndex-1+slideItems.length)%slideItems.length;renderSlide();return;}
    if(event.target.closest("[data-slide-music]")){BB.audio.startCalmMusic();BB.app.toast("Soft music started.");return;}
    const birthday=event.target.closest("[data-birthday-export]");if(birthday){birthdayExport(birthday.dataset.birthdayExport);return;}
    if(event.target.closest("[data-memory-keepsake]")){keepsakeBook();return;}
    if(event.target.closest("[data-memory-encrypted-backup]")){encryptedBackup();return;}
  });

  document.addEventListener("input",event=>{
    if(event.target.matches("[data-vj-search]")){voiceFilters.query=event.target.value;clearTimeout(event.target._timer);event.target._timer=setTimeout(()=>open("voice"),250);}
    if(event.target.matches("[data-profile-birth]")){activeProfile().birthDate=event.target.value;BB.store.save();}
  });

  document.addEventListener("change",async event=>{
    if(event.target.matches("[data-vj-file]")&&event.target.files[0])uploadVoice(event.target.files[0]);
    if(event.target.matches("[data-vj-sort]")){voiceFilters.sort=event.target.value;await open("voice");}
    if(event.target.matches("[data-compare-left],[data-compare-right]"))refreshComparison();
    if(event.target.matches("[data-letter-prompt]")&&event.target.value){const editor=document.querySelector("[data-letter-body]");if(editor&&!editor.textContent.trim())editor.innerHTML=`<p>${escapeHtml(event.target.value)}</p>`;}
    if(event.target.matches("[data-growth-feature]")){growthPathState().enabledFeatures[event.target.dataset.growthFeature]=event.target.checked;BB.store.save();}
    if(event.target.matches("[data-memory-encrypted-restore]")&&event.target.files[0])restoreEncrypted(event.target.files[0]);
  });

  window.addEventListener("bb:reward",()=>{
    const data=BB.store.data;
    if(data.flowers===1)track("reward","First flower grown",{icon:"🌸",onceKey:"first-flower"});
    if(data.butterflies===1)track("reward","First butterfly earned",{icon:"🦋",onceKey:"first-butterfly"});
  });

  window.addEventListener("bb:state",applyGrowthPath);

  window.BB=window.BB||{};
  BB.memoryJourney={open,cancelView,track,applyGrowthPath,stageVocabulary,homeBanner,encryptedBackup,exportAll,importAll,clear:clearAll};
  applyGrowthPath();
})();
