import React, { useState, useEffect, useRef } from 'react';
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

export interface AsyncSelectOption {
  value: string;
  label: string;
}

interface AsyncSelectProps {
  endpoint: string;
  method?: 'GET' | 'POST';
  postBody?: Record<string, unknown>;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
  emptyText: string;
  initialOptions?: AsyncSelectOption[];
}

export function AsyncSelect({
  endpoint,
  method = 'GET',
  postBody = {},
  value = [],
  onChange,
  placeholder,
  emptyText,
  initialOptions = [],
}: AsyncSelectProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<AsyncSelectOption[]>(initialOptions);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const requestIdRef = useRef(0);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (initialOptions.length === 0) return;
    setOptions((prevOptions) => {
      const merged = [...prevOptions];
      initialOptions.forEach((option) => {
        if (!merged.some((existing) => existing.value === option.value)) merged.push(option);
      });
      return merged;
    });
  }, [initialOptions]);

  const fetchOptions = async (query: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const response = method === 'POST'
        ? await apiClient.post(endpoint, { ...postBody, username: query })
        : await apiClient.get(`${endpoint}${endpoint.includes('?') ? '&' : '?'}search=${encodeURIComponent(query)}&limit=10`);

      // The initial request fired when the dropdown opens can finish after a
      // later search request. Ignore stale responses so an old result set
      // cannot overwrite the current search results.
      if (requestId !== requestIdRef.current) return;

      const rawResults = response.data?.results || response.data || [];
      const results = Array.isArray(rawResults) ? rawResults : [];
      const formattedOptions = results
        .map((item: any) => {
          if (typeof item === 'string') return { value: item, label: item };
          const value = item.id || item.value || item.username || item.name;
          const label = item.name || item.username || item.hostname || item.label || item.id || item.value;
          return value && label ? { value, label } : null;
        })
        .filter(Boolean) as AsyncSelectOption[];

      const selectedOptions = value
        .filter((val) => !formattedOptions.some((option) => option.value === val))
        .map((val) => {
          const existing = options.find((option) => option.value === val);
          return existing || { value: val, label: val };
        });

      setOptions([...formattedOptions, ...selectedOptions]);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Error fetching options:', error);
      setOptions((prevOptions) => prevOptions.filter((option) => value.includes(option.value)));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchOptions(debouncedSearch);
  }, [debouncedSearch, open, endpoint, method]);

  const toggleValue = (currentValue: string) => {
    if (value.includes(currentValue)) onChange(value.filter((v) => v !== currentValue));
    else onChange([...value, currentValue]);
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
            {value.length > 0 ? value.map((val) => {
              const label = options.find((opt) => opt.value === val)?.label || val;
              return (
                <span key={val} className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-sm flex items-center gap-1">
                  {label}
                  <button type="button" className="text-slate-400 hover:text-slate-600 transition-colors ml-0.5" onClick={(e) => removeValue(e, val)}>×</button>
                </span>
              );
            }) : <span className="text-slate-500 text-sm">{placeholder}</span>}
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
              </div>
            )}
            {!loading && options.length === 0 && <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={option.value} onSelect={() => toggleValue(option.value)}>
                  <Check className={cn('mr-2 h-4 w-4', value.includes(option.value) ? 'opacity-100' : 'opacity-0')} />
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
