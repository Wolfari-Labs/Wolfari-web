import { useEffect, useId, useRef, useState } from 'react';
import { Input } from '../../../shared/components/Input';
import type { PackingSuggestion } from '../packing';
import styles from './PackingItemDrawer.module.css';

export function PackingCombobox({ label, value, suggestions, onChange, onSelect, error, placeholder }: {
  label: string;
  value: string;
  suggestions: readonly PackingSuggestion[];
  onChange: (value: string) => void;
  onSelect: (suggestion: PackingSuggestion) => void;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (!containerRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);
  useEffect(() => { setActiveIndex(-1); }, [value, suggestions.length]);
  const choose = (suggestion: PackingSuggestion) => { onSelect(suggestion); setOpen(false); setActiveIndex(-1); };
  return <div className={styles.combobox} ref={containerRef}>
    <Input label={label} value={value} placeholder={placeholder} error={error} autoComplete="off" role="combobox" aria-expanded={open && suggestions.length > 0} aria-controls={listId} aria-activedescendant={activeIndex >= 0 ? `${listId}-${suggestions[activeIndex]?.id}` : undefined} onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value); setOpen(true); }} onKeyDown={(event) => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1)); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((current) => Math.max(current - 1, 0)); }
      else if (event.key === 'Enter' && open && activeIndex >= 0) { event.preventDefault(); const suggestion = suggestions[activeIndex]; if (suggestion) choose(suggestion); }
      else if (event.key === 'Escape') { setOpen(false); setActiveIndex(-1); }
    }} />
    {open && suggestions.length > 0 && <ul className={styles.suggestions} id={listId} role="listbox" aria-label={`${label} suggestions`}>
      {suggestions.map((suggestion, index) => <li key={suggestion.id} id={`${listId}-${suggestion.id}`} role="option" aria-selected={activeIndex === index} className={activeIndex === index ? styles.suggestionActive : ''} onMouseDown={(event) => { event.preventDefault(); choose(suggestion); }}><span>{suggestion.kind.startsWith('create-') ? suggestion.secondary : suggestion.label}</span>{suggestion.kind === 'item' && suggestion.secondary && <small>{suggestion.secondary}</small>}</li>)}
    </ul>}
  </div>;
}
