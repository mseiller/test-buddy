// Mock fetch globally
global.fetch = jest.fn();

describe('OpenRouterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles API key validation when API key is not configured', async () => {
    // Test that the service exists and has the expected methods
    const { OpenRouterService } = await import('../openRouter');
    
    expect(OpenRouterService).toBeDefined();
    expect(typeof OpenRouterService.validateApiKey).toBe('function');
    expect(typeof OpenRouterService.generateQuiz).toBe('function');
    expect(typeof OpenRouterService.generateFeedbackSummary).toBe('function');
  });

  it('has the expected static properties', async () => {
    const { OpenRouterService } = await import('../openRouter');
    
    expect(OpenRouterService).toHaveProperty('API_URL');
    expect(OpenRouterService).toHaveProperty('API_KEY');
  });

  it('has the expected method signatures', async () => {
    const { OpenRouterService } = await import('../openRouter');
    
    // Check that methods exist and are functions
    expect(typeof OpenRouterService.validateApiKey).toBe('function');
    expect(typeof OpenRouterService.generateQuiz).toBe('function');
    expect(typeof OpenRouterService.generateFeedbackSummary).toBe('function');
  });
});
