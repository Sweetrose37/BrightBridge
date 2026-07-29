(function(){
  "use strict";
  window.BB=window.BB||{};BB.games=BB.games||{};
  const make=(id,title,icon,color,description,cards,rounds)=>({id,title,icon,color,description,cards,rounds});
  BB.games.phonics=make("phonics","Phonics","🔤","#ffe6d9","Hear beginning sounds.",[
    {symbol:"B",word:"B says buh",emoji:"⚽",detail:"Ball begins with B."},{symbol:"M",word:"M says mmm",emoji:"🌙",detail:"Moon begins with M."},{symbol:"S",word:"S says sss",emoji:"☀️",detail:"Sun begins with S."},{symbol:"T",word:"T says tuh",emoji:"🐢",detail:"Turtle begins with T."}
  ],[
    {prompt:"Which begins with B?",visual:"B · buh",options:[["⚽","Ball"],["🐱","Cat"],["🌙","Moon"]],answer:0,fact:"Ball begins with the B sound."},{prompt:"Which begins with S?",visual:"S · sss",options:[["🐢","Turtle"],["☀️","Sun"],["⚽","Ball"]],answer:1,fact:"Sun begins with the S sound."}
  ]);
  BB.games.counting=make("counting","Counting","🧮","#e6f4ff","Count objects from one to ten.",[
    {symbol:"●",word:"One",emoji:"1️⃣",detail:"One dot."},{symbol:"● ●",word:"Two",emoji:"2️⃣",detail:"Two dots."},{symbol:"● ● ●",word:"Three",emoji:"3️⃣",detail:"Three dots."},{symbol:"● ● ● ● ●",word:"Five",emoji:"5️⃣",detail:"Five dots."}
  ],[
    {prompt:"How many stars?",visual:"⭐ ⭐ ⭐",options:[["2️⃣","Two"],["3️⃣","Three"],["4️⃣","Four"]],answer:1,fact:"There are three stars."},{prompt:"How many apples?",visual:"🍎 🍎",options:[["1️⃣","One"],["2️⃣","Two"],["3️⃣","Three"]],answer:1,fact:"There are two apples."}
  ]);
  BB.games.patterns=make("patterns","Patterns","🟣","#f0e5ff","Notice what comes next.",[
    {symbol:"🔵 🟡 🔵 🟡",word:"AB Pattern",emoji:"➡️",detail:"Two things repeat."},{symbol:"⭐ ⭐ 🌙 ⭐ ⭐ 🌙",word:"AAB Pattern",emoji:"➡️",detail:"Two stars, then one moon."},{symbol:"🔺 🟦 🟢",word:"ABC Pattern",emoji:"➡️",detail:"Three things repeat."}
  ],[
    {prompt:"What comes next?",visual:"🔴 🔵 🔴 🔵 ?",options:[["🔴","Red"],["🔵","Blue"],["🟢","Green"]],answer:0,fact:"The red and blue pattern repeats."},{prompt:"What comes next?",visual:"⭐ ⭐ 🌙 ⭐ ⭐ ?",options:[["☀️","Sun"],["🌙","Moon"],["⭐","Star"]],answer:1,fact:"Two stars are followed by one moon."}
  ]);
  BB.games.animals=make("animals","Animals","🐾","#e1f5e8","Meet familiar animals.",[
    {symbol:"🐶",word:"Dog",emoji:"🏠",detail:"A dog may bark."},{symbol:"🐱",word:"Cat",emoji:"🏠",detail:"A cat may meow."},{symbol:"🐘",word:"Elephant",emoji:"🌍",detail:"An elephant has a trunk."},{symbol:"🐠",word:"Fish",emoji:"🌊",detail:"A fish swims in water."}
  ],[
    {prompt:"Which animal swims?",visual:"🌊",options:[["🐶","Dog"],["🐠","Fish"],["🐘","Elephant"]],answer:1,fact:"Fish use fins to swim."},{prompt:"Which animal has a trunk?",visual:"🌍",options:[["🐘","Elephant"],["🐱","Cat"],["🐠","Fish"]],answer:0,fact:"An elephant uses its trunk in many ways."}
  ]);
  BB.games.food=make("food","Food","🍎","#fff0d5","Learn familiar foods.",[
    {symbol:"🍎",word:"Apple",emoji:"🔴",detail:"An apple is a fruit."},{symbol:"🥕",word:"Carrot",emoji:"🟠",detail:"A carrot is a vegetable."},{symbol:"🥪",word:"Sandwich",emoji:"🍽️",detail:"A sandwich can have many fillings."},{symbol:"🥛",word:"Milk",emoji:"🥤",detail:"Milk is a drink."}
  ],[
    {prompt:"Which is a fruit?",visual:"🍽️",options:[["🍎","Apple"],["🥕","Carrot"],["🥪","Sandwich"]],answer:0,fact:"An apple is a fruit."},{prompt:"Which is a drink?",visual:"🥤",options:[["🥕","Carrot"],["🥛","Milk"],["🍎","Apple"]],answer:1,fact:"Milk is a drink."}
  ]);
  BB.games.naturelearn=make("naturelearn","Nature Learning","🌿","#ddf5ed","Learn about plants, animals, oceans, and space.",[
    {symbol:"🌱",word:"Seedling",emoji:"🌧️",detail:"A seedling is a young plant."},{symbol:"🐝",word:"Pollinator",emoji:"🌸",detail:"Bees help many flowers make seeds."},{symbol:"🌊",word:"Ocean",emoji:"🐠",detail:"Many animals live in the ocean."},{symbol:"🌙",word:"Moon",emoji:"🌍",detail:"The moon travels around Earth."}
  ],[
    {prompt:"What helps many flowers?",visual:"🌸",options:[["🐝","Bee"],["🚗","Car"],["🧸","Toy"]],answer:0,fact:"Bees carry pollen between flowers."},{prompt:"Where does a fish live?",visual:"🐠",options:[["🌊","Ocean"],["🏜️","Desert"],["☁️","Cloud"]],answer:0,fact:"Fish live in water."}
  ]);
  BB.games.vehicles=make("vehicles","Vehicles","🚌","#e3efff","Explore ways people travel.",[
    {symbol:"🚗",word:"Car",emoji:"🛣️",detail:"A car travels on roads."},{symbol:"🚌",word:"Bus",emoji:"🏫",detail:"A bus carries many people."},{symbol:"🚲",word:"Bicycle",emoji:"⛑️",detail:"Wear a helmet on a bicycle."},{symbol:"✈️",word:"Airplane",emoji:"☁️",detail:"An airplane flies in the sky."}
  ],[
    {prompt:"Which vehicle flies?",visual:"☁️",options:[["🚌","Bus"],["✈️","Airplane"],["🚲","Bicycle"]],answer:1,fact:"An airplane flies in the sky."},{prompt:"Which needs a helmet?",visual:"⛑️",options:[["🚲","Bicycle"],["🚗","Car"],["✈️","Airplane"]],answer:0,fact:"A helmet helps protect a bicycle rider."}
  ]);
  BB.games.weather=make("weather","Weather","🌦️","#dff4ff","Notice changes outside.",[
    {symbol:"☀️",word:"Sunny",emoji:"🕶️",detail:"The sun shines brightly."},{symbol:"🌧️",word:"Rainy",emoji:"☂️",detail:"Rain falls from clouds."},{symbol:"❄️",word:"Snowy",emoji:"🧤",detail:"Snow is cold."},{symbol:"💨",word:"Windy",emoji:"🍃",detail:"Wind moves the air."}
  ],[
    {prompt:"What helps on a rainy day?",visual:"🌧️",options:[["☂️","Umbrella"],["🕶️","Sunglasses"],["🩴","Sandals"]],answer:0,fact:"An umbrella can help keep us dry."},{prompt:"Which weather is cold?",visual:"🧤",options:[["☀️","Sunny"],["❄️","Snowy"],["🌈","Rainbow"]],answer:1,fact:"Snow is frozen water and feels cold."}
  ]);
  BB.games.bodyparts=make("bodyparts","Body Parts","🧍","#ffe8e8","Name parts of the body.",[
    {symbol:"👀",word:"Eyes",emoji:"👁️",detail:"Eyes help many people see."},{symbol:"👂",word:"Ears",emoji:"🎵",detail:"Ears help many people hear."},{symbol:"✋",word:"Hands",emoji:"🤲",detail:"Hands can touch and hold."},{symbol:"🦶",word:"Feet",emoji:"👣",detail:"Feet help us stand and move."}
  ],[
    {prompt:"Which body part can listen?",visual:"🎵",options:[["👂","Ears"],["✋","Hands"],["🦶","Feet"]],answer:0,fact:"Ears help many people hear sounds."},{prompt:"Which body part can hold?",visual:"🤲",options:[["👀","Eyes"],["✋","Hands"],["👂","Ears"]],answer:1,fact:"Hands can touch and hold objects."}
  ]);
  BB.games.helpers=make("helpers","Community Helpers","🧑‍🤝‍🧑","#e9f7ef","Learn about helpers in the community.",[
    {symbol:"🧑‍🏫",word:"Teacher",emoji:"🏫",detail:"A teacher helps people learn."},{symbol:"🧑‍⚕️",word:"Doctor",emoji:"🏥",detail:"A doctor helps care for health."},{symbol:"🧑‍🚒",word:"Firefighter",emoji:"🚒",detail:"A firefighter helps during fires."},{symbol:"📬",word:"Mail carrier",emoji:"✉️",detail:"A mail carrier delivers mail."}
  ],[
    {prompt:"Who helps at school?",visual:"🏫",options:[["🧑‍🏫","Teacher"],["🧑‍🚒","Firefighter"],["📬","Mail carrier"]],answer:0,fact:"Teachers help students learn."},{prompt:"Who may arrive in a fire truck?",visual:"🚒",options:[["🧑‍⚕️","Doctor"],["🧑‍🚒","Firefighter"],["🧑‍🏫","Teacher"]],answer:1,fact:"Firefighters respond to fire emergencies."}
  ]);
  BB.games.sorting=make("sorting","Sorting","🧺","#f1eaff","Put similar things together.",[
    {symbol:"🍎 🍌",word:"Fruit group",emoji:"🧺",detail:"Apples and bananas are fruits."},{symbol:"🔴 🔵",word:"Color group",emoji:"🎨",detail:"Things can be sorted by color."},{symbol:"🔺 ⬜",word:"Shape group",emoji:"📐",detail:"Things can be sorted by shape."}
  ],[
    {prompt:"Which belongs with fruit?",visual:"🍎 🍌",options:[["🍓","Strawberry"],["🚗","Car"],["👟","Shoe"]],answer:0,fact:"A strawberry is a fruit."},{prompt:"Which is a shape?",visual:"🔺 ⬜",options:[["🐶","Dog"],["⭕","Circle"],["🥛","Milk"]],answer:1,fact:"A circle is a shape."}
  ]);
  BB.games.tracing=make("tracing","Tracing","✍️","#fff1c9","Follow lines and letter shapes.",[
    {symbol:"A · · · A",word:"Trace A",emoji:"✍️",detail:"Start at the top and follow the lines."},{symbol:"○ · · · ○",word:"Trace a circle",emoji:"☝️",detail:"Move around and return to the start."},{symbol:"1 · · · 1",word:"Trace 1",emoji:"✍️",detail:"Move down in one straight line."}
  ],[
    {prompt:"Which line is curved?",visual:"〰️",options:[["〰️","Curved"],["—","Straight"],["⚫","Dot"]],answer:0,fact:"A curved line bends smoothly."},{prompt:"Which shape is round?",visual:"✍️",options:[["⭕","Circle"],["⬛","Square"],["🔺","Triangle"]],answer:0,fact:"A circle is round."}
  ]);
  BB.games.memorygame=make("memorygame","Memory","🧠","#e8e5ff","Remember and find matching pictures.",[
    {symbol:"🍎 🍎",word:"Matching pair",emoji:"🧠",detail:"A pair has two matching pictures."},{symbol:"⭐ ? ⭐",word:"Remember the star",emoji:"👀",detail:"Keep the picture in mind."},{symbol:"🐶 🐱 🐶",word:"Find the match",emoji:"🐾",detail:"The dogs match."}
  ],[
    {prompt:"Remember: ⭐. Which did you see?",visual:"🙈",options:[["🌙","Moon"],["⭐","Star"],["☀️","Sun"]],answer:1,fact:"You remembered the star."},{prompt:"Which pictures match?",visual:"👀",options:[["🍎 🍎","Two apples"],["🍎 🍌","Apple and banana"],["🐶 🐱","Dog and cat"]],answer:0,fact:"The two apples match."}
  ]);
  BB.games.socialskills.stories.push(
    {title:"Sharing",icon:"🧸",prompt:"A friend would like to use a toy. What can you do?",options:["Hide every toy","Offer a turn when I am ready","Throw the toy"],answer:1,fact:"Sharing can mean offering a turn while keeping boundaries clear."},
    {title:"Waiting",icon:"⏳",prompt:"A grown-up is helping someone else. What can you do?",options:["Use my wait card or timer","Scream at them","Walk into danger"],answer:0,fact:"A wait card, timer, or quiet activity can make waiting clearer."},
    {title:"Listening",icon:"👂",prompt:"Someone is telling you something important. What is a helpful choice?",options:["Look, listen, or use my best attention","Run away without telling anyone","Cover their mouth"],answer:0,fact:"Listening can look different. Looking, pausing, or using AAC can all show attention."},
    {title:"Kindness",icon:"💜",prompt:"Someone feels sad. What could be kind?",options:["Laugh at them","Ask if they want help","Take their things"],answer:1,fact:"We can offer help while respecting whether someone wants it."}
  );
  BB.games.music.instruments.nature={label:"Nature Sounds",icon:"🌿",type:"sine",notes:[174.61,220,261.63,329.63,392,523.25]};
  BB.games.lifeskills=make("lifeskills","Life Skills","🏠","#e6f1ff","Practice planning, cooking, cleaning, and home routines.",[{symbol:"🧺",word:"Laundry",emoji:"👕",detail:"Sort clothes and follow the care directions."},{symbol:"🍳",word:"Simple meal",emoji:"🥣",detail:"Follow safe steps with support when needed."}],[{prompt:"What is a safe first step before cooking?",visual:"🍳",options:[["🧼","Wash hands"],["🏃","Run"],["📱","Ignore the directions"]],answer:0,fact:"Clean hands are a helpful first step before preparing food."}]);
  BB.games.employment=make("employment","Employment Readiness","💼","#edf0f5","Explore strengths, schedules, and workplace communication.",[{symbol:"🗓️",word:"Work schedule",emoji:"⏰",detail:"A schedule shows when work begins and ends."},{symbol:"🙋",word:"Ask for help",emoji:"💬",detail:"Self-advocacy belongs at work too."}],[{prompt:"What can help you arrive prepared?",visual:"💼",options:[["🗓️","Check the schedule"],["❓","Guess every time"],["🛌","Ignore the time"]],answer:0,fact:"Checking a schedule can make work expectations clearer."}]);
  BB.games.community=make("community","Community Navigation","🗺️","#e2f3ed","Practice safe routes, transportation, and asking for help.",[{symbol:"🚌",word:"Bus route",emoji:"🗺️",detail:"Check the route and stop before traveling."},{symbol:"📍",word:"Safe location",emoji:"🏪",detail:"Know where to ask a trusted person for help."}],[{prompt:"What should you check before taking a bus?",visual:"🚌",options:[["🗺️","Route and stop"],["🎲","A random number"],["🌙","Moon phase"]],answer:0,fact:"The route and stop help you reach the right place."}]);
  BB.games.money=make("money","Financial Literacy","💳","#fff0cc","Practice prices, saving, and safe spending.",[{symbol:"💵",word:"Budget",emoji:"📝",detail:"A budget is a plan for money."},{symbol:"🏦",word:"Save",emoji:"🎯",detail:"Saving can help with a future goal."}],[{prompt:"Which is a plan for money?",visual:"💵",options:[["📝","Budget"],["🎈","Balloon"],["🌦️","Weather"]],answer:0,fact:"A budget helps plan spending and saving."}]);
  BB.games.advocacy=make("advocacy","Self-Advocacy","📣","#eee6ff","Practice choices, boundaries, accommodations, and consent.",[{symbol:"✋",word:"I do not consent",emoji:"🛑",detail:"You can communicate a boundary."},{symbol:"🧩",word:"I need an accommodation",emoji:"💬",detail:"Ask for support that helps access and participation."}],[{prompt:"What can you say when you need support?",visual:"💬",options:[["🧩","I need an accommodation"],["🤐","I am never allowed to ask"],["❌","My needs do not matter"]],answer:0,fact:"Self-advocacy includes asking for helpful accommodations."}]);
  BB.games.wellness=make("wellness","Health & Wellness","🫶","#e2f4f5","Support sleep, movement, healthcare, and emotional regulation.",[{symbol:"😴",word:"Rest",emoji:"🌙",detail:"Rest supports the body and mind."},{symbol:"🩺",word:"Health appointment",emoji:"📅",detail:"Prepare questions and communication supports."}],[{prompt:"What can help at a health appointment?",visual:"🩺",options:[["📝","Bring questions"],["🚫","Hide every concern"],["🎲","Guess the instructions"]],answer:0,fact:"Prepared questions and AAC can support healthcare communication."}]);
})();
