import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AsyncSelect } from '@/components/AsyncSelect';

export function TicketFlows() {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'Apply for asset',
    approveLevel: 2,
    level1Target: 'specific',
    level1Select: [] as string[],
    level2Target: 'specific',
    level2Select: [] as string[]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setLoading(false);
  };

  const handleReset = () => {
    setFormData({
      type: 'Apply for asset',
      approveLevel: 2,
      level1Target: 'specific',
      level1Select: [],
      level2Target: 'specific',
      level2Select: []
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden flex-1">
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        
        <div className="p-8 flex flex-col gap-10 overflow-y-auto">
          {/* Basic Section */}
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
                  className="w-full h-10 px-3 pr-8 rounded-md border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#009688]/20 focus:border-[#009688] appearance-none cursor-pointer transition-all hover:border-slate-300"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="Apply for asset">Apply for asset</option>
                  <option value="Apply for node">Apply for node</option>
                  <option value="Command review">Command review</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Approval Level Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-semibold text-slate-800">Approval level</h3>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </div>
            
            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-start gap-6 px-4">
              
              {/* Approve level selection */}
              <label className="text-sm font-medium text-slate-700 flex items-center justify-end gap-1">
                <span className="text-red-500">*</span> Approve level
              </label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90",
                    formData.approveLevel === 1 ? "border-[#009688]" : "border-slate-300 group-hover:border-[#009688]"
                  )}>
                    {formData.approveLevel === 1 && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
                  </div>
                  <span className="text-sm text-slate-700">One level</span>
                  <input 
                    type="radio" 
                    className="hidden" 
                    checked={formData.approveLevel === 1}
                    onChange={() => setFormData({...formData, approveLevel: 1})}
                  />
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={cn(
                    "w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90",
                    formData.approveLevel === 2 ? "border-[#009688]" : "border-slate-300 group-hover:border-[#009688]"
                  )}>
                    {formData.approveLevel === 2 && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
                  </div>
                  <span className="text-sm text-slate-700">Two level</span>
                  <input 
                    type="radio" 
                    className="hidden" 
                    checked={formData.approveLevel === 2}
                    onChange={() => setFormData({...formData, approveLevel: 2})}
                  />
                </label>
              </div>

              {/* Approval process */}
              <label className="text-sm font-medium text-slate-700 flex items-center justify-end gap-1 mt-3">
                <span className="text-red-500">*</span> Approval process
              </label>
              
              <div className="flex flex-col gap-4">
                {/* 1 Level Approval Box */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-700">
                    1 Level approval
                  </div>
                  <div className="p-5 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-6">
                      {['all', 'specific', 'attribute'].map((target) => (
                        <label key={`level1-${target}`} className="flex items-center gap-2 cursor-pointer group">
                          <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90",
                            formData.level1Target === target ? "border-[#009688]" : "border-slate-300 group-hover:border-[#009688]"
                          )}>
                            {formData.level1Target === target && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
                          </div>
                          <span className="text-sm text-slate-700">
                            {target === 'all' ? 'All users' : target === 'specific' ? 'Specific users' : 'Filter by attribute'}
                          </span>
                          <input 
                            type="radio" 
                            className="hidden" 
                            checked={formData.level1Target === target}
                            onChange={() => setFormData({...formData, level1Target: target})}
                          />
                        </label>
                      ))}
                    </div>
                    {formData.level1Target !== 'all' && (
                      <div className="relative">
                        <AsyncSelect 
                          endpoint="/api/v1/users/users/suggestions/"
                          placeholder="Select"
                          emptyText="No users found."
                          value={formData.level1Select}
                          onChange={(val) => setFormData({...formData, level1Select: val})}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2 Level Approval Box */}
                {formData.approveLevel === 2 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-700">
                      2 Level approval
                    </div>
                    <div className="p-5 flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-6">
                        {['all', 'specific', 'attribute'].map((target) => (
                          <label key={`level2-${target}`} className="flex items-center gap-2 cursor-pointer group">
                            <div className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90",
                              formData.level2Target === target ? "border-[#009688]" : "border-slate-300 group-hover:border-[#009688]"
                            )}>
                              {formData.level2Target === target && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
                            </div>
                            <span className="text-sm text-slate-700">
                              {target === 'all' ? 'All users' : target === 'specific' ? 'Specific users' : 'Filter by attribute'}
                            </span>
                            <input 
                              type="radio" 
                              className="hidden" 
                              checked={formData.level2Target === target}
                              onChange={() => setFormData({...formData, level2Target: target})}
                            />
                          </label>
                        ))}
                      </div>
                      {formData.level2Target !== 'all' && (
                        <div className="relative">
                          <AsyncSelect 
                            endpoint="/api/v1/users/users/suggestions/"
                            placeholder="Select"
                            emptyText="No users found."
                            value={formData.level2Select}
                            onChange={(val) => setFormData({...formData, level2Select: val})}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons in Sticky Footer */}
        <div className="mt-auto bg-slate-50 border-t border-slate-200 p-6 flex justify-end items-center shrink-0">
          <div className="flex gap-3 w-full sm:w-auto justify-end">
            <button 
              type="button" 
              onClick={handleReset}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95"
            >
              Reset
            </button>
            <button 
              type="submit" 
              className="px-8 py-2.5 rounded-lg text-sm font-semibold bg-[#009688] text-white hover:bg-[#00796B] hover:shadow-lg hover:shadow-[#009688]/30 transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95 flex items-center justify-center disabled:opacity-70 disabled:pointer-events-none"
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
