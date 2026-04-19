import type { ReactNode } from "react";
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
};

export function SummaryFacts({ children }: SummaryFactsProps) {
  return <div style={summaryFactsGridStyle}>{children}</div>;
}

export function SummaryFact({ label, children }: SummaryFactProps) {
  return (
    <div style={summaryFactRowStyle}>
      <div style={summaryFactLabelStyle}>{label}</div>
      <div style={summaryFactValueStyle}>{children}</div>
    </div>
  );
}
