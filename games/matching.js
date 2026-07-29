(function () {
  window.BB = window.BB || {}; BB.games = BB.games || {};
  BB.games.matching = {
    id:"matching",title:"Matching Meadow",icon:"🧩",color:"#fff0c7",description:"Match animals, foods, and homes",
    cards:[
      {symbol:"🐶",word:"Dog",detail:"A dog matches a bone.",emoji:"🦴"},
      {symbol:"🐝",word:"Bee",detail:"A bee visits a flower.",emoji:"🌻"},
      {symbol:"🐠",word:"Fish",detail:"A fish lives in water.",emoji:"🌊"},
      {symbol:"🐦",word:"Bird",detail:"A bird can live in a nest.",emoji:"🪹"}
    ],
    rounds:[
      {prompt:"What matches the dog?",visual:"🐶",options:[["🦴","Bone"],["🌻","Flower"],["🌊","Water"]],answer:0,fact:"Dogs enjoy bones and chew toys."},
      {prompt:"Where does the fish live?",visual:"🐠",options:[["🪹","Nest"],["🌊","Water"],["🌳","Tree"]],answer:1,fact:"Fish live and swim in water."},
      {prompt:"What does a bee visit?",visual:"🐝",options:[["🚗","Car"],["🛏️","Bed"],["🌻","Flower"]],answer:2,fact:"Bees visit flowers to collect nectar."}
    ]
  };
})();
