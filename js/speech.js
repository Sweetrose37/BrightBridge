(function () {
  "use strict";
  let lastMessage = "";

  async function speak(message) {
    lastMessage = message;
    const settings = BB.store.data.settings;
    if (!settings.speech) return false;
    const played = await BB.voiceLibrary.play(message, settings.speechVolume);
    if (!played) {
      window.dispatchEvent(new CustomEvent("bb:missing-voice", { detail: { message } }));
    }
    return played;
  }

  function stop() {
    BB.voiceLibrary.stop();
  }

  function repeat() {
    if (lastMessage) speak(lastMessage);
  }

  window.BB = window.BB || {};
  BB.speech = { speak, stop, repeat, get lastMessage() { return lastMessage; } };
})();
