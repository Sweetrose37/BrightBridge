(function () {
  "use strict";

  const weekendBonus = 3;

  function localDate(value = new Date()) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function weekStart(value = new Date()) {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    date.setHours(12, 0, 0, 0);
    const day = date.getDay();
    date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
    return localDate(date);
  }

  function period(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    const type = [0, 6].includes(date.getDay()) ? "weekend" : "weekday";
    const start = weekStart(date);
    return { type, weekStart: start, key: `${start}|${type}`, date: localDate(date), day: date.getDay() };
  }

  function rootState() {
    const data = BB.store.data;
    data.weeklyRewards ||= {
      schemaVersion: 1,
      profiles: {},
      migratedAt: new Date().toISOString(),
      note: "Existing permanent stars were preserved. The first active profile began the new visible weekly bank with that balance."
    };
    data.weeklyRewards.profiles ||= {};
    return data.weeklyRewards;
  }

  function profileState(profileId, value = new Date()) {
    const root = rootState();
    if (!root.profiles[profileId]) {
      const first = period(value);
      const carry = profileId === BB.store.data.activeProfile ? Number(BB.store.data.stars) || 0 : 0;
      root.profiles[profileId] = {
        activePeriodKey: first.key,
        histories: {
          [first.weekStart]: {
            weekStart: first.weekStart,
            weekdayStars: first.type === "weekday" ? carry : 0,
            weekendStars: first.type === "weekend" ? carry : 0,
            weekendDays: [],
            weekendBonusStars: 0,
            bonusAwarded: false,
            createdAt: new Date().toISOString()
          }
        }
      };
    }
    return root.profiles[profileId];
  }

  function weekRecord(profileId, value = new Date()) {
    const current = period(value);
    const profile = profileState(profileId, value);
    profile.histories[current.weekStart] ||= {
      weekStart: current.weekStart,
      weekdayStars: 0,
      weekendStars: 0,
      weekendDays: [],
      weekendBonusStars: 0,
      bonusAwarded: false,
      createdAt: new Date().toISOString()
    };
    if (profile.activePeriodKey !== current.key) {
      profile.activePeriodKey = current.key;
      profile.lastRefreshAt = new Date().toISOString();
    }
    return { current, profile, record: profile.histories[current.weekStart] };
  }

  function ensure(profileId, value = new Date(), save = true) {
    if (!profileId) return null;
    const result = weekRecord(profileId, value);
    if (save) BB.store.save();
    return status(profileId, value, false);
  }

  function status(profileId, value = new Date(), create = true) {
    const result = create ? weekRecord(profileId, value) : weekRecord(profileId, value);
    const { current, record } = result;
    const currentStars = current.type === "weekend" ? record.weekendStars : record.weekdayStars;
    const weekendDays = record.weekendDays || [];
    let title = "Monday–Friday Stars";
    let message = `${currentStars} stars collected toward Friday’s celebration.`;
    if (current.day === 5) {
      title = "Friday Star Celebration";
      message = `${currentStars} weekday stars are ready to celebrate! The weekend incentive begins Saturday.`;
    } else if (current.type === "weekend") {
      title = "Weekend Incentive";
      const remaining = Math.max(0, 2 - weekendDays.length);
      message = record.bonusAwarded
        ? `Weekend goal complete! ${weekendBonus} bonus stars were earned.`
        : `${currentStars} weekend stars collected. Earn a star on ${remaining === 2 ? "Saturday and Sunday" : "the other weekend day"} for ${weekendBonus} bonus stars.`;
    }
    return {
      ...current,
      currentStars,
      weekdayStars: record.weekdayStars || 0,
      weekendStars: record.weekendStars || 0,
      weekendDays: [...weekendDays],
      weekendBonusStars: record.weekendBonusStars || 0,
      bonusAwarded: Boolean(record.bonusAwarded),
      title,
      message
    };
  }

  function recordEarnedStar(profileId, reason = "Positive progress", value = new Date()) {
    if (!profileId) return null;
    const { current, record } = weekRecord(profileId, value);
    const field = current.type === "weekend" ? "weekendStars" : "weekdayStars";
    record[field] = (Number(record[field]) || 0) + 1;
    BB.dailyReports?.recordStars(profileId, 1, reason, value);

    let bonusJustEarned = false;
    if (current.type === "weekend") {
      if (!record.weekendDays.includes(current.date)) record.weekendDays.push(current.date);
      if (record.weekendDays.length >= 2 && !record.bonusAwarded) {
        record.bonusAwarded = true;
        record.weekendBonusStars = weekendBonus;
        record.weekendStars += weekendBonus;
        BB.store.data.stars += weekendBonus;
        BB.dailyReports?.recordStars(profileId, weekendBonus, "Weekend incentive bonus", value, true);
        bonusJustEarned = true;
      }
    }
    BB.store.save();
    if (bonusJustEarned) {
      window.dispatchEvent(new CustomEvent("bb:weekend-bonus", { detail: { stars: weekendBonus, profileId } }));
    }
    return { ...status(profileId, value, false), bonusJustEarned };
  }

  function histories(profileId) {
    const profile = profileState(profileId);
    return Object.values(profile.histories || {}).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  }

  window.BB = window.BB || {};
  BB.weeklyRewards = { ensure, status, histories, recordEarnedStar, period, weekStart, weekendBonus };

  window.addEventListener("bb:reward", event => {
    const profileId = BB.store.data.activeProfile;
    recordEarnedStar(profileId, event.detail?.reason || "Positive progress");
  });
})();
