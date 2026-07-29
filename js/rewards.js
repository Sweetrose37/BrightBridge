(function () {
  "use strict";
  const stickerSet = ["🦋", "🌻", "🐳", "🚀", "🦄", "🌈", "🐢", "🍓", "🐝", "🌙", "🦖", "🏆"];
  const achievements = [
    { id: "first-touch", icon: "🌟", name: "First Adventure", test: data => data.stars >= 1 },
    { id: "communicator", icon: "💬", name: "Communicator", test: data => data.recentPhrases.length >= 3 },
    { id: "garden-friend", icon: "🌻", name: "Garden Friend", test: data => data.flowers >= 3 },
    { id: "brave-try", icon: "💪", name: "Brave Try", test: data => data.stars >= 10 },
    { id: "super-explorer", icon: "🧭", name: "Super Explorer", test: data => Object.keys(data.activityVisits).length >= 6 },
    { id: "bright-star", icon: "🏆", name: "Bright Star", test: data => data.stars >= 25 }
  ];

  function earn(reason = "Great learning!") {
    const data = BB.store.data;
    data.stars += 1;
    if (data.stars % 3 === 0) data.flowers += 1;
    if (data.stars % 5 === 0) data.butterflies += 1;
    if (data.stars % 4 === 0 && data.stickers.length < stickerSet.length) {
      data.stickers.push(stickerSet[data.stickers.length]);
    }
    achievements.forEach(item => {
      if (!data.achievements.includes(item.id) && item.test(data)) {
        data.achievements.push(item.id);
      }
    });
    BB.store.save();
    window.dispatchEvent(new CustomEvent("bb:reward", { detail: { reason } }));
    return { newSticker: data.stars % 4 === 0, reason };
  }

  function recordProgress(activity, amount = 1) {
    const data = BB.store.data;
    data.progress[activity] = (data.progress[activity] || 0) + amount;
    data.activityVisits[activity] = (data.activityVisits[activity] || 0) + 1;
    BB.store.save();
  }

  window.BB = window.BB || {};
  BB.rewards = { earn, recordProgress, stickerSet, achievements };
})();
