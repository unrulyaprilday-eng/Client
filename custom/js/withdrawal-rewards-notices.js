(function () {
  "use strict";

  function formatAmount(amount) {
    return "$" + amount.toFixed(2);
  }

  function readFreeBalance(card) {
    var configured = card.getAttribute("data-free-balance");
    var balanceNode = card.querySelector("[data-free-balance-value]");
    var raw = configured !== null ? configured : balanceNode ? balanceNode.textContent : "0";
    var amount = parseFloat(String(raw).replace(/[^\d.-]/g, ""));
    return isFinite(amount) && amount > 0 ? amount : 0;
  }

  function setText(card, selector, value) {
    var node = card.querySelector(selector);
    if (node) node.textContent = value;
  }

  function updateConversion(card) {
    var freeBalance = readFreeBalance(card);
    var bonusBalance = freeBalance / 10;
    var freeText = formatAmount(freeBalance);
    var bonusText = formatAmount(bonusBalance);
    var triggerLabel = card.querySelector("[data-free-balance-label]");
    var balanceValue = card.querySelector("[data-free-balance-value]");
    var cta = card.querySelector("[data-conversion-cta]");

    if (triggerLabel) triggerLabel.textContent = freeBalance.toFixed(2);
    if (balanceValue) balanceValue.textContent = freeText;
    setText(card, "[data-conversion-source]", freeText);
    setText(card, "[data-conversion-target]", bonusText);
    if (cta) {
      cta.textContent = "Convert " + freeText + " \u2192 " + bonusText;
      cta.setAttribute("aria-label", "Convert " + freeText + " to " + bonusText + " and open Bonus Bank");
    }
  }

  function setModal(card, open) {
    var modal = card.querySelector("[data-modal]");
    if (!modal) return;
    updateConversion(card);
    modal.classList.toggle("is-open", open);
    modal.setAttribute("aria-hidden", open ? "false" : "true");
    var trigger = card.querySelector('[data-action="open-modal"]');
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function navigateToPiggy() {
    window.location.href = "PIGGY BANK.html";
  }

  function init() {
    document.querySelectorAll("[data-notice-card]").forEach(function (card) {
      var modal = card.querySelector("[data-modal]");
      updateConversion(card);
      if (modal) modal.setAttribute("aria-hidden", modal.classList.contains("is-open") ? "false" : "true");

      card.addEventListener("click", function (event) {
        var actionNode = event.target.closest("[data-action]");
        if (!actionNode || !card.contains(actionNode)) return;
        var action = actionNode.getAttribute("data-action");
        if (action === "open-modal") {
          setModal(card, true);
        } else if (action === "close-modal") {
          setModal(card, false);
        } else if (action === "open-piggy") {
          event.preventDefault();
          navigateToPiggy();
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
