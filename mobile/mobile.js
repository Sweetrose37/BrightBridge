(function () {
  "use strict";
  const stages=[
    {id:"early-explorer",icon:"🌱",name:"Early Explorer",ages:"Approx. ages 2–4",focus:"First communication, colors, shapes, sounds, sensory discovery, and routines."},
    {id:"growing-learner",icon:"🌿",name:"Growing Learner",ages:"Approx. ages 5–8",focus:"Reading readiness, math, social skills, daily living, and expanded communication."},
    {id:"independent-communicator",icon:"🌳",name:"Independent Communicator",ages:"Approx. ages 9–12",focus:"Sentence building, goals, school support, regulation, and independence."},
    {id:"teen-young-adult",icon:"✨",name:"Teen & Young Adult",ages:"Approx. ages 13+",focus:"Life skills, self-advocacy, community navigation, wellness, and future goals."}
  ];
  let epoch=0;
  let active=false;
  let memorySection="hub";
  let dbPromise=null;
  let recorder=null;
  let stream=null;
  let chunks=[];
  let startedAt=0;
  let urls=[];
  let voiceQuery="";
  let voiceSort="newest";
  let slideshowItems=[];
  let slideshowIndex=0;

  function esc(value=""){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));}
  function profile(){const data=BB.store.data;return data.profiles.find(item=>item.id===data.activeProfile)||data.profiles[0];}
  function state(){
    const memory=BB.store.data.memoryJourney;
    memory.events ||= [];
    memory.mobileLetters ||= [];
    return memory;
  }
  function growth(){
    const child=profile();
    child.growthPath||=JSON.parse(JSON.stringify(state().growthPath));
    child.growthPath.enabledFeatures||={communication:true,learning:true,sensory:true,music:true,nature:true,emotions:true,rewards:true};
    return child.growthPath;
  }
  function formatDate(value){if(!value)return "Date not added";const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleString([],{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
  function localDateTime(){const date=new Date(),offset=date.getTimezoneOffset();return new Date(date.getTime()-offset*60000).toISOString().slice(0,16);}
  function isBirthday(value){if(!value)return false;const date=new Date(`${value}T12:00:00`),today=new Date();return date.getMonth()===today.getMonth()&&date.getDate()===today.getDate();}
  function sanitizeRichHtml(value=""){
    const template=document.createElement("template");template.innerHTML=String(value);
    template.content.querySelectorAll("script,style,iframe,object,embed").forEach(node=>node.remove());
    const allowed=new Set(["P","BR","STRONG","B","EM","I","UL","OL","LI"]);
    template.content.querySelectorAll("*").forEach(node=>{[...node.attributes].forEach(attribute=>node.removeAttribute(attribute.name));if(!allowed.has(node.tagName))node.replaceWith(...node.childNodes);});
    return template.innerHTML;
  }
  function downloadBlob(blob,name){const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),500);}
  function printHtml(title,body){
    const popup=window.open("","_blank");if(!popup){BB.app.toast("Allow pop-ups to save a PDF.");return;}
    popup.opener=null;popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:35px auto;color:#24324a;line-height:1.55;padding:20px}h1{color:#7055b8}article{padding:14px 0;border-bottom:1px solid #ddd}.tag{display:inline-block;padding:4px 8px;margin:2px;border-radius:99px;background:#eee8fc}@media print{button{display:none}}</style></head><body>${body}<script>setTimeout(()=>window.print(),300)<\/script></body></html>`);popup.document.close();
  }
  function blobToDataUrl(blob){return new Promise((resolve,reject)=>{if(!blob){resolve(null);return;}const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
  function dataUrlBlob(dataUrl){return fetch(dataUrl).then(response=>response.blob());}

  function database(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!window.indexedDB){reject(new Error("Private storage unavailable"));return;}
      const request=indexedDB.open("brightbridge-private-journey",1);
      let settled=false;
      const timer=setTimeout(()=>finish(reject,new Error("Private storage timed out")),2500);
      const finish=(callback,value)=>{if(settled)return;settled=true;clearTimeout(timer);callback(value);};
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains("voices"))db.createObjectStore("voices",{keyPath:"id"});if(!db.objectStoreNames.contains("letters"))db.createObjectStore("letters",{keyPath:"id"});};
      request.onsuccess=()=>finish(resolve,request.result);
      request.onerror=()=>finish(reject,request.error);
      request.onblocked=()=>finish(reject,new Error("Private storage blocked"));
    }).catch(error=>{dbPromise=null;throw error;});
    return dbPromise;
  }
  async function privateStore(name,mode,operation){
    const db=await database();
    return new Promise((resolve,reject)=>{
      try{const request=operation(db.transaction(name,mode).objectStore(name));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}
      catch(error){reject(error);}
    });
  }
  function voiceStore(mode,operation){return privateStore("voices",mode,operation);}
  async function voices(){
    try{return (await voiceStore("readonly",store=>store.getAll())).filter(item=>item.profileId===BB.store.data.activeProfile).sort((a,b)=>new Date(b.dateTime)-new Date(a.dateTime));}
    catch{return [];}
  }
  function saveVoice(record){return voiceStore("readwrite",store=>store.put(record));}
  function removeVoice(id){return voiceStore("readwrite",store=>store.delete(id));}
  async function filteredVoices(){
    let items=await voices(),query=voiceQuery.trim().toLowerCase();
    if(query)items=items.filter(item=>[item.title,item.age,item.notes,item.milestoneLabel,(item.tags||[]).join(" "),formatDate(item.dateTime)].join(" ").toLowerCase().includes(query));
    const sorters={newest:(a,b)=>new Date(b.dateTime)-new Date(a.dateTime),oldest:(a,b)=>new Date(a.dateTime)-new Date(b.dateTime),age:(a,b)=>String(a.age||"").localeCompare(String(b.age||"")),milestones:(a,b)=>Number(b.milestone)-Number(a.milestone),tags:(a,b)=>String(a.tags?.[0]||"").localeCompare(String(b.tags?.[0]||"")),favorites:(a,b)=>Number(b.favorite)-Number(a.favorite)};
    return items.sort(sorters[voiceSort]||sorters.newest);
  }
  async function letters(){
    let privateLetters=[];
    try{privateLetters=await privateStore("letters","readonly",store=>store.getAll());}catch{}
    const localLetters=state().mobileLetters||[];
    return [...privateLetters,...localLetters].filter(item=>item.profileId===BB.store.data.activeProfile).sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
  }

  function tabs(){
    return `<div class="mobile-category-row">${[["hub","✨","Memory Home"],["voice","🎤","Voice Journey"],["compare","↔️","Compare"],["timeline","🌈","Timeline"],["letters","💌","Letters"],["growth","🌱","Growth Paths"],["celebrate","🎉","Celebrations"]].map(([id,icon,label])=>`<button class="mobile-chip ${memorySection===id?"active":""}" type="button" data-mobile-memory-open="${id}">${icon} ${label}</button>`).join("")}</div>`;
  }
  function shell(title,subtitle,content){
    return `<section>${BB.navigation.pageHead(title,subtitle,"parent")}${tabs()}${content}</section>`;
  }
  function safeScreen(message){
    return shell("Private Memories","Nothing was deleted.",`<div class="mobile-panel" style="text-align:center"><div style="font-size:58px">💜</div><h2>Your memories are safe</h2><p>${esc(message)}</p><div class="mobile-button-row"><button class="mobile-button" type="button" data-mobile-memory-open="${memorySection}">Try again</button><button class="mobile-button secondary" type="button" data-route="parent">Back</button></div></div>`);
  }

  async function renderHub(){
    const voiceItems=await voices(),letterItems=await letters(),path=growth();
    const stage=stages.find(item=>item.id===path.stage)||stages[0];
    return shell("Private Memory Home",`A private, caregiver-controlled story for ${profile().name}.`,`
      ${isBirthday(profile().birthDate)?`<button class="mobile-birthday-banner" type="button" data-mobile-memory-open="celebrate">🎉 Happy Birthday, ${esc(profile().name)}! Your celebration is ready.</button>`:""}
      <div class="mobile-panel"><h3>🔒 Private by default</h3><p>Recordings, letters, and milestones remain on this device. BrightBridge never translates, decodes, diagnoses, or infers meaning from vocalizations.</p></div>
      <div class="mobile-memory-grid">
        <button class="mobile-memory-button" type="button" data-mobile-memory-open="voice"><span>🎤</span>Voice Journey<small>${voiceItems.length} recordings</small></button>
        <button class="mobile-memory-button" type="button" data-mobile-memory-open="timeline"><span>🌈</span>Growth Timeline<small>${state().events.length} moments</small></button>
        <button class="mobile-memory-button" type="button" data-mobile-memory-open="letters"><span>💌</span>Future Letters<small>${letterItems.length} letters</small></button>
        <button class="mobile-memory-button" type="button" data-mobile-memory-open="growth"><span>${stage.icon}</span>Growth Paths<small>${stage.name}</small></button>
      </div>`);
  }
  async function renderVoice(){
    const items=await filteredVoices();
    revokeUrls();
    return shell("Voice Journey™","Caregiver-authored memories of meaningful vocal moments.",`
      <div class="mobile-panel"><h3>Add a private recording</h3>
        <label class="mobile-setting-row"><span><strong>Title</strong></span><input data-mv-title maxlength="80" placeholder='First “Mama”'></label>
        <label class="mobile-setting-row"><span><strong>Date and time</strong></span><input type="datetime-local" data-mv-date value="${localDateTime()}"></label>
        <label class="mobile-setting-row"><span><strong>Child age</strong></span><input data-mv-age maxlength="30" placeholder="3 years, 2 months"></label>
        <label class="mobile-setting-row"><span><strong>Notes</strong></span><textarea data-mv-notes rows="3" maxlength="800"></textarea></label>
        <label class="mobile-setting-row"><span><strong>Tags</strong><small>Happy, practicing, family, school…</small></span><input data-mv-tags maxlength="160" placeholder="Happy, New Sound"></label>
        <label class="mobile-setting-row"><span><strong>Milestone</strong><small>Caregiver-defined</small></span><input type="checkbox" data-mv-milestone></label>
        <label class="mobile-setting-row"><span><strong>Milestone name</strong></span><input data-mv-milestone-label maxlength="80" placeholder="First recognizable word"></label>
        <label class="mobile-setting-row"><span><strong>Favorite recording</strong></span><input type="checkbox" data-mv-favorite></label>
        <label class="mobile-setting-row"><span><strong>Include in anniversary replay</strong></span><input type="checkbox" data-mv-replay></label>
        <div class="mobile-button-row"><button class="mobile-button" type="button" data-mv-record>🎙️ Record</button><label class="mobile-button secondary">⬆ Upload<input class="sr-only" type="file" accept="audio/*" data-mv-upload></label><button class="mobile-button danger" type="button" data-mv-stop hidden>■ Stop</button></div>
        <p class="muted" data-mv-status>Audio stays on this device.</p>
      </div>
      <div class="mobile-panel"><div class="mobile-tool-form"><input data-mv-search value="${esc(voiceQuery)}" placeholder="Search title, age, tags, milestones, or notes"><select data-mv-sort aria-label="Sort recordings">${[["newest","Newest"],["oldest","Oldest"],["age","Age"],["milestones","Milestones"],["tags","Tags"],["favorites","Favorites"]].map(([id,label])=>`<option value="${id}" ${voiceSort===id?"selected":""}>${label}</option>`).join("")}</select></div><div class="mobile-button-row" style="margin-top:10px"><button class="mobile-button secondary" type="button" data-memory-print="voice">Timeline PDF</button><button class="mobile-button secondary" type="button" data-mobile-memory-open="compare">Compare two</button><button class="mobile-button secondary" type="button" data-mv-export-selected>Selected ZIP</button><button class="mobile-button secondary" type="button" data-mv-export-all>All audio ZIP</button></div></div>
      <div class="mobile-list">${items.length?items.map(item=>voiceCard(item)).join(""):`<div class="mobile-panel"><h3>Your first recording starts the timeline</h3><p>Try a title such as Morning Babble, Story Time, or First Word.</p></div>`}</div>`);
  }
  function voiceCard(item){
    const url=URL.createObjectURL(item.blob);urls.push(url);
    return `<article class="mobile-panel"><label class="mobile-select-memory"><input type="checkbox" data-mv-select="${item.id}"> Select for export</label><h3>${item.milestone?"⭐ ":""}${item.favorite?"💜 ":""}${esc(item.title)}</h3><p class="muted">${formatDate(item.dateTime)} · Age ${esc(item.age||"not added")} · ${Math.round(item.duration||0)} sec</p>${item.milestone?`<p><strong>🏆 ${esc(item.milestoneLabel||"Personal Achievement")}</strong></p>`:""}<audio controls preload="metadata" src="${url}" style="width:100%"></audio>${item.notes?`<p>${esc(item.notes)}</p>`:""}<div class="mobile-tag-row">${(item.tags||[]).map(tag=>`<span>${esc(tag)}</span>`).join("")}${item.replay?"<span>🎞️ Replay</span>":""}</div><div class="mobile-button-row"><button class="mobile-button secondary" type="button" data-mv-favorite="${item.id}">${item.favorite?"Unfavorite":"Favorite"}</button><button class="mobile-button secondary" type="button" data-mv-download="${item.id}">Audio</button><button class="mobile-button secondary" type="button" data-memory-print-record="${item.id}">PDF</button><button class="mobile-button danger" type="button" data-mv-delete="${item.id}">Delete</button></div></article>`;
  }
  async function renderCompare(){
    const items=await voices();revokeUrls();
    if(items.length<2)return shell("Compare Voice Memories","Compare only this child's own recordings.",`<div class="mobile-panel"><h2>Two recordings are needed</h2><p>Create another Voice Journey recording to use comparison mode.</p><button class="mobile-button" type="button" data-mobile-memory-open="voice">Open Voice Journey</button></div>`);
    const options=items.map(item=>`<option value="${item.id}">${esc(item.title)} · ${formatDate(item.dateTime)}</option>`).join("");
    return shell("Compare Voice Memories","Caregiver-controlled side-by-side listening.",`<div class="mobile-panel"><label class="mobile-tool-label">Earlier recording<select data-mv-compare-left>${options}</select></label><label class="mobile-tool-label">Later recording<select data-mv-compare-right>${items.slice().reverse().map(item=>`<option value="${item.id}">${esc(item.title)} · ${formatDate(item.dateTime)}</option>`).join("")}</select></label><button class="mobile-button" type="button" data-mv-compare>Compare</button></div><div id="mobile-comparison" class="mobile-comparison-grid">${comparisonCard(items[0],"Recording one")}${comparisonCard(items[items.length-1],"Recording two")}</div>`);
  }
  function comparisonCard(item,label){
    const url=URL.createObjectURL(item.blob);urls.push(url);
    return `<article class="mobile-panel"><small class="muted">${label}</small><h2>${esc(item.title)}</h2><audio controls src="${url}" style="width:100%"></audio><p><strong>Date:</strong> ${formatDate(item.dateTime)}</p><p><strong>Age:</strong> ${esc(item.age||"Not added")}</p><p><strong>Milestone:</strong> ${esc(item.milestoneLabel||"Not marked")}</p><p><strong>Tags:</strong> ${esc((item.tags||[]).join(", ")||"None")}</p><p><strong>Notes:</strong> ${esc(item.notes||"None")}</p></article>`;
  }
  function computedTimeline(){
    const data=BB.store.data,items=state().events.filter(item=>!item.profileId||item.profileId===data.activeProfile);
    if(data.stars)items.push({date:new Date().toISOString(),icon:"⭐",title:`${data.stars} learning stars`,detail:"Personal learning progress"});
    if(data.flowers)items.push({date:new Date().toISOString(),icon:"🌻",title:`${data.flowers} flowers grown`,detail:"Reward Garden growth"});
    return items.sort((a,b)=>new Date(b.date)-new Date(a.date));
  }
  async function renderTimeline(){
    const items=computedTimeline(),voiceItems=await voices(),letterItems=await letters();items.push(...voiceItems.map(item=>({icon:item.milestone?"🏆":"🎤",title:item.title,detail:item.milestoneLabel||item.notes||"Voice Journey memory",date:item.dateTime})),...letterItems.map(item=>({icon:"💌",title:item.title,detail:`A letter from ${item.author||"Caregiver"}`,date:item.date})));items.sort((a,b)=>new Date(b.date)-new Date(a.date));
    return shell("Look How Far I’ve Come™","Celebrate only this child's own progress.",`
      <div class="mobile-stats"><div class="mobile-stat"><strong>⭐ ${BB.store.data.stars}</strong><span>Stars</span></div><div class="mobile-stat"><strong>🌻 ${BB.store.data.flowers}</strong><span>Flowers</span></div><div class="mobile-stat"><strong>🎤 ${voiceItems.length}</strong><span>Voice memories</span></div><div class="mobile-stat"><strong>💌 ${letterItems.length}</strong><span>Letters</span></div></div>
      <div class="mobile-button-row" style="margin:13px 0"><button class="mobile-button secondary" type="button" data-memory-print="timeline">Save timeline PDF</button><button class="mobile-button" type="button" data-memory-slideshow>Journey Through Time</button></div>
      <div class="mobile-list">${items.length?items.map(item=>`<article class="mobile-list-card"><span>${item.icon||"✨"}</span><div><strong>${esc(item.title)}</strong><small>${formatDate(item.date)} · ${esc(item.detail||"Meaningful progress")}</small></div></article>`).join(""):`<div class="mobile-panel"><h3>This journey is ready to grow</h3><p>Personal milestones will appear as BrightBridge is used.</p></div>`}</div>`);
  }
  async function renderLetters(){
    const letterItems=await letters(),voiceItems=await voices();
    return shell("Letters to My Future Self™","Private messages of love, encouragement, and memories.",`
      <div class="mobile-panel"><h3>Write a letter</h3><p class="muted">Try: Today you smiled when… · I am proud of you because… · A memory I never want to forget…</p><label class="mobile-setting-row"><span><strong>Title</strong></span><input data-ml-title maxlength="100" placeholder="A memory for your future"></label><label class="mobile-setting-row"><span><strong>Date</strong></span><input type="date" data-ml-date value="${new Date().toISOString().slice(0,10)}"></label><label class="mobile-setting-row"><span><strong>Child age</strong></span><input data-ml-age maxlength="30" placeholder="5 years"></label><label class="mobile-setting-row"><span><strong>Author</strong></span><input data-ml-author maxlength="60" placeholder="Mom, Dad, Grandma…"></label><label class="mobile-setting-row"><span><strong>Future reading</strong></span><select data-ml-unlock>${["Read Anytime","Read Next Birthday","Read at Age 10","Read at Age 13","Read at Age 18","Never Auto-Open"].map(item=>`<option>${item}</option>`).join("")}</select></label><label class="mobile-setting-row"><span><strong>Optional photo</strong></span><input type="file" accept="image/*" data-ml-photo></label><label class="mobile-setting-row"><span><strong>Voice Journey attachment</strong></span><select data-ml-voice><option value="">None</option>${voiceItems.map(item=>`<option value="${item.id}">${esc(item.title)}</option>`).join("")}</select></label><label class="mobile-setting-row"><span><strong>Memory attachments</strong><small>Achievements, favorite AAC phrases, songs, drawings…</small></span><input data-ml-memories maxlength="400"></label><label class="mobile-setting-row"><span><strong>My Day Replay summary</strong></span><textarea data-ml-day rows="3" maxlength="600"></textarea></label><label class="mobile-setting-row"><span><strong>Attach Reward Garden snapshot</strong></span><input type="checkbox" data-ml-garden></label><div class="mobile-rich-toolbar"><button type="button" data-ml-format="bold"><strong>B</strong></button><button type="button" data-ml-format="italic"><em>I</em></button><button type="button" data-ml-format="insertUnorderedList">• List</button></div><div class="mobile-rich-editor" contenteditable="true" data-ml-body role="textbox" aria-multiline="true" data-placeholder="Today you surprised me by…"></div><button class="mobile-button mobile-wide-button" type="button" data-ml-save>Save private letter</button></div>
      <div class="mobile-button-row" style="margin-bottom:13px"><button class="mobile-button secondary" type="button" data-keepsake-book>Keepsake Book PDF</button><button class="mobile-button secondary" type="button" data-memory-slideshow>Letters slideshow</button></div>
      <div class="mobile-list">${letterItems.length?letterItems.map(letter=>letterCard(letter)).join(""):`<div class="mobile-panel"><p>No letters yet. A future keepsake can begin today.</p></div>`}</div>`);
  }
  function letterCard(letter){
    let image="";if(letter.photo){const url=URL.createObjectURL(letter.photo);urls.push(url);image=`<img class="mobile-letter-photo" src="${url}" alt="">`;}
    return `<article class="mobile-panel">${image}<p class="muted">${esc(letter.unlockRule||"Read Anytime")}</p><h3>💌 ${esc(letter.title)}</h3><p class="muted">${formatDate(letter.date||letter.createdAt)} · Age ${esc(letter.age||"not added")} · From ${esc(letter.author||"Caregiver")}</p><div class="mobile-letter-body">${sanitizeRichHtml(letter.body||esc(letter.content||""))}</div>${letter.voiceTitle?`<p>🎤 <strong>Voice memory:</strong> ${esc(letter.voiceTitle)}</p>`:""}${letter.dayReplay?`<p>☀️ <strong>My Day Replay:</strong> ${esc(letter.dayReplay)}</p>`:""}${letter.gardenSnapshot?`<p>🌻 <strong>Reward Garden:</strong> ${letter.gardenSnapshot.flowers} flowers · ${letter.gardenSnapshot.butterflies} butterflies</p>`:""}${letter.memories?.length?`<p><strong>Attached memories:</strong> ${esc(letter.memories.join(", "))}</p>`:""}<div class="mobile-button-row"><button class="mobile-button secondary" type="button" data-ml-print="${letter.id}">PDF</button><button class="mobile-button danger" type="button" data-ml-delete="${letter.id}">Delete</button></div></article>`;
  }
  function renderGrowth(){
    const path=growth();
    return shell("BrightBridge Growth Paths™","Caregiver-controlled stages that never erase history.",`
      <div class="mobile-panel"><h3>Caregiver promise</h3><p>Changing a stage updates age-appropriate presentation and vocabulary. Voice memories, letters, rewards, achievements, and communication history remain preserved.</p></div>
      <div class="mobile-setting-group"><h3>Progression controls</h3><label class="mobile-setting-row"><span><strong>Child birthday</strong><small>Private and caregiver-controlled</small></span><input type="date" data-mg-birthday value="${esc(profile().birthDate||"")}"></label>${[["automatic","Automatic age suggestion"],["locked","Lock current stage"],["matureContent","Caregiver-approved mature content"]].map(([key,label])=>`<div class="mobile-setting-row"><span><strong>${label}</strong></span><button class="mobile-switch ${path[key]?"on":""}" type="button" data-mg-toggle="${key}"><i></i></button></div>`).join("")}</div>
      <div class="mobile-list">${stages.map((stage,index)=>`<article class="mobile-panel" style="${path.stage===stage.id?"border:3px solid var(--purple)":""}"><div style="font-size:44px">${stage.icon}</div><p class="muted">Stage ${index+1} · ${stage.ages}</p><h2>${stage.name}</h2><p>${stage.focus}</p><div class="mobile-button-row"><button class="mobile-button ${path.stage===stage.id?"secondary":""}" type="button" data-mg-stage="${stage.id}">${path.stage===stage.id?"Current stage":"Choose stage"}</button><button class="mobile-button secondary" type="button" data-mg-preview="${stage.id}">Preview</button></div></article>`).join("")}</div>
      <div class="mobile-setting-group"><h3>Available child features</h3>${Object.entries(path.enabledFeatures).map(([key,on])=>`<div class="mobile-setting-row"><span><strong>${key[0].toUpperCase()+key.slice(1)}</strong></span><button class="mobile-switch ${on?"on":""}" type="button" data-mg-feature="${key}"><i></i></button></div>`).join("")}</div>`);
  }
  async function renderCelebrate(){
    const data=BB.store.data,voiceItems=await voices(),letterItems=await letters(),completed=Object.values(data.progress||{}).reduce((sum,value)=>sum+value,0),name=profile().name;
    return shell("Celebrations & Replays","Private keepsakes celebrating only this child's own journey.",`<div class="mobile-celebration"><div>🎉 ⭐ 🌸 🦋</div><h1>Happy Birthday, ${esc(name)}!</h1><p>This year you grew ${data.flowers} flowers, earned ${data.butterflies} butterflies, completed ${completed} learning activities, explored ${Object.keys(data.wordUse||{}).length} communication words, saved ${voiceItems.length} voice memories, and received ${letterItems.length} future letters.</p><h2>Look how much you’ve grown!</h2></div><div class="mobile-button-row"><button class="mobile-button" type="button" data-birthday-export="pdf">Birthday PDF</button><button class="mobile-button secondary" type="button" data-birthday-export="image">Birthday image</button><button class="mobile-button secondary" type="button" data-memory-slideshow>Play keepsake slideshow</button></div><div class="mobile-panel" style="margin-top:13px"><h2>Journey Through Time</h2><p>An anniversary replay of caregiver-selected Voice Journey recordings, learning milestones, Reward Garden growth, communication moments, letters, and achievements.</p><button class="mobile-button" type="button" data-memory-slideshow>Start anniversary replay</button></div>`);
  }

  async function open(next="hub",options={}){
    if(!BB.app?.isParentUnlocked?.()){BB.navigation.go("parent");return;}
    if(BB.navigation.current!=="memory"){if(options.withinRoute)return;BB.navigation.go("memory",{section:next});return;}
    const token=++epoch;active=true;memorySection=next;
    let content;
    try{
      const renderer={hub:renderHub,voice:renderVoice,compare:renderCompare,timeline:renderTimeline,letters:renderLetters,growth:renderGrowth,celebrate:renderCelebrate}[next]||renderHub;
      content=await Promise.race([renderer(),new Promise((_,reject)=>setTimeout(()=>reject(new Error("Memory screen timed out")),4500))]);
    }catch{content=safeScreen("Private storage did not open this time. Please try again.");}
    if(token!==epoch||!active||BB.navigation.current!=="memory")return;
    const view=document.querySelector("#view");view.innerHTML=content;view.focus({preventScroll:true});
    document.documentElement.scrollTop=0;document.body.scrollTop=0;window.scrollTo(0,0);
  }
  function cancelView(){active=false;epoch++;revokeUrls();}
  function revokeUrls(){urls.forEach(url=>URL.revokeObjectURL(url));urls=[];}
  function track(type,title,options={}){
    const memory=state();
    if(options.onceKey&&memory.events.some(item=>item.onceKey===options.onceKey&&item.profileId===BB.store.data.activeProfile))return;
    memory.events.push({id:`event-${Date.now()}`,profileId:BB.store.data.activeProfile,type,title,date:new Date().toISOString(),icon:options.icon||"✨",detail:options.detail||"",onceKey:options.onceKey||""});
    BB.store.save();
  }
  function applyGrowthPath(){
    const path=growth(),birthday=profile().birthDate;if(path.automatic&&!path.locked&&birthday){const born=new Date(`${birthday}T12:00:00`),age=Math.floor((Date.now()-born.getTime())/31557600000);path.stage=age>=13?"teen-young-adult":age>=9?"independent-communicator":age>=5?"growing-learner":"early-explorer";}
    document.body.dataset.growthStage=path.stage;document.body.classList.toggle("mature-content",!!path.matureContent);
    Object.entries(path.enabledFeatures).forEach(([key,on])=>document.body.classList.toggle(`feature-disabled-${key}`,!on));
  }
  function stageVocabulary(){
    const words={
      "early-explorer":[["Again please","🔁"],["Look with me","👀"],["My favorite","💜"]],
      "growing-learner":[["I can read","📖"],["What comes next?","➡️"],["I need a schedule","📅"]],
      "independent-communicator":[["I have a goal","🎯"],["I need more time","⏳"],["Can you explain?","💡"]],
      "teen-young-adult":[["I can speak up for myself","📣"],["I need transportation","🚌"],["My future goal","✨"]]
    };
    return words[growth().stage]||words["early-explorer"];
  }
  function homeBanner(){
    const stage=stages.find(item=>item.id===growth().stage)||stages[0];
    return `<div class="mobile-panel" style="display:flex;align-items:center;gap:12px;margin-top:13px"><span style="font-size:40px">${stage.icon}</span><div><small class="muted">My BrightBridge Growth Path</small><h3 style="margin:2px 0">${stage.name}</h3><p>${stage.focus}</p></div></div>`;
  }
  async function clear(){
    state().events=[];state().mobileLetters=[];BB.store.save();
    try{await Promise.all([voiceStore("readwrite",store=>store.clear()),privateStore("letters","readwrite",store=>store.clear())]);}catch{}
  }
  async function exportAll(){
    let voiceItems=[],letterItems=[];try{voiceItems=await voiceStore("readonly",store=>store.getAll());letterItems=await privateStore("letters","readonly",store=>store.getAll());}catch{}
    return {voices:await Promise.all(voiceItems.map(async({blob,...item})=>({...item,audioDataUrl:await blobToDataUrl(blob)}))),letters:await Promise.all(letterItems.map(async({photo,...item})=>({...item,photoDataUrl:await blobToDataUrl(photo)})))};
  }
  async function importAll(payload={}){
    for(const item of payload.voices||[]){if(!item.audioDataUrl)continue;const {audioDataUrl,...meta}=item;await saveVoice({...meta,id:meta.id||`voice-${Date.now()}`,profileId:meta.profileId||BB.store.data.activeProfile,blob:await dataUrlBlob(audioDataUrl)});}
    for(const item of payload.letters||[]){const {photoDataUrl,...meta}=item,photo=photoDataUrl?await dataUrlBlob(photoDataUrl):null;await privateStore("letters","readwrite",store=>store.put({...meta,id:meta.id||`letter-${Date.now()}`,profileId:meta.profileId||BB.store.data.activeProfile,photo}));}
  }
  async function printSummary(kind,id=null){
    if(id){
      const item=await voiceStore("readonly",store=>store.get(id));if(!item)return;
      printHtml(item.title,`<h1>🎤 ${esc(item.title)}</h1><p>${formatDate(item.dateTime)} · Age ${esc(item.age||"not added")} · ${Math.round(item.duration||0)} seconds</p><p>${esc(item.notes||"")}</p><p>${(item.tags||[]).map(tag=>`<span class="tag">${esc(tag)}</span>`).join("")}</p>${item.milestone?`<p><strong>Caregiver-defined milestone:</strong> ${esc(item.milestoneLabel||"Personal Achievement")}</p>`:""}<p><em>This is a caregiver-authored memory. BrightBridge does not interpret vocalizations.</em></p>`);return;
    }
    if(kind==="voice"){const items=await filteredVoices();printHtml("Voice Journey Timeline",`<h1>${esc(profile().name)} — Voice Journey™</h1><p>Caregiver-authored memories. No vocalizations were translated, interpreted, or diagnosed.</p>${items.map(item=>`<article><h2>${item.milestone?"⭐ ":""}${esc(item.title)}</h2><p>${formatDate(item.dateTime)} · Age ${esc(item.age||"not added")}</p><p>${esc(item.notes||"")}</p></article>`).join("")||"<p>No recordings yet.</p>"}`);return;}
    const items=computedTimeline();printHtml("Look How Far I’ve Come",`<h1>${esc(profile().name)} — Look How Far I’ve Come™</h1><p>This timeline celebrates only this child’s own journey.</p>${items.slice().reverse().map(item=>`<article><h2>${item.icon||"✨"} ${esc(item.title)}</h2><p>${formatDate(item.date)} · ${esc(item.detail||"")}</p></article>`).join("")}`);
  }
  function crc32(bytes){let crc=-1;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^-1)>>>0;}
  function le16(value){return new Uint8Array([value&255,(value>>>8)&255]);}
  function le32(value){return new Uint8Array([value&255,(value>>>8)&255,(value>>>16)&255,(value>>>24)&255]);}
  async function exportAudioZip(selectedOnly=false){
    let items=await voices();if(selectedOnly){const ids=new Set([...document.querySelectorAll("[data-mv-select]:checked")].map(input=>input.dataset.mvSelect));items=items.filter(item=>ids.has(item.id));}if(!items.length){BB.app.toast(selectedOnly?"Select at least one recording first.":"No Voice Journey recordings to export.");return;}
    const encoder=new TextEncoder(),local=[],central=[];let offset=0;
    const now=new Date(),dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),dosDate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
    for(let index=0;index<items.length;index++){
      const item=items[index],bytes=new Uint8Array(await item.blob.arrayBuffer()),extension=item.blob.type.includes("mp4")?"m4a":item.blob.type.includes("mpeg")?"mp3":"webm",name=encoder.encode(`${String(index+1).padStart(2,"0")}-${item.title.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"")||"recording"}.${extension}`),crc=crc32(bytes);
      const header=[le32(0x04034b50),le16(20),le16(0),le16(0),le16(dosTime),le16(dosDate),le32(crc),le32(bytes.length),le32(bytes.length),le16(name.length),le16(0),name];
      local.push(...header,bytes);
      central.push(le32(0x02014b50),le16(20),le16(20),le16(0),le16(0),le16(dosTime),le16(dosDate),le32(crc),le32(bytes.length),le32(bytes.length),le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name);
      offset+=header.reduce((sum,part)=>sum+part.length,0)+bytes.length;
    }
    const centralSize=central.reduce((sum,part)=>sum+part.length,0),end=[le32(0x06054b50),le16(0),le16(0),le16(items.length),le16(items.length),le32(centralSize),le32(offset),le16(0)];
    downloadBlob(new Blob([...local,...central,...end],{type:"application/zip"}),`voice-journey-${new Date().toISOString().slice(0,10)}.zip`);
  }
  async function showSlideshow(){
    const voiceItems=(await voices()).filter(item=>item.replay),letterItems=await letters();
    slideshowItems=[...computedTimeline().map(item=>({...item,type:"event"})),...voiceItems.map(item=>({type:"voice",icon:"🎤",title:item.title,detail:item.milestoneLabel||item.notes||"Voice Journey memory",date:item.dateTime,blob:item.blob})),...letterItems.map(item=>({type:"letter",icon:"💌",title:item.title,detail:`A letter from ${item.author||"Caregiver"}`,date:item.date,photo:item.photo}))].sort((a,b)=>new Date(a.date)-new Date(b.date));
    if(!slideshowItems.length){BB.app.toast("Add a memory before starting the slideshow.");return;}slideshowIndex=0;
    BB.app.modal(`<div class="mobile-modal-head"><h2>Journey Through Time</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><div id="mobile-slide"></div><div class="mobile-button-row"><button class="mobile-button secondary" type="button" data-slide-prev>← Previous</button><button class="mobile-button" type="button" data-slide-next>Next →</button></div>`,"Journey Through Time");renderSlide();
  }
  function renderSlide(){
    const target=document.querySelector("#mobile-slide"),item=slideshowItems[slideshowIndex];if(!target||!item)return;let media="";
    if(item.photo){const url=URL.createObjectURL(item.photo);urls.push(url);media=`<img class="mobile-slide-photo" src="${url}" alt="">`;}
    if(item.blob){const url=URL.createObjectURL(item.blob);urls.push(url);media=`<audio controls src="${url}" style="width:100%"></audio>`;}
    target.innerHTML=`<article class="mobile-slide">${media}<div>${item.icon||"✨"}</div><small>Memory ${slideshowIndex+1} of ${slideshowItems.length}</small><h1>${esc(item.title)}</h1><p>${esc(item.detail||"A meaningful part of this journey")}</p><time>${formatDate(item.date)}</time></article>`;
  }
  async function birthdayExport(type){
    const data=BB.store.data,completed=Object.values(data.progress||{}).reduce((sum,value)=>sum+value,0),lines=[`Happy Birthday, ${profile().name}!`,`⭐ ${data.stars} stars earned`,`🌸 ${data.flowers} flowers grown`,`🦋 ${data.butterflies} butterflies earned`,`📚 ${completed} learning activities completed`,`💬 ${Object.keys(data.wordUse||{}).length} communication words explored`,`Look how much you’ve grown!`];
    if(type==="pdf"){printHtml(lines[0],`<div style="text-align:center"><h1>${esc(lines[0])}</h1>${lines.slice(1).map(line=>`<p>${esc(line)}</p>`).join("")}</div>`);return;}
    const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext("2d");ctx.fillStyle="#f7f1ff";ctx.fillRect(0,0,1080,1350);ctx.fillStyle="#7055b8";ctx.textAlign="center";ctx.font="bold 58px system-ui";ctx.fillText(lines[0],540,170);ctx.fillStyle="#24324a";ctx.font="36px system-ui";lines.slice(1).forEach((line,index)=>ctx.fillText(line,540,300+index*125));canvas.toBlob(blob=>downloadBlob(blob,`happy-birthday-${profile().name.replace(/[^a-z0-9]+/gi,"-")}.png`),"image/png");
  }
  async function keepsakeBook(){
    const items=await letters();printHtml(`${profile().name} Keepsake Book`,`<div style="text-align:center;padding:60px 10px"><h1>💌 🌸 🎤</h1><h1>${esc(profile().name)}’s BrightBridge Keepsake Book</h1><p>Letters, memories, growth, and encouragement</p></div><h1>Letters</h1>${items.slice().reverse().map(item=>`<article><h2>💌 ${esc(item.title)}</h2><p>From ${esc(item.author||"Caregiver")} · ${formatDate(item.date)}</p>${sanitizeRichHtml(item.body||"")}</article>`).join("")||"<p>No letters yet.</p>"}`);
  }

  function voiceMetadata(){
    const milestone=!!document.querySelector("[data-mv-milestone]")?.checked;
    return {title:document.querySelector("[data-mv-title]")?.value.trim(),dateTime:document.querySelector("[data-mv-date]")?.value||new Date().toISOString(),age:document.querySelector("[data-mv-age]")?.value.trim(),notes:document.querySelector("[data-mv-notes]")?.value.trim(),tags:(document.querySelector("[data-mv-tags]")?.value||"").split(",").map(item=>item.trim()).filter(Boolean),milestone,milestoneLabel:document.querySelector("[data-mv-milestone-label]")?.value.trim()||(milestone?"Personal Achievement":""),favorite:!!document.querySelector("[data-mv-favorite]")?.checked,replay:!!document.querySelector("[data-mv-replay]")?.checked};
  }
  async function storeVoiceBlob(blob,duration=0){
    const meta=voiceMetadata();
    if(!meta.title){BB.app.toast("Add a recording title first.");return;}
    const record={...meta,id:`voice-${Date.now()}`,profileId:BB.store.data.activeProfile,createdAt:new Date().toISOString(),duration,blob};await saveVoice(record);
    track("voice","First Voice Journey recording",{icon:"🎤",detail:record.title,onceKey:"first-voice"});if(record.milestone)track("milestone",record.milestoneLabel,{icon:"🏆",detail:record.title,onceKey:`milestone-${record.id}`});
    BB.app.toast("Voice Journey memory saved.");open("voice");
  }
  async function startVoiceRecording(){
    const meta=voiceMetadata();if(!meta.title){BB.app.toast("Add a recording title first.");return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){BB.app.toast("Recording is unavailable. Use Upload instead.");return;}
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});recorder=new MediaRecorder(stream);chunks=[];startedAt=Date.now();
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onstop=async()=>{const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});stream?.getTracks().forEach(track=>track.stop());stream=null;await storeVoiceBlob(blob,(Date.now()-startedAt)/1000);};
      recorder.start();document.querySelector("[data-mv-record]")?.setAttribute("hidden","");document.querySelector("[data-mv-stop]")?.removeAttribute("hidden");const status=document.querySelector("[data-mv-status]");if(status)status.innerHTML='<i class="recording-light"></i> Recording…';
    }catch{BB.app.toast("Microphone permission was not available.");}
  }
  function stopVoiceRecording(){if(recorder?.state==="recording")recorder.stop();}

  document.addEventListener("click",async event=>{
    if(event.target.closest("[data-route]"))cancelView();
    const openButton=event.target.closest("[data-mobile-memory-open]");if(openButton){open(openButton.dataset.mobileMemoryOpen);return;}
    if(event.target.closest("[data-mv-record]")){startVoiceRecording();return;}
    if(event.target.closest("[data-mv-stop]")){stopVoiceRecording();return;}
    const voiceDelete=event.target.closest("[data-mv-delete]");if(voiceDelete&&confirm("Delete this private Voice Journey recording?")){await removeVoice(voiceDelete.dataset.mvDelete);open("voice");return;}
    const voiceFavorite=event.target.closest("[data-mv-favorite]");if(voiceFavorite){const item=await voiceStore("readonly",store=>store.get(voiceFavorite.dataset.mvFavorite));if(item){item.favorite=!item.favorite;await saveVoice(item);open("voice");}return;}
    const voiceDownload=event.target.closest("[data-mv-download]");if(voiceDownload){const item=await voiceStore("readonly",store=>store.get(voiceDownload.dataset.mvDownload));if(item)downloadBlob(item.blob,`${item.title.replace(/[^a-z0-9]+/gi,"-")||"voice-memory"}.webm`);return;}
    const printRecord=event.target.closest("[data-memory-print-record]");if(printRecord){printSummary("record",printRecord.dataset.memoryPrintRecord);return;}
    if(event.target.closest("[data-mv-export-all]")){exportAudioZip();return;}
    if(event.target.closest("[data-mv-export-selected]")){exportAudioZip(true);return;}
    if(event.target.closest("[data-mv-compare]")){const items=await voices(),left=items.find(item=>item.id===document.querySelector("[data-mv-compare-left]")?.value),right=items.find(item=>item.id===document.querySelector("[data-mv-compare-right]")?.value),target=document.querySelector("#mobile-comparison");if(left&&right&&target){revokeUrls();target.innerHTML=comparisonCard(left,"Recording one")+comparisonCard(right,"Recording two");}return;}
    const printButton=event.target.closest("[data-memory-print]");if(printButton){printSummary(printButton.dataset.memoryPrint);return;}
    if(event.target.closest("[data-memory-slideshow]")){showSlideshow();return;}
    if(event.target.closest("[data-slide-next]")){slideshowIndex=(slideshowIndex+1)%slideshowItems.length;renderSlide();return;}
    if(event.target.closest("[data-slide-prev]")){slideshowIndex=(slideshowIndex-1+slideshowItems.length)%slideshowItems.length;renderSlide();return;}
    if(event.target.closest("[data-keepsake-book]")){keepsakeBook();return;}
    const letterPrint=event.target.closest("[data-ml-print]");if(letterPrint){const item=(await letters()).find(letter=>letter.id===letterPrint.dataset.mlPrint);if(item)printHtml(item.title,`<h1>${esc(item.title)}</h1><p>${formatDate(item.date)} · Age ${esc(item.age||"not added")}</p><p><strong>From ${esc(item.author||"Caregiver")}</strong></p>${sanitizeRichHtml(item.body||"")}<p><em>Future reading choice: ${esc(item.unlockRule||"Read Anytime")}</em></p>`);return;}
    const formatButton=event.target.closest("[data-ml-format]");if(formatButton){document.execCommand(formatButton.dataset.mlFormat,false);document.querySelector("[data-ml-body]")?.focus();return;}
    if(event.target.closest("[data-ml-save]")){const title=document.querySelector("[data-ml-title]")?.value.trim(),author=document.querySelector("[data-ml-author]")?.value.trim(),body=sanitizeRichHtml(document.querySelector("[data-ml-body]")?.innerHTML||""),photo=document.querySelector("[data-ml-photo]")?.files[0]||null,voiceId=document.querySelector("[data-ml-voice]")?.value||"",voiceItem=(await voices()).find(item=>item.id===voiceId);if(!title||!body.replace(/<[^>]+>/g,"").trim()){BB.app.toast("Add a title and letter message.");return;}if(photo&&(!photo.type.startsWith("image/")||photo.size>8*1024*1024)){BB.app.toast("Choose a photo smaller than 8 MB.");return;}await privateStore("letters","readwrite",store=>store.put({id:`letter-${Date.now()}`,profileId:BB.store.data.activeProfile,title,author:author||"Caregiver",body,date:document.querySelector("[data-ml-date]")?.value||new Date().toISOString(),age:document.querySelector("[data-ml-age]")?.value.trim(),unlockRule:document.querySelector("[data-ml-unlock]")?.value||"Read Anytime",memories:(document.querySelector("[data-ml-memories]")?.value||"").split(",").map(item=>item.trim()).filter(Boolean),voiceId,voiceTitle:voiceItem?.title||"",dayReplay:document.querySelector("[data-ml-day]")?.value.trim()||"",gardenSnapshot:document.querySelector("[data-ml-garden]")?.checked?{flowers:BB.store.data.flowers,butterflies:BB.store.data.butterflies,stars:BB.store.data.stars}:null,photo,createdAt:new Date().toISOString()}));BB.app.toast("Private letter saved.");open("letters");return;}
    const letterDelete=event.target.closest("[data-ml-delete]");if(letterDelete&&confirm("Delete this private letter?")){try{await privateStore("letters","readwrite",store=>store.delete(letterDelete.dataset.mlDelete));}catch{}state().mobileLetters=state().mobileLetters.filter(item=>item.id!==letterDelete.dataset.mlDelete);BB.store.save();open("letters");return;}
    const stage=event.target.closest("[data-mg-stage]");if(stage){growth().stage=stage.dataset.mgStage;BB.store.save();applyGrowthPath();BB.app.toast("Growth stage updated. All history was preserved.");open("growth");return;}
    const feature=event.target.closest("[data-mg-feature]");if(feature){const key=feature.dataset.mgFeature;growth().enabledFeatures[key]=!growth().enabledFeatures[key];BB.store.save();applyGrowthPath();open("growth");return;}
    const toggle=event.target.closest("[data-mg-toggle]");if(toggle){const key=toggle.dataset.mgToggle;growth()[key]=!growth()[key];BB.store.save();applyGrowthPath();open("growth");return;}
    const preview=event.target.closest("[data-mg-preview]");if(preview){const item=stages.find(stage=>stage.id===preview.dataset.mgPreview);BB.app.modal(`<div class="mobile-modal-head"><h2>${item.icon} ${item.name}</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><p><strong>${item.ages}</strong></p><p>${item.focus}</p><p class="muted">Preview only. No stage or memory was changed.</p>`,"Growth Path preview");return;}
    const birthday=event.target.closest("[data-birthday-export]");if(birthday){birthdayExport(birthday.dataset.birthdayExport);return;}
  });
  document.addEventListener("input",event=>{if(event.target.matches("[data-mv-search]")){voiceQuery=event.target.value;clearTimeout(event.target._searchTimer);event.target._searchTimer=setTimeout(()=>open("voice"),250);}});
  document.addEventListener("change",event=>{
    if(event.target.matches("[data-mv-upload]")&&event.target.files[0]){const meta=voiceMetadata();if(!meta.title){BB.app.toast("Add a recording title first.");event.target.value="";return;}const file=event.target.files[0];if(!file.type.startsWith("audio/")||file.size>25*1024*1024){BB.app.toast("Choose an audio file smaller than 25 MB.");event.target.value="";return;}storeVoiceBlob(file,0);}
    if(event.target.matches("[data-mv-sort]")){voiceSort=event.target.value;open("voice");}
    if(event.target.matches("[data-mg-birthday]")){profile().birthDate=event.target.value;BB.store.save();}
  });
  window.addEventListener("bb:state",applyGrowthPath);
  window.BB=window.BB||{};
  BB.memoryJourney={open,cancelView,track,applyGrowthPath,stageVocabulary,homeBanner,exportAll,importAll,clear};
  applyGrowthPath();
})();

(function () {
  "use strict";

  const view=document.querySelector("#view");
  const modalRoot=document.querySelector("#modal-root");
  const toastRoot=document.querySelector("#toast-root");
  const learningIds=["alphabet","phonics","numbers","counting","colors","shapes","patterns","animals","food","naturelearn","vehicles","weather","bodyparts","helpers","sorting","matching","tracing","memorygame","puzzles","emotions","lifeskills","employment","community","money","advocacy","wellness"];
  const aac={
    Quick:[["I want","☝️"],["I need","🙋"],["More","➕"],["All done","✅"],["Yes","👍"],["No","👎"],["Please","💜"],["Thank you","🌟"]],
    "Core Words":[["I","🙋"],["You","👉"],["I want","☝️"],["I need","🙋"],["I like","💜"],["I don't like","🙅"],["More","➕"],["Different","🔄"],["Finished","✅"],["Yes","👍"],["No","👎"],["Please","🙏"]],
    Questions:[["What?","❓"],["Where?","📍"],["When?","🕐"],["Why?","🤔"],["Who?","👤"],["Can you help?","🆘"],["Can you repeat that?","🔁"],["What happens next?","➡️"]],
    "Sensory Needs":[["Too bright","☀️"],["Too loud","🔇"],["Too crowded","👥"],["Quiet please","🤫"],["I need headphones","🎧"],["I need pressure","🤗"],["I need movement","🏃"],["I need a sensory break","🌈"]],
    "Body & Pain":[["My head hurts","🤕"],["My stomach hurts","🤢"],["My throat hurts","🗣️"],["My tooth hurts","🦷"],["It is itchy","🖐️"],["I feel dizzy","💫"],["I feel sick","🤒"],["Small pain","1️⃣"],["Medium pain","2️⃣"],["Big pain","3️⃣"]],
    "Consent & Safety":[["Stop","✋"],["Don't touch me","🛑"],["I need space","↔️"],["I don't feel safe","⚠️"],["I need a trusted adult","🧑‍🤝‍🧑"],["Please move back","⬅️"],["I do not consent","🚫"],["Call my caregiver","📞"]],
    Regulation:[["I am overwhelmed","🌊"],["I am frustrated","😣"],["I am confused","😕"],["I am worried","😟"],["I need time","⏳"],["I need quiet","🤫"],["I need to move","🏃"],["I am ready","✅"]],
    Conversation:[["Hello","👋"],["Goodbye","👋"],["My name is","🏷️"],["How are you?","😊"],["I agree","👍"],["I disagree","👎"],["Tell me more","💬"],["I want to talk about","🗨️"]],
    Food:[["Apple","🍎"],["Banana","🍌"],["Sandwich","🥪"],["Crackers","🍘"],["Yogurt","🥣"],["Hungry","😋"]],
    Drinks:[["Water","💧"],["Milk","🥛"],["Juice","🧃"],["Thirsty","😮"],["Cup","🥤"]],
    Bathroom:[["Bathroom","🚻"],["Toilet","🚽"],["Wash hands","🧼"],["Help please","🙋"],["Wet","💦"]],
    Help:[["Help","🆘"],["Stop","✋"],["Break","⏸️"],["Too loud","🔇"],["It hurts","🩹"],["I don't know","🤷"]],
    Feelings:[["Happy","😊"],["Sad","😢"],["Angry","😠"],["Calm","😌"],["Scared","😨"],["Tired","😴"],["Excited","🤩"]],
    Family:[["Mom","👩"],["Dad","👨"],["Grandma","👵"],["Grandpa","👴"],["Brother","👦"],["Sister","👧"],["Home","🏠"]],
    Animals:[["Dog","🐶"],["Cat","🐱"],["Bird","🐦"],["Fish","🐠"],["Horse","🐴"],["Animal","🐾"]],
    School:[["Teacher","🧑‍🏫"],["School","🏫"],["Book","📖"],["Pencil","✏️"],["Friend","🧑‍🤝‍🧑"],["My turn","☝️"],["I have a question","❓"],["Repeat please","🔁"],["I need more time","⏳"],["I understand","💡"],["I don't understand","🤔"],["I need help","🆘"],["I need a break","⏸️"],["I finished my work","✅"]],
    Medical:[["Doctor","🩺"],["Medicine","💊"],["My head hurts","🤕"],["My tummy hurts","🤢"],["Bandage","🩹"],["Emergency","🚑"]],
    Transportation:[["Car","🚗"],["Bus","🚌"],["Train","🚆"],["Bike","🚲"],["Go","🟢"],["Stop","🛑"]],
    "Daily Routines":[["Get dressed","👕"],["Take a shower","🚿"],["Brush teeth","🪥"],["Take medicine","💊"],["Eat","🍽️"],["Clean up","🧹"],["Bedtime","🛏️"],["Morning routine","🌅"]],
    "Places & People":[["Home","🏠"],["School","🏫"],["Store","🛒"],["Doctor","🩺"],["Bathroom","🚻"],["Family","👪"],["Teacher","🧑‍🏫"],["Trusted adult","🧑‍🤝‍🧑"]],
    Independence:[["I need transportation","🚌"],["How much does it cost?","💵"],["I have an appointment","📅"],["I need an accommodation","♿"],["I can decide","✅"],["I need help with work","💼"],["I need directions","🧭"],["My goal is","🎯"]]
  };
  const quickTalk=[["Help","🆘"],["Stop","✋"],["Yes","👍"],["No","👎"],["Bathroom","🚻"],["Break","⏸️"],["It hurts","🩹"],["All done","✅"]];
  const spanishWords={"I want":"Quiero","I need":"Necesito","More":"Más","All done":"Terminé","Yes":"Sí","No":"No","Please":"Por favor","Thank you":"Gracias","Apple":"Manzana","Banana":"Plátano","Sandwich":"Sándwich","Crackers":"Galletas","Yogurt":"Yogur","Hungry":"Tengo hambre","Water":"Agua","Milk":"Leche","Juice":"Jugo","Thirsty":"Tengo sed","Cup":"Vaso","Bathroom":"Baño","Toilet":"Inodoro","Wash hands":"Lavar las manos","Help please":"Ayuda, por favor","Wet":"Mojado","Help":"Ayuda","Stop":"Alto","Break":"Descanso","Too loud":"Demasiado fuerte","It hurts":"Me duele","I don't know":"No sé","Happy":"Feliz","Sad":"Triste","Angry":"Enojado","Calm":"Tranquilo","Scared":"Asustado","Tired":"Cansado","Excited":"Emocionado","Mom":"Mamá","Dad":"Papá","Grandma":"Abuela","Grandpa":"Abuelo","Brother":"Hermano","Sister":"Hermana","Home":"Casa","Dog":"Perro","Cat":"Gato","Bird":"Pájaro","Fish":"Pez","Horse":"Caballo","Animal":"Animal","Teacher":"Maestro","School":"Escuela","Book":"Libro","Pencil":"Lápiz","Friend":"Amigo","My turn":"Mi turno","Doctor":"Doctor","Medicine":"Medicina","My head hurts":"Me duele la cabeza","My tummy hurts":"Me duele el estómago","Bandage":"Venda","Emergency":"Emergencia","Car":"Carro","Bus":"Autobús","Train":"Tren","Bike":"Bicicleta","Go":"Ir","Again please":"Otra vez, por favor","Look with me":"Mira conmigo","My favorite":"Mi favorito","I can read":"Puedo leer","What comes next?":"¿Qué sigue?","I need a schedule":"Necesito un horario","I have a goal":"Tengo una meta","I need more time":"Necesito más tiempo","Can you explain?":"¿Puedes explicar?","I can speak up for myself":"Puedo defenderme","I need transportation":"Necesito transporte","My future goal":"Mi meta futura"};
  const feelings=[["Happy","😊","I feel bright and happy."],["Sad","😢","I may want comfort."],["Angry","😠","I can pause and breathe."],["Calm","😌","My body feels quiet."],["Scared","😨","I can find a safe grown-up."],["Tired","😴","My body may need rest."],["Excited","🤩","I have lots of happy energy."],["Frustrated","😣","I can take a break and try later."]];
  const settingsRows={
    speech:["Family voice playback","Use saved caregiver recordings"],
    effects:["Gentle sound effects","Play success and try-again tones"],
    music:["Music","Allow musical activities"],
    dark:["Dark mode","Use dim-room colors"],
    highContrast:["High contrast","Make borders stand out"],
    largeText:["Large text","Increase words and controls"],
    reducedMotion:["Reduce motion","Keep transitions still"],
    simpleMode:["Simple mode","Show fewer choices"],
    colorFriendly:["Color-friendly palette","Use patterns and stronger shape cues"],
    offlineMode:["Offline mode","Keep core activities ready without internet"],
    notifications:["Notifications","Optional caregiver-approved reminders"]
  };

  let route="home";
  const history=[];
  let parentUnlocked=false;
  let pinSuccess=null;
  let sentence="";
  let category="Quick";
  let voiceSetup=false;
  let customCards=[];
  let customLoadedProfile="";
  let customPhotoUrls=[];
  let customDbPromise=null;
  let recorder=null;
  let stream=null;
  let chunks=[];
  let recordingLabel="";
  let currentGame=null;
  let cardIndex=0;
  let roundIndex=0;
  let quizLocked=false;
  let quizAttempts=0;
  let currentRoutine="Brush teeth";
  let completedSteps=new Set();
  let socialIndex=0;
  let instrument="piano";
  let installPrompt=null;
  let sensoryMode="bubbles";
  const sensoryExperiences={
    bubbles:["🫧","Bubbles","Tap to make and pop bubbles."],rainbow:["🌈","Rainbow Draw","Drag a colorful trail."],water:["💧","Water Ripples","Tap to make gentle ripples."],balloons:["🎈","Balloons","Tap to float a balloon."],leaves:["🍃","Leaves","Fill the space with drifting leaves."],snow:["❄️","Snow","Make quiet snowflakes."],stars:["⭐","Stars","Light up a calm night sky."],paint:["🎨","Magic Paint","Drag to add soft color."],fireflies:["✨","Fireflies","Create tiny glowing lights."],ocean:["🌊","Ocean Waves","Make peaceful ocean waves."]
  };

  function esc(value=""){
    return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
  }

  function pageHead(title,subtitle,back="home"){
    return `<div class="mobile-page-head"><button type="button" data-route="${back}" aria-label="Go back">←</button><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div></div>`;
  }

  function activeProfile(){
    const data=BB.store.data;
    return data.profiles.find(profile=>profile.id===data.activeProfile)||data.profiles[0];
  }

  function customDatabase(){
    if(customDbPromise)return customDbPromise;
    customDbPromise=new Promise((resolve,reject)=>{
      if(!window.indexedDB){reject(new Error("Private card storage is unavailable."));return;}
      const request=indexedDB.open("brightbridge-mobile-custom-aac",1);
      const timer=setTimeout(()=>reject(new Error("Private card storage timed out.")),2500);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains("cards"))db.createObjectStore("cards",{keyPath:"id"});};
      request.onsuccess=()=>{clearTimeout(timer);resolve(request.result);};
      request.onerror=()=>{clearTimeout(timer);reject(request.error);};
      request.onblocked=()=>{clearTimeout(timer);reject(new Error("Close another BrightBridge tab and try again."));};
    }).catch(error=>{customDbPromise=null;throw error;});
    return customDbPromise;
  }

  async function customStore(mode,work){
    const db=await customDatabase();
    return new Promise((resolve,reject)=>{
      const transaction=db.transaction("cards",mode),store=transaction.objectStore("cards");
      let request;
      try{request=work(store);}catch(error){reject(error);return;}
      transaction.oncomplete=()=>resolve(request?.result);
      transaction.onerror=()=>reject(transaction.error);
      transaction.onabort=()=>reject(transaction.error||new Error("The custom card change was stopped."));
    });
  }

  function releaseCustomPhotos(){
    customPhotoUrls.forEach(url=>URL.revokeObjectURL(url));
    customPhotoUrls=[];
  }

  async function loadCustomCards(force=false){
    const profileId=activeProfile().id;
    if(!force&&customLoadedProfile===profileId)return;
    try{
      const records=await customStore("readonly",store=>store.getAll());
      releaseCustomPhotos();
      customCards=(records||[]).filter(item=>item.profileId===profileId).sort((a,b)=>(a.order||0)-(b.order||0)||(a.createdAt||0)-(b.createdAt||0)).map(item=>{
        if(!item.photo)return item;
        const photoUrl=URL.createObjectURL(item.photo);customPhotoUrls.push(photoUrl);return {...item,photoUrl};
      });
      customLoadedProfile=profileId;
      if(route==="communication"){view.innerHTML=renderCommunication();if(voiceSetup)setTimeout(refreshVoiceList,0);}
    }catch{toast("Custom cards could not be opened on this device.");}
  }

  async function saveCustomCard(card){
    await customStore("readwrite",store=>store.put(card));
    customLoadedProfile="";
    await loadCustomCards(true);
  }

  async function removeCustomCard(id){
    await customStore("readwrite",store=>store.delete(id));
    customLoadedProfile="";
    await loadCustomCards(true);
  }

  async function clearCustomCards(){
    try{await customStore("readwrite",store=>store.clear());}catch{}
    releaseCustomPhotos();customCards=[];customLoadedProfile="";
  }

  async function updateCustomOrder(id,direction){
    const ordered=[...customCards].sort((a,b)=>(a.order||0)-(b.order||0));
    const index=ordered.findIndex(item=>item.id===id),swapIndex=index+direction;
    if(index<0||swapIndex<0||swapIndex>=ordered.length)return;
    const first=ordered[index],second=ordered[swapIndex],firstOrder=first.order||index,secondOrder=second.order||swapIndex;
    const {photoUrl:firstUrl,...firstStored}=first,{photoUrl:secondUrl,...secondStored}=second;
    await Promise.all([
      customStore("readwrite",store=>store.put({...firstStored,order:secondOrder})),
      customStore("readwrite",store=>store.put({...secondStored,order:firstOrder}))
    ]);
    customLoadedProfile="";
    await loadCustomCards(true);
  }

  function emergencyItems(){
    const profile=activeProfile(),items=[
      [`My name is ${profile.name}`,"🏷️"],
      ["Emergency help","🚨"],["Call 911","📞"],["I am lost","🧭"],["I need medical help","🚑"],
      ["I cannot speak","💬"],["Please read my cards","📱"]
    ];
    if(profile.caregiverPhone)items.splice(1,0,[`Call my caregiver at ${profile.caregiverPhone}`,"📞"]);
    if(profile.address)items.splice(2,0,[`My address is ${profile.address}`,"🏠"]);
    if(profile.allergies)items.splice(3,0,[`My allergies are ${profile.allergies}`,"⚠️"]);
    return items;
  }

  function visibleCustomItems(){
    return customCards.filter(item=>!item.hidden).map(item=>[item.label,item.icon||"💬",item.photoUrl||"",item.id]);
  }

  async function addCustomCard(){
    const label=document.querySelector("[data-custom-label]")?.value.trim();
    const cardCategory=document.querySelector("[data-custom-category]")?.value.trim()||"Custom";
    const icon=document.querySelector("[data-custom-icon]")?.value.trim()||"💬";
    const photo=document.querySelector("[data-custom-photo]")?.files?.[0]||null;
    if(!label){toast("Write the words for this card first.");return;}
    if(photo&&(!photo.type.startsWith("image/")||photo.size>5*1024*1024)){toast("Choose an image smaller than 5 MB.");return;}
    const id=crypto.randomUUID?.()||`custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const order=customCards.reduce((highest,item)=>Math.max(highest,Number(item.order)||0),0)+1;
    try{
      category=cardCategory.slice(0,30);
      await saveCustomCard({id,profileId:activeProfile().id,label:label.slice(0,80),category:cardCategory.slice(0,30),icon:icon.slice(0,8),photo,hidden:false,order,createdAt:Date.now()});
      toast(`Custom card saved for “${label}”`);
    }catch{toast("That custom card could not be saved.");}
  }

  function updateHeader(){
    document.querySelector("#header-stars").textContent=BB.store.data.stars;
  }

  function toast(message){
    toastRoot.innerHTML=`<div class="mobile-toast">${esc(message)}</div>`;
    clearTimeout(toast._timer);
    toast._timer=setTimeout(()=>toastRoot.innerHTML="",3000);
  }

  function pip(message,mood="😊",voicePhrase=""){
    document.querySelector("#pip-expression").textContent=mood;
    document.querySelector("#pip-bubble").textContent=message;
    if(voicePhrase)BB.speech.speak(voicePhrase);
  }

  function modal(content,label){
    modalRoot.innerHTML=`<div class="mobile-modal-overlay" data-action="modal-overlay"><section class="mobile-modal" role="dialog" aria-modal="true" aria-label="${esc(label)}">${content}</section></div>`;
    modalRoot.querySelector("input,button")?.focus();
  }

  function closeModal(){
    modalRoot.innerHTML="";
    pinSuccess=null;
    BB.speech.stop();
  }

  function resetPageScroll(){
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
    window.scrollTo(0,0);
    const repeat=()=>{document.documentElement.scrollTop=0;document.body.scrollTop=0;window.scrollTo(0,0);};
    if(window.requestAnimationFrame)window.requestAnimationFrame(repeat);
    else setTimeout(repeat,0);
  }

  function go(next,options={}){
    resetPageScroll();
    if(!options.replace&&route!==next)history.push(route);
    if(next!=="communication"&&recorder?.state==="recording")stopRecording();
    BB.memoryJourney?.cancelView?.();
    BB.audio.stopMusic();
    BB.speech.stop();
    route=next;
    render(options);
    document.querySelectorAll(".mobile-bottom-nav [data-route]").forEach(button=>{
      const navRoute=button.dataset.route;
      button.classList.toggle("active",navRoute===route||(navRoute==="more"&&["music","nature","daily","social","rewards","progress","tools","parent","settings"].includes(route)));
    });
    view.focus({preventScroll:true});
    resetPageScroll();
  }

  function render(options={}){
    updateHeader();
    const screens={
      home:renderHome,communication:renderCommunication,learning:renderLearning,
      flashcards:()=>renderFlashcards(options),quiz:()=>renderQuiz(options),
      calm:renderCalm,music:renderMusic,nature:renderNature,daily:renderDaily,
      social:renderSocial,rewards:renderRewards,progress:renderProgress,
      more:renderMore,tools:()=>BB.mobileTools.render(),parent:renderParent,settings:renderSettings,
      memory:()=>`${pageHead("Private Memory Studio","Opening the selected caregiver feature…","parent")}<div class="mobile-panel">💜 Gathering private memories…</div>`
    };
    view.innerHTML=(screens[route]||renderHome)();
    BB.store.data.activityVisits[route]=(BB.store.data.activityVisits[route]||0)+1;
    BB.store.save();
    if(route==="communication"){
      if(voiceSetup)setTimeout(refreshVoiceList,0);
      if(customLoadedProfile!==activeProfile().id)setTimeout(()=>loadCustomCards(),0);
    }
    if(route==="calm")setupSensory();
    if(route==="flashcards"&&currentGame?.id==="tracing")setupTracing();
    if(route==="tools")BB.mobileTools.afterRender();
    if(route==="memory")BB.memoryJourney.open(options.section||"hub",{withinRoute:true});
  }

  function renderHome(){
    const profile=activeProfile();
    const cards=[
      ["communication","💬","Communication","Words, cards, and family voices","#ffe5df"],
      ["learning","📚","Learning","Flashcards and gentle challenges","#ece5ff"],
      ["calm","☁️","Feelings & Calm","Breathe, name feelings, and sensory play","#dff4ff"],
      ["daily","🚪","Daily Living","Practice familiar routines","#e5f2ff"],
      ["music","🎹","Music","Play notes and discover sounds","#fff0c9"],
      ["nature","🦋","Nature","Explore animals, gardens, oceans, and space","#ddf5ed"]
    ];
    return `<section>
      <div class="mobile-hero"><div class="mobile-hero-row"><div><p class="muted">Welcome back</p><h1>Hello, ${esc(profile.name)}!</h1></div><div class="mobile-hero-face">😊</div></div><p>Choose what feels good today. There is no timer, no losing, and you can always try again.</p></div>
      ${BB.memoryJourney?.homeBanner?.()||""}
      <div class="mobile-whats-new"><div><span>✨ MOBILE 25</span><h2>More ways to communicate</h2><p>Quick Talk, expanded conversation packs, and private custom cards are ready.</p></div><div class="mobile-quick-grid"><button type="button" data-route="communication"><span>💬</span><strong>Quick Talk & Card Packs</strong><small>Safety, sensory, school & more</small></button><button type="button" data-route="tools"><span>🧰</span><strong>My Tools</strong><small>Schedules, choices & photos</small></button><button type="button" data-route="calm"><span>🌈</span><strong>10 Sensory Worlds</strong><small>Draw, ripple, float & glow</small></button><button type="button" data-route="parent"><span>🔒</span><strong>Memories & Growth</strong><small>PIN-protected caregiver area</small></button></div></div>
      <div class="mobile-section-title"><h2>Choose an adventure</h2><small>Tap any card</small></div>
      <div class="mobile-card-grid">${cards.map(([id,icon,title,detail,color])=>`<button class="mobile-home-card" style="--card:${color}" type="button" data-route="${id}"><span>${icon}</span><strong>${title}</strong><small>${detail}</small></button>`).join("")}</div>
    </section>`;
  }

  function communicationItems(){
    const growthWords=BB.memoryJourney?.stageVocabulary?.()||[];
    const custom=visibleCustomItems(),all=[...Object.values(aac).flat(),...emergencyItems(),...growthWords,...custom];
    let items;
    if(category==="Favorites")items=all.filter(([word])=>BB.store.data.favorites.includes(word)||BB.store.data.favorites.includes(spanishWords[word]));
    else if(category==="Recent")items=BB.store.data.recentWords.map(word=>all.find(item=>item[0]===word||spanishWords[item[0]]===word)||[word,"💬"]);
    else if(category==="Growth Path")items=growthWords;
    else if(category==="Emergency")items=emergencyItems();
    else{
      const customInCategory=customCards.filter(item=>!item.hidden&&(item.category||"Custom")===category).map(item=>[item.label,item.icon||"💬",item.photoUrl||"",item.id]);
      items=[...(aac[category]||[]),...customInCategory];
      if(!items.length)items=aac.Quick;
    }
    return BB.store.data.settings.language==="es-US"?items.map(([word,icon,photo,id])=>[spanishWords[word]||word,icon,photo,id]):items;
  }

  function renderCustomManager(){
    const rows=customCards.map((item,index)=>`<div class="mobile-custom-row ${item.hidden?"is-hidden":""}">
      <span class="mobile-custom-preview">${item.photoUrl?`<img src="${item.photoUrl}" alt="">`:esc(item.icon||"💬")}</span>
      <div><strong>${esc(item.label)}</strong><small>${esc(item.category||"Custom")}${item.hidden?" · hidden":""}</small></div>
      <div class="mobile-custom-actions">
        <button type="button" data-custom-move="${esc(item.id)}" data-direction="-1" aria-label="Move ${esc(item.label)} up" ${index===0?"disabled":""}>↑</button>
        <button type="button" data-custom-move="${esc(item.id)}" data-direction="1" aria-label="Move ${esc(item.label)} down" ${index===customCards.length-1?"disabled":""}>↓</button>
        <button type="button" data-custom-hide="${esc(item.id)}" aria-label="${item.hidden?"Show":"Hide"} ${esc(item.label)}">${item.hidden?"👁":"🙈"}</button>
        <button type="button" data-custom-delete="${esc(item.id)}" aria-label="Delete ${esc(item.label)}">🗑️</button>
      </div>
    </div>`).join("");
    return `<div class="mobile-custom-manager">
      <h3>✨ Custom Conversation Cards</h3>
      <p>Add a familiar phrase, emoji or personal photo. After saving, open its category below to record the matching family voice.</p>
      <div class="mobile-custom-form">
        <label><span>Words on card</span><input data-custom-label maxlength="80" placeholder="Example: I want my blue cup"></label>
        <label><span>Category</span><input data-custom-category maxlength="30" value="Custom" placeholder="Custom"></label>
        <label><span>Emoji or icon</span><input data-custom-icon maxlength="8" value="💬" aria-label="Card emoji"></label>
        <label><span>Personal photo (optional)</span><input type="file" accept="image/*" data-custom-photo></label>
        <button class="mobile-button mobile-wide-button" type="button" data-action="custom-add">Save custom card</button>
      </div>
      <div class="mobile-custom-list">${rows||'<p class="muted">No custom cards yet.</p>'}</div>
    </div>`;
  }

  function renderCommunication(){
    const items=communicationItems();
    const customCategories=[...new Set(customCards.filter(item=>!item.hidden).map(item=>item.category||"Custom"))];
    const categories=[...new Set([...Object.keys(aac),"Emergency",...customCategories,"Growth Path","Favorites","Recent"])];
    return `<section>
      ${pageHead("Communication","Tap cards to build the sentence exactly as written.")}
      <div class="mobile-voice-banner"><div><strong>🎙️ Family Voice Cards</strong><small>Caregivers record directly on the matching card.</small></div><button type="button" data-action="voice-setup">${voiceSetup?"Done":"Set up"}</button></div>
      ${voiceSetup?`<div class="mobile-panel"><h3>Private caregiver recording mode</h3><p>Record or upload the exact words shown on each card. Recordings stay on this device.</p><div id="voice-list" class="voice-list"><p class="muted">Checking saved voices…</p></div>${renderCustomManager()}</div><div class="mobile-recording"><span data-record-status>Choose a card to record.</span><button type="button" data-action="record-stop" hidden>■ Stop & save</button></div>`:""}
      <div class="mobile-sentence"><textarea rows="2" data-sentence aria-label="Communication sentence" placeholder="Your sentence…">${esc(sentence)}</textarea><div class="mobile-sentence-actions"><button type="button" data-action="sentence-clear" aria-label="Clear">✕</button><button type="button" data-action="sentence-speak" aria-label="Play the exact sentence">🔊</button></div></div>
      <div class="mobile-quick-talk" aria-label="Quick Talk"><strong>Quick Talk</strong><div>${quickTalk.map(([word,icon])=>{const shown=BB.store.data.settings.language==="es-US"?(spanishWords[word]||word):word;return `<button type="button" data-word="${esc(shown)}"><span>${icon}</span>${esc(shown)}</button>`;}).join("")}</div></div>
      <div class="mobile-category-row">${categories.map(name=>`<button class="mobile-chip ${category===name?"active":""}" type="button" data-category="${esc(name)}">${esc(name)}</button>`).join("")}</div>
      <div class="mobile-aac-grid">${items.length?items.map(([word,icon,photo])=>`<article class="mobile-aac-card"><button class="mobile-favorite" type="button" data-favorite="${esc(word)}" aria-label="Favorite ${esc(word)}">${BB.store.data.favorites.includes(word)?"⭐":"☆"}</button><button class="mobile-aac-say" type="button" data-word="${esc(word)}">${photo?`<img class="mobile-aac-photo" src="${photo}" alt="">`:`<span class="icon">${icon}</span>`}<strong>${esc(word)}</strong></button>${voiceSetup?`<div class="mobile-voice-actions"><button type="button" data-record-card="${esc(word)}">🎙️ Record</button><label>⬆ Upload<input class="sr-only" type="file" accept="audio/*" data-upload-card="${esc(word)}"></label></div>`:""}</article>`).join(""):`<div class="mobile-panel"><h3>No cards here yet</h3><p>Add a custom card or choose another category.</p></div>`}</div>
    </section>`;
  }

  function renderLearning(){
    const stage=BB.store.data.profiles.find(item=>item.id===BB.store.data.activeProfile)?.growthPath?.stage||"early-explorer",limits={"early-explorer":10,"growing-learner":16,"independent-communicator":20,"teen-young-adult":26},ids=learningIds.slice(0,BB.store.data.settings.simpleMode?8:limits[stage]||20);
    return `<section>${pageHead("Learning Adventures","Choose cards to explore or play a gentle challenge.")}
      <div class="mobile-list">${ids.map(id=>{const game=BB.games[id];return `<article class="mobile-list-card" style="--soft:${game.color}"><span>${game.icon}</span><div><strong>${esc(game.title)}</strong><small>${esc(game.description)}</small></div><div><button class="mobile-button secondary" type="button" data-cards="${id}">Cards</button><button class="mobile-button" type="button" data-play="${id}">Play</button></div></article>`;}).join("")}</div>
    </section>`;
  }

  function renderFlashcards(options={}){
    if(options.game){currentGame=BB.games[options.game];cardIndex=0;}
    if(!currentGame)return renderLearning();
    const card=currentGame.cards[cardIndex];
    return `<section>${pageHead(currentGame.title,`Card ${cardIndex+1} of ${currentGame.cards.length}`,"learning")}
      <div class="mobile-flashcard"><div><div class="mobile-flash-symbol">${card.symbol}</div><div class="mobile-flash-word">${esc(card.word)}</div><p>${card.emoji} ${esc(card.detail)}</p></div></div>
      ${currentGame.id==="tracing"?`<div class="mobile-panel"><h3>Trace with your finger</h3><canvas class="mobile-trace-pad" data-trace-canvas width="700" height="360" aria-label="Tracing drawing pad"></canvas><button class="mobile-button secondary mobile-wide-button" type="button" data-action="trace-clear">Clear drawing</button></div>`:""}
      <div class="mobile-button-row"><button class="mobile-button secondary" type="button" data-action="card-prev">← Back</button><button class="mobile-button" type="button" data-action="card-hear">🔊 Hear</button><button class="mobile-button secondary" type="button" data-action="card-next">Next →</button></div>
    </section>`;
  }

  function renderQuiz(options={}){
    if(options.game){currentGame=BB.games[options.game];roundIndex=0;quizLocked=false;quizAttempts=0;}
    if(!currentGame)return renderLearning();
    const round=currentGame.rounds[roundIndex];
    return `<section>${pageHead(currentGame.title,`Challenge ${roundIndex+1} of ${currentGame.rounds.length}`,"learning")}
      <div class="mobile-question"><h2>${esc(round.prompt)}</h2><div class="visual">${esc(round.visual)}</div></div>
      <div id="quiz-result" class="mobile-answers">${round.options.map(([symbol,label],index)=>`<button class="mobile-answer" type="button" data-answer="${index}"><span>${symbol}</span>${esc(label)}</button>`).join("")}</div>
    </section>`;
  }

  function renderCalm(){
    const experience=sensoryExperiences[sensoryMode];
    return `<section>${pageHead("Feelings & Calm","Name a feeling, breathe, or gently pop bubbles.")}
      <div class="mobile-feelings">${feelings.map(([name,icon,detail])=>`<button class="mobile-feeling" type="button" data-feeling="${esc(name)}|${esc(detail)}"><span>${icon}</span>${esc(name)}</button>`).join("")}</div>
      <div class="mobile-section-title"><h2>Sensory Play</h2><small>No score · explore freely</small></div><div class="mobile-category-row">${Object.entries(sensoryExperiences).map(([id,[icon,label]])=>`<button class="mobile-chip ${id===sensoryMode?"active":""}" type="button" data-sensory-mode="${id}">${icon} ${label}</button>`).join("")}</div><div class="mobile-sensory mode-${sensoryMode}" data-sensory aria-label="${esc(experience[2])}"><p>${experience[0]} ${esc(experience[2])}</p></div>
      <div class="mobile-button-row" style="margin-top:12px"><button class="mobile-button" type="button" data-action="breathe">☁️ Breathe with Pip</button></div>
    </section>`;
  }

  function renderMusic(){
    const instruments=BB.games.music.instruments;
    const selected=instruments[instrument];
    return `<section>${pageHead("Music","Tap notes freely. There is no wrong sound.","more")}
      <div class="mobile-category-row">${Object.entries(instruments).map(([id,item])=>`<button class="mobile-chip ${id===instrument?"active":""}" type="button" data-instrument="${id}">${item.icon} ${esc(item.label)}</button>`).join("")}</div>
      <div class="mobile-music-grid">${selected.notes.map((frequency,index)=>`<button class="mobile-note" style="--note:${["#7055b8","#547bd1","#51a9b7","#51b79f","#e1a93c","#d77b66","#b25d9c","#7055b8"][index%8]}" type="button" data-note="${frequency}">${index+1}</button>`).join("")}</div>
      <div class="mobile-panel" style="margin-top:16px"><h3>Calm music</h3><div class="mobile-button-row"><button class="mobile-button" type="button" data-action="calm-music">Play</button><button class="mobile-button secondary" type="button" data-action="stop-music">Stop</button></div></div>
    </section>`;
  }

  function renderNature(){
    return `<section>${pageHead("Nature","Explore gentle scenes and learn a small fact.","more")}
      <div class="mobile-card-grid">${BB.games.nature.scenes.map(scene=>`<button class="mobile-home-card" style="--card:#ddf5ed" type="button" data-nature="${scene.id}"><span>${scene.icon}</span><strong>${esc(scene.label)}</strong><small>${esc(scene.fact)}</small></button>`).join("")}</div>
    </section>`;
  }

  function renderDaily(){
    const routines=BB.games.dailylife.routines;
    const steps=routines[currentRoutine];
    return `<section>${pageHead("Daily Living","Practice one familiar step at a time.","more")}
      <div class="mobile-category-row">${Object.keys(routines).map(name=>`<button class="mobile-chip ${name===currentRoutine?"active":""}" type="button" data-routine="${esc(name)}">${esc(name)}</button>`).join("")}</div>
      <div class="mobile-routine-list">${steps.map(([icon,text],index)=>`<button class="mobile-routine-step ${completedSteps.has(index)?"done":""}" type="button" data-step="${index}"><span class="mobile-step-number">${completedSteps.has(index)?"✓":index+1}</span><strong>${esc(text)}</strong><span>${icon}</span></button>`).join("")}</div>
    </section>`;
  }

  function renderSocial(){
    const story=BB.games.socialskills.stories[socialIndex];
    return `<section>${pageHead("Social Stories",`${socialIndex+1} of ${BB.games.socialskills.stories.length}`,"more")}
      <div class="mobile-question"><div class="visual">${story.icon}</div><h2>${esc(story.title)}</h2><p>${esc(story.prompt)}</p></div>
      <div id="social-result" class="mobile-answers">${story.options.map((option,index)=>`<button class="mobile-answer" type="button" data-social-answer="${index}">${esc(option)}</button>`).join("")}</div>
    </section>`;
  }

  function renderRewards(){
    const data=BB.store.data;
    return `<section>${pageHead("Reward Garden","Every effort helps your own garden grow.","more")}
      <div class="mobile-garden"><h2>Your garden</h2><div class="mobile-garden-items">${Array.from({length:Math.min(6,data.flowers)},()=>"<span>🌻</span>").join("")||"<span>🌱</span>"}${Array.from({length:Math.min(4,data.butterflies)},()=>"<span>🦋</span>").join("")}</div></div>
      <div class="mobile-stats" style="margin-top:12px"><div class="mobile-stat"><strong>⭐ ${data.stars}</strong><span>Stars</span></div><div class="mobile-stat"><strong>🌻 ${data.flowers}</strong><span>Flowers</span></div><div class="mobile-stat"><strong>🦋 ${data.butterflies}</strong><span>Butterflies</span></div><div class="mobile-stat"><strong>🎟️ ${data.stickers.length}</strong><span>Stickers</span></div></div>
      <div class="mobile-panel" style="margin-top:13px"><h2>Sticker Collection</h2><div class="mobile-sticker-row">${data.stickers.length?data.stickers.map(item=>`<span>${item}</span>`).join(""):"<p>Your first sticker is waiting for your fourth star.</p>"}</div><h2>Achievements</h2><div class="mobile-list">${BB.rewards.achievements.map(item=>`<div class="mobile-list-card ${data.achievements.includes(item.id)?"done":""}"><span>${data.achievements.includes(item.id)?item.icon:"🔒"}</span><div><strong>${item.name}</strong><small>${data.achievements.includes(item.id)?"Earned through personal progress":"Keep exploring"}</small></div></div>`).join("")}</div></div>
    </section>`;
  }

  function renderProgress(){
    const data=BB.store.data;
    const completed=Object.values(data.progress).reduce((sum,value)=>sum+value,0);
    return `<section>${pageHead("My Progress","Celebrate this child's own journey only.","more")}
      <div class="mobile-stats"><div class="mobile-stat"><strong>${data.stars}</strong><span>Stars earned</span></div><div class="mobile-stat"><strong>${completed}</strong><span>Activities completed</span></div><div class="mobile-stat"><strong>${Object.keys(data.wordUse).length}</strong><span>Words explored</span></div><div class="mobile-stat"><strong>${Math.floor(data.screenSeconds/60)}m</strong><span>App time</span></div></div>
      <div class="mobile-panel" style="margin-top:13px"><h3>Favorite areas</h3>${Object.entries(data.activityVisits).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,count])=>`<p><strong>${esc(name)}</strong> · ${count} visits</p>`).join("")||"<p>Your journey begins with the first activity.</p>"}</div>
    </section>`;
  }

  function renderMore(){
    const cards=[
      ["daily","🚪","Daily Living","Step-by-step routines","#e6f1ff"],
      ["social","🤝","Social Stories","Kind and safe choices","#eee6ff"],
      ["music","🎹","Music","Free musical play","#fff0c9"],
      ["nature","🦋","Nature","Oceans, gardens, and space","#ddf5ed"],
      ["rewards","🌻","Reward Garden","Celebrate effort","#fff0bd"],
      ["progress","📈","My Progress","Personal growth only","#ddf5ed"],
      ["tools","🧰","My Tools","Schedules, choices, photos, and guided mode","#e5f2ff"],
      ["settings","⚙️","Comfort Settings","Sound, text, and motion","#e9efff"],
      ["install","📲","Install BrightBridge","Keep the app on this device","#fff0c9"],
      ["parent","🔒","Grown-up Area","Private caregiver controls","#ececf2"]
    ];
    return `<section>${pageHead("More to Explore","Activities and caregiver tools.")}
      <div class="mobile-card-grid">${cards.map(([id,icon,title,detail,color])=>`<button class="mobile-home-card" style="--card:${color}" type="button" ${id==="install"?'data-action="install"':`data-route="${id}"`}><span>${icon}</span><strong>${title}</strong><small>${detail}</small></button>`).join("")}</div>
    </section>`;
  }

  function renderParent(){
    if(!parentUnlocked){
      setTimeout(()=>showPin(),0);
      return `<section>${pageHead("Grown-up Area","A parent PIN protects these private controls.","more")}<div class="mobile-panel" style="text-align:center"><div style="font-size:65px">🔒</div><h2>Grown-up check needed</h2><button class="mobile-button" type="button" data-action="open-pin">Enter PIN</button>${BB.store.data.settings.parentPin==="2468"?'<p class="muted">Starter PIN: 2468</p>':""}</div></section>`;
    }
    const data=BB.store.data,profile=activeProfile();
    return `<section>${pageHead("Parent Dashboard",`Private controls for ${profile.name}.`,"more")}
      <div class="mobile-stats"><div class="mobile-stat"><strong>${Math.floor(data.screenSeconds/60)}m</strong><span>App time</span></div><div class="mobile-stat"><strong>${data.stars}</strong><span>Stars</span></div></div>
      <div class="mobile-section-title"><h2>Memories & growth</h2></div>
      <div class="mobile-memory-grid"><button class="mobile-memory-button" type="button" data-mobile-memory-open="voice"><span>🎤</span>Voice Journey</button><button class="mobile-memory-button" type="button" data-mobile-memory-open="timeline"><span>🌈</span>Growth Timeline</button><button class="mobile-memory-button" type="button" data-mobile-memory-open="letters"><span>💌</span>Future Letters</button><button class="mobile-memory-button" type="button" data-mobile-memory-open="growth"><span>🌱</span>Growth Paths</button></div>
      <div class="mobile-profile-summary"><span>${profile.avatar||"🌟"}</span><div><small>Active child profile</small><h2>${esc(profile.name)}</h2></div></div>
      <div class="mobile-setting-group mobile-profile-editor"><h3>👤 Child profile</h3>
        <label class="mobile-setting-row"><span><strong>Active profile</strong></span><select data-profile>${data.profiles.map(item=>`<option value="${esc(item.id)}" ${item.id===data.activeProfile?"selected":""}>${item.avatar} ${esc(item.name)}</option>`).join("")}</select></label>
        <label class="mobile-setting-row"><span><strong>Display name</strong></span><input data-profile-name value="${esc(profile.name)}" maxlength="30"></label>
        <label class="mobile-setting-row"><span><strong>Birthday</strong><small>Used only for caregiver-controlled celebrations and age suggestions</small></span><input type="date" data-profile-birthday value="${esc(profile.birthDate||"")}"></label>
        <details class="mobile-profile-emergency"><summary>Emergency card details (optional)</summary>
          <label><span>Caregiver phone</span><input type="tel" data-profile-detail="caregiverPhone" value="${esc(profile.caregiverPhone||"")}" maxlength="30" placeholder="Phone number"></label>
          <label><span>Home address</span><textarea data-profile-detail="address" maxlength="160" placeholder="Address shown only on this device">${esc(profile.address||"")}</textarea></label>
          <label><span>Allergies or critical note</span><textarea data-profile-detail="allergies" maxlength="160" placeholder="Example: Allergy to peanuts">${esc(profile.allergies||"")}</textarea></label>
          <small>These details create private, profile-aware Emergency cards. Add only what you want the child to be able to show or play.</small>
        </details>
      </div>
      <div class="mobile-profile-actions"><button class="mobile-button secondary" type="button" data-action="add-profile"><span>➕</span><strong>Add another profile</strong><small>Create a separate private journey</small></button><button class="mobile-button secondary" type="button" data-route="communication"><span>🎙️</span><strong>Family Voice Cards</strong><small>Record beside exact communication cards</small></button></div>
      <div class="mobile-section-title"><h2>Caregiver controls</h2></div><div class="mobile-parent-actions"><button class="mobile-button secondary" type="button" data-route="tools">🧰 Open My Tools</button><button class="mobile-button secondary" type="button" data-action="change-pin">🔢 Change PIN</button><button class="mobile-button secondary" type="button" data-action="lock-parent">🔒 Lock area</button><button class="mobile-button secondary" type="button" data-action="export">⬇ Export progress</button>${data.profiles.length>1?`<button class="mobile-button danger" type="button" data-action="delete-profile">🗑️ Delete this profile</button>`:""}<button class="mobile-button danger" type="button" data-action="reset">⚠️ Reset BrightBridge</button></div>
    </section>`;
  }

  function renderSettings(){
    const settings=BB.store.data.settings;
    return `<section>${pageHead("Comfort Settings","Make the mobile experience feel right.","more")}
      <div class="mobile-setting-group"><h3>Sound & appearance</h3>${Object.entries(settingsRows).map(([key,[title,detail]])=>`<div class="mobile-setting-row"><span><strong>${title}</strong><small>${detail}</small></span><button class="mobile-switch ${settings[key]?"on":""}" type="button" role="switch" aria-checked="${settings[key]}" data-setting="${key}"><i></i></button></div>`).join("")}
        <label class="mobile-setting-row mobile-range-row"><span><strong>Family voice volume</strong><small>Caregiver recordings and communication cards</small></span><input type="range" min="0" max="1" step=".05" value="${settings.speechVolume}" data-range="speechVolume"></label>
        <label class="mobile-setting-row mobile-range-row"><span><strong>Effects volume</strong><small>Success and try-again sounds</small></span><input type="range" min="0" max="1" step=".05" value="${settings.effectsVolume}" data-range="effectsVolume"></label>
        <label class="mobile-setting-row mobile-range-row"><span><strong>Caregiver voice speed</strong><small>Used when supported by recorded audio playback</small></span><input type="range" min=".6" max="1.25" step=".05" value="${settings.speechRate}" data-range="speechRate"></label>
        <label class="mobile-setting-row mobile-range-row"><span><strong>Music volume</strong></span><input type="range" min="0" max="1" step=".05" value="${settings.musicVolume}" data-range="musicVolume"></label>
        <label class="mobile-setting-row mobile-range-row"><span><strong>Animation speed</strong></span><input type="range" min=".5" max="1.5" step=".1" value="${settings.animationSpeed}" data-range="animationSpeed"></label>
      </div><div class="mobile-setting-group"><h3>Learning preferences</h3><label class="mobile-setting-row"><span><strong>Language</strong></span><select data-setting-select="language"><option value="en-US" ${settings.language==="en-US"?"selected":""}>English (US)</option><option value="en-GB" ${settings.language==="en-GB"?"selected":""}>English (UK)</option><option value="es-US" ${settings.language==="es-US"?"selected":""}>Español</option></select></label><label class="mobile-setting-row"><span><strong>Difficulty</strong></span><select data-setting-select="difficulty"><option value="starter" ${settings.difficulty==="starter"?"selected":""}>Starter</option><option value="growing" ${settings.difficulty==="growing"?"selected":""}>Growing</option><option value="independent" ${settings.difficulty==="independent"?"selected":""}>Independent</option></select></label></div><button class="mobile-button mobile-wide-button" type="button" data-action="install">Install BrightBridge</button><p class="muted">🔒 Activity stays on this device. No ads and no tracking.</p>
    </section>`;
  }

  function showPin(success=null){
    if(parentUnlocked){success?.();return;}
    if(modalRoot.innerHTML)return;
    pinSuccess=success;
    modal(`<div class="mobile-modal-head"><h2>Grown-up check</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><p>Tap the four-digit parent PIN.</p><input class="pin-entry" type="password" inputmode="numeric" maxlength="4" data-pin aria-label="Parent PIN"><div class="pin-dots" data-pin-dots>○ ○ ○ ○</div><div class="pin-keypad">${["1","2","3","4","5","6","7","8","9","clear","0","back"].map(key=>`<button type="button" data-pin-key="${key}">${key==="back"?"⌫":key==="clear"?"Clear":key}</button>`).join("")}</div><button class="mobile-button pin-continue" type="button" data-action="verify-pin">Continue</button>${BB.store.data.settings.parentPin==="2468"?'<p class="muted">Starter PIN: 2468</p>':""}`,"Parent PIN");
  }

  function updatePin(){
    const input=document.querySelector("[data-pin]"),dots=document.querySelector("[data-pin-dots]");
    if(!input||!dots)return;
    input.value=input.value.replace(/\D/g,"").slice(0,4);
    dots.textContent=[0,1,2,3].map(index=>index<input.value.length?"●":"○").join(" ");
  }

  function verifyPin(){
    const input=document.querySelector("[data-pin]");
    if(!input)return;
    if(input.value===BB.store.data.settings.parentPin){
      parentUnlocked=true;
      const success=pinSuccess;
      modalRoot.innerHTML="";
      pinSuccess=null;
      success?success():go("parent",{replace:true});
      toast("Grown-up controls unlocked");
    }else{
      input.value="";updatePin();toast("That PIN did not match. Try again.");
    }
  }

  async function refreshVoiceList(){
    const target=document.querySelector("#voice-list");
    if(!target)return;
    const clips=await BB.voiceLibrary.list();
    if(!document.body.contains(target))return;
    target.innerHTML=clips.length?clips.map(clip=>`<div class="voice-row"><span>🎧</span><strong>${esc(clip.label)}</strong><small>${esc(clip.source)}</small><button class="compact-button" type="button" data-voice-play="${esc(clip.label)}">▶</button><button class="compact-button" type="button" data-voice-delete="${esc(clip.key)}">🗑️</button></div>`).join(""):`<p class="muted">No family voice cards recorded yet.</p>`;
  }

  function refreshCommunication(){
    view.innerHTML=renderCommunication();
    if(voiceSetup)setTimeout(refreshVoiceList,0);
  }

  function toggleVoiceSetup(){
    if(voiceSetup){
      if(recorder?.state==="recording")stopRecording();
      voiceSetup=false;refreshCommunication();return;
    }
    showPin(()=>{voiceSetup=true;go("communication",{replace:true});});
  }

  async function startRecording(label){
    if(recorder?.state==="recording"){toast("Finish the current recording first.");return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast("Recording is unavailable here. Use Upload instead.");return;}
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const preferred=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type=>MediaRecorder.isTypeSupported(type));
      recorder=preferred?new MediaRecorder(stream,{mimeType:preferred}):new MediaRecorder(stream);
      recordingLabel=label;chunks=[];
      recorder.addEventListener("dataavailable",event=>{if(event.data.size)chunks.push(event.data);});
      recorder.addEventListener("stop",async()=>{
        const blob=new Blob(chunks,{type:recorder.mimeType||"audio/webm"});
        stream?.getTracks().forEach(track=>track.stop());stream=null;
        try{await BB.voiceLibrary.save(recordingLabel,blob,"recording");toast(`Voice saved for “${recordingLabel}”`);}
        catch{toast("That recording could not be saved.");}
        document.querySelectorAll("[data-record-card]").forEach(button=>button.disabled=false);
        const stop=document.querySelector('[data-action="record-stop"]');if(stop)stop.hidden=true;
        const status=document.querySelector("[data-record-status]");if(status)status.textContent="Saved privately on this device.";
        refreshVoiceList();
      });
      recorder.start();
      document.querySelectorAll("[data-record-card]").forEach(button=>button.disabled=true);
      const stop=document.querySelector('[data-action="record-stop"]');if(stop)stop.hidden=false;
      const status=document.querySelector("[data-record-status]");if(status)status.innerHTML=`<i class="recording-light"></i>Recording “${esc(label)}”…`;
    }catch{stream?.getTracks().forEach(track=>track.stop());stream=null;toast("Microphone permission was not available. Use Upload instead.");}
  }

  function stopRecording(){
    if(recorder?.state==="recording")recorder.stop();
  }

  async function uploadVoice(input){
    const file=input.files?.[0],label=input.dataset.uploadCard;
    if(!file)return;
    if(recorder?.state==="recording"){toast("Stop the current recording first.");input.value="";return;}
    if(!file.type.startsWith("audio/")||file.size>12*1024*1024){toast("Choose an audio file smaller than 12 MB.");input.value="";return;}
    try{await BB.voiceLibrary.save(label,file,"upload");input.value="";toast(`Voice saved for “${label}”`);refreshVoiceList();}
    catch{toast("That audio file could not be saved.");}
  }

  function speakExact(text){
    BB.speech.speak(text).then(played=>{if(!played)toast(`No family recording yet for “${text}”`);});
  }

  function answerQuiz(index){
    if(quizLocked)return;
    const round=currentGame.rounds[roundIndex];
    if(index!==round.answer){
      quizAttempts++;const difficulty=BB.store.data.settings.difficulty||"starter",promptLevel=BB.mobileTools.promptLevel();document.querySelectorAll("[data-answer]").forEach((button,i)=>{if(i===index)button.classList.add("tried");if(i===round.answer&&(difficulty==="starter"||promptLevel==="full"||(difficulty==="growing"&&quizAttempts>=2)))button.classList.add("hint");});
      BB.audio.tryAgain();pip("Good try. Look for the highlighted answer and try again.","🙂","Try again");return;
    }
    quizLocked=true;BB.audio.success();BB.rewards.earn(currentGame.title);BB.rewards.recordProgress(currentGame.id);
    BB.memoryJourney?.track("learning","First learning activity completed",{icon:"📚",detail:currentGame.title,onceKey:"first-learning"});
    const target=document.querySelector("#quiz-result");
    target.innerHTML=`<div class="mobile-success"><div>🥳</div><h2>You found it!</h2><p>${esc(round.fact)}</p><button class="mobile-button" type="button" data-action="quiz-next">${roundIndex===currentGame.rounds.length-1?"Finish":"Next"}</button></div>`;
    updateHeader();pip(`Yes! ${round.fact}`,"🥳","Great job!");
  }

  function setupSensory(){
    const stage=document.querySelector("[data-sensory]");
    if(!stage)return;
    let drawing=false;
    const addEffect=event=>{
      const rect=stage.getBoundingClientRect(),bubble=document.createElement("span"),size=35+Math.random()*55;
      const icons={balloons:"🎈",leaves:"🍃",snow:"❄️",stars:"⭐",fireflies:"✨",ocean:"🌊"};
      bubble.className=`mobile-bubble sensory-${sensoryMode}`;bubble.style.width=`${size}px`;bubble.style.height=`${size}px`;bubble.style.left=`${Math.max(0,event.clientX-rect.left-size/2)}px`;bubble.style.top=`${Math.max(0,event.clientY-rect.top-size/2)}px`;bubble.textContent=icons[sensoryMode]||"";if(["rainbow","paint"].includes(sensoryMode))bubble.style.background=`hsl(${Math.random()*360} 75% 72% / .72)`;
      stage.appendChild(bubble);BB.audio.pop();setTimeout(()=>bubble.remove(),1800);
    };
    stage.addEventListener("pointerdown",event=>{drawing=true;addEffect(event);stage.setPointerCapture?.(event.pointerId);});
    stage.addEventListener("pointermove",event=>{if(drawing&&["rainbow","paint","water"].includes(sensoryMode))addEffect(event);});
    stage.addEventListener("pointerup",()=>drawing=false);stage.addEventListener("pointercancel",()=>drawing=false);
  }
  function setupTracing(){
    const canvas=document.querySelector("[data-trace-canvas]");if(!canvas)return;const context=canvas.getContext("2d");context.lineCap="round";context.lineJoin="round";context.lineWidth=18;context.strokeStyle="#7055b8";let drawing=false;
    const point=event=>{const rect=canvas.getBoundingClientRect();return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};};
    canvas.addEventListener("pointerdown",event=>{drawing=true;const value=point(event);context.beginPath();context.moveTo(value.x,value.y);canvas.setPointerCapture?.(event.pointerId);});
    canvas.addEventListener("pointermove",event=>{if(!drawing)return;const value=point(event);context.lineTo(value.x,value.y);context.stroke();});
    canvas.addEventListener("pointerup",()=>drawing=false);canvas.addEventListener("pointercancel",()=>drawing=false);
  }

  function showBreathing(){
    modal(`<div class="mobile-modal-head"><h2>Breathe with Pip</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><div class="pip-breathing"><div class="pip-cloud" role="img" aria-label="A calm breathing cloud"><span class="pip-cloud-eye left"></span><span class="pip-cloud-eye right"></span><span class="pip-cloud-smile"></span></div><h3>Breathe in… breathe out…</h3><p>Breathe in slowly while the cloud grows. Breathe out slowly while it gets smaller.</p><button class="mobile-button" type="button" data-action="close-modal">I’m ready</button></div>`,"Breathing");
    pip("Breathe in slowly. Now breathe out slowly.","😌");
  }

  function exportProgress(){
    const link=document.createElement("a"),blob=new Blob([BB.store.exportData()],{type:"application/json"});
    link.href=URL.createObjectURL(blob);link.download=`brightbridge-progress-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),500);
  }

  function handleClick(event){
    const routeButton=event.target.closest("[data-route]");
    if(routeButton){go(routeButton.dataset.route);return;}
    const pinKey=event.target.closest("[data-pin-key]");
    if(pinKey){const input=document.querySelector("[data-pin]");if(!input)return;const key=pinKey.dataset.pinKey;if(key==="clear")input.value="";else if(key==="back")input.value=input.value.slice(0,-1);else if(input.value.length<4)input.value+=key;updatePin();if(input.value.length===4)verifyPin();return;}
    const categoryButton=event.target.closest("[data-category]");
    if(categoryButton){if(recorder?.state==="recording"){toast("Stop and save before changing card groups.");return;}category=categoryButton.dataset.category;refreshCommunication();return;}
    const word=event.target.closest("[data-word]");
    if(word){if(recorder?.state==="recording"){toast("Stop and save before using another card.");return;}const value=word.dataset.word;sentence=sentence.trim()?`${sentence.trim()} ${value}`:value;speakExact(value);BB.store.data.wordUse[value]=(BB.store.data.wordUse[value]||0)+1;BB.store.data.recentWords=[value,...BB.store.data.recentWords.filter(item=>item!==value)].slice(0,12);BB.store.save();BB.memoryJourney?.track("communication","First communication card used",{icon:"⭐",detail:value,onceKey:"first-card"});refreshCommunication();pip(value,"😊");return;}
    const favorite=event.target.closest("[data-favorite]");
    if(favorite){if(recorder?.state==="recording"){toast("Stop and save before changing favorites.");return;}const value=favorite.dataset.favorite,list=BB.store.data.favorites;list.includes(value)?list.splice(list.indexOf(value),1):list.push(value);BB.store.save();refreshCommunication();return;}
    const customMove=event.target.closest("[data-custom-move]");
    if(customMove){customMove.disabled=true;updateCustomOrder(customMove.dataset.customMove,Number(customMove.dataset.direction)).catch(()=>toast("That card could not be moved."));return;}
    const customHide=event.target.closest("[data-custom-hide]");
    if(customHide){const item=customCards.find(card=>card.id===customHide.dataset.customHide);if(item){const {photoUrl,...stored}=item;saveCustomCard({...stored,hidden:!item.hidden}).then(()=>toast(item.hidden?"Card shown":"Card hidden")).catch(()=>toast("That card could not be changed."));}return;}
    const customDelete=event.target.closest("[data-custom-delete]");
    if(customDelete){const item=customCards.find(card=>card.id===customDelete.dataset.customDelete);if(item&&confirm(`Delete the custom card “${item.label}”? Its family voice recording is managed separately.`))removeCustomCard(item.id).then(()=>toast("Custom card deleted")).catch(()=>toast("That card could not be deleted."));return;}
    const record=event.target.closest("[data-record-card]");if(record){startRecording(record.dataset.recordCard);return;}
    const voicePlay=event.target.closest("[data-voice-play]");if(voicePlay){BB.voiceLibrary.play(voicePlay.dataset.voicePlay,BB.store.data.settings.speechVolume);return;}
    const voiceDelete=event.target.closest("[data-voice-delete]");if(voiceDelete){if(confirm("Delete this family voice recording?"))BB.voiceLibrary.remove(voiceDelete.dataset.voiceDelete).then(()=>{toast("Voice deleted");refreshVoiceList();});return;}
    const cards=event.target.closest("[data-cards]");if(cards){currentGame=BB.games[cards.dataset.cards];cardIndex=0;go("flashcards",{game:currentGame.id});return;}
    const play=event.target.closest("[data-play]");if(play){currentGame=BB.games[play.dataset.play];roundIndex=0;quizLocked=false;quizAttempts=0;go("quiz",{game:currentGame.id});return;}
    const answer=event.target.closest("[data-answer]");if(answer){answerQuiz(Number(answer.dataset.answer));return;}
    const feeling=event.target.closest("[data-feeling]");if(feeling){const [name,detail]=feeling.dataset.feeling.split("|");BB.memoryJourney?.track("emotion","First emotion selected",{icon:"😊",detail:name,onceKey:"first-emotion"});pip(`${name}. ${detail}`,"😊");return;}
    const sensory=event.target.closest("[data-sensory-mode]");if(sensory){sensoryMode=sensory.dataset.sensoryMode;view.innerHTML=renderCalm();setupSensory();return;}
    const instrumentButton=event.target.closest("[data-instrument]");if(instrumentButton){instrument=instrumentButton.dataset.instrument;view.innerHTML=renderMusic();BB.memoryJourney?.track("music","Favorite music discovered",{icon:"🎵",detail:BB.games.music.instruments[instrument].label,onceKey:`music-${instrument}`});return;}
    const note=event.target.closest("[data-note]");if(note){BB.audio.note(Number(note.dataset.note),BB.games.music.instruments[instrument].type);BB.memoryJourney?.track("music","First musical note played",{icon:"🎵",detail:BB.games.music.instruments[instrument].label,onceKey:"first-music"});return;}
    const nature=event.target.closest("[data-nature]");if(nature){const scene=BB.games.nature.scenes.find(item=>item.id===nature.dataset.nature);modal(`<div class="mobile-modal-head"><h2>${scene.icon} ${esc(scene.label)}</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><div style="font-size:55px;text-align:center">${scene.items.join(" ")}</div><p>${esc(scene.fact)}</p><button class="mobile-button" type="button" data-action="close-modal">Done</button>`,scene.label);pip(scene.fact,"😊");return;}
    const routine=event.target.closest("[data-routine]");if(routine){currentRoutine=routine.dataset.routine;completedSteps=new Set();view.innerHTML=renderDaily();return;}
    const step=event.target.closest("[data-step]");if(step){const index=Number(step.dataset.step);completedSteps.add(index);BB.audio.pop();view.innerHTML=renderDaily();pip(`${BB.games.dailylife.routines[currentRoutine][index][1]}. Nice job!`,"😊");if(completedSteps.size===BB.games.dailylife.routines[currentRoutine].length){BB.rewards.earn(currentRoutine);updateHeader();pip("Routine complete! You followed every step.","🥳");}return;}
    const social=event.target.closest("[data-social-answer]");if(social){const story=BB.games.socialskills.stories[socialIndex],index=Number(social.dataset.socialAnswer);if(index!==story.answer){social.classList.add("tried");document.querySelectorAll("[data-social-answer]")[story.answer]?.classList.add("hint");BB.audio.tryAgain();pip("Good try. Look for the kind and safe choice.","🙂","Try again");}else{BB.audio.success();BB.rewards.earn("Social skills");document.querySelector("#social-result").innerHTML=`<div class="mobile-success"><div>🤝</div><h2>Kind choice!</h2><p>${esc(story.fact)}</p><button class="mobile-button" type="button" data-action="social-next">Next</button></div>`;updateHeader();pip(story.fact,"🥳","Great job!");}return;}
    const setting=event.target.closest("[data-setting]");if(setting){const key=setting.dataset.setting;BB.store.data.settings[key]=!BB.store.data.settings[key];if(key==="notifications"&&BB.store.data.settings[key]&&window.Notification?.permission==="default")Notification.requestPermission().then(permission=>{if(permission!=="granted"){BB.store.data.settings.notifications=false;BB.store.save();}});BB.store.save();BB.accessibility.apply();view.innerHTML=renderSettings();return;}
    const action=event.target.closest("[data-action]");if(!action)return;
    switch(action.dataset.action){
      case "repeat-pip":BB.speech.repeat();break;
      case "voice-setup":toggleVoiceSetup();break;
      case "custom-add":addCustomCard();break;
      case "record-stop":stopRecording();break;
      case "sentence-clear":sentence="";refreshCommunication();break;
      case "sentence-speak":{const value=(document.querySelector("[data-sentence]")?.value||sentence).trim();sentence=value;if(value){speakExact(value);BB.store.data.recentPhrases.unshift(value);BB.store.data.recentPhrases=BB.store.data.recentPhrases.slice(0,20);BB.store.save();BB.memoryJourney?.track("communication","First sentence created",{icon:"💬",detail:value,onceKey:"first-sentence"});pip(value,"😊");}else toast("Add words to the sentence first.");break;}
      case "card-prev":cardIndex=(cardIndex-1+currentGame.cards.length)%currentGame.cards.length;view.innerHTML=renderFlashcards();if(currentGame.id==="tracing")setupTracing();break;
      case "card-next":cardIndex=(cardIndex+1)%currentGame.cards.length;view.innerHTML=renderFlashcards();if(currentGame.id==="tracing")setupTracing();break;
      case "card-hear":{const card=currentGame.cards[cardIndex];speakExact(`${card.word}. ${card.detail}`);break;}
      case "trace-clear":{const canvas=document.querySelector("[data-trace-canvas]");canvas?.getContext("2d").clearRect(0,0,canvas.width,canvas.height);break;}
      case "quiz-next":if(roundIndex===currentGame.rounds.length-1)go("learning");else{roundIndex++;quizLocked=false;quizAttempts=0;view.innerHTML=renderQuiz();}break;
      case "breathe":showBreathing();break;
      case "calm-music":BB.audio.startCalmMusic();toast("Calm music started");break;
      case "stop-music":BB.audio.stopMusic();toast("Music stopped");break;
      case "social-next":socialIndex=(socialIndex+1)%BB.games.socialskills.stories.length;view.innerHTML=renderSocial();break;
      case "open-pin":showPin();break;
      case "verify-pin":verifyPin();break;
      case "change-pin":modal(`<div class="mobile-modal-head"><h2>Change parent PIN</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><input class="pin-entry" type="password" inputmode="numeric" maxlength="4" data-new-pin placeholder="New 4-digit PIN"><button class="mobile-button pin-continue" type="button" data-action="save-pin">Save PIN</button>`,"Change PIN");break;
      case "save-pin":{const value=document.querySelector("[data-new-pin]")?.value;if(/^\d{4}$/.test(value)){BB.store.data.settings.parentPin=value;BB.store.save();closeModal();toast("Parent PIN changed");}else toast("Use exactly four numbers.");break;}
      case "lock-parent":parentUnlocked=false;toast("Grown-up Area locked");go("more",{replace:true});break;
      case "install":if(installPrompt){installPrompt.prompt();installPrompt.userChoice.finally(()=>installPrompt=null);}else modal(`<div class="mobile-modal-head"><h2>Install BrightBridge</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><p>Open your browser menu and choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.</p><button class="mobile-button" type="button" data-action="close-modal">Got it</button>`,"Install BrightBridge");break;
      case "add-profile":{const name=prompt("Child's display name:")?.trim();if(!name)break;const profile={id:`child-${Date.now()}`,name:name.slice(0,30),avatar:"🌟",birthDate:""};BB.store.data.profiles.push(profile);BB.store.data.activeProfile=profile.id;BB.store.save();go("parent",{replace:true});break;}
      case "delete-profile":{if(BB.store.data.profiles.length<2)break;if(confirm(`Delete ${activeProfile().name}'s profile? Private recordings must be deleted separately.`)){BB.store.data.profiles=BB.store.data.profiles.filter(item=>item.id!==BB.store.data.activeProfile);BB.store.data.activeProfile=BB.store.data.profiles[0].id;BB.store.save();go("parent",{replace:true});}break;}
      case "export":exportProgress();break;
      case "reset":if(confirm("Reset all BrightBridge progress and private memories on this device?"))Promise.all([BB.voiceLibrary.clear(),BB.memoryJourney.clear(),clearCustomCards()]).finally(()=>{BB.store.reset();parentUnlocked=false;go("home");});break;
      case "close-modal":closeModal();break;
      case "modal-overlay":if(event.target===action)closeModal();break;
    }
  }

  function handleInput(event){
    if(event.target.matches("[data-pin]"))updatePin();
    if(event.target.matches("[data-sentence]"))sentence=event.target.value;
    if(event.target.matches("[data-profile-name]")){const profile=activeProfile();profile.name=event.target.value;BB.store.save();}
    if(event.target.matches("[data-profile-detail]")){const profile=activeProfile();profile[event.target.dataset.profileDetail]=event.target.value;BB.store.save();}
    if(event.target.matches("[data-range]")){BB.store.data.settings[event.target.dataset.range]=Number(event.target.value);BB.store.save();}
  }

  function handleChange(event){
    if(event.target.matches("[data-upload-card]"))uploadVoice(event.target);
    if(event.target.matches("[data-profile-birthday]")){activeProfile().birthDate=event.target.value;BB.store.save();}
    if(event.target.matches("[data-profile]")){BB.store.data.activeProfile=event.target.value;customLoadedProfile="";BB.store.save();go("parent",{replace:true});}
    if(event.target.matches("[data-setting-select]")){BB.store.data.settings[event.target.dataset.settingSelect]=event.target.value;BB.store.save();}
  }

  document.addEventListener("click",handleClick);
  document.addEventListener("input",handleInput);
  document.addEventListener("change",handleChange);
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModal();if(event.key==="Enter"&&event.target.matches("[data-pin]"))verifyPin();});
  window.addEventListener("bb:reward",()=>{updateHeader();if(BB.store.data.flowers)BB.memoryJourney?.track("reward","First flower grown",{icon:"🌸",onceKey:"first-flower"});if(BB.store.data.butterflies)BB.memoryJourney?.track("reward","First butterfly earned",{icon:"🦋",onceKey:"first-butterfly"});});
  window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installPrompt=event;});
  window.addEventListener("error",event=>{console.error(event.error);toast("Something paused. Please try that touch again.");});

  window.BB=window.BB||{};
  BB.navigation={go,back:()=>go(history.pop()||"home",{replace:true}),pageHead,get current(){return route;}};
  BB.app={render:(next,options)=>{route=next;render(options);},pip,modal,closeModal,toast,isParentUnlocked:()=>parentUnlocked};
  BB.accessibility.apply();
  setInterval(()=>{if(!document.hidden){BB.store.data.screenSeconds+=60;BB.store.save();}},60000);
  const guidedRoute=BB.mobileTools.restoreGuided();
  go(guidedRoute||"home",{replace:true});
  if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("../service-worker.js").catch(()=>{});
})();
