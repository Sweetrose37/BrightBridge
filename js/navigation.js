(function () {
  "use strict";
  let current = "home";
  const history = [];

  function pageHead(title, subtitle, back = "home") {
    return `<div class="page-head"><button class="back-button" type="button" data-route="${back}" aria-label="Go back">←</button><div class="page-head-copy"><h1>${title}</h1><p>${subtitle}</p></div></div>`;
  }

  function go(route, options = {}) {
    if (!options.replace && current !== route) history.push(current);
    current = route;
    BB.audio.stopMusic();
    BB.speech.stop();
    BB.app.render(route, options);
    document.querySelectorAll(".bottom-nav [data-route]").forEach(button => {
      button.classList.toggle("active", button.dataset.route === route);
    });
    document.querySelector("#view").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: BB.store.data.settings.reducedMotion ? "auto" : "smooth" });
  }

  function back() {
    go(history.pop() || "home", { replace: true });
  }

  window.BB = window.BB || {};
  BB.navigation = { go, back, pageHead, get current() { return current; } };
})();
