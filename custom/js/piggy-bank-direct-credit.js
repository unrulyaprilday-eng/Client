(function () {
  var BANK_BALANCE = 20;
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

  function calculate(deposit, bonusRate) {
    var bankCredit = Math.min(deposit, BANK_BALANCE);
    var depositBonus = floorCents(deposit * bonusRate);
    return {
      deposit: deposit,
      bankCredit: bankCredit,
      depositBonus: depositBonus,
      total: deposit + bankCredit + depositBonus,
      remaining: BANK_BALANCE - bankCredit
    };
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
    var status = query("[data-credit-status]");

    if (deposit) deposit.textContent = money(data.deposit);
    if (bank) bank.textContent = money(data.bankCredit);
    if (bonus) bonus.textContent = "+" + money(data.depositBonus);
    if (total) total.textContent = money(data.total);
    if (remaining) remaining.textContent = money(data.remaining) + " stays in your Bonus Bank";
    if (submit) {
      submit.textContent = "Deposit " + money(data.deposit) + " · Play with " + money(data.total);
      submit.classList.remove("is-submitted");
    }
    if (status) status.textContent = "Ready to credit directly to your balance.";
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

  function openHistory() {
    var history = query("[data-direct-history]");
    if (history) history.hidden = false;
  }

  function closeHistory() {
    var history = query("[data-direct-history]");
    if (history) history.hidden = true;
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
    } else if (action === "close-history") {
      event.preventDefault();
      closeHistory();
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
    if (event.key === "Escape") closeHistory();
  }

  onReady(function () {
    var firstOption = query("[data-direct-option]");
    if (firstOption) selectOption(firstOption);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeydown);
    schedulePlayerResize();
  });
}());
