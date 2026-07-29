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
  async function letters(){
    let privateLetters=[];
    try{privateLetters=await privateStore("letters","readonly",store=>store.getAll());}catch{}
    const localLetters=state().mobileLetters||[];
    return [...privateLetters,...localLetters].filter(item=>item.profileId===BB.store.data.activeProfile).sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
  }

  function tabs(){
    return `<div class="mobile-category-row">${[["hub","✨","Memory Home"],["voice","🎤","Voice Journey"],["timeline","🌈","Timeline"],["letters","💌","Letters"],["growth","🌱","Growth Paths"]].map(([id,icon,label])=>`<button class="mobile-chip ${memorySection===id?"active":""}" type="button" data-mobile-memory-open="${id}">${icon} ${label}</button>`).join("")}</div>`;
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
      <div class="mobile-panel"><h3>🔒 Private by default</h3><p>Recordings, letters, and milestones remain on this device. BrightBridge never translates, decodes, diagnoses, or infers meaning from vocalizations.</p></div>
      <div class="mobile-memory-grid">
        <button class="mobile-memory-button" type="button" data-mobile-memory-open="voice"><span>🎤</span>Voice Journey<small>${voiceItems.length} recordings</small></button>
        <button class="mobile-memory-button" type="button" data-mobile-memory-open="timeline"><span>🌈</span>Growth Timeline<small>${state().events.length} moments</small></button>
        <button class="mobile-memory-button" type="button" data-mobile-memory-open="letters"><span>💌</span>Future Letters<small>${letterItems.length} letters</small></button>
        <button class="mobile-memory-button" type="button" data-mobile-memory-open="growth"><span>${stage.icon}</span>Growth Paths<small>${stage.name}</small></button>
      </div>`);
  }
  async function renderVoice(){
    const items=await voices();
    revokeUrls();
    return shell("Voice Journey™","Caregiver-authored memories of meaningful vocal moments.",`
      <div class="mobile-panel"><h3>Add a private recording</h3>
        <label class="mobile-setting-row"><span><strong>Title</strong></span><input data-mv-title maxlength="80" placeholder='First “Mama”'></label>
        <label class="mobile-setting-row"><span><strong>Date and time</strong></span><input type="datetime-local" data-mv-date value="${localDateTime()}"></label>
        <label class="mobile-setting-row"><span><strong>Child age</strong></span><input data-mv-age maxlength="30" placeholder="3 years, 2 months"></label>
        <label class="mobile-setting-row"><span><strong>Notes</strong></span><textarea data-mv-notes rows="3" maxlength="800"></textarea></label>
        <label class="mobile-setting-row"><span><strong>Milestone</strong><small>Caregiver-defined</small></span><input type="checkbox" data-mv-milestone></label>
        <div class="mobile-button-row"><button class="mobile-button" type="button" data-mv-record>🎙️ Record</button><label class="mobile-button secondary">⬆ Upload<input class="sr-only" type="file" accept="audio/*" data-mv-upload></label><button class="mobile-button danger" type="button" data-mv-stop hidden>■ Stop</button></div>
        <p class="muted" data-mv-status>Audio stays on this device.</p>
      </div>
      <div class="mobile-list">${items.length?items.map(item=>voiceCard(item)).join(""):`<div class="mobile-panel"><h3>Your first recording starts the timeline</h3><p>Try a title such as Morning Babble, Story Time, or First Word.</p></div>`}</div>`);
  }
  function voiceCard(item){
    const url=URL.createObjectURL(item.blob);urls.push(url);
    return `<article class="mobile-panel"><h3>${item.milestone?"⭐ ":""}${esc(item.title)}</h3><p class="muted">${formatDate(item.dateTime)} · Age ${esc(item.age||"not added")}</p><audio controls preload="metadata" src="${url}" style="width:100%"></audio>${item.notes?`<p>${esc(item.notes)}</p>`:""}<button class="mobile-button danger" type="button" data-mv-delete="${item.id}">Delete</button></article>`;
  }
  function computedTimeline(){
    const data=BB.store.data,items=state().events.filter(item=>!item.profileId||item.profileId===data.activeProfile);
    if(data.stars)items.push({date:new Date().toISOString(),icon:"⭐",title:`${data.stars} learning stars`,detail:"Personal learning progress"});
    if(data.flowers)items.push({date:new Date().toISOString(),icon:"🌻",title:`${data.flowers} flowers grown`,detail:"Reward Garden growth"});
    return items.sort((a,b)=>new Date(b.date)-new Date(a.date));
  }
  async function renderTimeline(){
    const items=computedTimeline(),voiceItems=await voices(),letterItems=await letters();
    return shell("Look How Far I’ve Come™","Celebrate only this child's own progress.",`
      <div class="mobile-stats"><div class="mobile-stat"><strong>⭐ ${BB.store.data.stars}</strong><span>Stars</span></div><div class="mobile-stat"><strong>🌻 ${BB.store.data.flowers}</strong><span>Flowers</span></div><div class="mobile-stat"><strong>🎤 ${voiceItems.length}</strong><span>Voice memories</span></div><div class="mobile-stat"><strong>💌 ${letterItems.length}</strong><span>Letters</span></div></div>
      <div class="mobile-list" style="margin-top:13px">${items.length?items.map(item=>`<article class="mobile-list-card"><span>${item.icon||"✨"}</span><div><strong>${esc(item.title)}</strong><small>${formatDate(item.date)} · ${esc(item.detail||"Meaningful progress")}</small></div></article>`).join(""):`<div class="mobile-panel"><h3>This journey is ready to grow</h3><p>Personal milestones will appear as BrightBridge is used.</p></div>`}</div>`);
  }
  async function renderLetters(){
    const letterItems=await letters();
    return shell("Letters to My Future Self™","Private messages of love, encouragement, and memories.",`
      <div class="mobile-panel"><h3>Write a letter</h3><label class="mobile-setting-row"><span><strong>Title</strong></span><input data-ml-title maxlength="100" placeholder="A memory for your future"></label><label class="mobile-setting-row"><span><strong>Author</strong></span><input data-ml-author maxlength="60" placeholder="Mom, Dad, Grandma…"></label><label class="mobile-setting-row"><span><strong>Letter</strong></span><textarea data-ml-body rows="7" maxlength="5000" placeholder="Today you surprised me by…"></textarea></label><button class="mobile-button" type="button" data-ml-save>Save private letter</button></div>
      <div class="mobile-list">${letterItems.length?letterItems.map(letter=>`<article class="mobile-panel"><h3>💌 ${esc(letter.title)}</h3><p class="muted">${formatDate(letter.date||letter.createdAt)} · From ${esc(letter.author||"Caregiver")}</p><p>${esc(letter.body||letter.content||"")}</p><button class="mobile-button danger" type="button" data-ml-delete="${letter.id}">Delete</button></article>`).join(""):`<div class="mobile-panel"><p>No letters yet. A future keepsake can begin today.</p></div>`}</div>`);
  }
  function renderGrowth(){
    const path=growth();
    return shell("BrightBridge Growth Paths™","Caregiver-controlled stages that never erase history.",`
      <div class="mobile-panel"><h3>Caregiver promise</h3><p>Changing a stage updates age-appropriate presentation and vocabulary. Voice memories, letters, rewards, achievements, and communication history remain preserved.</p></div>
      <div class="mobile-list">${stages.map((stage,index)=>`<article class="mobile-panel" style="${path.stage===stage.id?"border:3px solid var(--purple)":""}"><div style="font-size:44px">${stage.icon}</div><p class="muted">Stage ${index+1} · ${stage.ages}</p><h2>${stage.name}</h2><p>${stage.focus}</p><button class="mobile-button ${path.stage===stage.id?"secondary":""}" type="button" data-mg-stage="${stage.id}">${path.stage===stage.id?"Current stage":"Choose stage"}</button></article>`).join("")}</div>
      <div class="mobile-setting-group"><h3>Available child features</h3>${Object.entries(path.enabledFeatures).map(([key,on])=>`<div class="mobile-setting-row"><span><strong>${key[0].toUpperCase()+key.slice(1)}</strong></span><button class="mobile-switch ${on?"on":""}" type="button" data-mg-feature="${key}"><i></i></button></div>`).join("")}</div>`);
  }

  async function open(next="hub",options={}){
    if(!BB.app?.isParentUnlocked?.()){BB.navigation.go("parent");return;}
    if(BB.navigation.current!=="memory"){if(options.withinRoute)return;BB.navigation.go("memory",{section:next});return;}
    const token=++epoch;active=true;memorySection=next;
    let content;
    try{
      const renderer={hub:renderHub,voice:renderVoice,timeline:renderTimeline,letters:renderLetters,growth:renderGrowth}[next]||renderHub;
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
    const path=growth();document.body.dataset.growthStage=path.stage;
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

  function voiceMetadata(){
    return {title:document.querySelector("[data-mv-title]")?.value.trim(),dateTime:document.querySelector("[data-mv-date]")?.value||new Date().toISOString(),age:document.querySelector("[data-mv-age]")?.value.trim(),notes:document.querySelector("[data-mv-notes]")?.value.trim(),milestone:!!document.querySelector("[data-mv-milestone]")?.checked};
  }
  async function storeVoiceBlob(blob,duration=0){
    const meta=voiceMetadata();
    if(!meta.title){BB.app.toast("Add a recording title first.");return;}
    await saveVoice({...meta,id:`voice-${Date.now()}`,profileId:BB.store.data.activeProfile,createdAt:new Date().toISOString(),duration,blob});
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
    if(event.target.closest("[data-ml-save]")){const title=document.querySelector("[data-ml-title]")?.value.trim(),author=document.querySelector("[data-ml-author]")?.value.trim(),body=document.querySelector("[data-ml-body]")?.value.trim();if(!title||!body){BB.app.toast("Add a title and letter message.");return;}await privateStore("letters","readwrite",store=>store.put({id:`letter-${Date.now()}`,profileId:BB.store.data.activeProfile,title,author:author||"Caregiver",body,date:new Date().toISOString()}));BB.app.toast("Private letter saved.");open("letters");return;}
    const letterDelete=event.target.closest("[data-ml-delete]");if(letterDelete&&confirm("Delete this private letter?")){try{await privateStore("letters","readwrite",store=>store.delete(letterDelete.dataset.mlDelete));}catch{}state().mobileLetters=state().mobileLetters.filter(item=>item.id!==letterDelete.dataset.mlDelete);BB.store.save();open("letters");return;}
    const stage=event.target.closest("[data-mg-stage]");if(stage){growth().stage=stage.dataset.mgStage;BB.store.save();applyGrowthPath();BB.app.toast("Growth stage updated. All history was preserved.");open("growth");return;}
    const feature=event.target.closest("[data-mg-feature]");if(feature){const key=feature.dataset.mgFeature;growth().enabledFeatures[key]=!growth().enabledFeatures[key];BB.store.save();applyGrowthPath();open("growth");return;}
  });
  document.addEventListener("change",event=>{if(event.target.matches("[data-mv-upload]")&&event.target.files[0]){const meta=voiceMetadata();if(!meta.title){BB.app.toast("Add a recording title first.");event.target.value="";return;}const file=event.target.files[0];if(!file.type.startsWith("audio/")||file.size>15*1024*1024){BB.app.toast("Choose an audio file smaller than 15 MB.");event.target.value="";return;}storeVoiceBlob(file,0);}});
  window.addEventListener("bb:state",applyGrowthPath);
  window.BB=window.BB||{};
  BB.memoryJourney={open,cancelView,track,applyGrowthPath,stageVocabulary,homeBanner,clear};
  applyGrowthPath();
})();

(function () {
  "use strict";

  const view=document.querySelector("#view");
  const modalRoot=document.querySelector("#modal-root");
  const toastRoot=document.querySelector("#toast-root");
  const learningIds=["alphabet","numbers","colors","shapes","matching","puzzles","emotions"];
  const aac={
    Quick:[["I want","☝️"],["I need","🙋"],["More","➕"],["All done","✅"],["Yes","👍"],["No","👎"],["Please","💜"],["Thank you","🌟"]],
    Food:[["Apple","🍎"],["Banana","🍌"],["Sandwich","🥪"],["Crackers","🍘"],["Yogurt","🥣"],["Hungry","😋"]],
    Drinks:[["Water","💧"],["Milk","🥛"],["Juice","🧃"],["Thirsty","😮"],["Cup","🥤"]],
    Bathroom:[["Bathroom","🚻"],["Toilet","🚽"],["Wash hands","🧼"],["Help please","🙋"],["Wet","💦"]],
    Help:[["Help","🆘"],["Stop","✋"],["Break","⏸️"],["Too loud","🔇"],["It hurts","🩹"],["I don't know","🤷"]],
    Feelings:[["Happy","😊"],["Sad","😢"],["Angry","😠"],["Calm","😌"],["Scared","😨"],["Tired","😴"],["Excited","🤩"]],
    Family:[["Mom","👩"],["Dad","👨"],["Grandma","👵"],["Grandpa","👴"],["Brother","👦"],["Sister","👧"],["Home","🏠"]],
    Animals:[["Dog","🐶"],["Cat","🐱"],["Bird","🐦"],["Fish","🐠"],["Horse","🐴"],["Animal","🐾"]],
    School:[["Teacher","🧑‍🏫"],["School","🏫"],["Book","📖"],["Pencil","✏️"],["Friend","🧑‍🤝‍🧑"],["My turn","☝️"]],
    Medical:[["Doctor","🩺"],["Medicine","💊"],["My head hurts","🤕"],["My tummy hurts","🤢"],["Bandage","🩹"],["Emergency","🚑"]],
    Transport:[["Car","🚗"],["Bus","🚌"],["Train","🚆"],["Bike","🚲"],["Go","🟢"],["Stop","🛑"]]
  };
  const feelings=[["Happy","😊","I feel bright and happy."],["Sad","😢","I may want comfort."],["Angry","😠","I can pause and breathe."],["Calm","😌","My body feels quiet."],["Scared","😨","I can find a safe grown-up."],["Tired","😴","My body may need rest."],["Excited","🤩","I have lots of happy energy."],["Frustrated","😣","I can take a break and try later."]];
  const settingsRows={
    speech:["Family voice playback","Use saved caregiver recordings"],
    effects:["Gentle sound effects","Play success and try-again tones"],
    music:["Music","Allow musical activities"],
    dark:["Dark mode","Use dim-room colors"],
    highContrast:["High contrast","Make borders stand out"],
    largeText:["Large text","Increase words and controls"],
    reducedMotion:["Reduce motion","Keep transitions still"],
    simpleMode:["Simple mode","Show fewer choices"]
  };

  let route="home";
  const history=[];
  let parentUnlocked=false;
  let pinSuccess=null;
  let sentence="";
  let category="Quick";
  let voiceSetup=false;
  let recorder=null;
  let stream=null;
  let chunks=[];
  let recordingLabel="";
  let currentGame=null;
  let cardIndex=0;
  let roundIndex=0;
  let quizLocked=false;
  let currentRoutine="Brush teeth";
  let completedSteps=new Set();
  let socialIndex=0;
  let instrument="piano";

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

  function updateHeader(){
    document.querySelector("#header-stars").textContent=BB.store.data.stars;
  }

  function toast(message){
    toastRoot.innerHTML=`<div class="mobile-toast">${esc(message)}</div>`;
    clearTimeout(toast._timer);
    toast._timer=setTimeout(()=>toastRoot.innerHTML="",3000);
  }

  function pip(message,mood="😊",speak=false){
    document.querySelector("#pip-expression").textContent=mood;
    document.querySelector("#pip-bubble").textContent=message;
    if(speak)BB.speech.speak(message);
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
      button.classList.toggle("active",navRoute===route||(navRoute==="more"&&["music","nature","daily","social","rewards","progress","parent","settings"].includes(route)));
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
      more:renderMore,parent:renderParent,settings:renderSettings,
      memory:()=>`${pageHead("Private Memory Studio","Opening the selected caregiver feature…","parent")}<div class="mobile-panel">💜 Gathering private memories…</div>`
    };
    view.innerHTML=(screens[route]||renderHome)();
    BB.store.data.activityVisits[route]=(BB.store.data.activityVisits[route]||0)+1;
    BB.store.save();
    if(route==="communication"&&voiceSetup)setTimeout(refreshVoiceList,0);
    if(route==="calm")setupSensory();
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
      <div class="mobile-section-title"><h2>Choose an adventure</h2><small>Tap any card</small></div>
      <div class="mobile-card-grid">${cards.map(([id,icon,title,detail,color])=>`<button class="mobile-home-card" style="--card:${color}" type="button" data-route="${id}"><span>${icon}</span><strong>${title}</strong><small>${detail}</small></button>`).join("")}</div>
    </section>`;
  }

  function communicationItems(){
    const growthWords=BB.memoryJourney?.stageVocabulary?.()||[];
    if(category==="Favorites")return [...Object.values(aac).flat(),...growthWords].filter(([word])=>BB.store.data.favorites.includes(word));
    if(category==="Growth Path")return growthWords;
    return aac[category]||aac.Quick;
  }

  function renderCommunication(){
    const items=communicationItems();
    const categories=[...Object.keys(aac),"Growth Path","Favorites"];
    return `<section>
      ${pageHead("Communication","Tap cards to build the sentence exactly as written.")}
      <div class="mobile-voice-banner"><div><strong>🎙️ Family Voice Cards</strong><small>Caregivers record directly on the matching card.</small></div><button type="button" data-action="voice-setup">${voiceSetup?"Done":"Set up"}</button></div>
      ${voiceSetup?`<div class="mobile-panel"><h3>Private caregiver recording mode</h3><p>Record or upload the exact word shown on each card. Recordings stay on this device.</p><div id="voice-list" class="voice-list"><p class="muted">Checking saved voices…</p></div></div><div class="mobile-recording"><span data-record-status>Choose a card to record.</span><button type="button" data-action="record-stop" hidden>■ Stop & save</button></div>`:""}
      <div class="mobile-sentence"><textarea rows="2" data-sentence aria-label="Communication sentence" placeholder="Your sentence…">${esc(sentence)}</textarea><div class="mobile-sentence-actions"><button type="button" data-action="sentence-clear" aria-label="Clear">✕</button><button type="button" data-action="sentence-speak" aria-label="Play the exact sentence">🔊</button></div></div>
      <div class="mobile-category-row">${categories.map(name=>`<button class="mobile-chip ${category===name?"active":""}" type="button" data-category="${esc(name)}">${esc(name)}</button>`).join("")}</div>
      <div class="mobile-aac-grid">${items.length?items.map(([word,icon])=>`<article class="mobile-aac-card"><button class="mobile-favorite" type="button" data-favorite="${esc(word)}" aria-label="Favorite ${esc(word)}">${BB.store.data.favorites.includes(word)?"⭐":"☆"}</button><button class="mobile-aac-say" type="button" data-word="${esc(word)}"><span class="icon">${icon}</span><strong>${esc(word)}</strong></button>${voiceSetup?`<div class="mobile-voice-actions"><button type="button" data-record-card="${esc(word)}">🎙️ Record</button><label>⬆ Upload<input class="sr-only" type="file" accept="audio/*" data-upload-card="${esc(word)}"></label></div>`:""}</article>`).join(""):`<div class="mobile-panel"><h3>No favorites yet</h3><p>Tap ☆ on a card to add it here.</p></div>`}</div>
    </section>`;
  }

  function renderLearning(){
    return `<section>${pageHead("Learning Adventures","Choose cards to explore or play a gentle challenge.")}
      <div class="mobile-list">${learningIds.map(id=>{const game=BB.games[id];return `<article class="mobile-list-card" style="--soft:${game.color}"><span>${game.icon}</span><div><strong>${esc(game.title)}</strong><small>${esc(game.description)}</small></div><div><button class="mobile-button secondary" type="button" data-cards="${id}">Cards</button><button class="mobile-button" type="button" data-play="${id}">Play</button></div></article>`;}).join("")}</div>
    </section>`;
  }

  function renderFlashcards(options={}){
    if(options.game){currentGame=BB.games[options.game];cardIndex=0;}
    if(!currentGame)return renderLearning();
    const card=currentGame.cards[cardIndex];
    return `<section>${pageHead(currentGame.title,`Card ${cardIndex+1} of ${currentGame.cards.length}`,"learning")}
      <div class="mobile-flashcard"><div><div class="mobile-flash-symbol">${card.symbol}</div><div class="mobile-flash-word">${esc(card.word)}</div><p>${card.emoji} ${esc(card.detail)}</p></div></div>
      <div class="mobile-button-row"><button class="mobile-button secondary" type="button" data-action="card-prev">← Back</button><button class="mobile-button" type="button" data-action="card-hear">🔊 Hear</button><button class="mobile-button secondary" type="button" data-action="card-next">Next →</button></div>
    </section>`;
  }

  function renderQuiz(options={}){
    if(options.game){currentGame=BB.games[options.game];roundIndex=0;quizLocked=false;}
    if(!currentGame)return renderLearning();
    const round=currentGame.rounds[roundIndex];
    return `<section>${pageHead(currentGame.title,`Challenge ${roundIndex+1} of ${currentGame.rounds.length}`,"learning")}
      <div class="mobile-question"><h2>${esc(round.prompt)}</h2><div class="visual">${esc(round.visual)}</div></div>
      <div id="quiz-result" class="mobile-answers">${round.options.map(([symbol,label],index)=>`<button class="mobile-answer" type="button" data-answer="${index}"><span>${symbol}</span>${esc(label)}</button>`).join("")}</div>
    </section>`;
  }

  function renderCalm(){
    return `<section>${pageHead("Feelings & Calm","Name a feeling, breathe, or gently pop bubbles.")}
      <div class="mobile-feelings">${feelings.map(([name,icon,detail])=>`<button class="mobile-feeling" type="button" data-feeling="${esc(name)}|${esc(detail)}"><span>${icon}</span>${esc(name)}</button>`).join("")}</div>
      <div class="mobile-section-title"><h2>Quiet bubble play</h2></div><div class="mobile-sensory" data-sensory aria-label="Tap to make calming bubbles"></div>
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
      ["settings","⚙️","Comfort Settings","Sound, text, and motion","#e9efff"],
      ["parent","🔒","Grown-up Area","Private caregiver controls","#ececf2"]
    ];
    return `<section>${pageHead("More to Explore","Activities and caregiver tools.")}
      <div class="mobile-card-grid">${cards.map(([id,icon,title,detail,color])=>`<button class="mobile-home-card" style="--card:${color}" type="button" data-route="${id}"><span>${icon}</span><strong>${title}</strong><small>${detail}</small></button>`).join("")}</div>
    </section>`;
  }

  function renderParent(){
    if(!parentUnlocked){
      setTimeout(()=>showPin(),0);
      return `<section>${pageHead("Grown-up Area","A parent PIN protects these private controls.","more")}<div class="mobile-panel" style="text-align:center"><div style="font-size:65px">🔒</div><h2>Grown-up check needed</h2><button class="mobile-button" type="button" data-action="open-pin">Enter PIN</button><p class="muted">Starter PIN: 2468</p></div></section>`;
    }
    const data=BB.store.data,profile=activeProfile();
    return `<section>${pageHead("Parent Dashboard",`Private controls for ${profile.name}.`,"more")}
      <div class="mobile-stats"><div class="mobile-stat"><strong>${Math.floor(data.screenSeconds/60)}m</strong><span>App time</span></div><div class="mobile-stat"><strong>${data.stars}</strong><span>Stars</span></div></div>
      <div class="mobile-section-title"><h2>Memories & growth</h2></div>
      <div class="mobile-memory-grid"><button class="mobile-memory-button" type="button" data-mobile-memory-open="voice"><span>🎤</span>Voice Journey</button><button class="mobile-memory-button" type="button" data-mobile-memory-open="timeline"><span>🌈</span>Growth Timeline</button><button class="mobile-memory-button" type="button" data-mobile-memory-open="letters"><span>💌</span>Future Letters</button><button class="mobile-memory-button" type="button" data-mobile-memory-open="growth"><span>🌱</span>Growth Paths</button></div>
      <div class="mobile-setting-group" style="margin-top:13px"><h3>👤 Child profile</h3>
        <label class="mobile-setting-row"><span><strong>Active profile</strong></span><select data-profile>${data.profiles.map(item=>`<option value="${esc(item.id)}" ${item.id===data.activeProfile?"selected":""}>${item.avatar} ${esc(item.name)}</option>`).join("")}</select></label>
        <label class="mobile-setting-row"><span><strong>Display name</strong></span><input data-profile-name value="${esc(profile.name)}" maxlength="30"></label>
        <div class="mobile-setting-row"><span><strong>Family Voice Cards</strong><small>Record beside exact cards in Communication.</small></span><button class="mobile-button secondary" type="button" data-route="communication">Open</button></div>
      </div>
      <div class="mobile-button-row"><button class="mobile-button secondary" type="button" data-action="change-pin">Change PIN</button><button class="mobile-button secondary" type="button" data-action="export">Export progress</button><button class="mobile-button danger" type="button" data-action="reset">Reset</button></div>
    </section>`;
  }

  function renderSettings(){
    const settings=BB.store.data.settings;
    return `<section>${pageHead("Comfort Settings","Make the mobile experience feel right.","more")}
      <div class="mobile-setting-group"><h3>Sound & appearance</h3>${Object.entries(settingsRows).map(([key,[title,detail]])=>`<div class="mobile-setting-row"><span><strong>${title}</strong><small>${detail}</small></span><button class="mobile-switch ${settings[key]?"on":""}" type="button" role="switch" aria-checked="${settings[key]}" data-setting="${key}"><i></i></button></div>`).join("")}
        <label class="mobile-setting-row mobile-range-row"><span><strong>Family voice volume</strong><small>Caregiver recordings and communication cards</small></span><input type="range" min="0" max="1" step=".05" value="${settings.speechVolume}" data-range="speechVolume"></label>
        <label class="mobile-setting-row mobile-range-row"><span><strong>Effects volume</strong><small>Success and try-again sounds</small></span><input type="range" min="0" max="1" step=".05" value="${settings.effectsVolume}" data-range="effectsVolume"></label>
      </div><p class="muted">🔒 Activity stays on this device. No ads and no tracking.</p>
    </section>`;
  }

  function showPin(success=null){
    if(parentUnlocked){success?.();return;}
    if(modalRoot.innerHTML)return;
    pinSuccess=success;
    modal(`<div class="mobile-modal-head"><h2>Grown-up check</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><p>Tap the four-digit parent PIN.</p><input class="pin-entry" type="password" inputmode="numeric" maxlength="4" data-pin aria-label="Parent PIN"><div class="pin-dots" data-pin-dots>○ ○ ○ ○</div><div class="pin-keypad">${["1","2","3","4","5","6","7","8","9","clear","0","back"].map(key=>`<button type="button" data-pin-key="${key}">${key==="back"?"⌫":key==="clear"?"Clear":key}</button>`).join("")}</div><button class="mobile-button pin-continue" type="button" data-action="verify-pin">Continue</button><p class="muted">Starter PIN: 2468</p>`,"Parent PIN");
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
      document.querySelectorAll("[data-answer]").forEach((button,i)=>{if(i===index)button.classList.add("tried");if(i===round.answer)button.classList.add("hint");});
      BB.audio.tryAgain();pip("Good try. Look for the highlighted answer and try again.","🙂");return;
    }
    quizLocked=true;BB.audio.success();BB.rewards.earn(currentGame.title);BB.rewards.recordProgress(currentGame.id);
    BB.memoryJourney?.track("learning","First learning activity completed",{icon:"📚",detail:currentGame.title,onceKey:"first-learning"});
    const target=document.querySelector("#quiz-result");
    target.innerHTML=`<div class="mobile-success"><div>🥳</div><h2>You found it!</h2><p>${esc(round.fact)}</p><button class="mobile-button" type="button" data-action="quiz-next">${roundIndex===currentGame.rounds.length-1?"Finish":"Next"}</button></div>`;
    updateHeader();pip(`Yes! ${round.fact}`,"🥳");
  }

  function setupSensory(){
    const stage=document.querySelector("[data-sensory]");
    if(!stage)return;
    stage.addEventListener("pointerdown",event=>{
      const rect=stage.getBoundingClientRect(),bubble=document.createElement("span"),size=35+Math.random()*55;
      bubble.className="mobile-bubble";bubble.style.width=`${size}px`;bubble.style.height=`${size}px`;bubble.style.left=`${Math.max(0,event.clientX-rect.left-size/2)}px`;bubble.style.top=`${Math.max(0,event.clientY-rect.top-size/2)}px`;
      stage.appendChild(bubble);BB.audio.pop();setTimeout(()=>bubble.remove(),1800);
    });
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
    const record=event.target.closest("[data-record-card]");if(record){startRecording(record.dataset.recordCard);return;}
    const voicePlay=event.target.closest("[data-voice-play]");if(voicePlay){BB.voiceLibrary.play(voicePlay.dataset.voicePlay,BB.store.data.settings.speechVolume);return;}
    const voiceDelete=event.target.closest("[data-voice-delete]");if(voiceDelete){if(confirm("Delete this family voice recording?"))BB.voiceLibrary.remove(voiceDelete.dataset.voiceDelete).then(()=>{toast("Voice deleted");refreshVoiceList();});return;}
    const cards=event.target.closest("[data-cards]");if(cards){currentGame=BB.games[cards.dataset.cards];cardIndex=0;go("flashcards",{game:currentGame.id});return;}
    const play=event.target.closest("[data-play]");if(play){currentGame=BB.games[play.dataset.play];roundIndex=0;quizLocked=false;go("quiz",{game:currentGame.id});return;}
    const answer=event.target.closest("[data-answer]");if(answer){answerQuiz(Number(answer.dataset.answer));return;}
    const feeling=event.target.closest("[data-feeling]");if(feeling){const [name,detail]=feeling.dataset.feeling.split("|");BB.memoryJourney?.track("emotion","First emotion selected",{icon:"😊",detail:name,onceKey:"first-emotion"});pip(`${name}. ${detail}`,"😊");return;}
    const instrumentButton=event.target.closest("[data-instrument]");if(instrumentButton){instrument=instrumentButton.dataset.instrument;view.innerHTML=renderMusic();return;}
    const note=event.target.closest("[data-note]");if(note){BB.audio.note(Number(note.dataset.note),BB.games.music.instruments[instrument].type);return;}
    const nature=event.target.closest("[data-nature]");if(nature){const scene=BB.games.nature.scenes.find(item=>item.id===nature.dataset.nature);modal(`<div class="mobile-modal-head"><h2>${scene.icon} ${esc(scene.label)}</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><div style="font-size:55px;text-align:center">${scene.items.join(" ")}</div><p>${esc(scene.fact)}</p><button class="mobile-button" type="button" data-action="close-modal">Done</button>`,scene.label);pip(scene.fact,"😊");return;}
    const routine=event.target.closest("[data-routine]");if(routine){currentRoutine=routine.dataset.routine;completedSteps=new Set();view.innerHTML=renderDaily();return;}
    const step=event.target.closest("[data-step]");if(step){const index=Number(step.dataset.step);completedSteps.add(index);BB.audio.pop();view.innerHTML=renderDaily();pip(`${BB.games.dailylife.routines[currentRoutine][index][1]}. Nice job!`,"😊");if(completedSteps.size===BB.games.dailylife.routines[currentRoutine].length){BB.rewards.earn(currentRoutine);updateHeader();pip("Routine complete! You followed every step.","🥳");}return;}
    const social=event.target.closest("[data-social-answer]");if(social){const story=BB.games.socialskills.stories[socialIndex],index=Number(social.dataset.socialAnswer);if(index!==story.answer){social.classList.add("tried");document.querySelectorAll("[data-social-answer]")[story.answer]?.classList.add("hint");BB.audio.tryAgain();pip("Good try. Look for the kind and safe choice.","🙂");}else{BB.audio.success();BB.rewards.earn("Social skills");document.querySelector("#social-result").innerHTML=`<div class="mobile-success"><div>🤝</div><h2>Kind choice!</h2><p>${esc(story.fact)}</p><button class="mobile-button" type="button" data-action="social-next">Next</button></div>`;updateHeader();pip(story.fact,"🥳");}return;}
    const setting=event.target.closest("[data-setting]");if(setting){const key=setting.dataset.setting;BB.store.data.settings[key]=!BB.store.data.settings[key];BB.store.save();BB.accessibility.apply();view.innerHTML=renderSettings();return;}
    const action=event.target.closest("[data-action]");if(!action)return;
    switch(action.dataset.action){
      case "repeat-pip":BB.speech.repeat();break;
      case "voice-setup":toggleVoiceSetup();break;
      case "record-stop":stopRecording();break;
      case "sentence-clear":sentence="";refreshCommunication();break;
      case "sentence-speak":{const value=(document.querySelector("[data-sentence]")?.value||sentence).trim();sentence=value;if(value){speakExact(value);BB.store.data.recentPhrases.unshift(value);BB.store.data.recentPhrases=BB.store.data.recentPhrases.slice(0,20);BB.store.save();BB.memoryJourney?.track("communication","First sentence created",{icon:"💬",detail:value,onceKey:"first-sentence"});pip(value,"😊");}else toast("Add words to the sentence first.");break;}
      case "card-prev":cardIndex=(cardIndex-1+currentGame.cards.length)%currentGame.cards.length;view.innerHTML=renderFlashcards();break;
      case "card-next":cardIndex=(cardIndex+1)%currentGame.cards.length;view.innerHTML=renderFlashcards();break;
      case "card-hear":{const card=currentGame.cards[cardIndex];speakExact(`${card.word}. ${card.detail}`);break;}
      case "quiz-next":if(roundIndex===currentGame.rounds.length-1)go("learning");else{roundIndex++;quizLocked=false;view.innerHTML=renderQuiz();}break;
      case "breathe":showBreathing();break;
      case "calm-music":BB.audio.startCalmMusic();toast("Calm music started");break;
      case "stop-music":BB.audio.stopMusic();toast("Music stopped");break;
      case "social-next":socialIndex=(socialIndex+1)%BB.games.socialskills.stories.length;view.innerHTML=renderSocial();break;
      case "open-pin":showPin();break;
      case "verify-pin":verifyPin();break;
      case "change-pin":modal(`<div class="mobile-modal-head"><h2>Change parent PIN</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><input class="pin-entry" type="password" inputmode="numeric" maxlength="4" data-new-pin placeholder="New 4-digit PIN"><button class="mobile-button pin-continue" type="button" data-action="save-pin">Save PIN</button>`,"Change PIN");break;
      case "save-pin":{const value=document.querySelector("[data-new-pin]")?.value;if(/^\d{4}$/.test(value)){BB.store.data.settings.parentPin=value;BB.store.save();closeModal();toast("Parent PIN changed");}else toast("Use exactly four numbers.");break;}
      case "export":exportProgress();break;
      case "reset":if(confirm("Reset all BrightBridge progress and private memories on this device?"))Promise.all([BB.voiceLibrary.clear(),BB.memoryJourney.clear()]).finally(()=>{BB.store.reset();parentUnlocked=false;go("home");});break;
      case "close-modal":closeModal();break;
      case "modal-overlay":if(event.target===action)closeModal();break;
    }
  }

  function handleInput(event){
    if(event.target.matches("[data-pin]"))updatePin();
    if(event.target.matches("[data-sentence]"))sentence=event.target.value;
    if(event.target.matches("[data-profile-name]")){const profile=activeProfile();profile.name=event.target.value;BB.store.save();}
    if(event.target.matches("[data-range]")){BB.store.data.settings[event.target.dataset.range]=Number(event.target.value);BB.store.save();}
  }

  function handleChange(event){
    if(event.target.matches("[data-upload-card]"))uploadVoice(event.target);
    if(event.target.matches("[data-profile]")){BB.store.data.activeProfile=event.target.value;BB.store.save();go("parent",{replace:true});}
  }

  document.addEventListener("click",handleClick);
  document.addEventListener("input",handleInput);
  document.addEventListener("change",handleChange);
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModal();if(event.key==="Enter"&&event.target.matches("[data-pin]"))verifyPin();});
  window.addEventListener("bb:reward",updateHeader);
  window.addEventListener("error",event=>{console.error(event.error);toast("Something paused. Please try that touch again.");});

  window.BB=window.BB||{};
  BB.navigation={go,back:()=>go(history.pop()||"home",{replace:true}),pageHead,get current(){return route;}};
  BB.app={render:(next,options)=>{route=next;render(options);},pip,modal,closeModal,toast,isParentUnlocked:()=>parentUnlocked};
  BB.accessibility.apply();
  go("home",{replace:true});
  if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("../service-worker.js").catch(()=>{});
})();
