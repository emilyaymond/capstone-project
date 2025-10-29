import React, { useState, useCallback } from 'react';
import './FormValidation.css';

const FormValidation = ({ 
  children, 
  onSubmit, 
  validationRules = {},
  className = '',
  announceErrors = true 
}) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const announceToScreenReader = useCallback((message) => {
    if (!announceErrors) return;
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, [announceErrors]);

  const validateField = useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      const error = rule.validator(value);
      if (error) {
        return {
          message: rule.message || error,
          type: rule.type || 'error'
        };
      }
    }
    return null;
  }, [validationRules]);

  const validateForm = useCallback((formData) => {
    const newErrors = {};
    let hasErrors = false;

    Object.keys(validationRules).forEach(fieldName => {
      const value = formData.get ? formData.get(fieldName) : formData[fieldName];
      const error = validateField(fieldName, value);
      if (error) {
        newErrors[fieldName] = error;
        hasErrors = true;
      }
    });

    return { errors: newErrors, hasErrors };
  }, [validationRules, validateField]);

  const handleFieldChange = useCallback((name, value) => {
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Validate field if it has been touched
    if (touched[name]) {
      const error = validateField(name, value);
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    }
  }, [errors, touched, validateField]);

  const handleFieldBlur = useCallback((name, value) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
      announceToScreenReader(`Error in ${name}: ${error.message}`);
    }
  }, [validateField, announceToScreenReader]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.target);
    const { errors: validationErrors, hasErrors } = validateForm(formData);

    setErrors(validationErrors);
    setTouched(Object.keys(validationRules).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {}));

    if (hasErrors) {
      setIsSubmitting(false);
      
      // Announce validation errors
      const errorCount = Object.keys(validationErrors).length;
      const errorMessage = `Form submission failed. ${errorCount} error${errorCount > 1 ? 's' : ''} found. Please review and correct the highlighted fields.`;
      announceToScreenReader(errorMessage);
      
      // Focus first error field
      const firstErrorField = Object.keys(validationErrors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.focus();
      }
      
      return;
    }

    try {
      await onSubmit(formData, event);
      announceToScreenReader('Form submitted successfully.');
    } catch (error) {
      announceToScreenReader(`Form submission failed: ${error.message}`);
      setErrors({
        _form: {
          message: error.message || 'An error occurred while submitting the form.',
          type: 'error'
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldProps = useCallback((name) => ({
    'aria-invalid': errors[name] ? 'true' : 'false',
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
    onChange: (e) => handleFieldChange(name, e.target.value),
    onBlur: (e) => handleFieldBlur(name, e.target.value)
  }), [errors, handleFieldChange, handleFieldBlur]);

  const renderError = useCallback((name, error) => (
    <div
      key={name}
      id={`${name}-error`}
      className={`form-validation__error form-validation__error--${error.type}`}
      role="alert"
      aria-live="polite"
    >
      <span className="form-validation__error-icon" aria-hidden="true">
        {error.type === 'warning' ? '⚠️' : '❌'}
      </span>
      <span className="form-validation__error-message">
        {error.message}
      </span>
    </div>
  ), []);

  return (
    <form 
      className={`form-validation ${className}`}
      onSubmit={handleSubmit}
      noValidate
      aria-label="Form with validation"
    >
      {errors._form && renderError('_form', errors._form)}
      
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.props.name) {
          const fieldName = child.props.name;
          const fieldError = errors[fieldName];
          
          return (
            <div className="form-validation__field">
              {React.cloneElement(child, {
                ...getFieldProps(fieldName),
                className: `${child.props.className || ''} ${fieldError ? 'form-validation__input--error' : ''}`.trim()
              })}
              {fieldError && renderError(fieldName, fieldError)}
            </div>
          );
        }
        return child;
      })}
      
      {isSubmitting && (
        <div 
          className="form-validation__loading"
          role="status"
          aria-live="polite"
        >
          <span className="form-validation__loading-spinner" aria-hidden="true"></span>
          <span>Submitting form...</span>
        </div>
      )}
    </form>
  );
};

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required') => ({
    validator: (value) => !value || value.trim() === '' ? message : null,
    message,
    type: 'error'
  }),
  
  email: (message = 'Please enter a valid email address') => ({
    validator: (value) => {
      if (!value) return null;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return !emailRegex.test(value) ? message : null;
    },
    message,
    type: 'error'
  }),
  
  minLength: (min, message) => ({
    validator: (value) => {
      if (!value) return null;
      return value.length < min ? (message || `Must be at least ${min} characters`) : null;
    },
    message: message || `Must be at least ${min} characters`,
    type: 'error'
  }),
  
  maxLength: (max, message) => ({
    validator: (value) => {
      if (!value) return null;
      return value.length > max ? (message || `Must be no more than ${max} characters`) : null;
    },
    message: message || `Must be no more than ${max} characters`,
    type: 'error'
  }),
  
  pattern: (regex, message = 'Invalid format') => ({
    validator: (value) => {
      if (!value) return null;
      return !regex.test(value) ? message : null;
    },
    message,
    type: 'error'
  }),
  
  number: (message = 'Please enter a valid number') => ({
    validator: (value) => {
      if (!value) return null;
      return isNaN(Number(value)) ? message : null;
    },
    message,
    type: 'error'
  }),
  
  range: (min, max, message) => ({
    validator: (value) => {
      if (!value) return null;
      const num = Number(value);
      if (isNaN(num)) return null;
      return (num < min || num > max) ? (message || `Must be between ${min} and ${max}`) : null;
    },
    message: message || `Must be between ${min} and ${max}`,
    type: 'error'
  })
};

export default FormValidation;