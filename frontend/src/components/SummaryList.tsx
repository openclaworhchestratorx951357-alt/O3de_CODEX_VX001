import type { ReactNode } from "react";
import {
  summaryCardStyle,
  summaryItemStyle,
  summaryListStyle,
} from "./summaryPrimitives";

type SummaryListProps = {
  children: ReactNode;
};

type SummaryListItemProps = {
  children: ReactNode;
  card?: boolean;
};

export function SummaryList({ children }: SummaryListProps) {
  return <ul style={summaryListStyle}>{children}</ul>;
}

export function SummaryListItem({
  children,
  card = false,
}: SummaryListItemProps) {
  return (
    <li style={summaryItemStyle}>
      {card ? <div style={summaryCardStyle}>{children}</div> : children}
    </li>
  );
}
