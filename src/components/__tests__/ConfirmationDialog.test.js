import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ConfirmationDialog from '../ConfirmationDialog';

describe('ConfirmationDialog', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
    
    // Clear any existing announcements
    document.querySelectorAll('[aria-live]').forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  });

  it('renders nothing when not open', () => {
    render(
      <ConfirmationDialog
        isOpen={false}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Dialog')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'dialog-message');
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Escape key is pressed', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop is clicked', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const backdrop = document.querySelector('.confirmation-dialog__backdrop');
    fireEvent.click(backdrop);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onCancel when dialog content is clicked', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('supports custom button text', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keep/i })).toBeInTheDocument();
  });

  it('applies correct styling for different types', () => {
    const { rerender } = render(
      <ConfirmationDialog
        isOpen={true}
        title="Warning Dialog"
        message="Test message"
        type="warning"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(document.querySelector('.confirmation-dialog--warning')).toBeInTheDocument();

    rerender(
      <ConfirmationDialog
        isOpen={true}
        title="Danger Dialog"
        message="Test message"
        type="danger"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(document.querySelector('.confirmation-dialog--danger')).toBeInTheDocument();
  });

  it('focuses cancel button by default', async () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveFocus();
    });
  });

  it('focuses confirm button when autoFocus is set to confirm', async () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        autoFocus="confirm"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toHaveFocus();
    });
  });

  it('traps focus within dialog', async () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const dialog = screen.getByRole('dialog');
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const confirmButton = screen.getByRole('button', { name: /confirm/i });

    // Tab from cancel to confirm
    await userEvent.tab();
    expect(confirmButton).toHaveFocus();

    // Tab from confirm should wrap to cancel
    await userEvent.tab();
    expect(cancelButton).toHaveFocus();

    // Shift+Tab from cancel should wrap to confirm
    await userEvent.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
  });

  it('announces dialog opening to screen readers', async () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Important Dialog"
        message="This is important"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const announcements = document.querySelectorAll('[aria-live="assertive"]');
      expect(announcements.length).toBeGreaterThan(0);
      
      const announcement = Array.from(announcements).find(el => 
        el.textContent.includes('Important Dialog')
      );
      expect(announcement).toBeTruthy();
    });
  });

  it('announces actions to screen readers', async () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      const announcements = document.querySelectorAll('[aria-live="assertive"]');
      const announcement = Array.from(announcements).find(el => 
        el.textContent.includes('Action confirmed')
      );
      expect(announcement).toBeTruthy();
    });
  });

  it('has accessible button descriptions', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        title="Test Dialog"
        message="Test message"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const confirmButton = screen.getByRole('button', { name: /confirm/i });

    expect(cancelButton).toHaveAttribute('aria-describedby', 'cancel-description');
    expect(confirmButton).toHaveAttribute('aria-describedby', 'confirm-description');

    expect(screen.getByText('Closes the dialog without performing the action')).toBeInTheDocument();
    expect(screen.getByText('Confirms and performs the requested action')).toBeInTheDocument();
  });
});