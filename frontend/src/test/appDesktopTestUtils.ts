import { screen, within } from "@testing-library/react";
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
  const navRail = screen.getByText("Control surface").closest("aside");

  expect(navRail).not.toBeNull();

  return within(navRail as HTMLElement).getByRole("button", { name }) as HTMLButtonElement;
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
  expect(button).toHaveStyle({
    borderColor: "var(--app-accent-strong)",
    boxShadow: "var(--app-shadow-strong)",
  });
}
