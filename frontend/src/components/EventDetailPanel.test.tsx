import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EventDetailPanel from "./EventDetailPanel";

describe("EventDetailPanel", () => {
  it("renders persisted App OS receipt details from event payloads", () => {
    render(
      <EventDetailPanel
        item={{
          event: {
            id: "evt-app-control-1",
            category: "app_control",
            event_type: "app_control_applied",
            severity: "info",
            message: "App control applied report recorded for app-control-test.",
            created_at: "2026-04-23T17:00:00.000Z",
            current_state: "verified",
            details: {
              capability_status: "reviewable_local",
            },
          },
          app_control: {
            script_id: "app-control-test",
            mode: "applied",
            summary: "Applied 2 planned operation(s). Verified results are marked explicitly below.",
            verified_count: 2,
            assumed_count: 0,
            items: [
              {
                id: "set-theme-dark",
                label: "Set the app theme mode to dark.",
                detail: "Verified by re-reading the local saved app settings after apply.",
                delta: "Theme mode: system -> dark",
                verification: "verified",
              },
            ],
          },
        }}
        loading={false}
        error={null}
      />,
    );

    expect(screen.getByText("Event Detail")).toBeInTheDocument();
    expect(screen.getByText("app_control_applied")).toBeInTheDocument();
    expect(screen.getByText("reviewable_local")).toBeInTheDocument();
    expect(screen.getByText("Applied 2 planned operation(s). Verified results are marked explicitly below.")).toBeInTheDocument();
    expect(screen.getByText("Theme mode: system -> dark")).toBeInTheDocument();
    expect(screen.getAllByText("verified").length).toBeGreaterThan(0);
  });
});
