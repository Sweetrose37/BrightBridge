(function () {
  "use strict";

  const expansions = {
    Quick: [
      ["Help", "🆘"], ["Stop", "✋"], ["Wait", "⏳"], ["Go", "🟢"],
      ["Again", "🔁"], ["Different", "🔄"], ["I do not know", "🤷"],
      ["I understand", "💡"], ["I do not understand", "❓"],
      ["I am ready", "✅"], ["Not yet", "⏸️"], ["My turn", "☝️"],
      ["Your turn", "👉"], ["Look", "👀"], ["Listen", "👂"],
      ["Come here", "👋"], ["I need a break", "🌿"], ["Bathroom", "🚻"],
      ["I am hungry", "🍽️"], ["I am thirsty", "💧"], ["It hurts", "🩹"],
      ["I feel sick", "🤒"], ["I need space", "↔️"], ["Too loud", "🔇"],
      ["Too bright", "☀️"], ["I am happy", "😊"], ["I am sad", "😢"],
      ["I am scared", "😨"], ["I am angry", "😠"], ["I am tired", "😴"]
    ],
    Needs: [
      ["I need help", "🆘"], ["I need a break", "🌿"], ["I need the bathroom", "🚻"],
      ["I need food", "🍽️"], ["I need a drink", "💧"], ["I need medicine", "💊"],
      ["I need my caregiver", "🧑‍🤝‍🧑"], ["I need more time", "⏳"],
      ["I need quiet", "🤫"], ["I need headphones", "🎧"], ["I need space", "↔️"],
      ["I need to move", "🏃"], ["I need to sit down", "🪑"],
      ["I need to lie down", "🛏️"], ["I need a hug", "🤗"],
      ["I need my comfort item", "🧸"], ["I need a different choice", "🔄"],
      ["Please show me", "👀"], ["Please write it down", "✍️"], ["Please say it again", "🔁"]
    ],
    "Pain & Body": [
      ["It hurts", "🩹"], ["Show me where", "👉"], ["My head hurts", "🤕"],
      ["My ear hurts", "👂"], ["My eye hurts", "👁️"], ["My mouth hurts", "👄"],
      ["My tooth hurts", "🦷"], ["My throat hurts", "🗣️"], ["My chest hurts", "🫁"],
      ["My stomach hurts", "🤢"], ["My back hurts", "🧍"], ["My arm hurts", "💪"],
      ["My hand hurts", "✋"], ["My leg hurts", "🦵"], ["My foot hurts", "🦶"],
      ["It is itchy", "🖐️"], ["I feel dizzy", "💫"], ["I feel sick", "🤒"],
      ["I feel hot", "🔥"], ["I feel cold", "❄️"], ["Small pain", "1️⃣"],
      ["Medium pain", "2️⃣"], ["Big pain", "3️⃣"], ["I need a doctor", "🩺"]
    ],
    "Food & Drink": [
      ["I am hungry", "🍽️"], ["I am thirsty", "💧"], ["I want water", "💧"],
      ["I want milk", "🥛"], ["I want juice", "🧃"], ["I want a snack", "🍎"],
      ["I want breakfast", "🥣"], ["I want lunch", "🥪"], ["I want dinner", "🍽️"],
      ["More please", "➕"], ["All done eating", "✅"], ["I do not like this", "🙅"],
      ["I want something different", "🔄"], ["Too hot", "🔥"], ["Too cold", "❄️"],
      ["Open it please", "📦"], ["Cut it please", "🔪"], ["Help me eat", "🥄"],
      ["Spoon", "🥄"], ["Fork", "🍴"], ["Cup", "🥤"], ["Plate", "🍽️"]
    ],
    People: [
      ["Mom", "👩"], ["Dad", "👨"], ["Parent", "🧑"], ["Caregiver", "🧑‍🤝‍🧑"],
      ["Grandma", "👵"], ["Grandpa", "👴"], ["Brother", "👦"], ["Sister", "👧"],
      ["Family", "👪"], ["Friend", "🧑‍🤝‍🧑"], ["Teacher", "🧑‍🏫"],
      ["Therapist", "🧑‍⚕️"], ["Doctor", "🩺"], ["Nurse", "👩‍⚕️"],
      ["Bus driver", "🚌"], ["Police officer", "👮"], ["Trusted adult", "🧑‍🤝‍🧑"],
      ["I know this person", "✅"], ["I do not know this person", "❓"]
    ],
    Places: [
      ["Home", "🏠"], ["School", "🏫"], ["Classroom", "📚"], ["Bathroom", "🚻"],
      ["Kitchen", "🍳"], ["Bedroom", "🛏️"], ["Playground", "🛝"], ["Park", "🌳"],
      ["Store", "🛒"], ["Library", "📚"], ["Doctor's office", "🩺"],
      ["Therapy", "🧩"], ["Restaurant", "🍽️"], ["Car", "🚗"], ["Bus", "🚌"],
      ["Outside", "🌤️"], ["Inside", "🏠"], ["I want to go home", "🏠"],
      ["Where are we going?", "🧭"]
    ],
    Activities: [
      ["Play", "🧸"], ["Read", "📖"], ["Draw", "🎨"], ["Color", "🖍️"],
      ["Write", "✍️"], ["Sing", "🎵"], ["Dance", "💃"], ["Listen to music", "🎧"],
      ["Watch a video", "📺"], ["Build", "🧱"], ["Puzzle", "🧩"], ["Game", "🎮"],
      ["Go outside", "🌳"], ["Swing", "🛝"], ["Walk", "🚶"], ["Run", "🏃"],
      ["Rest", "🛏️"], ["Help cook", "🍳"], ["Clean up", "🧹"],
      ["I want to do this", "☝️"], ["I do not want this activity", "🙅"]
    ],
    "Sensory & Calming": [
      ["Too loud", "🔇"], ["Too bright", "☀️"], ["Too crowded", "👥"],
      ["This smells too strong", "👃"], ["I do not like how this feels", "🖐️"],
      ["I need headphones", "🎧"], ["I need dim lights", "🌙"],
      ["I need quiet", "🤫"], ["I need space", "↔️"], ["I need pressure", "🤗"],
      ["I need to move", "🏃"], ["I need a sensory break", "🌈"],
      ["I need my comfort item", "🧸"], ["I want to breathe", "☁️"],
      ["I want calm music", "🎵"], ["I want to rock", "🪑"],
      ["Please do not touch me", "✋"], ["I am getting overwhelmed", "🌊"],
      ["I feel calm now", "😌"], ["It is too dark", "🌑"],
      ["I do not like this smell", "👃"], ["I do not like this texture", "🖐️"],
      ["Please lower the sound", "🔉"], ["Please turn off the light", "💡"],
      ["I need a quiet room", "🚪"], ["I need deep pressure", "🤗"],
      ["I need my weighted blanket", "🛏️"], ["I need to stim", "🌈"],
      ["A hug would help", "🤗"], ["No hug please", "✋"],
      ["I am calming down", "😌"], ["Please wait", "⏳"], ["Stay with me", "🧑‍🤝‍🧑"]
    ],
    Feelings: [
      ["Happy", "😊"], ["Sad", "😢"], ["Angry", "😠"], ["Calm", "😌"],
      ["Scared", "😨"], ["Tired", "😴"], ["Excited", "🤩"], ["Frustrated", "😣"],
      ["I am happy", "😊"], ["I am sad", "😢"], ["I am angry", "😠"],
      ["I am scared", "😨"], ["I am worried", "😟"], ["I am frustrated", "😣"],
      ["I am excited", "🤩"], ["I am tired", "😴"], ["I am confused", "😕"],
      ["I am calm", "😌"], ["I am lonely", "🫶"], ["I am embarrassed", "😳"],
      ["I am nervous", "😬"], ["I am overwhelmed", "🌊"],
      ["I am uncomfortable", "😖"], ["I am proud", "🌟"], ["I am bored", "🥱"],
      ["I am surprised", "😮"], ["I feel safe", "🛟"], ["I do not feel safe", "⚠️"]
    ],
    "Social Communication": [
      ["Hello", "👋"], ["Goodbye", "👋"], ["Please", "🙏"], ["Thank you", "🌟"],
      ["You are welcome", "😊"], ["Excuse me", "🙋"], ["I am sorry", "💜"],
      ["Can I play?", "🧸"], ["Can I have a turn?", "☝️"], ["Your turn", "👉"],
      ["I want to share", "🤝"], ["Do you want to play?", "🧩"],
      ["How are you?", "😊"], ["I am listening", "👂"], ["Tell me more", "💬"],
      ["I agree", "👍"], ["I disagree", "👎"], ["That was funny", "😄"],
      ["I need time to answer", "⏳"], ["Please let me finish", "✋"],
      ["I want to talk about something else", "🔄"], ["I do not want to talk right now", "🤫"]
    ],
    "Daily Routines": [
      ["Wake up", "🌅"], ["Use the bathroom", "🚻"], ["Wash hands", "🧼"],
      ["Brush teeth", "🪥"], ["Brush hair", "🪮"], ["Take a bath", "🛁"],
      ["Take a shower", "🚿"], ["Get dressed", "👕"], ["Eat breakfast", "🥣"],
      ["Go to school", "🏫"], ["Come home", "🏠"], ["Eat lunch", "🥪"],
      ["Eat dinner", "🍽️"], ["Take medicine", "💊"], ["Do homework", "✏️"],
      ["Clean up", "🧹"], ["Put on pajamas", "🛌"], ["Story time", "📖"],
      ["Go to sleep", "😴"], ["What happens next?", "➡️"],
      ["Show me my schedule", "📅"]
    ],
    "School & Learning": [
      ["I am ready to learn", "✅"], ["I need help", "🆘"], ["I have a question", "❓"],
      ["Please repeat that", "🔁"], ["Please show me", "👀"], ["Please write it down", "✍️"],
      ["I need more time", "⏳"], ["I need a break", "🌿"], ["I understand", "💡"],
      ["I do not understand", "🤔"], ["I finished my work", "✅"],
      ["I am still working", "✏️"], ["This is too hard", "🧗"], ["This is too easy", "🪶"],
      ["I know the answer", "🙋"], ["I need a quieter place", "🤫"],
      ["Can I use my headphones?", "🎧"], ["Can I use my communication cards?", "💬"],
      ["I need my schedule", "📅"], ["What comes next?", "➡️"],
      ["Reading", "📖"], ["Math", "🔢"], ["Writing", "✍️"], ["Art", "🎨"],
      ["Lunch", "🥪"], ["Recess", "🛝"]
    ],
    Safety: [
      ["Stop", "✋"], ["No", "👎"], ["Do not touch me", "🛑"],
      ["I need space", "↔️"], ["I do not feel safe", "⚠️"],
      ["I need a trusted adult", "🧑‍🤝‍🧑"], ["Call my caregiver", "📞"],
      ["Call 911", "🚨"], ["I am lost", "🧭"], ["I need medical help", "🚑"],
      ["I cannot speak", "💬"], ["Please read my cards", "📱"],
      ["I do not know this person", "❓"], ["I need to leave", "🚪"],
      ["This is an emergency", "🚨"], ["My address is on my emergency card", "🏠"]
    ]
  };

  const equivalentPhrases = new Map([
    ["i dont know", "i do not know"],
    ["i dont understand", "i do not understand"],
    ["dont touch me", "do not touch me"],
    ["please dont touch me", "please do not touch me"],
    ["my tummy hurts", "my stomach hurts"],
    ["repeat please", "please repeat that"],
    ["again please", "please say it again"],
    ["it is too loud", "too loud"],
    ["it is too bright", "too bright"],
    ["do not touch me", "please do not touch me"],
    ["dont touch me", "please do not touch me"],
    ["i need to rock", "i want to rock"],
    ["i need to breathe", "i want to breathe"]
  ]);

  const eligibleParentVoiceCategories = Object.freeze(["Quick", "Feelings", "Sensory & Calming", "Learn to Talk", "Book Narration"]);

  function normalizePhrase(value) {
    return String(value || "")
      .normalize("NFKC")
      .trim()
      .toLocaleLowerCase()
      .replace(/[’‘`']/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function equivalentKey(value) {
    const normalized = normalizePhrase(value);
    return equivalentPhrases.get(normalized) || normalized;
  }

  function cardId(category, phrase) {
    const text = `${normalizePhrase(category)}-${equivalentKey(phrase)}`
      .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return `aac-${text || "card"}`;
  }

  function dedupeCategory(category, cards, report = []) {
    const kept = new Map();
    cards.forEach(card => {
      const phrase = String(card?.[0] || "").trim();
      if (!phrase) return;
      const key = equivalentKey(phrase);
      if (kept.has(key)) {
        report.push({ category, kept: kept.get(key)[0], merged: phrase, reason: "normalized or equivalent phrase" });
        return;
      }
      kept.set(key, [phrase, card[1] || "💬"]);
    });
    return [...kept.values()];
  }

  function mergeCatalog(baseCatalog) {
    const report = [];
    const merged = {};
    Object.entries(baseCatalog || {}).forEach(([category, cards]) => {
      merged[category] = dedupeCategory(category, cards, report);
    });
    Object.entries(expansions).forEach(([category, cards]) => {
      merged[category] = dedupeCategory(category, [...(merged[category] || []), ...cards], report);
    });
    return { catalog: merged, report };
  }

  function findDuplicate(phrase, category, builtInCatalog, customCards = [], ignoreId = "") {
    const key = equivalentKey(phrase);
    const categoryKey = normalizePhrase(category || "Custom");
    const builtInCategory = Object.keys(builtInCatalog || {}).find(name => normalizePhrase(name) === categoryKey);
    const builtIn = (builtInCatalog?.[builtInCategory] || []).find(card => equivalentKey(card[0]) === key);
    if (builtIn) return { type: "built-in", phrase: builtIn[0], category: builtInCategory };
    const custom = customCards.find(card =>
      card.id !== ignoreId &&
      normalizePhrase(card.category || "Custom") === categoryKey &&
      equivalentKey(card.label) === key
    );
    return custom ? { type: "custom", phrase: custom.label, category, id: custom.id } : null;
  }

  function model(catalog) {
    return Object.entries(catalog).flatMap(([category, cards]) => cards.map(([phrase, icon]) => ({
      id: cardId(category, phrase),
      phrase,
      normalizedPhrase: equivalentKey(phrase),
      categoryId: normalizePhrase(category).replace(/\s+/g, "-"),
      category,
      iconName: icon,
      imagePath: "",
      defaultAudioPath: "",
      parentAudioId: "",
      language: "en-US",
      active: true,
      sortOrder: 0,
      createdAt: "built-in",
      updatedAt: "built-in",
      parentVoiceEnabled: eligibleParentVoiceCategories.includes(category)
    })));
  }

  window.BB_COMMUNICATION_CARDS = {
    expansions, normalizePhrase, equivalentKey, cardId, dedupeCategory,
    mergeCatalog, findDuplicate, model, eligibleParentVoiceCategories,
    isParentVoiceEligible(category) {
      return eligibleParentVoiceCategories.includes(category);
    }
  };
})();
