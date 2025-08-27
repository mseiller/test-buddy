import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessibilityPanel } from '../AccessibilityPanel';
import { AccessibilityProvider } from '@/contexts/AccessibilityContext';

// Mock the Button and Card components
jest.mock('../ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('../ui/Card', () => ({
  Card: ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <AccessibilityProvider>
      {component}
    </AccessibilityProvider>
  );
};

describe('AccessibilityPanel', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    renderWithProvider(
      <AccessibilityPanel isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
    expect(screen.getByText('Visual')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProvider(
      <AccessibilityPanel isOpen={false} onClose={mockOnClose} />
    );

    expect(screen.queryByText('Accessibility Settings')).not.toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    renderWithProvider(
      <AccessibilityPanel isOpen={true} onClose={mockOnClose} />
    );

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('switches between tabs', () => {
    renderWithProvider(
      <AccessibilityPanel isOpen={true} onClose={mockOnClose} />
    );

    // Default tab should be Visual
    expect(screen.getByText('High Contrast')).toBeInTheDocument();

    // Click on Text tab
    const textTab = screen.getByText('Text');
    fireEvent.click(textTab);
    expect(screen.getByText('Font Size')).toBeInTheDocument();

    // Click on Navigation tab
    const navigationTab = screen.getByText('Navigation');
    fireEvent.click(navigationTab);
    expect(screen.getByText('Enhanced Keyboard Navigation')).toBeInTheDocument();

    // Click on Advanced tab
    const advancedTab = screen.getByText('Advanced');
    fireEvent.click(advancedTab);
    expect(screen.getByText('Screen Reader Optimizations')).toBeInTheDocument();
  });

  it('displays accessibility options in Visual tab', () => {
    renderWithProvider(
      <AccessibilityPanel isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByText('High Contrast')).toBeInTheDocument();
    expect(screen.getByText('Color Blind Mode')).toBeInTheDocument();
    expect(screen.getByText('Reduced Motion')).toBeInTheDocument();
  });

  it('displays accessibility options in Text tab', () => {
    renderWithProvider(
      <AccessibilityPanel isOpen={true} onClose={mockOnClose} />
    );

    const textTab = screen.getByText('Text');
    fireEvent.click(textTab);

    expect(screen.getByText('Font Size')).toBeInTheDocument();
    expect(screen.getByText('Dyslexia Friendly')).toBeInTheDocument();
  });

  it('displays accessibility options in Navigation tab', () => {
    renderWithProvider(
      <AccessibilityPanel isOpen={true} onClose={mockOnClose} />
    );

    const navigationTab = screen.getByText('Navigation');
    fireEvent.click(navigationTab);

    expect(screen.getByText('Enhanced Keyboard Navigation')).toBeInTheDocument();
    expect(screen.getByText('Enhanced Focus Indicators')).toBeInTheDocument();
  });

  it('displays accessibility options in Advanced tab', () => {
    renderWithProvider(
      <AccessibilityPanel isOpen={true} onClose={mockOnClose} />
    );

    const advancedTab = screen.getByText('Advanced');
    fireEvent.click(advancedTab);

    expect(screen.getByText('Screen Reader Optimizations')).toBeInTheDocument();
    expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    renderWithProvider(
      <AccessibilityPanel isOpen={true} onClose={mockOnClose} />
    );

    const closeButton = screen.getByText('×');
    expect(closeButton).toHaveAttribute('aria-label', 'Close accessibility panel');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('renders with proper test IDs', () => {
    renderWithProvider(
      <AccessibilityPanel isOpen={true} onClose={mockOnClose} />
    );

    expect(screen.getByTestId('card')).toBeInTheDocument();
  });
});
