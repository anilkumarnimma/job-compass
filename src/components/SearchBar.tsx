import { useState, useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchSuggestions } from "@/hooks/useSearchSuggestions";
import { SearchSuggestions } from "@/components/SearchSuggestions";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: () => void;
  onSuggestionSelect?: (suggestion: string) => void;
}

export function SearchBar({ value, onChange, placeholder = "Search jobs by title, company, skills…", onSearch, onSuggestionSelect }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { suggestions } = useSearchSuggestions(value, isFocused);
  const inputRef = useRef<HTMLInputElement>(null);

  const showSuggestions = isFocused && value.trim().length >= 2 && suggestions.length > 0;

  const handleSelect = useCallback((suggestion: string) => {
    onChange(suggestion);
    setIsFocused(false);
    setHighlightedIndex(-1);
    onSuggestionSelect?.(suggestion);
    onSearch?.();
  }, [onChange, onSuggestionSelect, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, -1));
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex].suggestion);
        return;
      }
      if (e.key === "Escape") {
        setIsFocused(false);
        return;
      }
    }
    if (e.key === "Enter") {
      onSearch?.();
    }
  };

  return (
    <div className="relative group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-accent" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlightedIndex(-1);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        onKeyDown={handleKeyDown}
        className="pl-12 h-12 bg-card border-border/60 rounded-full text-base shadow-soft focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-300 placeholder:text-muted-foreground/50"
        autoComplete="off"
      />
      <SearchSuggestions
        suggestions={suggestions}
        isOpen={showSuggestions}
        onSelect={handleSelect}
        highlightedIndex={highlightedIndex}
        query={value}
      />
    </div>
  );
}
