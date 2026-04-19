import { useEffect, useState } from "react";
import { summaryInlineActionButtonStyle } from "./summaryPrimitives";

type CopyTextButtonProps = {
  value: string;
};

export default function CopyTextButton({ value }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

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
      aria-label={`Copy ${value}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
