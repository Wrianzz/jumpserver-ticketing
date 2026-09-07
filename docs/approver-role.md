# Approver role

A portal user is treated as an `approver` when their JumpServer user ID is listed in an `apply_asset` Ticket Flow approval rule with `users.type = ids`.

- Admins retain full access.
- Approvers can access New JIT Request, Request History, and Approvals.
- Approvers cannot access Command Filters or Ticket Flows.
- Approval visibility and approve/reject authorization are enforced server-side using the current pending process step assignees.
- Non-admin role resolution reads Ticket Flow configuration with `JUMPSERVER_SERVICE_TOKEN` when the user's token cannot read flows.
