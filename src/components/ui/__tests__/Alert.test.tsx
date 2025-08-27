import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Alert from '../Alert';

describe('Alert', () => {
  it('renders with default props', () => {
    render(<Alert data-testid="alert">Default alert message</Alert>);
    
    const alert = screen.getByTestId('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveClass('bg-blue-50', 'border', 'border-blue-200', 'text-blue-800');
  });

  it('renders with custom variant', () => {
    const { rerender } = render(<Alert data-testid="alert" variant="success">Success message</Alert>);
    expect(screen.getByTestId('alert')).toHaveClass('bg-green-50', 'border-green-200', 'text-green-800');
    
    rerender(<Alert data-testid="alert" variant="error">Error message</Alert>);
    expect(screen.getByTestId('alert')).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
    
    rerender(<Alert data-testid="alert" variant="warning">Warning message</Alert>);
    expect(screen.getByTestId('alert')).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800');
    
    rerender(<Alert data-testid="alert" variant="info">Info message</Alert>);
    expect(screen.getByTestId('alert')).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
  });

  it('renders with custom className', () => {
    render(<Alert data-testid="alert" className="custom-alert">Custom alert</Alert>);
    
    const alert = screen.getByTestId('alert');
    expect(alert).toHaveClass('custom-alert');
  });

  it('renders with title when provided', () => {
    render(<Alert data-testid="alert" title="Alert Title">Alert content</Alert>);
    
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
    expect(screen.getByText('Alert content')).toBeInTheDocument();
  });

  it('renders with icon for each variant', () => {
    const { rerender } = render(<Alert data-testid="alert" variant="success">Success</Alert>);
    expect(screen.getByTestId('alert').querySelector('svg')).toBeInTheDocument();
    
    rerender(<Alert data-testid="alert" variant="error">Error</Alert>);
    expect(screen.getByTestId('alert').querySelector('svg')).toBeInTheDocument();
    
    rerender(<Alert data-testid="alert" variant="warning">Warning</Alert>);
    expect(screen.getByTestId('alert').querySelector('svg')).toBeInTheDocument();
    
    rerender(<Alert data-testid="alert" variant="info">Info</Alert>);
    expect(screen.getByTestId('alert').querySelector('svg')).toBeInTheDocument();
  });

  it('renders dismissible button when dismissible is true', () => {
    const onDismiss = jest.fn();
    render(<Alert data-testid="alert" dismissible onDismiss={onDismiss}>Dismissible alert</Alert>);
    
    const dismissButton = screen.getByRole('button');
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton).toHaveClass('inline-flex', 'rounded-md', 'p-1.5');
  });

  it('does not render dismissible button when dismissible is false', () => {
    render(<Alert data-testid="alert" dismissible={false}>Non-dismissible alert</Alert>);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(<Alert data-testid="alert" dismissible onDismiss={onDismiss}>Dismissible alert</Alert>);
    
    const dismissButton = screen.getByRole('button');
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders without dismissible button when onDismiss is not provided', () => {
    render(<Alert data-testid="alert" dismissible>Dismissible without callback</Alert>);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('combines variant and custom className correctly', () => {
    render(<Alert data-testid="alert" variant="success" className="custom-class">Combined alert</Alert>);
    
    const alert = screen.getByTestId('alert');
    expect(alert).toHaveClass('custom-class', 'bg-green-50', 'border-green-200', 'text-green-800');
  });

  it('applies base classes correctly', () => {
    render(<Alert data-testid="alert">Base alert</Alert>);
    
    const alert = screen.getByTestId('alert');
    expect(alert).toHaveClass('rounded-lg', 'p-4');
  });

  it('renders with complex children', () => {
    render(
      <Alert data-testid="alert">
        <div>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
        </div>
      </Alert>
    );
    
    expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
  });

  it('maintains consistent structure with different props', () => {
    const { rerender } = render(<Alert data-testid="alert">Default</Alert>);
    let alert = screen.getByTestId('alert');
    expect(alert.tagName).toBe('DIV');
    
    rerender(<Alert data-testid="alert" variant="success" title="Title">With title</Alert>);
    alert = screen.getByTestId('alert');
    expect(alert.tagName).toBe('DIV');
    
    rerender(<Alert data-testid="alert" dismissible onDismiss={() => {}}>Dismissible</Alert>);
    alert = screen.getByTestId('alert');
    expect(alert.tagName).toBe('DIV');
  });

  it('applies correct icon colors for each variant', () => {
    const { rerender } = render(<Alert data-testid="alert" variant="success">Success</Alert>);
    const successIcon = screen.getByTestId('alert').querySelector('svg');
    expect(successIcon).toHaveClass('text-green-600');
    
    rerender(<Alert data-testid="alert" variant="error">Error</Alert>);
    const errorIcon = screen.getByTestId('alert').querySelector('svg');
    expect(errorIcon).toHaveClass('text-red-600');
    
    rerender(<Alert data-testid="alert" variant="warning">Warning</Alert>);
    const warningIcon = screen.getByTestId('alert').querySelector('svg');
    expect(warningIcon).toHaveClass('text-yellow-600');
    
    rerender(<Alert data-testid="alert" variant="info">Info</Alert>);
    const infoIcon = screen.getByTestId('alert').querySelector('svg');
    expect(infoIcon).toHaveClass('text-blue-600');
  });
});
