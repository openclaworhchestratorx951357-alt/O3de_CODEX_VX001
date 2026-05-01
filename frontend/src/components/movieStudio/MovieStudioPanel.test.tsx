import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach } from "vitest";
import { describe, expect, it, vi } from "vitest";

import MovieStudioPanel from "./MovieStudioPanel";

describe("MovieStudioPanel", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders timeline-first cinematic workspace details", () => {
    render(<MovieStudioPanel />);

    expect(screen.getByRole("heading", { name: "Movie Studio" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Master Timeline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh O3DE" })).toBeInTheDocument();
    expect(screen.getByText((content) => content.startsWith("O3DE Health:"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.startsWith("Last check:"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Consecutive failures:"))).toBeInTheDocument();
    expect(screen.getByText((content) => content.startsWith("Recent checks:"))).toBeInTheDocument();
    expect(screen.getByText("Schema: movie_studio.handoff.v1")).toBeInTheDocument();
    expect(screen.getByText("Ripple Trim")).toBeInTheDocument();
    expect(screen.getAllByText("Scene 01 Wide").length).toBeGreaterThan(0);
  });

  it("updates inspector selection and adds marker from playhead", () => {
    render(<MovieStudioPanel />);

    fireEvent.click(screen.getByLabelText("Clip Cam B Alt"));
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes("Name: Cam B Alt") ?? false).length,
    ).toBeGreaterThan(0);

    const playheadInput = screen.getByLabelText("Playhead");
    fireEvent.change(playheadInput, { target: { value: "00:00:20:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Marker" }));

    expect(screen.getAllByText("00:00:20:00").length).toBeGreaterThan(1);
  });

  it("shows validation and blocks marker/handoff actions for invalid playhead", () => {
    render(<MovieStudioPanel />);

    fireEvent.change(screen.getByLabelText("Playhead"), { target: { value: "00:99:00:99" } });
    expect(screen.getByText("Playhead must be HH:MM:SS:FF at 24fps.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Marker" }));
    expect(screen.queryByRole("button", { name: "00:99:00:99" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy Packet" }));
    expect(screen.getByText("Playhead timecode is invalid")).toBeInTheDocument();
  });

  it("updates timeline range and zoom controls", () => {
    render(<MovieStudioPanel />);

    fireEvent.change(screen.getByLabelText("Range"), { target: { value: "scene" } });
    fireEvent.change(screen.getByLabelText("Zoom"), { target: { value: "3" } });

    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes("Range: Scene focus") ?? false).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes("Zoom: 3x") ?? false).length,
    ).toBeGreaterThan(0);
  });

  it("supports transport state and marker removal", () => {
    render(<MovieStudioPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes("Transport: Playing at 1.0x") ?? false)
        .length,
    ).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText("Rate"), { target: { value: "2.0x" } });
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes("Transport: Playing at 2.0x") ?? false)
        .length,
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "00:00:12:12" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Marker" }));
    expect(screen.queryByRole("button", { name: "00:00:12:12" })).not.toBeInTheDocument();
  });

  it("filters tracks and clips from toolbar filters", () => {
    render(<MovieStudioPanel />);

    fireEvent.change(screen.getByLabelText("Tracks"), { target: { value: "audio" } });
    expect(screen.queryByText("V1 Storyline")).not.toBeInTheDocument();
    expect(screen.getByText("A1 Dialogue")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Find Clip"), { target: { value: "Temp Score" } });
    expect(screen.getByText("Temp Score")).toBeInTheDocument();
    expect(screen.queryByText("Boom Mix")).not.toBeInTheDocument();
  });

  it("supports keyboard transport shortcuts", () => {
    render(<MovieStudioPanel />);

    fireEvent.keyDown(window, { key: " " });
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes("Transport: Playing at 1.0x") ?? false)
        .length,
    ).toBeGreaterThan(0);

    fireEvent.keyDown(window, { key: "k" });
    expect(
      screen.getAllByText((_, element) => element?.textContent?.includes("Transport: Paused at 1.0x") ?? false)
        .length,
    ).toBeGreaterThan(0);
  });

  it("supports undo and redo for timeline edits", () => {
    render(<MovieStudioPanel />);

    fireEvent.change(screen.getByLabelText("Playhead"), { target: { value: "00:00:19:10" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Marker" }));
    expect(screen.getByRole("button", { name: "00:00:19:10" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.queryByRole("button", { name: "00:00:19:10" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(screen.getByRole("button", { name: "00:00:19:10" })).toBeInTheDocument();
    expect(screen.getByText("Timeline History")).toBeInTheDocument();
  });

  it("supports keyboard undo and redo shortcuts", () => {
    render(<MovieStudioPanel />);

    fireEvent.change(screen.getByLabelText("Playhead"), { target: { value: "00:00:18:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Marker" }));
    expect(screen.getByRole("button", { name: "00:00:18:00" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(screen.queryByRole("button", { name: "00:00:18:00" })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(screen.getByRole("button", { name: "00:00:18:00" })).toBeInTheDocument();
  });

  it("undo restores range, zoom, and track filter context", () => {
    render(<MovieStudioPanel />);

    fireEvent.change(screen.getByLabelText("Range"), { target: { value: "scene" } });
    fireEvent.change(screen.getByLabelText("Zoom"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Tracks"), { target: { value: "audio" } });
    expect(screen.getByText("A1 Dialogue")).toBeInTheDocument();
    expect(screen.queryByText("V1 Storyline")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByText("V1 Storyline")).toBeInTheDocument();
    expect(screen.getByLabelText("Tracks")).toHaveValue("all");
    expect(screen.getByLabelText("Range")).toHaveValue("scene");
    expect(screen.getByLabelText("Zoom")).toHaveValue("3");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("Zoom")).toHaveValue("2");
  });

  it("restores timeline session state after remount", () => {
    const { unmount } = render(<MovieStudioPanel />);

    fireEvent.change(screen.getByLabelText("Playhead"), { target: { value: "00:00:22:00" } });
    fireEvent.change(screen.getByLabelText("Find Clip"), { target: { value: "Temp Score" } });
    fireEvent.change(screen.getByLabelText("Snap"), { target: { value: "marker" } });
    unmount();

    render(<MovieStudioPanel />);
    expect(screen.getByLabelText("Playhead")).toHaveValue("00:00:22:00");
    expect(screen.getByLabelText("Find Clip")).toHaveValue("Temp Score");
    expect(screen.getByLabelText("Snap")).toHaveValue("marker");
  });

  it("nudges playhead by frame and supports undo for snap mode changes", () => {
    render(<MovieStudioPanel />);

    fireEvent.change(screen.getByLabelText("Playhead"), { target: { value: "00:00:00:10" } });
    fireEvent.click(screen.getByRole("button", { name: "+1f" }));
    expect(screen.getByLabelText("Playhead")).toHaveValue("00:00:00:11");

    fireEvent.click(screen.getByRole("button", { name: "-1f" }));
    expect(screen.getByLabelText("Playhead")).toHaveValue("00:00:00:10");

    fireEvent.change(screen.getByLabelText("Snap"), { target: { value: "frame" } });
    expect(screen.getByLabelText("Snap")).toHaveValue("frame");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("Snap")).toHaveValue("off");
  });

  it("builds handoff packet summary from current timeline state", () => {
    render(<MovieStudioPanel />);

    fireEvent.change(screen.getByLabelText("Find Clip"), { target: { value: "Cam B Alt" } });
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.click(screen.getByRole("button", { name: "Step Next" }));

    const summary = screen.getByLabelText("Handoff summary") as HTMLTextAreaElement;
    expect(summary.value).toContain("Movie Studio Timeline Review Packet");
    expect(summary.value).toContain("Playback: Playing @ 1.0x");
    expect(summary.value).toContain("Clip filter: Cam B Alt");
    expect(summary.value).toContain("Recent actions:");
  });

  it("copies and downloads handoff packet with status feedback", async () => {
    Object.assign(URL, {
      createObjectURL: URL.createObjectURL ?? (() => "blob:packet"),
      revokeObjectURL: URL.revokeObjectURL ?? (() => undefined),
    });
    const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:packet");
    const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(HTMLElement.prototype, "remove");
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<MovieStudioPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Copy Packet" }));
    await screen.findByText("Copied to clipboard");
    fireEvent.click(screen.getByRole("button", { name: "Copy JSON" }));
    await screen.findByText("Copied JSON packet");

    fireEvent.click(screen.getByRole("button", { name: "Download .txt" }));
    expect(screen.getByText("Downloaded packet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download .json" }));
    expect(screen.getByText("Downloaded JSON packet")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Ready")).toBeInTheDocument(), { timeout: 4000 });
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });
});
