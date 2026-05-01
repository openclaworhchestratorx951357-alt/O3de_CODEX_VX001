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
  const navRailLabel = screen.queryByText("Control surface");
  if (!navRailLabel) {
    return screen.getByRole("button", { name }) as HTMLButtonElement;
  }
  const navRail = navRailLabel.closest("aside");
  if (!navRail) {
    return screen.getByRole("button", { name }) as HTMLButtonElement;
  }

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
