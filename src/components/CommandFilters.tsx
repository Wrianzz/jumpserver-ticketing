import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, RotateCw, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2, MoreHorizontal, X, Trash2 } from 'lucide-react';
import { AsyncSelect } from '@/components/AsyncSelect';
import { cn } from '@/lib/utils';

const MOCK_DATA = [
  {
    id: 1,
    name: 'JIT-Command-Review-202608281413',
    commandGroup: '1',
    priority: '50',
    active: true,
    description: '-',
  },
  {
    id: 2,
    name: 'test',
    commandGroup: '0',
    priority: '50',
    active: true,
    description: '-',
  }
];

export function CommandFilters() {
  const [data, setData] = useState(MOCK_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [editItem, setEditItem] = useState<any>(null);
  const [touched, setTouched] = useState({ recipients: false });
  const [formData, setFormData] = useState({
    name: 'test',
    priority: '50',
    userTarget: 'all',
    assetTarget: 'all',
    accountTarget: 'all',
    commandGroup: [] as string[],
    action: 'Review',
    recipients: [] as string[],
    active: true,
    description: ''
  });

  const handleDelete = (id: number) => {
    setData(data.filter(item => item.id !== id));
  };

  return (
    <div className="flex-1 p-4 sm:p-8 bg-slate-50 overflow-y-auto flex flex-col">
      <div className="flex flex-col gap-4 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
        {/* Toolbar */}
        <div className="flex items-center justify-end p-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <Input 
                type="text" 
                placeholder="Search" 
                className="w-full pl-9 pr-8 h-9 text-sm border-slate-200 focus-visible:ring-[#009688]/20 focus-visible:border-[#009688] shadow-none bg-slate-50 rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                 <span className="text-xs text-slate-400 bg-white border border-slate-200 rounded px-1.5 py-0.5">/</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900">
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 text-slate-600 font-medium border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 w-12 text-center">
                  <Checkbox className="border-slate-300 data-[state=checked]:bg-[#009688] data-[state=checked]:border-[#009688]" />
                </th>
                <th className="px-4 py-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    Name
                    <div className="flex flex-col opacity-30 group-hover:opacity-100">
                      <ChevronDown className="w-2 h-2 rotate-180 -mb-[2px]" />
                      <ChevronDown className="w-2 h-2" />
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                  Command group
                </th>
                <th className="px-4 py-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    Priority
                    <div className="flex flex-col opacity-30 group-hover:opacity-100">
                      <ChevronDown className="w-2 h-2 rotate-180 -mb-[2px]" />
                      <ChevronDown className="w-2 h-2" />
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    Active
                    <div className="flex flex-col opacity-30 group-hover:opacity-100">
                      <ChevronDown className="w-2 h-2 rotate-180 -mb-[2px]" />
                      <ChevronDown className="w-2 h-2" />
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    Description
                    <div className="flex flex-col opacity-30 group-hover:opacity-100">
                      <ChevronDown className="w-2 h-2 rotate-180 -mb-[2px]" />
                      <ChevronDown className="w-2 h-2" />
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center">
                    <Checkbox className="border-slate-300 data-[state=checked]:bg-[#009688] data-[state=checked]:border-[#009688]" />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[#3498db] hover:underline cursor-pointer">{row.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[#3498db] hover:underline cursor-pointer">{row.commandGroup}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.priority}</td>
                  <td className="px-4 py-3">
                    {row.active ? (
                      <div className="flex items-center gap-1 text-[#009688]">
                        <CheckCircle2 className="w-4 h-4 fill-current text-white" /> Yes
                      </div>
                    ) : (
                      <span className="text-slate-500">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        size="sm" 
                        className="bg-[#009688] hover:bg-[#00796B] text-white h-7 px-3 text-xs rounded transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95 shadow-sm"
                        onClick={() => {
                          setEditItem(row);
                          setTouched({ recipients: false });
                          setFormData({
                            ...formData, 
                            name: row.name, 
                            priority: row.priority, 
                            commandGroup: row.commandGroup ? [row.commandGroup] : [], 
                            active: row.active, 
                            description: row.description,
                            recipients: []
                          });
                        }}
                      >
                        Edit
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0 border-[#009688]/30 text-[#009688] hover:bg-[#009688]/10 rounded transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95 shadow-sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-32 p-1" align="end" sideOffset={4}>
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="flex items-center w-full gap-2 px-2 py-1.5 text-sm text-red-600 rounded-sm hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 mt-auto text-sm text-slate-600">
          <div>Total {MOCK_DATA.length}</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-slate-200 rounded px-2 py-1 cursor-pointer hover:border-slate-300 hover:shadow-sm hover:-translate-y-px active:scale-95 transition-all duration-200 bg-white">
              <span className="mr-4">15/page</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex gap-1 ml-2">
              <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 hover:shadow-sm hover:-translate-y-px active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center border border-[#009688] rounded bg-[#009688] text-white font-medium hover:shadow-sm hover:-translate-y-px active:scale-95 transition-all duration-200 cursor-pointer">
                1
              </button>
              <button className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 hover:shadow-sm hover:-translate-y-px active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <h2 className="text-xl font-medium text-slate-800">
                Update command filter ACL
              </h2>
              <button 
                onClick={() => setEditItem(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col">
              
              {/* Basic Section */}
              <div className="flex flex-col pb-8 border-b border-dashed border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-800">Basic</h3>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex flex-col gap-6 pl-8">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-600 flex items-center justify-end gap-1">
                      <span className="text-red-500">*</span> Name
                    </label>
                    <Input 
                      className="border-slate-200 focus-visible:ring-[#009688]/20 focus-visible:border-[#009688]"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-600 flex items-center justify-end gap-1">
                      Priority <span className="text-slate-400 text-[10px] border border-slate-200 rounded-full w-3.5 h-3.5 flex items-center justify-center pb-[1px] ml-1 cursor-help">?</span>
                    </label>
                    <Input 
                      className="border-slate-200 focus-visible:ring-[#009688]/20 focus-visible:border-[#009688]"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* User Section */}
              <div className="flex flex-col py-8 border-b border-dashed border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-800">User</h3>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                <div className="pl-8">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-600 flex items-center justify-end gap-1">
                      <span className="text-red-500">*</span> User
                    </label>
                    <div className="flex items-center gap-6">
                      {['all', 'specific', 'attribute'].map((target) => (
                        <label key={`user-${target}`} className="flex items-center gap-2 cursor-pointer group">
                          <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90",
                            formData.userTarget === target ? "border-[#009688]" : "border-slate-300 group-hover:border-[#009688]"
                          )}>
                            {formData.userTarget === target && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
                          </div>
                          <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                            {target === 'all' ? 'All users' : target === 'specific' ? 'Specific users' : 'Filter by attribute'}
                          </span>
                          <input 
                            type="radio" 
                            className="hidden" 
                            checked={formData.userTarget === target}
                            onChange={() => setFormData({...formData, userTarget: target})}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Asset Section */}
              <div className="flex flex-col py-8 border-b border-dashed border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-800">Asset</h3>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                <div className="pl-8">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-600 flex items-center justify-end gap-1">
                      <span className="text-red-500">*</span> Asset
                    </label>
                    <div className="flex items-center gap-6">
                      {['all', 'specific', 'attribute'].map((target) => (
                        <label key={`asset-${target}`} className="flex items-center gap-2 cursor-pointer group">
                          <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90",
                            formData.assetTarget === target ? "border-[#009688]" : "border-slate-300 group-hover:border-[#009688]"
                          )}>
                            {formData.assetTarget === target && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
                          </div>
                          <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">
                            {target === 'all' ? 'All asset' : target === 'specific' ? 'Specific asset' : 'Filter by attribute'}
                          </span>
                          <input 
                            type="radio" 
                            className="hidden" 
                            checked={formData.assetTarget === target}
                            onChange={() => setFormData({...formData, assetTarget: target})}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Section */}
              <div className="flex flex-col py-8 border-b border-dashed border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-800">Account</h3>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                <div className="pl-8">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-600 flex items-center justify-end gap-1">
                      <span className="text-red-500">*</span> Account
                    </label>
                    <div className="flex items-center gap-6">
                      {[
                        { id: 'all', label: 'All accounts', help: true }, 
                        { id: 'specific', label: 'Specified accounts', help: true }, 
                        { id: 'exclude', label: 'Exclude accounts' }, 
                        { id: 'none', label: 'None' }
                      ].map((target) => (
                        <label key={`account-${target.id}`} className="flex items-center gap-2 cursor-pointer group">
                          <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-200 group-active:scale-90",
                            formData.accountTarget === target.id ? "border-[#009688]" : "border-slate-300 group-hover:border-[#009688]"
                          )}>
                            {formData.accountTarget === target.id && <div className="w-2 h-2 rounded-full bg-[#009688]" />}
                          </div>
                          <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors flex items-center gap-1">
                            {target.label}
                            {target.help && <span className="text-slate-400 text-[10px] border border-slate-200 rounded-full w-3.5 h-3.5 flex items-center justify-center pb-[1px] cursor-help">?</span>}
                          </span>
                          <input 
                            type="radio" 
                            className="hidden" 
                            checked={formData.accountTarget === target.id}
                            onChange={() => setFormData({...formData, accountTarget: target.id})}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Command group Section */}
              <div className="flex flex-col py-8 border-b border-dashed border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-800">Command group</h3>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                <div className="pl-8">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-600 flex items-center justify-end gap-1">
                      Command group
                    </label>
                    <div className="relative">
                      <AsyncSelect 
                        endpoint="/api/v1/commands/groups/suggestions/"
                        placeholder="Please select command group"
                        emptyText="No command groups found."
                        value={formData.commandGroup}
                        onChange={(val) => setFormData({...formData, commandGroup: val})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Section */}
              <div className="flex flex-col py-8 border-b border-dashed border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-800">Action</h3>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex flex-col gap-6 pl-8">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-600 flex items-center justify-end gap-1">
                      Action
                    </label>
                    <div className="relative max-w-[200px]">
                      <select 
                        className="w-full h-10 px-3 pr-8 rounded-md border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#009688]/20 focus:border-[#009688] appearance-none cursor-pointer transition-all hover:border-slate-300"
                        value={formData.action}
                        onChange={(e) => setFormData({...formData, action: e.target.value})}
                      >
                        <option value="Review">Review</option>
                        <option value="Allow">Allow</option>
                        <option value="Reject">Reject</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start gap-6">
                    <label className="text-sm text-slate-600 flex items-center justify-end gap-1 mt-2">
                      <span className="text-red-500">*</span> Recipients
                    </label>
                    <div className="relative flex flex-col" onClick={() => setTouched({...touched, recipients: true})}>
                      <div className={cn(
                        "rounded-md transition-all",
                        touched.recipients && formData.recipients.length === 0 
                          ? "border border-red-400 ring-1 ring-red-400/20" 
                          : ""
                      )}>
                        <AsyncSelect 
                          endpoint="/api/v1/users/users/suggestions/"
                          placeholder="Please select recipients"
                          emptyText="No users found."
                          value={formData.recipients}
                          onChange={(val) => {
                            setFormData({...formData, recipients: val});
                            setTouched({...touched, recipients: true});
                          }}
                        />
                      </div>
                      {touched.recipients && formData.recipients.length === 0 && (
                        <span className="text-xs text-red-500 mt-1.5">This field is required.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Other Section */}
              <div className="flex flex-col pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold text-slate-800">Other</h3>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex flex-col gap-6 pl-8">
                  <div className="grid grid-cols-[140px_1fr] items-center gap-6">
                    <label className="text-sm text-slate-600 flex items-center justify-end gap-1">
                      Active
                    </label>
                    <Checkbox 
                      checked={formData.active}
                      onCheckedChange={(c) => setFormData({...formData, active: !!c})}
                      className="border-slate-300 rounded data-[state=checked]:bg-[#009688] data-[state=checked]:border-[#009688] w-4 h-4" 
                    />
                  </div>
                  <div className="grid grid-cols-[140px_1fr] items-start gap-6">
                    <label className="text-sm text-slate-600 flex items-center justify-end gap-1 mt-2">
                      Description
                    </label>
                    <textarea 
                      className="w-full h-24 p-3 rounded-md border border-slate-200 bg-white text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#009688]/20 focus:border-[#009688] transition-all hover:border-slate-300 resize-y"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 shrink-0">
              <div className="flex items-center gap-4 ml-[172px]">
                <Button 
                  type="submit" 
                  onClick={() => setEditItem(null)}
                  className="bg-[#009688] hover:bg-[#00796B] text-white px-8 h-9 rounded font-medium hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95"
                >
                  Submit
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setEditItem(null)}
                  className="border-slate-300 text-slate-600 bg-white hover:bg-slate-50 px-6 h-9 rounded font-medium hover:shadow-md transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95"
                >
                  Reset
                </Button>
              </div>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
