(function () {
  "use strict";
  const defaults = {
    version: 1,
    stars: 0,
    flowers: 0,
    butterflies: 0,
    stickers: [],
    achievements: [],
    progress: {},
    favorites: [],
    recentWords: [],
    recentPhrases: [],
    wordUse: {},
    screenSeconds: 0,
    activityVisits: {},
    memoryJourney: {
      events: [],
      birthdaySnapshots: [],
      growthPath: {
        stage: "early-explorer",
        automatic: false,
        locked: false,
        matureContent: false,
        enabledFeatures: {
          communication: true,
          learning: true,
          sensory: true,
          music: true,
          nature: true,
          emotions: true,
          rewards: true
        }
      }
    },
    profiles: [{ id: "child-1", name: "My Explorer", avatar: "🌟" }],
    activeProfile: "child-1",
    mobileTools: {
      schedule: [],
      firstThen: { first: "", then: "" },
      choices: [],
      guided: false,
      guidedRoute: "learning",
      promptLevel: "full"
    },
    settings: {
      speech: true,
      speechRate: 0.86,
      speechVolume: 0.9,
      effects: true,
      effectsVolume: 0.45,
      music: true,
      musicVolume: 0.25,
      dark: false,
      highContrast: false,
      largeText: false,
      reducedMotion: false,
      animationSpeed: 1,
      simpleMode: false,
      colorFriendly: false,
      notifications: false,
      offlineMode: true,
      language: "en-US",
      difficulty: "starter",
      parentPin: "2468"
    }
  };
  const key = "brightbridge-pwa-v1";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function merge(base, saved) {
    const result = { ...base, ...saved };
    result.settings = { ...base.settings, ...(saved?.settings || {}) };
    result.progress = saved?.progress || {};
    result.activityVisits = saved?.activityVisits || {};
    result.wordUse = saved?.wordUse || {};
    result.mobileTools = { ...base.mobileTools, ...(saved?.mobileTools || {}) };
    result.mobileTools.firstThen = { ...base.mobileTools.firstThen, ...(saved?.mobileTools?.firstThen || {}) };
    result.memoryJourney = { ...base.memoryJourney, ...(saved?.memoryJourney || {}) };
    result.memoryJourney.events = saved?.memoryJourney?.events || [];
    result.memoryJourney.birthdaySnapshots = saved?.memoryJourney?.birthdaySnapshots || [];
    result.memoryJourney.growthPath = { ...base.memoryJourney.growthPath, ...(saved?.memoryJourney?.growthPath || {}) };
    result.memoryJourney.growthPath.enabledFeatures = {
      ...base.memoryJourney.growthPath.enabledFeatures,
      ...(saved?.memoryJourney?.growthPath?.enabledFeatures || {})
    };
    result.profiles = saved?.profiles?.length ? saved.profiles : clone(base.profiles);
    result.profiles = result.profiles.map(profile => ({
      birthDate: "",
      ...profile
    }));
    return result;
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      return saved ? merge(clone(defaults), saved) : clone(defaults);
    } catch {
      return clone(defaults);
    }
  }

  const data = load();

  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent("bb:state", { detail: data }));
    } catch {
      // BrightBridge remains usable when private browsing blocks persistence.
    }
  }

  function reset() {
    const fresh = clone(defaults);
    Object.keys(data).forEach(item => delete data[item]);
    Object.assign(data, fresh);
    save();
  }

  function exportData() {
    return JSON.stringify({
      app: "BrightBridge",
      exportedAt: new Date().toISOString(),
      data
    }, null, 2);
  }

  window.BB = window.BB || {};
  BB.store = { data, save, reset, exportData, defaults };

  window.setInterval(() => {
    data.screenSeconds += 30;
    save();
  }, 30000);
})();
