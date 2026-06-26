(function () {
  var notified = false;

  function notifyPlayer() {
    if (notified) {
      return;
    }
    try {
      if (window.parent && window.parent !== window && window.parent.$axure && window.parent.$axure.player) {
        notified = true;
        window.parent.$axure.player.resizeContent(true);
        window.parent.$axure.player.refreshViewPort();
      }
    } catch (error) {
      // Local preview can block parent access.
    }
  }

  function scheduleNotify() {
    var runner = window.requestAnimationFrame || function (callback) {
      window.setTimeout(callback, 16);
    };

    runner(function () {
      notifyPlayer();
    });
  }

  if (document.readyState === "complete") {
    scheduleNotify();
  } else {
    window.addEventListener("load", scheduleNotify, { once: true });
  }
})();
