(function () {
  var STORAGE_KEY = "sharePromotionDemoState";
  var MAX_DAILY_SHARE = 1;
  var REWARD_TEXT = "R$ 500";
  var END_AT = new Date("2026-07-17T23:59:00+08:00");
  var DEMO_MODES = {
    manual: "manual",
    auto: "auto"
  };

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
      mode: DEMO_MODES.manual,
      shared: 0,
      claimed: false
    };
  }

  function readState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      var state = Object.assign(defaultState(), saved);
      if (state.day !== todayKey()) {
        state.day = todayKey();
        state.mode = state.mode === DEMO_MODES.auto ? DEMO_MODES.auto : DEMO_MODES.manual;
        state.shared = 0;
        state.claimed = false;
      }
      if (state.mode !== DEMO_MODES.auto && state.mode !== DEMO_MODES.manual) {
        state.mode = DEMO_MODES.manual;
      }
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

  function resetDailyProgress(state) {
    state.shared = 0;
    state.claimed = false;
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

  function isManualMode(state) {
    return state.mode === DEMO_MODES.manual;
  }

  function hasSharedToday(state) {
    return state.shared >= MAX_DAILY_SHARE;
  }

  function updateModeActions(state) {
    queryAll("[data-demo-mode]").forEach(function (button) {
      var isActive = button.getAttribute("data-demo-mode") === state.mode;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    var flow = query("[data-mode-flow]");
    var detail = query("[data-mode-detail]");
    if (flow) {
      flow.textContent = isManualMode(state)
        ? "按钮变化：Share Now -> Claim -> Share Now"
        : "按钮变化：Share Now -> Share Now";
    }
    if (detail) {
      detail.textContent = isManualMode(state)
        ? "手动领奖：完成分享后切换为 Claim，领取完成后恢复 Share Now。"
        : "自动领取：分享成功后奖励自动到账，按钮保持 Share Now。";
    }
  }

  function renderState(state) {
    var rewardPanel = query("[data-reward-panel]");
    var rewardState = query("[data-reward-state]");
    var statusLabel = query("[data-status-label]");
    var shareCount = query("[data-share-count]");
    var progressHint = query("[data-progress-hint]");
    var shareButton = query("[data-action='share-now']");
    var ended = END_AT.getTime() <= Date.now();
    var manualMode = isManualMode(state);
    var sharedToday = hasSharedToday(state);

    if (shareCount) {
      shareCount.textContent = Math.min(state.shared, MAX_DAILY_SHARE) + "/" + MAX_DAILY_SHARE;
    }

    updateModeActions(state);

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

    if (rewardPanel) {
      rewardPanel.classList.toggle("is-claimed", state.claimed);
      rewardPanel.classList.toggle("is-ready", manualMode && sharedToday && !state.claimed);
    }

    if (!manualMode && state.claimed) {
      if (statusLabel) {
        statusLabel.textContent = "已到账";
      }
      if (rewardState) {
        rewardState.textContent = "分享成功后奖励已自动发放，明天可再次参与";
      }
      if (progressHint) {
        progressHint.textContent = "Reward auto-credited today";
      }
      if (shareButton) {
        shareButton.textContent = "Share Now";
        shareButton.disabled = false;
      }
      return;
    }

    if (state.claimed) {
      if (statusLabel) {
        statusLabel.textContent = "已领取";
      }
      if (rewardState) {
        rewardState.textContent = manualMode
          ? "今日奖励已领取，仍可继续分享"
          : "分享成功后奖励已自动发放，明天可再次参与";
      }
      if (progressHint) {
        progressHint.textContent = manualMode
          ? "Reward claimed, sharing still available"
          : "Reward auto-credited today";
      }
      if (shareButton) {
        shareButton.textContent = "Share Now";
        shareButton.disabled = false;
      }
    } else if (manualMode && sharedToday) {
      if (statusLabel) {
        statusLabel.textContent = "可领取";
      }
      if (rewardState) {
        rewardState.textContent = "分享已完成，请点击 Claim 领取今日奖励";
      }
      if (progressHint) {
        progressHint.textContent = "Claim is now available";
      }
      if (shareButton) {
        shareButton.textContent = "Claim";
        shareButton.disabled = false;
      }
    } else if (manualMode) {
      if (rewardPanel) {
        rewardPanel.classList.remove("is-claimed");
      }
      if (statusLabel) {
        statusLabel.textContent = "待分享";
      }
      if (rewardState) {
        rewardState.textContent = "完成分享后可手动领取，每日限领 1 次";
      }
      if (progressHint) {
        progressHint.textContent = "Share once to unlock claim";
      }
      if (shareButton) {
        shareButton.textContent = "Share Now";
        shareButton.disabled = false;
      }
    } else {
      if (statusLabel) {
        statusLabel.textContent = "待分享";
      }
      if (rewardState) {
        rewardState.textContent = "完成分享后奖励自动发放，每日限领 1 次";
      }
      if (progressHint) {
        progressHint.textContent = sharedToday
          ? "Reward auto-credited today"
          : "Share once today to get " + REWARD_TEXT;
      }
      if (shareButton) {
        shareButton.textContent = "Share Now";
        shareButton.disabled = false;
      }
    }
  }

  function completeShare(state, channel) {
    if (hasSharedToday(state)) {
      if (isManualMode(state) && !state.claimed) {
        showToast("今日分享已完成，请直接领取奖励");
        return state;
      }
      if (!isManualMode(state)) {
        showToast("今日奖励已自动到账");
        return state;
      }
    }
    state.shared = MAX_DAILY_SHARE;
    if (!isManualMode(state)) {
      state.claimed = true;
    }
    saveState(state);
    renderState(state);
    closeSheets();
    showToast(
      isManualMode(state)
        ? (state.claimed
          ? "已完成 " + channel + " 分享，今日奖励已领取"
          : "已完成 " + channel + " 分享，可点击 Claim 领取")
        : "已完成 " + channel + " 分享，" + REWARD_TEXT + " 已自动到账"
    );
    return state;
  }

  function claimReward(state) {
    if (!isManualMode(state)) {
      showToast("当前活动为自动领取，无需手动领奖");
      return state;
    }
    if (!hasSharedToday(state)) {
      showToast("请先完成分享，再领取奖励");
      return state;
    }
    if (state.claimed) {
      showToast("今日奖励已领取");
      return state;
    }
    state.claimed = true;
    saveState(state);
    renderState(state);
    showToast(REWARD_TEXT + " 已领取");
    return state;
  }

  function switchMode(state, nextMode) {
    if (nextMode !== DEMO_MODES.auto && nextMode !== DEMO_MODES.manual) {
      return state;
    }
    if (state.mode === nextMode) {
      return state;
    }
    state.mode = nextMode;
    resetDailyProgress(state);
    saveState(state);
    renderState(state);
    closeSheets();
    showToast(nextMode === DEMO_MODES.manual ? "已切换为手动领奖模式" : "已切换为自动领取模式");
    return state;
  }

  onReady(function () {
    var state = readState();
    var shareSheet = query("[data-share-sheet]");

    renderCountdown();
    window.setInterval(renderCountdown, 1000);
    renderState(state);

    queryAll("[data-action]").forEach(function (control) {
      control.addEventListener("click", function () {
        var action = control.getAttribute("data-action");
        if (action === "share-now") {
          if (isManualMode(state) && hasSharedToday(state) && !state.claimed) {
            state = claimReward(state);
          } else if (!isManualMode(state) && state.claimed) {
            showToast("今日奖励已自动到账");
          } else {
            openSheet(shareSheet);
          }
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

    queryAll("[data-demo-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        state = switchMode(state, button.getAttribute("data-demo-mode"));
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeSheets();
      }
    });
  });
})();
