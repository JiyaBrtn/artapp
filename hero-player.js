(() => {
  "use strict";

  const video = document.querySelector(".hero-video");
  const frame = document.querySelector(".hero-media-frame");
  const fallback = document.querySelector(".hero-fallback");
  const toggle = document.querySelector(".hero-play-toggle");
  if (!video || !frame || !fallback || !toggle) return;

  // Set playback attributes before dash.js attaches a MediaSource.
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isSmallOrSaveData =
    matchMedia("(max-width: 700px)").matches || navigator.connection?.saveData === true;
  const playerError = (...details) => {
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      console.error("Hero DASH playback error", ...details);
    }
  };

  let player;
  let failed = false;
  let userPaused = false;
  let inViewport = false;
  let streamReady = false;
  let timeout;

  const shouldPlay = () =>
    streamReady && inViewport && !document.hidden && !userPaused && !reducedMotion.matches;

  const updateToggle = () => {
    const playing = !video.paused;
    toggle.setAttribute("aria-label", playing ? "Pause hero video" : "Play hero video");
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.querySelector(".hero-play-icon").textContent = playing ? "Ⅱ" : "▶";
  };

  const syncPlayback = () => {
    if (!streamReady || failed) return;
    if (shouldPlay()) video.play().catch((error) => playerError(error));
    else video.pause();
  };

  const usePoster = (reason) => {
    if (failed) return;
    failed = true;
    clearTimeout(timeout);
    playerError(reason);
    try {
      player?.reset();
    } catch (error) {
      playerError(error);
    }
    video.pause();
    video.removeAttribute("src");
    video.load();
    fallback.hidden = false;
    frame.classList.remove("is-ready");
    updateToggle();
  };

  toggle.addEventListener("click", () => {
    if (!streamReady || failed) return;
    userPaused = !video.paused;
    if (!userPaused) {
      reducedMotion.matches ? video.play().catch((error) => playerError(error)) : syncPlayback();
    } else {
      video.pause();
    }
    updateToggle();
  });
  video.addEventListener("play", updateToggle);
  video.addEventListener("pause", updateToggle);
  video.addEventListener("ended", () => {
    // A DASH loop can end before the native loop flag is honored by some engines.
    video.currentTime = 0;
    syncPlayback();
  });

  document.addEventListener("visibilitychange", syncPlayback);
  reducedMotion.addEventListener("change", syncPlayback);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        inViewport = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.12 },
    ).observe(frame);
  } else {
    inViewport = true;
  }

  if (typeof window.dashjs === "undefined") {
    usePoster("dash.js did not load");
    return;
  }
  if (!("MediaSource" in window) && !("ManagedMediaSource" in window)) {
    usePoster("Media Source Extensions are unsupported");
    return;
  }

  try {
    player = window.dashjs.MediaPlayer().create();
    player.updateSettings({
      streaming: {
        abr: {
          autoSwitchBitrate: { video: true },
          initialBitrate: { video: isSmallOrSaveData ? 650 : 1800 },
          maxBitrate: { video: isSmallOrSaveData ? 1800 : 6000 },
          limitBitrateByPortal: true,
        },
      },
    });
    player.on(window.dashjs.MediaPlayer.events.ERROR, (event) => {
      playerError(event);
      if (event?.error?.fatal) usePoster(event);
    });
    player.on(window.dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
      clearTimeout(timeout);
      streamReady = true;
      fallback.hidden = true;
      frame.classList.add("is-ready");
      syncPlayback();
    });
    timeout = window.setTimeout(() => usePoster("DASH stream initialization timed out"), 15000);
    player.initialize(video, "homepage.mpd", false);
  } catch (error) {
    usePoster(error);
  }
})();
