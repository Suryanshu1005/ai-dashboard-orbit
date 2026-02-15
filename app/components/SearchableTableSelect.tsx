'use client';

import { useState, useRef, useEffect } from 'react';
// @ts-ignore - lucide-react will be installed
import { Database, ChevronDown, X } from 'lucide-react';

interface Table {
  name: string;
  type: string;
}

interface SearchableTableSelectProps {
  tables: Table[];
  selectedTable: string;
  onTableSelect: (tableName: string) => void;
  disabled?: boolean;
}

export default function SearchableTableSelect({
  tables,
  selectedTable,
  onTableSelect,
  disabled = false,
}: SearchableTableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredTables = tables.filter((table) =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTableObj = tables.find((t) => t.name === selectedTable);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[focusedIndex]) {
        items[focusedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleSelect = (tableName: string) => {
    onTableSelect(tableName);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredTables[focusedIndex]) {
          handleSelect(filteredTables[focusedIndex].name);
        } else if (filteredTables.length === 1) {
          handleSelect(filteredTables[0].name);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) =>
          prev < filteredTables.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        break;
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTableSelect('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center gap-2 px-3 py-2 text-sm
          border border-gray-300 rounded-lg
          bg-white text-gray-900
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <Database className="h-4 w-4 text-gray-500 flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          {selectedTableObj ? selectedTableObj.name : 'Select a table...'}
        </span>
        {selectedTable && !disabled && (
          <button
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-100 rounded"
            type="button"
          >
            <X className="h-3.5 w-3.5 text-gray-500" />
          </button>
        )}
        <ChevronDown
          className={`h-4 w-4 text-gray-500 flex-shrink-0 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFocusedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search tables..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div
            ref={listRef}
            className="overflow-y-auto max-h-48"
            role="listbox"
          >
            {filteredTables.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No tables found
              </div>
            ) : (
              filteredTables.map((table, index) => (
                <button
                  key={table.name}
                  type="button"
                  onClick={() => handleSelect(table.name)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`
                    w-full text-left px-4 py-2 text-sm
                    hover:bg-gray-100 focus:bg-gray-100 focus:outline-none
                    ${selectedTable === table.name ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                    ${focusedIndex === index ? 'bg-gray-100' : ''}
                  `}
                  role="option"
                  aria-selected={selectedTable === table.name}
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-gray-400" />
                    <span>{table.name}</span>
                    {table.type && (
                      <span className="ml-auto text-xs text-gray-500">
                        {table.type}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

