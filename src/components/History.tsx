import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, RotateCw, Plus, ChevronDown, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '@/lib/axios';

type Ticket = {
  id: string;
  title: string;
  serial_num: string;
  type?: { label?: string };
  state?: { value?: string; label?: string };
  status?: { value?: string; label?: string };
  applicant?: string;
  date_created?: string;
};

const FILTERS = [
  { value: 'pending', label: 'Pending approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function badgeClass(state?: string) {
  if (state === 'approved') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  if (state === 'rejected') return 'bg-red-50 text-red-600 border-red-200';
  return 'bg-blue-50 text-blue-600 border-blue-200';
}

export function History() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadTickets = async () => {
    const token = sessionStorage.getItem('jumpserver_token');
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (selectedStates.length) params.set('states', selectedStates.join(','));

      const response = await apiClient.get(
        `/portal-api/tickets${params.toString() ? `?${params.toString()}` : ''}`
      );
      const data = response.data;

      if (!data?.success) {
        throw new Error(data?.message || 'Failed to load request history');
      }

      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load request history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [selectedStates.join(',')]);

  const visibleTickets = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    // JumpServer uses status.value = "closed" for multiple final states,
    // including approved and rejected tickets. Only hide tickets whose
    // actual state is "closed" (cancelled tickets).
    const activeTickets = tickets.filter(
      (ticket) => ticket.state?.value !== 'closed'
    );

    if (!keyword) return activeTickets;

    return activeTickets.filter((ticket) =>
      [ticket.title, ticket.serial_num, ticket.applicant]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [tickets, searchTerm]);

  const toggleState = (state: string) => {
    setSelectedStates((current) =>
      current.includes(state)
        ? current.filter((value) => value !== state)
        : [...current, state]
    );
  };

  const cancelTicket = async (ticket: Ticket) => {
    if (!window.confirm(`Cancel ticket "${ticket.title}"?`)) return;

    const token = sessionStorage.getItem('jumpserver_token');
    if (!token) return;

    setCancellingId(ticket.id);
    setError('');

    try {
      const response = await apiClient.put(`/portal-api/tickets/${ticket.id}/close`);
      const data = response.data;

      if (!data?.success) {
        throw new Error(data?.message || 'Failed to cancel ticket');
      }

      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel ticket');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto flex flex-col">
      <div className="flex flex-col gap-4 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
        <div className="flex flex-col gap-4 p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <Link to="/create">
              <Button className="bg-[#009688] hover:bg-[#00796B] text-white flex items-center gap-2 rounded-none px-4 py-2 h-9 text-sm font-normal">
                <Plus className="w-4 h-4" /> New ticket <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </Link>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <Input
                  placeholder="Search title, number or applicant"
                  className="w-full pl-9 h-9 text-sm border-slate-200 bg-slate-50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={loadTickets} disabled={loading} className="h-9 w-9">
                <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">State</span>
            {FILTERS.map((filter) => (
              <label key={filter.value} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <Checkbox
                  checked={selectedStates.includes(filter.value)}
                  onCheckedChange={() => toggleState(filter.value)}
                  className="border-slate-300 data-[state=checked]:bg-[#009688] data-[state=checked]:border-[#009688]"
                />
                {filter.label}
              </label>
            ))}
            {selectedStates.length > 0 && (
              <button onClick={() => setSelectedStates([])} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-4 -mb-1 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 text-slate-600 font-medium border-b border-slate-100">
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
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Loading request history...</td></tr>
              ) : visibleTickets.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No requests found.</td></tr>
              ) : visibleTickets.map((ticket) => {
                const state = ticket.state?.value || '';
                const canCancel = state === 'pending';
                return (
                  <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-[#009688] font-medium">{ticket.title}</td>
                    <td className="px-4 py-3 text-slate-700">{ticket.serial_num}</td>
                    <td className="px-4 py-3 text-slate-700">{ticket.type?.label || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{ticket.applicant || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium border rounded ${badgeClass(state)}`}>
                        {ticket.state?.label || ticket.status?.label || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{ticket.date_created || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      {canCancel ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={cancellingId === ticket.id}
                          onClick={() => cancelTicket(ticket)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 text-xs px-3"
                        >
                          {cancellingId === ticket.id ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 mt-auto text-sm text-slate-600">
          Total {visibleTickets.length}
        </div>
      </div>
    </div>
  );
}
