// Form validation utilities
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateField(value: any, rules: ValidationRule, fieldName: string): string | null {
  // Required validation
  if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return rules.message || `${fieldName} harus diisi`;
  }

  // Skip other validations if value is empty and not required
  if (!value || (typeof value === 'string' && !value.trim())) {
    return null;
  }

  // Min length validation
  if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
    return rules.message || `${fieldName} minimal ${rules.minLength} karakter`;
  }

  // Max length validation
  if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
    return rules.message || `${fieldName} maksimal ${rules.maxLength} karakter`;
  }

  // Pattern validation
  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    return rules.message || `${fieldName} format tidak valid`;
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(value);
  }

  return null;
}

export function validateForm(data: Record<string, any>, rules: Record<string, ValidationRule>): ValidationResult {
  const errors: Record<string, string> = {};
  let isValid = true;

  for (const [fieldName, fieldRules] of Object.entries(rules)) {
    const error = validateField(data[fieldName], fieldRules, fieldName);
    if (error) {
      errors[fieldName] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

// Common validation rules
export const commonRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || 'Field ini harus diisi'
  }),
  
  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || `Minimal ${min} karakter`
  }),
  
  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || `Maksimal ${max} karakter`
  }),
  
  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || 'Format email tidak valid'
  }),
  
  phone: (message?: string): ValidationRule => ({
    pattern: /^(\+62|62|0)[0-9]{9,13}$/,
    message: message || 'Format nomor telepon tidak valid'
  }),
  
  username: (message?: string): ValidationRule => ({
    pattern: /^[a-zA-Z0-9_]{3,20}$/,
    message: message || 'Username hanya boleh huruf, angka, dan underscore (3-20 karakter)'
  }),
  
  password: (message?: string): ValidationRule => ({
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
    message: message || 'Password minimal 6 karakter dengan huruf besar, huruf kecil, dan angka'
  }),
  
  number: (message?: string): ValidationRule => ({
    pattern: /^\d+$/,
    message: message || 'Hanya boleh angka'
  }),
  
  positiveNumber: (message?: string): ValidationRule => ({
    custom: (value) => {
      const num = Number(value);
      if (isNaN(num) || num <= 0) {
        return message || 'Harus berupa angka positif';
      }
      return null;
    }
  })
};

// Form validation hooks
export function useFormValidation<T extends Record<string, any>>(
  initialData: T,
  rules: Record<keyof T, ValidationRule>
) {
  const [data, setData] = React.useState<T>(initialData);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validate = React.useCallback(() => {
    const result = validateForm(data, rules);
    setErrors(result.errors);
    return result.isValid;
  }, [data, rules]);

  const validateField = React.useCallback((fieldName: keyof T) => {
    const fieldRules = rules[fieldName];
    if (!fieldRules) return;

    const error = validateField(data[fieldName], fieldRules, String(fieldName));
    setErrors(prev => ({
      ...prev,
      [fieldName]: error || ''
    }));
  }, [data, rules]);

  const setValue = React.useCallback((fieldName: keyof T, value: any) => {
    setData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldName as string]) {
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
    }
  }, [errors]);

  const setTouchedField = React.useCallback((fieldName: keyof T) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  }, [validateField]);

  const reset = React.useCallback(() => {
    setData(initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  return {
    data,
    errors,
    touched,
    isValid: Object.keys(errors).length === 0,
    setValue,
    setTouchedField,
    validate,
    reset
  };
}

// Import React for hooks
import React from 'react';
