(function () {
  var BANK_BALANCE = 20;
  var DEFAULT_CHANNEL = {
    shortcuts: [
      { amount: 500, bonusRate: 0.30 },
      { amount: 1500, bonusRate: 0.40 },
      { amount: 3000, bonusRate: 0.50 }
    ],
    unlockTiers: [
      { min: 0, max: 1000, ratioMin: 0.05, ratioMax: 0.05 },
      { min: 1000, max: 2000, ratioMin: 0.20, ratioMax: 0.20001 },
      { min: 2000, max: 3000, ratioMin: 0.30, ratioMax: 0.30001 },
      { min: 3000, max: 4000, ratioMin: 0.20888, ratioMax: 0.20889 },
      { min: 4000, max: 5000, ratioMin: 0.20880, ratioMax: 0.20880 },
      { min: 5000, max: null, ratioMin: 0.20880, ratioMax: 0.20880 }
    ]
  };
  var selectedOption = null;
  var toastTimer = 0;

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function query(selector) {
    return document.querySelector(selector);
  }

  function queryAll(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function floorCents(value) {
    return Math.floor((value + 0.000001) * 100) / 100;
  }

  function money(value) {
    return "$" + Number(value).toFixed(2);
  }

  function amountLabel(value) {
    return Number(value).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function findUnlockTier(deposit) {
    for (var index = 0; index < DEFAULT_CHANNEL.unlockTiers.length; index += 1) {
      var tier = DEFAULT_CHANNEL.unlockTiers[index];
      var aboveMin = deposit > tier.min;
      var atOrBelowMax = tier.max === null || deposit <= tier.max;
      if (aboveMin && atOrBelowMax) return tier;
    }
    return DEFAULT_CHANNEL.unlockTiers[0];
  }

  function findUnlockTierIndex(tier) {
    return DEFAULT_CHANNEL.unlockTiers.indexOf(tier) + 1;
  }

  function calculate(deposit, bonusRate) {
    var tier = findUnlockTier(deposit);
    var unlockMin = Math.min(BANK_BALANCE, floorCents(deposit * tier.ratioMin));
    var unlockMax = Math.min(BANK_BALANCE, floorCents(deposit * tier.ratioMax));
    var isRange = tier.ratioMax > tier.ratioMin;
    var depositBonus = floorCents(deposit * bonusRate);
    return {
      deposit: deposit,
      bankCredit: unlockMin,
      unlockMin: unlockMin,
      unlockMax: unlockMax,
      isRange: isRange,
      depositBonus: depositBonus,
      total: deposit + unlockMin + depositBonus,
      totalMax: deposit + unlockMax + depositBonus,
      remaining: BANK_BALANCE - unlockMin,
      tier: tier
    };
  }

  function tierLabel(tier) {
    return tierRangeLabel(tier) + " · " + tierRatioLabel(tier);
  }

  function tierRangeLabel(tier) {
    return tier.max === null
      ? "> " + amountLabel(tier.min)
      : amountLabel(tier.min) + " < amount ≤ " + amountLabel(tier.max);
  }

  function tierRatioLabel(tier) {
    return tier.ratioMin === tier.ratioMax
      ? (tier.ratioMin * 100).toFixed(3) + "%"
      : (tier.ratioMin * 100).toFixed(3) + "% - " + (tier.ratioMax * 100).toFixed(3) + "%";
  }

  function renderTierTable(table, currentTier) {
    if (!table) return;
    table.innerHTML = "";
    DEFAULT_CHANNEL.unlockTiers.forEach(function (tier, index) {
      var row = document.createElement("tr");
      row.className = tier === currentTier ? "is-current" : "";
      row.innerHTML = "<td>" + (index + 1) + "</td><td>" + tierRangeLabel(tier) + "</td><td>" + tierRatioLabel(tier) + "</td>";
      table.appendChild(row);
    });
  }

  function notifyPlayerResize() {
    try {
      if (window.parent && window.parent !== window && window.parent.$axure && window.parent.$axure.player) {
        window.parent.$axure.player.resizeContent(true);
        window.parent.$axure.player.refreshViewPort();
      }
    } catch (error) {
      // Axure local preview can block parent access in some browsers.
    }
  }

  function schedulePlayerResize() {
    notifyPlayerResize();
    window.setTimeout(notifyPlayerResize, 120);
    window.setTimeout(notifyPlayerResize, 500);
  }

  function showToast(message) {
    var toast = query("[data-direct-toast]");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.hidden = true;
    }, 2000);
  }

  function updateSummary(option) {
    var data = calculate(option.deposit, option.bonusRate);
    var deposit = query("[data-credit-deposit]");
    var bank = query("[data-credit-bank]");
    var bonus = query("[data-credit-bonus]");
    var total = query("[data-credit-total]");
    var remaining = query("[data-credit-remaining]");
    var submit = query("[data-direct-action='confirm']");
    var tipTitle = query("[data-direct-tip-title]");
    var tipDetail = query("[data-direct-tip-detail]");
    var rulesTable = query("[data-direct-rules-table]");
    var bankText = money(data.bankCredit);
    var totalText = money(data.total);
    if (data.isRange) {
      bankText = "Up To " + money(data.unlockMax);
      totalText = "Up To " + money(data.totalMax);
    }

    if (deposit) deposit.textContent = money(data.deposit);
    if (bank) bank.textContent = bankText;
    if (bonus) bonus.textContent = "+" + money(data.depositBonus);
    if (total) total.textContent = totalText;
    if (remaining) remaining.textContent = money(data.remaining) + " stays in your Bonus Bank";
    if (bank) bank.classList.toggle("is-up-to", data.isRange);
    if (total) total.classList.toggle("is-up-to", data.isRange);
    renderTierTable(rulesTable, data.tier);
    if (tipTitle) tipTitle.textContent = "Current tier " + findUnlockTierIndex(data.tier);
    if (tipDetail) tipDetail.textContent = tierLabel(data.tier);
    if (submit) {
      submit.textContent = "Deposit " + money(data.deposit) + " · Play with " + totalText;
      submit.classList.remove("is-submitted");
    }
  }

  function selectOption(row) {
    var optionRows = queryAll("[data-direct-option]");
    optionRows.forEach(function (item) {
      var selected = item === row;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    selectedOption = {
      deposit: Number(row.getAttribute("data-deposit")),
      bonusRate: Number(row.getAttribute("data-bonus-rate"))
    };
    updateSummary(selectedOption);
  }

  function renderDefaultChannel() {
    var options = query("[data-direct-options]");
    var empty = query("[data-direct-empty]");
    var summary = query("[data-direct-summary]");
    var submit = query("[data-direct-action='confirm']");
    if (!options || !empty) return;

    options.innerHTML = "";
    if (!DEFAULT_CHANNEL.shortcuts.length) {
      options.hidden = true;
      empty.hidden = false;
      if (summary) summary.hidden = true;
      if (submit) submit.hidden = true;
      selectedOption = null;
      return;
    }

    options.hidden = false;
    empty.hidden = true;
    if (summary) summary.hidden = false;
    if (submit) submit.hidden = false;
    DEFAULT_CHANNEL.shortcuts.forEach(function (shortcut, index) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "direct-credit-option" + (index === 0 ? " is-selected" : "");
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      button.setAttribute("data-direct-option", "");
      button.setAttribute("data-deposit", String(shortcut.amount));
      button.setAttribute("data-bonus-rate", String(shortcut.bonusRate));
      button.innerHTML = "<strong>" + money(shortcut.amount) + "</strong><span>+" + (shortcut.bonusRate * 100).toFixed(0) + "% deposit bonus</span>";
      options.appendChild(button);
    });
  }

  function openHistory() {
    var history = query("[data-direct-history]");
    if (history) history.hidden = false;
  }

  function closeHistory() {
    var history = query("[data-direct-history]");
    if (history) history.hidden = true;
  }

  function openRules() {
    var rules = query("[data-direct-rules]");
    if (rules) rules.hidden = false;
  }

  function closeRules() {
    var rules = query("[data-direct-rules]");
    if (rules) rules.hidden = true;
  }

  function toggleUnlockTip(button) {
    var tip = query("[data-direct-tip]");
    if (!tip) return;
    var shouldOpen = tip.hidden;
    tip.hidden = !shouldOpen;
    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  }

  function confirmCredit() {
    var submit = query("[data-direct-action='confirm']");
    var status = query("[data-credit-status]");
    if (!selectedOption) return;
    if (submit) {
      submit.classList.add("is-submitted");
      submit.textContent = "Direct credit submitted";
    }
    if (status) status.textContent = "Your selected deposit is ready to be credited directly.";
    showToast("Direct credit submitted");
  }

  function handleClick(event) {
    var option = event.target.closest("[data-direct-option]");
    if (option) {
      event.preventDefault();
      selectOption(option);
      return;
    }

    var actionTarget = event.target.closest("[data-direct-action]");
    if (!actionTarget) return;
    var action = actionTarget.getAttribute("data-direct-action");
    if (action === "history") {
      event.preventDefault();
      openHistory();
    } else if (action === "rules") {
      event.preventDefault();
      openRules();
    } else if (action === "close-history") {
      event.preventDefault();
      closeHistory();
    } else if (action === "close-rules") {
      event.preventDefault();
      closeRules();
    } else if (action === "unlock-tip") {
      event.preventDefault();
      toggleUnlockTip(actionTarget);
    } else if (action === "confirm") {
      event.preventDefault();
      confirmCredit();
    }
  }

  function handleKeydown(event) {
    var option = event.target.closest("[data-direct-option]");
    if (option && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      selectOption(option);
    }
    if (event.key === "Escape") {
      closeHistory();
      closeRules();
    }
  }

  onReady(function () {
    renderDefaultChannel();
    var firstOption = query("[data-direct-option]");
    if (firstOption) selectOption(firstOption);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeydown);
    schedulePlayerResize();
  });
}());
