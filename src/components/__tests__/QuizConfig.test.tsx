import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuizConfig from '../QuizConfig';

describe('QuizConfig', () => {
  const mockOnConfigSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    expect(screen.getByText('Quiz Configuration')).toBeInTheDocument();
    expect(screen.getByText('Generate Quiz')).toBeInTheDocument();
    expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Test name input
    expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // Question count
  });

  it('renders retake configuration when isRetake is true', () => {
    render(
      <QuizConfig 
        onConfigSubmit={mockOnConfigSubmit} 
        isRetake={true}
        originalTestName="Test Quiz"
      />
    );
    
    expect(screen.getByText('Retake Quiz Configuration')).toBeInTheDocument();
    expect(screen.getByText('Retaking Quiz')).toBeInTheDocument();
    expect(screen.getByText('Test Quiz')).toBeInTheDocument();
  });

  it('renders all quiz type options', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    expect(screen.getByText('Fill in the Blank')).toBeInTheDocument();
    expect(screen.getByText('Essay Questions')).toBeInTheDocument();
    expect(screen.getByText('Mixed Types')).toBeInTheDocument();
  });

  it('shows MCQ as selected by default', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const mcqOption = screen.getByText('Multiple Choice').closest('div')?.parentElement?.parentElement;
    expect(mcqOption).toHaveClass('border-indigo-500', 'bg-indigo-50');
  });

  it('allows selecting different quiz types', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const fillInBlankOption = screen.getByText('Fill in the Blank').closest('div')?.parentElement?.parentElement;
    fireEvent.click(fillInBlankOption!);
    
    expect(fillInBlankOption).toHaveClass('border-indigo-500', 'bg-indigo-50');
  });

  it('updates question count when slider is moved', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '15' } });
    
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('allows entering custom test name', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const testNameInput = screen.getByDisplayValue('');
    fireEvent.change(testNameInput, { target: { value: 'Custom Test Name' } });
    
    expect(testNameInput).toHaveValue('Custom Test Name');
  });

  it('calls onConfigSubmit with correct values when form is submitted', async () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const testNameInput = screen.getByDisplayValue('');
    fireEvent.change(testNameInput, { target: { value: 'My Test' } });
    
    const generateButton = screen.getByText('Generate Quiz');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockOnConfigSubmit).toHaveBeenCalledWith('MCQ', 5, 'My Test');
    });
  });

  it('uses default test name when test name is empty', async () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const generateButton = screen.getByText('Generate Quiz');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockOnConfigSubmit).toHaveBeenCalledWith('MCQ', 5, 'MCQ Quiz');
    });
  });

  it('trims whitespace from test name', async () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const testNameInput = screen.getByDisplayValue('');
    fireEvent.change(testNameInput, { target: { value: '  Test with spaces  ' } });
    
    const generateButton = screen.getByText('Generate Quiz');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockOnConfigSubmit).toHaveBeenCalledWith('MCQ', 5, 'Test with spaces');
    });
  });

  it('shows loading state when loading is true', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} loading={true} />);
    
    expect(screen.getByText('Generating Quiz...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} loading={true} />);
    
    const spinner = screen.getByText('Generating Quiz...').querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('allows changing quiz type and question count before submission', async () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    // Change quiz type
    const fillInBlankOption = screen.getByText('Fill in the Blank').closest('div')?.parentElement?.parentElement;
    fireEvent.click(fillInBlankOption!);
    
    // Change question count
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '25' } });
    
    // Change test name
    const testNameInput = screen.getByDisplayValue('');
    fireEvent.change(testNameInput, { target: { value: 'Updated Test' } });
    
    const generateButton = screen.getByText('Generate Quiz');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockOnConfigSubmit).toHaveBeenCalledWith('Fill-in-the-blank', 25, 'Updated Test');
    });
  });

  it('shows correct question count range', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    expect(screen.getByText('5 questions')).toBeInTheDocument();
    expect(screen.getByText('100 questions')).toBeInTheDocument();
  });

  it('has correct slider attributes', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '5');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('value', '5');
  });

  it('shows quiz type descriptions', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    expect(screen.getByText('Questions with single or multiple answer options (AI decides)')).toBeInTheDocument();
    expect(screen.getByText('Complete sentences with missing words')).toBeInTheDocument();
    expect(screen.getByText('Open-ended questions requiring detailed answers')).toBeInTheDocument();
    expect(screen.getByText('Combination of all question types')).toBeInTheDocument();
  });

  it('shows help text for test name input', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    expect(screen.getByText('Leave blank to use default name based on quiz type')).toBeInTheDocument();
  });

  it('shows placeholder text in test name input', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const testNameInput = screen.getByDisplayValue('');
    expect(testNameInput).toHaveAttribute('placeholder', 'Enter a name for your test (e.g., \'Software Security Quiz\')');
  });

  it('applies correct styling to selected quiz type', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const mcqOption = screen.getByText('Multiple Choice').closest('div')?.parentElement?.parentElement;
    expect(mcqOption).toHaveClass('border-indigo-500', 'bg-indigo-50');
    
    const fillInBlankOption = screen.getByText('Fill in the Blank').closest('div')?.parentElement?.parentElement;
    expect(fillInBlankOption).toHaveClass('border-gray-200');
  });

  it('shows selection indicator for selected quiz type', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const mcqOption = screen.getByText('Multiple Choice').closest('div')?.parentElement?.parentElement;
    const indicator = mcqOption?.querySelector('.w-4.h-4.bg-indigo-500.rounded-full');
    expect(indicator).toBeInTheDocument();
  });

  it('maintains form state during interactions', () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    // Change values
    const testNameInput = screen.getByDisplayValue('');
    fireEvent.change(testNameInput, { target: { value: 'Test Name' } });
    
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '15' } });
    
    // Verify values are maintained
    expect(testNameInput).toHaveValue('Test Name');
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('handles form submission with all default values', async () => {
    render(<QuizConfig onConfigSubmit={mockOnConfigSubmit} />);
    
    const generateButton = screen.getByText('Generate Quiz');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockOnConfigSubmit).toHaveBeenCalledWith('MCQ', 5, 'MCQ Quiz');
    });
  });
});
