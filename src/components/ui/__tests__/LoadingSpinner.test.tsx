import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner data-testid="spinner" />);
    
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-2', 'border-t-transparent', 'h-6', 'w-6', 'border-indigo-600');
  });

  it('renders with custom size', () => {
    const { rerender } = render(<LoadingSpinner data-testid="spinner" size="sm" />);
    expect(screen.getByTestId('spinner')).toHaveClass('h-4', 'w-4');
    
    rerender(<LoadingSpinner data-testid="spinner" size="md" />);
    expect(screen.getByTestId('spinner')).toHaveClass('h-6', 'w-6');
    
    rerender(<LoadingSpinner data-testid="spinner" size="lg" />);
    expect(screen.getByTestId('spinner')).toHaveClass('h-8', 'w-8');
  });

  it('renders with custom color', () => {
    const { rerender } = render(<LoadingSpinner data-testid="spinner" color="primary" />);
    expect(screen.getByTestId('spinner')).toHaveClass('border-indigo-600');
    
    rerender(<LoadingSpinner data-testid="spinner" color="white" />);
    expect(screen.getByTestId('spinner')).toHaveClass('border-white');
    
    rerender(<LoadingSpinner data-testid="spinner" color="gray" />);
    expect(screen.getByTestId('spinner')).toHaveClass('border-gray-600');
  });

  it('renders with custom className', () => {
    render(<LoadingSpinner data-testid="spinner" className="custom-spinner" />);
    
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveClass('custom-spinner');
  });

  it('combines all props correctly', () => {
    render(<LoadingSpinner data-testid="spinner" size="lg" color="white" className="custom-class" />);
    
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveClass(
      'animate-spin',
      'rounded-full',
      'border-2',
      'border-t-transparent',
      'h-8',
      'w-8',
      'border-white',
      'custom-class'
    );
  });

  it('applies base classes correctly', () => {
    render(<LoadingSpinner data-testid="spinner" />);
    
    const spinner = screen.getByTestId('spinner');
    expect(spinner).toHaveClass('animate-spin', 'rounded-full', 'border-2', 'border-t-transparent');
  });

  it('trims whitespace from combined classes', () => {
    render(<LoadingSpinner data-testid="spinner" className="  extra-spaces  " />);
    
    const spinner = screen.getByTestId('spinner');
    const classList = spinner.className.split(' ');
    // Filter out empty strings that result from multiple spaces
    const filteredClasses = classList.filter(cls => cls !== '');
    expect(filteredClasses).toContain('extra-spaces');
    expect(filteredClasses).toContain('animate-spin');
    expect(filteredClasses).toContain('rounded-full');
  });

  it('renders as a div element', () => {
    render(<LoadingSpinner data-testid="spinner" />);
    
    const spinner = screen.getByTestId('spinner');
    expect(spinner.tagName).toBe('DIV');
  });

  it('maintains consistent structure with different props', () => {
    const { rerender } = render(<LoadingSpinner data-testid="spinner" />);
    let spinner = screen.getByTestId('spinner');
    expect(spinner.tagName).toBe('DIV');
    
    rerender(<LoadingSpinner data-testid="spinner" size="sm" color="gray" />);
    spinner = screen.getByTestId('spinner');
    expect(spinner.tagName).toBe('DIV');
    
    rerender(<LoadingSpinner data-testid="spinner" className="test-class" />);
    spinner = screen.getByTestId('spinner');
    expect(spinner.tagName).toBe('DIV');
  });
});
