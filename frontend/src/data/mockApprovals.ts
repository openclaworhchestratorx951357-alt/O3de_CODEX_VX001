export const mockApprovals = [
  {
    id: "approval-001",
    title: "Delete temporary test entities from preview level",
    approvalClass: "destructive_content_write",
    status: "pending",
  },
  {
    id: "approval-002",
    title: "Apply settings patch for scene import extensions",
    approvalClass: "config_write",
    status: "pending",
  },
  {
    id: "approval-003",
    title: "Run build export in protected environment",
    approvalClass: "build_execute",
    status: "approved",
  },
] as const;
