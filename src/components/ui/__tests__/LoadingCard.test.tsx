import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingCard from '../LoadingCard';

// Mock the Card and LoadingSpinner components
jest.mock('../Card', () => {
  return function MockCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div data-testid="card" className={className}>{children}</div>;
  };
});

jest.mock('../LoadingSpinner', () => {
  return function MockLoadingSpinner({ size }: { size?: string }) {
    return <div data-testid="spinner" data-size={size} />;
  };
});

describe('LoadingCard', () => {
  it('renders with default props', () => {
    render(<LoadingCard />);
    
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingCard message="Please wait..." />);
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('renders with empty message', () => {
    render(<LoadingCard message="" />);
    
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LoadingCard className="custom-loading-card" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-loading-card');
  });

  it('applies default styling classes', () => {
    render(<LoadingCard />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('text-center');
  });

  it('combines custom and default className correctly', () => {
    render(<LoadingCard className="custom-class" />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('text-center', 'custom-class');
  });

  it('renders spinner with correct size', () => {
    render(<LoadingCard />);
    
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveAttribute('data-size', 'md');
  });

  it('maintains consistent structure with different props', () => {
    const { rerender } = render(<LoadingCard />);
    
    // Check initial structure
    expect(screen.getByTestId('card')).toBeInTheDocument();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Change message
    rerender(<LoadingCard message="New message" />);
    expect(screen.getByText('New message')).toBeInTheDocument();
    
    // Add custom className
    rerender(<LoadingCard message="New message" className="test-class" />);
    expect(screen.getByTestId('card')).toHaveClass('test-class');
  });

  it('renders with long message text', () => {
    const longMessage = 'This is a very long loading message that should still render properly within the card';
    render(<LoadingCard message={longMessage} />);
    
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it('renders with special characters in message', () => {
    const specialMessage = 'Loading... 🚀 & <script>alert("test")</script>';
    render(<LoadingCard message={specialMessage} />);
    
    expect(screen.getByText(specialMessage)).toBeInTheDocument();
  });

  it('applies className with spaces correctly', () => {
    render(<LoadingCard className="  extra-spaces  " />);
    
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('extra-spaces');
  });

  it('renders as a card element', () => {
    render(<LoadingCard />);
    
    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('DIV');
  });

  it('renders spinner element', () => {
    render(<LoadingCard />);
    
    const spinner = screen.getByTestId('spinner');
    expect(spinner.tagName).toBe('DIV');
  });
});
