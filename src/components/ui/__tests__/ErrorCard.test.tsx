import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorCard from '../ErrorCard';

// Mock the Card and Button components
jest.mock('../Card', () => {
  return function MockCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div data-testid="card" className={className}>{children}</div>;
  };
});

jest.mock('../Button', () => {
  return function MockButton({ children, onClick, variant, icon: Icon }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    variant?: string;
    icon?: React.ComponentType;
  }) {
    return (
      <button data-testid="button" onClick={onClick} data-variant={variant}>
        {Icon && <Icon data-testid="icon" />}
        {children}
      </button>
    );
  };
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="icon">AlertIcon</div>,
  RefreshCw: () => <div data-testid="refresh-icon">RefreshIcon</div>
}));

describe('ErrorCard', () => {
  it('renders with default props', () => {
    render(<ErrorCard message="Test error message" />);
    
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<ErrorCard title="Custom Error" message="Test message" />);
    
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<ErrorCard message="Custom error message" />);
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = jest.fn();
    render(<ErrorCard message="Test message" onRetry={onRetry} />);
    
    const retryButton = screen.getByTestId('button');
    expect(retryButton).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorCard message="Test message" />);
    
    expect(screen.queryByTestId('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('renders with custom retry text', () => {
    const onRetry = jest.fn();
    render(<ErrorCard message="Test message" onRetry={onRetry} retryText="Retry Now" />);
    
    expect(screen.getByText('Retry Now')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    render(<ErrorCard message="Test message" onRetry={onRetry} />);
    
    const retryButton = screen.getByTestId('button');
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<ErrorCard message="Test message" className="custom-error-card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-error-card');
  });

  it('applies default styling classes', () => {
    render(<ErrorCard message="Test message" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('text-center');
  });

  it('combines custom and default className correctly', () => {
    render(<ErrorCard message="Test message" className="custom-class" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('text-center', 'custom-class');
  });

  it('renders error icon with correct styling', () => {
    render(<ErrorCard message="Test message" />);
    
    const icon = screen.getByTestId('icon');
    expect(icon).toBeInTheDocument();
  });

  it('renders button with correct variant', () => {
    const onRetry = jest.fn();
    render(<ErrorCard message="Test message" onRetry={onRetry} />);
    
    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('data-variant', 'primary');
  });

  it('renders with complex message content', () => {
    const complexMessage = (
      <span>
        <span>Error occurred</span>
        <span>Please try again</span>
      </span>
    );
    
    render(<ErrorCard message={complexMessage} />);
    
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
    expect(screen.getByText('Please try again')).toBeInTheDocument();
  });

  it('maintains consistent structure with different props', () => {
    const { rerender } = render(<ErrorCard message="Default" />);
    
    // Check initial structure
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.queryByTestId('button')).not.toBeInTheDocument();
    
    // Add retry functionality
    rerender(<ErrorCard message="With retry" onRetry={() => {}} />);
    expect(screen.getByTestId('button')).toBeInTheDocument();
    
    // Change title
    rerender(<ErrorCard title="New Title" message="With retry" onRetry={() => {}} />);
    expect(screen.getByText('New Title')).toBeInTheDocument();
  });
});
