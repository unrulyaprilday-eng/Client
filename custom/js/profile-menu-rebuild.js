(function () {
  var STORAGE_LANGUAGE = "profileMenuLanguage";
  var STORAGE_MUSIC = "profileMenuMusicOn";

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function readStorage(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      return;
    }
  }

  function dispatchClick(element) {
    if (!element) {
      return;
    }
    var event = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }

  function notifyPlayerLayout() {
    try {
      if (window.parent && window.parent !== window && window.parent.$axure && window.parent.$axure.player) {
        if (window.parent.$axure.player.resizeContent) {
          window.parent.$axure.player.resizeContent(true);
        }
        if (window.parent.$axure.player.refreshViewPort) {
          window.parent.$axure.player.refreshViewPort();
        }
      }
    } catch (error) {
      return;
    }
  }

  function applyProfileCanvasCenter() {
    var html = document.documentElement;
    var body = document.body;
    var base = document.getElementById("base");

    if (!html || !body) {
      return;
    }

    html.style.setProperty("width", "100%", "important");
    html.style.setProperty("min-height", "100%", "important");
    html.style.setProperty("display", "flex", "important");
    html.style.setProperty("justify-content", "center", "important");
    html.style.setProperty("background-color", "#0b1220", "important");

    body.style.setProperty("position", "relative", "important");
    body.style.setProperty("left", "auto", "important");
    body.style.setProperty("width", "800px", "important");
    body.style.setProperty("min-height", "926px", "important");
    body.style.setProperty("flex", "0 0 800px", "important");
    body.style.setProperty("margin", "0 auto", "important");
    body.style.setProperty("text-align", "left", "important");

    if (base) {
      base.style.setProperty("width", "800px", "important");
      base.style.setProperty("min-height", "926px", "important");
    }

    notifyPlayerLayout();
  }

  function scheduleProfileCanvasCenter() {
    var runner = window.requestAnimationFrame || function (callback) {
      window.setTimeout(callback, 16);
    };

    applyProfileCanvasCenter();
    runner(applyProfileCanvasCenter);
    window.setTimeout(applyProfileCanvasCenter, 80);
    window.setTimeout(applyProfileCanvasCenter, 240);
    window.setTimeout(applyProfileCanvasCenter, 600);
  }

  onReady(scheduleProfileCanvasCenter);
  window.addEventListener("load", scheduleProfileCanvasCenter, { once: true });

  onReady(function () {
    scheduleProfileCanvasCenter();

    var menuRoot = document.querySelector(".profile-menu-rebuild");
    if (!menuRoot) {
      return;
    }

    var els = {
      languageLabel: document.querySelector("[data-language-label]"),
      musicLabel: document.querySelector("[data-music-label]"),
      toast: document.querySelector("[data-toast]"),
      sheet: document.querySelector("[data-sheet]"),
      sheetEyebrow: document.querySelector("[data-sheet-eyebrow]"),
      sheetTitle: document.querySelector("[data-sheet-title]"),
      sheetBody: document.querySelector("[data-sheet-body]"),
      sheetChoices: document.querySelector("[data-sheet-choices]"),
      sheetActions: document.querySelector("[data-sheet-actions]"),
      redeemModal: document.querySelector("[data-modal='redeem']"),
      redeemInput: document.querySelector("[data-redeem-input]")
    };

    var state = {
      language: readStorage(STORAGE_LANGUAGE, "Chinese"),
      musicOn: readStorage(STORAGE_MUSIC, "true") !== "false"
    };

    function renderMeta() {
      if (els.languageLabel) {
        els.languageLabel.textContent = state.language;
      }
      if (els.musicLabel) {
        els.musicLabel.textContent = state.musicOn ? "已开启" : "已关闭";
      }
    }

    function showToast(message) {
      if (!els.toast) {
        return;
      }
      els.toast.textContent = message;
      els.toast.hidden = false;
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(function () {
        els.toast.hidden = true;
      }, 2200);
    }

    function closeSheet() {
      if (els.sheet) {
        els.sheet.hidden = true;
      }
      if (els.sheetChoices) {
        els.sheetChoices.innerHTML = "";
      }
      if (els.sheetActions) {
        els.sheetActions.innerHTML = "";
      }
    }

    function makeButton(label, className, handler) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = className || "profile-button";
      button.textContent = label;
      button.addEventListener("click", handler);
      return button;
    }

    function showSheet(config) {
      if (!els.sheet) {
        return;
      }

      els.sheet.hidden = false;
      if (els.sheetEyebrow) {
        els.sheetEyebrow.textContent = config.eyebrow || "Profile";
      }
      if (els.sheetTitle) {
        els.sheetTitle.textContent = config.title || "提示";
      }
      if (els.sheetBody) {
        els.sheetBody.textContent = config.body || "";
      }
      if (els.sheetChoices) {
        els.sheetChoices.innerHTML = "";
      }
      if (els.sheetActions) {
        els.sheetActions.innerHTML = "";
      }

      (config.choices || []).forEach(function (choice) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = "profile-choice" + (choice.active ? " is-active" : "");
        item.innerHTML = "<span>" + choice.label + "</span><span class='profile-choice__check' aria-hidden='true'></span>";
        item.addEventListener("click", function () {
          closeSheet();
          choice.onSelect();
        });
        if (els.sheetChoices) {
          els.sheetChoices.appendChild(item);
        }
      });

      (config.actions || []).forEach(function (action) {
        if (els.sheetActions) {
          els.sheetActions.appendChild(
            makeButton(action.label, action.className || "profile-button", function () {
              if (action.closeFirst !== false) {
                closeSheet();
              }
              action.onClick();
            })
          );
        }
      });
    }

    function closeRedeem() {
      if (els.redeemModal) {
        els.redeemModal.hidden = true;
      }
    }

    function openRedeem() {
      if (!els.redeemModal) {
        return;
      }
      els.redeemModal.hidden = false;
      if (els.redeemInput) {
        els.redeemInput.focus();
      }
    }

    function openAccountInfo() {
      var trigger = document.getElementById("u4") || document.getElementById("u7");
      dispatchClick(trigger);
    }

    function handleMenuAction(action) {
      switch (action) {
        case "open-notifications":
          window.location.href = "通知.html";
          break;
        case "open-records":
          showToast("我的记录页沿用当前原型结构，明细入口待接入。");
          break;
        case "open-withdraw":
          showToast("提款管理入口已保留，后续可继续接现有提款页。");
          break;
        case "open-redeem":
          openRedeem();
          break;
        case "open-share":
          window.location.href = "invite___.html";
          break;
        case "open-security":
          openAccountInfo();
          break;
        case "open-language":
          showSheet({
            eyebrow: "Language",
            title: "选择语言",
            body: "切换后仅影响当前原型展示文案。",
            choices: [
              {
                label: "Chinese",
                active: state.language === "Chinese",
                onSelect: function () {
                  state.language = "Chinese";
                  writeStorage(STORAGE_LANGUAGE, state.language);
                  renderMeta();
                  showToast("语言已切换为 Chinese");
                }
              },
              {
                label: "English",
                active: state.language === "English",
                onSelect: function () {
                  state.language = "English";
                  writeStorage(STORAGE_LANGUAGE, state.language);
                  renderMeta();
                  showToast("Language switched to English");
                }
              }
            ],
            actions: [
              {
                label: "关闭",
                className: "profile-button profile-button--ghost",
                onClick: function () {}
              }
            ]
          });
          break;
        case "toggle-music":
          state.musicOn = !state.musicOn;
          writeStorage(STORAGE_MUSIC, state.musicOn ? "true" : "false");
          renderMeta();
          showToast(state.musicOn ? "音乐已开启" : "音乐已关闭");
          break;
        case "open-faq":
          window.location.href = "客服弹窗.html";
          break;
        case "logout":
          showSheet({
            eyebrow: "Logout",
            title: "安全退出",
            body: "退出后需要重新登录，已完成的设置不会丢失。",
            actions: [
              {
                label: "取消",
                className: "profile-button profile-button--ghost",
                onClick: function () {}
              },
              {
                label: "确认退出",
                className: "profile-button",
                onClick: function () {
                  showToast("已退出当前账号原型态。");
                }
              }
            ]
          });
          break;
        case "submit-redeem":
          var code = els.redeemInput ? els.redeemInput.value.replace(/\s+/g, "").toUpperCase() : "";
          if (!code) {
            showToast("请输入兑换码");
            return;
          }
          closeRedeem();
          showToast("兑换成功，奖励已加入待发放队列。");
          break;
        case "close-sheet":
          closeSheet();
          break;
        default:
          break;
      }
    }

    document.addEventListener("click", function (event) {
      var actionTarget = event.target.closest("[data-action]");
      if (!actionTarget) {
        return;
      }
      handleMenuAction(actionTarget.getAttribute("data-action"));
    });

    document.querySelectorAll("[data-close-modal='redeem']").forEach(function (button) {
      button.addEventListener("click", closeRedeem);
    });

    document.querySelectorAll("[data-action='submit-redeem']").forEach(function (button) {
      button.addEventListener("click", function () {
        handleMenuAction("submit-redeem");
      });
    });

    document.querySelectorAll("[data-action='close-sheet']").forEach(function (button) {
      button.addEventListener("click", closeSheet);
    });

    if (els.redeemInput) {
      els.redeemInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          handleMenuAction("submit-redeem");
        }
      });
    }

    renderMeta();
  });
})();
