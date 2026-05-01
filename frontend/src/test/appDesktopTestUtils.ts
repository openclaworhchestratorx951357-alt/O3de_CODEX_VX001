import { fireEvent, screen, within } from "@testing-library/react";
import { expect, type Mock } from "vitest";

export function createPendingPromise<T>() {
  return new Promise<T>(() => {});
}

export function setPendingAppApiMocks(apiMocks: Record<string, Mock>) {
  Object.values(apiMocks).forEach((apiMock) => {
    apiMock.mockImplementation(() => createPendingPromise());
  });
}

export function getDesktopNavButton(name: RegExp): HTMLButtonElement {
  const navRailTitle = screen.queryByText("Control surface");
  if (navRailTitle) {
    const navRail = navRailTitle.closest("aside");
    expect(navRail).not.toBeNull();

    const navScope = within(navRail as HTMLElement);
    const visibleButton = navScope.queryByRole("button", { name }) as HTMLButtonElement | null;
    if (visibleButton) {
      return visibleButton;
    }

    for (const button of navScope.getAllByRole("button").filter((candidate) => (
      candidate.hasAttribute("aria-expanded")
    ))) {
      if (button.getAttribute("aria-expanded") === "false") {
        fireEvent.click(button);
      }

      const expandedButton = navScope.queryByRole("button", { name }) as HTMLButtonElement | null;
      if (expandedButton) {
        return expandedButton;
      }
    }

    return navScope.getByRole("button", { name }) as HTMLButtonElement;
  }

  const workspaceSections = screen.queryByLabelText(/workspace sections/i);
  if (workspaceSections) {
    const sectionScope = within(workspaceSections as HTMLElement);
    const sectionButton = sectionScope.queryByRole("button", { name }) as HTMLButtonElement | null;
    if (sectionButton) {
      return sectionButton;
    }
  }

  const quickAccessInput = screen.queryByRole("combobox", { name: "Quick access app explorer" });
  if (quickAccessInput) {
    const matcherSource = name.source.replace(/[^a-z0-9]+/gi, " ").trim();
    const query = matcherSource.split(/\s+/)[0] ?? "home";
    fireEvent.focus(quickAccessInput);
    fireEvent.change(quickAccessInput, { target: { value: query } });
    const resultsList = screen.getByRole("listbox", { name: "Quick access results" });
    const option = within(resultsList).getByRole("option", { name });
    fireEvent.click(option);
    return option as HTMLButtonElement;
  }

  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

export function getLaunchpadButton(detail: string): HTMLButtonElement {
  const button = screen.getAllByRole("button").find((candidate) => (
    candidate.textContent?.includes(detail)
  ));

  expect(button).not.toBeUndefined();

  return button as HTMLButtonElement;
}

export function getDesktopTabButton(label: string, detail: string): HTMLButtonElement {
  const button = screen.getAllByRole("button").find((candidate) => (
    candidate.textContent?.includes(label)
    && candidate.textContent?.includes(detail)
  ));

  expect(button).not.toBeUndefined();

  return button as HTMLButtonElement;
}

export function expectDesktopTabActive(button: HTMLButtonElement): void {
  expect(button).toHaveAttribute("aria-pressed", "true");
}
