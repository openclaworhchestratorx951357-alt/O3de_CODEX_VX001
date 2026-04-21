import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DesktopTabStrip from "./DesktopTabStrip";

describe("DesktopTabStrip", () => {
  it("renders tab tooltips and forwards tab selection", () => {
    const onSelectItem = vi.fn();

    render(
      <DesktopTabStrip
        activeItemId="overview"
        onSelectItem={onSelectItem}
        items={[
          {
            id: "overview",
            label: "Overview",
            detail: "Bridge health and system summary.",
            badge: "fresh",
            helpTooltip: "Start here for heartbeat freshness and runtime status.",
          },
          {
            id: "governance",
            label: "Governance",
            detail: "Policies and admitted capability posture.",
            helpTooltip: "Use this tab for admitted-capability truth claims.",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /overview/i }),
    ).toHaveAttribute("title", "Start here for heartbeat freshness and runtime status.");

    fireEvent.click(screen.getByRole("button", { name: /governance/i }));
    expect(onSelectItem).toHaveBeenCalledWith("governance");
  });
});
