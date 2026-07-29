(function () {
  window.BB = window.BB || {}; BB.games = BB.games || {};
  BB.games.alphabet = {
    id:"alphabet", title:"Alphabet Forest", icon:"🔤", color:"#e9e1ff",
    description:"Letters, sounds, and first words",
    cards:[
      {symbol:"A",word:"Apple",detail:"A says ah, like apple.",emoji:"🍎"},
      {symbol:"B",word:"Ball",detail:"B says buh, like ball.",emoji:"⚽"},
      {symbol:"C",word:"Cat",detail:"C says kuh, like cat.",emoji:"🐱"},
      {symbol:"D",word:"Dog",detail:"D says duh, like dog.",emoji:"🐶"},
      {symbol:"E",word:"Egg",detail:"E says eh, like egg.",emoji:"🥚"},
      {symbol:"F",word:"Fish",detail:"F says fff, like fish.",emoji:"🐠"}
    ],
    rounds:[
      {prompt:"Find the letter A",visual:"🍎 Apple",options:[["A","Letter A"],["B","Letter B"],["C","Letter C"]],answer:0,fact:"A is for apple. A says ah."},
      {prompt:"Which letter starts Ball?",visual:"⚽ Ball",options:[["D","D"],["B","B"],["F","F"]],answer:1,fact:"Ball begins with B. B says buh."},
      {prompt:"Find the cat sound: C",visual:"🐱 Cat",options:[["C","C"],["E","E"],["A","A"]],answer:0,fact:"Cat begins with C. C can say kuh."}
    ]
  };
})();
