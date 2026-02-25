import { useEffect, useRef } from 'react';

const YT_SCRIPT = 'https://www.youtube.com/iframe_api';
const SAVE_INTERVAL_SEC = 15;

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[src="${YT_SCRIPT}"]`);
    if (existing) {
      if (window.YT?.Player) resolve();
      else window.onYouTubeIframeAPIReady = resolve;
      return;
    }
    const tag = document.createElement('script');
    tag.src = YT_SCRIPT;
    tag.async = true;
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(tag, firstScript);
    window.onYouTubeIframeAPIReady = () => {
      window.onYouTubeIframeAPIReady = null;
      resolve();
    };
  });
}

export default function YouTubePlayer({ videoId, startSeconds = 0, playerRef, onUnmount, onEnded, onProgress }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    let player = null;
    let progressInterval = null;
    loadYouTubeAPI().then(() => {
      if (!containerRef.current) return;
      player = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          start: Math.max(0, Math.floor(startSeconds)),
          autoplay: 0,
          rel: 0,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.ENDED && onEnded) onEnded();
          },
        },
      });
      if (playerRef) playerRef.current = player;
      if (onProgress) {
        progressInterval = setInterval(() => {
          try {
            const t = player?.getCurrentTime?.();
            if (typeof t === 'number' && t >= 0) onProgress(Math.floor(t));
          } catch (_) {}
        }, SAVE_INTERVAL_SEC * 1000);
      }
    });
    return () => {
      if (progressInterval) clearInterval(progressInterval);
      let secondsToSave = null;
      try {
        const t = player?.getCurrentTime?.();
        if (typeof t === 'number') secondsToSave = Math.floor(t);
      } catch (_) {}
      if (playerRef) playerRef.current = null;
      if (player?.destroy) player.destroy();
      if (secondsToSave !== null && onUnmount) onUnmount(secondsToSave);
    };
  }, [videoId, startSeconds, playerRef, onUnmount, onEnded, onProgress]);

  return <div ref={containerRef} className="w-full h-full" />;
}
