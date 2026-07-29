(function () {
  "use strict";
  let context;
  let musicTimer;

  function audioContext() {
    context ||= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === "suspended") context.resume();
    return context;
  }

  function tone(frequency, duration = 0.25, type = "sine", volume, channel = "effects") {
    if (!BB.store.data.settings[channel]) return;
    const ctx = audioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const level = volume ?? BB.store.data.settings.effectsVolume;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, level * 0.22), ctx.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration + 0.03);
  }

  function success() {
    tone(523.25, 0.22);
    setTimeout(() => tone(659.25, 0.22), 110);
    setTimeout(() => tone(783.99, 0.32), 220);
  }

  function tryAgain() {
    tone(392, 0.18, "sine", 0.2);
  }

  function pop() {
    tone(340 + Math.random() * 280, 0.12, "sine", 0.25);
  }

  function note(frequency, instrument = "sine") {
    tone(frequency, 0.55, instrument, BB.store.data.settings.musicVolume, "music");
  }

  function startCalmMusic() {
    stopMusic();
    if (!BB.store.data.settings.music) return;
    const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
    let index = 0;
    musicTimer = setInterval(() => {
      tone(notes[index++ % notes.length], 1.3, "sine", BB.store.data.settings.musicVolume, "music");
    }, 1450);
  }

  function stopMusic() {
    clearInterval(musicTimer);
    musicTimer = null;
  }

  window.BB = window.BB || {};
  BB.audio = { tone, note, success, tryAgain, pop, startCalmMusic, stopMusic };
})();
