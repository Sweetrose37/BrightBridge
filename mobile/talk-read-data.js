(function () {
  "use strict";

  const levels = [
    { id:"listening-sounds", icon:"👂", title:"Listening & Sounds", description:"Listen, match, and explore gentle sounds.", kind:"sound", prompts:[
      ["sound-ah","👄","Ah","Listen to the gentle sound: ah."],["sound-oh","⭕","Oh","Listen to the gentle sound: oh."],
      ["sound-ee","😁","Ee","Listen to the gentle sound: ee."],["sound-mm","😋","Mm","Listen to the humming sound: mm."],
      ["sound-ba","🫧","Ba","Listen to the sound: ba."],["sound-pa","🎈","Pa","Listen to the sound: pa."],
      ["sound-ma","💜","Ma","Listen to the sound: ma."],["sound-da","⭐","Da","Listen to the sound: da."],
      ["sound-la","🎵","La","Listen to the sound: la."],["sound-woof","🐶","Woof","A dog says woof."],
      ["sound-meow","🐱","Meow","A cat says meow."],["sound-beep","🚗","Beep","A car horn can beep."],["sound-pop","🫧","Pop","A bubble can pop."]
    ]},
    { id:"first-sounds", icon:"🔤", title:"First Sounds", description:"Watch, listen, and take a turn with beginning sounds.", kind:"sound", prompts:[
      ["first-m","M","M","Lips together. Listen: mmm."],["first-b","B","B","Lips together, then open. Listen: buh."],
      ["first-p","P","P","A soft puff of air. Listen: puh."],["first-d","D","D","Tongue near the top teeth. Listen: duh."],
      ["first-t","T","T","A gentle tap sound. Listen: tuh."],["first-n","N","N","Listen to the humming sound: nnn."],
      ["first-h","H","H","A soft breath. Listen: huh."],["first-w","W","W","Round lips gently. Listen: wuh."]
    ]},
    { id:"first-words", icon:"🌱", title:"First Words", description:"Useful early words for everyday communication.", kind:"word", prompts:[
      ["word-mom","👩","Mom","Mom"],["word-dad","👨","Dad","Dad"],["word-hi","👋","Hi","Hi"],["word-bye","👋","Bye","Bye"],
      ["word-more","➕","More","More"],["word-help","🆘","Help","Help"],["word-stop","✋","Stop","Stop"],["word-go","🟢","Go","Go"],
      ["word-up","⬆️","Up","Up"],["word-down","⬇️","Down","Down"],["word-eat","🍽️","Eat","Eat"],["word-drink","🥤","Drink","Drink"],
      ["word-water","💧","Water","Water"],["word-milk","🥛","Milk","Milk"],["word-ball","⚽","Ball","Ball"],["word-book","📖","Book","Book"],
      ["word-car","🚗","Car","Car"],["word-dog","🐶","Dog","Dog"],["word-cat","🐱","Cat","Cat"],["word-bed","🛏️","Bed","Bed"],
      ["word-bath","🛁","Bath","Bath"],["word-yes","👍","Yes","Yes"],["word-no","👎","No","No"],["word-please","🙏","Please","Please"],
      ["word-mine","🫶","Mine","Mine"],["word-open","🔓","Open","Open"],["word-close","🔒","Close","Close"],["word-again","🔁","Again","Again"],
      ["word-done","✅","Done","Done"],["word-home","🏠","Home","Home"]
    ]},
    { id:"everyday-words", icon:"🏠", title:"Everyday Words", description:"Explore useful words by familiar category.", kind:"word", prompts:[
      ["every-family","👨‍👩‍👧","Family","Family"],["every-food","🍎","Food","Food"],["every-drink","💧","Drink","Drink"],
      ["every-shirt","👕","Shirt","Shirt"],["every-toy","🧸","Toy","Toy"],["every-animal","🐾","Animal","Animal"],
      ["every-hand","✋","Hand","Hand"],["every-school","🏫","School","School"],["every-home","🏠","Home","Home"],
      ["every-play","🧩","Play","Play"],["every-big","🐘","Big","Big"],["every-safe","🛟","Safe","Safe"],
      ["every-happy","😊","Happy","Happy"],["every-quiet","🤫","Quiet","Quiet"]
    ]},
    { id:"two-word-phrases", icon:"💬", title:"Two-Word Phrases", description:"Put two useful words together.", kind:"phrase", prompts:[
      ["phrase-more-water","💧","More water","More water"],["phrase-want-snack","🍎","Want snack","Want snack"],
      ["phrase-help-me","🆘","Help me","Help me"],["phrase-my-turn","☝️","My turn","My turn"],
      ["phrase-go-outside","🌳","Go outside","Go outside"],["phrase-mom-come","👩","Mom come","Mom come"],
      ["phrase-dad-help","👨","Dad help","Dad help"],["phrase-open-please","🔓","Open please","Open please"],
      ["phrase-all-done","✅","All done","All done"],["phrase-no-thank-you","🙅","No thank you","No thank you"],
      ["phrase-big-ball","⚽","Big ball","Big ball"],["phrase-red-car","🚗","Red car","Red car"],
      ["phrase-feel-sad","😢","Feel sad","Feel sad"],["phrase-need-quiet","🤫","Need quiet","Need quiet"],
      ["phrase-want-book","📖","Want book","Want book"],["phrase-more-time","⏳","More time","More time"],
      ["phrase-stop-please","✋","Stop please","Stop please"],["phrase-sit-down","🪑","Sit down","Sit down"],
      ["phrase-come-here","👋","Come here","Come here"],["phrase-play-again","🧩","Play again","Play again"]
    ]},
    { id:"short-sentences", icon:"🗨️", title:"Short Sentences", description:"Practice clear, useful sentences.", kind:"phrase", prompts:[
      ["sentence-water","💧","I want water.","I want water."],["sentence-help","🆘","I need help.","I need help."],
      ["sentence-sad","😢","I feel sad.","I feel sad."],["sentence-break","🌿","I need a break.","I need a break."],
      ["sentence-come","👋","Please come here.","Please come here."],["sentence-home","🏠","I want to go home.","I want to go home."],
      ["sentence-loud","🔇","It is too loud.","It is too loud."],["sentence-dislike","🙅","I do not like that.","I do not like that."],
      ["sentence-turn","☝️","Can I have a turn?","Can I have a turn?"],["sentence-play","🧩","I want to play.","I want to play."],
      ["sentence-parent","🧑","Please call my parent.","Please call my parent."],["sentence-bathroom","🚻","I need the bathroom.","I need the bathroom."],
      ["sentence-ready","✅","I am ready.","I am ready."],["sentence-not-ready","⏸️","I am not ready.","I am not ready."],
      ["sentence-else","🔄","I want something else.","I want something else."]
    ]},
    { id:"questions-answers", icon:"❓", title:"Questions & Answers", description:"Listen to a question and answer in any comfortable way.", kind:"question", prompts:[
      ["question-want","🧸","What do you want?","What do you want?"],["question-who","👤","Who is this?","Who is this?"],
      ["question-ball","⚽","Where is the ball?","Where is the ball?"],["question-feel","😊","How do you feel?","How do you feel?"],
      ["question-more","➕","Do you want more?","Do you want more?"],["question-yours","🫵","Is this yours?","Is this yours?"],
      ["question-color","🎨","What color is it?","What color is it?"],["question-doing","🏃","What are you doing?","What are you doing?"],
      ["question-go","🧭","Where do you want to go?","Where do you want to go?"],["question-help","🆘","Do you need help?","Do you need help?"]
    ]},
    { id:"feelings-needs", icon:"😊", title:"Feelings & Needs", description:"Practice self-advocacy with shared communication cards.", kind:"phrase", prompts:[
      ["need-happy","😊","I feel happy.","I feel happy."],["need-scared","😨","I feel scared.","I feel scared."],
      ["need-overwhelmed","🌊","I feel overwhelmed.","I feel overwhelmed."],["need-quiet","🤫","I need quiet.","I need quiet."],
      ["need-break","🌿","I need a break.","I need a break."],["need-headphones","🎧","I need my headphones.","I need my headphones."],
      ["need-no-touch","✋","Please do not touch me.","Please do not touch me."],["need-parent","🧑","I want my parent.","I want my parent."],
      ["need-unsafe","⚠️","I do not feel safe.","I do not feel safe."],["need-medical","🩺","I need medical help.","I need medical help."]
    ]},
    { id:"social-communication", icon:"🤝", title:"Social Communication", description:"Practice respectful choices without forced eye contact or touch.", kind:"phrase", prompts:[
      ["social-hello","👋","Hello","Hello"],["social-goodbye","👋","Goodbye","Goodbye"],
      ["social-play","🧩","Can I play?","Can I play?"],["social-turn","☝️","Can I have a turn?","Can I have a turn?"],
      ["social-thanks","🙏","Thank you","Thank you"],["social-no","🙅","No thank you","No thank you"],
      ["social-stop","✋","Please stop","Please stop"],["social-space","↔️","I need space","I need space"],
      ["social-name","🙂","What is your name?","What is your name?"],["social-adult","🧑","I need a trusted adult","I need a trusted adult"]
    ]},
    { id:"conversation-practice", icon:"🗣️", title:"Conversation Practice", description:"Short, predictable scenes with visual responses.", kind:"conversation", prompts:[
      ["scene-home","🏠","At home","I want to tell you about my day."],["scene-class","🏫","In class","I need help with my work."],
      ["scene-daycare","🧸","At daycare","Can I join this activity?"],["scene-playground","🛝","At the playground","Can I play too?"],
      ["scene-doctor","🩺","At the doctor","This is where it hurts."],["scene-therapy","🧩","At therapy","I need a short break."],
      ["scene-store","🛒","At the store","Please stay with me."],["scene-restaurant","🍽️","At a restaurant","I would like water, please."],
      ["scene-new-person","👋","Meeting someone","Hello. My name is..."],["scene-help","🆘","Asking for help","I need help, please."],
      ["scene-feelings","😊","Talking about feelings","I feel overwhelmed right now."],["scene-sensory","🎧","Explaining a sensory need","It is too loud for me."],
      ["scene-day","🌤️","Talking about the day","Something I liked today was..."]
    ]}
  ].map(level => ({ ...level, prompts:level.prompts.map(([id,icon,label,text])=>({id,icon,label,text})) }));

  const books = [
    { id:"sounds-around-my-day",title:"Sounds Around My Day",cover:"👂",ageGroup:"1-3",abilityLevel:"Listening & Sounds",category:"First Words",description:"A calm day of familiar sounds and first words.",pages:[
      ["sounds-p1","🌅","Morning is here. The birds say tweet.","Tweet",["Bird","Morning"],"What sound do the birds make?"],
      ["sounds-p2","🐶","The dog says woof by the door.","Woof",["Dog","Door"],"Who says woof?"],
      ["sounds-p3","🥣","My spoon taps the bowl. Tap, tap.","Tap tap",["Spoon","Bowl"],"What is tapping?"],
      ["sounds-p4","🚗","Outside, a car says beep.","Beep",["Car","Outside"],"What says beep?"],
      ["sounds-p5","🌙","At night I say, good night.","Good night",["Night","Bed"],"What can we say at bedtime?"]
    ]},
    { id:"milo-asks-for-help",title:"Milo Asks for Help",cover:"🆘",ageGroup:"3-5",abilityLevel:"Short Sentences",category:"Communication Practice",description:"Milo uses words and pictures to ask for assistance.",pages:[
      ["milo-p1","🥤","Milo cannot reach his favorite cup.","I need help, please.",["I need help","I can do it","All done"],"What can Milo say?"],
      ["milo-p2","🧑","Milo taps his help card. A grown-up listens.","I need help",["I need help","Wait","No"],"Which card asks for help?"],
      ["milo-p3","🤝","The grown-up brings the cup closer.","Thank you",["Thank you","Goodbye"],"What can Milo say now?"],
      ["milo-p4","😊","Milo got support without having to do it alone.","I can ask for help",["Help","Happy"],"What did Milo practice?"]
    ]},
    { id:"layla-finds-a-quiet-space",title:"Layla Finds a Quiet Space",cover:"🎧",ageGroup:"5-7",abilityLevel:"Feelings & Needs",category:"Calm & Sensory",description:"Layla notices a sensory need and asks for a calm space.",pages:[
      ["layla-p1","🏫","The classroom becomes busy and loud.","It is too loud.",["Too loud","Play again"],"What does Layla notice?"],
      ["layla-p2","🌊","Layla's body feels overwhelmed. She can communicate in her own way.","I need quiet.",["I need quiet","More music"],"What support can Layla request?"],
      ["layla-p3","🎧","Layla shows her headphones card to the teacher.","I need my headphones.",["I need headphones","I am hungry"],"Which support did she choose?"],
      ["layla-p4","🚪","The teacher helps Layla find a quiet space.","Thank you for helping me.",["Thank you","Stop"],"How did the adult help?"],
      ["layla-p5","😌","Layla takes her time. She returns when she is ready.","I am ready.",["I am ready","Not yet"],"Who decides when Layla is ready?"]
    ]},
    { id:"jordan-tells-the-teacher",title:"Jordan Tells the Teacher",cover:"🧑‍🏫",ageGroup:"7-9",abilityLevel:"Questions & Answers",category:"Safety",description:"Jordan explains a problem and gets support from a trusted adult.",pages:[
      ["jordan-p1","🏫","Jordan notices that something at school does not feel safe.","I do not feel safe.",["I do not feel safe","I want a game"],"What can Jordan communicate?"],
      ["jordan-p2","🧑‍🏫","Jordan goes to a trusted teacher. Eye contact is not required.","I need to tell you something.",["I need help","Goodbye"],"Who can listen?"],
      ["jordan-p3","💬","Jordan explains what happened using words and a communication card.","Please listen to me.",["Please listen","Wait"],"How can Jordan communicate?"],
      ["jordan-p4","🛟","The teacher listens and follows the school safety plan.","I need a safe adult.",["Trusted adult","Play"],"What support is important?"],
      ["jordan-p5","🏠","Jordan also tells a parent about the day.","I want to tell you about my day.",["My day","All done"],"Who else can Jordan tell?"]
    ]},
    { id:"my-voice-my-choice",title:"My Voice, My Choice",cover:"🗣️",ageGroup:"9-12",abilityLevel:"Conversation Practice",category:"Confidence & Independence",description:"An age-respectful story about boundaries and self-advocacy.",pages:[
      ["choice-p1","🧭","I can communicate choices in the way that works for me.","This is my choice.",["I choose this","I need time"],"Whose choice is it?"],
      ["choice-p2","✋","I can say no to touch, including hugs.","No hug, please.",["No hug please","A hug would help"],"Can a person choose no?"],
      ["choice-p3","⏳","I can ask for time before I answer.","I need time to answer.",["I need time","Yes"],"What can help before answering?"],
      ["choice-p4","🔄","I can change my mind and communicate something different.","I want something else.",["Something else","All done"],"Can choices change?"],
      ["choice-p5","🤝","Respect means listening to each person's communication.","Please respect my answer.",["I disagree","Please listen"],"What does respectful communication include?"],
      ["choice-p6","⭐","My voice matters whether I speak, type, point, sign, or use a card.","My voice matters.",["My turn","Help"],"How many ways can a person communicate?"]
    ]}
  ].map(book=>({...book,enabled:true,offline:true,pages:book.pages.map(([id,image,text,repeat,choices,question])=>({
    id,image,text,narration:text,repeat,choices:[...new Set(choices)],question,vocabulary:[...new Set(text.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu,"").split(/\s+/).filter(word=>word.length>3))]
  }))}));

  const ageGroups = [
    {id:"1-3",label:"Ages 1–3"},{id:"3-5",label:"Ages 3–5"},{id:"5-7",label:"Ages 5–7"},
    {id:"7-9",label:"Ages 7–9"},{id:"9-12",label:"Ages 9–12"},{id:"custom",label:"Custom Level"}
  ];
  const bookCategories = [...new Set(books.map(book=>book.category).concat([
    "Family & Home","Feelings","Daily Routines","Friendship","School","Animals","Colors & Shapes",
    "Numbers","Community Helpers","Bedtime","Social Stories"
  ]))];

  function sharedCard(phrase) {
    const catalog = window.BB_COMMUNICATION_CARDS?.model(window.BB_COMMUNICATION_CARDS.expansions) || [];
    const key = window.BB_COMMUNICATION_CARDS?.equivalentKey(phrase);
    const exact = catalog.find(card=>card.normalizedPhrase===key);
    if (exact) return {cardId:exact.id,category:exact.category,phrase:exact.phrase};
    const compact = String(phrase||"").replace(/[.!?]+$/,"");
    const fallback = catalog.find(card=>card.normalizedPhrase===window.BB_COMMUNICATION_CARDS?.equivalentKey(compact));
    return fallback ? {cardId:fallback.id,category:fallback.category,phrase:fallback.phrase} : null;
  }

  function validate() {
    const duplicateIds = values => values.filter((value,index)=>values.indexOf(value)!==index);
    const lessonIds = levels.flatMap(level=>[level.id,...level.prompts.map(prompt=>prompt.id)]);
    const bookIds = books.flatMap(book=>[book.id,...book.pages.map(page=>page.id)]);
    return {
      duplicateLessonIds:[...new Set(duplicateIds(lessonIds))],
      duplicateBookIds:[...new Set(duplicateIds(bookIds))],
      duplicatePageChoices:books.flatMap(book=>book.pages.filter(page=>new Set(page.choices).size!==page.choices.length).map(page=>page.id))
    };
  }

  window.BB_TALK_READ_DATA = { levels, books, ageGroups, bookCategories, sharedCard, validate };
})();
