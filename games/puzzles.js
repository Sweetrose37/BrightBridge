(function () {
  window.BB = window.BB || {}; BB.games = BB.games || {};
  BB.games.puzzles = {
    id:"puzzles",title:"Pattern Parade",icon:"🎈",color:"#e9e1ff",description:"Predict what comes next",
    cards:[
      {symbol:"🔴 🔵",word:"AB Pattern",detail:"Two things take turns.",emoji:"🔴🔵"},
      {symbol:"● ● ★",word:"AAB Pattern",detail:"Two same, then one different.",emoji:"●●★"},
      {symbol:"👏 ☝️",word:"Movement Pattern",detail:"Patterns can move and sound.",emoji:"🎵"}
    ],
    rounds:[
      {prompt:"What comes next?",visual:"🔴  🔵  🔴  🔵  ?",options:[["🔴","Red"],["🔵","Blue"],["🟢","Green"]],answer:0,fact:"This pattern repeats red, blue."},
      {prompt:"Finish the animal pattern",visual:"🐱  🐶  🐱  🐶  ?",options:[["🐶","Dog"],["🐱","Cat"],["🐰","Rabbit"]],answer:1,fact:"The cat and dog take turns."},
      {prompt:"What shape is next?",visual:"●  ●  ★   ●  ●  ?",options:[["●","Circle"],["■","Square"],["★","Star"]],answer:2,fact:"This pattern has two circles and then one star."}
    ]
  };
})();
