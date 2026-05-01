import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fetchO3deBridge, fetchO3deTarget } from "../../lib/api";
import {
  clipWidthForZoom,
  INITIAL_MARKERS,
  INITIAL_PLAYHEAD,
  INITIAL_TRACK_STATE,
  rangePresetLabel,
  type TimelineRangePreset,
  type TimelineZoomLevel,
  type TrackState,
} from "./timelineState";

type StudioPageId = "timeline" | "color" | "audio" | "delivery";

type TimelineTrack = {
  id: string;
  name: string;
  type: "video" | "audio";
  clips: Array<{ id: string; label: string; start: string; end: string }>;
};
type TimelineHistorySnapshot = {
  playhead: string;
  markers: string[];
  selectedMarker: string | null;
  isPlaying: boolean;
  selectedClipId: string;
  trackState: Record<string, TrackState>;
  timelineRange: TimelineRangePreset;
  timelineZoom: TimelineZoomLevel;
  playbackRate: "0.5x" | "1.0x" | "2.0x";
  clipFilter: string;
  trackFilter: "all" | "video" | "audio";
  snapMode: "off" | "frame" | "marker";
};

const STUDIO_PAGES: Array<{ id: StudioPageId; label: string; detail: string }> = [
  { id: "timeline", label: "Timeline", detail: "Edit, trims, multicam, and markers" },
  { id: "color", label: "Color", detail: "Shot matching, looks, and continuity" },
  { id: "audio", label: "Audio", detail: "Dialogue, SFX, and mix stem prep" },
  { id: "delivery", label: "Delivery", detail: "Render queue and publish packages" },
];

const TRACKS: TimelineTrack[] = [
  {
    id: "v1",
    name: "V1 Storyline",
    type: "video",
    clips: [
      { id: "v1a", label: "Scene 01 Wide", start: "00:00:00:00", end: "00:00:12:12" },
      { id: "v1b", label: "Scene 01 Insert", start: "00:00:12:12", end: "00:00:21:04" },
    ],
  },
  {
    id: "v2",
    name: "V2 Multicam",
    type: "video",
    clips: [{ id: "v2a", label: "Cam B Alt", start: "00:00:05:10", end: "00:00:16:20" }],
  },
  {
    id: "a1",
    name: "A1 Dialogue",
    type: "audio",
    clips: [{ id: "a1a", label: "Boom Mix", start: "00:00:00:00", end: "00:00:21:04" }],
  },
  {
    id: "a2",
    name: "A2 Music",
    type: "audio",
    clips: [{ id: "a2a", label: "Temp Score", start: "00:00:03:00", end: "00:00:21:04" }],
  },
];

const TOOLSETS = [
  "Ripple Trim",
  "Roll Trim",
  "Slip/Slide",
  "Markers",
  "Multicam Cut",
  "Scene Bin",
  "Script Notes",
  "Proxy Toggle",
];

const SCENE_BINS = ["Scene 01", "Scene 02", "Scene 03", "B-Roll", "Music Cues"];
const MOVIE_STUDIO_SESSION_KEY = "movie-studio-timeline-session-v1";
const MOVIE_STUDIO_HANDOFF_SCHEMA = "movie_studio.handoff.v1";

type MovieStudioSessionState = {
  playhead: string;
  markers: string[];
  selectedMarker: string | null;
  timelineRange: TimelineRangePreset;
  timelineZoom: TimelineZoomLevel;
  playbackRate: "0.5x" | "1.0x" | "2.0x";
  clipFilter: string;
  trackFilter: "all" | "video" | "audio";
  snapMode: "off" | "frame" | "marker";
  shortcutsVisible: boolean;
};

const FRAMES_PER_SECOND = 24;
const FRAMES_PER_MINUTE = FRAMES_PER_SECOND * 60;
const FRAMES_PER_HOUR = FRAMES_PER_MINUTE * 60;

function parseTimecodeToFrames(timecode: string): number {
  const match = timecode.match(/^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const frames = Number(match[4]);
  return hours * FRAMES_PER_HOUR + minutes * FRAMES_PER_MINUTE + seconds * FRAMES_PER_SECOND + frames;
}

function isValidTimecode(value: string): boolean {
  const match = value.match(/^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return false;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const frames = Number(match[4]);
  return minutes < 60 && seconds < 60 && frames < FRAMES_PER_SECOND;
}

function formatFramesToTimecode(totalFrames: number): string {
  const clamped = Math.max(0, totalFrames);
  const hours = Math.floor(clamped / FRAMES_PER_HOUR);
  const remainingAfterHours = clamped % FRAMES_PER_HOUR;
  const minutes = Math.floor(remainingAfterHours / FRAMES_PER_MINUTE);
  const remainingAfterMinutes = remainingAfterHours % FRAMES_PER_MINUTE;
  const seconds = Math.floor(remainingAfterMinutes / FRAMES_PER_SECOND);
  const frames = remainingAfterMinutes % FRAMES_PER_SECOND;
  return [hours, minutes, seconds, frames].map((value) => String(value).padStart(2, "0")).join(":");
}

function loadMovieStudioSessionState(): MovieStudioSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(MOVIE_STUDIO_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MovieStudioSessionState>;
    const timelineRange = parsed.timelineRange === "scene" || parsed.timelineRange === "sequence" ? parsed.timelineRange : "full";
    const timelineZoom = parsed.timelineZoom === 1 || parsed.timelineZoom === 3 ? parsed.timelineZoom : 2;
    const playbackRate = parsed.playbackRate === "0.5x" || parsed.playbackRate === "2.0x" ? parsed.playbackRate : "1.0x";
    const trackFilter = parsed.trackFilter === "video" || parsed.trackFilter === "audio" ? parsed.trackFilter : "all";
    const snapMode = parsed.snapMode === "frame" || parsed.snapMode === "marker" ? parsed.snapMode : "off";
    const shortcutsVisible = parsed.shortcutsVisible === true;
    return {
      playhead: typeof parsed.playhead === "string" ? parsed.playhead : INITIAL_PLAYHEAD,
      markers: Array.isArray(parsed.markers) ? parsed.markers.filter((item): item is string => typeof item === "string") : INITIAL_MARKERS,
      selectedMarker: typeof parsed.selectedMarker === "string" ? parsed.selectedMarker : null,
      timelineRange,
      timelineZoom,
      playbackRate,
      clipFilter: typeof parsed.clipFilter === "string" ? parsed.clipFilter : "",
      trackFilter,
      snapMode,
      shortcutsVisible,
    };
  } catch {
    return null;
  }
}

export default function MovieStudioPanel() {
  const sessionState = loadMovieStudioSessionState();
  const [activePage, setActivePage] = useState<StudioPageId>("timeline");
  const [selectedClipId, setSelectedClipId] = useState<string>("v1a");
  const [playhead, setPlayhead] = useState<string>(sessionState?.playhead ?? INITIAL_PLAYHEAD);
  const [markers, setMarkers] = useState<string[]>(sessionState?.markers ?? INITIAL_MARKERS);
  const [trackState, setTrackState] = useState<Record<string, TrackState>>(INITIAL_TRACK_STATE);
  const [timelineRange, setTimelineRange] = useState<TimelineRangePreset>(sessionState?.timelineRange ?? "full");
  const [timelineZoom, setTimelineZoom] = useState<TimelineZoomLevel>(sessionState?.timelineZoom ?? 2);
  const [playbackRate, setPlaybackRate] = useState<"0.5x" | "1.0x" | "2.0x">(sessionState?.playbackRate ?? "1.0x");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(sessionState?.selectedMarker ?? INITIAL_MARKERS[0] ?? null);
  const [clipFilter, setClipFilter] = useState<string>(sessionState?.clipFilter ?? "");
  const [trackFilter, setTrackFilter] = useState<"all" | "video" | "audio">(sessionState?.trackFilter ?? "all");
  const [snapMode, setSnapMode] = useState<"off" | "frame" | "marker">(sessionState?.snapMode ?? "off");
  const [historyPast, setHistoryPast] = useState<TimelineHistorySnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<TimelineHistorySnapshot[]>([]);
  const [historyLog, setHistoryLog] = useState<string[]>([]);
  const [handoffStatus, setHandoffStatus] = useState<string>("Ready");
  const [shortcutsVisible, setShortcutsVisible] = useState<boolean>(sessionState?.shortcutsVisible ?? false);
  const [o3deStatus, setO3deStatus] = useState<string>("Checking O3DE bridge...");
  const [o3deLastCheck, setO3deLastCheck] = useState<string>("Pending first check");
  const [o3deHealth, setO3deHealth] = useState<"healthy" | "degraded" | "unavailable">("degraded");
  const [o3deFailureCount, setO3deFailureCount] = useState<number>(0);
  const [o3deStatusLog, setO3deStatusLog] = useState<string[]>([]);
  const o3deRefreshInFlightRef = useRef<boolean>(false);
  const [o3deRefreshing, setO3deRefreshing] = useState<boolean>(false);

  const trackCount = TRACKS.length;
  const clipCount = useMemo(
    () => TRACKS.reduce((total, track) => total + track.clips.length, 0),
    [],
  );
  const selectedClip = useMemo(
    () => TRACKS.flatMap((track) => track.clips).find((clip) => clip.id === selectedClipId) ?? TRACKS[0].clips[0],
    [selectedClipId],
  );
  const visibleTracks = useMemo(() => {
    const normalizedFilter = clipFilter.trim().toLowerCase();
    return TRACKS
      .filter((track) => trackFilter === "all" || track.type === trackFilter)
      .map((track) => ({
        ...track,
        clips: track.clips.filter((clip) => {
          if (!normalizedFilter) return true;
          return clip.label.toLowerCase().includes(normalizedFilter);
        }),
      }))
      .filter((track) => track.clips.length > 0);
  }, [clipFilter, trackFilter]);
  const handoffSummary = useMemo(() => {
    const lines = [
      "Movie Studio Timeline Review Packet",
      `Selected clip: ${selectedClip.label} (${selectedClip.start} - ${selectedClip.end})`,
      `Playhead: ${playhead}`,
      `Timeline range: ${rangePresetLabel(timelineRange)}`,
      `Timeline zoom: ${timelineZoom}x`,
      `Playback: ${isPlaying ? "Playing" : "Paused"} @ ${playbackRate}`,
      `Track filter: ${trackFilter}`,
      `Clip filter: ${clipFilter || "none"}`,
      `Marker count: ${markers.length}`,
      `Selected marker: ${selectedMarker ?? "None"}`,
      `Visible tracks: ${visibleTracks.map((track) => track.name).join(", ") || "none"}`,
      `Recent actions: ${historyLog.join(" | ") || "none"}`,
    ];
    return lines.join("\n");
  }, [
    clipFilter,
    historyLog,
    isPlaying,
    markers.length,
    playbackRate,
    playhead,
    selectedClip.end,
    selectedClip.label,
    selectedClip.start,
    selectedMarker,
    timelineRange,
    timelineZoom,
    trackFilter,
    visibleTracks,
  ]);
  const handoffJson = useMemo(
    () =>
      JSON.stringify(
        {
          schema: MOVIE_STUDIO_HANDOFF_SCHEMA,
          exported_at: new Date().toISOString(),
          selected_clip: {
            id: selectedClip.id,
            label: selectedClip.label,
            start: selectedClip.start,
            end: selectedClip.end,
          },
          timeline: {
            playhead,
            range: timelineRange,
            zoom: timelineZoom,
            playback_rate: playbackRate,
            is_playing: isPlaying,
            markers,
            selected_marker: selectedMarker,
          },
          filters: {
            track: trackFilter,
            clip: clipFilter || null,
          },
          o3de: {
            health: o3deHealth,
            status: o3deStatus,
            last_check: o3deLastCheck,
            consecutive_failures: o3deFailureCount,
            recent_checks: o3deStatusLog,
          },
          recent_actions: historyLog,
        },
        null,
        2,
      ),
    [
      clipFilter,
      historyLog,
      isPlaying,
      markers,
      o3deFailureCount,
      o3deHealth,
      o3deLastCheck,
      o3deStatus,
      o3deStatusLog,
      playbackRate,
      playhead,
      selectedClip.end,
      selectedClip.id,
      selectedClip.label,
      selectedClip.start,
      selectedMarker,
      timelineRange,
      timelineZoom,
      trackFilter,
    ],
  );
  const playheadValid = isValidTimecode(playhead);
  const o3deFreshness = useMemo(() => {
    const epoch = Date.parse(o3deLastCheck);
    if (Number.isNaN(epoch)) return "Unknown";
    return Date.now() - epoch <= 45000 ? "Fresh" : "Stale";
  }, [o3deLastCheck]);
  const o3deStatusPacket = useMemo(
    () =>
      [
        `health=${o3deHealth}`,
        `status=${o3deStatus}`,
        `last_check=${o3deLastCheck}`,
        `freshness=${o3deFreshness}`,
        `consecutive_failures=${o3deFailureCount}`,
      ].join(" | "),
    [o3deFailureCount, o3deFreshness, o3deHealth, o3deLastCheck, o3deStatus],
  );

  const snapshotCurrent = useCallback(
    (): TimelineHistorySnapshot => ({
      playhead,
      markers,
      selectedMarker,
      isPlaying,
      selectedClipId,
      trackState,
      timelineRange,
      timelineZoom,
      playbackRate,
      clipFilter,
      trackFilter,
      snapMode,
    }),
    [playhead, markers, selectedMarker, isPlaying, selectedClipId, trackState, timelineRange, timelineZoom, playbackRate, clipFilter, trackFilter, snapMode],
  );

  const restoreSnapshot = useCallback((snapshot: TimelineHistorySnapshot) => {
    setPlayhead(snapshot.playhead);
    setMarkers(snapshot.markers);
    setSelectedMarker(snapshot.selectedMarker);
    setIsPlaying(snapshot.isPlaying);
    setSelectedClipId(snapshot.selectedClipId);
    setTrackState(snapshot.trackState);
    setTimelineRange(snapshot.timelineRange);
    setTimelineZoom(snapshot.timelineZoom);
    setPlaybackRate(snapshot.playbackRate);
    setClipFilter(snapshot.clipFilter);
    setTrackFilter(snapshot.trackFilter);
    setSnapMode(snapshot.snapMode);
  }, []);

  const pushHistory = useCallback((action: string) => {
    setHistoryPast((current) => [...current, snapshotCurrent()]);
    setHistoryFuture([]);
    setHistoryLog((current) => [action, ...current].slice(0, 8));
  }, [snapshotCurrent]);

  const undoHistory = useCallback(() => {
    setHistoryPast((past) => {
      if (past.length === 0) return past;
      const snapshot = past[past.length - 1];
      setHistoryFuture((future) => [snapshotCurrent(), ...future]);
      restoreSnapshot(snapshot);
      setHistoryLog((current) => ["Undo", ...current].slice(0, 8));
      return past.slice(0, -1);
    });
  }, [restoreSnapshot, snapshotCurrent]);

  const redoHistory = useCallback(() => {
    setHistoryFuture((future) => {
      if (future.length === 0) return future;
      const [snapshot, ...rest] = future;
      setHistoryPast((past) => [...past, snapshotCurrent()]);
      restoreSnapshot(snapshot);
      setHistoryLog((current) => ["Redo", ...current].slice(0, 8));
      return rest;
    });
  }, [restoreSnapshot, snapshotCurrent]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
        return;
      }
      const key = event.key.toLowerCase();
      const hasCommandModifier = event.ctrlKey || event.metaKey;
      if (hasCommandModifier && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoHistory();
        return;
      }
      if (hasCommandModifier && (key === "y" || (key === "z" && event.shiftKey))) {
        event.preventDefault();
        redoHistory();
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        pushHistory("Toggle transport");
        setIsPlaying((current) => !current);
      } else if (key === "s" && event.shiftKey) {
        event.preventDefault();
        void copyO3deStatus();
      } else if (key === "x" && event.shiftKey) {
        event.preventDefault();
        clearO3deStatusLog();
      } else if (key === "h" && event.shiftKey) {
        event.preventDefault();
        void copyHandoffSummary();
      } else if (key === "j" && event.shiftKey) {
        event.preventDefault();
        void copyHandoffJson();
      } else if (key === "o" && event.shiftKey) {
        event.preventDefault();
        void refreshO3deStatus();
      } else if (key === "r" && event.shiftKey) {
        event.preventDefault();
        resetView();
      } else if (key === "k") {
        pushHistory("Stop transport");
        setIsPlaying(false);
      } else if (key === "l") {
        pushHistory("Step next");
        setPlayhead(selectedClip.end);
      } else if (key === "j") {
        pushHistory("Step prev");
        setPlayhead(selectedClip.start);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedClip.end, selectedClip.start, pushHistory, redoHistory, undoHistory]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: MovieStudioSessionState = {
      playhead,
      markers,
      selectedMarker,
      timelineRange,
      timelineZoom,
      playbackRate,
      clipFilter,
      trackFilter,
      snapMode,
      shortcutsVisible,
    };
    window.sessionStorage.setItem(MOVIE_STUDIO_SESSION_KEY, JSON.stringify(payload));
  }, [playhead, markers, selectedMarker, timelineRange, timelineZoom, playbackRate, clipFilter, trackFilter, snapMode, shortcutsVisible]);

  async function refreshO3deStatus() {
    if (o3deRefreshInFlightRef.current) return;
    o3deRefreshInFlightRef.current = true;
    setO3deRefreshing(true);
    try {
      const [target, bridge] = await Promise.all([fetchO3deTarget(), fetchO3deBridge()]);
      const targetConfigured = target.project_root_exists && target.runtime_runner_exists;
      const bridgeHealthy = bridge.heartbeat_fresh && bridge.configured;
      setO3deStatus(
        `Target: ${targetConfigured ? "Ready" : "Needs setup"} | Bridge: ${bridgeHealthy ? "Healthy" : "Degraded"}`,
      );
      setO3deHealth(targetConfigured && bridgeHealthy ? "healthy" : "degraded");
      setO3deFailureCount(0);
      setO3deStatusLog((current) => [
        `${new Date().toISOString()} ${targetConfigured && bridgeHealthy ? "[healthy]" : "[degraded]"} ${targetConfigured ? "target-ready" : "target-needs-setup"} ${bridgeHealthy ? "bridge-healthy" : "bridge-degraded"}`,
        ...current,
      ].slice(0, 6));
    } catch {
      setO3deStatus("Target: Unavailable | Bridge: Unavailable");
      setO3deHealth("unavailable");
      setO3deFailureCount((current) => current + 1);
      setO3deStatusLog((current) => [
        `${new Date().toISOString()} [unavailable] target-or-bridge-unreachable`,
        ...current,
      ].slice(0, 6));
    } finally {
      setO3deLastCheck(new Date().toISOString());
      o3deRefreshInFlightRef.current = false;
      setO3deRefreshing(false);
    }
  }

  useEffect(() => {
    void refreshO3deStatus();
    const refreshTimer = window.setInterval(() => {
      void refreshO3deStatus();
    }, 30000);
    return () => window.clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    if (handoffStatus === "Ready") return;
    const statusResetTimer = window.setTimeout(() => {
      setHandoffStatus("Ready");
    }, 3000);
    return () => window.clearTimeout(statusResetTimer);
  }, [handoffStatus]);

  function nudgePlayhead(frameDelta: number) {
    pushHistory(frameDelta > 0 ? "Nudge +1 frame" : "Nudge -1 frame");
    setPlayhead((current) => formatFramesToTimecode(parseTimecodeToFrames(current) + frameDelta));
  }

  function toggleTrackState(trackId: string, key: keyof TrackState) {
    pushHistory(`Toggle ${key.toUpperCase()} ${trackId.toUpperCase()}`);
    setTrackState((current) => ({
      ...current,
      [trackId]: {
        ...current[trackId],
        [key]: !current[trackId][key],
      },
    }));
  }

  function resetView() {
    pushHistory("Reset view");
    setTimelineRange("full");
    setTimelineZoom(2);
    setPlaybackRate("1.0x");
    setTrackFilter("all");
    setClipFilter("");
    setSnapMode("off");
  }

  function addMarker() {
    if (!playheadValid) {
      setHandoffStatus("Playhead timecode is invalid");
      return;
    }
    pushHistory("Add marker");
    setMarkers((current) => {
      const next = Array.from(new Set([...current, playhead])).sort();
      setSelectedMarker(playhead);
      return next;
    });
  }

  function removeSelectedMarker() {
    if (!selectedMarker) return;
    pushHistory("Remove marker");
    setMarkers((current) => {
      const next = current.filter((marker) => marker !== selectedMarker);
      setSelectedMarker(next[0] ?? null);
      return next;
    });
  }

  async function copyHandoffSummary() {
    if (!playheadValid) {
      setHandoffStatus("Playhead timecode is invalid");
      return;
    }
    try {
      await navigator.clipboard.writeText(handoffSummary);
      setHandoffStatus("Copied to clipboard");
    } catch {
      setHandoffStatus("Copy failed");
    }
  }

  function downloadHandoffSummary() {
    if (!playheadValid) {
      setHandoffStatus("Playhead timecode is invalid");
      return;
    }
    const blob = new Blob([handoffSummary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "movie-studio-handoff-packet.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setHandoffStatus("Downloaded packet");
  }

  function downloadHandoffJson() {
    if (!playheadValid) {
      setHandoffStatus("Playhead timecode is invalid");
      return;
    }
    const blob = new Blob([handoffJson], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "movie-studio-handoff-packet.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setHandoffStatus("Downloaded JSON packet");
  }

  async function copyHandoffJson() {
    if (!playheadValid) {
      setHandoffStatus("Playhead timecode is invalid");
      return;
    }
    try {
      await navigator.clipboard.writeText(handoffJson);
      setHandoffStatus("Copied JSON packet");
    } catch {
      setHandoffStatus("JSON copy failed");
    }
  }

  async function copyO3deStatus() {
    try {
      await navigator.clipboard.writeText(o3deStatusPacket);
      setHandoffStatus("Copied O3DE status");
    } catch {
      setHandoffStatus("O3DE status copy failed");
    }
  }

  function clearO3deStatusLog() {
    setO3deStatusLog([]);
    setHandoffStatus("Cleared O3DE log");
  }

  return (
    <section aria-label="Movie Studio" style={s.shell}>
      <header style={s.header}>
        <div>
          <p style={s.kicker}>Asset Forge Extension</p>
          <h2 style={s.title}>Movie Studio</h2>
          <p style={s.subtitle}>Timeline-first cinematic workspace with pro editorial controls.</p>
        </div>
        <div style={s.statGrid}>
          <Stat label="Tracks" value={String(trackCount)} />
          <Stat label="Clips" value={String(clipCount)} />
          <Stat label="Mode" value="Preview / Non-destructive" />
        </div>
      </header>

      <nav aria-label="Movie studio pages" style={s.pageTabs}>
        {STUDIO_PAGES.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => setActivePage(page.id)}
            style={activePage === page.id ? s.pageTabActive : s.pageTab}
          >
            <span style={s.pageTabLabel}>{page.label}</span>
            <span style={s.pageTabDetail}>{page.detail}</span>
          </button>
        ))}
      </nav>
      <section aria-label="O3DE status" style={s.o3deStrip}>
        <div>
          <p style={o3deHealth === "healthy" ? s.o3deHealthGood : o3deHealth === "degraded" ? s.o3deHealthWarn : s.o3deHealthBad}>
            O3DE Health: {o3deHealth === "healthy" ? "Healthy" : o3deHealth === "degraded" ? "Degraded" : "Unavailable"}
          </p>
          <p style={s.o3deStripText} aria-live="polite">
            {o3deStatus}
          </p>
          <p style={s.o3deStripMeta}>
            Last check: {o3deLastCheck} | Freshness: {o3deFreshness} | Consecutive failures: {o3deFailureCount}
          </p>
          <p style={s.o3deStripMeta}>
            Recent checks: {o3deStatusLog.length > 0 ? o3deStatusLog[0] : "none yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshO3deStatus()}
          style={o3deRefreshing ? s.toolbarButtonDisabled : s.toolbarButton}
          disabled={o3deRefreshing}
        >
          {o3deRefreshing ? "Refreshing..." : "Refresh O3DE"}
        </button>
        <button type="button" onClick={() => void copyO3deStatus()} style={s.toolbarButton}>
          Copy O3DE Status
        </button>
        <button type="button" onClick={clearO3deStatusLog} style={s.toolbarButton}>
          Clear O3DE Log
        </button>
      </section>

      <main style={s.main}>
        <aside style={s.toolsPanel}>
          <h3 style={s.panelTitle}>Editorial Tool Rack</h3>
          <ul style={s.toolList}>
            {TOOLSETS.map((tool) => (
              <li key={tool} style={s.toolItem}>
                {tool}
              </li>
            ))}
          </ul>
          <div style={s.binPanel}>
            <h4 style={s.binTitle}>Scene Bins</h4>
            <ul style={s.binList}>
              {SCENE_BINS.map((bin) => (
                <li key={bin} style={s.binItem}>
                  {bin}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section style={s.timelinePanel} aria-label="Timeline surface">
          <h3 style={s.panelTitle}>Master Timeline</h3>
          <p style={s.timelineMeta}>
            Active page: <strong>{STUDIO_PAGES.find((page) => page.id === activePage)?.label}</strong>
          </p>
          <div style={s.timelineToolbar}>
            <label style={s.inputLabel}>
              Playhead
              <input
                type="text"
                value={playhead}
                onChange={(event) => setPlayhead(event.target.value)}
                style={playheadValid ? s.playheadInput : s.playheadInputInvalid}
              />
            </label>
            <label style={s.inputLabel}>
              Find Clip
              <input
                type="text"
                value={clipFilter}
                onChange={(event) => setClipFilter(event.target.value)}
                style={s.playheadInput}
                placeholder="Search clip name"
              />
            </label>
            <button
              type="button"
              onClick={addMarker}
              style={playheadValid ? s.toolbarButton : s.toolbarButtonDisabled}
              disabled={!playheadValid}
            >
              Add Marker
            </button>
            <button
              type="button"
              onClick={undoHistory}
              style={historyPast.length > 0 ? s.toolbarButton : s.toolbarButtonDisabled}
              disabled={historyPast.length === 0}
            >
              Undo
            </button>
            <button
              type="button"
              onClick={redoHistory}
              style={historyFuture.length > 0 ? s.toolbarButton : s.toolbarButtonDisabled}
              disabled={historyFuture.length === 0}
            >
              Redo
            </button>
            <button
              type="button"
              onClick={removeSelectedMarker}
              style={selectedMarker ? s.toolbarButtonDanger : s.toolbarButtonDisabled}
              disabled={!selectedMarker}
            >
              Remove Marker
            </button>
            <button type="button" onClick={() => setIsPlaying((current) => !current)} style={s.toolbarButton}>
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={() => setPlayhead(selectedClip.start)} style={s.toolbarButton}>
              Step Prev
            </button>
            <button type="button" onClick={() => setPlayhead(selectedClip.end)} style={s.toolbarButton}>
              Step Next
            </button>
            <button type="button" onClick={() => nudgePlayhead(-1)} style={s.toolbarButton}>
              -1f
            </button>
            <button type="button" onClick={() => nudgePlayhead(1)} style={s.toolbarButton}>
              +1f
            </button>
            <label style={s.inputLabel}>
              Range
              <select
                value={timelineRange}
                onChange={(event) => {
                  pushHistory("Change timeline range");
                  setTimelineRange(event.target.value as TimelineRangePreset);
                }}
                style={s.selectInput}
              >
                <option value="scene">Scene</option>
                <option value="sequence">Sequence</option>
                <option value="full">Full</option>
              </select>
            </label>
            <label style={s.inputLabel}>
              Zoom
              <select
                value={timelineZoom}
                onChange={(event) => {
                  pushHistory("Change timeline zoom");
                  setTimelineZoom(Number(event.target.value) as TimelineZoomLevel);
                }}
                style={s.selectInput}
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
              </select>
            </label>
            <label style={s.inputLabel}>
              Rate
              <select
                value={playbackRate}
                onChange={(event) => {
                  pushHistory("Change playback rate");
                  setPlaybackRate(event.target.value as "0.5x" | "1.0x" | "2.0x");
                }}
                style={s.selectInput}
              >
                <option value="0.5x">0.5x</option>
                <option value="1.0x">1.0x</option>
                <option value="2.0x">2.0x</option>
              </select>
            </label>
            <label style={s.inputLabel}>
              Tracks
              <select
                value={trackFilter}
                onChange={(event) => {
                  pushHistory("Change track filter");
                  setTrackFilter(event.target.value as "all" | "video" | "audio");
                }}
                style={s.selectInput}
              >
                <option value="all">All</option>
                <option value="video">Video</option>
                <option value="audio">Audio</option>
              </select>
            </label>
            <label style={s.inputLabel}>
              Snap
              <select
                value={snapMode}
                onChange={(event) => {
                  pushHistory("Change snap mode");
                  setSnapMode(event.target.value as "off" | "frame" | "marker");
                }}
                style={s.selectInput}
              >
                <option value="off">Off</option>
                <option value="frame">Frame</option>
                <option value="marker">Marker</option>
              </select>
            </label>
            <button type="button" onClick={resetView} style={s.toolbarButton}>
              Reset View
            </button>
            <div style={s.markerRow} aria-label="Timeline markers">
              {markers.map((marker) => (
                <button
                  key={marker}
                  type="button"
                  onClick={() => setSelectedMarker(marker)}
                  style={selectedMarker === marker ? s.markerPillActive : s.markerPill}
                >
                  {marker}
                </button>
              ))}
            </div>
            {!playheadValid ? <p style={s.validationText}>Playhead must be HH:MM:SS:FF at 24fps.</p> : null}
          </div>
          <div style={s.trackStack}>
            {visibleTracks.map((track) => (
              <div key={track.id} style={s.trackRow}>
                <div style={s.trackLabel}>
                  <strong>{track.name}</strong>
                  <span>{track.type.toUpperCase()}</span>
                  <div style={s.trackControlRow}>
                    <button
                      type="button"
                      onClick={() => toggleTrackState(track.id, "mute")}
                      style={trackState[track.id].mute ? s.trackControlActive : s.trackControl}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTrackState(track.id, "solo")}
                      style={trackState[track.id].solo ? s.trackControlActive : s.trackControl}
                    >
                      S
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTrackState(track.id, "lock")}
                      style={trackState[track.id].lock ? s.trackControlActive : s.trackControl}
                    >
                      L
                    </button>
                  </div>
                </div>
                <div style={s.clipLane}>
                  {track.clips.map((clip) => (
                    <article
                      key={clip.id}
                      style={{
                        ...(selectedClipId === clip.id ? s.clipCardActive : s.clipCard),
                        minWidth: clipWidthForZoom(timelineZoom),
                      }}
                      onClick={() => {
                        pushHistory("Select clip");
                        setSelectedClipId(clip.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          pushHistory("Select clip");
                          setSelectedClipId(clip.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-pressed={selectedClipId === clip.id}
                      aria-label={`Clip ${clip.label}`}
                    >
                      <span style={s.trimHandle} aria-hidden>
                        {"<"}
                      </span>
                      <strong>{clip.label}</strong>
                      <span>
                        {clip.start} - {clip.end}
                      </span>
                      <span style={s.trimHandleRight} aria-hidden>
                        {">"}
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <aside style={s.inspector}>
            <h4 style={s.inspectorTitle}>Clip Inspector</h4>
            <p style={s.inspectorLine}>
              <strong>Name:</strong> {selectedClip.label}
            </p>
            <p style={s.inspectorLine}>
              <strong>In:</strong> {selectedClip.start}
            </p>
            <p style={s.inspectorLine}>
              <strong>Out:</strong> {selectedClip.end}
            </p>
            <p style={s.inspectorLine}>
              <strong>Playhead:</strong> {playhead}
            </p>
            <p style={s.inspectorLine}>
              <strong>Range:</strong> {rangePresetLabel(timelineRange)}
            </p>
            <p style={s.inspectorLine}>
              <strong>Zoom:</strong> {timelineZoom}x
            </p>
            <p style={s.inspectorLine}>
              <strong>Transport:</strong> {isPlaying ? "Playing" : "Paused"} at {playbackRate}
            </p>
            <p style={s.inspectorLine}>
              <strong>Selected marker:</strong> {selectedMarker ?? "None"}
            </p>
            <p style={s.inspectorLine}>
              <strong>Snap:</strong> {snapMode}
            </p>
            <p style={s.inspectorLine}>
              <strong>Shortcuts:</strong> Space play/pause, J prev, K stop, L next
            </p>
            <button
              type="button"
              onClick={() => setShortcutsVisible((current) => !current)}
              style={s.toolbarButton}
              aria-expanded={shortcutsVisible}
              aria-controls="movie-studio-shortcuts-list"
            >
              {shortcutsVisible ? "Hide Shortcuts" : "Show Shortcuts"}
            </button>
            {shortcutsVisible ? (
              <ul id="movie-studio-shortcuts-list" aria-label="Extended shortcuts" style={s.shortcutList}>
                <li style={s.shortcutItem}>Shift+R reset view</li>
                <li style={s.shortcutItem}>Shift+O refresh O3DE</li>
                <li style={s.shortcutItem}>Shift+S copy O3DE status</li>
                <li style={s.shortcutItem}>Shift+X clear O3DE log</li>
                <li style={s.shortcutItem}>Shift+H copy handoff packet</li>
                <li style={s.shortcutItem}>Shift+J copy handoff JSON</li>
              </ul>
            ) : null}
            <div style={s.historyBox}>
              <strong style={s.historyTitle}>Timeline History</strong>
              <ul style={s.historyList}>
                {historyLog.length === 0 ? <li style={s.historyItem}>No actions yet</li> : null}
                {historyLog.map((entry, index) => (
                  <li key={`${entry}-${index}`} style={s.historyItem}>
                    {entry}
                  </li>
                ))}
              </ul>
            </div>
            <div style={s.handoffBox}>
              <strong style={s.historyTitle}>Handoff Packet</strong>
              <p style={s.handoffMeta}>
                Snapshot summary for cross-thread review and PR notes.
              </p>
              <p style={s.handoffMeta}>Schema: {MOVIE_STUDIO_HANDOFF_SCHEMA}</p>
              <div style={s.handoffActions}>
                <button
                  type="button"
                  onClick={() => void copyHandoffSummary()}
                  style={playheadValid ? s.toolbarButton : s.toolbarButtonDisabled}
                  disabled={!playheadValid}
                >
                  Copy Packet
                </button>
                <button
                  type="button"
                  onClick={() => void copyHandoffJson()}
                  style={playheadValid ? s.toolbarButton : s.toolbarButtonDisabled}
                  disabled={!playheadValid}
                >
                  Copy JSON
                </button>
                <button
                  type="button"
                  onClick={downloadHandoffSummary}
                  style={playheadValid ? s.toolbarButton : s.toolbarButtonDisabled}
                  disabled={!playheadValid}
                >
                  Download .txt
                </button>
                <button
                  type="button"
                  onClick={downloadHandoffJson}
                  style={playheadValid ? s.toolbarButton : s.toolbarButtonDisabled}
                  disabled={!playheadValid}
                >
                  Download .json
                </button>
                <span style={s.handoffStatus} aria-live="polite">
                  {handoffStatus}
                </span>
              </div>
              <textarea
                aria-label="Handoff summary"
                readOnly
                value={handoffSummary}
                style={s.handoffTextarea}
              />
            </div>
          </aside>
        </section>
      </main>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={s.statCard}>
      <span style={s.statLabel}>{label}</span>
      <strong style={s.statValue}>{value}</strong>
    </div>
  );
}

const s = {
  shell: {
    display: "grid",
    gap: 16,
    padding: 14,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 12,
    background: "linear-gradient(145deg, rgba(14, 20, 29, 0.94), rgba(20, 28, 39, 0.94))",
    color: "var(--app-text-primary)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  kicker: {
    margin: 0,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--app-text-muted)",
  },
  title: {
    margin: "4px 0",
    fontSize: 28,
  },
  subtitle: {
    margin: 0,
    color: "var(--app-text-muted)",
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(110px, 1fr))",
    gap: 8,
  },
  statCard: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: "8px 10px",
    background: "rgba(8, 12, 18, 0.42)",
    display: "grid",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "var(--app-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  statValue: {
    fontSize: 14,
  },
  pageTabs: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 8,
  },
  o3deStrip: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    background: "rgba(12, 17, 24, 0.68)",
    padding: "8px 10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  o3deStripText: {
    margin: 0,
    fontSize: 12,
    color: "var(--app-text-muted)",
  },
  o3deStripMeta: {
    margin: "3px 0 0",
    fontSize: 11,
    color: "var(--app-text-muted)",
  },
  o3deHealthGood: {
    margin: 0,
    fontSize: 11,
    color: "#9af2c0",
    fontWeight: 700,
  },
  o3deHealthWarn: {
    margin: 0,
    fontSize: 11,
    color: "#ffe4a3",
    fontWeight: 700,
  },
  o3deHealthBad: {
    margin: 0,
    fontSize: 11,
    color: "#ffb0ba",
    fontWeight: 700,
  },
  pageTab: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    background: "rgba(12, 17, 24, 0.55)",
    color: "var(--app-text-primary)",
    padding: "10px 12px",
    textAlign: "left",
    display: "grid",
    gap: 3,
    cursor: "pointer",
  },
  pageTabActive: {
    border: "1px solid rgba(116, 199, 255, 0.8)",
    borderRadius: 10,
    background: "rgba(24, 60, 92, 0.55)",
    color: "var(--app-text-primary)",
    padding: "10px 12px",
    textAlign: "left",
    display: "grid",
    gap: 3,
    cursor: "pointer",
  },
  pageTabLabel: {
    fontWeight: 700,
    fontSize: 13,
  },
  pageTabDetail: {
    fontSize: 12,
    color: "var(--app-text-muted)",
  },
  main: {
    display: "grid",
    gridTemplateColumns: "240px minmax(0, 1fr)",
    gap: 12,
  },
  toolsPanel: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "rgba(8, 12, 18, 0.4)",
  },
  panelTitle: {
    margin: "0 0 10px",
    fontSize: 14,
  },
  toolList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "grid",
    gap: 6,
  },
  toolItem: {
    fontSize: 12,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    padding: "6px 8px",
    background: "rgba(14, 20, 29, 0.7)",
  },
  binPanel: {
    marginTop: 12,
    borderTop: "1px solid var(--app-panel-border)",
    paddingTop: 10,
  },
  binTitle: {
    margin: "0 0 8px",
    fontSize: 12,
  },
  binList: {
    margin: 0,
    paddingLeft: 14,
    display: "grid",
    gap: 4,
    fontSize: 12,
    color: "var(--app-text-muted)",
  },
  binItem: {
    lineHeight: 1.2,
  },
  timelinePanel: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "rgba(8, 12, 18, 0.4)",
    minWidth: 0,
  },
  timelineMeta: {
    margin: "0 0 10px",
    fontSize: 12,
    color: "var(--app-text-muted)",
  },
  timelineToolbar: {
    display: "grid",
    gridTemplateColumns:
      "minmax(140px, 180px) minmax(150px, 180px) auto auto auto auto minmax(110px, 130px) minmax(110px, 130px) minmax(110px, 130px) minmax(110px, 130px) minmax(220px, 1fr)",
    gap: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  inputLabel: {
    display: "grid",
    gap: 4,
    fontSize: 11,
    color: "var(--app-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  playheadInput: {
    border: "1px solid var(--app-panel-border)",
    background: "rgba(12, 17, 24, 0.8)",
    color: "var(--app-text-primary)",
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: 12,
  },
  playheadInputInvalid: {
    border: "1px solid rgba(243, 127, 150, 0.9)",
    background: "rgba(48, 15, 21, 0.75)",
    color: "#ffd8e1",
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: 12,
  },
  selectInput: {
    border: "1px solid var(--app-panel-border)",
    background: "rgba(12, 17, 24, 0.8)",
    color: "var(--app-text-primary)",
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: 12,
  },
  toolbarButton: {
    border: "1px solid rgba(121, 191, 255, 0.72)",
    background: "rgba(37, 86, 126, 0.55)",
    color: "var(--app-text-primary)",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  },
  toolbarButtonDanger: {
    border: "1px solid rgba(243, 127, 150, 0.8)",
    background: "rgba(115, 31, 46, 0.56)",
    color: "#ffd8e1",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  },
  toolbarButtonDisabled: {
    border: "1px solid var(--app-panel-border)",
    background: "rgba(45, 51, 60, 0.55)",
    color: "var(--app-text-muted)",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "not-allowed",
    fontSize: 12,
  },
  markerRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
  },
  validationText: {
    margin: "2px 0 0",
    fontSize: 11,
    color: "#ffb0ba",
  },
  markerPill: {
    fontSize: 11,
    border: "1px solid rgba(255, 210, 124, 0.8)",
    color: "#ffe4b4",
    background: "rgba(130, 83, 16, 0.45)",
    borderRadius: 999,
    padding: "3px 8px",
    cursor: "pointer",
  },
  markerPillActive: {
    fontSize: 11,
    border: "1px solid rgba(255, 226, 166, 0.95)",
    color: "#fff0c9",
    background: "rgba(157, 102, 19, 0.62)",
    borderRadius: 999,
    padding: "3px 8px",
    cursor: "pointer",
  },
  trackStack: {
    display: "grid",
    gap: 8,
  },
  trackRow: {
    display: "grid",
    gridTemplateColumns: "170px minmax(0, 1fr)",
    gap: 8,
    alignItems: "start",
  },
  trackLabel: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "rgba(12, 17, 24, 0.75)",
    padding: "8px 10px",
    display: "grid",
    gap: 4,
    fontSize: 12,
  },
  trackControlRow: {
    display: "flex",
    gap: 4,
  },
  trackControl: {
    border: "1px solid var(--app-panel-border)",
    background: "rgba(14, 20, 29, 0.8)",
    color: "var(--app-text-muted)",
    borderRadius: 6,
    padding: "3px 7px",
    fontSize: 10,
    cursor: "pointer",
  },
  trackControlActive: {
    border: "1px solid rgba(111, 190, 248, 0.95)",
    background: "rgba(31, 72, 108, 0.6)",
    color: "var(--app-text-primary)",
    borderRadius: 6,
    padding: "3px 7px",
    fontSize: 10,
    cursor: "pointer",
  },
  clipLane: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "rgba(12, 17, 24, 0.45)",
    padding: 8,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    minHeight: 56,
  },
  clipCard: {
    border: "1px solid rgba(121, 191, 255, 0.72)",
    background: "rgba(37, 86, 126, 0.55)",
    borderRadius: 7,
    padding: "6px 8px",
    fontSize: 11,
    display: "grid",
    gap: 3,
    minWidth: 140,
    cursor: "pointer",
    position: "relative",
  },
  clipCardActive: {
    border: "1px solid rgba(160, 220, 255, 0.95)",
    boxShadow: "0 0 0 1px rgba(160, 220, 255, 0.35)",
    background: "rgba(52, 110, 156, 0.65)",
    borderRadius: 7,
    padding: "6px 8px",
    fontSize: 11,
    display: "grid",
    gap: 3,
    minWidth: 140,
    cursor: "pointer",
    position: "relative",
  },
  trimHandle: {
    position: "absolute",
    left: 4,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 10,
    color: "rgba(220, 238, 255, 0.85)",
  },
  trimHandleRight: {
    position: "absolute",
    right: 4,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 10,
    color: "rgba(220, 238, 255, 0.85)",
  },
  inspector: {
    marginTop: 10,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "rgba(12, 17, 24, 0.7)",
    padding: "8px 10px",
  },
  inspectorTitle: {
    margin: "0 0 8px",
    fontSize: 13,
  },
  inspectorLine: {
    margin: "4px 0",
    fontSize: 12,
  },
  historyBox: {
    marginTop: 8,
    borderTop: "1px solid var(--app-panel-border)",
    paddingTop: 8,
  },
  historyTitle: {
    fontSize: 12,
  },
  historyList: {
    margin: "6px 0 0",
    paddingLeft: 16,
    display: "grid",
    gap: 3,
  },
  historyItem: {
    fontSize: 11,
    color: "var(--app-text-muted)",
  },
  shortcutList: {
    margin: "8px 0 0",
    paddingLeft: 16,
    display: "grid",
    gap: 2,
  },
  shortcutItem: {
    fontSize: 11,
    color: "var(--app-text-muted)",
  },
  handoffBox: {
    marginTop: 10,
    borderTop: "1px solid var(--app-panel-border)",
    paddingTop: 8,
    display: "grid",
    gap: 6,
  },
  handoffMeta: {
    margin: 0,
    fontSize: 11,
    color: "var(--app-text-muted)",
  },
  handoffActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  handoffStatus: {
    fontSize: 11,
    color: "var(--app-text-muted)",
  },
  handoffTextarea: {
    width: "100%",
    minHeight: 130,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "rgba(10, 14, 21, 0.92)",
    color: "var(--app-text-primary)",
    padding: 8,
    fontSize: 11,
    resize: "vertical",
  },
} satisfies Record<string, CSSProperties>;
