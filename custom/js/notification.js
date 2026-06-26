(function () {
  var STORAGE_KEY = "profileNotificationEnabled";

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function readEnabled() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch (error) {
      return false;
    }
  }

  function saveEnabled(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    } catch (error) {
      // Prototype can run in restricted preview contexts.
    }
  }

  function getDeviceInfo() {
    var ua = navigator.userAgent || "";
    var platform = navigator.platform || "";
    var isIOS = /iPad|iPhone|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var isStandalone = false;

    try {
      isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    } catch (error) {
      isStandalone = false;
    }

    return {
      isIOS: isIOS,
      isStandalone: isStandalone,
      hasNotification: "Notification" in window,
      secure: window.isSecureContext || location.protocol === "https:" || location.hostname === "localhost" || location.protocol === "file:"
    };
  }

  function getPermission() {
    if (!("Notification" in window)) {
      return "unsupported";
    }
    return window.Notification.permission || "default";
  }

  function isIOSWithoutPWA(device) {
    return device.isIOS && !device.isStandalone;
  }

  function showToast(toast, message) {
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

  function showSheet(els, title, body) {
    if (!els.sheet) {
      return;
    }
    if (els.sheetTitle) {
      els.sheetTitle.textContent = title;
    }
    if (els.sheetBody) {
      els.sheetBody.textContent = body;
    }
    els.sheet.hidden = false;
  }

  function closeSheet(els) {
    if (els.sheet) {
      els.sheet.hidden = true;
    }
  }

  onReady(function () {
    var root = document.querySelector(".notification-app");
    if (!root) {
      return;
    }

    var enabled = readEnabled();
    var els = {
      card: document.querySelector("[data-status-card]"),
      title: document.querySelector("[data-state-title]"),
      desc: document.querySelector("[data-state-desc]"),
      row: document.querySelector("[data-action='toggle-notification']"),
      switchDesc: document.querySelector("[data-switch-desc]"),
      mainSwitch: document.querySelector("[data-main-switch]"),
      iosTip: document.querySelector("[data-ios-tip]"),
      footer: document.querySelector(".notice-copy"),
      footerCopy: document.querySelector("[data-footer-copy]"),
      sheet: document.querySelector("[data-sheet]"),
      sheetTitle: document.querySelector("[data-sheet-title]"),
      sheetBody: document.querySelector("[data-sheet-body]"),
      toast: document.querySelector("[data-toast]")
    };

    function disableAndSave() {
      enabled = false;
      saveEnabled(false);
    }

    function deriveStatus() {
      var device = getDeviceInfo();
      var permission = getPermission();

      if (isIOSWithoutPWA(device)) {
        disableAndSave();
        return "add_to_home_screen";
      }
      if (!device.hasNotification || !device.secure || permission === "unsupported") {
        disableAndSave();
        return "unavailable";
      }
      if (permission === "denied") {
        disableAndSave();
        return "blocked";
      }
      if (enabled && permission === "granted") {
        return "on";
      }
      return "off";
    }

    function render() {
      var status = deriveStatus();
      var requiresHomeScreen = status === "add_to_home_screen";
      var copy = {
        on: ["通知已开启", "APP 或网页通知权限已开启，账户、安全、资金与优惠提醒会继续推送。", "已开启，点击可关闭"],
        off: ["未开启通知", "可在 APP 或网页开启通知，点击开关后再触发系统授权。", "仅点击开启后请求系统通知权限"],
        add_to_home_screen: ["添加到主屏幕", "当前设备需先将网站添加到主屏幕，之后从主屏幕进入，才可开启通知。", "请先添加到主屏幕"],
        blocked: ["系统权限已禁止", "APP 或网页通知权限已被系统禁止，请到对应权限设置中改为允许。", "权限已禁止"],
        unavailable: ["通知不可用", "当前 APP、浏览器或访问环境不支持开启通知。", "当前环境不可用"]
      }[status];

      if (els.card) {
        els.card.hidden = requiresHomeScreen;
        els.card.className = "notification-card";
        if (status === "on") {
          els.card.classList.add("is-on");
        } else if (status === "blocked" || status === "unavailable") {
          els.card.classList.add("is-blocked");
        } else if (status === "add_to_home_screen") {
          els.card.classList.add("is-install");
        }
      }
      if (els.title) {
        els.title.textContent = copy[0];
      }
      if (els.desc) {
        els.desc.textContent = copy[1];
      }
      if (els.switchDesc) {
        els.switchDesc.textContent = copy[2];
      }
      if (els.row) {
        els.row.setAttribute("aria-pressed", status === "on" ? "true" : "false");
        els.row.disabled = requiresHomeScreen;
        els.row.classList.toggle("is-disabled", requiresHomeScreen);
      }
      if (els.mainSwitch) {
        els.mainSwitch.classList.toggle("is-on", status === "on");
        els.mainSwitch.classList.toggle("is-disabled", requiresHomeScreen);
      }
      if (els.iosTip) {
        els.iosTip.hidden = !requiresHomeScreen;
      }
      if (els.footer) {
        els.footer.hidden = requiresHomeScreen;
      }
      if (els.footerCopy) {
        els.footerCopy.textContent = requiresHomeScreen
          ? "添加到主屏幕后，从主屏幕打开页面并重新点击通知开关。"
          : "关闭通知、退出登录或权限不可用时，会同步更新状态并停止继续发送。";
      }
    }

    function requestNotificationPermission() {
      if (!window.Notification || typeof window.Notification.requestPermission !== "function") {
        disableAndSave();
        render();
        showSheet(els, "通知不可用", "当前 APP、浏览器或访问环境不支持通知授权，请更换支持通知权限的环境。");
        return;
      }

      var request = window.Notification.requestPermission();
      var handleResult = function (result) {
        enabled = result === "granted";
        saveEnabled(enabled);
        render();
        showToast(els.toast, enabled ? "通知已开启" : "通知未开启");
      };
      var handleError = function () {
        disableAndSave();
        render();
        showSheet(els, "授权未完成", "浏览器没有完成通知授权，请稍后重新点击通知开关。");
      };

      if (request && typeof request.then === "function") {
        request.then(handleResult).catch(handleError);
      } else {
        handleResult(request);
      }
    }

    function toggleNotification() {
      var device = getDeviceInfo();
      var permission = getPermission();

      if (isIOSWithoutPWA(device)) {
        disableAndSave();
        render();
        showSheet(els, "添加到主屏幕", "请先使用 Safari 打开网站，点击分享，选择“添加到主屏幕”。完成后从主屏幕进入，再开启通知。");
        return;
      }

      if (enabled && permission === "granted") {
        disableAndSave();
        render();
        showToast(els.toast, "通知已关闭");
        return;
      }

      if (!device.hasNotification || !device.secure || permission === "unsupported") {
        disableAndSave();
        render();
        showSheet(els, "通知不可用", "请使用支持通知权限的 APP、浏览器，或已添加到主屏幕的 iPhone/iPad PWA。");
        return;
      }

      if (permission === "denied") {
        disableAndSave();
        render();
        showSheet(els, "系统权限已禁止", "APP 或网页通知权限已被系统禁止，页面无法再次弹出授权。请到对应权限设置中改为允许。");
        return;
      }

      if (permission === "granted") {
        enabled = true;
        saveEnabled(true);
        render();
        showToast(els.toast, "通知已开启");
        return;
      }

      requestNotificationPermission();
    }

    root.addEventListener("click", function (event) {
      var actionTarget = event.target.closest("[data-action]");
      if (!actionTarget) {
        return;
      }
      var action = actionTarget.getAttribute("data-action");
      if (action === "toggle-notification") {
        toggleNotification();
      } else if (action === "show-install-help") {
        showSheet(els, "添加到主屏幕", "请先使用 Safari 打开网站，点击分享，选择“添加到主屏幕”。完成后从主屏幕进入，再开启通知。");
      } else if (action === "close-sheet") {
        closeSheet(els);
      }
    });

    document.querySelectorAll("[data-action='close-sheet']").forEach(function (node) {
      node.addEventListener("click", function () {
        closeSheet(els);
      });
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        render();
      }
    });
    window.addEventListener("focus", render);

    render();
  });
})();
