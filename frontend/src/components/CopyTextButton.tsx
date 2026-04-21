import { useEffect, useState } from "react";
import { summaryInlineActionButtonStyle } from "./summaryPrimitives";

type CopyTextButtonProps = {
  value: string;
  label?: string | null;
  title?: string | null;
};

function buildCopyTitle(label: string | null, title: string | null): string {
  if (title && title.trim().length > 0) {
    return title;
  }

  if (label) {
    return `Copy ${label} to the browser-local clipboard so you can reuse the exact persisted value in notes, handoff, or follow-up without retyping it.`;
  }

  return "Copy this exact value to the browser-local clipboard so you can reuse it in notes, handoff, or follow-up without retyping it.";
}

export default function CopyTextButton({
  value,
  label = null,
  title = null,
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);
  const normalizedLabel = label && label.trim().length > 0 ? label : null;

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopied(false);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      style={summaryInlineActionButtonStyle}
      onClick={() => void handleCopy()}
      aria-label={`Copy ${normalizedLabel ?? value}`}
      title={buildCopyTitle(normalizedLabel, title)}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
