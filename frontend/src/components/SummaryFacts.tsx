import type { ReactNode } from "react";
import CopyTextButton from "./CopyTextButton";
import {
  summaryFactLabelStyle,
  summaryFactRowStyle,
  summaryFactValueStyle,
  summaryFactsGridStyle,
} from "./summaryPrimitives";

type SummaryFactsProps = {
  children: ReactNode;
};

type SummaryFactProps = {
  label: string;
  children: ReactNode;
  copyValue?: string;
  copyLabel?: string | null;
  copyTitle?: string | null;
};

export function SummaryFacts({ children }: SummaryFactsProps) {
  return <div style={summaryFactsGridStyle}>{children}</div>;
}

export function SummaryFact({
  label,
  children,
  copyValue,
  copyLabel = null,
  copyTitle = null,
}: SummaryFactProps) {
  return (
    <div style={summaryFactRowStyle}>
      <div style={summaryFactLabelStyle}>{label}</div>
      <div style={summaryFactValueStyle}>
        {children}
        {copyValue ? (
          <CopyTextButton
            value={copyValue}
            label={copyLabel ?? label}
            title={copyTitle}
          />
        ) : null}
      </div>
    </div>
  );
}
