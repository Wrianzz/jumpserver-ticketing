import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, RotateCw, Plus, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const MOCK_DATA = [
  {
    id: 1,
    title: 'a',
    no: '202608270005',
    type: 'Apply for asset',
    state: 'Open',
    date: '08/27/2026 15:41:12',
  },
  {
    id: 2,
    title: 'Prod DB Access',
    no: '202608280012',
    type: 'Apply for node',
    state: 'Approved',
    date: '08/28/2026 09:12:00',
  },
  {
    id: 3,
    title: 'Emergency Web Restart',
    no: '202608280014',
    type: 'Apply for asset',
    state: 'Rejected',
    date: '08/28/2026 10:05:44',
  }
];

export function History() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex-1 p-4 sm:p-8 bg-slate-50 overflow-y-auto flex flex-col">
      <div className="flex flex-col gap-4 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[500px]">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <Link to="/create">
            <Button className="bg-[#009688] hover:bg-[#00796B] text-white flex items-center gap-2 rounded-none px-4 py-2 h-9 text-sm font-normal">
              <Plus className="w-4 h-4" />
              New ticket
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </Link>

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
                    Title
                    <div className="flex flex-col opacity-30 group-hover:opacity-100">
                      <ChevronDown className="w-2 h-2 rotate-180 -mb-[2px]" />
                      <ChevronDown className="w-2 h-2" />
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    No.
                    <div className="flex flex-col opacity-30 group-hover:opacity-100">
                      <ChevronDown className="w-2 h-2 rotate-180 -mb-[2px]" />
                      <ChevronDown className="w-2 h-2" />
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    Type
                    <div className="flex flex-col opacity-30 group-hover:opacity-100">
                      <ChevronDown className="w-2 h-2 rotate-180 -mb-[2px]" />
                      <ChevronDown className="w-2 h-2" />
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    State
                    <div className="flex flex-col opacity-30 group-hover:opacity-100">
                      <ChevronDown className="w-2 h-2 rotate-180 -mb-[2px]" />
                      <ChevronDown className="w-2 h-2" />
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 group cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    Date
                    <div className="flex flex-col opacity-30 group-hover:opacity-100">
                      <ChevronDown className="w-2 h-2 rotate-180 -mb-[2px]" />
                      <ChevronDown className="w-2 h-2" />
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DATA.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-center">
                    <Checkbox className="border-slate-300 data-[state=checked]:bg-[#009688] data-[state=checked]:border-[#009688]" />
                  </td>
                  <td className="px-4 py-3">
                    <a href="#" className="text-[#009688] hover:underline">{row.title}</a>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.no}</td>
                  <td className="px-4 py-3 text-slate-700">{row.type}</td>
                  <td className="px-4 py-3">
                    <span className={
                      `inline-flex px-2 py-0.5 text-xs font-medium border rounded ` + 
                      (row.state === 'Approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                       row.state === 'Rejected' ? 'bg-red-50 text-red-600 border-red-200' : 
                       'bg-blue-50 text-blue-600 border-blue-200')
                    }>
                      {row.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.date}</td>
                  <td className="px-4 py-3 text-right">
                    {row.state === 'Approved' || row.state === 'Rejected' ? (
                      <span className="text-slate-400 mr-4">-</span>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 text-xs px-3">
                        Cancel
                      </Button>
                    )}
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
    </div>
  );
}
