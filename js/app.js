(function () {
  "use strict";

  const view = document.querySelector("#view");
  const modalRoot = document.querySelector("#modal-root");
  const toastRoot = document.querySelector("#toast-root");
  let installPrompt;
  let currentGame = null;
  let gameRound = 0;
  let flashIndex = 0;
  let quizLocked = false;
  let aacCategory = "Quick";
  let sentenceText = "";
  let sensoryMode = "bubbles";
  let musicInstrument = "piano";
  let parentUnlocked = false;
  let currentRoutine = "Brush teeth";
  let completedRoutineSteps = new Set();
  let socialIndex = 0;
  let voiceRecorder = null;
  let voiceStream = null;
  let voiceChunks = [];
  let recordingLabel = "";

  const homeCards = [
    ["communication","💬","Communication","Build words and sentences","#ffe3dc","AAC"],
    ["learning","📚","Learning","Flashcards, numbers, colors, and shapes","#e9e1ff","Play & learn"],
    ["sensory","🫧","Sensory Play","Bubbles, drawing, ripples, and stars","#dcefff","No score"],
    ["music","🎹","Music","Piano, bells, drums, and free play","#fff0c7","Make sounds"],
    ["nature","🦋","Nature","Butterflies, oceans, gardens, and space","#ddf5ed","Explore"],
    ["emotions","😊","Feelings","Name feelings and find calm","#ffe8ec","Feelings"],
    ["daily","🪥","Daily Living","Step-by-step routines for every day","#e8f4ff","Routines"],
    ["social","🤝","Social Skills","Greetings, turns, choices, and kindness","#f0e9ff","Together"],
    ["rewards","🌻","Reward Garden","Stars, flowers, stickers, and badges","#fff0c7","Celebrate"],
    ["progress","📈","My Progress","See everything you have explored","#ddf5ed","Growing"],
    ["parent","🔒","Grown-up Area","Profiles, reports, and controls","#ececf2","Parents"],
    ["settings","⚙️","Settings","Sound, comfort, theme, and access","#e8efff","Comfort"]
  ];

  const aac = {
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

  const learningOrder = ["alphabet","numbers","colors","shapes","matching","puzzles","emotions"];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    })[character]);
  }

  function pip(message, mood = "😊", speakIt = true) {
    document.querySelector("#pip-expression").textContent = mood;
    document.querySelector("#pip-bubble").textContent = message;
    if (speakIt) BB.speech.speak(BB.mobileTools?.encouragement(message,mood) || message);
  }

  async function speakSaved(message, showMissing = true) {
    if (!BB.store.data.settings.speech) {
      if (showMissing) toast("Family voice playback is turned off in Settings.");
      return false;
    }
    const played = await BB.speech.speak(message);
    if (!played && showMissing) {
      toast(`No family voice clip yet for “${message}”`);
    }
    return played;
  }

  function updateHeader() {
    document.querySelector("#header-stars").textContent = BB.store.data.stars;
  }

  function render(route, options = {}) {
    if (route !== "parent" && voiceRecorder?.state === "recording") stopVoiceRecording();
    BB.memoryJourney?.cancelView?.();
    updateHeader();
    const routes = {
      home: renderHome,
      communication: renderCommunication,
      learning: renderLearning,
      flashcards: renderFlashcards,
      game: renderGame,
      sensory: renderSensory,
      music: renderMusic,
      nature: renderNature,
      emotions: renderEmotions,
      daily: renderDaily,
      social: renderSocial,
      rewards: renderRewards,
      progress: renderProgress,
      parent: renderParent,
      memory: () => `<section>${BB.navigation.pageHead("Private Memory Studio","Opening the selected caregiver feature…","parent")}<div class="panel memory-loading">💜 Gathering memories kept on this device…</div></section>`,
      "mobile-tools": () => BB.mobileTools.render(),
      settings: () => BB.settings.render()
    };
    view.innerHTML = (routes[route] || renderHome)(options);
    BB.store.data.activityVisits[route] = (BB.store.data.activityVisits[route] || 0) + 1;
    BB.store.save();
    if (route === "sensory") setupSensory();
    if (route === "nature") setupNature();
    if (route === "parent" && parentUnlocked) refreshVoiceLibrary();
    if (route === "memory") setTimeout(() => BB.memoryJourney.open(options.section || "hub",{withinRoute:true}),0);
    if (route === "mobile-tools") BB.mobileTools.afterRender();
    if (route === "home") pip("Hi, friend! What should we explore?", "😊", false);
  }

  function renderHome() {
    const name = BB.store.data.profiles.find(item => item.id === BB.store.data.activeProfile)?.name || "friend";
    return `<section>
      <div class="hero"><div><p class="eyebrow">Helping every touch become communication</p><h1>Hello, ${escapeHtml(name)}!</h1><p class="lead">Choose a gentle adventure. Pip will show, tell, celebrate, and help whenever you need another try.</p></div><div class="hero-mascot" role="img" aria-label="Pip the smiling guide">😊</div></div>
      <div class="section-heading"><h2>Where should we go?</h2><span>No timers • No losing • Always kind</span></div>
      ${BB.memoryJourney?.homeBanner?.()||""}
      <div class="home-grid">${homeCards.map(([route,icon,title,description,color,tag]) => `<button class="nav-card ${route === "parent" || route === "settings" ? "advanced-only" : ""}" style="--card-color:${color}" type="button" data-route="${route}"><span class="card-tag">${tag}</span><h3>${title}</h3><p>${description}</p><span class="nav-card-icon" aria-hidden="true">${icon}</span></button>`).join("")}</div>
    </section>`;
  }

  function renderCommunication() {
    const growthWords = BB.memoryJourney?.stageVocabulary?.() || [];
    const categories = [...Object.keys(aac), "Growth Path", "Favorites"];
    const items = aacCategory === "Favorites"
      ? [...Object.values(aac).flat(),...growthWords].filter(([word]) => BB.store.data.favorites.includes(word))
      : aacCategory === "Growth Path" ? growthWords : aac[aacCategory] || aac.Quick;
    const recent = BB.store.data.recentWords.slice(0, 7);
    return `<section>
      ${BB.navigation.pageHead("My Communication Board", "Touch a card to say it. Put cards together to build a sentence.")}
      <div class="sentence-builder"><label class="sr-only" for="aac-sentence">Communication sentence</label><textarea id="aac-sentence" class="sentence-text" rows="2" placeholder="Type or touch cards to build a sentence…" aria-label="Communication sentence. Type or add picture-card words here.">${escapeHtml(sentenceText)}</textarea><button class="compact-button" type="button" data-action="aac-clear" aria-label="Clear sentence">✕</button><button class="compact-button primary" type="button" data-action="aac-speak" aria-label="Speak exactly what is written in the sentence box">🔊 Say it</button></div>
      ${recent.length ? `<div class="recent-strip" aria-label="Recent words">${recent.map(word => `<button class="recent-word" type="button" data-aac-word="${escapeHtml(word)}">${escapeHtml(word)}</button>`).join("")}</div>` : ""}
      <div class="category-row">${categories.map(category => `<button class="category-chip ${category === aacCategory ? "active" : ""}" type="button" data-aac-category="${category}">${category}</button>`).join("")}</div>
      <div class="button-grid">${items.length ? items.map(([word,icon]) => `<div class="big-tile aac-tile"><button class="favorite-star ${BB.store.data.favorites.includes(word) ? "is-favorite" : ""}" type="button" data-aac-favorite="${escapeHtml(word)}" aria-label="${BB.store.data.favorites.includes(word) ? "Remove" : "Add"} ${escapeHtml(word)} favorite">${BB.store.data.favorites.includes(word) ? "⭐" : "☆"}</button><button class="big-tile" type="button" data-aac-word="${escapeHtml(word)}"><span class="tile-icon">${icon}</span><span class="tile-label">${word}</span></button></div>`).join("") : `<div class="panel"><h3>Your favorites will grow here</h3><p>Tap the star on any communication card.</p></div>`}</div>
    </section>`;
  }

  function renderLearning() {
    return `<section>
      ${BB.navigation.pageHead("Learning Adventures", "See it, hear it, touch it, and try it.")}
      <div class="activity-grid">${learningOrder.map(id => {
        const game = BB.games[id];
        return `<article class="activity-card" style="--activity-soft:${game.color}"><span class="tile-icon">${game.icon}</span><div><h3>${game.title}</h3><p>${game.description}</p><div class="flash-actions"><button class="compact-button" type="button" data-open-cards="${id}">Cards</button><button class="compact-button primary" type="button" data-start-game="${id}">Play</button></div></div></article>`;
      }).join("")}</div>
      <div class="section-heading"><h2>More ways to learn</h2></div>
      <div class="button-grid">
        ${[["Animals","🦁","Animal names and sounds"],["Food","🍓","Foods we see and eat"],["Weather","🌦️","Sun, rain, wind, and snow"],["Body Parts","🖐️","Hands, feet, eyes, and more"],["Community Helpers","🧑‍🚒","People who help us"],["Vehicles","🚜","Things that move"]].map(([title,icon,detail]) => `<button class="big-tile" type="button" data-quick-flash="${title}|${icon}|${detail}"><span class="tile-icon">${icon}</span><span>${title}</span></button>`).join("")}
      </div>
      <div class="section-heading"><h2>Hands-on practice</h2></div>
      <div class="activity-grid"><button class="activity-card" type="button" data-special-game="tracing"><span class="tile-icon">✍️</span><div><h3>Letter Tracing</h3><p>Follow a giant letter with your finger</p></div></button><button class="activity-card" type="button" data-special-game="memory"><span class="tile-icon">🧠</span><div><h3>Memory Match</h3><p>Find the friendly pairs</p></div></button><button class="activity-card" type="button" data-special-game="sorting"><span class="tile-icon">🧺</span><div><h3>Sorting Basket</h3><p>Put things in their groups</p></div></button></div>
    </section>`;
  }

  function renderFlashcards(options = {}) {
    if (options.game) currentGame = BB.games[options.game];
    flashIndex = options.keepIndex ? flashIndex : 0;
    const card = currentGame.cards[flashIndex];
    return `<section>
      ${BB.navigation.pageHead(currentGame.title, `Flashcard ${flashIndex + 1} of ${currentGame.cards.length}`, "learning")}
      <div class="flashcard" aria-label="${card.word}. ${card.detail}">
        <div><div class="flash-symbol">${card.symbol}</div><div class="flash-word">${card.word}</div><p class="lead">${card.emoji} ${card.detail}</p></div>
      </div>
      <div class="flash-actions"><button class="secondary-button" type="button" data-action="flash-prev">← Back</button><button class="primary-button" type="button" data-action="flash-speak">🔊 Hear card</button><button class="secondary-button" type="button" data-action="flash-next">Next →</button><button class="primary-button" type="button" data-start-game="${currentGame.id}">Play a challenge</button></div>
    </section>`;
  }

  function renderGame(options = {}) {
    if (options.game) {
      currentGame = BB.games[options.game];
      gameRound = 0;
      quizLocked = false;
    }
    const round = currentGame.rounds[gameRound];
    return `<section>
      ${BB.navigation.pageHead(currentGame.title, "Pip will help if you need another try.", "learning")}
      <div class="quiz-progress"><span>Challenge ${gameRound + 1} of ${currentGame.rounds.length}</span><div class="progress-track"><i class="progress-value" style="width:${(gameRound + 1) / currentGame.rounds.length * 100}%"></i></div></div>
      <div class="question-card"><h2>${round.prompt}</h2><div class="question-visual">${round.visual}</div><button class="compact-button" type="button" data-action="quiz-speak">🔊 Hear question</button></div>
      <div id="quiz-area"><div class="answer-grid">${round.options.map(([symbol,label], index) => `<button class="answer" type="button" data-quiz-answer="${index}"><span>${symbol}</span>${label}</button>`).join("")}</div></div>
    </section>`;
  }

  function answerQuiz(index) {
    if (quizLocked) return;
    const round = currentGame.rounds[gameRound];
    if (index !== round.answer) {
      const promptLevel = BB.mobileTools?.promptLevel() || "full";
      document.querySelectorAll(".answer").forEach((item, i) => {
        item.classList.toggle("hint", promptLevel === "full" && i === round.answer);
        if (i === index) item.classList.add("tried");
      });
      BB.audio.tryAgain();
      const guidance = promptLevel === "full"
        ? `Good try! Look for ${round.options[round.answer][1]}. You can try again.`
        : promptLevel === "gentle"
          ? "Good try. Look carefully and choose again."
          : "You can try again when you are ready.";
      pip(guidance, "🙂");
      return;
    }
    quizLocked = true;
    BB.audio.success();
    const reward = BB.rewards.earn(currentGame.title);
    BB.rewards.recordProgress(currentGame.id);
    BB.memoryJourney?.track("learning","First learning activity completed",{icon:"📚",detail:currentGame.title,onceKey:"first-learning"});
    document.querySelector("#quiz-area").innerHTML = `<div class="success-panel"><div class="success-face">🥳</div><h2>You found it!</h2><p>${round.fact}</p><span class="reward-note">⭐ +1 star ${reward.newSticker ? "• New sticker!" : ""}</span></div><button class="primary-button" type="button" data-action="quiz-next">${gameRound === currentGame.rounds.length - 1 ? "Finish adventure 🏆" : "Next challenge →"}</button>`;
    pip(`Yes! ${round.options[index][1]} is right. ${round.fact}`, "🥳");
    updateHeader();
  }

  function renderSensory() {
    return `<section>
      ${BB.navigation.pageHead("Sensory Play", "No score. No finish line. Just explore.")}
      <div class="sensory-toolbar">${[["bubbles","🫧 Bubbles"],["rainbow","🌈 Magic Paint"],["ripples","💧 Ripples"],["balloons","🎈 Balloons"],["leaves","🍂 Leaves"],["stars","⭐ Stars"],["fireflies","✨ Fireflies"],["snow","❄️ Snow"],["ocean","🌊 Ocean"]].map(([id,label]) => `<button class="category-chip ${sensoryMode === id ? "active" : ""}" type="button" data-sensory-mode="${id}">${label}</button>`).join("")}</div>
      <div id="sensory-stage" class="sensory-stage" aria-label="${sensoryMode} sensory play"></div>
      <p class="privacy-note">Touch anywhere. This play has no score and never ends.</p>
    </section>`;
  }

  function setupSensory() {
    const stage = document.querySelector("#sensory-stage");
    if (!stage) return;
    if (sensoryMode === "rainbow") {
      const canvas = document.createElement("canvas");
      canvas.className = "paint-canvas";
      stage.appendChild(canvas);
      const box = stage.getBoundingClientRect();
      canvas.width = Math.max(300, box.width * devicePixelRatio);
      canvas.height = Math.max(300, box.height * devicePixelRatio);
      const ctx = canvas.getContext("2d");
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.lineWidth = 18; ctx.lineCap = "round";
      let drawing = false, hue = 0;
      const point = event => {
        const rect = canvas.getBoundingClientRect();
        return [event.clientX - rect.left, event.clientY - rect.top];
      };
      canvas.addEventListener("pointerdown", event => { drawing = true; const [x,y] = point(event); ctx.beginPath(); ctx.moveTo(x,y); canvas.setPointerCapture(event.pointerId); });
      canvas.addEventListener("pointermove", event => { if (!drawing) return; const [x,y] = point(event); ctx.strokeStyle = `hsl(${hue += 4} 85% 60%)`; ctx.lineTo(x,y); ctx.stroke(); });
      canvas.addEventListener("pointerup", () => drawing = false);
      pip("Draw any way you like. Your rainbow can be completely yours.", "😊", false);
      return;
    }
    if (sensoryMode === "bubbles") {
      for (let i = 0; i < 18; i++) {
        const bubble = document.createElement("button");
        bubble.className = "bubble"; bubble.type = "button"; bubble.ariaLabel = "Pop bubble";
        const size = 38 + Math.random() * 62;
        Object.assign(bubble.style,{width:`${size}px`,height:`${size}px`,left:`${Math.random()*86}%`,top:`${Math.random()*78}%`});
        bubble.addEventListener("click", () => { BB.audio.pop(); bubble.remove(); setTimeout(() => { if (document.body.contains(stage)) setupOneBubble(stage); }, 450); });
        stage.appendChild(bubble);
      }
      return;
    }
    if (sensoryMode === "ripples") {
      stage.style.background = "linear-gradient(145deg,#6fb8db,#2c7fa9)";
      stage.addEventListener("pointerdown", event => createRipple(stage,event));
      return;
    }
    const map = {balloons:["🎈","🎈","🎈","🎈"],leaves:["🍂","🍃","🍁","🍂"],stars:["⭐","🌟","✨","⭐"],fireflies:["✨","🟡","✨","🟡"],snow:["❄️","❅","❆","❄️"],ocean:["🌊","🐠","🫧","🐚"]};
    for (let i = 0; i < 20; i++) {
      const item = document.createElement("button");
      item.type = "button"; item.className = "floating-item"; item.textContent = map[sensoryMode][i % 4]; item.ariaLabel = `Touch ${sensoryMode}`;
      Object.assign(item.style,{left:`${Math.random()*90}%`,top:`${Math.random()*90}%`,"--drift":`${6+Math.random()*7}s`,animationDelay:`-${Math.random()*8}s`});
      item.addEventListener("click", () => { BB.audio.pop(); item.style.opacity = ".2"; setTimeout(() => item.style.opacity = "1", 400); });
      stage.appendChild(item);
    }
  }

  function setupOneBubble(stage) {
    const bubble = document.createElement("button"); bubble.className = "bubble"; bubble.type = "button"; bubble.ariaLabel = "Pop bubble";
    const size = 42 + Math.random() * 60; Object.assign(bubble.style,{width:`${size}px`,height:`${size}px`,left:`${Math.random()*86}%`,top:`${Math.random()*78}%`});
    bubble.addEventListener("click", () => { BB.audio.pop(); bubble.remove(); setTimeout(() => setupOneBubble(stage), 450); }); stage.appendChild(bubble);
  }

  function createRipple(stage,event) {
    const rect = stage.getBoundingClientRect(); const ripple = document.createElement("span"); ripple.className = "ripple";
    ripple.style.left = `${event.clientX - rect.left}px`; ripple.style.top = `${event.clientY - rect.top}px`;
    stage.appendChild(ripple); BB.audio.pop(); setTimeout(() => ripple.remove(), 1300);
  }

  function renderMusic() {
    const instrument = BB.games.music.instruments[musicInstrument];
    const tabs = Object.entries(BB.games.music.instruments).map(([id,item]) => `<button class="instrument ${id === musicInstrument ? "active" : ""}" type="button" data-instrument="${id}">${item.icon} ${item.label}</button>`).join("");
    const keys = instrument.notes.map((frequency,index) => `<button class="${musicInstrument === "drums" ? "drum" : "piano-key"}" type="button" data-note="${frequency}" aria-label="${instrument.label} note ${index+1}">${musicInstrument === "drums" ? ["🥁","🪘","💥","🥁","🪘","✨"][index] : ["C","D","E","F","G","A","B","C"][index] || "♪"}</button>`).join("");
    return `<section>
      ${BB.navigation.pageHead("Music Room", "Touch, listen, and make your own song.")}
      <div class="instrument-tabs">${tabs}</div>
      <div class="panel">${musicInstrument === "drums" ? `<div class="drum-grid">${keys}</div>` : `<div class="piano">${keys}</div>`}</div>
      <div class="section-heading"><h2>Nature sound buttons</h2></div>
      <div class="button-grid">${[["🌧️","Gentle rain",220],["🌊","Ocean wave",180],["🐦","Bird song",880],["🍃","Soft breeze",330]].map(([icon,label,freq]) => `<button class="big-tile" type="button" data-note="${freq}"><span class="tile-icon">${icon}</span>${label}</button>`).join("")}</div>
    </section>`;
  }

  function renderNature() {
    return `<section>
      ${BB.navigation.pageHead("Nature Worlds", "Touch a world and watch it come alive.")}
      <div class="sensory-toolbar">${BB.games.nature.scenes.map(scene => `<button class="category-chip ${scene.id === (currentGame?.sceneId || "butterflies") ? "active" : ""}" type="button" data-nature-scene="${scene.id}">${scene.icon} ${scene.label}</button>`).join("")}</div>
      <div id="nature-stage" class="sensory-stage"></div>
      <p id="nature-fact" class="panel" style="margin-top:14px"></p>
    </section>`;
  }

  function setupNature(sceneId = currentGame?.sceneId || "butterflies") {
    const stage = document.querySelector("#nature-stage"); if (!stage) return;
    const scene = BB.games.nature.scenes.find(item => item.id === sceneId) || BB.games.nature.scenes[0];
    currentGame = { sceneId: scene.id };
    document.querySelector("#nature-fact").textContent = scene.fact;
    for (let i = 0; i < 24; i++) {
      const item = document.createElement("button"); item.className = "floating-item"; item.type = "button";
      item.textContent = scene.items[i % scene.items.length]; item.ariaLabel = `Explore ${scene.label}`;
      Object.assign(item.style,{left:`${Math.random()*90}%`,top:`${Math.random()*88}%`,"--drift":`${8+Math.random()*8}s`,animationDelay:`-${Math.random()*8}s`});
      item.addEventListener("click", () => { BB.audio.pop(); pip(scene.fact, "🤩"); });
      stage.appendChild(item);
    }
  }

  function renderEmotions() {
    const game = BB.games.emotions;
    return `<section>
      ${BB.navigation.pageHead("Feeling Friends", "Every feeling is okay. Pip can help name it.")}
      <div class="button-grid">${game.cards.map(card => `<button class="big-tile" type="button" data-feeling="${card.word}|${card.detail}"><span class="tile-icon">${card.symbol}</span><span>${card.word}</span></button>`).join("")}</div>
      <div class="section-heading"><h2>Calming tools</h2></div>
      <div class="activity-grid"><button class="activity-card" type="button" data-action="breathing"><span class="tile-icon">☁️</span><div><h3>Breathe with Pip</h3><p>Slow in, slow out</p></div></button><button class="activity-card" type="button" data-action="grounding"><span class="tile-icon">🖐️</span><div><h3>Five things</h3><p>Notice what is around you</p></div></button><button class="activity-card" type="button" data-start-game="emotions"><span class="tile-icon">😊</span><div><h3>Feeling game</h3><p>Find the feeling</p></div></button></div>
    </section>`;
  }

  function renderDaily() {
    const routines = Object.keys(BB.games.dailylife.routines);
    const steps = BB.games.dailylife.routines[currentRoutine];
    return `<section>
      ${BB.navigation.pageHead("Daily Living", "Small steps make routines easier.")}
      <div class="category-row">${routines.map(name => `<button class="category-chip ${name === currentRoutine ? "active" : ""}" type="button" data-routine="${name}">${name}</button>`).join("")}</div>
      <div class="panel"><h2>${currentRoutine}</h2><div class="routine-list">${steps.map(([icon,text],index) => `<button class="routine-step ${completedRoutineSteps.has(index) ? "done" : ""}" type="button" data-routine-step="${index}"><span class="step-number">${completedRoutineSteps.has(index) ? "✓" : index+1}</span><strong>${text}</strong><span class="tile-icon">${icon}</span></button>`).join("")}</div></div>
    </section>`;
  }

  function renderSocial() {
    const story = BB.games.socialskills.stories[socialIndex];
    return `<section>
      ${BB.navigation.pageHead("Social Stories", "Practice kind and safe choices.")}
      <div class="question-card"><div class="question-visual">${story.icon}</div><h2>${story.title}</h2><p class="lead">${story.prompt}</p></div>
      <div id="social-area" class="answer-grid">${story.options.map((option,index) => `<button class="answer" type="button" data-social-answer="${index}">${option}</button>`).join("")}</div>
    </section>`;
  }

  function renderRewards() {
    const data = BB.store.data;
    const gardenItems = [...Array(data.flowers)].map((_,i) => `<span class="garden-item">${["🌻","🌷","🌼"][i%3]}</span>`).join("") + [...Array(data.butterflies)].map(() => `<span class="garden-item">🦋</span>`).join("");
    return `<section>
      ${BB.navigation.pageHead("My Reward Garden", "Every try helps something beautiful grow.")}
      <div class="garden"><div class="garden-sky">☀️ ☁️</div><div class="garden-items">${gardenItems || '<span class="garden-item">🌱</span>'}</div></div>
      <div class="parent-grid" style="margin-top:15px"><div class="stat"><strong>⭐ ${data.stars}</strong><span>Stars</span></div><div class="stat"><strong>🌻 ${data.flowers}</strong><span>Flowers</span></div><div class="stat"><strong>🦋 ${data.butterflies}</strong><span>Butterflies</span></div></div>
      <div class="section-heading"><h2>Sticker book</h2></div><div class="badge-grid">${BB.rewards.stickerSet.map((icon,index) => `<div class="badge ${index >= data.stickers.length ? "locked" : ""}"><span>${index < data.stickers.length ? icon : "🌱"}</span>${index < data.stickers.length ? "My sticker" : "Still growing"}</div>`).join("")}</div>
      <div class="section-heading"><h2>Achievements</h2></div><div class="badge-grid">${BB.rewards.achievements.map(item => `<div class="badge ${data.achievements.includes(item.id) ? "" : "locked"}"><span>${data.achievements.includes(item.id) ? item.icon : "🔒"}</span>${item.name}</div>`).join("")}</div>
    </section>`;
  }

  function renderProgress() {
    const data = BB.store.data; const visits = Object.entries(data.activityVisits).sort((a,b)=>b[1]-a[1]);
    return `<section>
      ${BB.navigation.pageHead("My Progress", "Look at everything you have explored.")}
      <div class="parent-grid"><div class="stat"><strong>${data.stars}</strong><span>Learning stars</span></div><div class="stat"><strong>${Object.values(data.progress).reduce((a,b)=>a+b,0)}</strong><span>Challenges completed</span></div><div class="stat"><strong>${data.stickers.length}</strong><span>Stickers collected</span></div></div>
      <div class="section-heading"><h2>Places explored</h2></div><div class="panel">${visits.length ? visits.slice(0,10).map(([name,count]) => `<div class="setting-row"><strong>${name[0].toUpperCase()+name.slice(1)}</strong><span style="margin-left:auto">${count} visits</span></div>`).join("") : "<p>Your learning story begins with your first adventure.</p>"}</div>
    </section>`;
  }

  function renderParent() {
    if (!parentUnlocked) {
      setTimeout(showPinModal, 0);
      return `<section>${BB.navigation.pageHead("Grown-up Area", "A quick grown-up check keeps these controls protected.")}<div class="panel" style="text-align:center"><div class="pip-face">🔒</div><h2>Grown-up check needed</h2><button class="primary-button" type="button" data-action="parent-pin">Enter PIN</button><p class="muted">The starter PIN is 2468. Change it in this area before regular use.</p></div></section>`;
    }
    const data = BB.store.data;
    const activeProfile = data.profiles.find(item => item.id === data.activeProfile) || data.profiles[0];
    return `<section>
      ${BB.navigation.pageHead("Parent Dashboard", `Local, private progress for ${escapeHtml(activeProfile.name)}.`)}
      <div class="parent-grid"><div class="stat"><strong>${Math.floor(data.screenSeconds/60)}m</strong><span>Screen time</span></div><div class="stat"><strong>${data.stars}</strong><span>Stars earned</span></div><div class="stat"><strong>${Object.keys(data.activityVisits).length}</strong><span>Areas explored</span></div></div>
      <div class="setting-group parent-memory-group" style="margin-top:18px"><h3>✨ Private Memory & Growth</h3>
        <div class="voice-studio-intro"><span>🌈</span><div><strong>One continuous story—without duplicate tracking</strong><p>Voice Journey, Future Letters, celebrations, and Growth Paths reuse this profile’s existing communication, learning, Reward Garden, and progress history.</p></div></div>
        <div class="parent-memory-grid">
          <button type="button" data-memory-open="voice"><span>🎤</span><strong>Voice Journey™</strong><small>Recordings and milestones</small></button>
          <button type="button" data-memory-open="timeline"><span>🌈</span><strong>Growth Timeline</strong><small>Personal celebrations</small></button>
          <button type="button" data-memory-open="letters"><span>💌</span><strong>Future Letters™</strong><small>Letters and keepsakes</small></button>
          <button type="button" data-memory-open="growth"><span>🌱</span><strong>Growth Paths™</strong><small>Stages and controls</small></button>
        </div>
        <div class="flash-actions"><button class="secondary-button" type="button" data-memory-open="hub">Open Memory Home</button><button class="secondary-button" type="button" data-memory-encrypted-backup>Encrypted memory backup</button><label class="secondary-button">Restore encrypted backup<input class="sr-only" type="file" accept=".bbsecure,application/json" data-memory-encrypted-restore></label></div>
      </div>
      <div class="setting-group" style="margin-top:18px"><h3>👤 Child profiles</h3><label class="setting-row"><span><strong>Active profile</strong></span><select class="select" data-profile-select>${data.profiles.map(profile => `<option value="${profile.id}" ${profile.id === data.activeProfile ? "selected" : ""}>${profile.avatar} ${escapeHtml(profile.name)}</option>`).join("")}</select></label><label class="setting-row"><span><strong>Display name</strong><small>Shown on the home screen</small></span><input class="select" value="${escapeHtml(activeProfile.name)}" data-profile-name maxlength="30"></label><div class="setting-row"><button class="secondary-button" type="button" data-action="add-profile">Add child profile</button></div><label class="setting-row"><span><strong>Difficulty</strong></span><select class="select" data-setting-select="difficulty"><option value="starter" ${data.settings.difficulty === "starter" ? "selected" : ""}>Starter</option><option value="growing" ${data.settings.difficulty === "growing" ? "selected" : ""}>Growing</option><option value="adventure" ${data.settings.difficulty === "adventure" ? "selected" : ""}>Adventure</option></select></label></div>
      <div class="setting-group voice-studio"><h3>🎙️ Family Voice Library</h3>
        <div class="voice-studio-intro"><span>💜</span><div><strong>Let a familiar voice guide the way</strong><p>Type the exact word or phrase, then upload an audio clip or record it here. BrightBridge will play that family recording whenever the matching words appear.</p></div></div>
        <div class="voice-form">
          <label><span class="sr-only">Word or phrase</span><input class="voice-input" data-voice-label list="voice-phrase-suggestions" placeholder="Example: I want water" maxlength="160"></label>
          <label><span class="sr-only">Choose family voice audio</span><input class="voice-input" data-voice-file type="file" accept="audio/*"></label>
          <button class="primary-button" type="button" data-action="save-voice-upload">Upload voice</button>
        </div>
        <datalist id="voice-phrase-suggestions"><option value="I want water"><option value="I need help"><option value="More"><option value="All done"><option value="Yes"><option value="No"><option value="Great job!"><option value="Try again"></datalist>
        <div class="record-controls"><button class="secondary-button" type="button" data-action="start-voice-recording">⏺ Record this phrase</button><button class="danger-button" type="button" data-action="stop-voice-recording" hidden>■ Stop and save</button><span data-recording-status class="muted">Recordings and uploads stay only on this device.</span></div>
        <div id="voice-library-list" class="voice-list"><p class="muted">Loading family voice clips…</p></div>
      </div>
      <div class="setting-group"><h3>📊 Favorite areas</h3>${Object.entries(data.activityVisits).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>`<div class="setting-row"><strong>${name}</strong><span style="margin-left:auto">${count} visits</span></div>`).join("") || '<div class="setting-row">No activity yet</div>'}</div>
      <div class="flash-actions"><button class="primary-button" type="button" data-action="export">Export progress JSON</button><button class="secondary-button" type="button" data-action="change-pin">Change PIN</button><button class="danger-button" type="button" data-action="reset">Reset all local data</button></div>
    </section>`;
  }

  function modal(content,label) {
    modalRoot.innerHTML = `<div class="modal-overlay" data-action="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-label="${label}">${content}</section></div>`;
    modalRoot.querySelector("button,input")?.focus();
  }

  function closeModal() {
    modalRoot.innerHTML = "";
    BB.speech.stop();
  }

  function showBreathing() {
    modal(`<div class="modal-head"><h2>Breathe with Pip</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><div class="breathing"><p>In as the cloud grows • Out as it gets smaller</p><div class="breathing-orb">☁️</div><button class="primary-button" type="button" data-action="close-modal">I’m ready</button></div>`,"Breathing exercise");
    BB.speech.speak("Breathe in slowly. Now breathe out slowly.");
  }

  function showGrounding() {
    modal(`<div class="modal-head"><h2>Five things around me</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><div class="button-grid">${[["👀","5 things I see"],["🖐️","4 things I feel"],["👂","3 things I hear"],["👃","2 things I smell"],["💜","1 thing I like"]].map(([icon,text])=>`<button class="big-tile" type="button" data-grounding="${text}"><span class="tile-icon">${icon}</span>${text}</button>`).join("")}</div>`,"Grounding activity");
  }

  function showPinModal() {
    if (parentUnlocked || modalRoot.innerHTML) return;
    modal(`<div class="modal-head"><h2>Grown-up check</h2><button class="close-button" type="button" data-action="close-modal">×</button></div>
      <p><span class="pin-desktop-help">Enter the four-digit parent PIN.</span><span class="pin-mobile-help">Type the four-digit parent PIN or tap the number pad.</span></p>
      <input class="pin-entry" type="password" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" data-pin-input aria-label="Parent PIN">
      <div class="pin-dots" data-pin-dots aria-live="polite">○ ○ ○ ○</div>
      <div class="pin-keypad" aria-label="PIN number pad">
        ${["1","2","3","4","5","6","7","8","9","clear","0","back"].map(key=>`<button type="button" data-pin-key="${key}" aria-label="${key==="back"?"Delete last number":key==="clear"?"Clear PIN":`Number ${key}`}">${key==="back"?"⌫":key==="clear"?"Clear":key}</button>`).join("")}
      </div>
      <button class="primary-button pin-continue" type="button" data-action="verify-pin">Continue</button>
      <p class="privacy-note">Starter PIN: 2468</p>`,"Parent PIN");
    document.querySelector("[data-pin-input]")?.focus();
  }

  function updatePinDisplay() {
    const input=document.querySelector("[data-pin-input]");
    const dots=document.querySelector("[data-pin-dots]");
    if(!input||!dots)return;
    input.value=input.value.replace(/\D/g,"").slice(0,4);
    dots.textContent=[0,1,2,3].map(index=>index<input.value.length?"●":"○").join(" ");
  }

  function verifyParentPin() {
    const input=document.querySelector("[data-pin-input]");
    if(!input)return;
    if(input.value===BB.store.data.settings.parentPin){
      parentUnlocked=true;closeModal();BB.navigation.go("parent",{replace:true});toast("Grown-up area unlocked");
    }else{
      input.value="";updatePinDisplay();toast("That PIN did not match. Please try again.");input.focus();
    }
  }

  function showQuickFlash(value) {
    const [title, icon, detail] = value.split("|");
    modal(`<div class="modal-head"><h2>${escapeHtml(title)}</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><div class="flashcard"><div><div class="flash-symbol">${icon}</div><div class="flash-word">${escapeHtml(title)}</div><p class="lead">${escapeHtml(detail)}</p><button class="primary-button" type="button" data-quick-speak="${escapeHtml(title)}. ${escapeHtml(detail)}">🔊 Hear card</button></div></div>`,`${title} flashcard`);
    BB.speech.speak(`${title}. ${detail}`);
  }

  function showTracing() {
    modal(`<div class="modal-head"><h2>Trace the letter A</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><div class="trace-wrap"><p>Use your finger or mouse to follow the big letter.</p><canvas class="trace-canvas" width="520" height="380" aria-label="Trace the letter A"></canvas><button class="primary-button" type="button" data-action="trace-clear">Clear and try again</button></div>`,"Letter tracing");
    setupTracing();
    pip("Start at the top and trace the letter A. Any path you make is a good try!","😊");
  }

  function setupTracing() {
    const canvas = document.querySelector(".trace-canvas"); if (!canvas) return;
    const ctx = canvas.getContext("2d"); ctx.fillStyle="#e1d9f6"; ctx.font="bold 300px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("A",260,205);
    ctx.strokeStyle="#7055b8";ctx.lineWidth=18;ctx.lineCap="round";let drawing=false;
    const point=event=>{const rect=canvas.getBoundingClientRect();return[(event.clientX-rect.left)*(canvas.width/rect.width),(event.clientY-rect.top)*(canvas.height/rect.height)]};
    canvas.addEventListener("pointerdown",event=>{drawing=true;const[x,y]=point(event);ctx.beginPath();ctx.moveTo(x,y);canvas.setPointerCapture(event.pointerId);});
    canvas.addEventListener("pointermove",event=>{if(!drawing)return;const[x,y]=point(event);ctx.lineTo(x,y);ctx.stroke();});
    canvas.addEventListener("pointerup",()=>{drawing=false;BB.audio.pop();});
  }

  function showMemory() {
    const symbols=["🐶","🍎","🐠","🐶","🍎","🐠"].sort(()=>Math.random()-.5);
    modal(`<div class="modal-head"><h2>Memory Match</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><p>Turn over two cards. Find all three pairs.</p><div class="memory-grid">${symbols.map((symbol,index)=>`<button class="memory-card covered" type="button" data-memory-card="${index}" data-symbol="${symbol}" aria-label="Hidden memory card">${symbol}</button>`).join("")}</div>`,"Memory match");
  }

  function flipMemory(button) {
    if (button.classList.contains("matched") || !button.classList.contains("covered")) return;
    button.classList.remove("covered"); button.ariaLabel=button.dataset.symbol;
    const open=[...document.querySelectorAll(".memory-card:not(.covered):not(.matched)")];
    if(open.length===2){if(open[0].dataset.symbol===open[1].dataset.symbol){open.forEach(card=>card.classList.add("matched"));BB.audio.success();pip("A matching pair!","🥳");if(document.querySelectorAll(".memory-card.matched").length===6){BB.rewards.earn("Memory match");updateHeader();}}else{BB.audio.tryAgain();pip("Those are different. Watch them, then try another pair.","🙂");setTimeout(()=>open.forEach(card=>card.classList.add("covered")),850);}}
  }

  function showSorting() {
    modal(`<div class="modal-head"><h2>Sorting Basket</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><p>Where does this belong?</p><div class="sort-item">🍎</div><div class="sort-choice"><button class="big-tile" type="button" data-sort-answer="fruit"><span class="tile-icon">🍓</span>Fruit</button><button class="big-tile" type="button" data-sort-answer="vehicle"><span class="tile-icon">🚗</span>Vehicles</button></div>`,"Sorting game");
  }

  async function refreshVoiceLibrary() {
    const target = document.querySelector("#voice-library-list");
    if (!target) return;
    const clips = await BB.voiceLibrary.list();
    if (!document.body.contains(target)) return;
    target.innerHTML = clips.length
      ? clips.map(clip => `<div class="voice-row"><span aria-hidden="true">🎧</span><strong>${escapeHtml(clip.label)}</strong><small>${clip.source === "recording" ? "Recorded here" : "Uploaded"} • ${Math.max(1,Math.round(clip.size/1024))} KB</small><button class="compact-button" type="button" data-voice-play="${escapeHtml(clip.label)}" aria-label="Play ${escapeHtml(clip.label)}">▶</button><button class="compact-button" type="button" data-voice-delete="${escapeHtml(clip.key)}" aria-label="Delete ${escapeHtml(clip.label)}">🗑️</button></div>`).join("")
      : `<div class="panel"><strong>No family voice clips yet</strong><p>Start with frequently used words such as “Yes,” “No,” “Help,” and “I want water.”</p></div>`;
  }

  async function saveVoiceUpload() {
    const label = document.querySelector("[data-voice-label]")?.value.trim();
    const file = document.querySelector("[data-voice-file]")?.files[0];
    if (!label) { toast("Type the exact word or phrase first"); return; }
    if (!file) { toast("Choose an audio file to upload"); return; }
    if (!file.type.startsWith("audio/")) { toast("Please choose an audio recording"); return; }
    if (file.size > 12 * 1024 * 1024) { toast("Please use an audio clip smaller than 12 MB"); return; }
    try {
      await BB.voiceLibrary.save(label,file,"upload");
      document.querySelector("[data-voice-file]").value = "";
      toast(`Family voice saved for “${label}”`);
      await refreshVoiceLibrary();
    } catch {
      toast("That voice clip could not be saved");
    }
  }

  async function startVoiceRecording() {
    const label = document.querySelector("[data-voice-label]")?.value.trim();
    if (!label) { toast("Type the exact word or phrase before recording"); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast("Voice recording is not supported here. You can upload an audio file instead.");
      return;
    }
    try {
      voiceStream = await navigator.mediaDevices.getUserMedia({audio:true});
      const preferred = ["audio/webm;codecs=opus","audio/webm","audio/mp4"].find(type => MediaRecorder.isTypeSupported(type));
      voiceRecorder = preferred ? new MediaRecorder(voiceStream,{mimeType:preferred}) : new MediaRecorder(voiceStream);
      recordingLabel = label;
      voiceChunks = [];
      voiceRecorder.addEventListener("dataavailable",event=>{if(event.data.size)voiceChunks.push(event.data);});
      voiceRecorder.addEventListener("stop",async()=>{
        const blob = new Blob(voiceChunks,{type:voiceRecorder.mimeType || "audio/webm"});
        voiceStream?.getTracks().forEach(track=>track.stop());
        voiceStream = null;
        try {
          await BB.voiceLibrary.save(recordingLabel,blob,"recording");
          toast(`Recording saved for “${recordingLabel}”`);
          await refreshVoiceLibrary();
        } catch {
          toast("That recording could not be saved");
        }
        document.querySelector('[data-action="start-voice-recording"]')?.removeAttribute("hidden");
        document.querySelector('[data-action="stop-voice-recording"]')?.setAttribute("hidden","");
        const status=document.querySelector("[data-recording-status]");
        if(status) status.textContent="Saved on this device.";
      });
      voiceRecorder.start();
      document.querySelector('[data-action="start-voice-recording"]').setAttribute("hidden","");
      document.querySelector('[data-action="stop-voice-recording"]').removeAttribute("hidden");
      document.querySelector("[data-recording-status]").innerHTML='<i class="recording-light"></i> Recording… say the phrase naturally.';
    } catch {
      toast("Microphone access was not available. You can upload a recording instead.");
    }
  }

  function stopVoiceRecording() {
    if (voiceRecorder?.state === "recording") voiceRecorder.stop();
  }

  function toast(message) {
    toastRoot.innerHTML = `<div class="toast">${escapeHtml(message)}</div>`;
    setTimeout(() => toastRoot.innerHTML = "", 2800);
  }

  function downloadExport() {
    const blob = new Blob([BB.store.exportData()], {type:"application/json"});
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `brightbridge-progress-${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href);
  }

  function handleClick(event) {
    const route = event.target.closest("[data-route]");
    if (route) { BB.navigation.go(route.dataset.route); return; }
    const category = event.target.closest("[data-aac-category]");
    if (category) { aacCategory = category.dataset.aacCategory; view.innerHTML = renderCommunication(); return; }
    const wordButton = event.target.closest("[data-aac-word]");
    if (wordButton) {
      const word = wordButton.dataset.aacWord;
      sentenceText = sentenceText.trim() ? `${sentenceText.trim()} ${word}` : word;
      speakSaved(word);
      BB.store.data.wordUse[word] = (BB.store.data.wordUse[word] || 0) + 1;
      BB.store.data.recentWords = [word,...BB.store.data.recentWords.filter(item=>item!==word)].slice(0,12);
      BB.store.save();
      BB.memoryJourney?.track("communication","First communication card used",{icon:"⭐",detail:word,onceKey:"first-card"});
      view.innerHTML = renderCommunication(); pip(word,"😊",false); return;
    }
    const favorite = event.target.closest("[data-aac-favorite]");
    if (favorite) {
      event.stopPropagation(); const word = favorite.dataset.aacFavorite; const list = BB.store.data.favorites;
      if (list.includes(word)) list.splice(list.indexOf(word),1); else list.push(word); BB.store.save(); view.innerHTML = renderCommunication(); return;
    }
    const openCards = event.target.closest("[data-open-cards]");
    if (openCards) { currentGame = BB.games[openCards.dataset.openCards]; flashIndex = 0; BB.navigation.go("flashcards",{game:currentGame.id}); BB.speech.speak(`${currentGame.cards[0].word}. ${currentGame.cards[0].detail}`); return; }
    const quickFlash = event.target.closest("[data-quick-flash]");
    if (quickFlash) { showQuickFlash(quickFlash.dataset.quickFlash); return; }
    const quickSpeak = event.target.closest("[data-quick-speak]");
    if (quickSpeak) { speakSaved(quickSpeak.dataset.quickSpeak); return; }
    const special = event.target.closest("[data-special-game]");
    if (special) { ({tracing:showTracing,memory:showMemory,sorting:showSorting})[special.dataset.specialGame](); return; }
    const memoryCard = event.target.closest("[data-memory-card]");
    if (memoryCard) { flipMemory(memoryCard); return; }
    const sortAnswer = event.target.closest("[data-sort-answer]");
    if (sortAnswer) { if(sortAnswer.dataset.sortAnswer==="fruit"){BB.audio.success();BB.rewards.earn("Sorting");pip("Yes! An apple is a fruit.","🥳");sortAnswer.parentElement.innerHTML='<div class="success-panel"><div class="success-face">🍎</div><h2>Sorted!</h2><p>Apples grow on trees and belong with fruit.</p></div>';updateHeader();}else{BB.audio.tryAgain();pip("A car is a vehicle, but an apple is food. Try the fruit basket.","🙂");sortAnswer.classList.add("tried");} return; }
    const startGame = event.target.closest("[data-start-game]");
    if (startGame) { currentGame = BB.games[startGame.dataset.startGame]; gameRound = 0; quizLocked = false; BB.navigation.go("game",{game:currentGame.id}); BB.speech.speak(currentGame.rounds[0].prompt); return; }
    const quiz = event.target.closest("[data-quiz-answer]");
    if (quiz) { answerQuiz(Number(quiz.dataset.quizAnswer)); return; }
    const sensory = event.target.closest("[data-sensory-mode]");
    if (sensory) { sensoryMode = sensory.dataset.sensoryMode; view.innerHTML = renderSensory(); setupSensory(); return; }
    const instrument = event.target.closest("[data-instrument]");
    if (instrument) { musicInstrument = instrument.dataset.instrument; view.innerHTML = renderMusic(); return; }
    const note = event.target.closest("[data-note]");
    if (note) { const instrumentData = BB.games.music.instruments[musicInstrument]; BB.audio.note(Number(note.dataset.note),instrumentData.type); BB.memoryJourney?.track("music","Favorite music discovered",{icon:"🎵",detail:musicInstrument,onceKey:"favorite-music"}); note.classList.add("playing"); setTimeout(()=>note.classList.remove("playing"),180); return; }
    const nature = event.target.closest("[data-nature-scene]");
    if (nature) { currentGame = {sceneId:nature.dataset.natureScene}; view.innerHTML = renderNature(); setupNature(nature.dataset.natureScene); return; }
    const feeling = event.target.closest("[data-feeling]");
    if (feeling) { const [name,detail] = feeling.dataset.feeling.split("|"); BB.memoryJourney?.track("emotion","First emotion selected",{icon:"😊",detail:name,onceKey:"first-emotion"}); pip(`${name}. ${detail}`,"😊"); return; }
    const routine = event.target.closest("[data-routine]");
    if (routine) { currentRoutine = routine.dataset.routine; completedRoutineSteps = new Set(); view.innerHTML = renderDaily(); return; }
    const step = event.target.closest("[data-routine-step]");
    if (step) { const index = Number(step.dataset.routineStep); completedRoutineSteps.add(index); const text = BB.games.dailylife.routines[currentRoutine][index][1]; BB.audio.pop(); pip(`${text}. Nice job with this step!`,"😊"); view.innerHTML = renderDaily(); if (completedRoutineSteps.size === BB.games.dailylife.routines[currentRoutine].length) { BB.rewards.earn(currentRoutine); pip(`${currentRoutine} is complete! You followed every step.`,"🥳"); updateHeader(); } return; }
    const social = event.target.closest("[data-social-answer]");
    if (social) {
      const story = BB.games.socialskills.stories[socialIndex]; const index = Number(social.dataset.socialAnswer);
      if (index !== story.answer) { social.classList.add("tried"); document.querySelectorAll("[data-social-answer]")[story.answer].classList.add("hint"); BB.audio.tryAgain(); pip("That choice may not help. Look for the kind and safe choice, then try again.","🙂"); }
      else { BB.audio.success(); BB.rewards.earn("Social skills"); document.querySelector("#social-area").innerHTML = `<div class="success-panel"><div class="success-face">🤝</div><h2>Kind choice!</h2><p>${story.fact}</p></div><button class="primary-button" type="button" data-action="social-next">Next story</button>`; pip(`Yes. ${story.fact}`,"🥳"); updateHeader(); } return;
    }
    const grounding = event.target.closest("[data-grounding]");
    if (grounding) { BB.speech.speak(grounding.dataset.grounding); grounding.classList.add("done"); return; }
    const toggle = event.target.closest("[data-setting-toggle]");
    if (toggle) { BB.settings.update(toggle.dataset.settingToggle,!BB.store.data.settings[toggle.dataset.settingToggle]); BB.navigation.go("settings",{replace:true}); return; }
    const voicePlay = event.target.closest("[data-voice-play]");
    if (voicePlay) { BB.voiceLibrary.play(voicePlay.dataset.voicePlay,BB.store.data.settings.speechVolume); return; }
    const voiceDelete = event.target.closest("[data-voice-delete]");
    if (voiceDelete) {
      if(confirm("Delete this family voice clip from this device?")){
        BB.voiceLibrary.remove(voiceDelete.dataset.voiceDelete).then(()=>{toast("Voice clip deleted");refreshVoiceLibrary();});
      }
      return;
    }
    const pinKey = event.target.closest("[data-pin-key]");
    if(pinKey){
      const input=document.querySelector("[data-pin-input]");if(!input)return;
      const key=pinKey.dataset.pinKey;
      if(key==="clear")input.value="";
      else if(key==="back")input.value=input.value.slice(0,-1);
      else if(input.value.length<4)input.value+=key;
      updatePinDisplay();
      if(input.value.length===4)verifyParentPin();
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action) return;
    switch (action.dataset.action) {
      case "aac-clear": sentenceText=""; view.innerHTML=renderCommunication(); break;
      case "aac-speak": {const phrase=(document.querySelector("#aac-sentence")?.value || sentenceText).trim();sentenceText=phrase;if(phrase){speakSaved(phrase);BB.store.data.recentPhrases.unshift(phrase);BB.store.data.recentPhrases=BB.store.data.recentPhrases.slice(0,20);BB.store.save();BB.memoryJourney?.track("communication","First sentence created",{icon:"💬",detail:phrase,onceKey:"first-sentence"});pip(phrase,"😊",false);}else{pip("Write or choose some words first, then I can say them.","🙂");}} break;
      case "flash-prev": flashIndex=(flashIndex-1+currentGame.cards.length)%currentGame.cards.length;view.innerHTML=renderFlashcards({keepIndex:true});BB.speech.speak(`${currentGame.cards[flashIndex].word}. ${currentGame.cards[flashIndex].detail}`);break;
      case "flash-next": flashIndex=(flashIndex+1)%currentGame.cards.length;view.innerHTML=renderFlashcards({keepIndex:true});BB.speech.speak(`${currentGame.cards[flashIndex].word}. ${currentGame.cards[flashIndex].detail}`);break;
      case "flash-speak": speakSaved(`${currentGame.cards[flashIndex].word}. ${currentGame.cards[flashIndex].detail}`);break;
      case "quiz-speak": speakSaved(currentGame.rounds[gameRound].prompt);break;
      case "quiz-next": if(gameRound===currentGame.rounds.length-1){modal(`<div class="breathing"><div class="pip-face">🏆</div><h2>Adventure complete!</h2><p>You kept trying and learned something new.</p><button class="primary-button" type="button" data-action="finish-game">Back to learning</button></div>`,"Adventure complete");pip("Adventure complete! I am proud of how you kept trying.","🥳");}else{gameRound++;quizLocked=false;view.innerHTML=renderGame();BB.speech.speak(currentGame.rounds[gameRound].prompt);}break;
      case "finish-game": closeModal();BB.navigation.go("learning");break;
      case "breathing": showBreathing();break;
      case "grounding": showGrounding();break;
      case "trace-clear": showTracing();break;
      case "social-next": socialIndex=(socialIndex+1)%BB.games.socialskills.stories.length;view.innerHTML=renderSocial();break;
      case "parent-pin": showPinModal();break;
      case "verify-pin": verifyParentPin();break;
      case "change-pin": modal(`<div class="modal-head"><h2>Change parent PIN</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><input class="select" style="width:100%" type="password" inputmode="numeric" maxlength="4" data-new-pin placeholder="New 4-digit PIN"><button class="primary-button" type="button" data-action="save-pin">Save PIN</button>`,"Change parent PIN");break;
      case "add-profile": modal(`<div class="modal-head"><h2>Add child profile</h2><button class="close-button" type="button" data-action="close-modal">×</button></div><label class="setting-row"><span><strong>Name</strong></span><input class="select" data-new-profile-name maxlength="30" placeholder="Explorer name"></label><label class="setting-row"><span><strong>Avatar</strong></span><select class="select" data-new-profile-avatar><option>🌟</option><option>🦋</option><option>🐳</option><option>🌈</option><option>🚀</option></select></label><button class="primary-button" type="button" data-action="save-profile">Add profile</button>`,"Add child profile");break;
      case "save-profile": {const name=document.querySelector("[data-new-profile-name]").value.trim();if(!name){toast("Please add a name");break;}const id=`child-${Date.now()}`;BB.store.data.profiles.push({id,name,avatar:document.querySelector("[data-new-profile-avatar]").value});BB.store.data.activeProfile=id;BB.store.save();closeModal();BB.navigation.go("parent",{replace:true});toast("Profile added");}break;
      case "save-voice-upload": saveVoiceUpload();break;
      case "start-voice-recording": startVoiceRecording();break;
      case "stop-voice-recording": stopVoiceRecording();break;
      case "save-pin": {const pin=document.querySelector("[data-new-pin]").value;if(/^\d{4}$/.test(pin)){BB.store.data.settings.parentPin=pin;BB.store.save();closeModal();toast("Parent PIN changed");}else toast("Use exactly four numbers");}break;
      case "export": downloadExport();break;
      case "reset": if(confirm("Reset all BrightBridge progress, settings, family voice clips, Voice Journey recordings, and private letters on this device?")){Promise.all([BB.voiceLibrary.clear(),BB.memoryJourney.clear()]).finally(()=>{BB.store.reset();parentUnlocked=false;BB.accessibility.apply();BB.navigation.go("home");});}break;
      case "close-modal": closeModal();break;
      case "modal-overlay": if(event.target===action)closeModal();break;
      case "repeat-pip": BB.speech.repeat();break;
      case "install": installPrompt?.prompt();break;
    }
  }

  function handleInput(event) {
    if (event.target.matches("[data-pin-input]")) updatePinDisplay();
    if (event.target.matches("#aac-sentence")) sentenceText = event.target.value;
    if (event.target.matches("[data-setting-range]")) BB.settings.update(event.target.dataset.settingRange,Number(event.target.value));
    if (event.target.matches("[data-setting-select]")) BB.settings.update(event.target.dataset.settingSelect,event.target.value);
    if (event.target.matches("[data-profile-name]")) {const profile=BB.store.data.profiles.find(item=>item.id===BB.store.data.activeProfile);if(profile){profile.name=event.target.value;BB.store.save();}}
    if (event.target.matches("[data-profile-select]")) {BB.store.data.activeProfile=event.target.value;BB.store.save();BB.navigation.go("parent",{replace:true});}
  }

  document.addEventListener("click",handleClick);
  document.addEventListener("input",handleInput);
  document.addEventListener("keydown",event=>{if(event.key==="Escape")closeModal();});
  document.addEventListener("keydown",event=>{if(event.key==="Enter"&&event.target.matches("[data-pin-input]"))verifyParentPin();});
  window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installPrompt=event;document.querySelector('[data-action="install"]').hidden=false;});
  window.addEventListener("bb:reward",() => updateHeader());
  window.addEventListener("bb:voice-sequence",event=>toast(`Playing ${event.detail.count} matching family recordings in order.`));
  window.addEventListener("error",event=>{console.error(event.error);toast("Something paused. Please try that touch again.");});

  function init() {
    BB.accessibility.apply();
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./service-worker.js").catch(error => console.warn("Offline mode unavailable",error));
    }
    BB.navigation.go("home",{replace:true});
    const guidedRoute = BB.mobileTools.restoreGuided();
    if (guidedRoute) BB.navigation.go(guidedRoute,{replace:true});
  }

  window.BB = window.BB || {};
  BB.app = { render, pip, modal, closeModal, toast, isParentUnlocked: () => parentUnlocked };
  init();
})();
