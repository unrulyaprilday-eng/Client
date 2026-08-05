(function () {
  var intervalIds = {
    single: null,
    multi: null
  };
  var activeFeedItem = null;
  var isLoggedIn = false;

  var feedItems = [
    { icon: "🔥", text: "J***3 won ₹12,560 in Gates of Olympus" },
    { icon: "🎉", text: "R***8 claimed ₹500 activity reward" },
    { icon: "🏆", text: "M***2 reached VIP8" },
    { icon: "💎", text: "A***7 unlocked ₹1,888 weekly rebate" },
    { icon: "🎁", text: "K***9 claimed ₹300 mission reward" },
    { icon: "⚡", text: "T***4 won ₹8,260 in Sweet Bonanza" },
    { icon: "🍀", text: "L***6 received ₹188 lucky bonus" },
    { icon: "👑", text: "S***1 completed VIP upgrade to VIP9" },
    { icon: "🎯", text: "P***8 finished the daily quest and got ₹88" },
    { icon: "🚀", text: "H***5 won ₹15,200 in Aviator" },
    { icon: "💰", text: "D***2 withdrew ₹6,600 successfully" },
    { icon: "🎊", text: "V***4 got ₹1,200 cashback from weekend event" },
    { icon: "🌟", text: "N***7 opened a mystery chest and won ₹260" },
    { icon: "🪙", text: "Q***1 earned ₹999 from referral reward" },
    { icon: "🏅", text: "B***3 completed 7-day sign-in for ₹128" },
    { icon: "🎰", text: "C***6 won ₹9,880 in Fortune Tiger" },
    { icon: "💥", text: "Y***9 hit a combo reward worth ₹2,222" },
    { icon: "🎖", text: "F***2 reached Platinum rank and got ₹680" },
    { icon: "🧧", text: "G***8 claimed ₹888 festival gift" },
    { icon: "✨", text: "U***5 completed recharge task and got ₹158" }
  ];

  function toggleSwitch(button) {
    var next = button.getAttribute("data-on") !== "true";
    button.setAttribute("data-on", next ? "true" : "false");
    button.setAttribute("aria-pressed", next ? "true" : "false");
    button.classList.toggle("on", next);
    return next;
  }

  function createFeedItem(item) {
    return '<article class="feed-item"><span class="feed-icon">' +
      item.icon +
      "</span><strong>" +
      item.text +
      "</strong></article>";
  }

  function renderFeedItems() {
    var singleTrack = document.getElementById("singleTrack");
    var tripleTrack = document.getElementById("tripleTrack");
    var html = feedItems.map(createFeedItem).join("");
    var loopHtml = html + html;

    if (singleTrack) {
      singleTrack.innerHTML = loopHtml;
    }

    if (tripleTrack) {
      tripleTrack.innerHTML = loopHtml;
    }
  }

  function updateTitles(value) {
    var text = value || "中奖动态";
    Array.prototype.forEach.call(document.querySelectorAll(".component-title"), function (node) {
      node.textContent = text;
    });
  }

  function startSingleTicker(ms) {
    var track = document.getElementById("singleTrack");
    if (!track) return;
    var items = Array.prototype.slice.call(track.children);
    if (!items.length) return;
    var total = feedItems.length;
    var step = items[0].offsetHeight + 8;

    if (intervalIds.single) window.clearInterval(intervalIds.single);

    var index = 0;
    track.style.transition = "transform 0.35s ease";
    track.style.transform = "translateY(0)";
    intervalIds.single = window.setInterval(function () {
      index += 1;
      track.style.transform = "translateY(" + (-step * index) + "px)";
      if (index === total) {
        window.setTimeout(function () {
          track.style.transition = "none";
          track.style.transform = "translateY(0)";
          track.offsetHeight;
          track.style.transition = "transform 0.35s ease";
          index = 0;
        }, 360);
      }
    }, ms);
  }

  function startMultiTicker(ms) {
    var track = document.getElementById("tripleTrack");
    if (!track) return;
    var items = Array.prototype.slice.call(track.children);
    if (!items.length) return;
    var total = feedItems.length;
    var step = items[0].offsetHeight + 8;

    if (intervalIds.multi) window.clearInterval(intervalIds.multi);

    var index = 0;
    track.style.transition = "transform 0.35s ease";
    track.style.transform = "translateY(0)";
    intervalIds.multi = window.setInterval(function () {
      index += 1;
      track.style.transform = "translateY(" + (-step * index) + "px)";
      if (index === total) {
        window.setTimeout(function () {
          track.style.transition = "none";
          track.style.transform = "translateY(0)";
          track.offsetHeight;
          track.style.transition = "transform 0.35s ease";
          index = 0;
        }, 360);
      }
    }, ms);
  }

  function startTicker(ms) {
    startSingleTicker(ms);
    startMultiTicker(ms);
    var gameTrack = document.getElementById("gameWinTrack");
    if (gameTrack) gameTrack.style.setProperty("--game-win-duration", Math.max(5, (ms / 1000) * 6) + "s");
  }

  function showToast(message) {
    var toast = document.getElementById("gameFeedToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toast.hideTimer);
    toast.hideTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  function setGameStripPaused(paused) {
    var strip = document.querySelector(".game-win-strip");
    if (strip) strip.classList.toggle("is-paused", paused);
  }

  function closeModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) modal.hidden = true;

    var hasOpenModal = Array.prototype.some.call(document.querySelectorAll(".phone-overlay"), function (overlay) {
      return !overlay.hidden;
    });
    setGameStripPaused(hasOpenModal);
  }

  function openModal(modalId) {
    Array.prototype.forEach.call(document.querySelectorAll(".phone-overlay"), function (overlay) {
      overlay.hidden = overlay.id !== modalId;
    });

    var modal = document.getElementById(modalId);
    if (!modal) return;
    modal.hidden = false;
    setGameStripPaused(true);

    var focusTarget = modal.querySelector(".modal-close");
    if (focusTarget) focusTarget.focus();
  }

  function readFeedItem(button) {
    return {
      sourceType: button.getAttribute("data-source-type") || "system",
      id: button.getAttribute("data-item-id") || "",
      title: button.getAttribute("data-title") || "Reward",
      category: button.getAttribute("data-category") || "System reward",
      description: button.getAttribute("data-description") || "Reward details",
      actionLabel: button.getAttribute("data-action-label") || "View Details",
      loginRequired: button.getAttribute("data-login-required") === "true",
      image: button.getAttribute("data-image") || "",
      icon: button.getAttribute("data-icon") || "★",
      url: button.getAttribute("data-url") || ""
    };
  }

  function showFeedItemCard(button) {
    var modal = document.querySelector(".feed-preview-modal");
    var title = document.getElementById("feedModalTitle");
    var category = document.getElementById("feedModalCategory");
    var description = document.getElementById("feedModalDescription");
    var image = document.getElementById("feedModalImage");
    var icon = document.getElementById("feedModalIcon");
    var actionIcon = document.getElementById("feedActionIcon");
    var actionLabel = document.getElementById("feedActionLabel");

    activeFeedItem = readFeedItem(button);
    if (modal) modal.setAttribute("data-source-type", activeFeedItem.sourceType);
    if (title) title.textContent = activeFeedItem.title;
    if (category) category.textContent = activeFeedItem.category;
    if (description) description.textContent = activeFeedItem.description;
    if (image) {
      image.hidden = !activeFeedItem.image;
      if (activeFeedItem.image) {
        image.src = activeFeedItem.image;
        image.alt = activeFeedItem.title;
      }
    }
    if (icon) {
      icon.hidden = Boolean(activeFeedItem.image);
      icon.textContent = activeFeedItem.icon;
    }
    if (actionIcon) {
      actionIcon.className = "action-symbol action-symbol--" + activeFeedItem.sourceType;
    }
    if (actionLabel) actionLabel.textContent = activeFeedItem.actionLabel;
    openModal("feedItemModal");
  }

  function setLoginState(value) {
    var toggle = document.getElementById("loginStateToggle");
    isLoggedIn = Boolean(value);
    if (!toggle) return;
    toggle.setAttribute("data-on", isLoggedIn ? "true" : "false");
    toggle.setAttribute("aria-pressed", isLoggedIn ? "true" : "false");
    toggle.classList.toggle("on", isLoggedIn);
  }

  function launchActiveItem() {
    if (!activeFeedItem || !activeFeedItem.url) {
      showToast("This item is temporarily unavailable");
      return;
    }
    window.location.href = activeFeedItem.url;
  }

  function requestFeedItemAction() {
    if (!activeFeedItem) return;
    if (!activeFeedItem.loginRequired || isLoggedIn) {
      launchActiveItem();
      return;
    }
    closeModal("feedItemModal");
    openModal("loginModal");
  }

  function setupMixedFeed() {
    var track = document.getElementById("gameWinTrack");
    var firstGroup = track ? track.querySelector("[data-game-win-group]") : null;
    var actionButton = document.getElementById("feedActionButton");
    var loginForm = document.getElementById("gameLoginForm");
    var loginStateToggle = document.getElementById("loginStateToggle");

    if (track && firstGroup && track.querySelectorAll("[data-game-win-group]").length === 1) {
      var clone = firstGroup.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(clone.querySelectorAll("button"), function (button) {
        button.tabIndex = -1;
      });
      track.appendChild(clone);
      track.classList.add("is-ready");
    }

    if (track) {
      track.addEventListener("click", function (event) {
        var button = event.target.closest("button.game-win-item");
        if (button && track.contains(button)) showFeedItemCard(button);
      });
    }

    if (actionButton) actionButton.addEventListener("click", requestFeedItemAction);

    Array.prototype.forEach.call(document.querySelectorAll("[data-close-modal]"), function (button) {
      button.addEventListener("click", function () {
        closeModal(button.getAttribute("data-close-modal"));
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".phone-overlay"), function (overlay) {
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) closeModal(overlay.id);
      });
    });

    if (loginStateToggle) {
      loginStateToggle.addEventListener("click", function () {
        setLoginState(!isLoggedIn);
      });
    }

    if (loginForm) {
      loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        setLoginState(true);
        closeModal("loginModal");
        showToast("Login successful. Opening game...");
        window.setTimeout(launchActiveItem, 650);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      var loginModal = document.getElementById("loginModal");
      var feedItemModal = document.getElementById("feedItemModal");
      if (loginModal && !loginModal.hidden) {
        closeModal("loginModal");
      } else if (feedItemModal && !feedItemModal.hidden) {
        closeModal("feedItemModal");
      }
    });

    setLoginState(false);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var titleToggle = document.getElementById("titleToggle");
    var iconToggle = document.getElementById("iconToggle");
    var intervalSelect = document.getElementById("intervalSelect");

    renderFeedItems();
    updateTitles("中奖动态");
    startTicker(3000);
    setupMixedFeed();

    if (titleToggle) {
      titleToggle.addEventListener("click", function () {
        var isOn = toggleSwitch(titleToggle);
        Array.prototype.forEach.call(document.querySelectorAll(".component-title"), function (node) {
          node.hidden = !isOn;
        });
      });
    }

    if (iconToggle) {
      iconToggle.addEventListener("click", function () {
        var isOn = toggleSwitch(iconToggle);
        Array.prototype.forEach.call(document.querySelectorAll(".feed-icon, .game-win-item img, .game-win-type-icon"), function (node) {
          node.hidden = !isOn;
        });
      });
    }

    if (intervalSelect) {
      intervalSelect.addEventListener("change", function () {
        var seconds = Number(intervalSelect.value.replace(" 秒", ""));
        startTicker(seconds * 1000);
      });
    }
  });
})();
