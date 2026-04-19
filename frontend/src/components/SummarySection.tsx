import type { ReactNode } from "react";
import { summarySectionStyle } from "./summaryPrimitives";
type SummarySectionProps = {
  title: string;
  description: string;
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  hasItems: boolean;
  children: ReactNode;
  marginTop?: number;
};

export default function SummarySection({
  title,
  description,
  loading,
  error,
  emptyMessage,
  hasItems,
  children,
  marginTop = 24,
}: SummarySectionProps) {
  return (
    <section
      style={{
        ...summarySectionStyle,
        marginTop,
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ marginTop: 0, color: "#57606a" }}>{description}</p>
      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
      {loading ? (
        <p>Loading {title.toLowerCase()}...</p>
      ) : !hasItems ? (
        <p>{emptyMessage}</p>
      ) : (
        children
      )}
    </section>
  );
}
