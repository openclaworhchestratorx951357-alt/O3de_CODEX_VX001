import type { CSSProperties } from "react";

export type CockpitPromptTemplatePanelEntry = {
  id: string;
  label: string;
  truthLabel: string;
  promptText: string;
  actionLabel: string;
  onAction?: () => void;
  note?: string;
};

type CockpitPromptTemplatePanelProps = {
  title: string;
  detail: string;
  templates: CockpitPromptTemplatePanelEntry[];
  emptyMessage?: string;
  dataTestId?: string;
};

export default function CockpitPromptTemplatePanel({
  title,
  detail,
  templates,
  emptyMessage = "No prompt templates available.",
  dataTestId,
}: CockpitPromptTemplatePanelProps) {
  return (
    <section
      aria-label={title}
      data-testid={dataTestId}
      style={styles.section}
    >
      <strong>{title}</strong>
      <p style={styles.detail}>{detail}</p>
      {templates.length === 0 ? (
        <p style={styles.detail}>{emptyMessage}</p>
      ) : (
        <div style={styles.grid}>
          {templates.map((template) => (
            <article key={template.id} style={styles.card}>
              <div style={styles.header}>
                <strong>{template.label}</strong>
                <span style={styles.truth}>{template.truthLabel}</span>
              </div>
              <pre style={styles.template}>{template.promptText}</pre>
              {template.note ? (
                <p style={styles.detail}>{template.note}</p>
              ) : null}
              <button
                type="button"
                onClick={template.onAction}
                disabled={!template.onAction}
                style={styles.button}
              >
                {template.actionLabel}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

const styles = {
  section: {
    border: "1px solid rgba(173, 204, 238, 0.55)",
    borderRadius: 8,
    background: "rgba(24, 40, 62, 0.45)",
    padding: "8px 10px",
    display: "grid",
    gap: 8,
    minWidth: 0,
  },
  detail: {
    margin: 0,
    fontSize: 12,
    color: "var(--app-subtle-color)",
    overflowWrap: "anywhere",
  },
  grid: {
    display: "grid",
    gap: 8,
    minWidth: 0,
  },
  card: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 8,
    background: "var(--app-panel-bg-muted)",
    padding: 8,
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  truth: {
    border: "1px solid var(--app-panel-border)",
    borderRadius: 999,
    padding: "2px 8px",
    fontSize: 11,
    textTransform: "uppercase",
  },
  template: {
    margin: 0,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontSize: 12,
  },
  button: {
    border: "1px solid #5faeff",
    borderRadius: 8,
    padding: "6px 10px",
    background: "rgba(19, 33, 49, 0.85)",
    color: "var(--app-text-color)",
    cursor: "pointer",
    fontWeight: 700,
  },
} satisfies Record<string, CSSProperties>;
