import React, { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import apiClient from '@/lib/axios';
import { useDebounce } from '@/hooks/use-debounce';

interface Option {
  value: string;
  label: string;
}

interface AsyncSelectProps {
  endpoint: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  emptyText: string;
}

export function AsyncSelect({ endpoint, value = [], onChange, placeholder, emptyText }: AsyncSelectProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const debouncedSearch = useDebounce(search, 300);

  const fetchOptions = async (query: string) => {
    setLoading(true);
    try {
      const response = await apiClient.get(`${endpoint}?search=${query}&limit=10`);
      // Assuming response.data is an array of objects with id and name
      // JumpServer API returns lists in response.data or response.data.results depending on pagination
      const results = response.data.results || response.data;
      const formattedOptions = results.map((item: any) => ({
        value: item.id,
        label: item.name || item.hostname || item.id,
      }));
      
      // Preserve previously selected options that might not be in the current search results
      // This is a simplified approach, ideally we should fetch details for selected IDs too
      setOptions(prevOptions => {
        const newOptions = [...formattedOptions];
        value.forEach(val => {
          if (!newOptions.find(o => o.value === val)) {
            const existingOpt = prevOptions.find(o => o.value === val);
            if (existingOpt) {
              newOptions.push(existingOpt);
            } else {
              // Add a fallback option if we don't have the label
              newOptions.push({ value: val, label: val });
            }
          }
        });
        return newOptions;
      });
    } catch (error) {
      console.error('Error fetching options:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchOptions(debouncedSearch);
    }
  }, [debouncedSearch, open]);

  const toggleValue = (currentValue: string) => {
    if (value.includes(currentValue)) {
      onChange(value.filter((v) => v !== currentValue));
    } else {
      onChange([...value, currentValue]);
    }
  };

  const removeValue = (e: React.MouseEvent, valToRemove: string) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== valToRemove));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          className="w-full min-h-10 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex flex-wrap items-center justify-between rounded-md px-3 py-1.5 cursor-pointer transition-colors"
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1.5 items-center flex-1 pr-2">
            {value.length > 0 ? (
              value.map((val) => {
                const label = options.find((opt) => opt.value === val)?.label || val;
                return (
                  <span
                    key={val}
                    className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-sm flex items-center gap-1"
                  >
                    {label}
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-600 transition-colors ml-0.5"
                      onClick={(e) => removeValue(e, val)}
                    >
                      ×
                    </button>
                  </span>
                );
              })
            ) : (
              <span className="text-slate-500 text-sm">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={`Search ${placeholder.toLowerCase()}...`} 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center p-4 text-sm text-gray-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </div>
            )}
            {!loading && options.length === 0 && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    toggleValue(option.value);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.includes(option.value) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
