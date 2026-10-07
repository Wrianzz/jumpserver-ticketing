import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RotateCw, ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react';
import apiClient from '@/lib/axios';

type ProcessStep = {
  state: string;
  assignees: string[];
  processor?: string;
  approval_level: number;
  assignees_display?: string[];
  processor_display?: string;
  approval_date?: string;
};

type Ticket = {
  id: string;
  title: string;
  serial_num: string;
  org_id?: string;
  type?: { value?: string; label?: string } | string;
  apply_nodes?: { id: string; name: string }[];
  apply_assets?: { id: string; name: string }[];
  apply_accounts?: string[];
  apply_actions?: { value: string; label: string }[];
  process_map?: ProcessStep[];
  approval_step?: { value?: number; label?: string };
  state?: { value?: string; label?: string } | string;
  status?: { value?: string; label?: string } | string;
  applicant?: string;
  org_name?: string;
  apply_date_start?: string;
  apply_date_expired?: string;
  date_created?: string;
  comment?: string;
  apply_run_user?: string | { id?: string; name?: string; username?: string };
  apply_run_asset?: string;
  apply_run_command?: string;
  apply_run_account?: string;
  apply_from_session?: string | { id?: string; name?: string };
  apply_from_cmd_filter_acl?: string | { id?: string; name?: string };
};

const PAGE_SIZE = 25;

function stateClass(state?: string) {
  return state === 'pending'
    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25'
    : 'bg-surface-2 text-fg-2 border-line';
}

function getStateValue(state?: Ticket['state']) {
  return typeof state === 'string' ? state : state?.value;
}

function getTypeValue(type?: Ticket['type']) {
  return typeof type === 'string' ? type : type?.value;
}

function getTypeLabel(type?: Ticket['type']) {
  const value = getTypeValue(type);
  if (value === 'command_confirm') return 'Command review';
  if (value === 'apply_asset') return 'Apply for asset';
  return typeof type === 'string' ? type : type?.label || '-';
}

function getRelationValue(value: unknown) {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const item = value as { name?: string; username?: string; id?: string };
    return item.name || item.username || item.id || '-';
  }
  return String(value);
}

export function Approval() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadApprovals = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/portal-api/approvals');
      const data = response.data;
      if (!data?.success) throw new Error(data?.message || 'Failed to load approval requests');

      // The backend is authoritative: it merges apply-asset and command-review
      // tickets and only returns tickets for the current pending approver step.
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((ticket) =>
      [ticket.title, ticket.serial_num, ticket.applicant, getTypeLabel(ticket.type)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [tickets, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const decide = async (ticket: Ticket, action: 'approve' | 'reject') => {
    setActiveMenu(null);
    const label = action === 'approve' ? 'Approve' : 'Reject';
    if (!window.confirm(`${label} ticket "${ticket.title}"?`)) return;

    const type = getTypeValue(ticket.type);
    if (type !== 'apply_asset' && type !== 'command_confirm') {
      setError('Unsupported approval ticket type');
      return;
    }

    setProcessing(`${ticket.id}:${action}`);
    setError('');
    try {
      const approvalPayload =
        type === 'apply_asset'
          ? {
              type: 'apply_asset',
              apply_nodes: (ticket.apply_nodes || []).map((node) => node.id),
              apply_assets: (ticket.apply_assets || []).map((asset) => asset.id),
              apply_accounts: ticket.apply_accounts || [],
              org_id: ticket.org_id,
              apply_actions: (ticket.apply_actions || []).map((action) => action.value),
              apply_date_start: ticket.apply_date_start,
              apply_date_expired: ticket.apply_date_expired,
            }
          : {
              type: 'command_confirm',
              org_id: ticket.org_id,
            };

      const response = await apiClient.put(
        `/portal-api/approvals/${ticket.id}/${action}`,
        approvalPayload,
      );
      if (!response.data?.success) {
        throw new Error(response.data?.message || `Failed to ${action} ticket`);
      }
      setSelectedTicket(null);
      await loadApprovals();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          (err instanceof Error ? err.message : `Failed to ${action} ticket`),
      );
    } finally {
      setProcessing(null);
    }
  };

  const selectedType = getTypeValue(selectedTicket?.type);

  return (
    <div className="flex-1 p-4 sm:p-8 bg-surface-2 overflow-y-auto flex flex-col relative">
      <div className="flex flex-col gap-4 bg-surface rounded-xl shadow-sm border border-line min-h-[500px]">
        <div className="flex items-center justify-end p-4 border-b border-line/60">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-fg-3" />
              </div>
              <Input
                placeholder="Search"
                className="w-full pl-9 pr-8 h-9 text-sm border-line bg-surface-2 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={loadApprovals}
              disabled={loading}
              className="h-9 w-9"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="mx-4 rounded-md border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="overflow-x-auto" style={{ minHeight: '300px' }}>
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-2/50 text-fg-2 font-medium border-b border-line/60">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">No.</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-fg-3">
                    Loading approval requests...
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-fg-3">
                    No approval requests found.
                  </td>
                </tr>
              ) : (
                pageItems.map((ticket) => (
                  <tr key={`${getTypeValue(ticket.type)}:${ticket.id}`} className="border-b border-line/60 hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <button className="text-brand hover:underline" onClick={() => setSelectedTicket(ticket)}>
                        {ticket.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-fg-2">{ticket.serial_num}</td>
                    <td className="px-4 py-3 text-fg-2">{getTypeLabel(ticket.type)}</td>
                    <td className="px-4 py-3 text-fg-2">{ticket.applicant || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium border rounded ${stateClass(
                          getStateValue(ticket.state),
                        )}`}
                      >
                        {typeof ticket.state === 'string'
                          ? ticket.state
                          : ticket.state?.label || 'Pending approval'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-2">{ticket.date_created || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 relative">
                        <Button
                          size="sm"
                          className="bg-brand hover:bg-brand-hover text-white h-7 px-3 text-xs rounded"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 w-7 p-0 border-brand/30 text-brand rounded"
                          onClick={() => setActiveMenu(activeMenu === ticket.id ? null : ticket.id)}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                        {activeMenu === ticket.id && (
                          <div className="absolute right-0 top-8 w-32 bg-surface rounded-md shadow-lg border border-line z-10 py-1">
                            <button
                              disabled={!!processing}
                              onClick={() => decide(ticket, 'approve')}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              disabled={!!processing}
                              onClick={() => decide(ticket, 'reject')}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-surface-2 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-line/60 mt-auto text-sm text-fg-2">
          <div>
            {filtered.length === 0
              ? 'Total 0'
              : `Showing ${(safePage - 1) * PAGE_SIZE + 1}-${Math.min(
                  safePage * PAGE_SIZE,
                  filtered.length,
                )} of ${filtered.length}`}
          </div>
          <div className="flex items-center gap-2">
            <span>25/page</span>
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 flex items-center justify-center border border-line rounded bg-surface disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-16 text-center">
              Page {safePage} of {totalPages}
            </span>
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="w-8 h-8 flex items-center justify-center border border-line rounded bg-surface disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm backdrop-blur-sm p-4">
          <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-start justify-between p-6 border-b border-line/60">
              <div>
                <h2 className="text-xl font-medium text-fg">{selectedTicket.title}</h2>
                <p className="text-sm text-fg-3 mt-1">
                  {selectedTicket.applicant} · {selectedTicket.serial_num}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-fg-3 hover:text-fg-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
              <section>
                <h3 className="font-semibold text-fg mb-3">Ticket basic info</h3>
                <div className="grid grid-cols-[160px_1fr] gap-y-3">
                  <span className="text-fg-3">Organization</span>
                  <span>{selectedTicket.org_name || selectedTicket.org_id || '-'}</span>
                  <span className="text-fg-3">Type</span>
                  <span>{getTypeLabel(selectedTicket.type)}</span>
                  <span className="text-fg-3">Applicant</span>
                  <span>{selectedTicket.applicant || '-'}</span>
                  <span className="text-fg-3">Comment</span>
                  <span>{selectedTicket.comment || '-'}</span>
                </div>
              </section>

              {selectedType === 'command_confirm' ? (
                <section className="border-t pt-6">
                  <h3 className="font-semibold text-fg mb-3">Command review info</h3>
                  <div className="grid grid-cols-[160px_1fr] gap-y-3">
                    <span className="text-fg-3">Run user</span>
                    <span>{getRelationValue(selectedTicket.apply_run_user)}</span>
                    <span className="text-fg-3">Asset</span>
                    <span>{selectedTicket.apply_run_asset || '-'}</span>
                    <span className="text-fg-3">Account</span>
                    <span>{selectedTicket.apply_run_account || '-'}</span>
                    <span className="text-fg-3">Command</span>
                    <pre className="whitespace-pre-wrap break-all rounded bg-surface-2 border border-line p-3 text-fg-2 font-mono text-xs">
                      {selectedTicket.apply_run_command || '-'}
                    </pre>
                    <span className="text-fg-3">Session</span>
                    <span>{getRelationValue(selectedTicket.apply_from_session)}</span>
                    <span className="text-fg-3">Command filter</span>
                    <span>{getRelationValue(selectedTicket.apply_from_cmd_filter_acl)}</span>
                  </div>
                </section>
              ) : (
                <section className="border-t pt-6">
                  <h3 className="font-semibold text-fg mb-3">Ticket applied info</h3>
                  <div className="grid grid-cols-[160px_1fr] gap-y-3">
                    <span className="text-fg-3">Nodes</span>
                    <span>{(selectedTicket.apply_nodes || []).map((node) => node.name).join(', ') || '-'}</span>
                    <span className="text-fg-3">Assets</span>
                    <span>{(selectedTicket.apply_assets || []).map((asset) => asset.name).join(', ') || '-'}</span>
                    <span className="text-fg-3">Accounts</span>
                    <span>{(selectedTicket.apply_accounts || []).join(', ') || '-'}</span>
                    <span className="text-fg-3">Actions</span>
                    <span>{(selectedTicket.apply_actions || []).map((action) => action.label).join(', ') || '-'}</span>
                    <span className="text-fg-3">Start</span>
                    <span>{selectedTicket.apply_date_start || '-'}</span>
                    <span className="text-fg-3">Expired</span>
                    <span>{selectedTicket.apply_date_expired || '-'}</span>
                  </div>
                </section>
              )}

              <section className="border-t pt-6">
                <h3 className="font-semibold text-fg mb-3">Approval process</h3>
                <div className="space-y-2">
                  {(selectedTicket.process_map || []).map((step) => (
                    <div
                      key={step.approval_level}
                      className="flex items-center justify-between border rounded px-3 py-2"
                    >
                      <span>Level {step.approval_level}</span>
                      <span className="text-fg-2">
                        {step.state === 'approved'
                          ? `Approved by ${step.processor_display || step.processor || 'Unknown'}`
                          : step.state === 'rejected'
                            ? `Rejected by ${step.processor_display || step.processor || 'Unknown'}`
                            : step.state === 'closed'
                              ? 'Closed'
                              : step.state}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-line/60">
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
              <Button
                disabled={!!processing}
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => decide(selectedTicket, 'reject')}
              >
                Reject
              </Button>
              <Button
                disabled={!!processing}
                className="bg-brand hover:bg-brand-hover text-white"
                onClick={() => decide(selectedTicket, 'approve')}
              >
                Approve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
