import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationSystem, { showSuccess, showError, showWarning, showInfo } from '../NotificationSystem';

// Mock timers for testing auto-dismiss
jest.useFakeTimers();

describe('NotificationSystem', () => {
  beforeEach(() => {
    // Clear any existing announcements
    document.querySelectorAll('[aria-live]').forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    // Clear any existing notifications
    if (window.clearNotifications) {
      window.clearNotifications();
    }
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders notification system container', () => {
    render(<NotificationSystem />);
    
    const container = screen.getByRole('region', { name: 'Notifications' });
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('exposes global notification functions', () => {
    render(<NotificationSystem />);
    
    expect(typeof window.showNotification).toBe('function');
    expect(typeof window.hideNotification).toBe('function');
    expect(typeof window.clearNotifications).toBe('function');
  });

  it('displays notification when added', async () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.showNotification({
        type: 'info',
        message: 'Test notification'
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Test notification')).toBeInTheDocument();
    });
  });

  it('displays notification with title', async () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.showNotification({
        type: 'success',
        title: 'Success!',
        message: 'Operation completed'
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
      expect(screen.getByText('Operation completed')).toBeInTheDocument();
    });
  });

  it('auto-dismisses notifications after duration', async () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.showNotification({
        type: 'info',
        message: 'Auto dismiss test',
        duration: 1000
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Auto dismiss test')).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Auto dismiss test')).not.toBeInTheDocument();
    });
  });

  it('does not auto-dismiss when duration is 0', async () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.showNotification({
        type: 'error',
        message: 'Persistent error',
        duration: 0
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Persistent error')).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(screen.getByText('Persistent error')).toBeInTheDocument();
  });

  it('allows manual dismissal when dismissible', async () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.showNotification({
        type: 'info',
        message: 'Dismissible notification',
        dismissible: true,
        duration: 0
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Dismissible notification')).toBeInTheDocument();
    });

    const dismissButton = screen.getByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Dismissible notification')).not.toBeInTheDocument();
    });
  });

  it('supports keyboard dismissal with Escape key', async () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.showNotification({
        type: 'info',
        message: 'Keyboard dismissible',
        dismissible: true,
        duration: 0
      });
    });

    await waitFor(() => {
      const notification = screen.getByRole('alert');
      expect(notification).toBeInTheDocument();
      
      fireEvent.keyDown(notification, { key: 'Escape' });
    });

    await waitFor(() => {
      expect(screen.queryByText('Keyboard dismissible')).not.toBeInTheDocument();
    });
  });

  it('displays different notification types with correct styling', async () => {
    render(<NotificationSystem />);
    
    const types = ['success', 'error', 'warning', 'info'];
    
    for (const type of types) {
      act(() => {
        window.showNotification({
          type,
          message: `${type} notification`,
          duration: 0
        });
      });
    }

    await waitFor(() => {
      expect(document.querySelector('.notification--success')).toBeInTheDocument();
      expect(document.querySelector('.notification--error')).toBeInTheDocument();
      expect(document.querySelector('.notification--warning')).toBeInTheDocument();
      expect(document.querySelector('.notification--info')).toBeInTheDocument();
    });
  });

  it('supports action buttons', async () => {
    const mockAction = jest.fn();
    
    render(<NotificationSystem />);
    
    act(() => {
      window.showNotification({
        type: 'info',
        message: 'Notification with action',
        actions: [
          {
            label: 'Action Button',
            onClick: mockAction,
            type: 'primary'
          }
        ],
        duration: 0
      });
    });

    await waitFor(() => {
      const actionButton = screen.getByRole('button', { name: 'Action Button' });
      expect(actionButton).toBeInTheDocument();
      
      fireEvent.click(actionButton);
      expect(mockAction).toHaveBeenCalledTimes(1);
    });
  });

  it('announces notifications to screen readers', async () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.showNotification({
        type: 'success',
        message: 'Screen reader test'
      });
    });

    await waitFor(() => {
      const announcements = document.querySelectorAll('[aria-live]');
      const announcement = Array.from(announcements).find(el => 
        el.textContent.includes('Success: Screen reader test')
      );
      expect(announcement).toBeTruthy();
    });
  });

  it('clears all notifications', async () => {
    render(<NotificationSystem />);
    
    act(() => {
      window.showNotification({ message: 'First notification', duration: 0 });
      window.showNotification({ message: 'Second notification', duration: 0 });
    });

    await waitFor(() => {
      expect(screen.getByText('First notification')).toBeInTheDocument();
      expect(screen.getByText('Second notification')).toBeInTheDocument();
    });

    act(() => {
      window.clearNotifications();
    });

    await waitFor(() => {
      expect(screen.queryByText('First notification')).not.toBeInTheDocument();
      expect(screen.queryByText('Second notification')).not.toBeInTheDocument();
    });
  });

  describe('Helper functions', () => {
    beforeEach(() => {
      render(<NotificationSystem />);
    });

    it('showSuccess creates success notification', async () => {
      act(() => {
        showSuccess('Success message');
      });

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
        expect(document.querySelector('.notification--success')).toBeInTheDocument();
      });
    });

    it('showError creates error notification that does not auto-dismiss', async () => {
      act(() => {
        showError('Error message');
      });

      await waitFor(() => {
        expect(screen.getByText('Error message')).toBeInTheDocument();
        expect(document.querySelector('.notification--error')).toBeInTheDocument();
      });

      // Advance time and verify error is still there
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('showWarning creates warning notification with longer duration', async () => {
      act(() => {
        showWarning('Warning message');
      });

      await waitFor(() => {
        expect(screen.getByText('Warning message')).toBeInTheDocument();
        expect(document.querySelector('.notification--warning')).toBeInTheDocument();
      });
    });

    it('showInfo creates info notification', async () => {
      act(() => {
        showInfo('Info message');
      });

      await waitFor(() => {
        expect(screen.getByText('Info message')).toBeInTheDocument();
        expect(document.querySelector('.notification--info')).toBeInTheDocument();
      });
    });
  });

  it('handles notifications when system is not mounted', () => {
    // Test helper functions when NotificationSystem is not rendered
    expect(() => {
      showSuccess('Test message');
      showError('Test error');
      showWarning('Test warning');
      showInfo('Test info');
    }).not.toThrow();
  });
});