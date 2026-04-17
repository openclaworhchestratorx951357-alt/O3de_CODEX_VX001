type AgentPanelProps = {
  name: string;
  role: string;
  lockLabel: string;
  tools: string[];
};

export default function AgentPanel({
  name,
  role,
  lockLabel,
  tools,
}: AgentPanelProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
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
