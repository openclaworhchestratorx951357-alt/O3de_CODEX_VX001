export const mockTimeline = [
  {
    id: "timeline-001",
    title: "Project / Build Agent inspected project state",
    detail: "Read project and engine context to prepare the control session.",
    state: "done",
  },
  {
    id: "timeline-002",
    title: "Editor Control Agent session prepared",
    detail: "Waiting for structured level and entity operations.",
    state: "active",
  },
  {
    id: "timeline-003",
    title: "Validation Agent queued targeted checks",
    detail: "Ready to run test and artifact collection after real mutations occur.",
    state: "planned",
  },
] as const;
