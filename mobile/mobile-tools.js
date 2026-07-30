(function(){
  "use strict";
  let section="schedule";
  let photoDbPromise=null;
  let photoUrls=[];
  const essentialPhrases=["Yes","No","Help","Stop","More","All done","Please","Thank you","I want water","I need help","I need a break","Bathroom","I am tired","Happy","Sad","Calm","Try again","Great job!","You found it!","I love you"];

  function esc(value=""){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));}
  function state(){
    const data=BB.store.data;
    data.mobileTools||={schedule:[],firstThen:{first:"",then:""},choices:[],guided:false,guidedRoute:"learning",promptLevel:"full"};
    data.mobileTools.schedule||=[];data.mobileTools.firstThen||={first:"",then:""};data.mobileTools.choices||=[];
    return data.mobileTools;
  }
  function tabs(){
    return `<div class="mobile-category-row">${[["schedule","📅 Schedule"],["firstthen","➡️ First–Then"],["choices","☝️ Choices"],["photos","📷 My Cards"],["insights","📊 Insights"],["grownup","🔒 Grown-up"]].map(([id,label])=>`<button class="mobile-chip ${section===id?"active":""}" type="button" data-mt-section="${id}">${label}</button>`).join("")}</div>`;
  }
  function head(){return `<div class="mobile-page-head"><button type="button" data-route="more" aria-label="Go back">←</button><div><h1>My Tools</h1><p>Familiar pictures, clear routines, and simple choices.</p></div></div>${tabs()}`;}
  function render(){
    return `<section>${head()}${renderSection()}</section>`;
  }
  function renderSection(){
    if(section==="schedule")return renderSchedule();
    if(section==="firstthen")return renderFirstThen();
    if(section==="choices")return renderChoices();
    if(section==="photos")return renderPhotos();
    if(section==="insights")return renderInsights();
    return renderGrownup();
  }
  function renderSchedule(){
    const steps=state().schedule;
    return `<div class="mobile-panel"><h2>Visual Schedule</h2><p>Build a clear sequence for today. Tap a step when it is finished.</p><div class="mobile-tool-form"><select data-mt-schedule-icon aria-label="Step picture">${["☀️","🚽","👕","🥣","🎒","🏫","🪥","🛁","📖","🌙","⭐"].map(icon=>`<option>${icon}</option>`).join("")}</select><input data-mt-schedule-text maxlength="60" placeholder="Eat breakfast"><button class="mobile-button" type="button" data-mt-action="add-step">Add step</button></div></div>
      <div class="mobile-list">${steps.length?steps.map(step=>`<article class="mobile-list-card ${step.done?"done":""}"><button class="mobile-step-check" type="button" data-mt-step-done="${step.id}" aria-label="Mark ${esc(step.text)} ${step.done?"not done":"done"}">${step.done?"✅":step.icon}</button><div><strong>${esc(step.text)}</strong><small>${step.done?"Finished":"Tap the picture when complete"}</small></div><div class="mobile-mini-actions"><button type="button" data-mt-step-up="${step.id}" aria-label="Move up">↑</button><button type="button" data-mt-step-down="${step.id}" aria-label="Move down">↓</button><button type="button" data-mt-step-delete="${step.id}" aria-label="Delete">×</button></div></article>`).join(""):`<div class="mobile-panel"><h3>Your schedule is ready to grow</h3><p>Add only the steps that help today.</p></div>`}</div>`;
  }
  function renderFirstThen(){
    const item=state().firstThen;
    return `<div class="mobile-panel"><h2>First–Then Board</h2><p>Show what happens now and what comes next.</p><label class="mobile-tool-label">First<input data-mt-first maxlength="60" value="${esc(item.first)}" placeholder="Brush teeth"></label><label class="mobile-tool-label">Then<input data-mt-then maxlength="60" value="${esc(item.then)}" placeholder="Music time"></label></div><div class="mobile-first-then"><button type="button" data-mt-speak="${esc(item.first)}"><small>FIRST</small><strong>${esc(item.first||"Choose first")}</strong></button><span>→</span><button type="button" data-mt-speak="${esc(item.then)}"><small>THEN</small><strong>${esc(item.then||"Choose next")}</strong></button></div>`;
  }
  function renderChoices(){
    const choices=state().choices;
    return `<div class="mobile-panel"><h2>Choice Mode</h2><p>Offer two or three clear choices.</p><div class="mobile-tool-form"><input data-mt-choice maxlength="40" placeholder="Music"><button class="mobile-button" type="button" data-mt-action="add-choice">Add</button></div></div><div class="mobile-list">${choices.map((choice,index)=>`<article class="mobile-list-card"><span>☝️</span><div><strong>${esc(choice)}</strong></div><button class="compact-button" type="button" data-mt-choice-delete="${index}">×</button></article>`).join("")}</div><button class="mobile-button mobile-wide-button" type="button" data-mt-action="show-choices" ${choices.length<2?"disabled":""}>Show choices</button>`;
  }
  function renderPhotos(){
    return `<div class="mobile-panel"><h2>Personal Photo Cards</h2><p>Add familiar people, foods, rooms, pets, and favorite objects. Photos stay on this device.</p><label class="mobile-tool-label">Card name<input data-mt-photo-label maxlength="50" placeholder="Grandma"></label><label class="mobile-tool-label">Photo<input type="file" accept="image/*" capture="environment" data-mt-photo-file></label><button class="mobile-button" type="button" data-mt-action="add-photo">Add photo card</button></div><div id="mobile-photo-grid" class="mobile-photo-grid"><p class="muted">Loading private photo cards…</p></div>`;
  }
  function renderInsights(){
    const data=BB.store.data,words=Object.entries(data.wordUse||{}).sort((a,b)=>b[1]-a[1]).slice(0,8),visits=Object.entries(data.activityVisits||{}).sort((a,b)=>b[1]-a[1]).slice(0,6);
    return `<div class="mobile-panel"><h2>Communication Insights</h2><p>Private patterns entered by the family and app activity only. LumiTalk never interprets vocalizations.</p><h3>Frequently used words</h3>${words.map(([word,count])=>`<p><strong>${esc(word)}</strong> · ${count} touches</p>`).join("")||"<p class='muted'>AAC patterns will appear after cards are used.</p>"}<h3>Favorite activities</h3>${visits.map(([name,count])=>`<p><strong>${esc(name)}</strong> · ${count} visits</p>`).join("")||"<p class='muted'>Activity patterns will appear here.</p>"}</div><div class="mobile-panel"><h3>Family voice coverage</h3><div class="mobile-coverage"><i id="mobile-coverage-bar"></i></div><p id="mobile-coverage-label" class="muted">Checking saved caregiver voices…</p><div id="mobile-coverage-list" class="mobile-list"></div></div>`;
  }
  function renderGrownup(){
    if(!BB.app?.isParentUnlocked?.())return `<div class="mobile-panel"><h2>Grown-up check required</h2><p>Unlock the Grown-up Area to use guided mode and private backups.</p><button class="mobile-button" type="button" data-route="parent">Unlock</button></div>`;
    const tools=state();
    return `<div class="mobile-panel"><h2>Guided Child Mode</h2><p>Keep the phone inside one selected activity until a caregiver exits.</p><label class="mobile-tool-label">Activity<select data-mt-guided-route>${[["communication","Communication"],["learning","Learning"],["calm","Feelings & Calm"],["music","Music"],["daily","Daily Living"]].map(([id,label])=>`<option value="${id}" ${tools.guidedRoute===id?"selected":""}>${label}</option>`).join("")}</select></label><button class="mobile-button" type="button" data-mt-action="start-guided">Start guided mode</button></div>
      <div class="mobile-panel"><h2>Prompt level</h2><p>Gradually reduce clues while keeping every response kind.</p><div class="mobile-category-row">${[["full","Full clues"],["gentle","Gentle clues"],["independent","Independent try"]].map(([id,label])=>`<button class="mobile-chip ${tools.promptLevel===id?"active":""}" type="button" data-mt-prompt="${id}">${label}</button>`).join("")}</div></div>
      <div class="mobile-panel"><h2>Complete Private Backup</h2><p>Save profiles, settings, progress, family voices, photos, letters, and Voice Journey recordings. Nothing uploads automatically.</p><div class="mobile-button-row"><button class="mobile-button secondary" type="button" data-mt-action="backup">Download backup</button><button class="mobile-button secondary" type="button" data-mt-action="encrypted-backup">Encrypted backup</button><label class="mobile-button secondary">Restore backup<input class="sr-only" type="file" accept=".json,.lumitalk,.brightbridge,application/json" data-mt-restore></label></div></div>`;
  }

  function photoDatabase(){
    if(photoDbPromise)return photoDbPromise;
    photoDbPromise=new Promise((resolve,reject)=>{
      if(!window.indexedDB){reject(new Error("Photo storage unavailable"));return;}
      const request=indexedDB.open("brightbridge-personal-photos",1);let settled=false;
      const finish=(callback,value)=>{if(settled)return;settled=true;clearTimeout(timer);callback(value);};
      const timer=setTimeout(()=>finish(reject,new Error("Photo storage timed out")),2500);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("photos"))request.result.createObjectStore("photos",{keyPath:"id"});};
      request.onsuccess=()=>finish(resolve,request.result);request.onerror=()=>finish(reject,request.error);request.onblocked=()=>finish(reject,new Error("Photo storage blocked"));
    }).catch(error=>{photoDbPromise=null;throw error;});
    return photoDbPromise;
  }
  async function photoStore(mode,operation){
    const db=await photoDatabase();
    return new Promise((resolve,reject)=>{try{const request=operation(db.transaction("photos",mode).objectStore("photos"));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}catch(error){reject(error);}});
  }
  async function listPhotos(){try{return await photoStore("readonly",store=>store.getAll());}catch{return [];}}
  function savePhoto(record){return photoStore("readwrite",store=>store.put(record));}
  function deletePhoto(id){return photoStore("readwrite",store=>store.delete(id));}
  function clearPhotos(){return photoStore("readwrite",store=>store.clear());}
  function blobToDataUrl(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});}
  async function exportPhotos(){return Promise.all((await listPhotos()).map(async item=>({...item,blob:undefined,dataUrl:await blobToDataUrl(item.blob)})));}
  async function importPhotos(items=[]){try{await clearPhotos();}catch{}for(const item of items){if(!item.dataUrl)continue;const blob=await fetch(item.dataUrl).then(response=>response.blob());await savePhoto({id:item.id||`photo-${Date.now()}`,profileId:item.profileId||BB.store.data.activeProfile,label:item.label,createdAt:item.createdAt||new Date().toISOString(),blob});}}
  async function refreshPhotos(){
    const target=document.querySelector("#mobile-photo-grid");if(!target)return;
    photoUrls.forEach(URL.revokeObjectURL);photoUrls=[];
    const items=(await listPhotos()).filter(item=>!item.profileId||item.profileId===BB.store.data.activeProfile);
    if(!document.body.contains(target))return;
    target.innerHTML=items.length?items.map(item=>{const url=URL.createObjectURL(item.blob);photoUrls.push(url);return `<article class="mobile-photo-card"><img src="${url}" alt="${esc(item.label)}"><strong>${esc(item.label)}</strong><div><button type="button" data-mt-photo-speak="${esc(item.label)}">🔊</button><button type="button" data-mt-photo-delete="${item.id}">🗑️</button></div></article>`;}).join(""):"<div class='mobile-panel'><p>No personal photo cards yet.</p></div>";
  }
  async function refreshCoverage(){
    const records=await BB.voiceLibrary.list(),keys=new Set(records.map(item=>BB.voiceLibrary.normalize(item.label))),covered=essentialPhrases.filter(item=>keys.has(BB.voiceLibrary.normalize(item)));
    const bar=document.querySelector("#mobile-coverage-bar"),label=document.querySelector("#mobile-coverage-label"),list=document.querySelector("#mobile-coverage-list");
    if(bar)bar.style.width=`${covered.length/essentialPhrases.length*100}%`;if(label)label.textContent=`${covered.length} of ${essentialPhrases.length} helpful phrases have a family voice.`;
    if(list)list.innerHTML=essentialPhrases.map(item=>`<div class="mobile-coverage-item"><span>${keys.has(BB.voiceLibrary.normalize(item))?"✅":"○"}</span><strong>${esc(item)}</strong><small>${keys.has(BB.voiceLibrary.normalize(item))?"Ready":"Record in Communication"}</small></div>`).join("");
  }
  function afterRender(){if(section==="photos")refreshPhotos();if(section==="insights")refreshCoverage();}
  function rerender(){BB.store.save();const view=document.querySelector("#view");if(view)view.innerHTML=render();afterRender();}
  function moveStep(id,amount){const steps=state().schedule,index=steps.findIndex(item=>item.id===id),next=index+amount;if(index<0||next<0||next>=steps.length)return;[steps[index],steps[next]]=[steps[next],steps[index]];rerender();}
  async function addPhoto(){
    const label=document.querySelector("[data-mt-photo-label]")?.value.trim(),file=document.querySelector("[data-mt-photo-file]")?.files[0];
    if(!label||!file){BB.app.toast("Add a card name and choose a photo.");return;}
    if(!file.type.startsWith("image/")||file.size>8*1024*1024){BB.app.toast("Choose an image smaller than 8 MB.");return;}
    await savePhoto({id:`photo-${Date.now()}`,profileId:BB.store.data.activeProfile,label,createdAt:new Date().toISOString(),blob:file});BB.app.toast("Personal photo card saved.");refreshPhotos();
  }
  function download(blob,name){const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),500);}
  function bytesToBase64(bytes){let value="";for(let index=0;index<bytes.length;index+=0x8000)value+=String.fromCharCode(...bytes.subarray(index,index+0x8000));return btoa(value);}
  function base64ToBytes(value){const text=atob(value),bytes=new Uint8Array(text.length);for(let index=0;index<text.length;index++)bytes[index]=text.charCodeAt(index);return bytes;}
  async function encryptionKey(passphrase,salt,usage){const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(passphrase),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:180000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,usage);}
  async function backup(encrypted=false){
    BB.app.toast("Preparing private backup…");
    try{
      const payload={format:"LumiTalk Mobile Backup",version:3,createdAt:new Date().toISOString(),state:BB.store.data,voices:await BB.voiceLibrary.exportAll(),photos:await exportPhotos(),memories:await BB.memoryJourney.exportAll()};
      if(!encrypted){download(new Blob([JSON.stringify(payload)],{type:"application/json"}),`lumitalk-complete-${new Date().toISOString().slice(0,10)}.lumitalk.json`);return;}
      const passphrase=prompt("Create a backup passphrase. It cannot be recovered if forgotten:");if(!passphrase||passphrase.length<6){BB.app.toast("Use at least six characters for an encrypted backup.");return;}
      const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await encryptionKey(passphrase,salt,["encrypt"]),cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(JSON.stringify(payload)))),envelope={format:"LumiTalk Encrypted Backup",version:1,salt:bytesToBase64(salt),iv:bytesToBase64(iv),cipher:bytesToBase64(cipher)};
      download(new Blob([JSON.stringify(envelope)],{type:"application/json"}),`lumitalk-encrypted-${new Date().toISOString().slice(0,10)}.lumitalk.json`);
    }catch{BB.app.toast("The private backup could not be created.");}
  }
  async function restore(file){
    try{
      let payload=JSON.parse(await file.text());
      if(["LumiTalk Encrypted Backup","BrightBridge Encrypted Backup"].includes(payload.format)){const passphrase=prompt("Enter this backup's passphrase:");if(!passphrase)throw new Error();const salt=base64ToBytes(payload.salt),iv=base64ToBytes(payload.iv),key=await encryptionKey(passphrase,salt,["decrypt"]),plain=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,base64ToBytes(payload.cipher));payload=JSON.parse(new TextDecoder().decode(plain));}
      if(!["LumiTalk Mobile Backup","BrightBridge Mobile Backup","BrightBridge Complete Backup"].includes(payload.format))throw new Error();
      await BB.voiceLibrary.clear();await BB.memoryJourney.clear();await clearPhotos().catch(()=>{});
      Object.keys(BB.store.data).forEach(key=>delete BB.store.data[key]);Object.assign(BB.store.data,payload.state);state();BB.store.save();
      await BB.voiceLibrary.importAll(payload.voices||[]);await importPhotos(payload.photos||[]);await BB.memoryJourney.importAll(payload.memories||{});location.reload();
    }catch{BB.app.toast("That backup file could not be restored.");}
  }
  function showChoices(){
    const choices=state().choices;if(choices.length<2)return;
    BB.app.modal(`<div class="mobile-modal-head"><h2>What do you choose?</h2><button class="mobile-close" type="button" data-action="close-modal">×</button></div><div class="mobile-choice-launch">${choices.map(choice=>`<button type="button" data-mt-chosen="${esc(choice)}">☝️<strong>${esc(choice)}</strong></button>`).join("")}</div>`,"Choice Mode");
  }
  function startGuided(){
    if(!BB.app.isParentUnlocked()){BB.navigation.go("parent");return;}
    state().guided=true;state().guidedRoute=document.querySelector("[data-mt-guided-route]")?.value||"learning";BB.store.save();document.body.classList.add("mobile-guided");document.querySelector("#guided-exit").hidden=false;BB.navigation.go(state().guidedRoute);
  }
  function exitGuided(){
    if(!BB.app.isParentUnlocked()){BB.app.toast("Unlock the Grown-up Area to exit.");BB.navigation.go("parent");return;}
    state().guided=false;BB.store.save();document.body.classList.remove("mobile-guided");document.querySelector("#guided-exit").hidden=true;BB.navigation.go("home");
  }
  function restoreGuided(){if(state().guided){document.body.classList.add("mobile-guided");const exit=document.querySelector("#guided-exit");if(exit)exit.hidden=false;return state().guidedRoute;}return null;}

  document.addEventListener("click",async event=>{
    const tab=event.target.closest("[data-mt-section]");if(tab){if(tab.dataset.mtSection==="grownup"&&!BB.app.isParentUnlocked()){BB.navigation.go("parent");return;}section=tab.dataset.mtSection;rerender();return;}
    const done=event.target.closest("[data-mt-step-done]");if(done){const item=state().schedule.find(step=>step.id===done.dataset.mtStepDone);if(item){item.done=!item.done;BB.audio.pop();BB.speech.speak(item.text);rerender();}return;}
    const up=event.target.closest("[data-mt-step-up]");if(up){moveStep(up.dataset.mtStepUp,-1);return;}const down=event.target.closest("[data-mt-step-down]");if(down){moveStep(down.dataset.mtStepDown,1);return;}
    const remove=event.target.closest("[data-mt-step-delete]");if(remove){state().schedule=state().schedule.filter(item=>item.id!==remove.dataset.mtStepDelete);rerender();return;}
    const choiceDelete=event.target.closest("[data-mt-choice-delete]");if(choiceDelete){state().choices.splice(Number(choiceDelete.dataset.mtChoiceDelete),1);rerender();return;}
    const chosen=event.target.closest("[data-mt-chosen]");if(chosen){BB.speech.speak(chosen.dataset.mtChosen);BB.app.pip(`You chose ${chosen.dataset.mtChosen}.`,"😊");BB.app.closeModal();return;}
    const speak=event.target.closest("[data-mt-speak]");if(speak&&speak.dataset.mtSpeak){BB.speech.speak(speak.dataset.mtSpeak);return;}
    const photoSpeak=event.target.closest("[data-mt-photo-speak]");if(photoSpeak){BB.speech.speak(photoSpeak.dataset.mtPhotoSpeak);return;}
    const photoDelete=event.target.closest("[data-mt-photo-delete]");if(photoDelete&&confirm("Delete this personal photo card?")){await deletePhoto(photoDelete.dataset.mtPhotoDelete);refreshPhotos();return;}
    const promptButton=event.target.closest("[data-mt-prompt]");if(promptButton){state().promptLevel=promptButton.dataset.mtPrompt;rerender();return;}
    if(event.target.closest("[data-mt-guided-exit]")){exitGuided();return;}
    const action=event.target.closest("[data-mt-action]");if(!action)return;
    if(action.dataset.mtAction==="add-step"){const input=document.querySelector("[data-mt-schedule-text]"),value=input?.value.trim();if(!value)return;state().schedule.push({id:`step-${Date.now()}`,icon:document.querySelector("[data-mt-schedule-icon]")?.value||"⭐",text:value,done:false});rerender();}
    if(action.dataset.mtAction==="add-choice"){const value=document.querySelector("[data-mt-choice]")?.value.trim();if(!value)return;if(state().choices.length>=3){BB.app.toast("Choice Mode uses up to three choices.");return;}state().choices.push(value);rerender();}
    if(action.dataset.mtAction==="show-choices")showChoices();
    if(action.dataset.mtAction==="add-photo")addPhoto();
    if(action.dataset.mtAction==="start-guided")startGuided();
    if(action.dataset.mtAction==="backup")backup();
    if(action.dataset.mtAction==="encrypted-backup")backup(true);
  });
  document.addEventListener("input",event=>{
    if(event.target.matches("[data-mt-first]")){state().firstThen.first=event.target.value;BB.store.save();}
    if(event.target.matches("[data-mt-then]")){state().firstThen.then=event.target.value;BB.store.save();}
  });
  document.addEventListener("change",event=>{if(event.target.matches("[data-mt-restore]")&&event.target.files[0])restore(event.target.files[0]);});

  window.BB=window.BB||{};
  BB.mobileTools={render,afterRender,restoreGuided,promptLevel:()=>state().promptLevel};
})();
