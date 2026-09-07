import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JUMPSERVER_URL = (process.env.JUMPSERVER_URL || '').replace(/\/$/, '');
const JUMPSERVER_ORG_ID = process.env.JUMPSERVER_ORG_ID || '00000000-0000-0000-0000-000000000002';
const JUMPSERVER_TIMEZONE_OFFSET = process.env.JUMPSERVER_TIMEZONE_OFFSET || '+0700';
const TEAM_GROUPS = new Set((process.env.TEAM_GROUPS || '').split(',').map((name) => name.trim().toLowerCase()).filter(Boolean));
const TEAM_GROUPS_IGNORE = new Set((process.env.TEAM_GROUPS_IGNORE || 'Default').split(',').map((name) => name.trim().toLowerCase()).filter(Boolean));
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => { console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`); next(); });

type TicketRequestBody = { title?: string; org_id?: string; apply_nodes?: string[]; apply_assets?: string[]; apply_accounts?: string[]; apply_actions?: string[]; apply_date_start?: string; apply_date_expired?: string; comment?: string; };
type ApprovalPayload = { org_id: string; apply_nodes: Array<{ id: string }>; apply_assets: Array<{ id: string }>; apply_accounts: string[]; apply_actions: string[]; apply_date_start: string; apply_date_expired: string; };
type UserSummary = { id: string; username?: string; name?: string };
const ALLOWED_ACTIONS = new Set(['connect', 'upload', 'download', 'copy', 'paste']);
function getBearerToken(req: Request): string | null { const authorization = req.header('authorization'); if (!authorization) return null; const [scheme, token] = authorization.split(' '); return scheme?.toLowerCase() === 'bearer' && token ? token : null; }
function requireAuth(req: Request, res: Response, next: NextFunction) { if (!getBearerToken(req)) return res.status(401).json({ success: false, message: 'Missing or invalid Authorization Bearer token' }); next(); }
function getJumpServerHeaders(req: Request) { return { Authorization: `Bearer ${getBearerToken(req)!}`, 'X-JMS-ORG': JUMPSERVER_ORG_ID }; }
function formatJumpServerDate(value: string): string { const date = new Date(value); if (Number.isNaN(date.getTime())) throw new Error('Invalid date value'); const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }); const parts = Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])); return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${JUMPSERVER_TIMEZONE_OFFSET}`; }
app.get('/portal-api/health', (_req, res) => res.json({ success: true, service: 'jumpserver-ticketing-backend' }));

app.get('/portal-api/logout', async (req: Request, res: Response) => {
  try {
    if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' });
    const cookie = req.header('cookie');
    if (!cookie) return res.status(204).end();
    const response = await axios.get(`${JUMPSERVER_URL}/core/auth/logout/?next=/console/dashboard`, { headers: { Cookie: cookie }, maxRedirects: 0, validateStatus: (status) => status >= 200 && status < 400, timeout: 15000 });
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

app.post('/portal-api/tickets', requireAuth, async (req: Request<{}, {}, TicketRequestBody>, res: Response) => { try { if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured on the backend. Check .env and restart npm run server.' }); const { title, org_id, apply_nodes = [], apply_assets = [], apply_accounts = ['@ALL'], apply_actions = ['connect'], apply_date_start, apply_date_expired, comment = '' } = req.body; if (!title?.trim()) return res.status(400).json({ success: false, message: 'Ticket title is required' }); if (apply_nodes.length === 0 && apply_assets.length === 0) return res.status(400).json({ success: false, message: 'Select at least one node or asset' }); if (!apply_date_start || !apply_date_expired) return res.status(400).json({ success: false, message: 'Start and expiry dates are required' }); const startDate = new Date(apply_date_start); const expiredDate = new Date(apply_date_expired); if (Number.isNaN(startDate.getTime()) || Number.isNaN(expiredDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid start or expiry date' }); if (expiredDate <= startDate) return res.status(400).json({ success: false, message: 'Expiry date must be later than start date' }); const invalidActions = apply_actions.filter((action) => !ALLOWED_ACTIONS.has(action)); if (invalidActions.length > 0) return res.status(400).json({ success: false, message: `Unsupported actions: ${invalidActions.join(', ')}` }); if (apply_accounts.includes('@ALL') && apply_accounts.length > 1) return res.status(400).json({ success: false, message: '@ALL cannot be combined with other accounts' }); if (apply_accounts.includes('@SPEC') && apply_accounts.length < 2) return res.status(400).json({ success: false, message: '@SPEC must be followed by at least one specified account' }); const jumpServerPayload = { title: title.trim(), org_id: org_id || JUMPSERVER_ORG_ID, apply_nodes, apply_assets, apply_accounts, apply_actions, apply_date_start, apply_date_expired, comment: comment.trim() }; const response = await axios.post(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/open/`, jumpServerPayload, { headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' }, timeout: 15000 }); const tickets = Array.isArray(response.data) ? response.data : [response.data]; return res.status(201).json({ success: true, ticket: tickets[0] || null }); } catch (error) { const axiosError = error as AxiosError; if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: 'JumpServer rejected the ticket request', details: axiosError.response.data, upstreamStatus: axiosError.response.status }); console.error('Create ticket error:', error); return res.status(500).json({ success: false, message: 'Failed to create JIT ticket' }); } });

function extractResults(data: any): any[] { return Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []; }
function configuredTeamNames(names: string[]): Set<string> { const normalized = names.map((name) => name.trim().toLowerCase()).filter(Boolean); if (TEAM_GROUPS.size > 0) return new Set(normalized.filter((name) => TEAM_GROUPS.has(name))); return new Set(normalized.filter((name) => !TEAM_GROUPS_IGNORE.has(name))); }

async function getAuthenticatedUser(req: Request): Promise<UserSummary> {
  const response = await axios.get(`${JUMPSERVER_URL}/api/v1/users/profile/`, { headers: getJumpServerHeaders(req), timeout: 15000 });
  const profile = response.data?.data || response.data;
  if (!profile?.id) throw new Error('JumpServer profile response does not contain a user id');
  const portalUserId = req.header('x-portal-user-id')?.trim();
  if (portalUserId && String(portalUserId) !== String(profile.id)) console.warn('Portal user id mismatch; using authenticated JumpServer profile instead:', { portalUserId, authenticatedUserId: profile.id, username: profile.username });
  return { id: String(profile.id), username: profile.username, name: profile.name };
}

async function findUser(req: Request, identifier: string, cache: Map<string, UserSummary | null>): Promise<UserSummary | null> {
  const rawIdentifier = identifier.trim();
  const key = rawIdentifier.toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;
  const usernameMatch = rawIdentifier.match(/\(([^()]+)\)\s*$/);
  const candidates = [usernameMatch?.[1]?.trim(), rawIdentifier, rawIdentifier.replace(/\s*\([^()]+\)\s*$/, '').trim()].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
  for (const candidate of candidates) {
    const response = await axios.get(`${JUMPSERVER_URL}/api/v1/users/users/`, { headers: getJumpServerHeaders(req), params: { search: candidate, limit: 10, fields_size: 'mini' }, timeout: 15000 });
    const users = extractResults(response.data) as UserSummary[];
    const candidateKey = candidate.toLowerCase();
    const exact = users.find((user) => String(user.username || '').toLowerCase() === candidateKey) || users.find((user) => String(user.name || '').toLowerCase() === candidateKey);
    if (exact) { cache.set(key, exact); return exact; }
  }
  cache.set(key, null);
  return null;
}

async function getTeamGroups(req: Request, userId: string, cache: Map<string, Set<string>>): Promise<Set<string>> {
  if (cache.has(userId)) return cache.get(userId)!;
  const userResponse = await axios.get(`${JUMPSERVER_URL}/api/v1/users/users/${encodeURIComponent(userId)}/`, { headers: getJumpServerHeaders(req), timeout: 15000 });
  const rawGroups = userResponse.data?.groups;
  let names: string[] = [];
  if (Array.isArray(rawGroups)) {
    names = rawGroups.map((group: any) => typeof group === 'string' ? group : group?.name || group?.display || group?.label).filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0);
  } else {
    const relationResponse = await axios.get(`${JUMPSERVER_URL}/api/v1/users/users-groups-relations/`, { headers: getJumpServerHeaders(req), params: { user: userId, limit: 200 }, timeout: 15000 });
    const relations = extractResults(relationResponse.data);
    names = relations.map((relation: any) => relation?.usergroup_display || relation?.usergroup?.name || relation?.usergroup).filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0);
  }
  const teams = configuredTeamNames(names);
  cache.set(userId, teams);
  return teams;
}

function hasTeamIntersection(left: Set<string>, right: Set<string>): boolean { for (const name of left) if (right.has(name)) return true; return false; }

async function canCurrentUserSeeTicket(req: Request, ticket: any, currentUserId: string, userCache: Map<string, UserSummary | null>, groupCache: Map<string, Set<string>>): Promise<boolean> {
  const ticketId = String(ticket?.id || '(no-id)');
  const state = typeof ticket?.state === 'string' ? ticket.state : ticket?.state?.value;
  const processMap = Array.isArray(ticket?.process_map) ? ticket.process_map : [];
  console.log('\n========== APPROVAL VISIBILITY DEBUG ==========');
  console.log('Ticket:', { id: ticketId, serial_num: ticket?.serial_num, title: ticket?.title, applicant: ticket?.applicant, date_created: ticket?.date_created, state });
  console.log('Current authenticated user:', currentUserId);
  console.log('Raw process_map:', JSON.stringify(processMap, null, 2));
  if (state !== 'pending') { console.log('REJECT [STATE]:', state); return false; }

  // JumpServer may return multiple pending levels. The active approval step is
  // the lowest pending approval_level; do not use array order.
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
  console.log('Pending steps:', pendingSteps.map((step: any) => ({ approval_level: step?.approval_level, assignees: step?.assignees, assignees_display: step?.assignees_display })));
  console.log('Current active approval step:', currentStep ? { approval_level: currentStep.approval_level, state: currentStep.state, assignees: currentStep.assignees, assignees_display: currentStep.assignees_display } : null);
  if (!currentStep) { console.log('REJECT [NO_PENDING_STEP]'); return false; }

  const assignees = Array.isArray(currentStep.assignees) ? currentStep.assignees.map((id: any) => String(id)) : [];
  const assigned = assignees.includes(String(currentUserId));
  console.log('ASSIGNEE CHECK:', { currentUserId: String(currentUserId), assignees, assigned, assignees_display: currentStep.assignees_display });
  if (!assigned) { console.log('REJECT [NOT_ASSIGNEE]'); return false; }

  const applicant = String(ticket?.applicant || '').trim();
  if (!applicant) { console.log('REJECT [NO_APPLICANT]'); return false; }
  const applicantUser = await findUser(req, applicant, userCache);
  console.log('APPLICANT RESOLUTION:', { raw: applicant, resolved: applicantUser });
  if (!applicantUser?.id) { console.log('REJECT [APPLICANT_NOT_RESOLVED]'); return false; }

  const [approverTeams, applicantTeams] = await Promise.all([getTeamGroups(req, currentUserId, groupCache), getTeamGroups(req, applicantUser.id, groupCache)]);
  const intersection = [...approverTeams].filter((team) => applicantTeams.has(team));
  const allowed = approverTeams.size > 0 && applicantTeams.size > 0 && intersection.length > 0;
  console.log('TEAM CHECK:', { approver: currentUserId, approverTeams: [...approverTeams], applicant: applicantUser, applicantTeams: [...applicantTeams], intersection, allowed });
  console.log('FINAL RESULT:', allowed ? 'ALLOW' : 'REJECT [NO_TEAM_INTERSECTION]');
  console.log('================================================\n');
  return allowed;
}

async function fetchPendingTickets(req: Request): Promise<any[]> {
  const pageSize = 200;
  const maxTickets = 5000;
  const tickets: any[] = [];
  let offset = 0;
  while (tickets.length < maxTickets) {
    const response = await axios.get(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/`, { headers: getJumpServerHeaders(req), params: { state: 'pending', ordering: '-date_created', limit: pageSize, offset }, timeout: 15000 });
    const page = extractResults(response.data);
    tickets.push(...page);
    console.log('Approval ticket page:', { offset, received: page.length, totalCollected: tickets.length, firstTicket: page[0]?.id, firstDateCreated: page[0]?.date_created, lastTicket: page[page.length - 1]?.id, lastDateCreated: page[page.length - 1]?.date_created });
    if (Array.isArray(response.data) || page.length < pageSize) break;
    if (typeof response.data?.next === 'undefined' && typeof response.data?.count !== 'number') break;
    if (response.data?.next === null) break;
    offset += pageSize;
  }
  return tickets.slice(0, maxTickets);
}

async function assertApprovalAccess(req: Request, ticketId: string): Promise<{ allowed: boolean; ticket?: any; reason?: string }> {
  const currentUser = await getAuthenticatedUser(req);
  const userCache = new Map<string, UserSummary | null>();
  const groupCache = new Map<string, Set<string>>();
  const detailResponse = await axios.get(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/${encodeURIComponent(ticketId)}/`, { headers: getJumpServerHeaders(req), timeout: 15000 });
  const ticket = detailResponse.data;
  const allowed = await canCurrentUserSeeTicket(req, ticket, currentUser.id, userCache, groupCache);
  return { allowed, ticket, reason: allowed ? undefined : 'You are not authorized to access this approval request.' };
}

async function listTickets(req: Request, res: Response, state?: string) {
  try {
    if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' });
    if (state !== 'pending') {
      const response = await axios.get(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/`, { headers: getJumpServerHeaders(req), params: { limit: 200, ordering: '-date_created' }, timeout: 15000 });
      const tickets = extractResults(response.data);
      const filtered = state ? tickets.filter((ticket: any) => ticket?.state?.value === state || ticket?.state === state) : tickets;
      return res.json({ success: true, count: filtered.length, tickets: filtered });
    }
    const currentUser = await getAuthenticatedUser(req);
    console.log('Loading approvals for authenticated user:', currentUser);
    const pendingTickets = await fetchPendingTickets(req);
    const userCache = new Map<string, UserSummary | null>();
    const groupCache = new Map<string, Set<string>>();
    const visible = [];
    for (const ticket of pendingTickets) {
      const allowed = await canCurrentUserSeeTicket(req, ticket, currentUser.id, userCache, groupCache);
      console.log('FILTER DECISION:', { ticketId: ticket?.id, allowed });
      if (allowed) visible.push(ticket);
    }
    console.log('END APPROVAL FILTER:', { pendingCount: pendingTickets.length, visibleCount: visible.length, visibleTickets: visible.map((ticket: any) => ({ id: ticket?.id, serial_num: ticket?.serial_num, applicant: ticket?.applicant, title: ticket?.title })) });
    console.log('APPROVAL RESPONSE:', { count: visible.length, ticketIds: visible.map((ticket: any) => ticket?.id) });
    return res.json({ success: true, count: visible.length, tickets: visible });
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: state ? 'Failed to load approval requests from JumpServer' : 'Failed to load request history from JumpServer', details: axiosError.response.data });
    console.error('List tickets error:', error);
    return res.status(500).json({ success: false, message: state ? 'Failed to load approval requests' : 'Failed to load request history' });
  }
}
app.get('/portal-api/tickets', requireAuth, (req, res) => listTickets(req, res));
app.get('/portal-api/approvals', requireAuth, (req, res) => listTickets(req, res, 'pending'));

async function processApproval(req: Request, res: Response, action: 'approve' | 'reject') { try { if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' }); const access = await assertApprovalAccess(req, req.params.id); if (!access.allowed) return res.status(403).json({ success: false, message: access.reason || 'You are not authorized to process this approval request.' }); const payload = req.body as ApprovalPayload; if (!payload?.org_id || !Array.isArray(payload.apply_nodes) || !Array.isArray(payload.apply_assets) || !Array.isArray(payload.apply_accounts) || !Array.isArray(payload.apply_actions) || !payload.apply_date_start || !payload.apply_date_expired) return res.status(400).json({ success: false, message: 'Invalid approval payload' }); const response = await axios.put(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/${encodeURIComponent(req.params.id)}/${action}/`, payload, { headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' }, timeout: 15000 }); return res.json({ success: true, result: response.data }); } catch (error) { const axiosError = error as AxiosError; if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: `JumpServer rejected the ${action} request`, details: axiosError.response.data, upstreamStatus: axiosError.response.status }); console.error(`${action} ticket error:`, error); return res.status(500).json({ success: false, message: `Failed to ${action} ticket` }); } }
app.put('/portal-api/approvals/:id/approve', requireAuth, (req, res) => processApproval(req, res, 'approve'));
app.put('/portal-api/approvals/:id/reject', requireAuth, (req, res) => processApproval(req, res, 'reject'));

app.put('/portal-api/tickets/:id/close', requireAuth, async (req, res) => { try { if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' }); const response = await axios.put(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/${encodeURIComponent(req.params.id)}/close/`, {}, { headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' }, timeout: 15000 }); return res.json({ success: true, ticket: response.data }); } catch (error) { const axiosError = error as AxiosError; if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: 'JumpServer rejected the cancel request', details: axiosError.response.data }); console.error('Cancel ticket error:', error); return res.status(500).json({ success: false, message: 'Failed to cancel ticket' }); } });
app.listen(PORT, () => { console.log(`JumpServer Ticketing backend listening on port ${PORT}`); console.log(`JumpServer URL: ${JUMPSERVER_URL || '(NOT CONFIGURED)'}`); console.log(`JumpServer org: ${JUMPSERVER_ORG_ID}`); console.log(`JumpServer timezone offset: ${JUMPSERVER_TIMEZONE_OFFSET}`); });
