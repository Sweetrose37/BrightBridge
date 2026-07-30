(function () {
  "use strict";
  function apply() {
    const settings = BB.store.data.settings;
    document.body.classList.toggle("dark", settings.dark);
    document.body.classList.toggle("high-contrast", settings.highContrast);
    document.body.classList.toggle("large-text", settings.largeText);
    document.body.classList.toggle("reduced-motion", settings.reducedMotion);
    document.body.classList.toggle("simple-mode", settings.simpleMode);
    document.body.classList.toggle("color-friendly", settings.colorFriendly);
    document.body.classList.toggle("hide-encouragement-helper", settings.showEncouragementHelper === false);
    document.documentElement.style.setProperty("--motion-speed", settings.reducedMotion ? "0" : String(settings.animationSpeed || 1));
  }

  window.BB = window.BB || {};
  BB.accessibility = { apply };
  window.addEventListener("bb:state", apply);
})();
