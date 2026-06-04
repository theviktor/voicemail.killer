"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./Icon";
import { dur } from "../lib/format";

// Real audio player with the Vera waveform aesthetic.
export default function Player({ src, duration = 60 }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [total, setTotal] = useState(duration);

  const bars = 56;
  const heights = useMemo(
    () => Array.from({ length: bars }, (_, i) => {
      const v = Math.sin(i * 0.9) * 0.5 + Math.sin(i * 0.27) * 0.5;
      return 20 + Math.abs(v) * 80;
    }), []
  );
  const prog = total ? t / total : 0;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setT(a.currentTime);
    const onMeta = () => { if (isFinite(a.duration) && a.duration > 0) setTotal(a.duration); };
    const onEnd = () => { setPlaying(false); setT(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("loadedmetadata", onMeta); a.removeEventListener("ended", onEnd); };
  }, []);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => {}); }
  }
  function seek(e) {
    const a = audioRef.current;
    if (!a || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * total;
    setT(a.currentTime);
  }

  return (
    <div className="player">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button className="play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
        <Icon n={playing ? "pause" : "play"} />
      </button>
      <div className="wave" onClick={seek}>
        {heights.map((h, i) => (
          <i key={i} className={i / bars <= prog ? "on" : ""} style={{ height: h + "%" }} />
        ))}
      </div>
      <div className="time mono">{dur(Math.round(t))} / {dur(Math.round(total))}</div>
    </div>
  );
}
