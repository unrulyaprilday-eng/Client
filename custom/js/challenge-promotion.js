(function () {
  var END_AT = new Date("2026-08-31T23:59:00+08:00");
  var INDIVIDUAL_REWARDS = ["R$ 5", "R$ 30", "R$ 10"];
  var UNIFIED_REWARD = "R$ 50";
  var viewState = {
    completionMode: "sequential",
    rewardMode: "individual",
    demoState: "default",
    unifiedClaimed: false
  };

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
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
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () {
      toast.hidden = true;
    }, 2000);
  }

  function formatCountdown() {
    var diff = END_AT.getTime() - Date.now();
    if (diff <= 0) return "活动已结束";
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

  function updateCountdown() {
    var node = query("[data-countdown]");
    if (node) node.textContent = formatCountdown();
  }

  function setTask(card, options) {
    if (!card) return;
    card.classList.remove("is-claimed", "is-ready", "is-progress", "is-locked");
    card.classList.add("is-" + options.state);
    var statusNode = query("[data-status]", card);
    var progressNode = query("[data-task-progress]", card);
    var progressBar = query(".task-progress i", card);
    var rewardValue = query(".task-reward strong", card);
    var button = query("[data-action='task']", card);
    if (statusNode) statusNode.textContent = options.status;
    if (progressNode) progressNode.textContent = options.progressText;
    if (progressBar) progressBar.style.width = options.progressWidth;
    if (rewardValue) rewardValue.textContent = options.rewardText;
    if (button) {
      button.textContent = options.buttonText;
      button.disabled = !options.actionable;
    }
  }

  function getRewardText(index) {
    var card = queryAll("[data-task]")[index];
    if (!card) return INDIVIDUAL_REWARDS[index] || "--";
    return card.getAttribute("data-individual-reward") || INDIVIDUAL_REWARDS[index] || "--";
  }

  function taskOptions(index, state, progressText, progressWidth) {
    var unified = viewState.rewardMode === "unified";
    var completed = state === "claimed";
    var ready = state === "ready";
    var inProgress = state === "progress";
    var status = completed ? (unified ? "已完成" : "已领取") :
      ready ? (unified ? "已完成" : "可领取") :
      inProgress ? "进行中" : "未解锁";
    var buttonText = completed ? (unified ? "等待结算" : "已领取") :
      ready ? (unified ? "等待结算" : "领取") :
      inProgress ? "去完成" : "未解锁";

    return {
      state: state,
      status: status,
      progressText: progressText,
      progressWidth: progressWidth,
      rewardText: unified ? "--" : getRewardText(index),
      buttonText: buttonText,
      actionable: (!unified && ready) || inProgress
    };
  }

  function renderSequential(cards) {
    if (viewState.demoState === "progress") {
      setTask(cards[0], taskOptions(0, "claimed", "R$ 100 / R$ 100", "100%"));
      setTask(cards[1], taskOptions(1, "claimed", "R$ 500 / R$ 500", "100%"));
      setTask(cards[2], taskOptions(2, "progress", "R$ 460 / R$ 1,000", "46%"));
      cards.slice(3).forEach(function (card, index) {
        setTask(card, taskOptions(index + 3, "locked", "完成上一项后解锁", "0%"));
      });
      return;
    }

    if (viewState.demoState === "complete") {
      setTask(cards[0], taskOptions(0, "claimed", "R$ 100 / R$ 100", "100%"));
      setTask(cards[1], taskOptions(1, "claimed", "R$ 500 / R$ 500", "100%"));
      setTask(cards[2], taskOptions(2, "claimed", "R$ 1,000 / R$ 1,000", "100%"));
      cards.slice(3).forEach(function (card, index) {
        setTask(card, taskOptions(index + 3, "claimed", "已完成", "100%"));
      });
      return;
    }

    if (viewState.rewardMode === "unified") {
      setTask(cards[0], taskOptions(0, "claimed", "R$ 100 / R$ 100", "100%"));
      setTask(cards[1], taskOptions(1, "progress", "R$ 320 / R$ 500", "64%"));
      setTask(cards[2], taskOptions(2, "locked", "完成上一项后解锁", "0%"));
    } else {
      setTask(cards[0], taskOptions(0, "claimed", "R$ 100 / R$ 100", "100%"));
      setTask(cards[1], taskOptions(1, "ready", "R$ 500 / R$ 500", "100%"));
      setTask(cards[2], taskOptions(2, "locked", "完成上一项后解锁", "0%"));
    }
    cards.slice(3).forEach(function (card, index) {
      setTask(card, taskOptions(index + 3, "locked", "完成上一项后解锁", "0%"));
    });
  }

  function renderParallel(cards) {
    if (viewState.demoState === "complete") {
      setTask(cards[0], taskOptions(0, "claimed", "R$ 100 / R$ 100", "100%"));
      setTask(cards[1], taskOptions(1, "claimed", "R$ 500 / R$ 500", "100%"));
      setTask(cards[2], taskOptions(2, "claimed", "R$ 1,000 / R$ 1,000", "100%"));
      cards.slice(3).forEach(function (card, index) {
        setTask(card, taskOptions(index + 3, "claimed", "已完成", "100%"));
      });
      return;
    }

    if (viewState.demoState === "progress") {
      setTask(cards[0], taskOptions(0, "claimed", "R$ 100 / R$ 100", "100%"));
      setTask(cards[1], taskOptions(1, "claimed", "R$ 500 / R$ 500", "100%"));
      setTask(cards[2], taskOptions(2, "progress", "R$ 460 / R$ 1,000", "46%"));
      cards.slice(3).forEach(function (card, index) {
        setTask(card, taskOptions(index + 3, "progress", "进行中", ((index * 17 + 28) % 72 + 12) + "%"));
      });
      return;
    }

    setTask(cards[0], taskOptions(0, "claimed", "R$ 100 / R$ 100", "100%"));
    setTask(cards[1], taskOptions(1, viewState.rewardMode === "unified" ? "progress" : "ready", viewState.rewardMode === "unified" ? "R$ 320 / R$ 500" : "R$ 500 / R$ 500", viewState.rewardMode === "unified" ? "64%" : "100%"));
    setTask(cards[2], taskOptions(2, "progress", "R$ 460 / R$ 1,000", "46%"));
    cards.slice(3).forEach(function (card, index) {
      setTask(card, taskOptions(index + 3, "progress", "进行中", ((index * 17 + 28) % 72 + 12) + "%"));
    });
  }

  function renderRewardPanels(completedCount, totalCount) {
    var unifiedPanel = query("[data-unified-reward-panel]");
    var individualCompletion = query("[data-individual-completion]");
    var eyebrow = query("[data-completion-eyebrow]");
    var title = query("[data-completion-title]");
    var detail = query("[data-completion-detail]");
    var button = query("[data-action='claim-total']");
    var unifiedProgressBar = query("[data-unified-progress-bar]");
    var unifiedProgressText = query("[data-unified-progress-text]");
    if (!unifiedPanel || !individualCompletion || !button) return;

    var unified = viewState.rewardMode === "unified";
    var allComplete = totalCount > 0 && completedCount >= totalCount;
    var remaining = Math.max(totalCount - completedCount, 0);
    unifiedPanel.hidden = !unified;
    unifiedPanel.classList.toggle("is-claimed", viewState.unifiedClaimed);
    individualCompletion.hidden = unified || !allComplete;
    if (unifiedProgressBar) unifiedProgressBar.style.width = (totalCount ? completedCount / totalCount * 100 : 0) + "%";
    if (unifiedProgressText) unifiedProgressText.textContent = "已完成 " + completedCount + " / " + totalCount + " 项";

    if (unified && allComplete && !viewState.unifiedClaimed) {
      button.textContent = "领取 " + UNIFIED_REWARD;
      button.disabled = false;
    } else if (unified && viewState.unifiedClaimed) {
      button.textContent = "已领取";
      button.disabled = true;
    } else {
      button.textContent = "还差 " + remaining + " 项";
      button.disabled = true;
    }

    if (eyebrow) eyebrow.textContent = "ALL CLEARED";
    if (title) title.textContent = "今日挑战已全部完成";
    if (detail) detail.textContent = "奖励已领取，明日 00:00 开启新一轮挑战。";
  }

  function renderControls() {
    queryAll("[data-completion-mode]").forEach(function (button) {
      var active = button.getAttribute("data-completion-mode") === viewState.completionMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    queryAll("[data-reward-mode]").forEach(function (button) {
      var active = button.getAttribute("data-reward-mode") === viewState.rewardMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    queryAll("[data-demo-state]").forEach(function (button) {
      var active = button.getAttribute("data-demo-state") === viewState.demoState;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    var track = query("[data-challenge-track]");
    var individualRules = query("[data-individual-rules]");
    var unifiedRules = query("[data-unified-rules]");
    if (track) {
      track.classList.toggle("is-sequential", viewState.completionMode === "sequential");
      track.classList.toggle("is-parallel", viewState.completionMode === "parallel");
      track.classList.toggle("is-unified", viewState.rewardMode === "unified");
    }
    if (individualRules) individualRules.hidden = viewState.rewardMode !== "individual";
    if (unifiedRules) unifiedRules.hidden = viewState.rewardMode !== "unified";
  }

  function render() {
    var cards = queryAll("[data-task]");
    if (!cards.length) return;
    if (viewState.completionMode === "parallel") renderParallel(cards);
    else renderSequential(cards);
    var completedCount = cards.filter(function (card) { return card.classList.contains("is-claimed"); }).length;
    var totalCount = cards.length;
    renderRewardPanels(completedCount, totalCount);
    renderControls();
  }

  onReady(function () {
    queryAll("[data-task]").forEach(function (card, index) {
      var value = query(".task-reward strong", card);
      if (value) card.setAttribute("data-individual-reward", value.textContent.trim());
      var step = query(".task-step span", card);
      if (step) step.textContent = String(index + 1);
    });
    var rulesButton = query("[data-action='scroll-rules']");
    if (rulesButton) {
      rulesButton.addEventListener("click", function () {
        var rules = query("#activity-rules");
        if (rules) rules.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    queryAll("[data-completion-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        viewState.completionMode = button.getAttribute("data-completion-mode") || "sequential";
        viewState.unifiedClaimed = false;
        render();
      });
    });

    queryAll("[data-reward-mode]").forEach(function (button) {
      button.addEventListener("click", function () {
        viewState.rewardMode = button.getAttribute("data-reward-mode") || "individual";
        viewState.unifiedClaimed = false;
        render();
      });
    });

    queryAll("[data-demo-state]").forEach(function (button) {
      button.addEventListener("click", function () {
        viewState.demoState = button.getAttribute("data-demo-state") || "default";
        viewState.unifiedClaimed = false;
        render();
      });
    });

    queryAll("[data-action='task']").forEach(function (button) {
      button.addEventListener("click", function () {
        var card = button.closest("[data-task]");
        if (!card) return;
        if (card.classList.contains("is-ready") && viewState.rewardMode === "individual") {
          viewState.demoState = "progress";
          render();
          showToast("R$ 30 已领取，挑战进度已更新");
        } else if (card.classList.contains("is-progress")) {
          window.location.href = "../start.html";
        }
      });
    });

    var totalButton = query("[data-action='claim-total']");
    if (totalButton) {
      totalButton.addEventListener("click", function () {
        var cards = queryAll("[data-task]");
        var allComplete = cards.length > 0 && cards.every(function (card) { return card.classList.contains("is-claimed"); });
        if (viewState.rewardMode !== "unified" || !allComplete) return;
        viewState.unifiedClaimed = true;
        render();
        showToast(UNIFIED_REWARD + " 统一奖励已领取");
      });
    }

    render();
    updateCountdown();
    window.setInterval(updateCountdown, 1000);
  });
})();
