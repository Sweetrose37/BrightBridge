(function () {
  window.BB = window.BB || {}; BB.games = BB.games || {};
  BB.games.colors = {
    id:"colors",title:"Color Garden",icon:"🌈",color:"#ffe3dc",description:"Discover colors all around us",
    cards:[
      {symbol:"🔴",word:"Red",detail:"Red like an apple.",emoji:"🍎"},
      {symbol:"🔵",word:"Blue",detail:"Blue like the sky.",emoji:"☁️"},
      {symbol:"🟡",word:"Yellow",detail:"Yellow like sunshine.",emoji:"☀️"},
      {symbol:"🟢",word:"Green",detail:"Green like a leaf.",emoji:"🌿"},
      {symbol:"🟣",word:"Purple",detail:"Purple like grapes.",emoji:"🍇"},
      {symbol:"🟠",word:"Orange",detail:"Orange like an orange.",emoji:"🍊"}
    ],
    rounds:[
      {prompt:"Tap the red flower",visual:"🌱  🌱  🌱",options:[["🌺","Red"],["🪻","Blue"],["🌻","Yellow"]],answer:0,fact:"Red can look warm, like apples and ladybugs."},
      {prompt:"Which one is blue?",visual:"☁️  🦋  ☁️",options:[["🟣","Purple"],["🔵","Blue"],["🟢","Green"]],answer:1,fact:"Blue is the color of a clear sky and deep water."},
      {prompt:"Find sunny yellow",visual:"☀️  🌿  ☀️",options:[["🟢","Green"],["🟠","Orange"],["🟡","Yellow"]],answer:2,fact:"Yellow is bright like sunshine and bananas."}
    ]
  };
})();
