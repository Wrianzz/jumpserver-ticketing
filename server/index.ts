import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JUMPSERVER_URL = (process.env.JUMPSERVER_URL || '').replace(/\/$/, '');
const JUMPSERVER_ORG_ID = process.env.JUMPSERVER_ORG_ID || '00000000-0000-0000-0000-000000000002';
const JUMPSERVER_TIMEZONE_OFFSET = process.env.JUMPSERVER_TIMEZONE_OFFSET || '+0700';
const JUMPSERVER_SERVICE_TOKEN = process.env.JUMPSERVER_SERVICE_TOKEN || '';

const APPLY_ASSET_TICKETS_ENDPOINT = '/api/v1/tickets/apply-asset-tickets/';
const COMMAND_REVIEW_TICKETS_ENDPOINT = '/api/v1/tickets/apply-command-tickets/';

type TicketRequestBody = {
  title?: string;
  org_id?: string;
  apply_nodes?: string[];
  apply_assets?: string[];
  apply_accounts?: string[];
  apply_actions?: string[];
  apply_date_start?: string;
  apply_date_expired?: string;
  comment?: string;
};

type UserSummary = {
  id: string;
  username?: string;
  name?: string;
  is_superuser?: boolean;
  is_org_admin?: boolean;
};

type ApprovalTicketType = 'apply_asset' | 'command_confirm';

const ALLOWED_ACTIONS = new Set(['connect', 'upload', 'download', 'copy', 'paste']);

function getBearerToken(req: Request): string | null {
  const authorization = req.header('authorization');
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!getBearerToken(req)) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid Authorization Bearer token',
    });
  }
  next();
}

function getJumpServerHeaders(req: Request) {
  return {
    Authorization: `Bearer ${getBearerToken(req)!}`,
    'X-JMS-ORG': JUMPSERVER_ORG_ID,
  };
}

function getJumpServerServiceHeaders() {
  return {
    Authorization: `Token ${JUMPSERVER_SERVICE_TOKEN}`,
    'X-JMS-ORG': JUMPSERVER_ORG_ID,
  };
}

function formatJumpServerDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date value');
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${JUMPSERVER_TIMEZONE_OFFSET}`;
}

function extractResults(data: any): any[] {
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.results)
          ? data.data.results
          : [];
}

function getTicketState(ticket: any): string | undefined {
  return typeof ticket?.state === 'string' ? ticket.state : ticket?.state?.value;
}

function getTicketType(ticket: any): string | undefined {
  return typeof ticket?.type === 'string' ? ticket.type : ticket?.type?.value;
}

function getTicketEndpoint(type: ApprovalTicketType): string {
  return type === 'command_confirm'
    ? COMMAND_REVIEW_TICKETS_ENDPOINT
    : APPLY_ASSET_TICKETS_ENDPOINT;
}

function getApprovalTicketType(value: unknown): ApprovalTicketType | null {
  if (value === 'apply_asset' || value === 'command_confirm') return value;
  return null;
}

app.use(express.json({ limit: '1mb' }));

app.get('/portal-api/health', (_req, res) =>
  res.json({ success: true, service: 'jumpserver-ticketing-backend' }),
);

app.get('/portal-api/logout', async (req: Request, res: Response) => {
  try {
    if (!JUMPSERVER_URL) {
      return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' });
    }
    const cookie = req.header('cookie');
    if (!cookie) return res.status(204).end();

    const response = await axios.get(`${JUMPSERVER_URL}/core/auth/logout/?next=/console/dashboard`, {
      headers: { Cookie: cookie },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400,
      timeout: 15000,
    });
    const setCookie = response.headers['set-cookie'];
    if (setCookie) res.setHeader('Set-Cookie', setCookie);
    return res.status(200).json({ success: true });
  } catch (error) {
    const axiosError = error as AxiosError;
    const setCookie = axiosError.response?.headers?.['set-cookie'];
    if (setCookie) res.setHeader('Set-Cookie', setCookie);
    if (axiosError.response) return res.status(200).json({ success: true });
    console.error('JumpServer logout error:', error);
    return res.status(502).json({ success: false, message: 'Failed to log out from JumpServer' });
  }
});

app.post('/portal-api/tickets', requireAuth, async (req: Request<{}, {}, TicketRequestBody>, res: Response) => {
  try {
    if (!JUMPSERVER_URL) {
      return res.status(500).json({
        success: false,
        message: 'JUMPSERVER_URL is not configured on the backend. Check .env and restart npm run server.',
      });
    }

    const {
      title,
      org_id,
      apply_nodes = [],
      apply_assets = [],
      apply_accounts = ['@ALL'],
      apply_actions = ['connect'],
      apply_date_start,
      apply_date_expired,
      comment = '',
    } = req.body;

    if (!title?.trim()) return res.status(400).json({ success: false, message: 'Ticket title is required' });
    if (apply_nodes.length === 0 && apply_assets.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one node or asset' });
    }
    if (!apply_date_start || !apply_date_expired) {
      return res.status(400).json({ success: false, message: 'Start and expiry dates are required' });
    }

    const startDate = new Date(apply_date_start);
    const expiredDate = new Date(apply_date_expired);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(expiredDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid start or expiry date' });
    }
    if (expiredDate <= startDate) {
      return res.status(400).json({ success: false, message: 'Expiry date must be later than start date' });
    }

    const invalidActions = apply_actions.filter((action) => !ALLOWED_ACTIONS.has(action));
    if (invalidActions.length > 0) {
      return res.status(400).json({ success: false, message: `Unsupported actions: ${invalidActions.join(', ')}` });
    }
    if (apply_accounts.includes('@ALL') && apply_accounts.length > 1) {
      return res.status(400).json({ success: false, message: '@ALL cannot be combined with other accounts' });
    }
    if (apply_accounts.includes('@SPEC') && apply_accounts.length < 2) {
      return res.status(400).json({ success: false, message: '@SPEC must be followed by at least one specified account' });
    }

    const jumpServerPayload = {
      title: title.trim(),
      org_id: org_id || JUMPSERVER_ORG_ID,
      apply_nodes,
      apply_assets,
      apply_accounts,
      apply_actions,
      apply_date_start,
      apply_date_expired,
      comment: comment.trim(),
    };

    const response = await axios.post(
      `${JUMPSERVER_URL}${APPLY_ASSET_TICKETS_ENDPOINT}open/`,
      jumpServerPayload,
      {
        headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' },
        timeout: 15000,
      },
    );
    const tickets = Array.isArray(response.data) ? response.data : [response.data];
    return res.status(201).json({ success: true, ticket: tickets[0] || null });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        success: false,
        message: 'JumpServer rejected the ticket request',
        details: axiosError.response.data,
        upstreamStatus: axiosError.response.status,
      });
    }
    console.error('Create ticket error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create JIT ticket' });
  }
});

async function getAuthenticatedUser(req: Request): Promise<UserSummary> {
  const response = await axios.get(`${JUMPSERVER_URL}/api/v1/users/profile/`, {
    headers: getJumpServerHeaders(req),
    timeout: 15000,
  });
  const profile = response.data?.data || response.data;
  if (!profile?.id) throw new Error('JumpServer profile response does not contain a user id');
  return {
    id: String(profile.id),
    username: profile.username,
    name: profile.name,
    is_superuser: profile.is_superuser,
    is_org_admin: profile.is_org_admin,
  };
}

async function fetchTicketFlows(): Promise<any[]> {
  if (!JUMPSERVER_SERVICE_TOKEN) {
    throw new Error('JUMPSERVER_SERVICE_TOKEN is required to read Ticket Flow configuration');
  }

  const response = await axios.get(`${JUMPSERVER_URL}/api/v1/tickets/flows/`, {
    headers: getJumpServerServiceHeaders(),
    params: { limit: 200 },
    timeout: 15000,
  });
  return extractResults(response.data);
}

async function resolvePortalRole(req: Request, authenticatedUser?: UserSummary): Promise<'admin' | 'approver' | 'user'> {
  const user = authenticatedUser || await getAuthenticatedUser(req);
  if (user.is_superuser === true || user.is_org_admin === true) return 'admin';

  const flows = await fetchTicketFlows();
  const userId = String(user.id);
  const isApprover = flows
    .filter((flow: any) => {
      const type = typeof flow?.type === 'string' ? flow.type : flow?.type?.value;
      return type === 'apply_asset' || type === 'command_confirm';
    })
    .some((flow: any) => {
      const rules = Array.isArray(flow?.rules) ? flow.rules : [];
      return rules.some((rule: any) => {
        const users = rule?.users;
        return users?.type === 'ids'
          && Array.isArray(users?.ids)
          && users.ids.map((id: any) => String(id)).includes(userId);
      });
    });

  return isApprover ? 'approver' : 'user';
}

app.get('/portal-api/access', requireAuth, async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const role = await resolvePortalRole(req, user);
    return res.json({
      success: true,
      role,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        is_superuser: user.is_superuser,
        is_org_admin: user.is_org_admin,
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        success: false,
        message: 'Failed to resolve portal access from JumpServer',
        details: axiosError.response.data,
      });
    }
    console.error('Resolve portal access error:', error);
    return res.status(503).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to resolve portal access',
    });
  }
});

async function canCurrentUserSeeTicket(ticket: any, currentUserId: string): Promise<boolean> {
  if (getTicketState(ticket) !== 'pending') return false;

  const processMap = Array.isArray(ticket?.process_map) ? ticket.process_map : [];
  const pendingSteps = processMap.filter((step: any) => {
    const stepState = typeof step?.state === 'string' ? step.state : step?.state?.value;
    return stepState === 'pending';
  });

  const currentStep = pendingSteps.reduce((current: any, step: any) => {
    if (!current) return step;
    const currentLevel = Number(current?.approval_level ?? Number.MAX_SAFE_INTEGER);
    const stepLevel = Number(step?.approval_level ?? Number.MAX_SAFE_INTEGER);
    return stepLevel < currentLevel ? step : current;
  }, null);

  if (!currentStep) return false;
  const assignees = Array.isArray(currentStep.assignees)
    ? currentStep.assignees.map((id: any) => String(id))
    : [];
  return assignees.includes(String(currentUserId));
}

async function fetchPendingTickets(req: Request, endpoint: string): Promise<any[]> {
  const pageSize = 200;
  const maxTickets = 5000;
  const tickets: any[] = [];
  let offset = 0;

  while (tickets.length < maxTickets) {
    const response = await axios.get(`${JUMPSERVER_URL}${endpoint}`, {
      headers: getJumpServerHeaders(req),
      params: {
        state: 'pending',
        ordering: '-date_created',
        limit: pageSize,
        offset,
      },
      timeout: 15000,
    });

    const page = extractResults(response.data);
    tickets.push(...page);

    if (Array.isArray(response.data) || page.length < pageSize) break;
    if (typeof response.data?.next === 'undefined' && typeof response.data?.count !== 'number') break;
    if (response.data?.next === null) break;
    offset += pageSize;
  }

  return tickets.slice(0, maxTickets);
}

async function fetchApprovalTicketDetail(req: Request, ticketId: string, type: ApprovalTicketType): Promise<any> {
  const response = await axios.get(
    `${JUMPSERVER_URL}${getTicketEndpoint(type)}${encodeURIComponent(ticketId)}/`,
    {
      headers: getJumpServerHeaders(req),
      timeout: 15000,
    },
  );
  return response.data;
}

async function assertApprovalAccess(
  req: Request,
  ticketId: string,
  type: ApprovalTicketType,
): Promise<{ allowed: boolean; ticket?: any; reason?: string }> {
  const currentUser = await getAuthenticatedUser(req);
  const ticket = await fetchApprovalTicketDetail(req, ticketId, type);
  const allowed = await canCurrentUserSeeTicket(ticket, currentUser.id);
  return {
    allowed,
    ticket,
    reason: allowed ? undefined : 'You are not authorized to access this approval request.',
  };
}

async function listTickets(req: Request, res: Response, state?: string) {
  try {
    if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' });

    if (state !== 'pending') {
      const response = await axios.get(`${JUMPSERVER_URL}${APPLY_ASSET_TICKETS_ENDPOINT}`, {
        headers: getJumpServerHeaders(req),
        params: { limit: 200, ordering: '-date_created' },
        timeout: 15000,
      });
      const tickets = extractResults(response.data);
      const filtered = state
        ? tickets.filter((ticket: any) => getTicketState(ticket) === state)
        : tickets;
      return res.json({ success: true, count: filtered.length, tickets: filtered });
    }

    const currentUser = await getAuthenticatedUser(req);
    const [applyAssetTickets, commandReviewTickets] = await Promise.all([
      fetchPendingTickets(req, APPLY_ASSET_TICKETS_ENDPOINT),
      fetchPendingTickets(req, COMMAND_REVIEW_TICKETS_ENDPOINT),
    ]);

    const pendingTickets = [...applyAssetTickets, ...commandReviewTickets]
      .filter((ticket) => getTicketType(ticket) === 'apply_asset' || getTicketType(ticket) === 'command_confirm')
      .sort((a, b) => {
        const aTime = new Date(a?.date_created || 0).getTime();
        const bTime = new Date(b?.date_created || 0).getTime();
        return bTime - aTime;
      });

    const visible: any[] = [];
    for (const ticket of pendingTickets) {
      if (await canCurrentUserSeeTicket(ticket, currentUser.id)) visible.push(ticket);
    }

    return res.json({ success: true, count: visible.length, tickets: visible });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        success: false,
        message: state ? 'Failed to load approval requests from JumpServer' : 'Failed to load request history from JumpServer',
        details: axiosError.response.data,
      });
    }
    console.error('List tickets error:', error);
    return res.status(500).json({
      success: false,
      message: state ? 'Failed to load approval requests' : 'Failed to load request history',
    });
  }
}

app.get('/portal-api/tickets', requireAuth, (req, res) => listTickets(req, res));
app.get('/portal-api/approvals', requireAuth, (req, res) => listTickets(req, res, 'pending'));

async function processApproval(req: Request, res: Response, action: 'approve' | 'reject') {
  try {
    if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' });

    const type = getApprovalTicketType(req.body?.type);
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Approval ticket type must be apply_asset or command_confirm',
      });
    }

    const access = await assertApprovalAccess(req, req.params.id, type);
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.reason || 'You are not authorized to process this approval request.',
      });
    }

    const response = await axios.put(
      `${JUMPSERVER_URL}${getTicketEndpoint(type)}${encodeURIComponent(req.params.id)}/${action}/`,
      {},
      {
        headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' },
        timeout: 15000,
      },
    );
    return res.json({ success: true, result: response.data });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        success: false,
        message: `JumpServer rejected the ${action} request`,
        details: axiosError.response.data,
        upstreamStatus: axiosError.response.status,
      });
    }
    console.error(`${action} ticket error:`, error);
    return res.status(500).json({ success: false, message: `Failed to ${action} ticket` });
  }
}

app.put('/portal-api/approvals/:id/approve', requireAuth, (req, res) => processApproval(req, res, 'approve'));
app.put('/portal-api/approvals/:id/reject', requireAuth, (req, res) => processApproval(req, res, 'reject'));

app.put('/portal-api/tickets/:id/close', requireAuth, async (req, res) => {
  try {
    if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' });
    const response = await axios.put(
      `${JUMPSERVER_URL}${APPLY_ASSET_TICKETS_ENDPOINT}${encodeURIComponent(req.params.id)}/close/`,
      {},
      {
        headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' },
        timeout: 15000,
      },
    );
    return res.json({ success: true, ticket: response.data });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      return res.status(axiosError.response.status).json({
        success: false,
        message: 'JumpServer rejected closing the ticket',
        details: axiosError.response.data,
        upstreamStatus: axiosError.response.status,
      });
    }
    console.error('Close ticket error:', error);
    return res.status(500).json({ success: false, message: 'Failed to close ticket' });
  }
});

app.listen(PORT, () => console.log(`Ticketing backend listening on http://localhost:${PORT}`));
