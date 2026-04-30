import CockpitLauncherDeck from "./cockpits/CockpitLauncherDeck";
import type { CockpitId } from "./cockpits/registry/cockpitRegistryTypes";

type HomeCockpitLaunchPanelProps = {
  onOpenCreateGame?: () => void;
  onOpenCreateMovie?: () => void;
  onOpenLoadProject?: () => void;
  onOpenAssetForge?: () => void;
  onOpenPromptStudio?: () => void;
  onOpenRuntimeOverview?: () => void;
  onOpenRecords?: () => void;
  onOpenBuilder?: () => void;
  onOpenOperations?: () => void;
};

export default function HomeCockpitLaunchPanel({
  onOpenCreateGame,
  onOpenCreateMovie,
  onOpenLoadProject,
  onOpenAssetForge,
  onOpenPromptStudio,
  onOpenRuntimeOverview,
  onOpenRecords,
  onOpenBuilder,
  onOpenOperations,
}: HomeCockpitLaunchPanelProps) {
  const launchById: Record<string, (() => void) | undefined> = {
    "create-game": onOpenCreateGame,
    "create-movie": onOpenCreateMovie,
    "load-project": onOpenLoadProject,
    "asset-forge": onOpenAssetForge,
    prompt: onOpenPromptStudio,
    builder: onOpenBuilder,
    operations: onOpenOperations,
    runtime: onOpenRuntimeOverview,
    records: onOpenRecords,
  };

  function handleLaunchCockpit(cockpitId: CockpitId): void {
    const launch = launchById[cockpitId];
    if (!launch) {
      return;
    }
    launch();
  }

  return (
    <section aria-label="Cockpit launch shortcuts" data-testid="home-cockpit-launch-panel">
      <CockpitLauncherDeck onLaunchCockpit={handleLaunchCockpit} />
    </section>
  );
}
