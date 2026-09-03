import { useEffect, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AsyncSelect, AsyncSelectOption } from '@/components/AsyncSelect';
import apiClient from '@/lib/axios';

const FLOW_TYPE = 'apply_asset';
const FLOW_TYPE_LABEL = 'Apply for asset';

type ApprovalTarget = 'all' | 'specific' | 'attribute';

type UsersRule = {
  type: string;
  ids?: string[];
  attrs?: unknown[];
  [key: string]: unknown;
};

type TicketFlowForm = {
  type: string;
  approveLevel: 1 | 2;
  level1Target: ApprovalTarget;
  level1Select: string[];
  level1UsersRule?: UsersRule;
  level2Target: ApprovalTarget;
  level2Select: string[];
  level2UsersRule?: UsersRule;
};

const DEFAULT_FORM: TicketFlowForm = {
  type: FLOW_TYPE_LABEL,
  approveLevel: 1,
  level1Target: 'specific',
  level1Select: [],
  level2Target: 'specific',
  level2Select: [],
};

function getResponseResults(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function targetFromUsersRule(users?: UsersRule): ApprovalTarget {
  if (!users) return 'specific';
  if (users.type === 'all') return 'all';
  if (users.type === 'attrs') return 'attribute';
  return 'specific';
}

function idsFromUsersRule(users?: UsersRule): string[] {
  return users?.type === 'ids' && Array.isArray(users.ids) ? users.ids : [];
}

export function TicketFlows() {
  const [formData, setFormData] = useState<TicketFlowForm>(DEFAULT_FORM);
  const [savedFormData, setSavedFormData] = useState<TicketFlowForm>(DEFAULT_FORM);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [userOptions, setUserOptions] = useState<AsyncSelectOption[]>([]);
  const [loadingFlow, setLoadingFlow] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSelectedUsers = async (ids: string[]) => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return [];

    const options = await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const response = await apiClient.get(`/api/v1/users/users/${id}/`);
          const user = response.data;
          const label = user?.name || user?.username || id;
          return { value: id, label };
        } catch {
          return { value: id, label: id };
        }
      })
    );

    return options;
  };

  const loadFlow = async () => {
    setLoadingFlow(true);
    setError('');

    try {
      const response = await apiClient.get(`/api/v1/tickets/flows/?type=${FLOW_TYPE}`);
      const flows = getResponseResults(response.data);
      const flow = flows.find((item: any) => item?.type?.value === FLOW_TYPE) || flows[0];

      if (!flow?.id) {
        throw new Error('Ticket flow Apply for asset tidak ditemukan.');
      }

      const rules = Array.isArray(flow.rules) ? flow.rules : [];
      const level1Rule = rules.find((rule: any) => rule.level === 1) || rules[0];
      const level2Rule = rules.find((rule: any) => rule.level === 2) || rules[1];

      const level1Users = level1Rule?.users as UsersRule | undefined;
      const level2Users = level2Rule?.users as UsersRule | undefined;
      const level1Ids = idsFromUsersRule(level1Users);
      const level2Ids = idsFromUsersRule(level2Users);

      const loadedForm: TicketFlowForm = {
        type: FLOW_TYPE_LABEL,
        approveLevel: flow.approval_level?.value === 2 ? 2 : 1,
        level1Target: targetFromUsersRule(level1Users),
        level1Select: level1Ids,
        level1UsersRule: level1Users,
        level2Target: targetFromUsersRule(level2Users),
        level2Select: level2Ids,
        level2UsersRule: level2Users,
      };

      setFlowId(flow.id);
      setFormData(loadedForm);
      setSavedFormData(loadedForm);
      setUserOptions(await loadSelectedUsers([...level1Ids, ...level2Ids]));
    } catch (err: any) {
      console.error('Failed to load ticket flow:', err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to load ticket flow settings.'
      );
    } finally {
      setLoadingFlow(false);
    }
  };

  useEffect(() => {
    loadFlow();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowId) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const buildUsersRule = (
        target: ApprovalTarget,
        ids: string[],
        existingRule?: UsersRule
      ): UsersRule => {
        if (target === 'all') {
          return { type: 'all' };
        }

        if (target === 'attribute') {
          if (existingRule?.type === 'attrs') return existingRule;
          throw new Error('Filter by attribute belum didukung oleh editor ini.');
        }

        return { type: 'ids', ids };
      };

      const rules = [
        {
          users: buildUsersRule(
            formData.level1Target,
            formData.level1Select,
            formData.level1UsersRule
          ),
        },
      ];

      if (formData.approveLevel === 2) {
        rules.push({
          users: buildUsersRule(
            formData.level2Target,
            formData.level2Select,
            formData.level2UsersRule
          ),
        });
      }

      await apiClient.patch(`/api/v1/tickets/flows/${flowId}/`, {
        type: FLOW_TYPE,
        approval_level: formData.approveLevel,
        rules,
      });

      setSuccess('Ticket flow updated successfully.');
      await loadFlow();
    } catch (err: any) {
      console.error('Failed to update ticket flow:', err);
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Failed to update ticket flow.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(savedFormData);
    setError('');
    setSuccess('');
  };

  const setTarget = (level: 1 | 2, target: ApprovalTarget) => {
    setFormData(prev =>
      level === 1
        ? { ...prev, level1Target: target }
        : { ...prev, level2Target: target }
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden flex-1">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 flex flex-col gap-10 overflow-y-auto">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-semibold text-slate-800">Basic</h3>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </div>

            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-start gap-6 px-4">
              <label className="text-sm font-medium text-slate-700 flex items-center justify-end gap-1 mt-2">
                <span className="text-red-500">*</span> Type
              </label>
              <div className="relative max-w-md">
                <select
                  disabled
                  className="w-full h-10 px-3 pr-8 rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-500 focus:outline-none cursor-not-allowed appearance-none"
                  value={FLOW_TYPE_LABEL}
                  aria-label="Ticket flow type"
                >
                  <option value={FLOW_TYPE_LABEL}>{FLOW_TYPE_LABEL}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-semibold text-slate-800">Approval level</h3>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </div>

            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-start gap-6 px-4">
              <label className="text-sm font-medium text-slate-700 flex items-center justify-end gap-1">
                <span className="text-red-500">*</span> Approve level
              </label>
              <div className="flex items-center gap-6">
                {[1, 2].map(level => (
                  <label key={level} className="flex items-center gap-2 cursor-pointer group">
                    <div className={cn(
                      'w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90',
                      formData.approveLevel === level
                        ? 'border-[#009688]'
                        : 'border-slate-300 group-hover:border-[#009688]'
                    )}>
                      {formData.approveLevel === level && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
                    </div>
                    <span className="text-sm text-slate-700">{level === 1 ? 'One level' : 'Two level'}</span>
                    <input
                      type="radio"
                      className="hidden"
                      checked={formData.approveLevel === level}
                      onChange={() => setFormData(prev => ({ ...prev, approveLevel: level as 1 | 2 }))}
                    />
                  </label>
                ))}
              </div>

              <label className="text-sm font-medium text-slate-700 flex items-center justify-end gap-1 mt-3">
                <span className="text-red-500">*</span> Approval process
              </label>

              <div className="flex flex-col gap-4">
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-700">1 Level approval</div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-6">
                      {[
                        ['all', 'All users'],
                        ['specific', 'Specific users'],
                        ['attribute', 'Filter by attribute'],
                      ].map(([target, label]) => (
                        <label key={`level1-${target}`} className="flex items-center gap-2 cursor-pointer group">
                          <div className={cn(
                            'w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90',
                            formData.level1Target === target ? 'border-[#009688]' : 'border-slate-300 group-hover:border-[#009688]'
                          )}>
                            {formData.level1Target === target && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
                          </div>
                          <span className="text-sm text-slate-700">{label}</span>
                          <input
                            type="radio"
                            className="hidden"
                            checked={formData.level1Target === target}
                            onChange={() => setTarget(1, target as ApprovalTarget)}
                          />
                        </label>
                      ))}
                    </div>
                    {formData.level1Target === 'specific' && (
                      <AsyncSelect
                        endpoint="/api/v1/users/users/suggestions/"
                        placeholder="Select"
                        emptyText="No users found."
                        value={formData.level1Select}
                        initialOptions={userOptions}
                        onChange={(val) => setFormData(prev => ({ ...prev, level1Select: val }))}
                      />
                    )}
                    {formData.level1Target === 'attribute' && (
                      <p className="text-xs text-slate-500">Existing attribute rules are preserved. Attribute editing is not exposed here yet.</p>
                    )}
                  </div>
                </div>

                {formData.approveLevel === 2 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-700">2 Level approval</div>
                    <div className="p-5 flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-6">
                        {[
                          ['all', 'All users'],
                          ['specific', 'Specific users'],
                          ['attribute', 'Filter by attribute'],
                        ].map(([target, label]) => (
                          <label key={`level2-${target}`} className="flex items-center gap-2 cursor-pointer group">
                            <div className={cn(
                              'w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90',
                              formData.level2Target === target ? 'border-[#009688]' : 'border-slate-300 group-hover:border-[#009688]'
                            )}>
                              {formData.level2Target === target && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
                            </div>
                            <span className="text-sm text-slate-700">{label}</span>
                            <input
                              type="radio"
                              className="hidden"
                              checked={formData.level2Target === target}
                              onChange={() => setTarget(2, target as ApprovalTarget)}
                            />
                          </label>
                        ))}
                      </div>
                      {formData.level2Target === 'specific' && (
                        <AsyncSelect
                          endpoint="/api/v1/users/users/suggestions/"
                          placeholder="Select"
                          emptyText="No users found."
                          value={formData.level2Select}
                          initialOptions={userOptions}
                          onChange={(val) => setFormData(prev => ({ ...prev, level2Select: val }))}
                        />
                      )}
                      {formData.level2Target === 'attribute' && (
                        <p className="text-xs text-slate-500">Existing attribute rules are preserved. Attribute editing is not exposed here yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {(error || success) && (
            <div className={cn(
              'mx-4 rounded-md border px-4 py-3 text-sm',
              error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            )}>
              {error || success}
            </div>
          )}
        </div>

        <div className="mt-auto bg-slate-50 border-t border-slate-200 p-6 flex justify-end items-center shrink-0">
          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleReset}
              disabled={loading || loadingFlow}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading || loadingFlow || !flowId}
              className="px-8 py-2.5 rounded-lg text-sm font-semibold bg-[#009688] text-white hover:bg-[#00796B] hover:shadow-lg hover:shadow-[#009688]/30 transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading || loadingFlow ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {loadingFlow ? 'Loading...' : 'Submitting...'}
                </>
              ) : 'Submit'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
