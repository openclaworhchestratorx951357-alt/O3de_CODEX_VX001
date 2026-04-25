import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..");
const catalogPath = path.join(repoRoot, "frontend", "src", "content", "operatorGuideCatalog.json");
const outputPath = path.join(repoRoot, "docs", "APP-OPERATOR-GUIDE.md");
const checkMode = process.argv.includes("--check");

function formatList(items) {
  return items.map((item) => `- ${item}`).join("\n");
}

function renderWorkspaceSection(workspace) {
  const launchpadSection = workspace.launchpad
    ? [
      "### Launchpad shortcut",
      "",
      `- **${workspace.launchpad.label}**: ${workspace.launchpad.description}`,
      `- ${workspace.launchpad.tooltip}`,
      "",
    ].join("\n")
    : "";

  const surfacesSection = workspace.surfaces && workspace.surfaces.length > 0
    ? [
      "### Surfaces and tabs",
      "",
      ...workspace.surfaces.flatMap((surface) => [
        `#### ${surface.label}`,
        "",
        `- ${surface.detail}`,
        `- Quick tip: ${surface.tooltip}`,
        ...surface.instructions.map((instruction) => `- ${instruction}`),
        "",
      ]),
    ].join("\n")
    : "";

  return [
    `## ${workspace.workspaceTitle}`,
    "",
    workspace.guideSummary,
    "",
    "### Operator checklist",
    "",
    formatList(workspace.operatorChecklist),
    "",
    launchpadSection,
    "### Windows",
    "",
    ...workspace.windows.flatMap((window) => [
      `#### ${window.title}`,
      "",
      `- ${window.subtitle}`,
      `- Quick tip: ${window.tooltip}`,
      ...window.instructions.map((instruction) => `- ${instruction}`),
      "",
    ]),
    surfacesSection,
  ].filter(Boolean).join("\n");
}

function renderPanelSection(panel) {
  return [
    `### ${panel.title}`,
    "",
    `- Location: ${panel.locationLabel}`,
    `- Quick tip: ${panel.tooltip}`,
    ...panel.checklist.map((item) => `- ${item}`),
    "",
    "#### Control tips",
    "",
    ...panel.controls.map((control) => `- **${control.label}**: ${control.tooltip}`),
    "",
  ].join("\n");
}

function renderProofCheckSection(check) {
  return [
    `### ${check.title}`,
    "",
    check.summary,
    "",
    "#### Endpoints",
    "",
    ...check.endpoints.map((endpoint) => `- ${endpoint}`),
    "",
    "#### Commands",
    "",
    ...check.commands.flatMap((command) => [
      "```powershell",
      command,
      "```",
      "",
    ]),
    "#### Evidence to confirm",
    "",
    ...check.evidence.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

function renderGuide(catalog) {
  return [
    "# App Operator Guide",
    "",
    "<!-- Generated from frontend/src/content/operatorGuideCatalog.json. Do not edit manually. -->",
    "",
    "## Overview",
    "",
    catalog.app.summary,
    "",
    `- App title: ${catalog.app.title}`,
    `- App subtitle: ${catalog.app.subtitle}`,
    `- Canonical backend: ${catalog.app.canonicalBackend}`,
    `- Admitted real: ${catalog.app.admittedRealTools.join(", ")}`,
    `- Still bounded: ${catalog.app.simulatedOnlyFocusTools.join(", ")}`,
    "",
    "## How to move through the app",
    "",
    catalog.app.operatorFlow.map((step, index) => `${index + 1}. ${step}`).join("\n"),
    "",
    "## Tooltip coverage",
    "",
    catalog.app.tooltipGuidance,
    "",
    ...catalog.quickStats.flatMap((quickStat) => [
      `- **${quickStat.label}**: ${quickStat.tooltip}`,
    ]),
    "",
    "## Admitted-real proof checklist",
    "",
    ...catalog.proofChecklist.map(renderProofCheckSection),
    "",
    "## Capability posture",
    "",
    formatList(catalog.app.truthNotes),
    "",
    "## Key panels",
    "",
    ...catalog.panels.map(renderPanelSection),
    "",
    ...catalog.workspaces.map(renderWorkspaceSection),
    "",
    "## Maintenance workflow",
    "",
    formatList(catalog.app.maintenance),
    "",
  ].join("\n");
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const rendered = `${renderGuide(catalog).trim()}\n`;

  let existing = "";

  try {
    existing = await readFile(outputPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code !== "ENOENT") {
      throw error;
    }
  }

  if (checkMode) {
    if (existing !== rendered) {
      console.error("Operator guide is out of sync. Run `npm run guide:sync` from the frontend workspace.");
      process.exitCode = 1;
    } else {
      console.log("Operator guide is in sync.");
    }

    return;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });

  if (existing !== rendered) {
    await writeFile(outputPath, rendered, "utf8");
    console.log(`Synced ${path.relative(repoRoot, outputPath)}`);
    return;
  }

  console.log(`No changes for ${path.relative(repoRoot, outputPath)}`);
}

await main();
