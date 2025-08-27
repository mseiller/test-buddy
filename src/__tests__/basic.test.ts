/**
 * Basic test to verify testing infrastructure is working
 */

describe('Basic Test Suite', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('should handle object equality', () => {
    const obj1 = { name: 'test', value: 123 };
    const obj2 = { name: 'test', value: 123 };
    expect(obj1).toEqual(obj2);
  });

  it('should handle array operations', () => {
    const array = [1, 2, 3, 4, 5];
    expect(array).toHaveLength(5);
    expect(array).toContain(3);
  });
});

describe('String Operations', () => {
  it('should handle string concatenation', () => {
    const str1 = 'Hello';
    const str2 = 'World';
    expect(`${str1  } ${  str2}`).toBe('Hello World');
  });

  it('should handle string methods', () => {
    const str = '  test string  ';
    expect(str.trim()).toBe('test string');
    expect(str.toUpperCase()).toBe('  TEST STRING  ');
  });
});

describe('Math Operations', () => {
  it('should handle basic math', () => {
    expect(10 + 5).toBe(15);
    expect(10 - 5).toBe(5);
    expect(10 * 5).toBe(50);
    expect(10 / 5).toBe(2);
  });

  it('should handle decimal precision', () => {
    expect(0.1 + 0.2).toBeCloseTo(0.3);
  });
});
