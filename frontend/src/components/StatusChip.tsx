import type { CSSProperties } from "react";

type StatusChipTone =
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
    background: "#f6f8fa",
    borderColor: "#d0d7de",
    color: "#24292f",
  },
  info: {
    background: "#ddf4ff",
    borderColor: "#54aeff",
    color: "#0a3069",
  },
  success: {
    background: "#dafbe1",
    borderColor: "#4ac26b",
    color: "#116329",
  },
  warning: {
    background: "#fff8c5",
    borderColor: "#d4a72c",
    color: "#7d4e00",
  },
  danger: {
    background: "#ffebe9",
    borderColor: "#ff8182",
    color: "#cf222e",
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
