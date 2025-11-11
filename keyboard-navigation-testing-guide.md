# Keyboard Navigation Testing Guide for HealthVis

## What Are Skip Links?

**Skip links** are hidden navigation shortcuts that appear when you press Tab. They help users quickly jump to important page sections without tabbing through every element.

### How Skip Links Work in HealthVis:

```css
/* Hidden by default */
.skip-link {
  position: absolute;
  top: -100px;  /* Hidden above viewport */
  left: 0;
}

/* Visible when focused */
.skip-link:focus {
  top: 0;  /* Slides down into view */
}
```

### Skip Links in HealthVis:
- **Skip to main content** (Alt+M)
- **Skip to navigation** (Alt+N)

## Manual Keyboard Navigation Testing

### 1. Start the Application
```bash
cd my-app
npm start
```

### 2. Test Skip Links
1. **Load the page** - Don't click anything yet
2. **Press Tab once** - You should see "Skip to main content" appear at the top
3. **Press Enter** - Should jump to main content area
4. **Press Tab again** - Should see "Skip to navigation"
5. **Press Enter** - Should jump to navigation menu

### 3. Test Tab Order
Press Tab repeatedly and verify this sequence:
```
Skip Links → Navigation Menu → Main Content → Settings → Footer
```

### 4. Test Keyboard Shortcuts
Try these shortcuts (they're documented in the Help section):

**On macOS (MacBook):**
| Shortcut | Action |
|----------|--------|
| `⌥+1` | Navigate to Dashboard |
| `⌥+2` | Navigate to Data Input |
| `⌥+3` | Navigate to Settings |
| `⌥+4` | Navigate to Help |
| `⌘+,` | Open Settings Panel |
| `Escape` | Close Settings Panel |
| `⌥+M` | Skip to main content |
| `⌥+N` | Skip to navigation |

**On Windows/Linux:**
| Shortcut | Action |
|----------|--------|
| `Alt+1` | Navigate to Dashboard |
| `Alt+2` | Navigate to Data Input |
| `Alt+3` | Navigate to Settings |
| `Alt+4` | Navigate to Help |
| `Ctrl+,` | Open Settings Panel |
| `Escape` | Close Settings Panel |
| `Alt+M` | Skip to main content |
| `Alt+N` | Skip to navigation |

### 5. Test Focus Management
1. **Navigate between sections** - Focus should move to the new section heading
2. **Open modal dialogs** - Focus should trap inside the modal
3. **Close modals** - Focus should return to the trigger element

## Automated Testing

### Run Keyboard Navigation Tests
```bash
# Run all keyboard navigation tests
npm test -- --testNamePattern="keyboard"

# Run accessibility validation tests
npm test AccessibilityValidation.test.js

# Run specific component tests
npm test AppLayout.test.js
```

### Test Skip Links Programmatically
```javascript
test('should support skip links', async () => {
  render(<App />);
  
  // Tab to first skip link
  const skipToMain = screen.getByText('Skip to main content');
  fireEvent.focus(skipToMain);
  
  // Verify it's visible when focused
  expect(skipToMain).toHaveClass('skip-link--focused');
  
  // Activate skip link
  fireEvent.click(skipToMain);
  
  // Verify focus moved to main content
  const mainContent = screen.getByRole('main');
  expect(document.activeElement).toBe(mainContent);
});
```

### Test Keyboard Shortcuts
```javascript
test('should respond to keyboard shortcuts', async () => {
  render(<App />);
  
  // Test Alt+1 for Dashboard
  fireEvent.keyDown(document, {
    key: '1',
    altKey: true
  });
  
  await waitFor(() => {
    expect(screen.getByText('Health Data Dashboard')).toBeInTheDocument();
  });
});
```

## Testing Focus Management

### Visual Focus Indicators
1. **Tab through elements** - Each should have a visible focus ring
2. **Check contrast** - Focus indicators should meet WCAG contrast requirements
3. **Test in different modes** - Focus should be visible in all accessibility modes

### Focus Trapping (Modals)
```javascript
test('should trap focus in modal dialogs', async () => {
  render(<App />);
  
  // Open settings modal
  const settingsButton = screen.getByRole('menuitem', { name: /Settings/ });
  fireEvent.click(settingsButton);
  
  // Tab should cycle within modal
  const modal = screen.getByRole('dialog');
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  expect(focusableElements.length).toBeGreaterThan(0);
});
```

## Screen Reader Testing

### Test with Screen Reader Simulation
```javascript
test('should announce navigation changes', async () => {
  const mockAnnounce = jest.fn();
  
  // Mock screen reader hook
  jest.mock('../hooks/useScreenReader', () => ({
    useScreenReader: () => ({
      announcePolite: mockAnnounce
    })
  }));
  
  render(<App />);
  
  // Navigate to different section
  const dashboardButton = screen.getByRole('menuitem', { name: /Dashboard/ });
  fireEvent.click(dashboardButton);
  
  // Verify announcement was made
  expect(mockAnnounce).toHaveBeenCalledWith(
    expect.stringContaining('Navigated to')
  );
});
```

## Common Issues to Test For

### 1. Focus Loss
- **Problem**: Focus disappears when navigating
- **Test**: Verify `document.activeElement` after each navigation

### 2. Skip Links Not Working
- **Problem**: Skip links don't move focus
- **Test**: Check that target elements have `tabindex="-1"` and `focus()` is called

### 3. Keyboard Traps
- **Problem**: Can't escape from a section using keyboard
- **Test**: Ensure Tab and Shift+Tab work everywhere

### 4. Missing Focus Indicators
- **Problem**: No visual indication of keyboard focus
- **Test**: Verify CSS `:focus` styles are applied

## Browser Testing

Test keyboard navigation in multiple browsers:
- **Chrome**: Generally good support
- **Firefox**: Excellent keyboard navigation
- **Safari**: Test on macOS for full keyboard access
- **Edge**: Similar to Chrome

### Enable Full Keyboard Access
- **macOS**: System Preferences → Keyboard → Shortcuts → "Use keyboard navigation to move focus between controls"
- **Windows**: Usually enabled by default

## Debugging Tips

### 1. Log Focus Changes
```javascript
// Add to your component for debugging
useEffect(() => {
  const logFocus = () => {
    console.log('Focus:', document.activeElement);
  };
  
  document.addEventListener('focusin', logFocus);
  return () => document.removeEventListener('focusin', logFocus);
}, []);
```

### 2. Highlight Focus Path
```css
/* Temporary debugging style */
*:focus {
  outline: 3px solid red !important;
  outline-offset: 2px !important;
}
```

### 3. Test Focus Order
```javascript
// Get all focusable elements in order
const focusableElements = document.querySelectorAll(
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
);

console.log('Focus order:', Array.from(focusableElements));
```

## Quick Testing Checklist

- [ ] Skip links appear on first Tab
- [ ] Skip links work (move focus to target)
- [ ] All interactive elements are focusable
- [ ] Focus indicators are visible
- [ ] Tab order is logical
- [ ] Keyboard shortcuts work
- [ ] Focus doesn't get trapped unexpectedly
- [ ] Modal dialogs trap focus properly
- [ ] Focus returns after closing modals
- [ ] Screen reader announcements work
- [ ] Works without mouse/touch

Remember: **Never use a mouse during keyboard testing!** This ensures you experience the app exactly as keyboard-only users do.