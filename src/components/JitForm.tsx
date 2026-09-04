import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AsyncSelect } from '@/components/AsyncSelect';
import apiClient from '@/lib/axios';

const AVAILABLE_ACTIONS = [
  { id: 'connect', label: 'Connect' },
  { id: 'upload', label: 'Upload' },
  { id: 'download', label: 'Download' },
  { id: 'copy', label: 'Copy' },
  { id: 'paste', label: 'Paste' },
];

const MAX_JIT_DURATION_DAYS = 14;
const formatDateTimeLocal = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");
const getMaxExpiry = (start: string) => formatDateTimeLocal(addDays(new Date(start), MAX_JIT_DURATION_DAYS));

const JUMPSERVER_ORG_ID =
  import.meta.env.VITE_JUMPSERVER_ORG_ID ||
  '00000000-0000-0000-0000-000000000002';

export function JitForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const initialStart = new Date();

  const [formData, setFormData] = useState({
    name: '',
    node: [] as string[],
    asset: [] as string[],
    accountType: 'all',
    specifiedAccount: [] as string[],
    virtualAccounts: false,
    virtualAccountType: 'manual',
    actions: ['connect'],
    dateStart: formatDateTimeLocal(initialStart),
    dateExpired: formatDateTimeLocal(addDays(initialStart, 1)),
    description: '',
  });

  const maxExpiry = getMaxExpiry(formData.dateStart);

  const handleStartChange = (value: string) => {
    const nextMaxExpiry = getMaxExpiry(value);
    setFormData((prev) => ({
      ...prev,
      dateStart: value,
      dateExpired: prev.dateExpired < value
        ? formatDateTimeLocal(addDays(new Date(value), 1))
        : prev.dateExpired > nextMaxExpiry
          ? nextMaxExpiry
          : prev.dateExpired,
    }));
  };

  const handleExpiryChange = (value: string) => {
    const nextMaxExpiry = getMaxExpiry(formData.dateStart);
    setFormData((prev) => ({
      ...prev,
      dateExpired: value > nextMaxExpiry ? nextMaxExpiry : value,
    }));
  };

  const handleActionToggle = (actionId: string) => {
    setFormData((prev) => {
      const current = prev.actions;
      if (current.includes(actionId)) return { ...prev, actions: current.filter((id) => id !== actionId) };
      return { ...prev, actions: [...current, actionId] };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const startDate = new Date(formData.dateStart);
    const expiryDate = new Date(formData.dateExpired);
    const maxExpiryDate = addDays(startDate, MAX_JIT_DURATION_DAYS);

    if (expiryDate < startDate) {
      setError('Expiry date/time cannot be earlier than the start date/time.');
      return;
    }
    if (expiryDate > maxExpiryDate) {
      setError('Expiry date/time cannot be more than 14 days after the start date/time.');
      return;
    }

    setLoading(true);
    try {
      const virtualAccountMarkers: Record<string, string> = {
        manual: '@INPUT',
        same: '@USER',
        anonymous: '@ANON',
      };

      const regularAccounts =
        formData.accountType === 'all'
          ? ['@ALL']
          : formData.accountType === 'specified'
            ? ['@SPEC', ...formData.specifiedAccount]
            : [];

      const virtualAccounts = formData.virtualAccounts
        ? [virtualAccountMarkers[formData.virtualAccountType]]
        : [];

      const payload = {
        org_id: JUMPSERVER_ORG_ID,
        apply_assets: formData.asset,
        apply_accounts: [...regularAccounts, ...virtualAccounts],
        apply_actions: formData.actions,
        apply_date_start: startDate.toISOString(),
        apply_date_expired: expiryDate.toISOString(),
        apply_nodes: formData.node,
        title: formData.name.trim(),
        comment: formData.description.trim(),
      };

      await apiClient.post('/portal-api/tickets', payload);
      setSuccess(true);
      setFormData((prev) => ({ ...prev, name: '', node: [], asset: [], specifiedAccount: [], description: '' }));
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data?.details === 'string' ? err.response.data.details : '') ||
        err.message ||
        'Failed to submit ticket'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const start = new Date();
    setFormData({
      name: '',
      node: [],
      asset: [],
      accountType: 'all',
      specifiedAccount: [],
      virtualAccounts: false,
      virtualAccountType: 'manual',
      actions: ['connect'],
      dateStart: formatDateTimeLocal(start),
      dateExpired: formatDateTimeLocal(addDays(start, 1)),
      description: '',
    });
    setError('');
    setSuccess(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden flex-1">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 grid grid-cols-12 gap-x-8 gap-y-5 overflow-y-auto">
          <div className="col-span-12 flex flex-col gap-1.5">
            <Label htmlFor="name" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ticket Title <span className="text-red-500">*</span></Label>
            <Input id="name" className="w-full border-slate-200 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-[#009688]/20 focus-visible:border-[#009688] outline-none shadow-none" placeholder="e.g., Emergency DB Patching - Case #402" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
          </div>

          <div className="col-span-12 md:col-span-6 flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Node Selection</Label>
            <AsyncSelect endpoint="/api/v1/tickets/apply-nodes/suggestions/" placeholder="Search by Node..." emptyText="No nodes found." value={formData.node} onChange={(val) => setFormData({...formData, node: val})} />
          </div>

          <div className="col-span-12 md:col-span-6 flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Asset Search</Label>
            <AsyncSelect endpoint="/api/v1/tickets/apply-assets/suggestions/" placeholder="Search by IP or Hostname..." emptyText="No assets found." value={formData.asset} onChange={(val) => setFormData({...formData, asset: val})} />
          </div>

          <div className="col-span-12 md:col-span-7 flex flex-col gap-3">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Apply Accounts</Label>
            <div className="flex flex-col gap-4 border border-slate-100 bg-slate-50/50 p-4 rounded-xl">
              <div className="flex flex-wrap items-center gap-6">
                {[{ id: 'all', label: 'All accounts' }, { id: 'specified', label: 'Specified accounts' }, { id: 'none', label: 'None' }].map((type) => (
                  <label key={type.id} className="flex items-center gap-2 cursor-pointer group">
                    <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90", formData.accountType === type.id ? "border-[#009688]" : "border-slate-300 group-hover:border-[#009688]")}>{formData.accountType === type.id && <div className="w-2 h-2 rounded-full bg-[#009688]" />}</div>
                    <span className="text-sm font-normal text-slate-700 group-hover:text-slate-900 transition-colors">{type.label}</span>
                    <input type="radio" className="hidden" checked={formData.accountType === type.id} onChange={() => setFormData({...formData, accountType: type.id})} />
                  </label>
                ))}
              </div>

              {formData.accountType === 'specified' && <div className="w-full"><AsyncSelect endpoint="/api/v1/accounts/accounts/username-suggestions/" method="POST" placeholder="Input (Enter to continue)" emptyText="No accounts found." value={formData.specifiedAccount} onChange={(val) => setFormData({...formData, specifiedAccount: val})} /></div>}
              <div className="h-px bg-slate-200 w-full my-1"></div>
              <div className="flex items-center gap-3"><Checkbox id="virtual-accounts" className="data-[state=checked]:bg-[#009688] data-[state=checked]:border-[#009688]" checked={formData.virtualAccounts} onCheckedChange={(checked) => setFormData({...formData, virtualAccounts: checked === true})} /><Label htmlFor="virtual-accounts" className="text-sm font-medium text-slate-700 cursor-pointer">Virtual accounts</Label></div>
              {formData.virtualAccounts && <div className="w-full"><select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-[#009688]/20 focus:border-[#009688] outline-none" value={formData.virtualAccountType} onChange={(e) => setFormData({...formData, virtualAccountType: e.target.value})}><option value="manual">Manual account</option><option value="same">Same account</option><option value="anonymous">Anonymous account</option></select></div>}
            </div>
          </div>

          <div className="col-span-12 md:col-span-5 flex flex-col gap-3">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Permitted Actions</Label>
            <div className="flex flex-wrap gap-2 h-10 items-center">{AVAILABLE_ACTIONS.map((action) => { const isActive = formData.actions.includes(action.id); return <button key={action.id} type="button" onClick={() => handleActionToggle(action.id)} className={cn("text-[10px] font-bold px-2 py-1 rounded border uppercase transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95", isActive ? "bg-[#009688]/10 text-[#009688] border-[#009688]/30 hover:shadow-sm" : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:shadow-sm hover:text-slate-600")}>{action.label}</button>; })}</div>
          </div>

          <div className="col-span-12 md:col-span-6 flex flex-col gap-1.5">
            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Start Date/Time</Label>
            <input type="datetime-local" step="1" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#009688] focus:ring-2 focus:ring-[#009688]/20 bg-white" value={formData.dateStart} onChange={(e) => handleStartChange(e.target.value)} />
          </div>

          <div className="col-span-12 md:col-span-6 flex flex-col gap-1.5">
            <div className="flex items-center justify-between"><Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Expiry Date/Time</Label><span className="text-[10px] text-slate-400">Max 14 days</span></div>
            <input type="datetime-local" step="1" min={formData.dateStart} max={maxExpiry} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#009688] focus:ring-2 focus:ring-[#009688]/20 bg-white" value={formData.dateExpired} onChange={(e) => handleExpiryChange(e.target.value)} />
          </div>

          <div className="col-span-12 flex flex-col gap-1.5">
            <Label htmlFor="description" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Reason / Description</Label>
            <Textarea id="description" className="w-full border-slate-200 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-[#009688]/20 focus-visible:border-[#009688] outline-none shadow-none resize-none" placeholder="Provide justification for the access request..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} />
          </div>

          {error && <div className="col-span-12 text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md border border-red-100">{error}</div>}
          {success && <div className="col-span-12 text-sm font-medium text-emerald-600 bg-emerald-50 p-3 rounded-md border border-emerald-200">Ticket submitted successfully! An administrator will review your request.</div>}
        </div>

        <div className="mt-auto bg-slate-50 border-t border-slate-200 p-6 flex justify-between items-center shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500"><svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>Request will require secondary approval for high-privilege nodes.</div>
          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <button type="button" className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95" onClick={resetForm}>Discard</button>
            <button type="submit" className="px-8 py-2.5 rounded-lg text-sm font-semibold bg-[#009688] text-white hover:bg-[#00796B] hover:shadow-lg hover:shadow-[#009688]/30 transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95 flex items-center justify-center disabled:opacity-70 disabled:pointer-events-none" disabled={loading || (formData.node.length === 0 && formData.asset.length === 0)}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Submit JIT Payload'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
