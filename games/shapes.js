(function () {
  window.BB = window.BB || {}; BB.games = BB.games || {};
  BB.games.shapes = {
    id:"shapes",title:"Shape Town",icon:"🔷",color:"#ddf5ed",description:"Circles, squares, triangles, and more",
    cards:[
      {symbol:"●",word:"Circle",detail:"A circle is round with no corners.",emoji:"⚽"},
      {symbol:"■",word:"Square",detail:"A square has four equal sides.",emoji:"🪟"},
      {symbol:"▲",word:"Triangle",detail:"A triangle has three sides.",emoji:"⛺"},
      {symbol:"★",word:"Star",detail:"A star has bright points.",emoji:"⭐"},
      {symbol:"♥",word:"Heart",detail:"A heart is a symbol of love.",emoji:"💗"}
    ],
    rounds:[
      {prompt:"Find the circle",visual:"Round and smooth",options:[["●","Circle"],["■","Square"],["▲","Triangle"]],answer:0,fact:"A circle is round and has no corners."},
      {prompt:"Which shape has 3 sides?",visual:"Count: 1, 2, 3",options:[["■","Square"],["▲","Triangle"],["●","Circle"]],answer:1,fact:"A triangle has three sides and three corners."},
      {prompt:"Find the square",visual:"Four equal sides",options:[["★","Star"],["●","Circle"],["■","Square"]],answer:2,fact:"A square has four equal sides."}
    ]
  };
})();
