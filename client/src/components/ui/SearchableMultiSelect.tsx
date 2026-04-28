import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface Option {
  id: number | string;
  name: string;
}

interface Props {
  label: string;
  options: Option[];
  selected: (number | string)[];
  onChange: (selected: (number | string)[]) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableMultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = 'All',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 60);
    } else {
      setSearch('');
    }
  }, [open]);

  const filtered = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id: number | string) => {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
    );
  };

  const triggerLabel =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((o) => o.id === selected[0])?.name ?? `${selected.length} selected`
        : `${selected.length} selected`;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">
        {label}
      </label>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-xs border rounded-lg px-2.5 py-1.5 text-left flex items-center justify-between gap-1 transition-colors ${
          selected.length > 0
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
        }`}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          size={10}
          className={`flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-[200] bg-white border border-gray-200 rounded-xl shadow-2xl w-60 overflow-hidden"
          style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)' }}
        >
          {/* Search box */}
          <div className="px-2.5 pt-2.5 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Search size={11} className="text-gray-400 flex-shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400 min-w-0"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Clear all action */}
          {selected.length > 0 && (
            <div className="px-2.5 py-1.5 border-b border-gray-50 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">{selected.length} selected</span>
              <button
                onClick={() => onChange([])}
                className="text-[10px] font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-0.5 rounded-md transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-gray-400">
                No matches for &ldquo;{search}&rdquo;
              </div>
            ) : (
              filtered.map((opt) => {
                const checked = selected.includes(opt.id);
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-colors ${
                      checked ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opt.id)}
                      className="accent-blue-600 w-3 h-3 flex-shrink-0"
                    />
                    <span
                      className={`text-xs truncate ${
                        checked ? 'text-blue-700 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      {opt.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
