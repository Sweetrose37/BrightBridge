(function () {
  window.BB = window.BB || {}; BB.games = BB.games || {};
  BB.games.music = {
    instruments: {
      piano: { label:"Piano", icon:"🎹", type:"sine", notes:[261.63,293.66,329.63,349.23,392,440,493.88,523.25] },
      bells: { label:"Bells", icon:"🔔", type:"sine", notes:[523.25,587.33,659.25,698.46,783.99,880] },
      drums: { label:"Drums", icon:"🥁", type:"triangle", notes:[90,120,160,200,240,300] },
      xylophone: { label:"Xylophone", icon:"🎶", type:"square", notes:[329.63,392,493.88,587.33,659.25,783.99] }
    }
  };
})();
