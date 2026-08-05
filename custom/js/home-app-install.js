(function () {
  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  function showToast(phone, message) {
    var toast = phone ? phone.querySelector(".phone-toast") : null;
    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toast.hideTimer);
    toast.hideTimer = window.setTimeout(function () {
      toast.classList.remove("show");
    }, 1800);
  }

  function closeDownloadBar(bar) {
    if (!bar || bar.classList.contains("is-closing")) {
      return;
    }

    bar.classList.add("is-closing");
    window.setTimeout(function () {
      bar.hidden = true;
      bar.classList.remove("is-closing");
    }, 240);
  }

  function setLeftState(root, state) {
    var firstPhone = root.querySelector('[data-phone="first"]');
    var title = root.querySelector("#leftStateTitle");
    var rule = root.querySelector("#leftStateRule");
    if (!firstPhone) {
      return;
    }

    var isFirstVisit = state === "first";
    firstPhone.querySelectorAll("[data-first-only]").forEach(function (element) {
      element.hidden = !isFirstVisit;
    });
    firstPhone.querySelectorAll("[data-web-only]").forEach(function (element) {
      element.hidden = isFirstVisit;
    });
    firstPhone.setAttribute("aria-label", isFirstVisit ? "已登录首次访问状态" : "已登录 Web 状态");

    root.querySelectorAll("[data-left-state]").forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-left-state") === state);
    });

    if (title) {
      title.textContent = isFirstVisit ? "已登录首次访问" : "已登录 Web";
    }
    if (rule) {
      rule.textContent = isFirstVisit
        ? "Android Web 已登录，未安装客户端：APK 主推荐，PWA 作为次级入口。"
        : "保持 Web 登录并可直接游玩；顶部下载栏持续推荐 APK，不阻断使用。";
    }
  }

  ready(function () {
    var root = document.querySelector(".install-prototype-canvas");
    if (!root) {
      return;
    }

    root.querySelectorAll("[data-left-state]").forEach(function (button) {
      button.addEventListener("click", function () {
        setLeftState(root, button.getAttribute("data-left-state") || "first");
      });
    });

    root.querySelectorAll("[data-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        var phone = button.closest(".phone-preview");
        var action = button.getAttribute("data-action");

        if (action === "download-apk") {
          showToast(phone, "APK download started");
          return;
        }

        if (action === "install-pwa") {
          showToast(phone, "PWA install prompt opened");
          return;
        }

        if (action === "open-app") {
          showToast(phone, "Opening the official App...");
          return;
        }

        if (action === "dismiss-upgrade") {
          var banner = button.closest(".upgrade-banner");
          closeDownloadBar(banner);
          showToast(phone, "Upgrade reminder dismissed");
          return;
        }

        if (action === "dismiss-download-bar") {
          var downloadBar = button.closest(".top-download-bar");
          closeDownloadBar(downloadBar);
          showToast(phone, "Download reminder closed");
          return;
        }

        if (action === "continue-web") {
          if (phone && phone.getAttribute("data-phone") === "first") {
            setLeftState(root, "web");
          } else if (phone) {
            var sheet = button.closest(".install-sheet");
            var scrim = phone.querySelector(".install-scrim");
            if (sheet) {
              sheet.hidden = true;
            }
            if (scrim) {
              scrim.hidden = true;
            }
          }
          showToast(phone, "Continuing on Web");
        }
      });
    });
  });
})();
