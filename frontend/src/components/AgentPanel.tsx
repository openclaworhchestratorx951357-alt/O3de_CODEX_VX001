type AgentPanelProps = {
  name: string;
  role: string;
  lockLabel: string;
  tools: readonly string[];
  tooltip?: string;
};

export default function AgentPanel({
  name,
  role,
  lockLabel,
  tools,
  tooltip,
}: AgentPanelProps) {
  return (
    <section
      title={tooltip}
      style={{
        border: "1px solid var(--app-panel-border)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        background: "var(--app-panel-bg)",
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>{name}</h3>
        <p style={{ margin: "8px 0 0 0" }}>{role}</p>
      </header>

      <div style={{ marginBottom: 12 }}>
        <strong>Lock:</strong> {lockLabel}
      </div>

      <div>
        <strong>Owned tools</strong>
        <ul>
          {tools.map((tool) => (
            <li key={tool}>{tool}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
