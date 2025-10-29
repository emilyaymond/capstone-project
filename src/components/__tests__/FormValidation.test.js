import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FormValidation, { validationRules } from '../FormValidation';

describe('FormValidation', () => {
  beforeEach(() => {
    // Clear any existing announcements
    document.querySelectorAll('[aria-live]').forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  });

  const mockSubmit = jest.fn();

  afterEach(() => {
    mockSubmit.mockClear();
  });

  it('renders form with children', () => {
    render(
      <FormValidation onSubmit={mockSubmit}>
        <input name="test" placeholder="Test input" />
        <button type="submit">Submit</button>
      </FormValidation>
    );

    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('adds proper accessibility attributes to form inputs', () => {
    const rules = {
      email: [validationRules.required(), validationRules.email()]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="email" type="email" placeholder="Email" />
      </FormValidation>
    );

    const input = screen.getByPlaceholderText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('validates required fields on blur', async () => {
    const rules = {
      name: [validationRules.required('Name is required')]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="name" placeholder="Name" />
      </FormValidation>
    );

    const input = screen.getByPlaceholderText('Name');
    
    await userEvent.click(input);
    await userEvent.tab(); // Blur the input

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'name-error');
  });

  it('validates email format', async () => {
    const rules = {
      email: [validationRules.email()]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="email" placeholder="Email" />
      </FormValidation>
    );

    const input = screen.getByPlaceholderText('Email');
    
    await userEvent.type(input, 'invalid-email');
    await userEvent.tab();

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates minimum length', async () => {
    const rules = {
      password: [validationRules.minLength(8, 'Password must be at least 8 characters')]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="password" type="password" placeholder="Password" />
      </FormValidation>
    );

    const input = screen.getByPlaceholderText('Password');
    
    await userEvent.type(input, '123');
    await userEvent.tab();

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('validates number fields', async () => {
    const rules = {
      age: [validationRules.number('Please enter a valid age')]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="age" placeholder="Age" />
      </FormValidation>
    );

    const input = screen.getByPlaceholderText('Age');
    
    await userEvent.type(input, 'not-a-number');
    await userEvent.tab();

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid age')).toBeInTheDocument();
    });
  });

  it('validates range fields', async () => {
    const rules = {
      score: [validationRules.range(0, 100, 'Score must be between 0 and 100')]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="score" placeholder="Score" />
      </FormValidation>
    );

    const input = screen.getByPlaceholderText('Score');
    
    await userEvent.type(input, '150');
    await userEvent.tab();

    await waitFor(() => {
      expect(screen.getByText('Score must be between 0 and 100')).toBeInTheDocument();
    });
  });

  it('clears errors when user starts typing', async () => {
    const rules = {
      name: [validationRules.required()]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="name" placeholder="Name" />
      </FormValidation>
    );

    const input = screen.getByPlaceholderText('Name');
    
    // Trigger error
    await userEvent.click(input);
    await userEvent.tab();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Start typing to clear error
    await userEvent.type(input, 'John');

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('prevents form submission with validation errors', async () => {
    const rules = {
      name: [validationRules.required('Name is required')],
      email: [validationRules.required('Email is required'), validationRules.email()]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="name" placeholder="Name" />
        <input name="email" placeholder="Email" />
        <button type="submit">Submit</button>
      </FormValidation>
    );

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await userEvent.click(submitButton);

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(2);
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const rules = {
      name: [validationRules.required()],
      email: [validationRules.required(), validationRules.email()]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="name" placeholder="Name" />
        <input name="email" placeholder="Email" />
        <button type="submit">Submit</button>
      </FormValidation>
    );

    await userEvent.type(screen.getByPlaceholderText('Name'), 'John Doe');
    await userEvent.type(screen.getByPlaceholderText('Email'), 'john@example.com');
    
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalled();
    });
  });

  it('shows loading state during submission', async () => {
    const slowSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <FormValidation onSubmit={slowSubmit}>
        <input name="test" placeholder="Test" />
        <button type="submit">Submit</button>
      </FormValidation>
    );

    await userEvent.type(screen.getByPlaceholderText('Test'), 'test value');
    
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await userEvent.click(submitButton);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Submitting form...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('handles submission errors gracefully', async () => {
    const failingSubmit = jest.fn(() => Promise.reject(new Error('Submission failed')));

    render(
      <FormValidation onSubmit={failingSubmit}>
        <input name="test" placeholder="Test" />
        <button type="submit">Submit</button>
      </FormValidation>
    );

    await userEvent.type(screen.getByPlaceholderText('Test'), 'test value');
    
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeInTheDocument();
    });
  });

  it('announces validation errors to screen readers', async () => {
    const rules = {
      name: [validationRules.required('Name is required')]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="name" placeholder="Name" />
        <button type="submit">Submit</button>
      </FormValidation>
    );

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await userEvent.click(submitButton);

    await waitFor(() => {
      const announcements = document.querySelectorAll('[aria-live="assertive"]');
      expect(announcements.length).toBeGreaterThan(0);
      
      const announcement = Array.from(announcements).find(el => 
        el.textContent.includes('Form submission failed')
      );
      expect(announcement).toBeTruthy();
    });
  });

  it('focuses first error field on validation failure', async () => {
    const rules = {
      name: [validationRules.required()],
      email: [validationRules.required()]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="name" placeholder="Name" />
        <input name="email" placeholder="Email" />
        <button type="submit">Submit</button>
      </FormValidation>
    );

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Name')).toHaveFocus();
    });
  });

  it('can disable screen reader announcements', async () => {
    const rules = {
      name: [validationRules.required()]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules} announceErrors={false}>
        <input name="name" placeholder="Name" />
      </FormValidation>
    );

    const input = screen.getByPlaceholderText('Name');
    await userEvent.click(input);
    await userEvent.tab();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Should not create announcements
    const announcements = document.querySelectorAll('[aria-live="assertive"]');
    expect(announcements.length).toBe(0);
  });

  it('supports custom validation rules', async () => {
    const customRule = {
      validator: (value) => value !== 'custom' ? 'Must be "custom"' : null,
      message: 'Must be "custom"',
      type: 'error'
    };

    const rules = {
      custom: [customRule]
    };

    render(
      <FormValidation onSubmit={mockSubmit} validationRules={rules}>
        <input name="custom" placeholder="Custom field" />
      </FormValidation>
    );

    const input = screen.getByPlaceholderText('Custom field');
    
    await userEvent.type(input, 'wrong');
    await userEvent.tab();

    await waitFor(() => {
      expect(screen.getByText('Must be "custom"')).toBeInTheDocument();
    });
  });
});