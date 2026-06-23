(function () {
  function notifyPlayer() {
    try {
      if (window.parent && window.parent !== window && window.parent.$axure && window.parent.$axure.player) {
        window.parent.$axure.player.resizeContent(true);
        window.parent.$axure.player.refreshViewPort();
      }
    } catch (error) {
      // Local preview can block parent access.
    }
  }

  if (document.readyState === "complete") {
    notifyPlayer();
  } else {
    window.addEventListener("load", notifyPlayer);
  }

  window.setTimeout(notifyPlayer, 80);
  window.setTimeout(notifyPlayer, 240);
})();
