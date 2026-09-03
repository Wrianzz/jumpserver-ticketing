import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const JUMPSERVER_URL = (process.env.JUMPSERVER_URL || '').replace(/\/$/, '');
const JUMPSERVER_ORG_ID = process.env.JUMPSERVER_ORG_ID || '00000000-0000-0000-0000-000000000002';
const JUMPSERVER_TIMEZONE_OFFSET = process.env.JUMPSERVER_TIMEZONE_OFFSET || '+0700';
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => { console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`); next(); });

type TicketRequestBody = { title?: string; org_id?: string; apply_nodes?: string[]; apply_assets?: string[]; apply_accounts?: string[]; apply_actions?: string[]; apply_date_start?: string; apply_date_expired?: string; comment?: string; };
type ApprovalPayload = { org_id: string; apply_nodes: Array<{ id: string }>; apply_assets: Array<{ id: string }>; apply_accounts: string[]; apply_actions: string[]; apply_date_start: string; apply_date_expired: string; };
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
    const response = await axios.get(`${JUMPSERVER_URL}/core/auth/logout/?next=/console/dashboard`, {
      headers: { Cookie: cookie }, maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400, timeout: 15000,
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

app.post('/portal-api/tickets', requireAuth, async (req: Request<{}, {}, TicketRequestBody>, res: Response) => { try { if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured on the backend. Check .env and restart npm run server.' }); const { title, org_id, apply_nodes = [], apply_assets = [], apply_accounts = ['@ALL'], apply_actions = ['connect'], apply_date_start, apply_date_expired, comment = '' } = req.body; if (!title?.trim()) return res.status(400).json({ success: false, message: 'Ticket title is required' }); if (apply_nodes.length === 0 && apply_assets.length === 0) return res.status(400).json({ success: false, message: 'Select at least one node or asset' }); if (!apply_date_start || !apply_date_expired) return res.status(400).json({ success: false, message: 'Start and expiry dates are required' }); const startDate = new Date(apply_date_start); const expiredDate = new Date(apply_date_expired); if (Number.isNaN(startDate.getTime()) || Number.isNaN(expiredDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid start or expiry date' }); if (expiredDate <= startDate) return res.status(400).json({ success: false, message: 'Expiry date must be later than start date' }); const invalidActions = apply_actions.filter((action) => !ALLOWED_ACTIONS.has(action)); if (invalidActions.length > 0) return res.status(400).json({ success: false, message: `Unsupported actions: ${invalidActions.join(', ')}` }); if (apply_accounts.includes('@ALL') && apply_accounts.length > 1) return res.status(400).json({ success: false, message: '@ALL cannot be combined with other accounts' }); if (apply_accounts.includes('@SPEC') && apply_accounts.length < 2) return res.status(400).json({ success: false, message: '@SPEC must be followed by at least one specified account' }); const jumpServerPayload = { title: title.trim(), org_id: org_id || JUMPSERVER_ORG_ID, apply_nodes, apply_assets, apply_accounts, apply_actions, apply_date_start, apply_date_expired, comment: comment.trim() }; console.log('Forwarding JumpServer ticket payload:', JSON.stringify(jumpServerPayload)); const response = await axios.post(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/open/`, jumpServerPayload, { headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' }, timeout: 15000 }); const tickets = Array.isArray(response.data) ? response.data : [response.data]; return res.status(201).json({ success: true, ticket: tickets[0] || null }); } catch (error) { const axiosError = error as AxiosError; if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: 'JumpServer rejected the ticket request', details: axiosError.response.data, upstreamStatus: axiosError.response.status }); console.error('Create ticket error:', error); return res.status(500).json({ success: false, message: 'Failed to create JIT ticket' }); } });

async function listTickets(req: Request, res: Response, state?: string) { try { if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' }); const response = await axios.get(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/`, { headers: getJumpServerHeaders(req), timeout: 15000 }); const raw = response.data; const tickets = Array.isArray(raw) ? raw : Array.isArray(raw?.results) ? raw.results : []; const filtered = state ? tickets.filter((ticket: any) => ticket?.state?.value === state) : tickets; return res.json({ success: true, count: filtered.length, tickets: filtered }); } catch (error) { const axiosError = error as AxiosError; if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: state ? 'Failed to load approval requests from JumpServer' : 'Failed to load request history from JumpServer', details: axiosError.response.data }); console.error('List tickets error:', error); return res.status(500).json({ success: false, message: state ? 'Failed to load approval requests' : 'Failed to load request history' }); } }
app.get('/portal-api/tickets', requireAuth, (req, res) => listTickets(req, res));
app.get('/portal-api/approvals', requireAuth, (req, res) => listTickets(req, res, 'pending'));

async function processApproval(req: Request, res: Response, action: 'approve' | 'reject') { try { if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' }); const payload = req.body as ApprovalPayload; if (!payload?.org_id || !Array.isArray(payload.apply_nodes) || !Array.isArray(payload.apply_assets) || !Array.isArray(payload.apply_accounts) || !Array.isArray(payload.apply_actions) || !payload.apply_date_start || !payload.apply_date_expired) return res.status(400).json({ success: false, message: 'Invalid approval payload' }); const response = await axios.put(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/${encodeURIComponent(req.params.id)}/${action}/`, payload, { headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' }, timeout: 15000 }); return res.json({ success: true, result: response.data }); } catch (error) { const axiosError = error as AxiosError; if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: `JumpServer rejected the ${action} request`, details: axiosError.response.data, upstreamStatus: axiosError.response.status }); console.error(`${action} ticket error:`, error); return res.status(500).json({ success: false, message: `Failed to ${action} ticket` }); } }
app.put('/portal-api/approvals/:id/approve', requireAuth, (req, res) => processApproval(req, res, 'approve'));
app.put('/portal-api/approvals/:id/reject', requireAuth, (req, res) => processApproval(req, res, 'reject'));

app.put('/portal-api/tickets/:id/close', requireAuth, async (req, res) => { try { if (!JUMPSERVER_URL) return res.status(500).json({ success: false, message: 'JUMPSERVER_URL is not configured' }); const response = await axios.put(`${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/${encodeURIComponent(req.params.id)}/close/`, {}, { headers: { ...getJumpServerHeaders(req), 'Content-Type': 'application/json' }, timeout: 15000 }); return res.json({ success: true, ticket: response.data }); } catch (error) { const axiosError = error as AxiosError; if (axiosError.response) return res.status(axiosError.response.status).json({ success: false, message: 'JumpServer rejected the cancel request', details: axiosError.response.data }); console.error('Cancel ticket error:', error); return res.status(500).json({ success: false, message: 'Failed to cancel ticket' }); } });
app.listen(PORT, () => { console.log(`JumpServer Ticketing backend listening on port ${PORT}`); console.log(`JumpServer URL: ${JUMPSERVER_URL || '(NOT CONFIGURED)'}`); console.log(`JumpServer org: ${JUMPSERVER_ORG_ID}`); });
