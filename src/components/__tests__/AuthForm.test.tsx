import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthForm from '../AuthForm';
import { FirebaseService } from '@/services/firebaseService';

// Mock FirebaseService
jest.mock('@/services/firebaseService', () => ({
  FirebaseService: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signInWithGoogle: jest.fn(),
  },
}));

const mockFirebaseService = FirebaseService as jest.Mocked<typeof FirebaseService>;

describe('AuthForm', () => {
  const mockOnAuthSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthSuccess.mockClear();
  });

  it('renders login form by default', () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Google' })).toBeInTheDocument();
  });

  it('switches to sign-up form when toggle button is clicked', () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const toggleButton = screen.getByRole('button', { name: "Don't have an account? Sign up" });
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Display Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('switches back to login form from sign-up', () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to sign-up
    const toggleToSignUp = screen.getByRole('button', { name: "Don't have an account? Sign up" });
    fireEvent.click(toggleToSignUp);
    
    // Switch back to login
    const toggleToLogin = screen.getByRole('button', { name: 'Already have an account? Sign in' });
    fireEvent.click(toggleToLogin);
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('calls onAuthSuccess with user data on successful sign in', async () => {
    const mockUser = { uid: '123', email: 'test@example.com', displayName: 'Test User' };
    mockFirebaseService.signIn.mockResolvedValue(mockUser);
    
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockFirebaseService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockOnAuthSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it('calls onAuthSuccess with user data on successful sign up', async () => {
    const mockUser = { uid: '123', email: 'test@example.com', displayName: 'Test User' };
    mockFirebaseService.signUp.mockResolvedValue(mockUser);
    
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to sign-up
    const toggleButton = screen.getByRole('button', { name: "Don't have an account? Sign up" });
    fireEvent.click(toggleButton);
    
    const displayNameInput = screen.getByPlaceholderText('Display Name');
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    fireEvent.change(displayNameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockFirebaseService.signUp).toHaveBeenCalledWith('test@example.com', 'password123', 'Test User');
      expect(mockOnAuthSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it('shows loading state during submission', async () => {
    mockFirebaseService.signIn.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it('shows loading state during sign up submission', async () => {
    mockFirebaseService.signUp.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to sign-up
    const toggleButton = screen.getByRole('button', { name: "Don't have an account? Sign up" });
    fireEvent.click(toggleButton);
    
    const displayNameInput = screen.getByPlaceholderText('Display Name');
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    fireEvent.change(displayNameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Creating account...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  it('handles Google sign in', async () => {
    const mockUser = { uid: '123', email: 'test@example.com', displayName: 'Test User' };
    mockFirebaseService.signInWithGoogle.mockResolvedValue(mockUser);
    
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const googleButton = screen.getByRole('button', { name: 'Google' });
    fireEvent.click(googleButton);
    
    await waitFor(() => {
      expect(mockFirebaseService.signInWithGoogle).toHaveBeenCalled();
      expect(mockOnAuthSuccess).toHaveBeenCalledWith(mockUser);
    });
  });

  it('shows error message when sign in fails', async () => {
    const errorMessage = 'Authentication failed';
    mockFirebaseService.signIn.mockRejectedValue(new Error(errorMessage));
    
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows error message when sign up fails', async () => {
    const errorMessage = 'Account creation failed';
    mockFirebaseService.signUp.mockRejectedValue(new Error(errorMessage));
    
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Switch to sign-up
    const toggleButton = screen.getByRole('button', { name: "Don't have an account? Sign up" });
    fireEvent.click(toggleButton);
    
    const displayNameInput = screen.getByPlaceholderText('Display Name');
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    
    fireEvent.change(displayNameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('shows error message when Google sign in fails', async () => {
    const errorMessage = 'Google sign in failed';
    mockFirebaseService.signInWithGoogle.mockRejectedValue(new Error(errorMessage));
    
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    const googleButton = screen.getByRole('button', { name: 'Google' });
    fireEvent.click(googleButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('clears error message when switching between modes', () => {
    render(<AuthForm onAuthSuccess={mockOnAuthSuccess} />);
    
    // Trigger an error first
    mockFirebaseService.signIn.mockRejectedValue(new Error('Test error'));
    
    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    // Wait for error to appear
    waitFor(() => {
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
    
    // Switch to sign-up (should clear error)
    const toggleButton = screen.getByRole('button', { name: "Don't have an account? Sign up" });
    fireEvent.click(toggleButton);
    
    expect(screen.queryByText('Test error')).not.toBeInTheDocument();
  });
});
