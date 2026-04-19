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
};

export function SummaryFacts({ children }: SummaryFactsProps) {
  return <div style={summaryFactsGridStyle}>{children}</div>;
}

export function SummaryFact({ label, children, copyValue }: SummaryFactProps) {
  return (
    <div style={summaryFactRowStyle}>
      <div style={summaryFactLabelStyle}>{label}</div>
      <div style={summaryFactValueStyle}>
        {children}
        {copyValue ? <CopyTextButton value={copyValue} /> : null}
      </div>
    </div>
  );
}
