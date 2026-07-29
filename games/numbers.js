(function () {
  window.BB = window.BB || {}; BB.games = BB.games || {};
  BB.games.numbers = {
    id:"numbers",title:"Counting Cove",icon:"🐠",color:"#dcefff",description:"Numbers and counting 1 to 10",
    cards:[
      {symbol:"1",word:"One",detail:"One sun in the sky.",emoji:"☀️"},
      {symbol:"2",word:"Two",detail:"Two friendly fish.",emoji:"🐠🐠"},
      {symbol:"3",word:"Three",detail:"Three little turtles.",emoji:"🐢🐢🐢"},
      {symbol:"4",word:"Four",detail:"Four bright stars.",emoji:"⭐⭐⭐⭐"},
      {symbol:"5",word:"Five",detail:"Five fingers on one hand.",emoji:"🖐️"}
    ],
    rounds:[
      {prompt:"How many fish?",visual:"🐠  🐠",options:[["1","One"],["2","Two"],["3","Three"]],answer:1,fact:"There are two fish. One and one more makes two."},
      {prompt:"Count the turtles",visual:"🐢  🐢  🐢",options:[["2","Two"],["3","Three"],["4","Four"]],answer:1,fact:"There are three turtles. Three comes after two."},
      {prompt:"Find the number five",visual:"🐚 🐚 🐚 🐚 🐚",options:[["5","Five"],["4","Four"],["3","Three"]],answer:0,fact:"Five is the number of fingers on one hand."}
    ]
  };
})();
