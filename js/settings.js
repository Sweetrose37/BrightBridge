(function () {
  "use strict";
  const booleanSettings = {
    speech: ["Family voice playback", "Play uploaded or recorded family voice clips"],
    effects: ["Gentle effects", "Play taps, pops, and success notes"],
    music: ["Calm music", "Allow quiet background music"],
    dark: ["Dark mode", "Use softer colors in dim rooms"],
    highContrast: ["High contrast", "Make borders and words stand out"],
    largeText: ["Large text", "Make words and controls larger"],
    reducedMotion: ["Reduce motion", "Keep movement and celebrations still"],
    simpleMode: ["Simple mode", "Show fewer choices at one time"],
    colorFriendly: ["Color-friendly palette", "Use colors with stronger differences"],
    notifications: ["Gentle reminders", "Allow optional activity reminders"],
    offlineMode: ["Offline mode", "Keep core activities available without internet"]
  };

  function switchRow(key) {
    const [title, description] = booleanSettings[key];
    const on = BB.store.data.settings[key];
    return `<div class="setting-row"><span><strong>${title}</strong><small>${description}</small></span>
      <button class="switch ${on ? "on" : ""}" type="button" role="switch" aria-checked="${on}" data-setting-toggle="${key}" aria-label="${title}"><i></i></button></div>`;
  }

  function render() {
    const settings = BB.store.data.settings;
    return `<section>
      ${BB.navigation.pageHead("Comfort settings", "Make BrightBridge feel just right.", "home")}
      <div class="setting-group"><h3>🔊 Voice & sound</h3>
        ${switchRow("speech")}
        <label class="setting-row"><span><strong>Family voice volume</strong></span><input class="range" type="range" min="0" max="1" step=".05" value="${settings.speechVolume}" data-setting-range="speechVolume"></label>
        ${switchRow("effects")}<label class="setting-row"><span><strong>Effects volume</strong></span><input class="range" type="range" min="0" max="1" step=".05" value="${settings.effectsVolume}" data-setting-range="effectsVolume"></label>
        ${switchRow("music")}<label class="setting-row"><span><strong>Music volume</strong></span><input class="range" type="range" min="0" max="1" step=".05" value="${settings.musicVolume}" data-setting-range="musicVolume"></label>
      </div>
      <div class="setting-group"><h3>👀 Look & movement</h3>${switchRow("dark")}${switchRow("highContrast")}${switchRow("largeText")}${switchRow("reducedMotion")}
        <label class="setting-row"><span><strong>Animation speed</strong><small>Slow to lively, never flashing</small></span><input class="range" type="range" min=".6" max="1.4" step=".1" value="${settings.animationSpeed}" data-setting-range="animationSpeed"></label>${switchRow("colorFriendly")}</div>
      <div class="setting-group"><h3>🧩 Learning</h3>${switchRow("simpleMode")}
        <label class="setting-row"><span><strong>Language</strong></span><select class="select" data-setting-select="language"><option value="en-US" ${settings.language === "en-US" ? "selected" : ""}>English (US)</option><option value="en-GB" ${settings.language === "en-GB" ? "selected" : ""}>English (UK)</option><option value="es-US" ${settings.language === "es-US" ? "selected" : ""}>Español</option></select></label>
        <label class="setting-row"><span><strong>Difficulty</strong><small>Adjusts the number of choices</small></span><select class="select" data-setting-select="difficulty"><option value="starter" ${settings.difficulty === "starter" ? "selected" : ""}>Starter</option><option value="growing" ${settings.difficulty === "growing" ? "selected" : ""}>Growing</option><option value="adventure" ${settings.difficulty === "adventure" ? "selected" : ""}>Adventure</option></select></label>
      </div>
      <div class="setting-group"><h3>📱 App</h3>${switchRow("offlineMode")}${switchRow("notifications")}</div>
      <p class="privacy-note">🔒 Your child’s activity stays on this device. No ads. No tracking.</p>
    </section>`;
  }

  function update(key, value) {
    BB.store.data.settings[key] = value;
    BB.store.save();
    BB.accessibility.apply();
    if (key === "notifications" && value && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  window.BB = window.BB || {};
  BB.settings = { render, update };
})();
