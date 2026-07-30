(function () {
  "use strict";

  const schemaVersion = 1;
  const safetyPhrases = new Set([
    "i do not feel safe", "someone hurt me", "please call my parent",
    "call my caregiver", "i need medical help", "this is an emergency",
    "i am lost", "call 911"
  ]);

  function localDate(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function timezone() {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ||
        `UTC${new Date().getTimezoneOffset() <= 0 ? "+" : "-"}${Math.abs(new Date().getTimezoneOffset() / 60)}`;
    } catch {
      return `UTC offset ${-new Date().getTimezoneOffset()} minutes`;
    }
  }

  function normalize(value) {
    return window.BB_COMMUNICATION_CARDS?.equivalentKey(value) ||
      String(value || "").trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  }

  function reportingState() {
    const data = BB.store.data;
    data.dailyReporting ||= {};
    const state = data.dailyReporting;
    state.schemaVersion = schemaVersion;
    state.records ||= {};
    state.activeDates ||= {};
    state.legacyMigration ||= {
      completedAt: new Date().toISOString(),
      note: "Earlier cumulative progress was preserved as long-term progress. Exact historical dates were unavailable, so no daily activity was invented."
    };
    return state;
  }

  function recordKey(profileId, date) {
    return `${profileId}|${date}`;
  }

  function newRecord(profileId, date, now = new Date()) {
    const stamp = now.toISOString();
    return {
      reportId: `daily-${date}-${String(profileId).replace(/[^a-z0-9-]/gi, "")}`,
      childProfileId: profileId,
      reportDate: date,
      timezone: timezone(),
      utcOffsetMinutes: -now.getTimezoneOffset(),
      firstActivityAt: "",
      lastActivityAt: "",
      totalAppSessions: 0,
      totalSessionSeconds: 0,
      totalCardTaps: 0,
      uniqueCardKeys: [],
      communicationCategoryCounts: {},
      phraseCounts: {},
      feelingsSelected: {},
      calmStrategiesUsed: {},
      needsCommunicated: {},
      parentVoiceUsageCount: 0,
      defaultVoiceUsageCount: 0,
      textToSpeechUsageCount: 0,
      visualFallbackUsageCount: 0,
      videosViewed: {},
      videoSeconds: 0,
      goalsCompleted: {},
      starsEarned: 0,
      starReasons: {},
      weekendBonusStars: 0,
      talkLessonsOpened: {},
      soundsPracticed: {},
      wordsPracticed: {},
      phrasesPracticed: {},
      talkRepeatTurns: 0,
      talkCommunicationResponses: 0,
      talkPictureResponses: 0,
      talkRecorderTurns: 0,
      talkParentVoicePrompts: 0,
      talkSkipped: 0,
      readingBooksOpened: {},
      readingBooksCompleted: {},
      readingPagesViewed: 0,
      readingSeconds: 0,
      readingFavoriteBooks: {},
      readingModeCounts: {},
      readingRepeatTurns: 0,
      readingCommunicationResponses: 0,
      readingRecorderTurns: 0,
      readingParentNarratedPages: 0,
      caregiverNotes: [],
      parentNotes: [],
      safetyEvents: [],
      excludedPhraseKeys: [],
      reviewed: false,
      corrections: [],
      events: [],
      createdAt: stamp,
      finalizedAt: ""
    };
  }

  function ensureDay(profileId, value = new Date(), persist = true) {
    if (!profileId) return null;
    const now = value instanceof Date ? value : new Date(value);
    const date = localDate(now);
    const state = reportingState();
    const previousDate = state.activeDates[profileId];
    if (previousDate && previousDate !== date) {
      const previous = state.records[recordKey(profileId, previousDate)];
      if (previous && !previous.finalizedAt) previous.finalizedAt = now.toISOString();
      sessionProfiles.delete(profileId);
    }
    const key = recordKey(profileId, date);
    state.records[key] ||= newRecord(profileId, date, now);
    state.activeDates[profileId] = date;
    if (persist) BB.store.save();
    return state.records[key];
  }

  function checkRollover(profileIds = [], value = new Date()) {
    const ids = profileIds.length ? profileIds : (BB.store.data.profiles || []).map(profile => profile.id);
    ids.forEach(id => ensureDay(id, value, false));
    BB.store.save();
    return ids.map(id => ensureDay(id, value, false));
  }

  const sessionProfiles = new Set();
  function startSession(profileId) {
    const report = ensureDay(profileId, new Date(), false);
    if (!report || sessionProfiles.has(profileId)) return report;
    sessionProfiles.add(profileId);
    report.totalAppSessions += 1;
    touch(report, "session", "App session started");
    BB.store.save();
    return report;
  }

  function touch(report, type, label, details = {}) {
    const stamp = new Date().toISOString();
    report.firstActivityAt ||= stamp;
    report.lastActivityAt = stamp;
    const event = {
      eventId: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: stamp,
      type,
      label: String(label || ""),
      category: String(details.category || ""),
      voiceSource: String(details.voiceSource || ""),
      excluded: false
    };
    report.events.push(event);
    if (report.events.length > 3000) report.events = report.events.slice(-3000);
    return event;
  }

  function addCount(map, key, amount = 1) {
    const clean = String(key || "").trim();
    if (clean) map[clean] = (Number(map[clean]) || 0) + amount;
  }

  function recordCard(profileId, details = {}) {
    const report = ensureDay(profileId, new Date(), false);
    if (!report) return "";
    const phrase = String(details.phrase || "").trim();
    const category = String(details.category || "Communication").trim();
    const cardKey = String(details.cardId || `${category}:${normalize(phrase)}`);
    report.totalCardTaps += 1;
    if (!report.uniqueCardKeys.includes(cardKey)) report.uniqueCardKeys.push(cardKey);
    addCount(report.communicationCategoryCounts, category);
    addCount(report.phraseCounts, phrase);
    if (category === "Feelings") addCount(report.feelingsSelected, phrase);
    if (category === "Sensory & Calming" || category === "Sensory Needs") addCount(report.calmStrategiesUsed, phrase);
    if (category === "Needs" || category === "Help" || category === "Bathroom") addCount(report.needsCommunicated, phrase);
    if (safetyPhrases.has(normalize(phrase))) {
      report.safetyEvents.push({ phrase, timestamp: new Date().toISOString() });
    }
    const event = touch(report, "communication", phrase, { category });
    BB.store.save();
    return event.eventId;
  }

  function markVoice(profileId, eventId, source) {
    const report = ensureDay(profileId, new Date(), false);
    const event = report?.events.find(item => item.eventId === eventId);
    if (!event || event.voiceSource) return;
    event.voiceSource = source;
    if (source === "parent") report.parentVoiceUsageCount += 1;
    else if (source === "default") report.defaultVoiceUsageCount += 1;
    else if (source === "text-to-speech") report.textToSpeechUsageCount += 1;
    else report.visualFallbackUsageCount += 1;
    BB.store.save();
  }

  function recordFeeling(profileId, feeling) {
    const report = ensureDay(profileId, new Date(), false);
    addCount(report.feelingsSelected, feeling);
    touch(report, "feeling", feeling, { category: "Feelings" });
    BB.store.save();
  }

  function recordCalm(profileId, strategy) {
    const report = ensureDay(profileId, new Date(), false);
    addCount(report.calmStrategiesUsed, strategy);
    touch(report, "calm", strategy, { category: "Calm & Sensory" });
    BB.store.save();
  }

  function recordGoal(profileId, goal) {
    const report = ensureDay(profileId, new Date(), false);
    addCount(report.goalsCompleted, goal);
    touch(report, "goal", goal);
    BB.store.save();
  }

  function recordStars(profileId, amount = 1, reason = "Positive progress", value = new Date(), weekendBonus = false) {
    const report = ensureDay(profileId, value, false);
    if (!report) return;
    const stars = Math.max(0, Number(amount) || 0);
    report.starsEarned = (Number(report.starsEarned) || 0) + stars;
    if (weekendBonus) report.weekendBonusStars = (Number(report.weekendBonusStars) || 0) + stars;
    addCount(report.starReasons, reason, stars);
    touch(report, "reward", `${stars} ${stars === 1 ? "star" : "stars"}: ${reason}`);
    BB.store.save();
  }

  function recordTalk(profileId, details = {}, value = new Date()) {
    const report = ensureDay(profileId, value, false);
    if (!report) return;
    if (details.lessonsOpened) addCount(report.talkLessonsOpened, details.lesson || "Talking practice", Number(details.lessonsOpened));
    if (details.prompt) {
      const amount = Number(details.listened || 1);
      if (details.kind === "sound") addCount(report.soundsPracticed, details.prompt, amount);
      else if (details.kind === "word") addCount(report.wordsPracticed, details.prompt, amount);
      else addCount(report.phrasesPracticed, details.prompt, amount);
    }
    report.talkRepeatTurns += Number(details.repeatTurns || 0);
    report.talkCommunicationResponses += Number(details.communicationResponses || 0);
    report.talkPictureResponses += Number(details.pictureResponses || 0);
    report.talkRecorderTurns += Number(details.usedRecorder || 0);
    report.talkParentVoicePrompts += Number(details.parentVoicePrompts || 0);
    report.talkSkipped += Number(details.skipped || 0);
    touch(report, "talk-practice", details.prompt || details.lesson || "Talking practice");
    BB.store.save();
  }

  function recordReading(profileId, details = {}, value = new Date()) {
    const report = ensureDay(profileId, value, false);
    if (!report) return;
    if (details.booksOpened) addCount(report.readingBooksOpened, details.bookTitle || "Book", Number(details.booksOpened));
    if (details.booksCompleted) addCount(report.readingBooksCompleted, details.bookTitle || "Book", Number(details.booksCompleted));
    report.readingPagesViewed += Number(details.pagesViewed || 0);
    report.readingSeconds += Number(details.readingSeconds || 0);
    if (details.favoriteBook) addCount(report.readingFavoriteBooks, details.favoriteBook);
    if (details.mode) addCount(report.readingModeCounts, String(details.mode).replace(/-/g, " "));
    report.readingRepeatTurns += Number(details.repeatTurns || 0);
    report.readingCommunicationResponses += Number(details.communicationResponses || 0);
    report.readingRecorderTurns += Number(details.usedRecorder || 0);
    report.readingParentNarratedPages += Number(details.parentNarratedPages || 0);
    if (details.bookTitle || details.pagesViewed || details.repeatTurns || details.communicationResponses) {
      touch(report, "reading", details.bookTitle || "Reading activity");
    } else {
      report.lastActivityAt ||= new Date().toISOString();
    }
    BB.store.save();
  }

  function recordVideo(profileId, video = {}) {
    const report = ensureDay(profileId, new Date(), false);
    const label = String(video.title || "Approved video");
    const category = String(video.categoryLabel || video.category || "Approved videos");
    addCount(report.videosViewed, `${label}|${category}`);
    const event = touch(report, "video", label, { category });
    BB.store.save();
    return event.eventId;
  }

  function addVideoSeconds(profileId, seconds = 1) {
    const report = ensureDay(profileId, new Date(), false);
    report.videoSeconds += Math.max(0, Number(seconds) || 0);
    report.lastActivityAt = new Date().toISOString();
    BB.store.save();
  }

  function addSessionSeconds(profileId, seconds = 30) {
    if (document.hidden) return;
    const report = ensureDay(profileId, new Date(), false);
    report.totalSessionSeconds += Math.max(0, Number(seconds) || 0);
    report.lastActivityAt ||= new Date().toISOString();
    BB.store.save();
  }

  function records(options = {}) {
    checkRollover(BB.store.data.profiles.map(profile => profile.id));
    const profileId = options.profileId || BB.store.data.activeProfile;
    return Object.values(reportingState().records)
      .filter(report => (!profileId || profileId === "all" || report.childProfileId === profileId))
      .filter(report => !options.startDate || report.reportDate >= options.startDate)
      .filter(report => !options.endDate || report.reportDate <= options.endDate)
      .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  }

  function updateRecord(profileId, date, updates = {}, correction = "") {
    const report = reportingState().records[recordKey(profileId, date)];
    if (!report) return false;
    Object.assign(report, updates);
    if (correction) report.corrections.push({ timestamp: new Date().toISOString(), action: correction });
    BB.store.save();
    return true;
  }

  function addParentNote(profileId, date, note) {
    const clean = String(note || "").trim();
    if (!clean) return false;
    const report = reportingState().records[recordKey(profileId, date)];
    if (!report) return false;
    report.parentNotes.push({ noteId: `note-${Date.now()}-${Math.random().toString(16).slice(2)}`, text: clean.slice(0, 1000), timestamp: new Date().toISOString(), role: "Parent or guardian" });
    report.corrections.push({ timestamp: new Date().toISOString(), action: "Parent note added" });
    BB.store.save();
    return true;
  }

  function editParentNote(profileId, date, index, note) {
    const clean = String(note || "").trim();
    const report = reportingState().records[recordKey(profileId, date)];
    const current = report?.parentNotes?.[Number(index)];
    if (!current || !clean) return false;
    current.text = clean.slice(0, 1000);
    current.editedAt = new Date().toISOString();
    report.corrections.push({ timestamp: current.editedAt, action: "Parent note corrected" });
    BB.store.save();
    return true;
  }

  function togglePhraseExclusion(profileId, date, phrase) {
    const report = reportingState().records[recordKey(profileId, date)];
    if (!report) return false;
    const key = normalize(phrase);
    const index = report.excludedPhraseKeys.indexOf(key);
    if (index >= 0) report.excludedPhraseKeys.splice(index, 1);
    else report.excludedPhraseKeys.push(key);
    report.corrections.push({ timestamp: new Date().toISOString(), action: `${index >= 0 ? "Restored" : "Excluded"} accidental selection: ${phrase}` });
    BB.store.save();
    return true;
  }

  function topEntries(map = {}, excluded = [], limit = 8) {
    return Object.entries(map)
      .filter(([label]) => !excluded.includes(normalize(label)))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit);
  }

  function aggregate(items = []) {
    const result = newRecord("summary", items.length ? `${items.at(-1).reportDate} to ${items[0].reportDate}` : localDate());
    result.totalAppSessions = 0;
    const maps = ["communicationCategoryCounts", "phraseCounts", "feelingsSelected", "calmStrategiesUsed", "needsCommunicated", "videosViewed", "goalsCompleted", "starReasons", "talkLessonsOpened", "soundsPracticed", "wordsPracticed", "phrasesPracticed", "readingBooksOpened", "readingBooksCompleted", "readingFavoriteBooks", "readingModeCounts"];
    for (const report of items) {
      ["totalAppSessions", "totalSessionSeconds", "totalCardTaps", "parentVoiceUsageCount", "defaultVoiceUsageCount", "textToSpeechUsageCount", "visualFallbackUsageCount", "videoSeconds", "starsEarned", "weekendBonusStars", "talkRepeatTurns", "talkCommunicationResponses", "talkPictureResponses", "talkRecorderTurns", "talkParentVoicePrompts", "talkSkipped", "readingPagesViewed", "readingSeconds", "readingRepeatTurns", "readingCommunicationResponses", "readingRecorderTurns", "readingParentNarratedPages"].forEach(field => result[field] += Number(report[field]) || 0);
      report.uniqueCardKeys.forEach(key => { if (!result.uniqueCardKeys.includes(key)) result.uniqueCardKeys.push(key); });
      maps.forEach(field => Object.entries(report[field] || {}).forEach(([key, value]) => addCount(result[field], key, value)));
      result.safetyEvents.push(...(report.safetyEvents || []));
      result.parentNotes.push(...(report.parentNotes || []));
      result.caregiverNotes.push(...(report.caregiverNotes || []));
    }
    return result;
  }

  function profileName(profileId) {
    return BB.store.data.profiles.find(profile => profile.id === profileId)?.name || "Child";
  }

  function plainSummary(report) {
    if (!report || (!report.totalCardTaps && !report.totalSessionSeconds && !Object.keys(report.videosViewed || {}).length && !report.starsEarned && !Object.keys(report.talkLessonsOpened || {}).length && !Object.keys(report.readingBooksOpened || {}).length)) {
      return "No app activity was recorded for this day.";
    }
    const phrases = topEntries(report.phraseCounts, report.excludedPhraseKeys, 2).map(([phrase]) => phrase);
    const feeling = topEntries(report.feelingsSelected, [], 1)[0]?.[0];
    const parts = [];
    if (phrases.length) parts.push(`The child used the app most often to communicate “${phrases.join("” and “")}.”`);
    if (feeling) parts.push(`The most frequently selected feeling was “${feeling}.”`);
    if (report.parentVoiceUsageCount) parts.push(`Parent-recorded voice cards were used ${report.parentVoiceUsageCount} ${report.parentVoiceUsageCount === 1 ? "time" : "times"}.`);
    if (report.starsEarned) parts.push(`${report.starsEarned} ${report.starsEarned === 1 ? "star was" : "stars were"} collected${report.weekendBonusStars ? `, including ${report.weekendBonusStars} weekend incentive bonus stars` : ""}.`);
    const lessons=Object.values(report.talkLessonsOpened || {}).reduce((sum,count)=>sum+count,0),books=Object.values(report.readingBooksOpened || {}).reduce((sum,count)=>sum+count,0);
    if(lessons)parts.push(`${lessons} talking ${lessons===1?"lesson was":"lessons were"} opened with ${report.talkRepeatTurns||0} practice turns.`);
    if(books)parts.push(`${books} ${books===1?"book was":"books were"} opened and ${report.readingPagesViewed||0} pages were viewed.`);
    return parts.join(" ") || "Activity was recorded without enough communication selections to create a longer summary.";
  }

  function formatText(report, options = {}) {
    const child = options.childName || profileName(report.childProfileId);
    const period = options.period || report.reportDate;
    const lines = [
      "LUMITALK", "CHILD COMMUNICATION & LEARNING REPORT", "",
      `Child: ${child}`,
      `Report Date: ${report.reportDate}`,
      `Report Period: ${period}`,
      `Generated On: ${new Date().toLocaleString()}`, "",
      "DAILY OVERVIEW",
      `Total app sessions: ${report.totalAppSessions || 0}`,
      `Total time using the app: ${Math.round((report.totalSessionSeconds || 0) / 60)} minutes`,
      `Communication-card selections: ${report.totalCardTaps || 0}`,
      `Different cards used: ${(report.uniqueCardKeys || []).length}`,
      `Stars collected: ${report.starsEarned || 0}`,
      `Weekend incentive bonus stars: ${report.weekendBonusStars || 0}`,
      `Most active communication category: ${topEntries(report.communicationCategoryCounts, [], 1)[0]?.[0] || "No activity recorded"}`, "",
      "MOST USED COMMUNICATIONS",
      ...(topEntries(report.phraseCounts, report.excludedPhraseKeys).map(([phrase, count], index) => `${index + 1}. “${phrase}” — used ${count} ${count === 1 ? "time" : "times"}`) || [])
    ];
    if (!topEntries(report.phraseCounts, report.excludedPhraseKeys).length) lines.push("No activity recorded");
    const section = (title, map) => {
      lines.push("", title);
      const entries = topEntries(map, []);
      if (!entries.length) lines.push("None recorded");
      else entries.forEach(([label, count]) => lines.push(`• ${label} — ${count} ${count === 1 ? "time" : "times"}`));
    };
    section("FEELINGS COMMUNICATED", report.feelingsSelected);
    section("NEEDS COMMUNICATED", report.needsCommunicated);
    section("CALM AND SENSORY SUPPORT", report.calmStrategiesUsed);
    lines.push("", "SPEECH AND COMMUNICATION PRACTICE",
      `Lessons opened: ${Object.values(report.talkLessonsOpened || {}).reduce((sum,count)=>sum+count,0)}`,
      `Sounds practiced: ${Object.keys(report.soundsPracticed || {}).length}`,
      `Words practiced: ${Object.keys(report.wordsPracticed || {}).length}`,
      `Phrases practiced: ${Object.keys(report.phrasesPracticed || {}).length}`,
      `Repeat After Me turns: ${report.talkRepeatTurns || 0}`,
      `Communication-card or picture responses: ${(report.talkCommunicationResponses || 0) + (report.talkPictureResponses || 0)}`,
      `Parent voice prompts used: ${report.talkParentVoicePrompts || 0}`,
      `Prompts skipped: ${report.talkSkipped || 0}`, "",
      "READING ACTIVITY",
      `Books opened: ${Object.values(report.readingBooksOpened || {}).reduce((sum,count)=>sum+count,0)}`,
      `Books completed: ${Object.values(report.readingBooksCompleted || {}).reduce((sum,count)=>sum+count,0)}`,
      `Pages viewed: ${report.readingPagesViewed || 0}`,
      `Reading time: ${Math.round((report.readingSeconds || 0) / 60)} minutes`,
      `Repeat After Me prompts attempted: ${report.readingRepeatTurns || 0}`,
      `Communication-card responses: ${report.readingCommunicationResponses || 0}`,
      `Parent-narrated pages played: ${report.readingParentNarratedPages || 0}`
    );
    const videoCategories = [...new Set(Object.keys(report.videosViewed || {}).map(item => item.split("|")[1]).filter(Boolean))];
    lines.push("", "VOICE SUPPORT",
      `Parent-recorded voice cards used: ${report.parentVoiceUsageCount || 0}`,
      `Default voice cards used: ${report.defaultVoiceUsageCount || 0}`,
      `Text-to-speech fallback used: ${report.textToSpeechUsageCount || 0}`,
      `Visual-only fallback used: ${report.visualFallbackUsageCount || 0}`, "",
      "VIDEOS AND LEARNING",
      `Videos watched: ${Object.values(report.videosViewed || {}).reduce((sum, count) => sum + count, 0)}`,
      `Total video time: ${Math.round((report.videoSeconds || 0) / 60)} minutes`,
      `Categories viewed: ${videoCategories.join(", ") || "None recorded"}`,
      `Goals completed: ${Object.values(report.goalsCompleted || {}).reduce((sum, count) => sum + count, 0)}`, "",
      "NOTES"
    );
    const notes = [...(report.caregiverNotes || []), ...(report.parentNotes || [])];
    if (!notes.length) lines.push("No notes added");
    else notes.forEach(note => lines.push(`• ${note.text} (${note.role || "Caregiver"}, ${new Date(note.timestamp).toLocaleString()})`));
    if (report.safetyEvents?.length) {
      lines.push("", "SAFETY INFORMATION");
      report.safetyEvents.forEach(item => lines.push(`• “${item.phrase}” — ${new Date(item.timestamp).toLocaleString()}`));
    }
    lines.push("", "SUMMARY", plainSummary(report), "", "This report describes recorded app selections only. It does not diagnose or interpret the child.");
    return lines.join("\n");
  }

  function csv(items = []) {
    const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const headings = ["Date", "Child", "Total Sessions", "Total Minutes", "Card Selections", "Stars Collected", "Weekend Bonus Stars", "Talking Lessons Opened", "Sounds Practiced", "Words Practiced", "Phrases Practiced", "Repeat After Me Turns", "Books Opened", "Books Completed", "Pages Viewed", "Reading Minutes", "Parent-Narrated Pages", "Most Used Phrase", "Most Used Category", "Feelings Communicated", "Needs Communicated", "Calm Strategies Used", "Parent Voice Uses", "Videos Watched", "Notes"];
    const rows = items.map(report => [
      report.reportDate, profileName(report.childProfileId), report.totalAppSessions || 0,
      Math.round((report.totalSessionSeconds || 0) / 60), report.totalCardTaps || 0,
      report.starsEarned || 0, report.weekendBonusStars || 0,
      Object.values(report.talkLessonsOpened || {}).reduce((sum,count)=>sum+count,0),
      Object.keys(report.soundsPracticed || {}).length, Object.keys(report.wordsPracticed || {}).length,
      Object.keys(report.phrasesPracticed || {}).length, report.talkRepeatTurns || 0,
      Object.values(report.readingBooksOpened || {}).reduce((sum,count)=>sum+count,0),
      Object.values(report.readingBooksCompleted || {}).reduce((sum,count)=>sum+count,0),
      report.readingPagesViewed || 0, Math.round((report.readingSeconds || 0)/60),
      report.readingParentNarratedPages || 0,
      topEntries(report.phraseCounts, report.excludedPhraseKeys, 1)[0]?.[0] || "No activity recorded",
      topEntries(report.communicationCategoryCounts, [], 1)[0]?.[0] || "No activity recorded",
      topEntries(report.feelingsSelected, []).map(([label, count]) => `${label} (${count})`).join("; ") || "None recorded",
      topEntries(report.needsCommunicated, []).map(([label]) => label).join("; ") || "None recorded",
      topEntries(report.calmStrategiesUsed, []).map(([label, count]) => `${label} (${count})`).join("; ") || "None recorded",
      report.parentVoiceUsageCount || 0,
      Object.values(report.videosViewed || {}).reduce((sum, count) => sum + count, 0),
      [...(report.caregiverNotes || []), ...(report.parentNotes || [])].map(note => note.text).join("; ") || "No notes added"
    ]);
    return [headings, ...rows].map(row => row.map(quote).join(",")).join("\r\n");
  }

  function safeFileName(value) {
    return String(value || "report").replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  }

  window.BB = window.BB || {};
  BB.dailyReports = {
    localDate, ensureDay, checkRollover, startSession, addSessionSeconds,
    recordCard, markVoice, recordFeeling, recordCalm, recordGoal, recordStars, recordTalk, recordReading,
    recordVideo, addVideoSeconds, records, aggregate, updateRecord,
    addParentNote, editParentNote, togglePhraseExclusion, topEntries, profileName,
    plainSummary, formatText, csv, safeFileName, reportingState
  };
})();
