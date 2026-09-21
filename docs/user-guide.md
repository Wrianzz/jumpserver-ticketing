# End-to-End User Guide — JumpServer Ticketing Portal

## 1. Overview

JumpServer Ticketing Portal is a web portal that sits in front of JumpServer and uses the JumpServer API for authentication, JIT access requests, approval workflows, request history, command-filter management, and data-masking management.

JumpServer remains the source of truth for users, assets, accounts, tickets, ACLs, and ticket-flow configuration.

### Main capabilities

| Feature | Purpose | Primary role |
|---|---|---|
| Sign In / MFA | Authenticate with JumpServer credentials | All users |
| New JIT Request | Request temporary privileged access to assets | User / Approver / Admin |
| Request History | Track submitted requests and cancel pending requests | User / Approver / Admin |
| Approvals | Review asset-access and command-review requests and approve/reject them | Approver / Admin |
| Ticket Flows | Configure one- or two-level asset approval | Admin |
| Command Filters | View and manage command-filter ACLs | Admin |
| Data Masking | View and manage data-masking ACLs | Admin |

---

## 2. User Roles

The portal determines the role after successful JumpServer authentication.

### Admin

A user is treated as an admin when the JumpServer profile reports is_superuser=true or is_org_admin=true.

Admins can access:

- New JIT Request
- Request History
- Approvals
- Command Filters
- Data Masking
- Ticket Flows

### Approver

A user is treated as an approver when their JumpServer user ID is included in an applicable Ticket Flow approval rule. The portal recognizes both asset-approval (`apply_asset`) and command-review (`command_confirm`) flows.

Approvers can access:

- New JIT Request
- Request History
- Approvals

Approvers cannot access:

- Command Filters
- Data Masking
- Ticket Flows

Approval visibility and approve/reject authorization are checked server-side against the current pending process step.

### Normal User

A normal user can access:

- New JIT Request
- Request History

They cannot access administration or approval functions.

---

## 3. Before First Use

The following should be prepared in JumpServer before users start submitting requests:

1. User accounts exist in JumpServer.
2. Target assets are available and accessible to the relevant users.
3. Accounts are configured on the target assets.
4. The required JumpServer organization is available.
5. An apply_asset Ticket Flow exists for asset-access approvals.
6. A command_confirm Ticket Flow exists when command-review approvals are used.
7. Approvers/reviewers are assigned to the appropriate JumpServer configuration when approval is required.
8. The portal backend is configured with a valid JUMPSERVER_URL.
9. JUMPSERVER_ORG_ID is set to the organization used by the portal.
10. JUMPSERVER_SERVICE_TOKEN is configured when the portal needs to read Ticket Flow configuration for role resolution.

For an internal JumpServer installation using a self-signed or expired certificate, the backend can be configured with:

    JUMPSERVER_TLS_VERIFY=false

Keep TLS verification enabled whenever the JumpServer certificate can be validated normally.

---

## 4. Signing In

1. Open the Ticketing Portal.
2. Enter the JumpServer username.
3. Enter the JumpServer password.
4. Select Sign In.
5. If MFA is enabled and required, enter the 6-digit OTP from the authenticator application and select Verify & Sign In.
6. The portal authenticates against JumpServer.
7. The portal then resolves the user's portal role.
8. The available navigation is displayed according to that role.

The portal stores the authenticated session token and role in browser sessionStorage.

If the session becomes invalid, the portal clears the local session and returns the user to the sign-in page.

---

# 5. End-to-End JIT Access Request

This is the main user workflow.

## Step 1 — Open New JIT Request

From the navigation menu, select New JIT Request.

The page is used to submit a temporary privileged-access request.

## Step 2 — Enter the Ticket Name

Enter a meaningful request name.

Example:

    UAT database access for deployment

Use a name that makes the request easy to identify later in Request History and Approvals.

## Step 3 — Select Target Nodes or Assets

Select the infrastructure that requires access.

The request can contain:

- Nodes
- Assets
- or both

At least one node or asset must be selected.

Assets are retrieved from JumpServer through the API.

## Step 4 — Select Accounts

The portal supports these account modes.

### All accounts

Select All accounts when the request should apply to all available accounts.

The request is represented internally as:

    @ALL

### Specified accounts

Select Specified accounts and choose the required accounts.

The request uses:

    @SPEC

followed by the selected account names.

### Virtual account

The portal can optionally add a virtual-account marker:

| Portal option | Marker |
|---|---|
| Manual input | @INPUT |
| Same as user | @USER |
| Anonymous | @ANON |

Virtual accounts can be combined with the regular account selection.

## Step 5 — Select Actions

Choose the actions required for the request.

Available actions are:

- Connect
- Upload
- Download
- Copy
- Paste

Only request the actions that are required for the task.

## Step 6 — Set Access Duration

Set:

- Start date/time
- Expiry date/time

The portal limits the maximum JIT duration to 14 days from the start time.

The expiry cannot be earlier than the start time.

## Step 7 — Add a Description

Add a short explanation of why access is required.

Example:

    Required for UAT deployment verification and troubleshooting.

This helps the approver understand the purpose of the request.

## Step 8 — Submit

Select Submit.

The portal sends the request to the JumpServer ticket API.

After successful creation, the request enters the JumpServer ticket workflow and can appear in the approval queue depending on the configured Ticket Flow.

---

# 6. Approval Workflow

Approval is controlled by the JumpServer apply_asset Ticket Flow.

The portal supports one- and two-level approval flows.

## One-Level Approval

    User submits request
          |
          v
    Level 1 Approver
          |
          v
       Approved

## Two-Level Approval

    User submits request
          |
          v
    Level 1 Approver
          |
       Approved
          |
          v
    Level 2 Approver
          |
       Approved
          |
          v
       Completed

Level 2 is only reached after the previous approval step is completed.

---

# 7. Configuring Ticket Flows

Only admins can access Ticket Flows.

Open:

    Ticket Flows

The portal currently manages the Apply for asset flow.

## Approval Level

Choose:

- One level
- Two level

### One level

Only Level 1 is configured.

### Two level

Both Level 1 and Level 2 are configured.

## Selecting Approvers

For each level, the portal supports:

- All users
- Specific users
- Filter by attribute

For specific users, select the users who should act as approvers.

When the Ticket Flow is saved, the configuration is written back to JumpServer.

### Important

A user becomes an approver in the portal when their JumpServer user ID is present in an apply_asset Ticket Flow rule.

This means adding a user as a Ticket Flow approver also affects the navigation they receive in the portal.

---


# 8. Command Review Approval

Command Review Approval is used when a command-filter rule is configured with the **Review** action.

The flow is:

    User starts a session
          ↓
    User executes a command
          ↓
    Command Filter matches
          ↓
    Action = Review
          ↓
    Command Review ticket is created
          ↓
    Reviewer / approver opens Approvals
          ↓
    Approve / Reject
          ↓
    JumpServer processes the command-review result

## Configure Command Review

Only admins can configure command filters.

Open:

    ACLs → Command Filters

Create or edit a command-filter rule and configure:

- Users
- Assets
- Accounts
- Command Groups
- Action: Review
- Reviewers / Recipients
- Active / inactive
- Description

When the command matches the rule, JumpServer creates a command-review ticket.

## Review the Command

Open:

    Approvals

Command-review tickets appear in the same approval queue as asset-access requests.

Select Details to inspect:

- Organization
- Type
- Applicant
- Comment
- Run user
- Asset
- Account
- Command
- Session
- Command filter

The reviewer can then select:

- Approve
- Reject

The portal sends the decision to the corresponding JumpServer command-review ticket endpoint.

## Authorization

The backend verifies that the authenticated user is assigned to the current pending approval step before allowing the decision.

The portal therefore does not rely only on hiding or showing the Approve / Reject buttons in the frontend.
# 10. Approving a Request

Users who are assigned to the current pending approval step can access:

    Approvals

The portal loads pending approval tickets from JumpServer.

## Step 1 — Open the Approval

Select Details on a request.

The detail view shows:

### Ticket Basic Info

- Organization
- Type
- Applicant
- Comment

### Ticket Applied Info

For asset requests:

- Nodes
- Assets
- Accounts
- Actions
- Start time
- Expiry time

### Approval Process

The approval process displays each level and its current state.

For completed steps, the portal displays the processor name.

Example:

    Level 1    Approved by John Doe
    Level 2    pending

After Level 2 is approved:

    Level 1    Approved by John Doe
    Level 2    Approved by Jane Doe

## Step 2 — Approve or Reject

Select:

- Approve
- Reject

The portal asks for confirmation before sending the action.

The approval request is then sent through the portal backend to the corresponding JumpServer ticket endpoint.

The backend also verifies that the current user is assigned to the current pending approval step.

---

# 11. Approval Security Model

Approval authorization is enforced on the backend.

The portal does not rely only on hiding buttons in the frontend.

Before an approval action is sent to JumpServer, the backend:

1. Identifies the authenticated JumpServer user.
2. Retrieves the ticket.
3. Reads the ticket's current process map.
4. Finds the current pending approval step.
5. Checks whether the current user's ID is one of that step's assignees.
6. Rejects the action with HTTP 403 if the user is not authorized.
7. Sends the approval/rejection action to JumpServer when authorized.

---

# 12. Request History

Open:

    Request History

The page shows the user's ticket history retrieved from JumpServer.

Available filters:

- Pending approval
- Approved
- Rejected

The page also supports:

- Search by title
- Search by ticket number
- Search by applicant
- Pagination
- Refresh

## Cancelling a Pending Request

A pending request can be cancelled from Request History.

1. Find the pending request.
2. Select Cancel.
3. Confirm the action.

The portal sends the close action to JumpServer.

Only pending requests expose the Cancel action.

---

# 13. Command Filters

Only admins can access:

    ACLs → Command Filters

Command Filters provides a portal interface for managing JumpServer command-filter ACL configurations.

The page supports viewing and editing command-filter configurations.

Typical configuration areas include:

### Users

Target:

- All users
- Specific users
- Users selected through attributes

### Assets

Target:

- All assets
- Specific assets
- Assets selected through attributes

### Accounts

Target:

- All accounts
- Specified accounts
- Excluded accounts
- None

### Command Groups

Select the JumpServer command group to which the rule applies.

### Action

Command-filter rules can represent actions such as:

- Review
- Accept
- Reject

When Review is selected, reviewers can be configured.

The portal writes these changes directly to the JumpServer ACL API.

---

# 14. Data Masking

Only admins can access:

    ACLs → Data Masking

Data Masking provides a management interface for JumpServer data-masking rules.

## Create a Rule

Select Create.

Configure:

### Basic

- Name
- Priority

Priority must be an integer from 1 to 100.

### Users

Choose:

- All users
- Specific users
- Filter by attribute

### Assets

Choose:

- All assets
- Specific assets
- Filter by attribute

### Accounts

Choose:

- All accounts
- Specified accounts
- Exclude accounts
- None

### Rules

Configure:

- Fields pattern
- Masking method
- Mask pattern

Available masking methods in the portal:

- Fixed Character Replacement
- Hide Middle Characters
- Keep Prefix Only
- Keep Suffix Only

### Other

Configure:

- Active / inactive
- Description

Select Submit to create the rule.

## Edit a Rule

Select the rule name or Edit.

The portal retrieves the current rule from JumpServer, loads the configuration into the form, and sends the updated rule back to JumpServer.

## Delete a Rule

Open the rule actions menu and select Delete.

Confirm the deletion.

The rule is deleted through the JumpServer API.

---

# 15. Typical End-to-End Scenario

## Step 1 — Administrator prepares the workflow

The administrator opens Ticket Flows and configures:

    Approval level: Two level

    Level 1:
      Security Team

    Level 2:
      Infrastructure Team

The configuration is saved to JumpServer.

## Step 2 — User creates a request

The user opens New JIT Request and submits:

    Ticket: UAT deployment access
    Asset: ASUS-EDI_UAT_02
    Account: @ALL
    Actions: Connect, Upload, Download
    Duration: 1 day
    Description: UAT deployment verification

## Step 3 — Request enters approval

The ticket is created in JumpServer with a pending approval process.

The assigned Level 1 approver sees it under Approvals.

## Step 4 — Level 1 approves

The Level 1 approver opens the ticket and selects Approve.

The process becomes:

    Level 1    Approved by <approver>
    Level 2    Pending

## Step 5 — Level 2 approves

The Level 2 approver sees the request in their approval queue.

After approval:

    Level 1    Approved by <approver 1>
    Level 2    Approved by <approver 2>

The request proceeds according to the JumpServer ticket workflow.

## Step 6 — User checks Request History

The requester opens Request History and can see the ticket state and ticket number.

---

# 16. Common Problems

## Login fails

Check:

1. JumpServer username and password.
2. JumpServer availability.
3. Portal backend JUMPSERVER_URL.
4. Browser Network requests to the authentication endpoint.
5. If MFA is enabled, verify the OTP.

## MFA cannot be completed

Check:

- The OTP is exactly 6 digits.
- The authenticator session has not expired.
- JumpServer MFA configuration.

## User is not recognized as an approver

Check:

1. The user exists in JumpServer.
2. The user ID is included in the apply_asset Ticket Flow.
3. The Ticket Flow is the expected flow.
4. JUMPSERVER_SERVICE_TOKEN is configured on the backend.
5. Restart the backend after changing environment variables.

## Approval request returns 400

Check the browser Network tab and inspect:

- Request Payload
- Response

For an apply_asset approval, the portal sends the ticket type and the relevant ticket fields, including:

- type
- org_id
- apply_nodes
- apply_assets
- apply_accounts
- apply_actions
- apply_date_start
- apply_date_expired

## Approval request returns 403

The backend did not authorize the current user for the current pending process step.

Verify that the user is the assignee of the current approval level.

## JumpServer certificate is self-signed

For a trusted internal JumpServer endpoint, configure:

    JUMPSERVER_TLS_VERIFY=false

Then recreate/restart the backend container.

For normal production deployments, keep:

    JUMPSERVER_TLS_VERIFY=true

and use a certificate that can be validated by the backend.

---

# 17. Deployment Reference

The project can be deployed using Docker Compose.

The default compose setup contains:

- frontend
- backend

The frontend is served by Nginx.

The backend runs the Express API service on port 3001 inside the Docker network.

The current compose file maps the frontend as:

    38080:80

Therefore the portal is accessed through:

    http://<server-ip>:38080

The exact host port can be changed in docker-compose.yml.

## Required Backend Configuration

Example:

    JUMPSERVER_URL=https://<jumpserver-host>
    JUMPSERVER_ORG_ID=<organization-uuid>
    JUMPSERVER_SERVICE_TOKEN=<service-token>
    JUMPSERVER_TIMEZONE_OFFSET=+0700
    JUMPSERVER_TLS_VERIFY=true

Optional team-related environment variables:

    TEAM_GROUPS=
    TEAM_GROUPS_IGNORE=Default

Do not commit production service tokens or credentials to the repository.

---

# 18. Architecture

The portal uses a layered architecture:

    User Browser
         |
         v
    Nginx / Frontend
         |
         +--------------------+
         |                    |
         v                    v
    Portal Backend       JumpServer API
    Express              Authentication
         |                Tickets
         |                Ticket Flows
         |                ACLs
         |                Users / Assets
         +-------------------->

The browser uses the portal backend for portal-specific operations such as:

- Role resolution
- Approval authorization
- Ticket creation
- Approval processing
- Request history

JumpServer remains the authoritative backend for the actual infrastructure-management data.

---

# 19. Security Notes

- Use HTTPS for the portal in production.
- Keep JUMPSERVER_SERVICE_TOKEN server-side only.
- Never expose the service token through VITE_* variables.
- Keep TLS certificate verification enabled whenever possible.
- Use JUMPSERVER_TLS_VERIFY=false only for trusted internal self-signed/expired endpoints.
- Use JumpServer permissions to control the user's underlying access to assets and accounts.
- Approval authorization is checked server-side.
- Do not treat frontend navigation restrictions as the only security control.
- Avoid putting passwords, service tokens, or other secrets into screenshots, documentation, or source control.

---

# 20. Quick Reference

| Task | Navigation |
|---|---|
| Request temporary access | New JIT Request |
| Check own requests | Request History |
| Cancel pending request | Request History → Cancel |
| Approve/reject asset request | Approvals |\n| Review a command | Approvals → Command review |
| Configure approval levels | Ticket Flows |
| Configure command filtering | ACLs → Command Filters |
| Configure data masking | ACLs → Data Masking |
| Sign out | User menu → Log out |

## Request lifecycle

    Create request
         ↓
    JumpServer ticket created
         ↓
    Pending approval
         ↓
    Level 1 approval
         ↓
    Level 2 approval (if configured)
         ↓
    JumpServer processes final ticket state
         ↓
    User tracks the result in Request History

Command review lifecycle:

    User executes command
         ↓
    Command Filter matches
         ↓
    Review action
         ↓
    Command review ticket
         ↓
    Reviewer approves / rejects
         ↓
    JumpServer processes the command-review result
