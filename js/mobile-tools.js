(function () {
  "use strict";
  let section = "schedule";
  let photoDatabasePromise;
  let photoUrls = [];
  const commonVoicePhrases = [
    "Yes","No","Help","Stop","More","All done","Please","Thank you",
    "I want water","I need help","I need a break","Bathroom","I am tired",
    "Happy","Sad","Calm","Try again","Great job!","You found it!","I love you"
  ];

  function mobileState() {
    return BB.store.data.mobileTools;
  }

  function isMobile() {
    return window.matchMedia("(max-width: 720px)").matches;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[char]);
  }

  function render() {
    const tabs = [
      ["schedule","📅 Schedule"],["firstthen","➡️ First–Then"],["choices","☝️ Choices"],
      ["photos","📷 My Cards"],["voice","🎙️ Voices"],["insights","📊 Insights"],["grownup","🔒 Grown-up"]
    ];
    return `<section class="mobile-tools-page">
      <div class="mobile-tool-hero"><p class="eyebrow">Made for this child</p><h1>My Tools</h1><p>Familiar pictures, simple choices, clear routines, and a family voice—all in one quiet place.</p></div>
      <div class="mobile-tool-tabs" aria-label="Personal tools">${tabs.map(([id,label])=>`<button type="button" class="${section===id?"active":""}" data-mobile-section="${id}">${label}</button>`).join("")}</div>
      <div id="mobile-tool-content">${renderSection()}</div>
    </section>`;
  }

  function renderSection() {
    switch (section) {
      case "schedule": return renderSchedule();
      case "firstthen": return renderFirstThen();
      case "choices": return renderChoices();
      case "photos": return renderPhotos();
      case "voice": return renderVoiceCoverage();
      case "insights": return renderInsights();
      case "grownup": return renderGrownup();
      default: return renderSchedule();
    }
  }

  function renderSchedule() {
    const steps = mobileState().schedule;
    return `<div class="panel"><h2>Visual Schedule</h2><p>Build a clear sequence for today. Tap each step when it is finished.</p>
      <div class="mobile-form"><select class="mobile-input" data-schedule-icon><option>☀️</option><option>🚽</option><option>👕</option><option>🥣</option><option>🎒</option><option>🏫</option><option>🪥</option><option>🛁</option><option>📖</option><option>🌙</option><option>⭐</option></select><input class="mobile-input" data-schedule-text placeholder="Add a step, such as Eat breakfast" maxlength="60"><button class="primary-button" type="button" data-mobile-action="add-step">Add step</button></div>
      <div class="schedule-mobile-list">${steps.length ? steps.map((step,index)=>`<div class="schedule-mobile-step ${step.done?"done":""}"><button class="step-emoji" type="button" data-mobile-step-done="${step.id}" aria-label="Mark ${escapeHtml(step.text)} ${step.done?"not done":"done"}">${step.done?"✅":step.icon}</button><strong>${escapeHtml(step.text)}</strong><div class="step-controls"><button type="button" data-mobile-step-up="${step.id}" aria-label="Move up">↑</button><button type="button" data-mobile-step-down="${step.id}" aria-label="Move down">↓</button><button type="button" data-mobile-step-delete="${step.id}" aria-label="Remove step">×</button></div></div>`).join(""):`<div class="panel"><strong>Your schedule is ready to grow.</strong><p>Add only the steps that are helpful today.</p></div>`}</div>
    </div>`;
  }

  function renderFirstThen() {
    const value = mobileState().firstThen;
    return `<div class="panel"><h2>First–Then Board</h2><p>Show what happens now and what comes next.</p>
      <div class="mobile-form"><input class="mobile-input" data-first-value value="${escapeHtml(value.first)}" placeholder="First: Brush teeth" maxlength="60"><input class="mobile-input" data-then-value value="${escapeHtml(value.then)}" placeholder="Then: Music time" maxlength="60"></div>
      <div class="first-then-board" style="margin-top:15px"><button class="first-then-box" type="button" data-mobile-speak="${escapeHtml(value.first)}"><strong>First</strong><span class="first-then-value" data-first-preview>${escapeHtml(value.first || "Choose the first step")}</span></button><span class="first-then-arrow">→</span><button class="first-then-box" type="button" data-mobile-speak="${escapeHtml(value.then)}"><strong>Then</strong><span class="first-then-value" data-then-preview>${escapeHtml(value.then || "Choose what comes next")}</span></button></div>
    </div>`;
  }

  function renderChoices() {
    const choices = mobileState().choices;
    return `<div class="panel"><h2>Choice Mode</h2><p>Offer two or three clear choices without showing the full board.</p>
      <div class="mobile-form"><input class="mobile-input" data-choice-text placeholder="Add a choice, such as Music" maxlength="40"><button class="primary-button" type="button" data-mobile-action="add-choice">Add choice</button></div>
      <div class="schedule-mobile-list">${choices.map((choice,index)=>`<div class="schedule-mobile-step"><span class="step-emoji">☝️</span><strong>${escapeHtml(choice)}</strong><div class="step-controls"><button type="button" data-mobile-choice-delete="${index}" aria-label="Remove ${escapeHtml(choice)}">×</button></div></div>`).join("")}</div>
      <button class="primary-button" type="button" data-mobile-action="launch-choices" ${choices.length<2?"disabled":""}>Show ${choices.length} choices</button>
    </div>`;
  }

  function renderPhotos() {
    return `<div class="panel"><h2>Personal Photo Cards</h2><p>Add familiar people, foods, rooms, pets, and favorite objects. Photos stay on this device.</p>
      <div class="mobile-form"><input class="mobile-input" data-photo-label placeholder="Card name, such as Grandma" maxlength="50"><input class="mobile-input" type="file" accept="image/*" capture="environment" data-photo-file><button class="primary-button" type="button" data-mobile-action="add-photo">Add photo card</button></div>
      <div id="personal-photo-grid" class="photo-card-grid"><p class="muted">Loading personal cards…</p></div>
    </div>`;
  }

  function renderVoiceCoverage() {
    return `<div class="panel"><h2>Family Voice Setup</h2><p>Record the most meaningful words first. This meter shows which essential phrases already have a familiar voice.</p><div class="coverage-meter" aria-label="Family voice coverage"><i id="coverage-value" style="width:0%"></i></div><p id="coverage-label" class="muted">Checking family voice clips…</p><div id="coverage-list" class="coverage-list"></div><button class="primary-button" type="button" data-route="parent">Open Family Voice Library</button></div>`;
  }

  function renderInsights() {
    const data = BB.store.data;
    const words = Object.entries(data.wordUse || {}).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const visits = Object.entries(data.activityVisits).sort((a,b)=>b[1]-a[1]).slice(0,5);
    return `<div class="panel"><h2>Communication Insights</h2><p>Private patterns can help grown-ups notice useful vocabulary and preferred activities.</p>
      <h3>Frequently touched words</h3><div class="insight-list">${words.length?words.map(([word,count])=>`<div class="insight-row"><span>💬 ${escapeHtml(word)}</span><strong>${count}</strong></div>`).join(""):"<p class='muted'>Word patterns will appear after AAC cards are used.</p>"}</div>
      <h3 style="margin-top:18px">Favorite activities</h3><div class="insight-list">${visits.map(([name,count])=>`<div class="insight-row"><span>🌱 ${escapeHtml(name)}</span><strong>${count} visits</strong></div>`).join("")}</div>
      <h3 style="margin-top:18px">Possible next recordings</h3><div id="insight-missing-voices" class="coverage-list"><p class="muted">Checking voice coverage…</p></div>
    </div>`;
  }

  function renderGrownup() {
    const tools = mobileState();
    return `<div class="panel"><h2>Grown-up Mobile Controls</h2>
      <h3>Prompt fading</h3><p>Gradually reduce clues while keeping every response kind and recoverable.</p><div class="category-row">${[["full","Full clues"],["gentle","Gentle clues"],["independent","Independent try"]].map(([value,label])=>`<button class="category-chip ${tools.promptLevel===value?"active":""}" type="button" data-prompt-level="${value}">${label}</button>`).join("")}</div>
      <h3>Guided child mode</h3><p>Keep the phone inside one selected activity. The parent PIN is required to exit.</p><select class="mobile-input" data-guided-route><option value="communication">Communication</option><option value="learning">Learning</option><option value="sensory">Sensory Play</option><option value="music">Music</option><option value="emotions">Feelings</option><option value="daily">Daily Living</option></select><button class="primary-button" type="button" data-mobile-action="start-guided">Start guided mode</button>
      <h3 style="margin-top:22px">Complete private backup</h3><p>Save profiles, settings, progress, family voices, and personal photo cards into one backup file.</p><div class="mobile-action-row"><button class="secondary-button" type="button" data-mobile-action="export-backup">Download backup</button><label class="secondary-button">Restore backup<input class="sr-only" type="file" accept=".json,.brightbridge,application/json" data-backup-file></label></div>
    </div>`;
  }

  function photoDatabase() {
    photoDatabasePromise ||= new Promise((resolve,reject)=>{
      const request=indexedDB.open("brightbridge-personal-photos",1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains("photos"))request.result.createObjectStore("photos",{keyPath:"id"});};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    return photoDatabasePromise;
  }

  async function photoStore(mode,operation) {
    const db=await photoDatabase();
    return new Promise((resolve,reject)=>{const request=operation(db.transaction("photos",mode).objectStore("photos"));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  }

  async function listPhotos() { try{return await photoStore("readonly",store=>store.getAll());}catch{return [];} }
  async function savePhoto(label,blob) { return photoStore("readwrite",store=>store.put({id:`photo-${Date.now()}`,label,blob,createdAt:new Date().toISOString()})); }
  async function deletePhoto(id) { return photoStore("readwrite",store=>store.delete(id)); }
  async function clearPhotos() { return photoStore("readwrite",store=>store.clear()); }

  async function refreshPhotos() {
    const target=document.querySelector("#personal-photo-grid");if(!target)return;
    photoUrls.forEach(url=>URL.revokeObjectURL(url));photoUrls=[];
    const photos=await listPhotos();if(!document.body.contains(target))return;
    target.innerHTML=photos.length?photos.map(photo=>{const url=URL.createObjectURL(photo.blob);photoUrls.push(url);return `<article class="personal-photo-card"><img src="${url}" alt="${escapeHtml(photo.label)}"><strong>${escapeHtml(photo.label)}</strong><div class="photo-actions"><button class="compact-button" type="button" data-mobile-photo-speak="${escapeHtml(photo.label)}">🔊</button><button class="compact-button" type="button" data-mobile-photo-delete="${photo.id}">🗑️</button></div></article>`;}).join(""):"<p class='muted'>No personal photo cards yet.</p>";
  }

  async function refreshCoverage() {
    const list=await BB.voiceLibrary.list();const keys=new Set(list.map(item=>item.key));
    const covered=commonVoicePhrases.filter(phrase=>keys.has(BB.voiceLibrary.normalize(phrase)));
    const meter=document.querySelector("#coverage-value");const label=document.querySelector("#coverage-label");const target=document.querySelector("#coverage-list");
    if(meter)meter.style.width=`${covered.length/commonVoicePhrases.length*100}%`;
    if(label)label.textContent=`${covered.length} of ${commonVoicePhrases.length} essential phrases have a family voice.`;
    if(target)target.innerHTML=commonVoicePhrases.map(phrase=>`<div class="coverage-item"><span>${keys.has(BB.voiceLibrary.normalize(phrase))?"✅":"○"}</span><strong>${escapeHtml(phrase)}</strong><span>${keys.has(BB.voiceLibrary.normalize(phrase))?"Ready":"Record"}</span></div>`).join("");
    const missing=document.querySelector("#insight-missing-voices");
    if(missing){const used=Object.entries(BB.store.data.wordUse||{}).sort((a,b)=>b[1]-a[1]).map(([word])=>word);const suggestions=[...new Set([...used,...commonVoicePhrases])].filter(word=>!keys.has(BB.voiceLibrary.normalize(word))).slice(0,7);missing.innerHTML=suggestions.map(word=>`<div class="coverage-item"><span>🎙️</span><strong>${escapeHtml(word)}</strong><span>Missing</span></div>`).join("")||"<p>Frequently used words already have family recordings.</p>";}
  }

  function afterRender() {
    if(section==="photos")refreshPhotos();
    if(section==="voice"||section==="insights")refreshCoverage();
  }

  function saveAndRender() {
    BB.store.save();
    document.querySelector("#view").innerHTML=render();
    afterRender();
  }

  function moveStep(id,direction) {
    const steps=mobileState().schedule;const index=steps.findIndex(step=>step.id===id);const next=index+direction;
    if(index<0||next<0||next>=steps.length)return;[steps[index],steps[next]]=[steps[next],steps[index]];saveAndRender();
  }

  function addChoice() {
    const input=document.querySelector("[data-choice-text]");const value=input?.value.trim();if(!value)return;
    if(mobileState().choices.length>=3){BB.app.toast("Choice Mode uses up to three choices.");return;}mobileState().choices.push(value);saveAndRender();
  }

  function launchChoices() {
    const choices=mobileState().choices;if(choices.length<2)return;
    BB.app.modal(`<div class="modal-head"><h2>What do you choose?</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><div class="choice-launch">${choices.map(choice=>`<button type="button" data-mobile-chosen="${escapeHtml(choice)}">☝️<br>${escapeHtml(choice)}</button>`).join("")}</div>`,"Choice mode");
  }

  async function addPhoto() {
    const label=document.querySelector("[data-photo-label]")?.value.trim();const file=document.querySelector("[data-photo-file]")?.files[0];
    if(!label||!file){BB.app.toast("Add a card name and choose a photo.");return;}if(!file.type.startsWith("image/")||file.size>8*1024*1024){BB.app.toast("Use an image smaller than 8 MB.");return;}
    await savePhoto(label,file);BB.app.toast("Personal photo card added.");refreshPhotos();
  }

  function blobToDataUrl(blob) { return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);}); }

  async function exportPhotos() {
    return Promise.all((await listPhotos()).map(async photo=>({id:photo.id,label:photo.label,createdAt:photo.createdAt,dataUrl:await blobToDataUrl(photo.blob)})));
  }

  async function importPhotos(records=[]) {
    await clearPhotos();
    for(const record of records){if(!record.dataUrl)continue;const blob=await fetch(record.dataUrl).then(response=>response.blob());await photoStore("readwrite",store=>store.put({id:record.id||`photo-${Date.now()}`,label:record.label,createdAt:record.createdAt,blob}));}
  }

  function requireParentPin() {
    return prompt("Enter the parent PIN to continue:")===BB.store.data.settings.parentPin;
  }

  async function exportBackup() {
    if(!requireParentPin()){BB.app.toast("That PIN did not match.");return;}
    BB.app.toast("Preparing the private backup…");
    const backup={format:"BrightBridge Complete Backup",version:1,createdAt:new Date().toISOString(),state:BB.store.data,voices:await BB.voiceLibrary.exportAll(),photos:await exportPhotos()};
    const blob=new Blob([JSON.stringify(backup)],{type:"application/json"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download=`brightbridge-complete-${new Date().toISOString().slice(0,10)}.brightbridge.json`;link.click();URL.revokeObjectURL(link.href);
  }

  async function restoreBackup(file) {
    if(!requireParentPin()){BB.app.toast("That PIN did not match.");return;}
    try {
      const backup=JSON.parse(await file.text());if(backup.format!=="BrightBridge Complete Backup")throw new Error("Invalid backup");
      BB.store.reset();Object.keys(BB.store.data).forEach(key=>delete BB.store.data[key]);Object.assign(BB.store.data,backup.state);BB.store.save();
      await BB.voiceLibrary.clear();await BB.voiceLibrary.importAll(backup.voices);await importPhotos(backup.photos);location.reload();
    } catch { BB.app.toast("That backup file could not be restored."); }
  }

  function startGuided() {
    if(!requireParentPin()){BB.app.toast("That PIN did not match.");return;}
    const route=document.querySelector("[data-guided-route]").value;mobileState().guided=true;mobileState().guidedRoute=route;BB.store.save();document.body.classList.add("mobile-guided");document.querySelector("#guided-exit").hidden=false;BB.navigation.go(route);
  }

  function exitGuided() {
    if(!requireParentPin()){BB.app.toast("That PIN did not match.");return;}
    mobileState().guided=false;BB.store.save();document.body.classList.remove("mobile-guided");document.querySelector("#guided-exit").hidden=true;BB.navigation.go("home");
  }

  function showBreak() {
    BB.app.modal(`<div class="modal-head"><h2>I need a break</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><p>Choose what feels helpful right now.</p><div class="button-grid"><button class="big-tile" type="button" data-mobile-break-choice="breathe"><span class="tile-icon">☁️</span>Breathe</button><button class="big-tile" type="button" data-mobile-break-choice="sensory"><span class="tile-icon">🫧</span>Quiet play</button><button class="big-tile" type="button" data-mobile-break-choice="say"><span class="tile-icon">💬</span>Say “I need a break”</button></div>`,"Break choices");
  }

  function promptLevel() { return isMobile()?mobileState().promptLevel:"full"; }
  function encouragement(message,mood) { if(!isMobile())return message;if(mood==="🥳")return "Great job!";if(mood==="🙂")return "Try again";return message; }
  function restoreGuided() { if(isMobile()&&mobileState().guided){document.body.classList.add("mobile-guided");document.querySelector("#guided-exit").hidden=false;return mobileState().guidedRoute;}return null; }

  document.addEventListener("click",event=>{
    const tab=event.target.closest("[data-mobile-section]");if(tab){section=tab.dataset.mobileSection;saveAndRender();return;}
    const done=event.target.closest("[data-mobile-step-done]");if(done){const step=mobileState().schedule.find(item=>item.id===done.dataset.mobileStepDone);if(step){step.done=!step.done;BB.audio.pop();BB.speech.speak(step.text);saveAndRender();}return;}
    const up=event.target.closest("[data-mobile-step-up]");if(up){moveStep(up.dataset.mobileStepUp,-1);return;}
    const down=event.target.closest("[data-mobile-step-down]");if(down){moveStep(down.dataset.mobileStepDown,1);return;}
    const remove=event.target.closest("[data-mobile-step-delete]");if(remove){mobileState().schedule=mobileState().schedule.filter(step=>step.id!==remove.dataset.mobileStepDelete);saveAndRender();return;}
    const choiceDelete=event.target.closest("[data-mobile-choice-delete]");if(choiceDelete){mobileState().choices.splice(Number(choiceDelete.dataset.mobileChoiceDelete),1);saveAndRender();return;}
    const chosen=event.target.closest("[data-mobile-chosen]");if(chosen){const value=chosen.dataset.mobileChosen;BB.speech.speak(value);BB.app.pip(`You chose ${value}.`,"😊",false);BB.app.closeModal();return;}
    const speak=event.target.closest("[data-mobile-speak]");if(speak&&speak.dataset.mobileSpeak){BB.speech.speak(speak.dataset.mobileSpeak);return;}
    const photoSpeak=event.target.closest("[data-mobile-photo-speak]");if(photoSpeak){BB.speech.speak(photoSpeak.dataset.mobilePhotoSpeak);return;}
    const photoDelete=event.target.closest("[data-mobile-photo-delete]");if(photoDelete){if(confirm("Remove this personal photo card?"))deletePhoto(photoDelete.dataset.mobilePhotoDelete).then(refreshPhotos);return;}
    const level=event.target.closest("[data-prompt-level]");if(level){mobileState().promptLevel=level.dataset.promptLevel;saveAndRender();return;}
    if(event.target.closest("[data-mobile-break]")){showBreak();return;}
    if(event.target.closest("[data-guided-exit]")){exitGuided();return;}
    const breakChoice=event.target.closest("[data-mobile-break-choice]");if(breakChoice){const value=breakChoice.dataset.mobileBreakChoice;BB.app.closeModal();if(value==="sensory")BB.navigation.go("sensory");if(value==="say")BB.speech.speak("I need a break");if(value==="breathe")BB.app.modal('<div class="breathing"><h2>Breathe with the cloud</h2><p>In as it grows • Out as it gets smaller</p><div class="breathing-orb">☁️</div><button class="primary-button" type="button" data-action="close-modal">I’m ready</button></div>',"Breathing break");return;}
    const action=event.target.closest("[data-mobile-action]");if(!action)return;
    switch(action.dataset.mobileAction){
      case "add-step":{const text=document.querySelector("[data-schedule-text]").value.trim();if(!text)return;mobileState().schedule.push({id:`step-${Date.now()}`,icon:document.querySelector("[data-schedule-icon]").value,text,done:false});saveAndRender();break;}
      case "add-choice":addChoice();break;
      case "launch-choices":launchChoices();break;
      case "add-photo":addPhoto();break;
      case "start-guided":startGuided();break;
      case "export-backup":exportBackup();break;
    }
  });

  document.addEventListener("input",event=>{
    if(event.target.matches("[data-first-value]")){mobileState().firstThen.first=event.target.value;document.querySelector("[data-first-preview]").textContent=event.target.value||"Choose the first step";document.querySelectorAll("[data-mobile-speak]")[0].dataset.mobileSpeak=event.target.value;BB.store.save();}
    if(event.target.matches("[data-then-value]")){mobileState().firstThen.then=event.target.value;document.querySelector("[data-then-preview]").textContent=event.target.value||"Choose what comes next";document.querySelectorAll("[data-mobile-speak]")[1].dataset.mobileSpeak=event.target.value;BB.store.save();}
  });

  document.addEventListener("change",event=>{if(event.target.matches("[data-backup-file]")&&event.target.files[0])restoreBackup(event.target.files[0]);});

  window.BB=window.BB||{};
  BB.mobileTools={render,afterRender,promptLevel,encouragement,restoreGuided};
})();
