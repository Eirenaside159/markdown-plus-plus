import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { FieldType } from '@/lib/metaAnalyzer';
import { MetaDatePicker } from '@/components/MetaDatePicker';

interface DynamicFieldProps {
  fieldKey: string;
  fieldLabel: string;
  fieldType: FieldType;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  suggestions?: unknown[];
}


export function DynamicField({ fieldKey, fieldLabel, fieldType, value, onChange, suggestions }: DynamicFieldProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [arrayInput, setArrayInput] = useState('');

  // Array value for display
  const arrayValue = Array.isArray(value) ? value : [];

  const handleAddArrayItem = () => {
    if (arrayInput.trim()) {
      const newArray = [...arrayValue, arrayInput.trim()];
      onChange(fieldKey, newArray);
      setArrayInput('');
    }
  };

  const handleRemoveArrayItem = (index: number) => {
    const newArray = arrayValue.filter((_, i) => i !== index);
    onChange(fieldKey, newArray);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && fieldType === 'array') {
      e.preventDefault();
      handleAddArrayItem();
    }
  };

  useEffect(() => {
    setShowSuggestions(false);
  }, [value]);

  const renderField = () => {
    switch (fieldType) {
      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(fieldKey, e.target.checked)}
              className="w-4 h-4 rounded border-input bg-background"
            />
            <span className="text-sm">
              {Boolean(value) ? 'Yes' : 'No'}
            </span>
          </label>
        );

      case 'number':
        return (
          <input
            id={`field-${fieldKey}`}
            type="number"
            value={value as number || ''}
            onChange={(e) => onChange(fieldKey, e.target.value ? Number(e.target.value) : '')}
            className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        );

      case 'date':
        // Parse the date value
        const dateValue = value ? new Date(value as string) : undefined;
        const isValidDate = dateValue && !isNaN(dateValue.getTime());
        
        return (
          <MetaDatePicker
            value={isValidDate ? dateValue : undefined}
            onChange={(selectedDate) => {
              if (selectedDate) {
                onChange(fieldKey, format(selectedDate, "yyyy-MM-dd"));
              } else {
                onChange(fieldKey, '');
              }
            }}
            placeholder="Pick a date"
          />
        );

      case 'datetime':
        // Parse the datetime value
        const datetimeValue = value ? new Date(value as string) : undefined;
        const isValidDateTime = datetimeValue && !isNaN(datetimeValue.getTime());
        
        // Extract time from the datetime value
        const currentTime = isValidDateTime 
          ? `${String(datetimeValue.getHours()).padStart(2, '0')}:${String(datetimeValue.getMinutes()).padStart(2, '0')}`
          : '12:00';
        const [timeInput, setTimeInput] = useState(currentTime);
        
        useEffect(() => {
          setTimeInput(currentTime);
        }, [currentTime]);
        
        const handleDateTimeChange = (selectedDate?: Date) => {
          if (!selectedDate) return;
          const [hours, minutes] = timeInput.split(':').map(Number);
          selectedDate.setHours(hours || 0, minutes || 0, 0, 0);
          onChange(fieldKey, selectedDate.toISOString());
        };
        
        const handleTimeChange = (value: string) => {
          setTimeInput(value);
          const [hours, minutes] = value.split(':').map(Number);
          const baseDate = isValidDateTime ? new Date(datetimeValue) : new Date();
          baseDate.setHours(hours || 0, minutes || 0, 0, 0);
          onChange(fieldKey, baseDate.toISOString());
        };
        
        return (
          <MetaDatePicker
            value={isValidDateTime ? datetimeValue : undefined}
            onChange={handleDateTimeChange}
            placeholder="Pick a date and time"
            closeOnSelect={false}
          >
            <div className="space-y-2">
              <label htmlFor={`time-${fieldKey}`} className="text-sm font-medium text-muted-foreground">
                Time
              </label>
              <input
                id={`time-${fieldKey}`}
                type="time"
                value={timeInput}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </MetaDatePicker>
        );

      case 'array':
        return (
          <div className="space-y-2">
            {/* Display current items */}
            {arrayValue.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {arrayValue.map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm"
                  >
                    {String(item)}
                    <button
                      onClick={() => handleRemoveArrayItem(index)}
                      className="inline-flex items-center justify-center ml-1 hover:text-destructive"
                      type="button"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input for new items */}
            <div className="relative">
              <input
                id={`field-${fieldKey}`}
                type="text"
                value={arrayInput}
                onChange={(e) => {
                  setArrayInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={`Add ${fieldKey}...`}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleAddArrayItem}
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Add
              </button>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions && suggestions.length > 0 && arrayInput && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {suggestions
                    .filter(s => 
                      String(s).toLowerCase().includes(arrayInput.toLowerCase()) &&
                      !arrayValue.includes(s)
                    )
                    .slice(0, 10)
                    .map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const newArray = [...arrayValue, suggestion];
                          onChange(fieldKey, newArray);
                          setArrayInput('');
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                      >
                        {String(suggestion)}
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'object':
        return (
          <textarea
            id={`field-${fieldKey}`}
            value={JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(fieldKey, parsed);
              } catch {
                // Invalid JSON, don't update
              }
            }}
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
        );

      default: // string
        // Use textarea for long text fields
        const longTextFields = ['description', 'excerpt', 'summary', 'content', 'bio', 'about'];
        const isLongText = longTextFields.includes(fieldKey.toLowerCase());
        const stringValue = value as string || '';
        
        // Auto-detect text direction (RTL for Arabic, Hebrew, etc.)
        const hasRTLChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(stringValue);
        const textDirection = hasRTLChars ? 'rtl' : 'ltr';
        
        if (isLongText) {
          return (
            <div className="relative">
              <textarea
                id={`field-${fieldKey}`}
                value={stringValue}
                onChange={(e) => onChange(fieldKey, e.target.value)}
                rows={4}
                dir={textDirection}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                style={{ minHeight: '100px' }}
              />
            </div>
          );
        }
        
        return (
          <div className="relative">
            <input
              id={`field-${fieldKey}`}
              type="text"
              value={stringValue}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              dir={textDirection}
              placeholder={`Enter ${fieldLabel.toLowerCase()}...`}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />

            {/* Suggestions dropdown for string fields (exclude title and unique fields) */}
            {showSuggestions && suggestions && suggestions.length > 1 && 
             !['title', 'slug', 'permalink', 'url', 'description', 'excerpt', 'summary'].includes(fieldKey.toLowerCase()) && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {suggestions.slice(0, 10).map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onChange(fieldKey, suggestion)}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                  >
                    {String(suggestion)}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={`field-${fieldKey}`} className="block text-sm font-medium text-foreground cursor-pointer">
        {fieldLabel}
      </label>
      {renderField()}
    </div>
  );
}

