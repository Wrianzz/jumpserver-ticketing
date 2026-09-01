import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

const app = express();

const PORT = Number(process.env.PORT || 3001);
const JUMPSERVER_URL = (process.env.JUMPSERVER_URL || '').replace(/\/$/, '');
const JUMPSERVER_ORG_ID =
  process.env.JUMPSERVER_ORG_ID ||
  '00000000-0000-0000-0000-000000000002';
const JUMPSERVER_TIMEZONE_OFFSET =
  process.env.JUMPSERVER_TIMEZONE_OFFSET || '+0700';

app.use(express.json({ limit: '1mb' }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

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

const ALLOWED_ACTIONS = new Set(['connect', 'upload', 'download', 'copy', 'paste', 'delete', 'share']);

function getBearerToken(req: Request): string | null {
  const authorization = req.header('authorization');

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
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

function formatJumpServerDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date value');
  }

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
      .map((part) => [part.type, part.value])
  );

  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second} ${JUMPSERVER_TIMEZONE_OFFSET}`;
}

app.get('/portal-api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'jumpserver-ticketing-backend',
  });
});

app.post(
  '/portal-api/tickets',
  requireAuth,
  async (req: Request<{}, {}, TicketRequestBody>, res: Response) => {
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

      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Ticket title is required',
        });
      }

      if (apply_nodes.length === 0 && apply_assets.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Select at least one node or asset',
        });
      }

      if (!apply_date_start || !apply_date_expired) {
        return res.status(400).json({
          success: false,
          message: 'Start and expiry dates are required',
        });
      }

      const startDate = new Date(apply_date_start);
      const expiredDate = new Date(apply_date_expired);

      if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(expiredDate.getTime())
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start or expiry date',
        });
      }

      if (expiredDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'Expiry date must be later than start date',
        });
      }

      const invalidActions = apply_actions.filter(
        (action) => !ALLOWED_ACTIONS.has(action)
      );

      if (invalidActions.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Unsupported actions: ${invalidActions.join(', ')}`,
        });
      }

      if (
        apply_accounts.includes('@ALL') &&
        apply_accounts.length > 1
      ) {
        return res.status(400).json({
          success: false,
          message: '@ALL cannot be combined with other accounts',
        });
      }

      if (apply_accounts.includes('@SPEC') && apply_accounts.length < 2) {
        return res.status(400).json({
          success: false,
          message: '@SPEC must be followed by at least one specified account',
        });
      }

      const token = getBearerToken(req)!;

      // Keep the portal contract identical to the JumpServer ticket API.
      // org_id is pinned server-side unless the client sends the same org.
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

      console.log(
        'Forwarding JumpServer ticket payload:',
        JSON.stringify(jumpServerPayload)
      );

      const response = await axios.post(
        `${JUMPSERVER_URL}/api/v1/tickets/apply-asset-tickets/open/`,
        jumpServerPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-JMS-ORG': JUMPSERVER_ORG_ID,
          },
          timeout: 15000,
        }
      );

      const tickets = Array.isArray(response.data)
        ? response.data
        : [response.data];

      return res.status(201).json({
        success: true,
        ticket: tickets[0] || null,
      });
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

      return res.status(500).json({
        success: false,
        message: 'Failed to create JIT ticket',
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(`JumpServer Ticketing backend listening on port ${PORT}`);
  console.log(`JumpServer URL: ${JUMPSERVER_URL || '(NOT CONFIGURED)'}`);
  console.log(`JumpServer org: ${JUMPSERVER_ORG_ID}`);
});
