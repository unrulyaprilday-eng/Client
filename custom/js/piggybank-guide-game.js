(function () {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  onReady(function () {
    var root = document.querySelector("[data-piggy-guide]");
    var flow = document.querySelector("[data-screenshot-flow]");

    if (!root || !flow) {
      return;
    }

    var frames = {
      start: "custom/assets/piggybank-guide/flow-01-start.png",
      saved: "custom/assets/piggybank-guide/flow-02-saved.png",
      keepPlaying: "custom/assets/piggybank-guide/flow-03-keep-playing.png",
      playing: "custom/assets/piggybank-guide/flow-04-playing.png",
      complete: "custom/assets/piggybank-guide/flow-05-complete.png"
    };

    var state = {
      frame: "start",
      spinCount: Number(flow.getAttribute("data-spin-count")) || 5,
      completionDestination: "piggybank"
    };

    var frameImage = flow.querySelector("[data-flow-frame]");
    var spinButton = flow.querySelector("[data-flow-spin]");
    var nextButton = flow.querySelector("[data-flow-next]");
    var gullakButton = flow.querySelector("[data-flow-gullak]");
    var balanceCompleteModal = flow.querySelector("[data-balance-complete-modal]");
    var completionDestinationButtons = document.querySelectorAll("[data-completion-destination]");
    var piggyBankButton = root.querySelector("[data-go-piggybank]");
    var helpButton = flow.querySelector("[data-flow-help]");
    var helpPanel = flow.querySelector("[data-flow-help-panel]");
    var helpScroll = flow.querySelector("[data-flow-help-scroll]");
    var closeHelpButton = flow.querySelector("[data-flow-help-close]");
    var gameView = root.querySelector("[data-game-view]");
    var replayButton = root.querySelector("[data-replay-guide]");
    var unlockButton = root.querySelector("[data-unlock-bank]");
    var bankStatus = root.querySelector("[data-bank-status]");
    var toast = root.querySelector("[data-toast]");

    function setHidden(node, hidden) {
      if (node) {
        node.hidden = hidden;
      }
    }

    function setFrame(name) {
      state.frame = name;

      var frameName = name;

      if (name === "complete" && state.completionDestination === "balance") {
        frameName = "playing";
      }

      if (frameImage && frames[frameName]) {
        frameImage.src = frames[frameName];
      }

      setHidden(spinButton, !(name === "start" || name === "keepPlaying" || name === "playing"));
      setHidden(nextButton, name !== "saved");
      setHidden(gullakButton, name !== "complete" || state.completionDestination !== "piggybank");
      setHidden(balanceCompleteModal, name !== "complete" || state.completionDestination !== "balance");
    }

    function setCompletionDestination(destination) {
      state.completionDestination = destination === "balance" ? "balance" : "piggybank";

      completionDestinationButtons.forEach(function (button) {
        button.classList.toggle(
          "is-active",
          button.getAttribute("data-completion-destination") === state.completionDestination
        );
      });

      setFrame("complete");
    }

    function showToast(message) {
      if (!toast) {
        return;
      }

      toast.textContent = message;
      toast.hidden = false;
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(function () {
        toast.hidden = true;
      }, 1600);
    }

    function openHelp() {
      setHidden(helpPanel, false);

      if (helpScroll) {
        helpScroll.scrollTop = 0;
      }
    }

    function closeHelp() {
      setHidden(helpPanel, true);
    }

    function goToPiggyBank() {
      window.location.href = "PIGGY BANK.html";
    }

    function resetFlow() {
      setHidden(gameView, false);
      closeHelp();
      setFrame("start");

      if (unlockButton) {
        unlockButton.classList.remove("is-claimed");
        unlockButton.textContent = "UNLOCK BONUS";
      }

      if (bankStatus) {
        bankStatus.textContent = "Ready to unlock";
      }
    }

    function advanceFromSpin() {
      if (state.frame === "start") {
        setFrame("saved");
        return;
      }

      if (state.frame === "keepPlaying") {
        setFrame("playing");
        return;
      }

      if (state.frame === "playing") {
        setFrame("complete");
      }
    }

    function advanceFromNext() {
      if (state.spinCount <= 1) {
        setFrame("complete");
        return;
      }

      setFrame("keepPlaying");
    }

    if (spinButton) {
      spinButton.addEventListener("click", advanceFromSpin);
    }

    if (nextButton) {
      nextButton.addEventListener("click", advanceFromNext);
    }

    if (gullakButton) {
      gullakButton.addEventListener("click", goToPiggyBank);
    }

    if (piggyBankButton) {
      piggyBankButton.addEventListener("click", goToPiggyBank);
    }

    completionDestinationButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setCompletionDestination(button.getAttribute("data-completion-destination"));
      });
    });

    if (helpButton) {
      helpButton.addEventListener("click", openHelp);
    }

    if (closeHelpButton) {
      closeHelpButton.addEventListener("click", closeHelp);
    }

    if (replayButton) {
      replayButton.addEventListener("click", resetFlow);
    }

    if (unlockButton) {
      unlockButton.addEventListener("click", function () {
        if (unlockButton.classList.contains("is-claimed")) {
          return;
        }

        unlockButton.classList.add("is-claimed");
        unlockButton.textContent = "UNLOCKED";

        if (bankStatus) {
          bankStatus.textContent = "Unlocked";
        }

        showToast("PiggyBank bonus unlocked");
      });
    }

    resetFlow();
  });
})();
