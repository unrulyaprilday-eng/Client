(function () {
  var DEFAULT_SCREEN = "top";
  var MAIN_SCREENS = {
    top: true,
    pending: true,
    complete: true
  };
  var currentScreen = DEFAULT_SCREEN;
  var lastMainScreen = DEFAULT_SCREEN;
  var toastTimer = 0;

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback);
    } else {
      callback();
    }
  }

  function queryAll(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function findScreen(name) {
    return document.querySelector("[data-piggy-screen='" + name + "']");
  }

  function screenFromHash() {
    var name = (window.location.hash || "").replace(/^#/, "");
    return findScreen(name) ? name : DEFAULT_SCREEN;
  }

  function updateHash(name) {
    var nextHash = "#" + name;
    if (window.location.hash === nextHash) {
      return;
    }
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", nextHash);
    } else {
      window.location.hash = nextHash;
    }
  }

  function showScreen(name, keepHash) {
    if (!findScreen(name)) {
      name = DEFAULT_SCREEN;
    }
    if (MAIN_SCREENS[currentScreen]) {
      lastMainScreen = currentScreen;
    }
    queryAll("[data-piggy-screen]").forEach(function (screen) {
      var active = screen.getAttribute("data-piggy-screen") === name;
      screen.hidden = !active;
      screen.classList.toggle("is-active", active);
    });
    currentScreen = name;
    document.body.setAttribute("data-piggy-current", name);
    if (!keepHash) {
      updateHash(name);
    }
    window.scrollTo(0, 0);
  }

  function showToast(message) {
    var toast = document.querySelector("[data-piggy-toast]");
    if (!toast) {
      return;
    }
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.hidden = true;
    }, 1800);
  }

  function closeModal() {
    showScreen(MAIN_SCREENS[lastMainScreen] ? lastMainScreen : DEFAULT_SCREEN);
  }

  function goBack() {
    if (currentScreen !== DEFAULT_SCREEN) {
      showScreen(DEFAULT_SCREEN);
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = "index.html";
  }

  function handleClick(event) {
    var target = event.target.closest("[data-screen-target], [data-action], [data-toast-text]");
    if (!target) {
      return;
    }

    var screenTarget = target.getAttribute("data-screen-target");
    if (screenTarget) {
      event.preventDefault();
      showScreen(screenTarget);
      return;
    }

    var toastText = target.getAttribute("data-toast-text");
    if (toastText) {
      event.preventDefault();
      showToast(toastText);
      return;
    }

    var action = target.getAttribute("data-action");
    if (action === "close-modal") {
      event.preventDefault();
      closeModal();
    } else if (action === "back") {
      event.preventDefault();
      goBack();
    }
  }

  onReady(function () {
    showScreen(screenFromHash(), true);
    document.addEventListener("click", handleClick);
    window.addEventListener("hashchange", function () {
      showScreen(screenFromHash(), true);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !MAIN_SCREENS[currentScreen]) {
        closeModal();
      }
    });
  });
}());
