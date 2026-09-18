(function () {
  "use strict";

  function setModal(card, open) {
    var modal = card.querySelector("[data-modal]");
    if (!modal) return;
    modal.classList.toggle("is-open", open);
    var trigger = card.querySelector('[data-action="open-modal"]');
    if (trigger) trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function init() {
    document.querySelectorAll("[data-notice-card]").forEach(function (card) {
      card.addEventListener("click", function (event) {
        var actionNode = event.target.closest("[data-action]");
        if (!actionNode || !card.contains(actionNode)) return;
        var action = actionNode.getAttribute("data-action");
        if (action === "open-modal") {
          setModal(card, true);
        } else if (action === "close-modal") {
          setModal(card, false);
        } else if (action === "open-piggy") {
          window.location.href = "PIGGY BANK.html";
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
