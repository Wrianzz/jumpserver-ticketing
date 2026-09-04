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

async function findUser(req: Request, identifier: string, cache: Map<string, UserSummary | null>): Promise<UserSummary | null> {
  const rawIdentifier = identifier.trim();
  const key = rawIdentifier.toLowerCase();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key)!;

  // JumpServer serializes the applicant ForeignKey using User.__str__(),
  // commonly as "Name(username)". Prefer the username inside parentheses.
  const usernameMatch = rawIdentifier.match(/\(([^()]+)\)\s*$/);
  const candidates = [usernameMatch?.[1]?.trim(), rawIdentifier, rawIdentifier.replace(/\s*\([^()]+\)\s*$/, '').trim()]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

  for (const candidate of candidates) {
    const response = await axios.get(`${JUMPSERVER_URL}/api/v1/users/users/`, { headers: getJumpServerHeaders(req), params: { search: candidate, limit: 10, fields_size: 'mini' }, timeout: 15000 });
    const users = extractResults(response.data) as UserSummary[];
    const candidateKey = candidate.toLowerCase();
    const exact = users.find((user) => String(user.username || '').toLowerCase() === candidateKey) || users.find((user) => String(user.name || '').toLowerCase() === candidateKey);
    if (exact) {
      cache.set(key, exact);
      return exact;
    }
  }

  cache.set(key, null);
  return null;
}

async function getTeamGroups(req: Request, userId: string, cache: Map<string, Set<string>>): Promise<Set<string>> {
  if (cache.has(userId)) return cache.get(userId)!;
  const response = await axios.get(`${JUMPSERVER_URL}/api/v1/users/users-groups-relations/`, { headers: getJumpServerHeaders(req), params: { user: userId, limit: 200 }, timeout: 15000 });
  const relations = extractResults(response.data);
  const names = relations.map((relation: any) => relation?.usergroup_display || relation?.usergroup?.name || relation?.usergroup).filter((name: unknown): name is string => typeof name === 'string' && name.trim().length > 0);
  const teams = configuredTeamNames(names);
  cache.set(userId, teams);
  return teams;
}

function hasTeamIntersection(left: Set<string>, right: Set<string>): boolean { for (const name of left) if (right.has(name)) return true; return false; }

async function canCurrentUserSeeTicket(req: Request, ticket: any, currentUserId: string, userCache: Map<string, UserSummary | null>, groupCache: Map<string, Set<string>>): Promise<boolean> {
  if (ticket?.state?.value !== 'pending') return false;
  const currentStep = Array.isArray(ticket?.process_map) ? ticket.process_map.find((step: any) => step?.state === 'pending') : null;
  if (!currentStep?.assignees?.some((id: string) => String(id) === String(currentUserId))) return false;
  const applicant = String(ticket?.applicant || '').trim();
  if (!applicant) return false;
  const applicantUser = await findUser(req, applicant, userCache);
  if (!applicantUser?.id) return false;
  const [approverTeams, applicantTeams] = await Promise.all([getTeamGroups(req, currentUserId, groupCache), getTeamGroups(req, applicantUser.id, groupCache)]);
  const allowed = approverTeams.size > 0 && applicantTeams.size > 0 && hasTeamIntersection(approverTeams, applicantTeams);
  console.log('Approval team check:', { ticketId: ticket?.id, applicant: applicantUser.username || applicantUser.name, approver: currentUserId, approverTeams: [...approverTeams], applicantTeams: [...applicantTeams], allowed });
  return allowed;
}

async function assertApprovalAccess(req: Request, ticketId: string): Promise<{ allowed: boolean; ticket?: any; reason?: string }> {
  const currentUserId = req.header('x-portal-user-id')?.trim();
  if (!currentUserId) return { allowed: false, reason: 'Portal user identity is missing. Please sign in again.' };
  const userCache = new Map<string, UserSummary | null>();
  const groupCache = new Map<string, Set<string>>();
  const detailResponse = await axios.get(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/${encodeURIComponent(ticketId)}/`, { headers: getJumpServerHeaders(req), timeout: 15000 });
  const ticket = detailResponse.data;
  const allowed = await canCurrentUserSeeTicket(req, ticket, currentUserId, userCache, groupCache);
  return { allowed, ticket, reason: allowed ? undefined : 'You are not authorized to access this approval request.' };
}

async function listTickets(req: Request, res: Response, state?: string) { try { if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' }); const currentUserId = state === 'pending' ? req.header('x-portal-user-id')?.trim() : undefined; if (state === 'pending' && !currentUserId) return res.status(400).json({ success: false, message: 'Portal user identity is missing. Please sign in again.' }); const query = state === 'pending' ? `?limit=200&assignees__id=${encodeURIComponent(currentUserId!)}` : '?limit=200'; const response = await axios.get(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/${query}`, { headers: getJumpServerHeaders(req), timeout: 15000 }); const tickets = extractResults(response.data); const filtered = state ? tickets.filter((ticket: any) => ticket?.state?.value === state) : tickets; if (state !== 'pending') return res.json({ success: true, count: filtered.length, tickets: filtered }); const userCache = new Map<string, UserSummary | null>(); const groupCache = new Map<string, Set<string>>(); const visible = []; for (const ticket of filtered) { if (await canCurrentUserSeeTicket(req, ticket, currentUserId!, userCache, groupCache)) visible.push(ticket); } return res.json({ success: true, count: visible.length, tickets: visible }); } catch (error) { const axiosError = error as AxiosError; if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: state ? 'Failed to load approval requests from JumpServer' : 'Failed to load request history from JumpServer', details: axiosError.response.data }); console.error('List tickets error:', error); return res.status(500).json({ success: false, message: state ? 'Failed to load approval requests' : 'Failed to load request history' }); } }
app.get('/portal-api/tickets', requireAuth, (req, res) => listTickets(req, res));
app.get('/portal-api/approvals', requireAuth, (req, res) => listTickets(req, res, 'pending'));

async function processApproval(req: Request, res: Response, action: 'approve' | 'reject') { try { if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' }); const access = await assertApprovalAccess(req, req.params.id); if (!access.allowed) return res.status(403).json({ success: false, message: access.reason || 'You are not authorized to process this approval request.' }); const payload = req.body as ApprovalPayload; if (!payload?.org_id || !Array.isArray(payload.apply_nodes) || !Array.isArray(payload.apply_assets) || !Array.isArray(payload.apply_accounts) || !Array.isArray(payload.apply_actions) || !payload.apply_date_start || !payload.apply_date_expired) return res.status(400).json({ success: false, message: 'Invalid approval payload' }); const response = await axios.put(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/${encodeURIComponent(req.params.id)}/${action}/`, payload, { headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' }, timeout: 15000 }); return res.json({ success: true, result: response.data }); } catch (error) { const axiosError = error as AxiosError; if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: `JumpServer rejected the ${action} request`, details: axiosError.response.data, upstreamStatus: axiosError.response.status }); console.error(`${action} ticket error:`, error); return res.status(500).json({ success: false, message: `Failed to ${action} ticket` }); } }
app.put('/portal-api/approvals/:id/approve', requireAuth, (req, res) => processApproval(req, res, 'approve'));
app.put('/portal-api/approvals/:id/reject', requireAuth, (req, res) => processApproval(req, res, 'reject'));

app.put('/portal-api/tickets/:id/close', requireAuth, async (req, res) => { try { if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' }); const response = await axios.put(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/${encodeURIComponent(req.params.id)}/close/`, {}, { headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' }, timeout: 15000 }); return res.json({ success: true, ticket: response.data }); } catch (error) { const axiosError = error as AxiosError; if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: 'JumpServer rejected the cancel request', details: axiosError.response.data }); console.error('Cancel ticket error:', error); return res.status(500).json({ success: false, message: 'Failed to cancel ticket' }); } });
app.listen(PORT, () => { console.log(`JumpServer Ticketing backend listening on port ${PORT}`); console.log(`JumpServer URL: ${JUMPSERVER_URL || '(NOT CONFIGURED)'}`); console.log(`JumpServer org: ${JUMPSERVER_ORG_ID}`); console.log(`JumpServer timezone offset: ${JUMPSERVER_TIMEZONE_OFFSET}`); });
