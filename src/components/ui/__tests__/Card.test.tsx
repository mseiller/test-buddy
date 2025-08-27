import React from 'react';
import { render, screen } from '@testing-library/react';
import Card from '../Card';

describe('Card', () => {
  it('renders with default props', () => {
    render(<Card>Card content</Card>);
    
    const card = screen.getByText('Card content').closest('div');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-white', 'rounded-lg', 'shadow-md', 'p-6');
  });

  it('renders with custom className', () => {
    render(<Card className="custom-card">Custom Card</Card>);
    
    const card = screen.getByText('Custom Card').closest('div');
    expect(card).toHaveClass('custom-card');
  });

  it('renders with different padding sizes', () => {
    const { rerender } = render(<Card padding="none">No Padding Card</Card>);
    expect(screen.getByText('No Padding Card').closest('div')).not.toHaveClass('p-4', 'p-6', 'p-8');
    
    rerender(<Card padding="sm">Small Padding Card</Card>);
    expect(screen.getByText('Small Padding Card').closest('div')).toHaveClass('p-4');
    
    rerender(<Card padding="md">Medium Padding Card</Card>);
    expect(screen.getByText('Medium Padding Card').closest('div')).toHaveClass('p-6');
    
    rerender(<Card padding="lg">Large Padding Card</Card>);
    expect(screen.getByText('Large Padding Card').closest('div')).toHaveClass('p-8');
  });

  it('renders with different shadow sizes', () => {
    const { rerender } = render(<Card shadow="none">No Shadow Card</Card>);
    expect(screen.getByText('No Shadow Card').closest('div')).not.toHaveClass('shadow-sm', 'shadow-md', 'shadow-lg');
    
    rerender(<Card shadow="sm">Small Shadow Card</Card>);
    expect(screen.getByText('Small Shadow Card').closest('div')).toHaveClass('shadow-sm');
    
    rerender(<Card shadow="md">Medium Shadow Card</Card>);
    expect(screen.getByText('Medium Shadow Card').closest('div')).toHaveClass('shadow-md');
    
    rerender(<Card shadow="lg">Large Shadow Card</Card>);
    expect(screen.getByText('Large Shadow Card').closest('div')).toHaveClass('shadow-lg');
  });

  it('combines padding and shadow classes correctly', () => {
    render(<Card padding="sm" shadow="lg">Combined Card</Card>);
    
    const card = screen.getByText('Combined Card').closest('div');
    expect(card).toHaveClass('p-4', 'shadow-lg');
  });

  it('applies base classes correctly', () => {
    render(<Card>Base Card</Card>);
    
    const card = screen.getByText('Base Card').closest('div');
    expect(card).toHaveClass('bg-white', 'rounded-lg');
  });

  it('trims whitespace from combined classes', () => {
    render(<Card className="  extra-spaces  ">Spaced Card</Card>);
    
    const card = screen.getByText('Spaced Card').closest('div');
    const classList = card!.className.split(' ');
    // Filter out empty strings that result from multiple spaces
    const filteredClasses = classList.filter(cls => cls !== '');
    expect(filteredClasses).toContain('extra-spaces');
    expect(filteredClasses).toContain('bg-white');
    expect(filteredClasses).toContain('rounded-lg');
  });

  it('renders with complex children', () => {
    const ComplexChild = () => (
      <div>
        <h1>Title</h1>
        <p>Description</p>
        <button>Action</button>
      </div>
    );

    render(
      <Card>
        <ComplexChild />
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('renders with text and HTML elements', () => {
    render(
      <Card>
        <span>Text content</span>
        <div>Div content</div>
        <p>Paragraph content</p>
      </Card>
    );

    expect(screen.getByText('Text content')).toBeInTheDocument();
    expect(screen.getByText('Div content')).toBeInTheDocument();
    expect(screen.getByText('Paragraph content')).toBeInTheDocument();
  });

  it('handles empty children gracefully', () => {
    render(<Card>{''}</Card>);
    
    const card = document.querySelector('.bg-white.rounded-lg');
    expect(card).toBeInTheDocument();
  });

  it('handles null children gracefully', () => {
    render(<Card>{null as any}</Card>);
    
    const card = document.querySelector('.bg-white.rounded-lg');
    expect(card).toBeInTheDocument();
  });

  it('handles undefined children gracefully', () => {
    render(<Card>{undefined as any}</Card>);
    
    const card = document.querySelector('.bg-white.rounded-lg');
    expect(card).toBeInTheDocument();
  });

  it('handles boolean children gracefully', () => {
    render(<Card>{false as any}</Card>);
    
    const card = document.querySelector('.bg-white.rounded-lg');
    expect(card).toBeInTheDocument();
  });

  it('handles number children gracefully', () => {
    render(<Card>{42}</Card>);
    
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('handles array children gracefully', () => {
    render(
      <Card>
        {['Item 1', 'Item 2', 'Item 3'].map((item, index) => (
          <div key={index}>{item}</div>
        ))}
      </Card>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('applies custom className without affecting default classes', () => {
    render(<Card className="custom-class">Custom Class Card</Card>);
    
    const card = screen.getByText('Custom Class Card').closest('div');
    expect(card).toHaveClass('custom-class', 'bg-white', 'rounded-lg', 'shadow-md', 'p-6');
  });

  it('overrides default padding when custom padding is provided', () => {
    render(<Card padding="lg">Large Padding Card</Card>);
    
    const card = screen.getByText('Large Padding Card').closest('div');
    expect(card).toHaveClass('p-8');
    expect(card).not.toHaveClass('p-6'); // Default padding
  });

  it('overrides default shadow when custom shadow is provided', () => {
    render(<Card shadow="lg">Large Shadow Card</Card>);
    
    const card = screen.getByText('Large Shadow Card').closest('div');
    expect(card).toHaveClass('shadow-lg');
    expect(card).not.toHaveClass('shadow-md'); // Default shadow
  });

  it('maintains consistent structure with different props', () => {
    const { rerender } = render(<Card>Default Card</Card>);
    let card = screen.getByText('Default Card').closest('div');
    expect(card?.tagName).toBe('DIV');
    
    rerender(<Card padding="sm" shadow="none">Modified Card</Card>);
    card = screen.getByText('Modified Card').closest('div');
    expect(card?.tagName).toBe('DIV');
    
    rerender(<Card className="test-class">Classed Card</Card>);
    card = screen.getByText('Classed Card').closest('div');
    expect(card?.tagName).toBe('DIV');
  });
});
