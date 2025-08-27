import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../Button';
import { Chrome } from 'lucide-react';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('px-4', 'py-2', 'bg-indigo-600');
  });

  it('renders with custom variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Secondary Button' });
    expect(button).toHaveClass('bg-gray-600', 'text-white', 'hover:bg-gray-700');
  });

  it('renders with custom size', () => {
    render(<Button size="lg">Large Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Large Button' });
    expect(button).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('renders with custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Custom Button' });
    expect(button).toHaveClass('custom-class');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Clickable Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Clickable Button' });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Disabled Button' });
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with loading state', () => {
    render(<Button loading>Loading Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Loading Button' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });

  it('renders with icon', () => {
    render(<Button icon={Chrome}>Icon Button</Button>);
    
    const icon = screen.getByRole('button', { name: 'Icon Button' }).querySelector('svg');
    expect(icon).toBeInTheDocument();
    expect(screen.getByText('Icon Button')).toBeInTheDocument();
  });

  it('renders with full width', () => {
    render(<Button fullWidth>Full Width Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Full Width Button' });
    expect(button).toHaveClass('w-full');
  });

  it('renders with different color schemes', () => {
    const { rerender } = render(<Button variant="success">Success Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-green-600', 'hover:bg-green-700');
    
    rerender(<Button variant="warning">Warning Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-yellow-600', 'hover:bg-yellow-700');
    
    rerender(<Button variant="danger">Danger Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600', 'hover:bg-red-700');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Button</Button>);
    
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('renders with custom type', () => {
    render(<Button type="submit">Submit Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Submit Button' });
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('renders with icon on the right', () => {
    render(<Button icon={Chrome} iconPosition="right">Right Icon Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Right Icon Button' });
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('renders with ghost variant', () => {
    render(<Button variant="ghost">Ghost Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Ghost Button' });
    expect(button).toHaveClass('bg-transparent', 'text-gray-700');
  });

  it('renders with outline variant', () => {
    render(<Button variant="outline">Outline Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Outline Button' });
    expect(button).toHaveClass('border', 'border-gray-300', 'bg-white');
  });

  it('renders with small size', () => {
    render(<Button size="sm">Small Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Small Button' });
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
  });

  it('renders with medium size', () => {
    render(<Button size="md">Medium Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Medium Button' });
    expect(button).toHaveClass('px-4', 'py-2', 'text-sm');
  });

  it('renders with large size', () => {
    render(<Button size="lg">Large Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Large Button' });
    expect(button).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('applies focus ring styles', () => {
    render(<Button>Focus Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Focus Button' });
    expect(button).toHaveClass('focus:ring-2', 'focus:ring-offset-2');
  });

  it('applies transition styles', () => {
    render(<Button>Transition Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Transition Button' });
    expect(button).toHaveClass('transition-all', 'duration-200');
  });

  it('renders loading spinner when loading', () => {
    render(<Button loading>Loading Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Loading Button' });
    const spinner = button.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders icon when not loading', () => {
    render(<Button icon={Chrome}>Icon Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Icon Button' });
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('does not render icon when loading', () => {
    render(<Button icon={Chrome} loading>Loading Icon Button</Button>);
    
    const button = screen.getByRole('button', { name: 'Loading Icon Button' });
    const icon = button.querySelector('svg');
    expect(icon).not.toBeInTheDocument();
  });

  it('applies correct icon positioning classes', () => {
    const { rerender } = render(<Button icon={Chrome} iconPosition="left">Left Icon</Button>);
    let button = screen.getByRole('button', { name: 'Left Icon' });
    let icon = button.querySelector('svg');
    expect(icon).toHaveClass('mr-2');
    
    rerender(<Button icon={Chrome} iconPosition="right">Right Icon</Button>);
    button = screen.getByRole('button', { name: 'Right Icon' });
    icon = button.querySelector('svg');
    expect(icon).toHaveClass('ml-2');
  });

  it('applies correct icon sizing based on button size', () => {
    const { rerender } = render(<Button icon={Chrome} size="sm">Small Icon</Button>);
    let button = screen.getByRole('button', { name: 'Small Icon' });
    let icon = button.querySelector('svg');
    expect(icon).toHaveClass('h-4', 'w-4');
    
    rerender(<Button icon={Chrome} size="lg">Large Icon</Button>);
    button = screen.getByRole('button', { name: 'Large Icon' });
    icon = button.querySelector('svg');
    expect(icon).toHaveClass('h-5', 'w-5');
  });
});
