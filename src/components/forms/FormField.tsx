import React from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { cn } from '../../utils/cn';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel' | 'textarea' | 'select';
  value?: any;
  onChange?: (value: any) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  options?: { value: any; label: string }[];
  className?: string;
}

export function FormField({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  disabled = false,
  options = [],
  className
}: FormFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleSelectChange = (value: string) => {
    if (onChange) {
      onChange(value);
    }
  };

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            id={name}
            name={name}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'transition-all duration-200 min-h-[60px] resize-none',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              disabled && 'opacity-50 cursor-not-allowed bg-muted/50',
              !error && !disabled && 'focus:border-primary focus:ring-primary/20',
              className
            )}
          />
        );
      
      case 'select':
        // Normalize value to string, but don't use empty string (Radix UI doesn't allow it)
        const normalizedValue = value != null ? String(value) : undefined;
        
        // Filter and normalize options - remove any with empty string value
        const validOptions = options
          .filter(option => {
            // Filter out null/undefined options and empty string values
            return option != null && 
                   option.value != null && 
                   String(option.value) !== '';
          })
          .map((option, index) => ({
            ...option,
            value: String(option.value),
            key: `${option.value}-${index}` // Ensure unique key
          }))
          .filter((option, index, self) => 
            // Remove duplicates based on value
            index === self.findIndex((o) => o.value === option.value)
          );
        
        return (
          <Select 
            value={normalizedValue} 
            onValueChange={handleSelectChange} 
            disabled={disabled}
          >
            <SelectTrigger className={cn(
              'transition-all duration-200',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              disabled && 'opacity-50 cursor-not-allowed bg-muted/50',
              !error && !disabled && 'focus:border-primary focus:ring-primary/20',
              className
            )}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {validOptions.length > 0 ? (
                validOptions.map((option) => (
                  <SelectItem 
                    key={option.key || option.value} 
                    value={option.value} 
                    className="cursor-pointer"
                  >
                    {option.label || String(option.value)}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="__empty__" disabled>
                  Tidak ada opsi tersedia
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        );
      
      default:
        return (
          <Input
            id={name}
            name={name}
            type={type}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={cn(
              'transition-all duration-200',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
              disabled && 'opacity-50 cursor-not-allowed bg-muted/50',
              !error && !disabled && 'focus:border-primary focus:ring-primary/20',
              className
            )}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      <Label 
        htmlFor={name} 
        className={cn(
          'text-sm font-medium text-foreground',
          required && 'after:content-["*"] after:ml-0.5 after:text-red-500',
          disabled && 'text-muted-foreground'
        )}
      >
        {label}
      </Label>
      <div className="relative">
        {renderInput()}
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <div className="w-1 h-1 bg-red-500 rounded-full"></div>
          {error}
        </div>
      )}
    </div>
  );
}
