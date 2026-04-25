import type { CSSProperties } from "react";

export type StatusChipTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

type StatusChipProps = {
  label: string;
  tone?: StatusChipTone;
};

const toneStyles: Record<StatusChipTone, CSSProperties> = {
  neutral: {
    background: "var(--app-panel-bg-muted)",
    borderColor: "var(--app-panel-border)",
    color: "var(--app-text-color)",
  },
  info: {
    background: "var(--app-accent-soft)",
    borderColor: "var(--app-accent-strong)",
    color: "var(--app-text-color)",
  },
  success: {
    background: "var(--app-success-bg)",
    borderColor: "var(--app-success-border)",
    color: "var(--app-success-text)",
  },
  warning: {
    background: "var(--app-warning-bg)",
    borderColor: "var(--app-warning-border)",
    color: "var(--app-warning-text)",
  },
  danger: {
    background: "var(--app-danger-bg)",
    borderColor: "var(--app-danger-border)",
    color: "var(--app-danger-text)",
  },
};

export default function StatusChip({
  label,
  tone = "neutral",
}: StatusChipProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid",
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 12,
        lineHeight: 1.5,
        ...toneStyles[tone],
      }}
    >
      {label}
    </span>
  );
}
