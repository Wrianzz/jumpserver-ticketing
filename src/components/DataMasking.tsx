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
type Rule = { name: string; match: string; value: string };

type MaskingItem = {
  id: string; name: string; priority?: number; is_active?: boolean; comment?: string;
  fields_pattern?: string; masking_method?: string | { value?: string; label?: string };
};

type MaskingDetail = MaskingItem & {
  users?: { type?: string; ids?: string[]; attrs?: Array<{ name?: string; match?: string; value?: unknown }> };
  assets?: { type?: string; ids?: string[]; attrs?: Array<{ name?: string; match?: string; value?: unknown }> };
  accounts?: string[]; mask_pattern?: string;
};

type FormState = {
  name: string; priority: string;
  userTarget: TargetMode; users: string[]; userAttrs: Rule[];
  assetTarget: TargetMode; assets: string[]; assetAttrs: Rule[];
  accountTarget: AccountMode; accountNames: string[];
  fieldsPattern: string; maskingMethod: 'fixed_char' | 'hide_middle' | 'keep_prefix' | 'keep_suffix';
  maskPattern: string; active: boolean; comment: string;
};

const rule = (): Rule => ({ name: '', match: 'exact', value: '' });
const emptyForm = (): FormState => ({
  name: '', priority: '50',
  userTarget: 'all', users: [], userAttrs: [rule()],
  assetTarget: 'all', assets: [], assetAttrs: [rule()],
  accountTarget: 'all', accountNames: [],
  fieldsPattern: 'password', maskingMethod: 'fixed_char', maskPattern: '######',
  active: true, comment: '',
});

const methodValue = (m: MaskingItem['masking_method']) => typeof m === 'string' ? m : m?.value || '';
const methodLabel = (m: MaskingItem['masking_method']) => {
  if (typeof m === 'object' && m?.label) return m.label;
  const v = methodValue(m);
  if (v === 'fixed_char') return 'Fixed Character Replacement';
  if (v === 'hide_middle') return 'Hide Middle Characters';
  if (v === 'keep_prefix') return 'Keep Prefix Only';
  if (v === 'keep_suffix') return 'Keep Suffix Only';
  return v || '-';
};

const parseTarget = (target: MaskingDetail['users']): { mode: TargetMode; ids: string[]; attrs: Rule[] } => {
  if (target?.type === 'ids') return { mode: 'specific', ids: target.ids || [], attrs: [rule()] };
  if (target?.type === 'attrs') return {
    mode: 'attribute', ids: [],
    attrs: (target.attrs || []).map((x) => ({
      name: x.name || '', match: x.match || 'exact',
      value: Array.isArray(x.value) ? x.value.join(', ') : String(x.value ?? ''),
    })).concat((target.attrs || []).length ? [] : [rule()]),
  };
  return { mode: 'all', ids: [], attrs: [rule()] };
};

const parseAccounts = (accounts: string[] = []): { mode: AccountMode; names: string[] } => {
  if (accounts.includes('@ALL')) return { mode: 'all', names: [] };
  if (accounts.includes('@SPEC')) return {
    mode: 'specific',
    names: accounts.filter((x) => x !== '@SPEC' && !x.startsWith('@') && !x.startsWith('!')),
  };
  const excluded = accounts.filter((x) => x.startsWith('!')).map((x) => x.slice(1));
  if (excluded.length) return { mode: 'exclude', names: excluded };
  if (accounts.length) return { mode: 'specific', names: accounts.filter((x) => !x.startsWith('@')) };
  return { mode: 'none', names: [] };
};

const targetPayload = (mode: TargetMode, ids: string[], attrs: Rule[]) => {
  if (mode === 'all') return { type: 'all' };
  if (mode === 'specific') return { type: 'ids', ids };
  return { type: 'attrs', attrs: attrs.filter((x) => x.name.trim() && x.value.trim()).map((x) => ({
    name: x.name.trim(), match: x.match,
    value: x.value.includes(',') ? x.value.split(',').map((v) => v.trim()).filter(Boolean)
      : x.value.trim() === 'true' ? true : x.value.trim() === 'false' ? false : x.value.trim(),
  })) };
};

const accountPayload = (mode: AccountMode, values: string[]) => {
  const names = values.map((x) => x.trim()).filter(Boolean);
  if (mode === 'all') return ['@ALL'];
  if (mode === 'specific') return ['@SPEC'].concat(names);
  if (mode === 'exclude') return names.map((x) => '!' + x);
  return [];
};

const errorMessage = (error: any, fallback: string) => {
  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data?.msg) return data.msg;
  if (data?.message) return data.message;
  if (data && typeof data === 'object') {
    const first = Object.entries(data)[0];
    if (first) return String(first[0]) + ': ' + (Array.isArray(first[1]) ? first[1].join(', ') : String(first[1]));
  }
  return fallback;
};

function RadioGroup<T extends string>({ value, options, onChange }: {
  value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void;
}) {
  return <div className="flex flex-wrap items-center gap-5">
    {options.map((o) => <label key={o.value} className="flex items-center gap-2 cursor-pointer group">
      <div className={cn('w-4 h-4 rounded-full border flex items-center justify-center', value === o.value ? 'border-[#009688]' : 'border-slate-300 group-hover:border-[#009688]')}>
        {value === o.value && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
      </div>
      <span className="text-sm text-slate-600">{o.label}</span>
      <input className="hidden" type="radio" checked={value === o.value} onChange={() => onChange(o.value)} />
    </label>)}
  </div>;
}

const USER_ATTRS: AsyncSelectOption[] = [
  { value: 'name', label: 'Name' }, { value: 'username', label: 'Username' },
  { value: 'email', label: 'Email' }, { value: 'comment', label: 'Comment' },
  { value: 'is_active', label: 'Is active' }, { value: 'is_first_login', label: 'First login' },
  { value: 'system_roles', label: 'System roles' }, { value: 'org_roles', label: 'Org roles' },
  { value: 'groups', label: 'User groups' }, { value: 'labels', label: 'Tags' },
];
const ASSET_ATTRS: AsyncSelectOption[] = [
  { value: 'name', label: 'Name' }, { value: 'address', label: 'Address' },
  { value: 'nodes', label: 'Node' }, { value: 'platform', label: 'Platform' },
  { value: 'category', label: 'Category' }, { value: 'type', label: 'Type' },
  { value: 'protocols', label: 'Protocols' }, { value: 'labels', label: 'Tags' },
  { value: 'comment', label: 'Description' },
];

function AttrEditor({ rules, target, onChange }: { rules: Rule[]; target: 'user' | 'asset'; onChange: (r: Rule[]) => void }) {
  const options = target === 'user' ? USER_ATTRS : ASSET_ATTRS;
  const update = (i: number, patch: Partial<Rule>) => onChange(rules.map((x, n) => n === i ? { ...x, ...patch } : x));
  return <div className="mt-4 space-y-2">
    {rules.map((x, i) => <div key={i} className="grid grid-cols-[1fr_150px_1fr_36px] gap-2">
      <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={x.name} onChange={(e) => update(i, { name: e.target.value })}>
        <option value="">Select attribute</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" value={x.match} onChange={(e) => update(i, { match: e.target.value })}>
        <option value="exact">Equals</option><option value="contains">Contains</option><option value="startswith">Starts with</option>
        <option value="endswith">Ends with</option><option value="in">In</option><option value="not">Not equal</option>
        <option value="regex">Regex</option><option value="m2m_any">M2M any</option><option value="m2m_all">M2M all</option>
      </select>
      <Input placeholder="Value (comma-separated if multiple)" value={x.value} onChange={(e) => update(i, { value: e.target.value })} />
      <Button type="button" variant="ghost" size="icon" onClick={() => onChange(rules.length === 1 ? [rule()] : rules.filter((_, n) => n !== i))}><Trash2 className="w-4 h-4 text-red-500" /></Button>
    </div>)}
    <Button type="button" variant="outline" size="sm" onClick={() => onChange(rules.concat([rule()]))}><Plus className="w-4 h-4 mr-2" /> Add attribute rule</Button>
  </div>;
}

export function DataMasking() {
  const [data, setData] = useState<MaskingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await apiClient.get('/api/v1/acls/data-masking-rules/?limit=200');
      const raw = response.data?.results || response.data || [];
      setData(Array.isArray(raw) ? raw : []);
    } catch (e) { setError(errorMessage(e, 'Failed to load data masking rules from JumpServer.')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return data;
    return data.filter((x) => [x.name, x.comment, x.fields_pattern, methodLabel(x.masking_method)]
      .some((v) => String(v || '').toLowerCase().includes(q)));
  }, [data, searchTerm]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setError(''); setModalOpen(true); };

  const openEdit = async (id: string) => {
    setSaving(true); setError('');
    try {
      const response = await apiClient.get('/api/v1/acls/data-masking-rules/' + encodeURIComponent(id) + '/');
      const item = response.data as MaskingDetail;
      const u = parseTarget(item.users); const a = parseTarget(item.assets); const ac = parseAccounts(item.accounts);
      setForm({
        name: item.name || '', priority: String(item.priority ?? 50),
        userTarget: u.mode, users: u.ids, userAttrs: u.attrs,
        assetTarget: a.mode, assets: a.ids, assetAttrs: a.attrs,
        accountTarget: ac.mode, accountNames: ac.names,
        fieldsPattern: item.fields_pattern || '', maskingMethod: (methodValue(item.masking_method) || 'fixed_char') as FormState['maskingMethod'],
        maskPattern: item.mask_pattern || '', active: item.is_active !== false, comment: item.comment || '',
      });
      setEditingId(id); setModalOpen(true);
    } catch (e) { setError(errorMessage(e, 'Failed to load data masking rule details.')); }
    finally { setSaving(false); }
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required.';
    const priority = Number(form.priority);
    if (!Number.isInteger(priority) || priority < 1 || priority > 100) return 'Priority must be an integer from 1 to 100.';
    if (form.userTarget === 'specific' && form.users.length === 0) return 'Select at least one user.';
    if (form.assetTarget === 'specific' && form.assets.length === 0) return 'Select at least one asset.';
    if (form.userTarget === 'attribute' && !form.userAttrs.some((x) => x.name.trim() && x.value.trim())) return 'Add at least one user attribute rule.';
    if (form.assetTarget === 'attribute' && !form.assetAttrs.some((x) => x.name.trim() && x.value.trim())) return 'Add at least one asset attribute rule.';
    if ((form.accountTarget === 'specific' || form.accountTarget === 'exclude') && form.accountNames.length === 0) return 'Select at least one account.';
    if (!form.fieldsPattern.trim()) return 'Fields pattern is required.';
    if (!form.maskPattern.trim()) return 'Mask pattern is required.';
    return '';
  };

  const submit = async () => {
    const v = validate(); if (v) { setError(v); return; }
    setSaving(true); setError('');
    const payload = {
      priority: Number(form.priority),
      accounts: accountPayload(form.accountTarget, form.accountNames),
      fields_pattern: form.fieldsPattern.trim(),
      masking_method: form.maskingMethod,
      mask_pattern: form.maskPattern.trim(),
      is_active: form.active,
      users: targetPayload(form.userTarget, form.users, form.userAttrs),
      assets: targetPayload(form.assetTarget, form.assets, form.assetAttrs),
      name: form.name.trim(),
      comment: form.comment.trim(),
    };
    try {
      const base = '/api/v1/acls/data-masking-rules/';
      if (editingId) await apiClient.put(base + encodeURIComponent(editingId) + '/', payload);
      else await apiClient.post(base, payload);
      setModalOpen(false); await load();
    } catch (e) { setError(errorMessage(e, editingId ? 'Failed to update data masking rule.' : 'Failed to create data masking rule.')); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this data masking rule from JumpServer?')) return;
    setError('');
    try { await apiClient.delete('/api/v1/acls/data-masking-rules/' + encodeURIComponent(id) + '/'); await load(); }
    catch (e) { setError(errorMessage(e, 'Failed to delete data masking rule.')); }
  };

  return <div className="flex-1 p-4 sm:p-8 bg-slate-50 overflow-y-auto flex flex-col">
    <div className="flex flex-col gap-4 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 gap-4">
        <Button onClick={openCreate} className="bg-[#009688] hover:bg-[#00796B] text-white"><Plus className="w-4 h-4 mr-2" /> Create</Button>
        <div className="flex items-center gap-3">
          <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search" className="pl-9 h-9 bg-slate-50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}><RotateCw className={cn('w-4 h-4', loading && 'animate-spin')} /></Button>
        </div>
      </div>
      {error && !modalOpen && <div className="mx-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left"><thead className="bg-slate-50/50 text-slate-600 border-b border-slate-100">
          <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Fields pattern</th><th className="px-4 py-3">Masking method</th><th className="px-4 py-3">Priority</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Description</th><th className="px-4 py-3 text-right">Actions</th></tr>
        </thead><tbody>
          {loading ? <tr><td colSpan={7} className="py-12 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin inline mr-2" />Loading from JumpServer...</td></tr>
          : filtered.length === 0 ? <tr><td colSpan={7} className="py-12 text-center text-slate-400">No data masking rules found.</td></tr>
          : filtered.map((x) => <tr key={x.id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="px-4 py-3"><button className="text-[#3498db] hover:underline" onClick={() => openEdit(x.id)}>{x.name}</button></td>
            <td className="px-4 py-3">{x.fields_pattern || '-'}</td><td className="px-4 py-3">{methodLabel(x.masking_method)}</td><td className="px-4 py-3">{x.priority ?? 50}</td>
            <td className="px-4 py-3">{x.is_active !== false ? <span className="flex items-center gap-1 text-[#009688]"><CheckCircle2 className="w-4 h-4" /> Yes</span> : 'No'}</td>
            <td className="px-4 py-3">{x.comment || '-'}</td>
            <td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="sm" className="h-7 bg-[#009688] hover:bg-[#00796B]" onClick={() => openEdit(x.id)}>Edit</Button>
              <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="h-7 w-7 p-0"><MoreHorizontal className="w-4 h-4" /></Button></PopoverTrigger>
                <PopoverContent className="w-32 p-1" align="end"><button onClick={() => remove(x.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" />Delete</button></PopoverContent>
              </Popover></div></td>
          </tr>)}
        </tbody></table>
      </div>
      <div className="mt-auto border-t border-slate-100 p-4 text-sm text-slate-600">Total {filtered.length}</div>
    </div>

    {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100"><h2 className="text-xl font-medium text-slate-800">{editingId ? 'Update datamasking' : 'Create datamasking'}</h2>
          <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button></div>
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

          <section className="space-y-5 pb-8 border-b border-dashed border-slate-200"><h3 className="font-semibold text-slate-800">Basic</h3>
            <div className="grid grid-cols-[140px_1fr] gap-6 items-center"><label className="text-sm text-right"><span className="text-red-500">*</span> Name</label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-[140px_1fr] gap-6 items-center"><label className="text-sm text-right">Priority</label><Input type="number" min={1} max={100} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></div>
          </section>

          <section className="pb-8 border-b border-dashed border-slate-200"><h3 className="font-semibold text-slate-800 mb-5">Users</h3>
            <div className="grid grid-cols-[140px_1fr] gap-6 items-start"><label className="text-sm text-right mt-1"><span className="text-red-500">*</span> User</label><div>
              <RadioGroup value={form.userTarget} options={[{ value: 'all', label: 'All users' }, { value: 'specific', label: 'Specific users' }, { value: 'attribute', label: 'Filter by attribute' }]} onChange={(v) => setForm({ ...form, userTarget: v })} />
              {form.userTarget === 'specific' && <div className="mt-4"><AsyncSelect endpoint="/api/v1/users/users/?fields_size=mini" placeholder="Select users" emptyText="No users found." value={form.users} onChange={(v) => setForm({ ...form, users: v })} /></div>}
              {form.userTarget === 'attribute' && <AttrEditor target="user" rules={form.userAttrs} onChange={(v) => setForm({ ...form, userAttrs: v })} />}
            </div></div>
          </section>

          <section className="pb-8 border-b border-dashed border-slate-200"><h3 className="font-semibold text-slate-800 mb-5">Asset</h3>
            <div className="grid grid-cols-[140px_1fr] gap-6 items-start"><label className="text-sm text-right mt-1"><span className="text-red-500">*</span> Asset</label><div>
              <RadioGroup value={form.assetTarget} options={[{ value: 'all', label: 'All assets' }, { value: 'specific', label: 'Specific assets' }, { value: 'attribute', label: 'Filter by attribute' }]} onChange={(v) => setForm({ ...form, assetTarget: v })} />
              {form.assetTarget === 'specific' && <div className="mt-4"><AsyncSelect endpoint="/api/v1/assets/assets/?fields_size=mini" placeholder="Select assets" emptyText="No assets found." value={form.assets} onChange={(v) => setForm({ ...form, assets: v })} /></div>}
              {form.assetTarget === 'attribute' && <AttrEditor target="asset" rules={form.assetAttrs} onChange={(v) => setForm({ ...form, assetAttrs: v })} />}
            </div></div>
          </section>

          <section className="pb-8 border-b border-dashed border-slate-200"><h3 className="font-semibold text-slate-800 mb-5">Accounts</h3>
            <div className="grid grid-cols-[140px_1fr] gap-6 items-start"><label className="text-sm text-right mt-1"><span className="text-red-500">*</span> Account</label><div>
              <RadioGroup value={form.accountTarget} options={[{ value: 'all', label: 'All accounts' }, { value: 'specific', label: 'Specified accounts' }, { value: 'exclude', label: 'Exclude accounts' }, { value: 'none', label: 'None' }]} onChange={(v) => setForm({ ...form, accountTarget: v })} />
              {(form.accountTarget === 'specific' || form.accountTarget === 'exclude') && <div className="mt-4"><AsyncSelect method="POST" endpoint="/api/v1/accounts/accounts/username-suggestions/" postBody={{ assets: form.assets, nodes: [] }} placeholder="Select account" emptyText="No accounts found." value={form.accountNames} onChange={(v) => setForm({ ...form, accountNames: v })} /></div>}
            </div></div>
          </section>

          <section className="pb-8 border-b border-dashed border-slate-200 space-y-5"><h3 className="font-semibold text-slate-800">Rules</h3>
            <div className="grid grid-cols-[140px_1fr] gap-6 items-center"><label className="text-sm text-right">Fields pattern</label><Input value={form.fieldsPattern} onChange={(e) => setForm({ ...form, fieldsPattern: e.target.value })} /></div>
            <div className="grid grid-cols-[140px_1fr] gap-6 items-center"><label className="text-sm text-right">Masking method</label><div className="relative max-w-xl"><select className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm" value={form.maskingMethod} onChange={(e) => setForm({ ...form, maskingMethod: e.target.value as FormState['maskingMethod'] })}>
              <option value="fixed_char">Fixed Character Replacement</option><option value="hide_middle">Hide Middle Characters</option><option value="keep_prefix">Keep Prefix Only</option><option value="keep_suffix">Keep Suffix Only</option>
            </select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div></div>
            <div className="grid grid-cols-[140px_1fr] gap-6 items-center"><label className="text-sm text-right">Mask pattern</label><Input value={form.maskPattern} onChange={(e) => setForm({ ...form, maskPattern: e.target.value })} /></div>
          </section>

          <section className="space-y-5"><h3 className="font-semibold text-slate-800">Other</h3>
            <div className="grid grid-cols-[140px_1fr] gap-6 items-center"><label className="text-sm text-right">Active</label><Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} className="data-[state=checked]:bg-[#009688] data-[state=checked]:border-[#009688]" /></div>
            <div className="grid grid-cols-[140px_1fr] gap-6 items-start"><label className="text-sm text-right mt-2">Description</label><textarea className="w-full h-24 p-3 rounded-md border border-slate-200 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#009688]/20" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></div>
          </section>
        </div>
        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end"><Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button><Button onClick={submit} disabled={saving} className="bg-[#009688] hover:bg-[#00796B] text-white min-w-28">{saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Submit'}</Button></div>
      </div>
    </div>}
  </div>;
}
