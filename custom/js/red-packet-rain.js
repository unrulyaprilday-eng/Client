(function () {
  var RED_PACKET_STORAGE_KEY = "promoRedPacketActivities";
  var CLAIM_STORAGE_KEY = "redPacketRainClaimState";
  var WEEK_LABELS = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  var DEFAULT_CONFIG = {
    id: "red-packet-demo",
    name: "周末红包雨",
    enabled: true,
    monthDays: ["1", "2", "11", "12", "21", "22"],
    weekDays: ["1", "2"],
    cycleRelation: "or",
    timeRanges: [
      { start: "08:00", end: "09:00", endDay: "same" },
      { start: "18:00", end: "19:00", endDay: "same" }
    ],
    wagerMultiple: "1",
    dailyClaimLimit: "3",
    totalDisplay: "1000",
    singleDisplay: "66",
    totalLimit: "1000",
    singleLimit: "66",
    rewardTarget: "金额",
    conditionMode: "满足任意一个",
    lookbackDays: "3",
    description: "活动期间，符合领取条件的玩家可参与红包雨。\n每个时间段内，每位玩家仅可领取配置次数内的红包。\n红包金额按档位随机发放，并领取至所选的中奖金额目标。",
    tiers: [
      { min: "7777", max: "7777", count: "1", recharge: "100", validBet: "0" },
      { min: "5.01", max: "10", count: "20", recharge: "100", validBet: "0" },
      { min: "0.5", max: "5", count: "50", recharge: "100", validBet: "0" }
    ]
  };
  var config = DEFAULT_CONFIG;
  var viewState = { demoState: "active" };
  var claimState;
  var activeEndAt = Date.now() + 34 * 60 * 1000;

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

  function setText(selector, value) {
    queryAll(selector).forEach(function (node) {
      node.textContent = String(value);
    });
  }

  function toNumber(value, fallback) {
    var number = Number(value);
    return isFinite(number) ? number : fallback;
  }

  function money(value, decimals) {
    var number = toNumber(value, 0);
    return "R$ " + number.toFixed(decimals === undefined ? 2 : decimals);
  }

  function todayKey() {
    var now = new Date();
    return now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  }

  function readConfiguredRecord() {
    var records;
    try {
      records = JSON.parse(window.localStorage.getItem(RED_PACKET_STORAGE_KEY) || "[]");
    } catch (error) {
      return null;
    }
    if (!Array.isArray(records) || !records.length) return null;
    return records.filter(function (record) { return record && record.enabled !== false; })[0] || records[0];
  }

  function normalizeConfig(record) {
    var result = Object.assign({}, DEFAULT_CONFIG, record || {});
    result.monthDays = Array.isArray(result.monthDays) ? result.monthDays.map(String) : DEFAULT_CONFIG.monthDays.slice();
    result.weekDays = Array.isArray(result.weekDays) ? result.weekDays.map(String) : DEFAULT_CONFIG.weekDays.slice();
    result.timeRanges = Array.isArray(result.timeRanges) && result.timeRanges.length ? result.timeRanges.map(function (range) {
      return {
        start: range.start || "08:00",
        end: range.end || "09:00",
        endDay: range.endDay === "next" ? "next" : "same"
      };
    }) : DEFAULT_CONFIG.timeRanges.slice();
    result.tiers = Array.isArray(result.tiers) && result.tiers.length ? result.tiers : DEFAULT_CONFIG.tiers.slice();
    result.dailyClaimLimit = Math.max(1, toNumber(result.dailyClaimLimit, 3));
    result.lookbackDays = Math.max(1, toNumber(result.lookbackDays, 3));
    result.wagerMultiple = Math.max(0, toNumber(result.wagerMultiple, 1));
    result.totalDisplay = Math.max(0, toNumber(result.totalDisplay, 1000));
    result.singleDisplay = Math.max(0, toNumber(result.singleDisplay, 66));
    result.totalLimit = Math.max(0, toNumber(result.totalLimit, result.totalDisplay));
    result.singleLimit = Math.max(0, toNumber(result.singleLimit, result.singleDisplay));
    result.conditionMode = result.conditionMode || "满足任意一个";
    result.rewardTarget = result.rewardTarget === "存钱罐" ? "存钱罐" : "金额";
    return result;
  }

  function parseTime(value) {
    var parts = String(value || "").split(":");
    var hours = Number(parts[0]);
    var minutes = Number(parts[1]);
    if (!isFinite(hours) || !isFinite(minutes)) return 0;
    return hours * 60 + minutes;
  }

  function formatTimeRange(range) {
    return range.start + " - " + (range.endDay === "next" ? "次日 " : "") + range.end;
  }

  function formatCycle() {
    var month = config.monthDays.length ? "每月 " + config.monthDays.join("、") + " 日" : "";
    var week = config.weekDays.length ? "每周 " + config.weekDays.map(function (day) { return WEEK_LABELS[Number(day)] || day; }).join("、") : "";
    if (month && week) return month + (config.cycleRelation === "and" ? " 且 " : " 或 ") + week;
    return month || week || "按活动安排投放";
  }

  function conditionLabel() {
    if (config.conditionMode === "不限制") return "不限制领取条件";
    return config.conditionMode + "，最近 " + config.lookbackDays + " 天";
  }

  function rewardTargetLabel() {
    return config.rewardTarget === "存钱罐" ? "存钱罐" : "主钱包";
  }

  function renderConfig() {
    var singleDisplay = config.singleDisplay || config.singleLimit;
    var cycle = formatCycle();
    var rangeText = config.timeRanges.map(formatTimeRange).join("、");
    setText("[data-activity-name]", config.name || DEFAULT_CONFIG.name);
    setText("[data-activity-subtitle]", "每场 " + config.dailyClaimLimit + " 次机会，单个红包最高 " + money(singleDisplay));
    setText("[data-pool-amount]", money(config.totalDisplay, 0));
    setText("[data-session-note]", "每位玩家本场最多 " + config.dailyClaimLimit + " 次");
    setText("[data-lookback-days]", config.conditionMode === "不限制" ? "不统计" : "最近 " + config.lookbackDays + " 天");
    setText("[data-cycle-summary]", cycle);
    setText("[data-rule-claim-limit]", config.dailyClaimLimit + " 次");
    setText("[data-rule-cycle]", cycle + " 投放，时间段为 " + rangeText + "。");
    setText("[data-rule-total-display]", money(config.totalDisplay, 0));
    setText("[data-rule-single-display]", money(singleDisplay, 0));
    setText("[data-rule-wager-multiple]", config.wagerMultiple + " 倍");
    setText("[data-rule-reward-target]", rewardTargetLabel());
    setText("[data-qualification-note]", config.conditionMode === "不限制"
      ? "本活动不限制领取条件，进入红包时间段即可参与。"
      : "系统按红包开始前最近 " + config.lookbackDays + " 天的数据判断可领取档位，优先匹配高档位。");
    setText("[data-note-cycle]", cycle);
    setText("[data-note-time]", rangeText);
    setText("[data-note-claim-limit]", config.dailyClaimLimit + " 次");
    setText("[data-note-total-display]", money(config.totalDisplay, 0));
    setText("[data-note-condition]", conditionLabel());
    setText("[data-note-wager-multiple]", config.wagerMultiple + " 倍");
    setText("[data-note-reward-target]", config.rewardTarget);
    renderTimeRanges();
    renderTiers();
    renderDescription();
  }

  function highestTier() {
    return (config.tiers[0] || DEFAULT_CONFIG.tiers[0]);
  }

  function renderTimeRanges() {
    var list = query("[data-time-range-list]");
    if (!list) return;
    list.textContent = "";
    config.timeRanges.forEach(function (range, index) {
      var article = document.createElement("article");
      var indexNode = document.createElement("span");
      var body = document.createElement("div");
      var title = document.createElement("strong");
      var detail = document.createElement("small");
      var status = document.createElement("em");
      article.className = "time-range" + (index === 0 ? " is-current" : "");
      article.setAttribute("data-time-range", "");
      indexNode.className = "time-range-index";
      indexNode.textContent = String(index + 1).padStart(2, "0");
      title.textContent = formatTimeRange(range);
      detail.textContent = index === 0 ? "当前场次" : "下一场";
      status.textContent = index === 0 ? "进行中" : "待开放";
      body.appendChild(title);
      body.appendChild(detail);
      article.appendChild(indexNode);
      article.appendChild(body);
      article.appendChild(status);
      list.appendChild(article);
    });
  }

  function renderTiers() {
    var list = query("[data-tier-list]");
    if (!list) return;
    list.textContent = "";
    config.tiers.forEach(function (tier, index) {
      var article = document.createElement("article");
      var badge = document.createElement("div");
      var body = document.createElement("div");
      var reward = document.createElement("strong");
      var amount = document.createElement("span");
      var condition = document.createElement("em");
      var min = toNumber(tier.min, 0);
      var max = toNumber(tier.max, min);
      var rangeText = min === max ? money(min) : money(min) + " - " + max.toFixed(2);
      article.className = "tier-card" + (index === 0 ? " tier-card--top" : "");
      badge.className = "tier-badge";
      badge.textContent = String(index + 1).padStart(2, "0");
      reward.textContent = rangeText;
      amount.textContent = (index === 0 ? "高档位" : index === 1 ? "中档位" : "基础档位") + " · " + toNumber(tier.count, 0) + " 个";
      condition.textContent = conditionText(tier);
      body.appendChild(reward);
      body.appendChild(amount);
      article.appendChild(badge);
      article.appendChild(body);
      article.appendChild(condition);
      list.appendChild(article);
    });
  }

  function conditionText(tier) {
    var recharge = toNumber(tier.recharge, 0);
    var validBet = toNumber(tier.validBet, 0);
    if (!recharge && !validBet) return "不限制";
    if (recharge && validBet) return "充值 " + money(recharge, 0) + " / 投注 " + money(validBet, 0);
    if (recharge) return "充值 " + money(recharge, 0);
    return "投注 " + money(validBet, 0);
  }

  function renderDescription() {
    var list = query("[data-description-list]");
    if (!list) return;
    var lines = String(config.description || DEFAULT_CONFIG.description).split(/\r?\n/).filter(function (line) { return line.trim(); });
    list.textContent = "";
    lines.forEach(function (line) {
      var item = document.createElement("li");
      item.textContent = line.trim();
      list.appendChild(item);
    });
  }

  function stateKey() {
    return String(config.id || DEFAULT_CONFIG.id) + "-" + todayKey();
  }

  function defaultClaimState() {
    return { key: stateKey(), claims: 0, total: 0, packetIds: [] };
  }

  function readClaimState() {
    try {
      var saved = JSON.parse(window.localStorage.getItem(CLAIM_STORAGE_KEY) || "{}");
      if (!saved || saved.key !== stateKey()) return defaultClaimState();
      return {
        key: saved.key,
        claims: Math.max(0, toNumber(saved.claims, 0)),
        total: Math.max(0, toNumber(saved.total, 0)),
        packetIds: Array.isArray(saved.packetIds) ? saved.packetIds : []
      };
    } catch (error) {
      return defaultClaimState();
    }
  }

  function saveClaimState() {
    try {
      window.localStorage.setItem(CLAIM_STORAGE_KEY, JSON.stringify(claimState));
    } catch (error) {
      // Local prototype preview can disable storage.
    }
  }

  function formatDuration(milliseconds) {
    var seconds = Math.max(0, Math.floor(milliseconds / 1000));
    var days = Math.floor(seconds / 86400);
    var hours;
    var minutes;
    seconds -= days * 86400;
    hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    return (days ? days + "天 " : "") + String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  function isCycleDate(date) {
    var week = date.getDay() === 0 ? 7 : date.getDay();
    var monthMatch = config.monthDays.indexOf(String(date.getDate())) !== -1;
    var weekMatch = config.weekDays.indexOf(String(week)) !== -1;
    return config.cycleRelation === "and" ? monthMatch && weekMatch : monthMatch || weekMatch;
  }

  function nextScheduledStart() {
    var now = new Date();
    var result = null;
    for (var dayOffset = 0; dayOffset <= 370 && !result; dayOffset += 1) {
      var date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, 0, 0, 0, 0);
      if (!isCycleDate(date)) continue;
      config.timeRanges.some(function (range) {
        var start = new Date(date.getTime());
        var minutes = parseTime(range.start);
        start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
        if (start.getTime() > now.getTime()) {
          result = { start: start, range: range };
          return true;
        }
        return false;
      });
    }
    return result;
  }

  function activeRangeText() {
    return config.timeRanges[0] ? formatTimeRange(config.timeRanges[0]) : "等待下一场";
  }

  function renderSession() {
    var panel = query("[data-session-panel]");
    var next = nextScheduledStart();
    var sessionLabel = "进行中";
    var badgeLabel = "进行中";
    var screenTitle = "红包正在掉落";
    var hint = "点击红包领取，先到先得";
    var countdown = "本场剩余 " + formatDuration(activeEndAt - Date.now());
    var windowText = activeRangeText();
    var isAvailable = viewState.demoState === "active";
    var isLocked = viewState.demoState === "locked";
    if (viewState.demoState === "next") {
      sessionLabel = "下一场";
      badgeLabel = "即将开始";
      screenTitle = "下一场开放时可领取";
      hint = next ? "距离下一场还有 " + formatDuration(next.start.getTime() - Date.now()) : "等待下一场安排";
      countdown = next ? "距离下一场 " + formatDuration(next.start.getTime() - Date.now()) : "等待下一场";
      windowText = next ? formatTimeRange(next.range) : activeRangeText();
      isAvailable = false;
    } else if (isLocked) {
      sessionLabel = "待达标";
      badgeLabel = "待达标";
      screenTitle = "完成条件后可领取";
      hint = "当前资格不足，请完成领取条件";
      isAvailable = false;
    } else if (viewState.demoState === "ended") {
      sessionLabel = "已结束";
      badgeLabel = "本场已结束";
      screenTitle = "本场红包已结束";
      hint = "请关注下一场红包雨";
      countdown = "等待下一场开放";
      isAvailable = false;
    }
    if (config.enabled === false) {
      sessionLabel = "已关闭";
      badgeLabel = "活动关闭";
      screenTitle = "活动暂未开放";
      hint = "活动开启后才可参与";
      countdown = "活动暂未开放";
      isAvailable = false;
    }
    if (panel) {
      panel.classList.toggle("is-active", isAvailable);
      panel.classList.toggle("is-next", viewState.demoState === "next");
      panel.classList.toggle("is-locked", isLocked);
      panel.classList.toggle("is-ended", viewState.demoState === "ended" || config.enabled === false);
    }
    setText("[data-session-label]", sessionLabel);
    setText("[data-hero-badge]", badgeLabel);
    setText("[data-screen-title]", screenTitle);
    setText("[data-packet-hint]", hint);
    setText("[data-session-window]", windowText);
    setText("[data-countdown]", countdown);
    renderScheduleState();
    renderClaimState(isAvailable && !isLocked);
  }

  function renderScheduleState() {
    queryAll("[data-time-range]").forEach(function (node, index) {
      var status = node.querySelector("em");
      var detail = node.querySelector("small");
      node.classList.remove("is-current", "is-next");
      if (viewState.demoState === "active" && index === 0) {
        node.classList.add("is-current");
        if (status) status.textContent = "进行中";
        if (detail) detail.textContent = "当前场次";
      } else if (viewState.demoState === "next" && index === 0) {
        node.classList.add("is-next");
        if (status) status.textContent = "下一场";
        if (detail) detail.textContent = "即将开放";
      } else if (viewState.demoState === "locked" && index === 0) {
        node.classList.add("is-current");
        if (status) status.textContent = "待达标";
        if (detail) detail.textContent = "已进入时间段";
      } else {
        if (status) status.textContent = viewState.demoState === "ended" ? "待开放" : "待开放";
        if (detail) detail.textContent = index === 1 ? "下一场" : "稍后开放";
      }
    });
  }

  function renderQualification() {
    var panel = query("[aria-label='领取资格']");
    var locked = viewState.demoState === "locked";
    var tier = highestTier();
    var qualification = query("[data-qualification-status]");
    var rechargeTarget = toNumber(tier.recharge, 0);
    var betTarget = toNumber(tier.validBet, 0);
    var rechargeProgress = locked ? 0 : rechargeTarget;
    var betProgress = locked && betTarget ? 0 : betTarget;
    var rechargeBar = query("[data-recharge-progress-bar]");
    var betBar = query("[data-bet-progress-bar]");
    if (panel) panel.classList.toggle("is-locked", locked);
    setText("[data-recharge-progress]", money(rechargeProgress, 0) + " / " + money(rechargeTarget, 0));
    setText("[data-bet-progress]", money(betProgress, 0) + " / " + money(betTarget, 0));
    if (rechargeBar) rechargeBar.style.width = (rechargeTarget ? rechargeProgress / rechargeTarget * 100 : 100) + "%";
    if (betBar) betBar.style.width = (betTarget ? betProgress / betTarget * 100 : 100) + "%";
    setText("[data-qualification-status]", locked ? "暂不可领取" : "可领取高档位");
    if (qualification) qualification.setAttribute("aria-label", locked ? "暂不可领取" : "可领取高档位");
  }

  function renderClaimState(canClaim) {
    var limit = config.dailyClaimLimit;
    var claims = Math.min(claimState.claims, limit);
    var packets = queryAll("[data-packet]");
    setText("[data-claim-progress]", claims + " / " + limit);
    setText("[data-total-reward]", money(claimState.total));
    var progress = query("[data-claim-progress-bar]");
    if (progress) progress.style.width = (limit ? claims / limit * 100 : 0) + "%";
    packets.forEach(function (packet, index) {
      var id = String(index);
      var collected = claimState.packetIds.indexOf(id) !== -1;
      packet.classList.toggle("is-collected", collected);
      packet.disabled = collected || !canClaim || claims >= limit;
      packet.setAttribute("aria-label", collected ? "该红包已领取" : (canClaim ? "领取红包" : "当前不可领取"));
    });
    if (canClaim && claims >= limit) setText("[data-packet-hint]", "本场红包已领满，请等待下一场");
    renderWinners();
  }

  function renderWinners() {
    var list = query("[data-winner-list]");
    var records = [
      { name: "Mi****os", reward: 100 },
      { name: "Ta****on", reward: 95 },
      { name: "Lu****ga", reward: 93 }
    ];
    if (!list) return;
    if (claimState.total > 0) records.unshift({ name: "您", reward: claimState.total });
    list.textContent = "";
    records.slice(0, 3).forEach(function (record) {
      var item = document.createElement("li");
      var name = document.createElement("span");
      var action = document.createElement("em");
      var reward = document.createElement("strong");
      name.textContent = record.name;
      action.textContent = "抢到红包";
      reward.textContent = money(record.reward);
      item.appendChild(name);
      item.appendChild(action);
      item.appendChild(reward);
      list.appendChild(item);
    });
  }

  function showToast(message) {
    var toast = query("[data-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.hidden = true; }, 2200);
  }

  function openClaimSheet(reward) {
    var sheet = query("[data-claim-sheet]");
    if (!sheet) return;
    setText("[data-claim-reward]", money(reward));
    setText("[data-claim-body]", "奖励已发放至" + rewardTargetLabel() + "，完成 " + config.wagerMultiple + " 倍有效投注后可提款。");
    sheet.hidden = false;
  }

  function closeClaimSheet() {
    var sheet = query("[data-claim-sheet]");
    if (sheet) sheet.hidden = true;
  }

  function claimPacket(packet) {
    var limit = config.dailyClaimLimit;
    var index = queryAll("[data-packet]").indexOf(packet);
    var reward;
    if (viewState.demoState !== "active" || config.enabled === false) {
      showToast(viewState.demoState === "locked" ? "完成领取条件后才可抢红包" : "当前不在红包时间段内");
      return;
    }
    if (claimState.claims >= limit) {
      showToast("本场红包已领满，请等待下一场");
      return;
    }
    if (claimState.packetIds.indexOf(String(index)) !== -1) return;
    reward = Math.min(toNumber(packet.getAttribute("data-reward"), config.singleDisplay), config.singleLimit);
    claimState.claims += 1;
    claimState.total += reward;
    claimState.packetIds.push(String(index));
    saveClaimState();
    renderClaimState(true);
    openClaimSheet(reward);
  }

  function resetClaimState() {
    claimState = defaultClaimState();
    saveClaimState();
    renderClaimState(viewState.demoState === "active" && config.enabled !== false);
    showToast("本场领取进度已重置");
  }

  function setDemoState(nextState) {
    if (["active", "next", "locked", "ended"].indexOf(nextState) === -1) return;
    viewState.demoState = nextState;
    if (nextState === "active" || nextState === "locked") activeEndAt = Date.now() + 34 * 60 * 1000;
    queryAll("[data-demo-state]").forEach(function (button) {
      var active = button.getAttribute("data-demo-state") === nextState;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    renderSession();
    renderQualification();
    closeClaimSheet();
  }

  function updateCountdown() {
    if (viewState.demoState === "active" && activeEndAt <= Date.now()) {
      setDemoState("ended");
      return;
    }
    renderSession();
  }

  function bindActions() {
    queryAll("[data-packet]").forEach(function (packet) {
      packet.addEventListener("click", function () { claimPacket(packet); });
    });
    queryAll("[data-demo-state]").forEach(function (button) {
      button.addEventListener("click", function () { setDemoState(button.getAttribute("data-demo-state")); });
    });
    queryAll("[data-action]").forEach(function (control) {
      control.addEventListener("click", function () {
        var action = control.getAttribute("data-action");
        if (action === "scroll-rules") {
          var rules = query("#activity-rules");
          if (rules) rules.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (action === "focus-rain") {
          var rain = query("[data-rain-field]");
          if (rain) rain.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (action === "close-claim-sheet") {
          closeClaimSheet();
        } else if (action === "reset-claim") {
          resetClaimState();
        }
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeClaimSheet();
    });
  }

  onReady(function () {
    config = normalizeConfig(readConfiguredRecord());
    claimState = readClaimState();
    renderConfig();
    bindActions();
    queryAll("[data-demo-state]").forEach(function (button) {
      button.setAttribute("aria-pressed", button.classList.contains("is-active") ? "true" : "false");
    });
    renderSession();
    renderQualification();
    window.setInterval(updateCountdown, 1000);
  });
})();
