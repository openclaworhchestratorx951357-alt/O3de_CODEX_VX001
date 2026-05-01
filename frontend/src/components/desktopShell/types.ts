import type { ReactNode } from "react";

export type DesktopShellTone = "neutral" | "info" | "success" | "warning";

export type DesktopShellNavItem = {
  id: string;
  label: string;
  subtitle: string;
  badge?: string | null;
  tone?: DesktopShellTone;
  helpTooltip?: string | null;
  keywords?: readonly string[];
};

export type DesktopShellNavSection = {
  id: string;
  label: string;
  detail: string;
  keywords?: readonly string[];
  items: readonly DesktopShellNavItem[];
};

export type DesktopShellQuickStat = {
  label: string;
  value: string;
  tone?: DesktopShellTone;
  helpTooltip?: string | null;
};

export type DesktopShellAgentCallItem = {
  id: string;
  label: string;
  detail: string;
  status?: string | null;
};

export type DesktopShellProps = {
  appTitle: string;
  appSubtitle: string;
  startBadgeLabel?: string;
  workspaceTitle: string;
  workspaceSubtitle: string;
  activeWorkspaceId: string;
  activeNavItemId?: string;
  navSections: readonly DesktopShellNavSection[];
  quickStats?: readonly DesktopShellQuickStat[];
  utilityLabel?: string | null;
  utilityDetail?: string | null;
  utilityActions?: ReactNode;
  agentCallItems?: readonly DesktopShellAgentCallItem[];
  onSelectWorkspace: (workspaceId: string) => void;
  children: ReactNode;
};
