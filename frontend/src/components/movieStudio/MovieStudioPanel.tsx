import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { fetchO3deBridge, fetchO3deTarget } from "../../lib/api";
import { useSettings } from "../../lib/settings/hooks";
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
    };
  } catch {
    return null;
  }
}

export default function MovieStudioPanel() {
  const { settings, saveSettings, themeTokens } = useSettings();
  const resolvedThemeMode = themeTokens.resolvedThemeMode;
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
  const [o3deStatus, setO3deStatus] = useState<string>("Checking O3DE bridge...");
  const [o3deLastCheck, setO3deLastCheck] = useState<string>("Pending first check");
  const [o3deHealth, setO3deHealth] = useState<"healthy" | "degraded" | "unavailable">("degraded");
  const [o3deFailureCount, setO3deFailureCount] = useState<number>(0);
  const [o3deStatusLog, setO3deStatusLog] = useState<string[]>([]);
  const [localThemeMode, setLocalThemeMode] = useState<"light" | "dark">(resolvedThemeMode);
  const [themeStatus, setThemeStatus] = useState<string>(`Theme: ${resolvedThemeMode}`);

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
          schema: "movie_studio.handoff.v1",
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
    };
    window.sessionStorage.setItem(MOVIE_STUDIO_SESSION_KEY, JSON.stringify(payload));
  }, [playhead, markers, selectedMarker, timelineRange, timelineZoom, playbackRate, clipFilter, trackFilter, snapMode]);

  async function refreshO3deStatus() {
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
    setLocalThemeMode(resolvedThemeMode);
    setThemeStatus(`Theme: ${resolvedThemeMode}`);
  }, [resolvedThemeMode]);

  function applyThemeMode(mode: "light" | "dark") {
    if (localThemeMode === mode && settings.appearance.themeMode === mode) {
      setThemeStatus(`Theme already set to ${mode}`);
      return;
    }

    setLocalThemeMode(mode);
    saveSettings({
      ...settings,
      appearance: {
        ...settings.appearance,
        themeMode: mode,
      },
    });
    setThemeStatus(`Theme set to ${mode}`);
  }

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

  function addMarker() {
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
    try {
      await navigator.clipboard.writeText(handoffSummary);
      setHandoffStatus("Copied to clipboard");
    } catch {
      setHandoffStatus("Copy failed");
    }
  }

  function downloadHandoffSummary() {
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

  return (
    <section aria-label="Movie Studio" style={s.shell}>
      <header style={s.header}>
        <div>
          <p style={s.kicker}>Asset Forge Extension</p>
          <h2 style={s.title}>Movie Studio</h2>
          <p style={s.subtitle}>Timeline-first cinematic workspace with pro editorial controls.</p>
        </div>
        <div style={s.headerRight}>
          <div style={s.themeToggleGroup} aria-label="Movie Studio theme mode toggle">
            <button
              type="button"
              onClick={() => applyThemeMode("light")}
              aria-pressed={localThemeMode === "light"}
              style={{
                ...s.themeToggleButton,
                ...(localThemeMode === "light" ? s.themeToggleButtonActive : {}),
              }}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => applyThemeMode("dark")}
              aria-pressed={localThemeMode === "dark"}
              style={{
                ...s.themeToggleButton,
                ...(localThemeMode === "dark" ? s.themeToggleButtonActive : {}),
              }}
            >
              Dark
            </button>
          </div>
          <span style={s.themeStatusText}>{themeStatus}</span>
          <div style={s.statGrid}>
            <Stat label="Tracks" value={String(trackCount)} />
            <Stat label="Clips" value={String(clipCount)} />
            <Stat label="Mode" value="Preview / Non-destructive" />
          </div>
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
          <p style={s.o3deStripText}>{o3deStatus}</p>
          <p style={s.o3deStripMeta}>Last check: {o3deLastCheck} | Consecutive failures: {o3deFailureCount}</p>
          <p style={s.o3deStripMeta}>
            Recent checks: {o3deStatusLog.length > 0 ? o3deStatusLog[0] : "none yet"}
          </p>
        </div>
        <button type="button" onClick={() => void refreshO3deStatus()} style={s.toolbarButton}>
          Refresh O3DE
        </button>
      </section>

      <main style={s.main}>
        <section style={s.topDock}>
          <aside style={s.sourcePane}>
            <h3 style={s.panelTitle}>Source / Effect Controls</h3>
            <p style={s.timelineMeta}>
              Active page: <strong>{STUDIO_PAGES.find((page) => page.id === activePage)?.label}</strong>
            </p>
            <ul style={s.toolList}>
              {TOOLSETS.map((tool) => (
                <li key={tool} style={s.toolItem}>
                  {tool}
                </li>
              ))}
            </ul>
            <div style={s.binPanel}>
              <h4 style={s.binTitle}>Track Status</h4>
              <ul style={s.binList}>
                {visibleTracks.map((track) => (
                  <li key={`${track.id}-status`} style={s.binItem}>
                    {track.name}: {trackState[track.id].mute ? "M " : ""}{trackState[track.id].solo ? "S " : ""}{trackState[track.id].lock ? "L" : "Ready"}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section style={s.programPane} aria-label="Timeline surface">
            <section aria-label="Program viewer" style={s.viewerShell}>
              <header style={s.viewerHeader}>
                <h4 style={s.viewerTitle}>Program Viewer</h4>
                <span style={s.viewerBadge}>{isPlaying ? "Live Playback" : "Paused Frame"}</span>
              </header>
              <div style={s.viewerStage}>
                <div style={s.viewerOverlayTop}>
                  <strong>{selectedClip.label}</strong>
                  <span>
                    {selectedClip.start} - {selectedClip.end}
                  </span>
                </div>
                <div style={s.viewerCenterMark}>FRAME PREVIEW</div>
                <div style={s.viewerOverlayBottom}>
                  <span>Playhead {playhead}</span>
                  <span>{rangePresetLabel(timelineRange)}</span>
                  <span>{timelineZoom}x</span>
                  <span>{playbackRate}</span>
                </div>
              </div>
            </section>
          </section>

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
              <div style={s.handoffActions}>
                <button type="button" onClick={() => void copyHandoffSummary()} style={s.toolbarButton}>
                  Copy Packet
                </button>
                <button type="button" onClick={downloadHandoffSummary} style={s.toolbarButton}>
                  Download .txt
                </button>
                <button type="button" onClick={downloadHandoffJson} style={s.toolbarButton}>
                  Download .json
                </button>
                <span style={s.handoffStatus}>{handoffStatus}</span>
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

        <section style={s.bottomDock}>
          <aside style={s.projectPane}>
            <h3 style={s.panelTitle}>Project / Media Browser</h3>
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
            <div style={s.binPanel}>
              <h4 style={s.binTitle}>Selected Clip</h4>
              <ul style={s.binList}>
                <li style={s.binItem}>{selectedClip.label}</li>
                <li style={s.binItem}>{selectedClip.start} - {selectedClip.end}</li>
              </ul>
            </div>
          </aside>

          <section style={s.timelinePanel} aria-label="Timeline surface">
            <h3 style={s.panelTitle}>Master Timeline</h3>
            <div style={s.timelineWorkspace}>
              <div style={s.timelineToolbar}>
            <label style={s.inputLabel}>
              Playhead
              <input
                type="text"
                value={playhead}
                onChange={(event) => setPlayhead(event.target.value)}
                style={s.playheadInput}
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
            <button type="button" onClick={addMarker} style={s.toolbarButton}>
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
              </div>
              <div style={s.timelineGrid}>
                <aside style={s.timelineToolRail}>
                  <button type="button" style={s.toolRailButton} title="Selection tool">V</button>
                  <button type="button" style={s.toolRailButton} title="Razor tool">C</button>
                  <button type="button" style={s.toolRailButton} title="Slip tool">Y</button>
                  <button type="button" style={s.toolRailButton} title="Pen tool">P</button>
                  <button type="button" style={s.toolRailButton} title="Hand tool">H</button>
                </aside>
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
              </div>
            </div>
          </section>

          <aside style={s.audioMetersPane}>
            <h4 style={s.binTitle}>Audio Meters</h4>
            <div style={s.meterColumn}>
              <div style={{ ...s.meterBar, height: "72%" }} />
              <div style={{ ...s.meterBar, height: "58%" }} />
              <div style={{ ...s.meterBar, height: "66%" }} />
              <div style={{ ...s.meterBar, height: "44%" }} />
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
    border: "1px solid var(--app-panel-border-strong)",
    borderRadius: 12,
    background: "var(--app-panel-elevated)",
    color: "var(--app-text-color)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  headerRight: {
    display: "grid",
    justifyItems: "end",
    gap: 8,
  },
  themeToggleGroup: {
    display: "inline-flex",
    gap: 3,
    padding: 2,
    border: "1px solid var(--app-panel-border-strong)",
    borderRadius: 6,
    background: "var(--app-panel-bg)",
  },
  themeToggleButton: {
    border: "1px solid transparent",
    borderRadius: 4,
    background: "transparent",
    color: "var(--app-text-color)",
    padding: "3px 9px",
    fontSize: 11,
    cursor: "pointer",
  },
  themeToggleButtonActive: {
    border: "1px solid var(--app-info-border)",
    background: "var(--app-info-bg)",
    color: "var(--app-info-text)",
    fontWeight: 700,
  },
  themeStatusText: {
    fontSize: 11,
    color: "var(--app-subtle-color)",
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
    background: "var(--app-panel-bg)",
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
    background: "var(--app-panel-bg)",
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
    color: "var(--app-success-text)",
    fontWeight: 700,
  },
  o3deHealthWarn: {
    margin: 0,
    fontSize: 11,
    color: "var(--app-warning-text)",
    fontWeight: 700,
  },
  o3deHealthBad: {
    margin: 0,
    fontSize: 11,
    color: "var(--app-danger-text)",
    fontWeight: 700,
  },
  pageTab: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    background: "var(--app-panel-bg)",
    color: "var(--app-text-color)",
    padding: "10px 12px",
    textAlign: "left",
    display: "grid",
    gap: 3,
    cursor: "pointer",
  },
  pageTabActive: {
    border: "1px solid var(--app-info-border)",
    borderRadius: 10,
    background: "var(--app-info-bg)",
    color: "var(--app-text-color)",
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
    gridTemplateRows: "minmax(250px, 40vh) minmax(320px, 1fr)",
    gap: 10,
    minHeight: 0,
  },
  topDock: {
    display: "grid",
    gridTemplateColumns: "260px minmax(0, 1fr) 320px",
    gap: 8,
    minHeight: 0,
  },
  sourcePane: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "var(--app-panel-bg)",
    padding: 8,
    minHeight: 0,
    overflow: "auto",
  },
  programPane: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "var(--app-panel-bg)",
    padding: 8,
    minHeight: 0,
    overflow: "hidden",
  },
  bottomDock: {
    display: "grid",
    gridTemplateColumns: "260px minmax(0, 1fr) 54px",
    gap: 8,
    minHeight: 0,
  },
  projectPane: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "var(--app-panel-bg)",
    padding: 8,
    minHeight: 0,
    overflow: "auto",
  },
  toolsPanel: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    padding: 10,
    background: "var(--app-panel-bg)",
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
    background: "var(--app-panel-bg-alt)",
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
    borderRadius: 8,
    padding: 8,
    background: "var(--app-panel-bg)",
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    overflow: "hidden",
  },
  timelineWorkspace: {
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    gap: 6,
  },
  timelineGrid: {
    display: "grid",
    gridTemplateColumns: "30px minmax(0, 1fr)",
    gap: 6,
    minHeight: 0,
    overflow: "hidden",
  },
  timelineToolRail: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 6,
    background: "var(--app-panel-bg-alt)",
    display: "grid",
    alignContent: "start",
    gap: 4,
    padding: "6px 4px",
  },
  toolRailButton: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 4,
    background: "var(--app-panel-bg)",
    color: "var(--app-text-color)",
    fontSize: 10,
    padding: "4px 0",
    cursor: "pointer",
  },
  timelineMeta: {
    margin: "0 0 10px",
    fontSize: 12,
    color: "var(--app-text-muted)",
  },
  viewerShell: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 10,
    background: "var(--app-panel-bg-alt)",
    padding: 8,
    marginBottom: 10,
    display: "grid",
    gap: 8,
  },
  viewerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  viewerTitle: {
    margin: 0,
    fontSize: 13,
  },
  viewerBadge: {
    fontSize: 11,
    color: "var(--app-text-muted)",
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "2px 8px",
  },
  viewerStage: {
    minHeight: 260,
    border: "1px solid var(--app-info-border)",
    borderRadius: 8,
    background:
      "radial-gradient(circle at 50% 35%, rgba(75, 116, 173, 0.24), rgba(14, 20, 30, 0.72) 58%), linear-gradient(135deg, var(--app-panel-bg-alt), var(--app-panel-bg))",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    overflow: "hidden",
  },
  viewerOverlayTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    padding: "8px 10px",
    fontSize: 11,
    color: "var(--app-text-color)",
    background: "linear-gradient(180deg, rgba(4, 7, 12, 0.75), rgba(4, 7, 12, 0.05))",
  },
  viewerCenterMark: {
    alignSelf: "center",
    justifySelf: "center",
    color: "var(--app-text-color)",
    fontSize: 12,
    letterSpacing: "0.12em",
    border: "1px dashed rgba(170, 214, 255, 0.45)",
    borderRadius: 999,
    padding: "8px 16px",
  },
  viewerOverlayBottom: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
    padding: "8px 10px",
    fontSize: 11,
    color: "var(--app-text-color)",
    background: "linear-gradient(0deg, rgba(4, 7, 12, 0.75), rgba(4, 7, 12, 0.08))",
  },
  timelineToolbar: {
    display: "grid",
    gridTemplateColumns:
      "minmax(130px, 170px) minmax(150px, 190px) repeat(9, auto) minmax(120px, 150px) minmax(100px, 130px) minmax(90px, 110px) minmax(90px, 110px) minmax(90px, 110px) minmax(220px, 1fr)",
    gap: 6,
    alignItems: "center",
    overflowX: "auto",
    paddingBottom: 4,
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
    background: "var(--app-input-bg)",
    color: "var(--app-text-color)",
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: 12,
  },
  selectInput: {
    border: "1px solid var(--app-panel-border)",
    background: "var(--app-input-bg)",
    color: "var(--app-text-color)",
    borderRadius: 8,
    padding: "6px 8px",
    fontSize: 12,
  },
  toolbarButton: {
    border: "1px solid var(--app-info-border)",
    background: "var(--app-info-bg)",
    color: "var(--app-text-color)",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  },
  toolbarButtonDanger: {
    border: "1px solid var(--app-danger-border)",
    background: "var(--app-danger-bg)",
    color: "var(--app-danger-text)",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  },
  toolbarButtonDisabled: {
    border: "1px solid var(--app-panel-border)",
    background: "var(--app-panel-bg-muted)",
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
  markerPill: {
    fontSize: 11,
    border: "1px solid rgba(255, 210, 124, 0.8)",
    color: "var(--app-warning-text)",
    background: "var(--app-warning-bg)",
    borderRadius: 999,
    padding: "3px 8px",
    cursor: "pointer",
  },
  markerPillActive: {
    fontSize: 11,
    border: "1px solid rgba(255, 226, 166, 0.95)",
    color: "var(--app-warning-text)",
    background: "var(--app-warning-bg)",
    borderRadius: 999,
    padding: "3px 8px",
    cursor: "pointer",
  },
  trackStack: {
    display: "grid",
    gap: 8,
    minHeight: 0,
    overflow: "auto",
    paddingRight: 2,
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
    background: "var(--app-panel-bg-alt)",
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
    background: "var(--app-panel-bg)",
    color: "var(--app-text-muted)",
    borderRadius: 6,
    padding: "3px 7px",
    fontSize: 10,
    cursor: "pointer",
  },
  trackControlActive: {
    border: "1px solid var(--app-info-border)",
    background: "var(--app-info-bg)",
    color: "var(--app-text-color)",
    borderRadius: 6,
    padding: "3px 7px",
    fontSize: 10,
    cursor: "pointer",
  },
  clipLane: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "var(--app-panel-bg)",
    padding: 8,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    minHeight: 58,
  },
  clipCard: {
    border: "1px solid var(--app-info-border)",
    background: "var(--app-info-bg)",
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
    border: "1px solid var(--app-info-border)",
    boxShadow: "0 0 0 1px var(--app-info-border)",
    background: "var(--app-accent-soft)",
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
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "var(--app-panel-bg-alt)",
    padding: "8px 10px",
    minHeight: 0,
    overflow: "auto",
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
    minHeight: 90,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "var(--app-input-bg)",
    color: "var(--app-text-color)",
    padding: 8,
    fontSize: 11,
    resize: "vertical",
  },
  audioMetersPane: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "var(--app-panel-bg)",
    padding: 6,
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr)",
    minHeight: 0,
  },
  meterColumn: {
    minHeight: 0,
    border: "1px solid var(--app-panel-border)",
    borderRadius: 6,
    background: "var(--app-panel-bg-alt)",
    display: "grid",
    alignContent: "end",
    justifyItems: "center",
    gap: 4,
    padding: "6px 4px",
  },
  meterBar: {
    width: "100%",
    borderRadius: 2,
    background: "linear-gradient(180deg, #7ee7ff 0%, #3b82f6 52%, #1d4ed8 100%)",
    minHeight: 8,
  },
} satisfies Record<string, CSSProperties>;
