import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, RotateCw, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react';

const MOCK_DATA = [
  {
    id: 1,
    title: 'JIT Request - developer - 202608281559',
    no: '202608280004',
    type: 'Apply for asset',
    state: 'Pending approval',
    date: '08/28/2026 15:41:12',
    // Extended data for modal
    organization: 'DEFAULT',
    applicant: 'Administrator(admin)',
    description: 'Automated JIT Ticket Request via API',
    permissionName: 'Created by ticket (JIT Request - developer - 202608281559-4d77)',
    applyAccounts: 'All',
    actions: 'Connect (All protocols), Upload (RDP, SFTP), Download (RDP, SFTP)',
    dateStart: '2026-08-27 10:02:32',
    dateExpired: '2026-08-31 07:02:32',
    asset: 'cptest01(192.168.56.13)'
  },
  {
    id: 2,
    title: 'Prod DB Access',
    no: '202608280012',
    type: 'Apply for node',
    state: 'Pending approval',
    date: '08/28/2026 09:12:00',
    organization: 'DEFAULT',
    applicant: 'Administrator(admin)',
    description: 'Manual Request for Database Debugging',
    permissionName: 'Created by ticket (Prod DB Access)',
    applyAccounts: 'Specified (admin)',
    actions: 'Connect (SSH)',
    dateStart: '2026-08-28 09:15:00',
    dateExpired: '2026-08-28 11:15:00',
    asset: 'db-prod-01(10.0.1.55)'
  }
];

export function Approval() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<typeof MOCK_DATA[0] | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex-1 p-4 sm:p-8 bg-slate-50 overflow-y-auto flex flex-col relative">
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
        <div className="overflow-x-auto" style={{ minHeight: '300px' }}>
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
                    <a href="#" className="text-[#009688] hover:underline" onClick={(e) => { e.preventDefault(); setSelectedTicket(row); }}>{row.title}</a>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.no}</td>
                  <td className="px-4 py-3 text-slate-700">{row.type}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-yellow-50 text-yellow-600 border border-yellow-200 rounded">
                      {row.state}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 relative">
                      <Button size="sm" className="bg-[#009688] hover:bg-[#00796B] text-white h-7 px-3 text-xs rounded" onClick={() => setSelectedTicket(row)}>
                        Details
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 w-7 p-0 border-[#009688]/30 text-[#009688] hover:bg-[#009688]/10 rounded focus:ring-0"
                        onClick={() => setActiveDropdown(activeDropdown === row.id ? null : row.id)}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>

                      {activeDropdown === row.id && (
                        <div 
                          ref={dropdownRef}
                          className="absolute right-0 top-8 w-32 bg-white rounded-md shadow-lg border border-slate-200 z-10 py-1"
                        >
                          <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-all cursor-pointer hover:pl-5">
                            Accept
                          </button>
                          <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-all cursor-pointer hover:pl-5">
                            Reject
                          </button>
                        </div>
                      )}
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

      {/* Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-medium text-slate-800 pr-8 leading-snug">
                {selectedTicket.applicant}: New Ticket - {selectedTicket.title} ({selectedTicket.type})
              </h2>
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 cursor-pointer hover:-translate-y-px active:scale-95 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8">
              
              <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                <h3 className="font-medium text-slate-800">
                  You have a new ticket from {selectedTicket.applicant}
                </h3>
                <span className="text-xs text-slate-400">16 minutes ago</span>
              </div>

              {/* Ticket basic info */}
              <div className="flex flex-col gap-4">
                <h4 className="font-semibold text-slate-800 mb-2">Ticket basic info</h4>
                <div className="grid grid-cols-[180px_1fr] gap-y-4 text-sm">
                  <div className="text-slate-500">Serial number:</div>
                  <div className="text-slate-800">{selectedTicket.no}</div>
                  
                  <div className="text-slate-500">Title:</div>
                  <div className="text-slate-800">{selectedTicket.title}</div>
                  
                  <div className="text-slate-500">Type:</div>
                  <div className="text-slate-800">{selectedTicket.type}</div>
                  
                  <div className="text-slate-500">State:</div>
                  <div className="text-slate-800">{selectedTicket.state}</div>
                  
                  <div className="text-slate-500">Organization:</div>
                  <div className="text-slate-800">{selectedTicket.organization}</div>
                  
                  <div className="text-slate-500">Applicant:</div>
                  <div className="text-slate-800">{selectedTicket.applicant}</div>
                  
                  <div className="text-slate-500">Description:</div>
                  <div className="text-slate-800">{selectedTicket.description}</div>
                </div>
              </div>

              {/* Ticket applied info */}
              <div className="flex flex-col gap-4 border-t border-slate-200 pt-8">
                <h4 className="font-semibold text-slate-800 mb-2">Ticket applied info</h4>
                <div className="grid grid-cols-[180px_1fr] gap-y-4 text-sm">
                  <div className="text-slate-500">Permission name:</div>
                  <div className="text-slate-800">{selectedTicket.permissionName}</div>
                  
                  <div className="text-slate-500">Apply accounts:</div>
                  <div className="text-slate-800">{selectedTicket.applyAccounts}</div>
                  
                  <div className="text-slate-500">Actions:</div>
                  <div className="text-slate-800">{selectedTicket.actions}</div>
                  
                  <div className="text-slate-500">Date start:</div>
                  <div className="text-slate-800">{selectedTicket.dateStart}</div>
                  
                  <div className="text-slate-500">Date expired:</div>
                  <div className="text-slate-800">{selectedTicket.dateExpired}</div>
                  
                  <div className="text-slate-500">Asset:</div>
                  <div className="text-slate-800">{selectedTicket.asset}</div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 bg-slate-50">
              <Button 
                variant="outline" 
                className="border-slate-300 text-slate-700 hover:bg-slate-100 px-6 font-normal"
                onClick={() => setSelectedTicket(null)}
              >
                Reject
              </Button>
              <Button 
                className="bg-[#009688] hover:bg-[#00796B] text-white px-6 font-normal"
                onClick={() => setSelectedTicket(null)}
              >
                Accept
              </Button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
