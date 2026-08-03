/** @file SearchBar 基于 Fuse.js 的模糊搜索 */
import { useRef, useState, useCallback } from 'react';
import Fuse from 'fuse.js';

interface SearchResult {
  id: string | number;
  title: string;
  excerpt?: string;
}

interface SearchBarProps {
  data: SearchResult[];
  onSearch: (ids: (string | number)[]) => void;
  placeholder?: string;
}

export function SearchBar({ data, onSearch, placeholder = '搜索…' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fuse = useRef<Fuse<SearchResult> | null>(null);
  if (!fuse.current) {
    fuse.current = new Fuse<SearchResult>(data, { keys: ['title'], threshold: 0.4 });
  }

  const handleInput = useCallback((val: string) => {
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!val.trim()) {
        onSearch([]);
        return;
      }
      const results = fuse.current!.search(val.trim());
      onSearch(results.map(r => r.item.id));
    }, 200);
  }, [onSearch]);

  return (
    <input
      value={query}
      onChange={e => handleInput(e.target.value)}
      placeholder={placeholder}
      className="px-4 py-2 rounded-lg bg-surface-hover border border-border text-sm font-body focus:outline-none focus:border-primary w-full"
    />
  );
}
