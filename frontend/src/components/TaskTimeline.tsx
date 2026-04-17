type TimelineItem = {
  id: string;
  title: string;
  detail: string;
  state: "planned" | "active" | "done";
};

type TaskTimelineProps = {
  items: TimelineItem[];
};

export default function TaskTimeline({ items }: TaskTimelineProps) {
  return (
    <section
      style={{
        border: "1px solid #d0d7de",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Task Timeline</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id} style={{ marginBottom: 12 }}>
            <strong>{item.title}</strong>
            <div>{item.detail}</div>
            <div>State: {item.state}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
