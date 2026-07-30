(function () {
  "use strict";

  const databaseName = "brightbridge-talk-read-private";
  const attemptsStore = "childAttempts";
  const booksStore = "customBooks";
  let databasePromise;
  let temporaryAttempt = null;

  function database() {
    databasePromise ||= new Promise((resolve,reject)=>{
      const request=indexedDB.open(databaseName,1);
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(attemptsStore))db.createObjectStore(attemptsStore,{keyPath:"id"});
        if(!db.objectStoreNames.contains(booksStore))db.createObjectStore(booksStore,{keyPath:"id"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(new Error("Close other LumiTalk tabs and try again."));
    }).catch(error=>{databasePromise=null;throw error;});
    return databasePromise;
  }

  async function withStore(name,mode,operation){
    const db=await database();
    return new Promise((resolve,reject)=>{
      const request=operation(db.transaction(name,mode).objectStore(name));
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
  }

  function rootState(){
    const data=BB.store.data;
    data.talkRead ||= {
      schemaVersion:1,
      profiles:{},
      migration:{
        completedAt:new Date().toISOString(),
        note:"Existing profiles, cards, reports, voices, videos, and progress were preserved. Learn to Talk & Read began with new independent progress records."
      }
    };
    data.talkRead.profiles ||= {};
    return data.talkRead;
  }

  function profile(profileId){
    const root=rootState();
    const levels=BB_TALK_READ_DATA.levels.map(level=>level.id);
    const categories=BB_TALK_READ_DATA.bookCategories;
    root.profiles[profileId] ||= {
      ageGroup:"3-5",
      learningLevel:"first-words",
      enabledLevels:levels,
      enabledBookCategories:categories,
      parentVoicePreference:true,
      childRecording:false,
      recordingMode:"temporary",
      recordingProfiles:[profileId],
      narrationRate:.9,
      backgroundMusic:false,
      autoPageTurning:false,
      repeatPrompts:true,
      dailyGoal:3,
      assignedBookIds:[],
      progress:{lessons:{},books:{},favoriteBooks:[]}
    };
    const current=root.profiles[profileId];
    current.enabledLevels ||= levels;
    current.enabledBookCategories ||= categories;
    current.recordingProfiles ||= [profileId];
    current.assignedBookIds ||= [];
    current.progress ||= {lessons:{},books:{},favoriteBooks:[]};
    current.progress.lessons ||= {};
    current.progress.books ||= {};
    current.progress.favoriteBooks ||= [];
    return current;
  }

  function save(){BB.store.save();}

  function markLesson(profileId,lessonId,action,promptId=""){
    const settings=profile(profileId),entry=settings.progress.lessons[lessonId]||={opened:0,listened:0,turns:0,skipped:0,pictures:0,cards:0,lastPromptId:"",updatedAt:""};
    entry[action]=(Number(entry[action])||0)+1;
    if(promptId)entry.lastPromptId=promptId;
    entry.updatedAt=new Date().toISOString();
    save();return entry;
  }

  function markBook(profileId,bookId,action,pageId=""){
    const settings=profile(profileId),entry=settings.progress.books[bookId]||={opened:0,pagesViewed:0,completed:0,listened:0,readWithMe:0,repeatTurns:0,parentNarration:0,lastPageId:"",updatedAt:""};
    entry[action]=(Number(entry[action])||0)+1;
    if(pageId)entry.lastPageId=pageId;
    entry.updatedAt=new Date().toISOString();
    save();return entry;
  }

  function toggleFavorite(profileId,bookId){
    const list=profile(profileId).progress.favoriteBooks,index=list.indexOf(bookId);
    index>=0?list.splice(index,1):list.push(bookId);save();return index<0;
  }

  function setTemporaryAttempt(attempt){
    clearTemporaryAttempt();
    temporaryAttempt=attempt;
    return temporaryAttempt;
  }
  function getTemporaryAttempt(){return temporaryAttempt;}
  function clearTemporaryAttempt(){
    if(temporaryAttempt?.url)URL.revokeObjectURL(temporaryAttempt.url);
    temporaryAttempt=null;
  }

  async function saveAttempt(attempt){
    const record={...attempt,id:attempt.id||`attempt-${Date.now()}-${Math.random().toString(16).slice(2)}`,createdAt:attempt.createdAt||new Date().toISOString()};
    delete record.url;
    await withStore(attemptsStore,"readwrite",store=>store.put(record));
    return record;
  }
  async function attempts(profileId){
    const items=await withStore(attemptsStore,"readonly",store=>store.getAll());
    return items.filter(item=>!profileId||item.profileId===profileId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  async function removeAttempt(id){return withStore(attemptsStore,"readwrite",store=>store.delete(id));}
  async function clearAttempts(profileId){
    const items=await attempts(profileId);
    for(const item of items)await removeAttempt(item.id);
    return items.length;
  }

  async function saveCustomBook(book){
    const clean={...book,id:book.id||`custom-book-${Date.now()}-${Math.random().toString(16).slice(2)}`,custom:true,updatedAt:new Date().toISOString(),createdAt:book.createdAt||new Date().toISOString()};
    clean.pages=(clean.pages||[]).map((page,index)=>({...page,id:page.id||`${clean.id}-page-${index+1}`}));
    await withStore(booksStore,"readwrite",store=>store.put(clean));
    return clean;
  }
  async function customBooks(profileId){
    const items=await withStore(booksStore,"readonly",store=>store.getAll());
    return items.filter(item=>!profileId||item.profileIds?.includes("*")||item.profileIds?.includes(profileId)).sort((a,b)=>a.title.localeCompare(b.title));
  }
  async function removeCustomBook(id){return withStore(booksStore,"readwrite",store=>store.delete(id));}
  async function clearStore(name){return withStore(name,"readwrite",store=>store.clear());}
  async function clearAll(){
    clearTemporaryAttempt();
    await Promise.all([clearStore(attemptsStore),clearStore(booksStore)]);
  }

  function bookAudioId(bookId,pageId,part="page"){return `talk-book:${bookId}:${pageId}:${part}`;}
  function lessonAudioId(lessonId,promptId){return `talk-lesson:${lessonId}:${promptId}`;}

  window.BB=window.BB||{};
  BB.talkReadStorage={
    rootState,profile,save,markLesson,markBook,toggleFavorite,
    setTemporaryAttempt,getTemporaryAttempt,clearTemporaryAttempt,
    saveAttempt,attempts,removeAttempt,clearAttempts,
    saveCustomBook,customBooks,removeCustomBook,clearAll,bookAudioId,lessonAudioId
  };
})();
