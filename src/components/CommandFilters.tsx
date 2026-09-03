import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AsyncSelect, type AsyncSelectOption } from '@/components/AsyncSelect';
import apiClient from '@/lib/axios';
import { CheckCircle2, ChevronDown, Loader2, MoreHorizontal, Plus, RotateCw, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type TargetMode = 'all' | 'specific' | 'attribute';
type AccountMode = 'all' | 'specific' | 'exclude' | 'none';

type AttributeRule = {
  name: string;
  match: string;
  value: string;
};

type CommandFilterListItem = {
  id: string;
  name: string;
  priority?: number;
  is_active?: boolean;
  comment?: string;
  command_groups_amount?: number;
  action?: string | { value?: string; label?: string };
};

type CommandFilterDetail = CommandFilterListItem & {
  users?: { type?: string; ids?: string[]; attrs?: Array<{ name?: string; match?: string; value?: unknown }> };
  assets?: { type?: string; ids?: string[]; attrs?: Array<{ name?: string; match?: string; value?: unknown }> };
  accounts?: string[];
  command_groups?: Array<string | { id?: string; name?: string }>;
  reviewers?: Array<string | { id?: string; name?: string; username?: string }>;
};

type FormState = {
  id?: string;
  name: string;
  priority: string;
  userTarget: TargetMode;
  users: string[];
  userAttrs: AttributeRule[];
  assetTarget: TargetMode;
  assets: string[];
  assetAttrs: AttributeRule[];
  accountTarget: AccountMode;
  accountNames: string;
  commandGroups: string[];
  action: 'review' | 'accept' | 'reject';
  reviewers: string[];
  active: boolean;
  comment: string;
};

const emptyRule = (): AttributeRule => ({ name: '', match: 'exact', value: '' });

const emptyForm = (): FormState => ({
  name: '',
  priority: '50',
  userTarget: 'all',
  users: [],
  userAttrs: [emptyRule()],
  assetTarget: 'all',
  assets: [],
  assetAttrs: [emptyRule()],
  accountTarget: 'all',
  accountNames: '',
  commandGroups: [],
  action: 'review',
  reviewers: [],
  active: true,
  comment: '',
});

const getActionValue = (action: CommandFilterListItem['action']) =>
  typeof action === 'string' ? action : action?.value || '';

const getActionLabel = (action: CommandFilterListItem['action']) => {
  if (typeof action === 'object' && action?.label) return action.label;
  const value = getActionValue(action);
  return value === 'accept' ? 'Accept' : value === 'reject' ? 'Reject' : value === 'review' ? 'Review' : value || '-';
};

const parseTarget = (target: CommandFilterDetail['users']): { mode: TargetMode; ids: string[]; attrs: AttributeRule[] } => {
  if (target?.type === 'ids') return { mode: 'specific', ids: target.ids || [], attrs: [emptyRule()] };
  if (target?.type === 'attrs') {
    return {
      mode: 'attribute',
      ids: [],
      attrs: (target.attrs || []).map((rule) => ({
        name: rule.name || '',
        match: rule.match || 'exact',
        value: Array.isArray(rule.value) ? rule.value.join(', ') : String(rule.value ?? ''),
      })).concat((target.attrs || []).length ? [] : [emptyRule()]),
    };
  }
  return { mode: 'all', ids: [], attrs: [emptyRule()] };
};

const parseAccounts = (accounts: string[] = []): { mode: AccountMode; names: string } => {
  if (accounts.includes('@ALL')) return { mode: 'all', names: '' };
  if (accounts.includes('@SPEC')) return { mode: 'specific', names: accounts.filter((item) => item !== '@SPEC' && !item.startsWith('@') && !item.startsWith('!')).join(', ') };
  const excluded = accounts.filter((item) => item.startsWith('!')).map((item) => item.slice(1));
  if (excluded.length) return { mode: 'exclude', names: excluded.join(', ') };
  if (accounts.length) return { mode: 'specific', names: accounts.filter((item) => !item.startsWith('@')).join(', ') };
  return { mode: 'none', names: '' };
};

const normalizeIds = (items: Array<string | { id?: string }> = []) =>
  items.map((item) => typeof item === 'string' ? item : item.id).filter(Boolean) as string[];

const parseAttributeValue = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.includes(',')) return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return trimmed;
};

const buildTarget = (mode: TargetMode, ids: string[], attrs: AttributeRule[]) => {
  if (mode === 'all') return { type: 'all' };
  if (mode === 'specific') return { type: 'ids', ids };
  return {
    type: 'attrs',
    attrs: attrs
      .filter((rule) => rule.name.trim() && rule.value.trim())
      .map((rule) => ({ name: rule.name.trim(), match: rule.match, value: parseAttributeValue(rule.value) })),
  };
};

const buildAccounts = (mode: AccountMode, value: string) => {
  const names = value.split(',').map((item) => item.trim()).filter(Boolean);
  if (mode === 'all') return ['@ALL'];
  if (mode === 'specific') return ['@SPEC', ...names];
  if (mode === 'exclude') return names.map((name) => `!${name}`);
  return [];
};

const getErrorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data?.msg) return data.msg;
  if (data?.message) return data.message;
  if (data && typeof data === 'object') {
    const first = Object.entries(data)[0];
    if (first) return `${first[0]}: ${Array.isArray(first[1]) ? first[1].join(', ') : String(first[1])}`;
  }
  return fallback;
};

function RadioGroup<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
          <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center', value === option.value ? 'border-[#009688]' : 'border-slate-300 group-hover:border-[#009688]')}>
            {value === option.value && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
          </div>
          <span className="text-sm text-slate-600">{option.label}</span>
          <input className="hidden" type="radio" checked={value === option.value} onChange={() => onChange(option.value)} />
        </label>
      ))}
    </div>
  );
}

function AttributeEditor({ rules, onChange }: { rules: AttributeRule[]; onChange: (rules: AttributeRule[]) => void }) {
  const updateRule = (index: number, patch: Partial<AttributeRule>) => onChange(rules.map((rule, i) => i === index ? { ...rule, ...patch } : rule));
  return (
    <div className="mt-4 space-y-2">
      {rules.map((rule, index) => (
        <div key={index} className="grid grid-cols-[1fr_150px_1fr_36px] gap-2">
          <Input placeholder="Attribute name" value={rule.name} onChange={(e) => updateRule(index, { name: e.target.value })} />
          <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={rule.match} onChange={(e) => updateRule(index, { match: e.target.value })}>
            <option value="exact">Equals</option>
            <option value="contains">Contains</option>
            <option value="startswith">Starts with</option>
            <option value="endswith">Ends with</option>
            <option value="in">In</option>
            <option value="not">Not equal</option>
            <option value="regex">Regex</option>
            <option value="m2m_any">M2M any</option>
            <option value="m2m_all">M2M all</option>
          </select>
          <Input placeholder="Value (comma-separated if multiple)" value={rule.value} onChange={(e) => updateRule(index, { value: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(rules.length === 1 ? [emptyRule()] : rules.filter((_, i) => i !== index))}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rules, emptyRule()])}>
        <Plus className="w-4 h-4 mr-2" /> Add attribute rule
      </Button>
    </div>
  );
}

export function CommandFilters() {
  const [data, setData] = useState<CommandFilterListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm());
  const [initialCommandGroups, setInitialCommandGroups] = useState<AsyncSelectOption[]>([]);
  const [initialReviewers, setInitialReviewers] = useState<AsyncSelectOption[]>([]);

  const loadFilters = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/api/v1/acls/command-filter-acls/?limit=200');
      const raw = response.data?.results || response.data || [];
      setData(Array.isArray(raw) ? raw : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load command filter ACLs from JumpServer.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFilters(); }, []);

  const filteredData = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter((item) => [item.name, item.comment, getActionLabel(item.action)].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [data, searchTerm]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setInitialCommandGroups([]);
    setInitialReviewers([]);
    setError('');
    setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    setError('');
    setSaving(true);
    try {
      const response = await apiClient.get(`/api/v1/acls/command-filter-acls/${encodeURIComponent(id)}/`);
      const item = response.data as CommandFilterDetail;
      const user = parseTarget(item.users);
      const asset = parseTarget(item.assets);
      const account = parseAccounts(item.accounts);
      const commandGroups = normalizeIds(item.command_groups);
      const reviewers = normalizeIds(item.reviewers);
      setFormData({
        id: item.id,
        name: item.name || '',
        priority: String(item.priority ?? 50),
        userTarget: user.mode,
        users: user.ids,
        userAttrs: user.attrs,
        assetTarget: asset.mode,
        assets: asset.ids,
        assetAttrs: asset.attrs,
        accountTarget: account.mode,
        accountNames: account.names,
        commandGroups,
        action: (getActionValue(item.action) || 'review') as FormState['action'],
        reviewers,
        active: item.is_active !== false,
        comment: item.comment || '',
      });
      setInitialCommandGroups((item.command_groups || []).map((group) => typeof group === 'string' ? { value: group, label: group } : { value: group.id || '', label: group.name || group.id || '' }).filter((option) => option.value));
      setInitialReviewers((item.reviewers || []).map((user) => typeof user === 'string' ? { value: user, label: user } : { value: user.id || '', label: user.name || user.username || user.id || '' }).filter((option) => option.value));
      setEditingId(id);
      setModalOpen(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load command filter details.'));
    } finally {
      setSaving(false);
    }
  };

  const validate = () => {
    if (!formData.name.trim()) return 'Name is required.';
    const priority = Number(formData.priority);
    if (!Number.isInteger(priority) || priority < 1 || priority > 100) return 'Priority must be an integer from 1 to 100.';
    if (formData.userTarget === 'specific' && formData.users.length === 0) return 'Select at least one user.';
    if (formData.assetTarget === 'specific' && formData.assets.length === 0) return 'Select at least one asset.';
    if (formData.userTarget === 'attribute' && !formData.userAttrs.some((r) => r.name.trim() && r.value.trim())) return 'Add at least one user attribute rule.';
    if (formData.assetTarget === 'attribute' && !formData.assetAttrs.some((r) => r.name.trim() && r.value.trim())) return 'Add at least one asset attribute rule.';
    if ((formData.accountTarget === 'specific' || formData.accountTarget === 'exclude') && !formData.accountNames.trim()) return 'Enter at least one account name.';
    if (formData.commandGroups.length === 0) return 'Select at least one command group.';
    if (formData.action === 'review' && formData.reviewers.length === 0) return 'Recipients are required for Review action.';
    return '';
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError('');
    const payload = {
      name: formData.name.trim(),
      priority: Number(formData.priority),
      users: buildTarget(formData.userTarget, formData.users, formData.userAttrs),
      assets: buildTarget(formData.assetTarget, formData.assets, formData.assetAttrs),
      accounts: buildAccounts(formData.accountTarget, formData.accountNames),
      command_groups: formData.commandGroups,
      action: formData.action,
      reviewers: formData.action === 'review' ? formData.reviewers : [],
      is_active: formData.active,
      comment: formData.comment.trim(),
    };
    try {
      if (editingId) await apiClient.put(`/api/v1/acls/command-filter-acls/${encodeURIComponent(editingId)}/`, payload);
      else await apiClient.post('/api/v1/acls/command-filter-acls/', payload);
      setModalOpen(false);
      await loadFilters();
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${editingId ? 'update' : 'create'} command filter ACL.`));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this command filter ACL from JumpServer?')) return;
    setError('');
    try {
      await apiClient.delete(`/api/v1/acls/command-filter-acls/${encodeURIComponent(id)}/`);
      await loadFilters();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete command filter ACL.'));
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-8 bg-slate-50 overflow-y-auto flex flex-col">
      <div className="flex flex-col gap-4 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 gap-4">
          <Button onClick={openCreate} className="bg-[#009688] hover:bg-[#00796B] text-white">
            <Plus className="w-4 h-4 mr-2" /> Create
          </Button>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search" className="pl-9 h-9 bg-slate-50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="ghost" size="icon" onClick={loadFilters} disabled={loading}>
              <RotateCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {error && !modalOpen && <div className="mx-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 text-slate-600 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Command group</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading from JumpServer...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">No command filter ACLs found.</td></tr>
              ) : filteredData.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3"><button className="text-[#3498db] hover:underline" onClick={() => openEdit(row.id)}>{row.name}</button></td>
                  <td className="px-4 py-3 text-[#3498db]">{row.command_groups_amount ?? 0}</td>
                  <td className="px-4 py-3">{row.priority ?? 50}</td>
                  <td className="px-4 py-3">{getActionLabel(row.action)}</td>
                  <td className="px-4 py-3">{row.is_active !== false ? <span className="flex items-center gap-1 text-[#009688]"><CheckCircle2 className="w-4 h-4" /> Yes</span> : 'No'}</td>
                  <td className="px-4 py-3">{row.comment || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" className="h-7 bg-[#009688] hover:bg-[#00796B]" onClick={() => openEdit(row.id)}>Edit</Button>
                      <Popover>
                        <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-4 h-4" /></Button></PopoverTrigger>
                        <PopoverContent className="w-32 p-1" align="end"><button onClick={() => handleDelete(row.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" />Delete</button></PopoverContent>
                      </Popover>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-auto border-t border-slate-100 p-4 text-sm text-slate-600">Total {filteredData.length}</div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-medium text-slate-800">{editingId ? 'Update command filter ACL' : 'Create command filter ACL'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

              <section className="space-y-5 pb-8 border-b border-dashed border-slate-200">
                <h3 className="font-semibold text-slate-800">Basic</h3>
                <div className="grid grid-cols-[140px_1fr] gap-6 items-center"><label className="text-sm text-right"><span className="text-red-500">*</span> Name</label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                <div className="grid grid-cols-[140px_1fr] gap-6 items-center"><label className="text-sm text-right">Priority</label><Input type="number" min={1} max={100} value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} /></div>
              </section>

              <section className="pb-8 border-b border-dashed border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-5">User</h3>
                <div className="grid grid-cols-[140px_1fr] gap-6 items-start"><label className="text-sm text-right mt-1"><span className="text-red-500">*</span> User</label><div><RadioGroup value={formData.userTarget} options={[{ value: 'all', label: 'All users' }, { value: 'specific', label: 'Specific users' }, { value: 'attribute', label: 'Filter by attribute' }]} onChange={(value) => setFormData({ ...formData, userTarget: value })} />{formData.userTarget === 'specific' && <div className="mt-4"><AsyncSelect endpoint="/api/v1/users/users/?fields_size=mini" placeholder="Select users" emptyText="No users found." value={formData.users} onChange={(users) => setFormData({ ...formData, users })} /></div>}{formData.userTarget === 'attribute' && <AttributeEditor rules={formData.userAttrs} onChange={(userAttrs) => setFormData({ ...formData, userAttrs })} />}</div></div>
              </section>

              <section className="pb-8 border-b border-dashed border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-5">Asset</h3>
                <div className="grid grid-cols-[140px_1fr] gap-6 items-start"><label className="text-sm text-right mt-1"><span className="text-red-500">*</span> Asset</label><div><RadioGroup value={formData.assetTarget} options={[{ value: 'all', label: 'All assets' }, { value: 'specific', label: 'Specific assets' }, { value: 'attribute', label: 'Filter by attribute' }]} onChange={(value) => setFormData({ ...formData, assetTarget: value })} />{formData.assetTarget === 'specific' && <div className="mt-4"><AsyncSelect endpoint="/api/v1/assets/assets/?fields_size=mini" placeholder="Select assets" emptyText="No assets found." value={formData.assets} onChange={(assets) => setFormData({ ...formData, assets })} /></div>}{formData.assetTarget === 'attribute' && <AttributeEditor rules={formData.assetAttrs} onChange={(assetAttrs) => setFormData({ ...formData, assetAttrs })} />}</div></div>
              </section>

              <section className="pb-8 border-b border-dashed border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-5">Account</h3>
                <div className="grid grid-cols-[140px_1fr] gap-6 items-start"><label className="text-sm text-right mt-1"><span className="text-red-500">*</span> Account</label><div><RadioGroup value={formData.accountTarget} options={[{ value: 'all', label: 'All accounts' }, { value: 'specific', label: 'Specified accounts' }, { value: 'exclude', label: 'Exclude accounts' }, { value: 'none', label: 'None' }]} onChange={(value) => setFormData({ ...formData, accountTarget: value })} />{(formData.accountTarget === 'specific' || formData.accountTarget === 'exclude') && <Input className="mt-4" placeholder="Account usernames, comma-separated" value={formData.accountNames} onChange={(e) => setFormData({ ...formData, accountNames: e.target.value })} />}</div></div>
              </section>

              <section className="pb-8 border-b border-dashed border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-5">Command group</h3>
                <div className="grid grid-cols-[140px_1fr] gap-6 items-start"><label className="text-sm text-right mt-2"><span className="text-red-500">*</span> Command group</label><AsyncSelect endpoint="/api/v1/acls/command-groups/?fields_size=mini" placeholder="Please select command group" emptyText="No command groups found." value={formData.commandGroups} initialOptions={initialCommandGroups} onChange={(commandGroups) => setFormData({ ...formData, commandGroups })} /></div>
              </section>

              <section className="pb-8 border-b border-dashed border-slate-200 space-y-5">
                <h3 className="font-semibold text-slate-800">Action</h3>
                <div className="grid grid-cols-[140px_1fr] gap-6 items-center"><label className="text-sm text-right">Action</label><div className="relative max-w-[220px]"><select className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm" value={formData.action} onChange={(e) => setFormData({ ...formData, action: e.target.value as FormState['action'] })}><option value="review">Review</option><option value="accept">Accept</option><option value="reject">Reject</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div></div>
                {formData.action === 'review' && <div className="grid grid-cols-[140px_1fr] gap-6 items-start"><label className="text-sm text-right mt-2"><span className="text-red-500">*</span> Recipients</label><AsyncSelect endpoint="/api/v1/users/users/?fields_size=mini" placeholder="Please select recipients" emptyText="No users found." value={formData.reviewers} initialOptions={initialReviewers} onChange={(reviewers) => setFormData({ ...formData, reviewers })} /></div>}
              </section>

              <section className="space-y-5">
                <h3 className="font-semibold text-slate-800">Other</h3>
                <div className="grid grid-cols-[140px_1fr] gap-6 items-center"><label className="text-sm text-right">Active</label><Checkbox checked={formData.active} onCheckedChange={(value) => setFormData({ ...formData, active: !!value })} className="data-[state=checked]:bg-[#009688] data-[state=checked]:border-[#009688]" /></div>
                <div className="grid grid-cols-[140px_1fr] gap-6 items-start"><label className="text-sm text-right mt-2">Description</label><textarea className="w-full h-24 p-3 rounded-md border border-slate-200 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#009688]/20" value={formData.comment} onChange={(e) => setFormData({ ...formData, comment: e.target.value })} /></div>
              </section>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={submit} disabled={saving} className="bg-[#009688] hover:bg-[#00796B] text-white min-w-28">{saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Submit'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
