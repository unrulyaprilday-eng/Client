(function () {
  var STORAGE_KEY = "sharePromotionDemoState";
  var MAX_DAILY_SHARE = 1;
  var REWARD_TEXT = "R$ 500";
  var END_AT = new Date("2026-07-17T23:59:00+08:00");

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function todayKey() {
    var now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
  }

  function defaultState() {
    return {
      day: todayKey(),
      shared: 0,
      claimed: false,
      records: []
    };
  }

  function readState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      var state = Object.assign(defaultState(), saved);
      if (state.day !== todayKey()) {
        state.day = todayKey();
        state.shared = 0;
        state.claimed = false;
      }
      state.records = Array.isArray(state.records) ? state.records.slice(0, 6) : [];
      return state;
    } catch (error) {
      return defaultState();
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Local prototype preview can disable storage.
    }
  }

  function query(selector, root) {
    return (root || document).querySelector(selector);
  }

  function queryAll(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function showToast(message) {
    var toast = query("[data-toast]");
    if (!toast) {
      return;
    }
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.hidden = true;
    }, 2200);
  }

  function openSheet(sheet) {
    if (sheet) {
      sheet.hidden = false;
    }
  }

  function closeSheets() {
    queryAll(".sheet").forEach(function (sheet) {
      sheet.hidden = true;
    });
  }

  function formatCountdown() {
    var diff = END_AT.getTime() - Date.now();
    if (diff <= 0) {
      return "活动已结束";
    }
    var seconds = Math.floor(diff / 1000);
    var days = Math.floor(seconds / 86400);
    seconds -= days * 86400;
    var hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    var minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    return days + "天 " +
      String(hours).padStart(2, "0") + ":" +
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0") + " 后结束";
  }

  function renderCountdown() {
    var node = query("[data-countdown]");
    if (node) {
      node.textContent = formatCountdown();
    }
  }

  function renderHistory(state) {
    var list = query("[data-history-list]");
    if (!list) {
      return;
    }
    list.innerHTML = "";
    if (!state.records.length) {
      var empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "今日暂无领取记录";
      list.appendChild(empty);
      return;
    }
    state.records.forEach(function (record) {
      var row = document.createElement("div");
      row.className = "history-row";
      row.innerHTML =
        "<div><span>" + record.channel + " 分享奖励</span><em>" +
        record.time + " · 已到账</em></div><strong>" + record.amount + "</strong>";
      list.appendChild(row);
    });
  }

  function renderState(state) {
    var rewardPanel = query("[data-reward-panel]");
    var rewardState = query("[data-reward-state]");
    var statusLabel = query("[data-status-label]");
    var shareCount = query("[data-share-count]");
    var progressHint = query("[data-progress-hint]");
    var shareButton = query("[data-action='share-now']");
    var ended = END_AT.getTime() <= Date.now();

    if (shareCount) {
      shareCount.textContent = Math.min(state.shared, MAX_DAILY_SHARE) + "/" + MAX_DAILY_SHARE;
    }

    if (ended) {
      if (statusLabel) {
        statusLabel.textContent = "已结束";
      }
      if (rewardState) {
        rewardState.textContent = "活动已结束，无法继续领取";
      }
      if (progressHint) {
        progressHint.textContent = "Activity ended";
      }
      if (shareButton) {
        shareButton.textContent = "Activity Ended";
        shareButton.disabled = true;
      }
      return;
    }

    if (state.claimed) {
      if (rewardPanel) {
        rewardPanel.classList.add("is-claimed");
      }
      if (statusLabel) {
        statusLabel.textContent = "已领取";
      }
      if (rewardState) {
        rewardState.textContent = "今日奖励已到账，明天可再次参与";
      }
      if (progressHint) {
        progressHint.textContent = "Reward credited today";
      }
      if (shareButton) {
        shareButton.textContent = "今日已领取";
        shareButton.disabled = true;
      }
    } else {
      if (rewardPanel) {
        rewardPanel.classList.remove("is-claimed");
      }
      if (statusLabel) {
        statusLabel.textContent = "可领取";
      }
      if (rewardState) {
        rewardState.textContent = "点击分享后立即派奖，每日限领 1 次";
      }
      if (progressHint) {
        progressHint.textContent = "Share once today to get " + REWARD_TEXT;
      }
      if (shareButton) {
        shareButton.textContent = "Share Now";
        shareButton.disabled = false;
      }
    }

    renderHistory(state);
  }

  function completeShare(state, channel) {
    if (state.claimed) {
      showToast("今日已领取，明天再来");
      return state;
    }
    var now = new Date();
    state.shared = MAX_DAILY_SHARE;
    state.claimed = true;
    state.records.unshift({
      channel: channel,
      amount: REWARD_TEXT,
      time: now.toLocaleString("zh-CN", { hour12: false })
    });
    state.records = state.records.slice(0, 6);
    saveState(state);
    renderState(state);
    closeSheets();
    showToast("分享成功，" + REWARD_TEXT + " 已到账");
    return state;
  }

  onReady(function () {
    var state = readState();
    var shareSheet = query("[data-share-sheet]");
    var historySheet = query("[data-history-sheet]");

    renderCountdown();
    window.setInterval(renderCountdown, 1000);
    renderState(state);

    queryAll("[data-action]").forEach(function (control) {
      control.addEventListener("click", function () {
        var action = control.getAttribute("data-action");
        if (action === "share-now") {
          if (state.claimed) {
            showToast("今日已领取，明天再来");
          } else {
            openSheet(shareSheet);
          }
        }
        if (action === "open-history") {
          renderHistory(state);
          openSheet(historySheet);
        }
        if (action === "close-sheet") {
          closeSheets();
        }
        if (action === "refresh") {
          renderState(state);
          renderCountdown();
          showToast("奖励状态已刷新");
        }
      });
    });

    queryAll("[data-channel]", shareSheet).forEach(function (button) {
      button.addEventListener("click", function () {
        state = completeShare(state, button.getAttribute("data-channel") || "Share");
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeSheets();
      }
    });
  });
})();
