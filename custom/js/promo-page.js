(function () {
  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  onReady(function () {
    var topTabs = Array.prototype.slice.call(document.querySelectorAll("[data-top-tab]"));
    var categoryButtons = Array.prototype.slice.call(document.querySelectorAll("[data-category]"));
    var cards = Array.prototype.slice.call(document.querySelectorAll(".promo-card"));
    var emptyState = document.querySelector("[data-empty-state]");
    var toast = document.querySelector("[data-toast]");
    var sheet = document.querySelector("[data-sheet]");
    var sheetEyebrow = document.querySelector("[data-sheet-eyebrow]");
    var sheetTitle = document.querySelector("[data-sheet-title]");
    var sheetBody = document.querySelector("[data-sheet-body]");
    var sheetActions = document.querySelector("[data-sheet-actions]");
    var redeemModal = document.querySelector("[data-modal='redeem']");
    var redeemInput = document.querySelector("[data-redeem-input]");

    var state = {
      topTab: "activity",
      category: "all"
    };

    function showToast(message) {
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

    function closeSheet() {
      if (!sheet) {
        return;
      }
      sheet.hidden = true;
      if (sheetActions) {
        sheetActions.innerHTML = "";
      }
    }

    function createActionButton(label, className, handler) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = className || "profile-button";
      button.textContent = label;
      button.addEventListener("click", function () {
        closeSheet();
        handler();
      });
      return button;
    }

    function showSheet(config) {
      if (!sheet || !sheetTitle || !sheetBody || !sheetActions || !sheetEyebrow) {
        return;
      }

      sheet.hidden = false;
      sheetEyebrow.textContent = config.eyebrow || "优惠";
      sheetTitle.textContent = config.title || "活动详情";
      sheetBody.textContent = config.body || "";
      sheetActions.innerHTML = "";

      (config.actions || []).forEach(function (action) {
        sheetActions.appendChild(
          createActionButton(action.label, action.className, action.onClick || function () {})
        );
      });
    }

    function openRedeem() {
      if (!redeemModal) {
        return;
      }
      redeemModal.hidden = false;
      if (redeemInput) {
        redeemInput.focus();
      }
    }

    function closeRedeem() {
      if (redeemModal) {
        redeemModal.hidden = true;
      }
    }

    function cardMatches(card) {
      var cardTabs = (card.getAttribute("data-tabs") || "").split(/\s+/);
      var cardCategories = (card.getAttribute("data-categories") || "").split(/\s+/);
      var tabMatch = cardTabs.indexOf(state.topTab) !== -1;
      var categoryMatch = state.category === "all" || cardCategories.indexOf(state.category) !== -1;
      return tabMatch && categoryMatch;
    }

    function renderCards() {
      var visibleCount = 0;

      cards.forEach(function (card) {
        var matched = cardMatches(card);
        card.hidden = !matched;
        if (matched) {
          visibleCount += 1;
        }
      });

      if (emptyState) {
        emptyState.hidden = visibleCount !== 0;
      }
    }

    function setTopTab(value) {
      state.topTab = value;
      topTabs.forEach(function (button) {
        button.classList.toggle("is-active", button.getAttribute("data-top-tab") === value);
      });
      renderCards();
    }

    function setCategory(value) {
      state.category = value;
      categoryButtons.forEach(function (button) {
        button.classList.toggle("is-active", button.getAttribute("data-category") === value);
      });
      renderCards();
    }

    topTabs.forEach(function (button) {
      button.addEventListener("click", function () {
        setTopTab(button.getAttribute("data-top-tab"));
      });
    });

    categoryButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setCategory(button.getAttribute("data-category"));
      });
    });

    document.addEventListener("click", function (event) {
      var actionTarget = event.target.closest("[data-action]");
      if (!actionTarget) {
        return;
      }

      var action = actionTarget.getAttribute("data-action");

      if (action === "open-redeem") {
        openRedeem();
        return;
      }

      if (action === "submit-redeem") {
        var code = redeemInput ? redeemInput.value.replace(/\s+/g, "").toUpperCase() : "";
        if (!code) {
          showToast("请输入兑换码");
          return;
        }
        closeRedeem();
        if (redeemInput) {
          redeemInput.value = "";
        }
        showToast("兑换成功，奖励已加入待发放队列。");
        return;
      }

      if (action === "open-detail") {
        showSheet({
          eyebrow: actionTarget.getAttribute("data-eyebrow") || "活动详情",
          title: actionTarget.getAttribute("data-title") || "活动详情",
          body: actionTarget.getAttribute("data-body") || "活动规则待补充。",
          actions: [
            {
              label: "我知道了",
              className: "profile-button",
              onClick: function () {}
            }
          ]
        });
        return;
      }

      if (action === "open-history") {
        setTopTab("history");
        window.scrollTo({ top: 0, behavior: "smooth" });
        showToast("已切换到领取记录");
        return;
      }

      if (action === "refresh-reward") {
        showToast("奖励列表已刷新");
        return;
      }

      if (action === "open-withdraw") {
        showSheet({
          eyebrow: "钱包",
          title: "提现入口",
          body: "当前原型保留了提现入口位置，后续可继续接现有提款页或弹窗流程。",
          actions: [
            {
              label: "关闭",
              className: "profile-button profile-button--ghost",
              onClick: function () {}
            }
          ]
        });
        return;
      }

      if (action === "stay-home") {
        showToast("首页入口先保留当前位置，不跳转。");
        return;
      }

      if (action === "close-sheet") {
        closeSheet();
      }
    });

    document.querySelectorAll("[data-close-modal='redeem']").forEach(function (button) {
      button.addEventListener("click", closeRedeem);
    });

    document.querySelectorAll("[data-action='close-sheet']").forEach(function (button) {
      button.addEventListener("click", closeSheet);
    });

    if (redeemInput) {
      redeemInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          var submitButton = document.querySelector("[data-action='submit-redeem']");
          if (submitButton) {
            submitButton.click();
          }
        }
      });
    }

    renderCards();
  });
})();
