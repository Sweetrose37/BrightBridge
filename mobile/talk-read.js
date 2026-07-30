(function () {
  "use strict";

  const D=()=>window.BB_TALK_READ_DATA;
  const S=()=>BB.talkReadStorage;
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  let selectedLevel="";
  let promptIndex=0;
  let selectedBookId="";
  let pageIndex=0;
  let readingMode="read-to-me";
  let libraryAge="all";
  let libraryCategory="all";
  let customBooks=[];
  let savedAttempts=[];
  let parentNarrations=[];
  let parentBookId="";
  let parentPageIndex=0;
  let parentLessonId="first-words";
  let parentPromptIndex=0;
  let recorder=null;
  let stream=null;
  let chunks=[];
  let recordingStartedAt=0;
  let recording=false;
  let attemptContext=null;
  let draftBook={title:"",category:"Communication Practice",ageGroup:"3-5",pages:[],profileIds:["*"]};
  let initialized=false;
  let playbackPaused=false;

  function activeProfile(){return BB.store.data.profiles.find(item=>item.id===BB.store.data.activeProfile)||BB.store.data.profiles[0];}
  function settings(profileId=activeProfile().id){return S().profile(profileId);}
  function pageHead(title,description,back){return BB.navigation.pageHead(title,description,back);}
  function rerender(route=BB.navigation.current){BB.app.render(route);}
  function allBooks(){return [...D().books,...customBooks].filter((book,index,list)=>list.findIndex(item=>item.id===book.id)===index);}
  function bookById(id){return allBooks().find(book=>book.id===id);}
  function levelById(id){return D().levels.find(level=>level.id===id);}
  function lessonAudioId(level,prompt){return S().lessonAudioId(level.id,prompt.id);}
  function bookAudioId(book,page,part="page"){return S().bookAudioId(book.id,page.id,part);}
  function isRecordingAllowed(){
    const config=settings();
    return config.childRecording&&config.recordingProfiles.includes(activeProfile().id);
  }
  function parentUnlocked(){return BB.app.isParentUnlocked();}
  function validateData(){
    const report=D().validate();
    if(report.duplicateLessonIds.length||report.duplicateBookIds.length||report.duplicatePageChoices.length)throw new Error("Duplicate Learn to Talk or book content was blocked.");
  }

  async function init(){
    if(initialized)return;
    validateData();
    BB.store.data.profiles.forEach(profile=>settings(profile.id));
    try{customBooks=await S().customBooks(activeProfile().id);}catch{customBooks=[];}
    initialized=true;
    window.dispatchEvent(new CustomEvent("bb:talk-read-ready"));
    setInterval(()=>{
      if(!document.hidden&&BB.navigation?.current==="readingLibrary"&&selectedBookId){
        BB.dailyReports?.recordReading(activeProfile().id,{readingSeconds:30});
      }
    },30000);
  }

  async function refreshProfile(){
    S().clearTemporaryAttempt();
    selectedLevel="";selectedBookId="";promptIndex=0;pageIndex=0;
    try{customBooks=await S().customBooks(activeProfile().id);}catch{customBooks=[];}
    try{savedAttempts=await S().attempts(activeProfile().id);}catch{savedAttempts=[];}
  }

  function renderHub(){
    return `<section>${pageHead("Learn to Talk & Read","Listen, communicate, practice, or simply explore.","home")}
      <div class="mobile-talk-read-choices">
        <button type="button" data-tr-route="talkPractice"><span>🗣️</span><strong>Let’s Practice Talking</strong><small>Sounds, words, phrases, and communication</small></button>
        <button type="button" data-tr-route="readingLibrary"><span>📚</span><strong>My Reading Library</strong><small>Original interactive stories for every level</small></button>
      </div>
      <div class="mobile-panel mobile-supportive-note"><strong>Every way of communicating counts.</strong><p>Speaking is never required. You can listen, tap, point, use a picture, use a communication card, skip, or try again later.</p></div>
    </section>`;
  }

  function renderPractice(){
    const config=settings();
    if(selectedLevel){
      const level=levelById(selectedLevel),prompt=level?.prompts[promptIndex];
      if(level&&prompt)return renderPrompt(level,prompt);
      selectedLevel="";promptIndex=0;
    }
    const levels=D().levels.filter(level=>config.enabledLevels.includes(level.id));
    return `<section>${pageHead("Let’s Practice Talking","Choose a comfortable place to begin.","talkRead")}
      <div class="mobile-panel"><strong>Starting place: ${esc(levelById(config.learningLevel)?.title||"Parent selected")}</strong><p class="muted">A parent can change this starting level. Nothing here requires speaking.</p></div>
      <div class="mobile-talk-levels">${levels.map(level=>`<button type="button" data-tr-level="${esc(level.id)}"><span>${level.icon}</span><div><strong>${esc(level.title)}</strong><small>${esc(level.description)}</small></div><b>›</b></button>`).join("")}</div>
    </section>`;
  }

  function promptControls(context){
    const canRecord=isRecordingAllowed();
    const temp=S().getTemporaryAttempt();
    return `<div class="mobile-repeat-controls">
      <button class="mobile-button" type="button" data-tr-listen="${esc(context)}">▶ Listen</button>
      <button class="mobile-button secondary" type="button" data-tr-my-turn="${esc(context)}">${recording?"⏹ Stop":"🎤 My Turn"}</button>
      ${temp?`<button class="mobile-button secondary" type="button" data-tr-play-attempt>▶ Hear My Turn</button>${settings().recordingMode==="saved"?'<button class="mobile-button secondary" type="button" data-tr-save-attempt>💾 Save This Turn</button>':""}`:""}
      <button class="mobile-button secondary" type="button" data-tr-picture>🖼️ Use the Picture</button>
      <button class="mobile-button secondary" type="button" data-tr-skip>Skip</button>
      <button class="mobile-button" type="button" data-tr-continue>Continue</button>
    </div>
    <div class="mobile-recording-indicator ${recording?"is-recording":""}" role="status">${recording?"● Recording your turn… Tap Stop when ready.":canRecord?"Recording begins only when My Turn is tapped.":"You can take a turn without recording."}</div>`;
  }

  function renderPrompt(level,prompt){
    const total=level.prompts.length;
    return `<section>${pageHead(level.title,`${promptIndex+1} of ${total}`,"talkPractice")}
      <div class="mobile-practice-card">
        <div class="mobile-practice-picture" role="img" aria-label="${esc(prompt.label)}">${prompt.icon}</div>
        <small>Listen, tap, gesture, or take a turn</small>
        <h1>${esc(prompt.label)}</h1>
        <p>${esc(prompt.text)}</p>
        ${promptControls("lesson")}
      </div>
      <div class="mobile-gentle-message">Great listening. You can try this in any way that works for you.</div>
    </section>`;
  }

  function filteredBooks(){
    const config=settings();
    return allBooks().filter(book=>book.enabled!==false)
      .filter(book=>libraryAge==="all"||book.ageGroup===libraryAge)
      .filter(book=>libraryCategory==="all"||book.category===libraryCategory)
      .filter(book=>config.enabledBookCategories.includes(book.category)||book.custom);
  }

  function renderLibrary(){
    const book=bookById(selectedBookId);
    if(book)return renderBook(book);
    const config=settings(),favorites=new Set(config.progress.favoriteBooks);
    return `<section>${pageHead("My Reading Library","Choose any book. Age groups are recommendations, not locks.","talkRead")}
      <div class="mobile-library-filters"><label><span>Age recommendation</span><select data-tr-library-age><option value="all">All ages</option>${D().ageGroups.map(item=>`<option value="${item.id}" ${libraryAge===item.id?"selected":""}>${esc(item.label)}</option>`).join("")}</select></label><label><span>Category</span><select data-tr-library-category><option value="all">All categories</option>${D().bookCategories.map(item=>`<option ${libraryCategory===item?"selected":""}>${esc(item)}</option>`).join("")}</select></label></div>
      <div class="mobile-book-grid">${filteredBooks().map(book=>`<article class="mobile-book-card"><button class="mobile-book-cover" type="button" data-tr-book="${esc(book.id)}" aria-label="Open ${esc(book.title)}"><span>${book.cover||"📖"}</span></button><div><small>${esc(D().ageGroups.find(item=>item.id===book.ageGroup)?.label||book.ageGroup)} · ${esc(book.category)}</small><h2>${esc(book.title)}</h2><p>${esc(book.description)}</p><button class="compact-button" type="button" data-tr-favorite="${esc(book.id)}" aria-label="${favorites.has(book.id)?"Remove favorite":"Add favorite"}">${favorites.has(book.id)?"⭐":"☆"}</button></div></article>`).join("")||'<div class="mobile-panel"><h2>No books match</h2><p>Choose another age recommendation or category.</p></div>'}</div>
    </section>`;
  }

  function renderBook(book){
    const page=book.pages[pageIndex]||book.pages[0];
    const modes=[["read-to-me","🔊","Read to Me"],["read-with-me","👥","Read With Me"],["repeat","🎤","Repeat After Me"],["look-listen","👀","Look & Listen"],["parent-voice","💜","Parent Voice"],["independent","📖","Independent Reading"]];
    const sharedChoices=(page.choices||[]).map(choice=>({choice,shared:D().sharedCard(choice)}));
    return `<section>${pageHead(book.title,`${pageIndex+1} of ${book.pages.length}`,"readingLibrary")}
      <div class="mobile-reading-modes" role="group" aria-label="Reading mode">${modes.map(([id,icon,label])=>`<button class="${readingMode===id?"active":""}" type="button" data-tr-mode="${id}">${icon} ${label}</button>`).join("")}</div>
      <article class="mobile-book-page">
        <div class="mobile-page-image" role="img" aria-label="Story picture">${page.imageData?`<img src="${page.imageData}" alt="">`:page.image||"📖"}</div>
        <p class="${["read-to-me","read-with-me","parent-voice"].includes(readingMode)?"is-highlighted":""}">${esc(page.text)}</p>
        ${readingMode==="repeat"&&page.repeat?`<div class="mobile-repeat-prompt"><small>Repeat After Me—or tap Continue</small><h2>${esc(page.repeat)}</h2>${promptControls("book-repeat")}</div>`:""}
        ${page.question?`<div class="mobile-book-question"><h3>${esc(page.question)}</h3><div>${sharedChoices.map(({choice,shared})=>`<button type="button" data-tr-choice="${esc(choice)}" ${shared?`data-tr-card-id="${esc(shared.cardId)}" data-tr-card-category="${esc(shared.category)}"`:""}>${esc(choice)}</button>`).join("")}</div><small>You can speak, point, gesture, or tap a choice.</small></div>`:""}
      </article>
      <div class="mobile-book-controls"><button type="button" data-tr-page="-1" ${pageIndex===0?"disabled":""}>← Previous</button><button type="button" data-tr-page-listen>▶ ${readingMode==="parent-voice"?"Parent Voice":"Listen"}</button><button type="button" data-tr-pause>${playbackPaused?"▶ Resume":"⏸ Pause"}</button><button type="button" data-tr-page="1">${pageIndex===book.pages.length-1?"Finish":"Next →"}</button></div>
      ${readingMode==="parent-voice"?`<div class="mobile-button-row mobile-book-special-audio"><button class="mobile-button secondary" type="button" data-tr-book-audio="welcome">Welcome</button><button class="mobile-button secondary" type="button" data-tr-book-audio="full">Play Full Parent Book</button><button class="mobile-button secondary" type="button" data-tr-book-audio="ending">Ending</button></div>`:""}
    </section>`;
  }

  function renderParent(){
    if(!parentUnlocked())return `<section>${pageHead("Learn to Talk & Read Settings","Parent access is required.","parent")}<div class="mobile-panel"><p>Return to the Parent Dashboard and enter the parent PIN.</p></div></section>`;
    const config=settings(),profile=activeProfile(),books=allBooks(),selectedParentBook=bookById(parentBookId)||books[0],page=selectedParentBook?.pages[parentPageIndex]||selectedParentBook?.pages[0],parentLesson=levelById(parentLessonId)||D().levels[0],parentPrompt=parentLesson.prompts[parentPromptIndex]||parentLesson.prompts[0];
    parentBookId||=selectedParentBook?.id||"";
    const attempts=savedAttempts.filter(item=>item.profileId===profile.id);
    return `<section>${pageHead("Learn to Talk & Read Settings",`Private controls for ${esc(profile.name)}.`,"parent")}
      <div class="mobile-panel mobile-professional-note">This feature supports communication practice and is not a replacement for professional speech or language services.</div>
      <div class="mobile-setting-group mobile-talk-settings"><h3>Recommendations and content</h3>
        <label class="mobile-setting-row"><span><strong>Recommended age group</strong><small>Books from every group remain available</small></span><select data-tr-setting="ageGroup">${D().ageGroups.map(item=>`<option value="${item.id}" ${config.ageGroup===item.id?"selected":""}>${esc(item.label)}</option>`).join("")}</select></label>
        <label class="mobile-setting-row"><span><strong>Starting learning level</strong><small>Chosen by the parent, not automatically by age</small></span><select data-tr-setting="learningLevel">${D().levels.map(item=>`<option value="${item.id}" ${config.learningLevel===item.id?"selected":""}>${esc(item.title)}</option>`).join("")}</select></label>
        <label class="mobile-setting-row"><span><strong>Daily participation goal</strong><small>Encouragement only; never blocks content</small></span><select data-tr-setting="dailyGoal">${[1,2,3,5,8,10].map(value=>`<option value="${value}" ${Number(config.dailyGoal)===value?"selected":""}>${value} activities</option>`).join("")}</select></label>
        <details><summary>Enabled lesson levels</summary><div class="mobile-parent-check-grid">${D().levels.map(level=>`<label><input type="checkbox" data-tr-level-enabled="${level.id}" ${config.enabledLevels.includes(level.id)?"checked":""}> ${level.icon} ${esc(level.title)}</label>`).join("")}</div></details>
        <details><summary>Enabled book categories</summary><div class="mobile-parent-check-grid">${D().bookCategories.map(category=>`<label><input type="checkbox" data-tr-category-enabled="${esc(category)}" ${config.enabledBookCategories.includes(category)?"checked":""}> ${esc(category)}</label>`).join("")}</div></details>
      </div>
      <div class="mobile-setting-group mobile-talk-settings"><h3>Audio and Repeat After Me</h3>
        ${toggleSetting("parentVoicePreference","Prefer assigned parent voices",config.parentVoicePreference)}
        ${toggleSetting("repeatPrompts","Show Repeat After Me prompts",config.repeatPrompts)}
        ${toggleSetting("backgroundMusic","Optional quiet background music",config.backgroundMusic)}
        ${toggleSetting("autoPageTurning","Auto page turning",config.autoPageTurning)}
        <label class="mobile-setting-row"><span><strong>Narration speed</strong></span><input type="range" min=".6" max="1.25" step=".05" value="${config.narrationRate}" data-tr-setting="narrationRate"></label>
      </div>
      <div class="mobile-setting-group mobile-talk-settings"><h3>Child practice recording</h3>
        ${toggleSetting("childRecording","Allow Child Practice Recording",config.childRecording)}
        <label class="mobile-setting-row"><span><strong>After playback</strong></span><select data-tr-setting="recordingMode"><option value="temporary" ${config.recordingMode==="temporary"?"selected":""}>Automatically delete temporary attempts</option><option value="saved" ${config.recordingMode==="saved"?"selected":""}>Allow parent-selected saved attempts</option></select></label>
        <fieldset class="mobile-child-assignment"><legend>Profiles allowed to record</legend>${BB.store.data.profiles.map(item=>`<label><input type="checkbox" data-tr-record-profile="${esc(item.id)}" ${config.recordingProfiles.includes(item.id)?"checked":""}><span>${item.avatar||"🌟"} ${esc(item.name)}</span></label>`).join("")}</fieldset>
        <button class="mobile-button danger" type="button" data-tr-delete-attempts>Delete all saved practice recordings for ${esc(profile.name)}</button>
        <div class="mobile-saved-attempts">${attempts.map(item=>`<article><strong>${esc(item.promptText||"Practice turn")}</strong><small>${new Date(item.createdAt).toLocaleString()}</small><button type="button" data-tr-attempt-play="${item.id}">▶</button><button type="button" data-tr-attempt-delete="${item.id}">Delete</button></article>`).join("")||"<p>No saved child practice recordings.</p>"}</div>
      </div>
      <div class="mobile-setting-group mobile-talk-settings"><h3>Parent lesson and book narration</h3>
        <label class="mobile-setting-row"><span><strong>Choose talking lesson</strong></span><select data-tr-parent-lesson>${D().levels.map(item=>`<option value="${item.id}" ${item.id===parentLesson.id?"selected":""}>${esc(item.title)}</option>`).join("")}</select></label>
        <div class="mobile-parent-narration"><p><strong>Prompt ${parentPromptIndex+1} of ${parentLesson.prompts.length}</strong></p><p>${esc(parentPrompt.text)}</p><div class="mobile-button-row"><button class="mobile-button secondary" type="button" data-tr-parent-prompt="-1" ${parentPromptIndex===0?"disabled":""}>Previous</button><button class="mobile-button" type="button" data-tr-parent-model="${esc(lessonAudioId(parentLesson,parentPrompt))}" data-tr-parent-text="${esc(parentPrompt.text)}">Record or Upload Model</button><button class="mobile-button secondary" type="button" data-tr-parent-prompt="1" ${parentPromptIndex===parentLesson.prompts.length-1?"disabled":""}>Next</button></div></div>
        <label class="mobile-setting-row"><span><strong>Choose book</strong></span><select data-tr-parent-book>${books.map(item=>`<option value="${item.id}" ${item.id===parentBookId?"selected":""}>${esc(item.title)}</option>`).join("")}</select></label>
        ${selectedParentBook&&page?`<div class="mobile-parent-narration"><p><strong>Page ${parentPageIndex+1} of ${selectedParentBook.pages.length}</strong></p><p>${esc(page.text)}</p><div class="mobile-button-row"><button class="mobile-button secondary" type="button" data-tr-parent-page="-1" ${parentPageIndex===0?"disabled":""}>Previous</button><button class="mobile-button" type="button" data-tr-parent-narrate="${esc(bookAudioId(selectedParentBook,page))}" data-tr-parent-text="${esc(page.text)}">Record or Upload Page</button><button class="mobile-button secondary" type="button" data-tr-parent-page="1" ${parentPageIndex===selectedParentBook.pages.length-1?"disabled":""}>Next</button></div><div class="mobile-button-row"><button class="mobile-button secondary" type="button" data-tr-parent-narrate="${esc(bookAudioId(selectedParentBook,{id:"welcome"},"welcome"))}" data-tr-parent-text="${esc(`Welcome to ${selectedParentBook.title}.`)}">Custom Welcome</button><button class="mobile-button secondary" type="button" data-tr-parent-narrate="${esc(bookAudioId(selectedParentBook,{id:"ending"},"ending"))}" data-tr-parent-text="${esc("You did a wonderful job listening and reading with me.")}">Custom Ending</button><button class="mobile-button secondary" type="button" data-tr-parent-narrate="${esc(bookAudioId(selectedParentBook,{id:"full"},"full"))}" data-tr-parent-text="${esc(selectedParentBook.pages.map(item=>item.text).join(" "))}">Record Full Book</button></div><p data-tr-narration-progress>Checking saved page narration…</p></div>`:""}
      </div>
      ${renderCustomBookBuilder()}
    </section>`;
  }

  function toggleSetting(key,label,on){
    return `<div class="mobile-setting-row"><span><strong>${esc(label)}</strong></span><button class="mobile-switch ${on?"on":""}" type="button" role="switch" aria-checked="${on}" data-tr-toggle="${key}"><i></i></button></div>`;
  }

  function renderCustomBookBuilder(){
    return `<div class="mobile-setting-group mobile-talk-settings"><h3>Private custom books</h3>
      <label class="mobile-setting-row"><span><strong>Book title</strong></span><input data-tr-draft="title" maxlength="80" value="${esc(draftBook.title)}"></label>
      <label class="mobile-setting-row"><span><strong>Category</strong></span><select data-tr-draft="category">${D().bookCategories.map(item=>`<option ${draftBook.category===item?"selected":""}>${esc(item)}</option>`).join("")}</select></label>
      <label class="mobile-setting-row"><span><strong>Age or learning group</strong></span><select data-tr-draft="ageGroup">${D().ageGroups.map(item=>`<option value="${item.id}" ${draftBook.ageGroup===item.id?"selected":""}>${esc(item.label)}</option>`).join("")}</select></label>
      <fieldset class="mobile-child-assignment"><legend>Assign this book to</legend><label><input type="checkbox" data-tr-book-all ${draftBook.profileIds.includes("*")?"checked":""}><span>All child profiles</span></label>${BB.store.data.profiles.map(item=>`<label><input type="checkbox" data-tr-book-profile="${esc(item.id)}" ${!draftBook.profileIds.includes("*")&&draftBook.profileIds.includes(item.id)?"checked":""}><span>${item.avatar||"🌟"} ${esc(item.name)}</span></label>`).join("")}</fieldset>
      <div class="mobile-panel"><h3>Add a page</h3><label class="mobile-tool-label"><span>Page text</span><textarea data-tr-page-text maxlength="700"></textarea></label><label class="mobile-tool-label"><span>Repeat After Me phrase</span><input data-tr-page-repeat maxlength="180"></label><label class="mobile-tool-label"><span>Question</span><input data-tr-page-question maxlength="180"></label><label class="mobile-tool-label"><span>Communication choices</span><input data-tr-page-choices maxlength="250" placeholder="I need help, All done"></label><label class="mobile-tool-label"><span>Optional original family image</span><input type="file" accept="image/*" data-tr-page-image></label><button class="mobile-button secondary" type="button" data-tr-add-page>Add page</button></div>
      <div class="mobile-custom-pages">${draftBook.pages.map((page,index)=>`<article><span>${page.imageData?`<img src="${page.imageData}" alt="">`:"📄"}</span><div><strong>Page ${index+1}</strong><p>${esc(page.text)}</p></div><button type="button" data-tr-move-page="${index}" data-direction="-1" ${index===0?"disabled":""}>↑</button><button type="button" data-tr-move-page="${index}" data-direction="1" ${index===draftBook.pages.length-1?"disabled":""}>↓</button><button type="button" data-tr-remove-page="${index}">×</button></article>`).join("")||"<p>Add at least one page.</p>"}</div>
      <div class="mobile-button-row"><button class="mobile-button" type="button" data-tr-save-book>Save Private Book</button><button class="mobile-button secondary" type="button" data-tr-clear-draft>Clear</button></div>
      <div class="mobile-custom-book-list">${customBooks.map(book=>`<article><strong>${esc(book.title)}</strong><small>${book.pages.length} pages · ${esc(book.category)}</small><button type="button" data-tr-edit-book="${book.id}">Edit</button><button type="button" data-tr-delete-book="${book.id}">Delete</button></article>`).join("")||"<p>No custom books yet.</p>"}</div>
    </div>`;
  }

  async function speak(text,category,cardId,dailyContext={}){
    BB.app.stopTeachingAudio();
    playbackPaused=false;
    const source=await BB.app.speakTeaching(text,category,cardId,"",{rate:settings().narrationRate});
    if(dailyContext.lesson)BB.dailyReports?.recordTalk(activeProfile().id,{listened:1,parentVoicePrompts:source==="parent"?1:0,...dailyContext});
    if(dailyContext.book)BB.dailyReports?.recordReading(activeProfile().id,{narrationPlayed:1,parentNarratedPages:source==="parent"?1:0,...dailyContext});
    return source;
  }

  function currentContext(){
    if(selectedBookId){
      const book=bookById(selectedBookId),page=book?.pages[pageIndex];
      return book&&page?{type:"book",book,page,text:readingMode==="repeat"&&page.repeat?page.repeat:page.text}:null;
    }
    const level=levelById(selectedLevel),prompt=level?.prompts[promptIndex];
    return level&&prompt?{type:"lesson",level,prompt,text:prompt.text}:null;
  }

  async function listenCurrent(){
    const context=currentContext();if(!context)return;
    if(context.type==="lesson"){
      S().markLesson(activeProfile().id,context.level.id,"listened",context.prompt.id);
      await speak(context.text,"Learn to Talk",lessonAudioId(context.level,context.prompt),{lesson:context.level.id,kind:context.level.kind,prompt:context.prompt.label});
      BB.app.pip("Great listening!","😊");
    }else{
      S().markBook(activeProfile().id,context.book.id,"listened",context.page.id);
      const text=readingMode==="repeat"&&context.page.repeat?context.page.repeat:context.page.text;
      await speak(text,"Book Narration",bookAudioId(context.book,context.page,readingMode==="repeat"?"repeat":"page"),{book:context.book.id,bookTitle:context.book.title,mode:readingMode,page:context.page.id});
    }
  }

  async function startOrStopAttempt(){
    const context=currentContext();if(!context)return;
    if(recording){stopAttempt();return;}
    if(context.type==="lesson"){
      S().markLesson(activeProfile().id,context.level.id,"turns",context.prompt.id);
      BB.dailyReports?.recordTalk(activeProfile().id,{repeatTurns:1,lesson:context.level.id,kind:context.level.kind,prompt:context.prompt.label});
    }else{
      S().markBook(activeProfile().id,context.book.id,"repeatTurns",context.page.id);
      BB.dailyReports?.recordReading(activeProfile().id,{repeatTurns:1,book:context.book.id,bookTitle:context.book.title,page:context.page.id});
    }
    if(!isRecordingAllowed()){BB.app.pip("You took your turn. You can tap the answer too.","😊");return;}
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){BB.app.toast("Microphone access is needed only when you choose to record. Recording is not supported here.");return;}
    try{
      BB.app.stopTeachingAudio();
      stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const preferred=["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type=>MediaRecorder.isTypeSupported(type));
      recorder=preferred?new MediaRecorder(stream,{mimeType:preferred}):new MediaRecorder(stream);
      chunks=[];recordingStartedAt=Date.now();recording=true;
      attemptContext=context;
      recorder.addEventListener("dataavailable",event=>{if(event.data.size)chunks.push(event.data);});
      recorder.addEventListener("stop",finishAttempt,{once:true});
      recorder.start();rerender();
    }catch{recording=false;stream?.getTracks().forEach(track=>track.stop());stream=null;BB.app.toast("Microphone access is needed only when you choose to record.");}
  }

  function stopAttempt(){if(recorder?.state==="recording")recorder.stop();}
  function finishAttempt(){
    const blob=new Blob(chunks,{type:recorder?.mimeType||"audio/webm"}),duration=Math.max(0,(Date.now()-recordingStartedAt)/1000);
    stream?.getTracks().forEach(track=>track.stop());stream=null;recording=false;
    if(blob.size){
      const context=attemptContext;
      S().setTemporaryAttempt({
        blob,url:URL.createObjectURL(blob),profileId:activeProfile().id,
        lessonId:context?.type==="lesson"?context.level.id:"",
        bookId:context?.type==="book"?context.book.id:"",
        activityId:context?.type==="lesson"?context.prompt.id:context?.page.id,
        promptText:context?.text||"",duration,createdAt:new Date().toISOString()
      });
      if(context?.type==="lesson")BB.dailyReports?.recordTalk(activeProfile().id,{usedRecorder:1});
      else BB.dailyReports?.recordReading(activeProfile().id,{usedRecorder:1});
      BB.app.pip("You took your turn. Nice trying!","😊");
    }
    attemptContext=null;rerender();
  }

  function playAttempt(){
    const attempt=S().getTemporaryAttempt();if(!attempt)return;
    BB.app.stopTeachingAudio();
    const audio=new Audio(attempt.url);audio.volume=BB.store.data.settings.speechVolume;
    if(settings().recordingMode==="temporary")audio.addEventListener("ended",()=>{S().clearTemporaryAttempt();rerender();},{once:true});
    audio.play().catch(()=>BB.app.toast("The audio could not be played. You can still continue."));
  }
  async function saveAttempt(){
    const attempt=S().getTemporaryAttempt();if(!attempt)return;
    try{await S().saveAttempt(attempt);S().clearTemporaryAttempt();await loadParentCaches();rerender();BB.app.toast("The selected practice recording was saved privately.");}
    catch{BB.app.toast("This recording could not be saved. Your previous recording is still available.");}
  }

  function nextPrompt(skip=false){
    const context=currentContext();
    if(context?.type==="lesson"){
      if(skip){S().markLesson(activeProfile().id,context.level.id,"skipped",context.prompt.id);BB.dailyReports?.recordTalk(activeProfile().id,{skipped:1,lesson:context.level.id});}
      S().clearTemporaryAttempt();
      if(promptIndex<context.level.prompts.length-1)promptIndex++;else{selectedLevel="";promptIndex=0;BB.app.pip("You explored the whole practice set!","🥳");}
      rerender("talkPractice");
    }else if(context?.type==="book"){
      S().clearTemporaryAttempt();
      if(pageIndex<context.book.pages.length-1){pageIndex++;S().markBook(activeProfile().id,context.book.id,"pagesViewed",context.book.pages[pageIndex].id);BB.dailyReports?.recordReading(activeProfile().id,{pagesViewed:1,book:context.book.id,bookTitle:context.book.title,page:context.book.pages[pageIndex].id});}
      else completeBook(context.book);
      rerender("readingLibrary");
    }
  }
  function completeBook(book){
    S().markBook(activeProfile().id,book.id,"completed");
    BB.dailyReports?.recordReading(activeProfile().id,{booksCompleted:1,book:book.id,bookTitle:book.title});
    selectedBookId="";pageIndex=0;BB.rewards.earn(`Finished ${book.title}`);BB.app.pip("You finished the book in your own way!","🥳");
  }

  async function loadParentCaches(){
    try{savedAttempts=await S().attempts(activeProfile().id);}catch{savedAttempts=[];}
    try{customBooks=await S().customBooks(activeProfile().id);}catch{customBooks=[];}
    try{parentNarrations=await BB.app.listParentVoices?.("Book Narration")||[];}catch{parentNarrations=[];}
  }

  async function afterRender(route){
    if(route==="talkReadParent"&&parentUnlocked()){
      await loadParentCaches();
      const book=bookById(parentBookId),count=book?book.pages.filter(page=>parentNarrations.some(record=>record.cardId===bookAudioId(book,page))).length:0;
      const target=document.querySelector("[data-tr-narration-progress]");
      if(target&&book)target.textContent=`${count} of ${book.pages.length} pages recorded`;
    }
  }

  async function imageData(file){
    if(!file)return "";
    if(!file.type.startsWith("image/")||file.size>2*1024*1024)throw new Error("Choose an image smaller than 2 MB.");
    return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);});
  }

  async function handleClick(event){
    const routeButton=event.target.closest("[data-tr-route]");if(routeButton){BB.navigation.go(routeButton.dataset.trRoute);return true;}
    const levelButton=event.target.closest("[data-tr-level]");if(levelButton){selectedLevel=levelButton.dataset.trLevel;promptIndex=0;S().markLesson(activeProfile().id,selectedLevel,"opened");BB.dailyReports?.recordTalk(activeProfile().id,{lessonsOpened:1,lesson:selectedLevel});rerender("talkPractice");return true;}
    const bookButton=event.target.closest("[data-tr-book]");if(bookButton){selectedBookId=bookButton.dataset.trBook;pageIndex=0;const book=bookById(selectedBookId);S().markBook(activeProfile().id,selectedBookId,"opened",book?.pages[0]?.id);BB.dailyReports?.recordReading(activeProfile().id,{booksOpened:1,pagesViewed:1,book:selectedBookId,bookTitle:book?.title,page:book?.pages[0]?.id});rerender("readingLibrary");return true;}
    const favorite=event.target.closest("[data-tr-favorite]");if(favorite){const on=S().toggleFavorite(activeProfile().id,favorite.dataset.trFavorite);BB.dailyReports?.recordReading(activeProfile().id,{favoriteBook:on?bookById(favorite.dataset.trFavorite)?.title:""});rerender("readingLibrary");return true;}
    const mode=event.target.closest("[data-tr-mode]");if(mode){readingMode=mode.dataset.trMode;rerender("readingLibrary");return true;}
    const pageMove=event.target.closest("[data-tr-page]");if(pageMove){const book=bookById(selectedBookId),direction=Number(pageMove.dataset.trPage);if(direction>0&&pageIndex===book.pages.length-1)completeBook(book);else{pageIndex=Math.max(0,Math.min(book.pages.length-1,pageIndex+direction));S().markBook(activeProfile().id,book.id,"pagesViewed",book.pages[pageIndex].id);BB.dailyReports?.recordReading(activeProfile().id,{pagesViewed:1,book:book.id,bookTitle:book.title,page:book.pages[pageIndex].id});}rerender("readingLibrary");return true;}
    if(event.target.closest("[data-tr-listen],[data-tr-page-listen]")){listenCurrent();return true;}
    const specialAudio=event.target.closest("[data-tr-book-audio]");if(specialAudio){const book=bookById(selectedBookId),part=specialAudio.dataset.trBookAudio,text=part==="welcome"?`Welcome to ${book.title}.`:part==="ending"?"You did a wonderful job listening and reading with me.":book.pages.map(item=>item.text).join(" ");const id=bookAudioId(book,{id:part},part);speak(text,"Book Narration",id,{book:book.id,bookTitle:book.title,mode:"parent-voice",page:part});return true;}
    if(event.target.closest("[data-tr-pause]")){if(playbackPaused){const resumed=await BB.app.resumeTeachingAudio();playbackPaused=!resumed;}else playbackPaused=BB.app.pauseTeachingAudio();rerender("readingLibrary");return true;}
    if(event.target.closest("[data-tr-my-turn]")){startOrStopAttempt();return true;}
    if(event.target.closest("[data-tr-play-attempt]")){playAttempt();return true;}
    if(event.target.closest("[data-tr-save-attempt]")){saveAttempt();return true;}
    if(event.target.closest("[data-tr-picture]")){const context=currentContext();if(context?.type==="lesson"){S().markLesson(activeProfile().id,context.level.id,"pictures",context.prompt.id);BB.dailyReports?.recordTalk(activeProfile().id,{pictureResponses:1});}BB.app.pip("You used the picture to take your turn.","😊");return true;}
    if(event.target.closest("[data-tr-skip]")){nextPrompt(true);return true;}
    if(event.target.closest("[data-tr-continue]")){nextPrompt(false);return true;}
    const choice=event.target.closest("[data-tr-choice]");if(choice){const value=choice.dataset.trChoice,cardId=choice.dataset.trCardId||"",category=choice.dataset.trCardCategory||"";BB.app.speakTeaching(value,category,cardId,"");BB.dailyReports?.recordReading(activeProfile().id,{communicationResponses:1});S().markBook(activeProfile().id,selectedBookId,"cards",bookById(selectedBookId)?.pages[pageIndex]?.id);BB.app.pip("You chose an answer. Nice communicating!","😊");return true;}
    const toggle=event.target.closest("[data-tr-toggle]");if(toggle&&parentUnlocked()){const config=settings(),key=toggle.dataset.trToggle;config[key]=!config[key];S().save();rerender("talkReadParent");return true;}
    const parentMove=event.target.closest("[data-tr-parent-page]");if(parentMove){const book=bookById(parentBookId);parentPageIndex=Math.max(0,Math.min(book.pages.length-1,parentPageIndex+Number(parentMove.dataset.trParentPage)));rerender("talkReadParent");return true;}
    const parentPromptMove=event.target.closest("[data-tr-parent-prompt]");if(parentPromptMove){const level=levelById(parentLessonId);parentPromptIndex=Math.max(0,Math.min(level.prompts.length-1,parentPromptIndex+Number(parentPromptMove.dataset.trParentPrompt)));rerender("talkReadParent");return true;}
    const parentModel=event.target.closest("[data-tr-parent-model]");if(parentModel&&parentUnlocked()){BB.app.openParentVoiceEditor(parentModel.dataset.trParentText,"Learn to Talk","",parentModel.dataset.trParentModel);return true;}
    const narrate=event.target.closest("[data-tr-parent-narrate]");if(narrate&&parentUnlocked()){BB.app.openParentVoiceEditor(narrate.dataset.trParentText,"Book Narration","",narrate.dataset.trParentNarrate);return true;}
    const deleteAttempts=event.target.closest("[data-tr-delete-attempts]");if(deleteAttempts&&parentUnlocked()){if(confirm("Permanently delete all saved child practice recordings for this profile?")){await S().clearAttempts(activeProfile().id);await loadParentCaches();rerender("talkReadParent");BB.app.toast("Saved child practice recordings deleted.");}return true;}
    const attemptPlay=event.target.closest("[data-tr-attempt-play]");if(attemptPlay&&parentUnlocked()){const item=savedAttempts.find(entry=>entry.id===attemptPlay.dataset.trAttemptPlay);if(item){BB.app.stopTeachingAudio();const audio=new Audio(URL.createObjectURL(item.blob));audio.addEventListener("ended",()=>URL.revokeObjectURL(audio.src),{once:true});audio.play().catch(()=>BB.app.toast("The audio could not be played."));}return true;}
    const attemptDelete=event.target.closest("[data-tr-attempt-delete]");if(attemptDelete&&parentUnlocked()){await S().removeAttempt(attemptDelete.dataset.trAttemptDelete);await loadParentCaches();rerender("talkReadParent");return true;}
    if(event.target.closest("[data-tr-add-page]")&&parentUnlocked()){try{const text=document.querySelector("[data-tr-page-text]")?.value.trim();if(!text){BB.app.toast("Add page text first.");return true;}const image=await imageData(document.querySelector("[data-tr-page-image]")?.files[0]),choices=[...new Set((document.querySelector("[data-tr-page-choices]")?.value||"").split(",").map(item=>item.trim()).filter(Boolean))];draftBook.pages.push({id:"",text,narration:text,repeat:document.querySelector("[data-tr-page-repeat]")?.value.trim()||"",question:document.querySelector("[data-tr-page-question]")?.value.trim()||"",choices,vocabulary:[],imageData:image,image:image?"":"📖"});rerender("talkReadParent");}catch(error){BB.app.toast(error.message||"That page could not be added.");}return true;}
    const moveDraft=event.target.closest("[data-tr-move-page]");if(moveDraft){const from=Number(moveDraft.dataset.trMovePage),to=from+Number(moveDraft.dataset.direction);if(to>=0&&to<draftBook.pages.length)[draftBook.pages[from],draftBook.pages[to]]=[draftBook.pages[to],draftBook.pages[from]];rerender("talkReadParent");return true;}
    const removeDraft=event.target.closest("[data-tr-remove-page]");if(removeDraft){draftBook.pages.splice(Number(removeDraft.dataset.trRemovePage),1);rerender("talkReadParent");return true;}
    if(event.target.closest("[data-tr-clear-draft]")){draftBook={title:"",category:"Communication Practice",ageGroup:"3-5",pages:[],profileIds:["*"]};rerender("talkReadParent");return true;}
    if(event.target.closest("[data-tr-save-book]")&&parentUnlocked()){if(!draftBook.title.trim()||!draftBook.pages.length){BB.app.toast("Add a book title and at least one page.");return true;}if(!draftBook.profileIds.length){BB.app.toast("Choose at least one child profile for this book.");return true;}try{await S().saveCustomBook({...draftBook,title:draftBook.title.trim(),cover:"📘",description:"A private family-created story.",abilityLevel:levelById(settings().learningLevel)?.title||"Custom Level",enabled:true,offline:true});draftBook={title:"",category:"Communication Practice",ageGroup:"3-5",pages:[],profileIds:["*"]};await loadParentCaches();rerender("talkReadParent");BB.app.toast("Private custom book saved.");}catch{BB.app.toast("This book could not be saved. Your previous book is still available.");}return true;}
    const editBook=event.target.closest("[data-tr-edit-book]");if(editBook){const book=customBooks.find(item=>item.id===editBook.dataset.trEditBook);if(book){draftBook=JSON.parse(JSON.stringify(book));rerender("talkReadParent");}return true;}
    const deleteBook=event.target.closest("[data-tr-delete-book]");if(deleteBook&&confirm("Permanently delete this private custom book?")){await S().removeCustomBook(deleteBook.dataset.trDeleteBook);await loadParentCaches();rerender("talkReadParent");return true;}
    return false;
  }

  function handleInput(event){
    if(event.target.matches("[data-tr-draft]")){draftBook[event.target.dataset.trDraft]=event.target.value;return true;}
    return false;
  }
  function handleChange(event){
    if(!parentUnlocked())return false;
    const config=settings();
    if(event.target.matches("[data-tr-setting]")){const key=event.target.dataset.trSetting;config[key]=["dailyGoal","narrationRate"].includes(key)?Number(event.target.value):event.target.value;S().save();return true;}
    if(event.target.matches("[data-tr-level-enabled]")){const id=event.target.dataset.trLevelEnabled;config.enabledLevels=event.target.checked?[...new Set([...config.enabledLevels,id])]:config.enabledLevels.filter(item=>item!==id);S().save();return true;}
    if(event.target.matches("[data-tr-category-enabled]")){const id=event.target.dataset.trCategoryEnabled;config.enabledBookCategories=event.target.checked?[...new Set([...config.enabledBookCategories,id])]:config.enabledBookCategories.filter(item=>item!==id);S().save();return true;}
    if(event.target.matches("[data-tr-record-profile]")){const id=event.target.dataset.trRecordProfile;config.recordingProfiles=event.target.checked?[...new Set([...config.recordingProfiles,id])]:config.recordingProfiles.filter(item=>item!==id);S().save();return true;}
    if(event.target.matches("[data-tr-library-age]")){libraryAge=event.target.value;rerender("readingLibrary");return true;}
    if(event.target.matches("[data-tr-library-category]")){libraryCategory=event.target.value;rerender("readingLibrary");return true;}
    if(event.target.matches("[data-tr-parent-book]")){parentBookId=event.target.value;parentPageIndex=0;rerender("talkReadParent");return true;}
    if(event.target.matches("[data-tr-parent-lesson]")){parentLessonId=event.target.value;parentPromptIndex=0;rerender("talkReadParent");return true;}
    if(event.target.matches("[data-tr-book-all]")){draftBook.profileIds=event.target.checked?["*"]:[];rerender("talkReadParent");return true;}
    if(event.target.matches("[data-tr-book-profile]")){const id=event.target.dataset.trBookProfile;draftBook.profileIds=draftBook.profileIds.filter(item=>item!=="*");draftBook.profileIds=event.target.checked?[...new Set([...draftBook.profileIds,id])]:draftBook.profileIds.filter(item=>item!==id);return true;}
    if(event.target.matches("[data-tr-draft]")){draftBook[event.target.dataset.trDraft]=event.target.value;return true;}
    return false;
  }

  function stop(){
    BB.app?.stopTeachingAudio?.();
    playbackPaused=false;
    if(recording)stopAttempt();
    S().clearTemporaryAttempt();
  }

  function pauseForBackground(){
    playbackPaused=Boolean(BB.app?.pauseTeachingAudio?.());
    if(recording)stopAttempt();
  }

  function ownsEvent(event){
    for(let node=event.target;node&&node!==document;node=node.parentElement){
      if(node.dataset&&Object.keys(node.dataset).some(key=>key.startsWith("tr")))return true;
    }
    return false;
  }

  window.BB=window.BB||{};
  BB.talkRead={init,refreshProfile,renderHub,renderPractice,renderLibrary,renderParent,handleClick,handleInput,handleChange,afterRender,stop,pauseForBackground,ownsEvent,get validation(){return D().validate();}};
})();
