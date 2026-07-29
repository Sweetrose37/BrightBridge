(function () {
  window.BB = window.BB || {}; BB.games = BB.games || {};
  BB.games.emotions = {
    id:"emotions",title:"Feeling Friends",icon:"😊",color:"#fff0c7",description:"Name feelings and learn calming tools",
    cards:[
      {symbol:"😊",word:"Happy",detail:"My face may smile when I feel happy.",emoji:"☀️"},
      {symbol:"😢",word:"Sad",detail:"It is okay to feel sad. I can ask for comfort.",emoji:"💙"},
      {symbol:"😠",word:"Angry",detail:"I can pause and take slow breaths.",emoji:"🌬️"},
      {symbol:"😌",word:"Calm",detail:"My body feels quiet and safe.",emoji:"☁️"},
      {symbol:"🤩",word:"Excited",detail:"My body may feel full of happy energy.",emoji:"🎉"},
      {symbol:"😨",word:"Scared",detail:"I can say help and find a safe grown-up.",emoji:"🤝"},
      {symbol:"😣",word:"Frustrated",detail:"I can take a break and try again later.",emoji:"⏸️"},
      {symbol:"😴",word:"Tired",detail:"My body may need rest.",emoji:"🌙"}
    ],
    rounds:[
      {prompt:"Who looks happy?",visual:"Feelings give us clues",options:[["😊","Happy"],["😢","Sad"],["😴","Tired"]],answer:0,fact:"A smile can be one clue that someone feels happy."},
      {prompt:"Find the calm face",visual:"Breathe in… and out…",options:[["😠","Angry"],["😨","Scared"],["😌","Calm"]],answer:2,fact:"Slow breathing can help our bodies feel calm."},
      {prompt:"Who may need some rest?",visual:"🌙 Bedtime",options:[["🤩","Excited"],["😴","Tired"],["😊","Happy"]],answer:1,fact:"When we feel tired, a quiet rest can help."}
    ]
  };
})();
