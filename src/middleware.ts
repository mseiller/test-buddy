import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next();

  // Security headers
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://openrouter.ai https://firestore.googleapis.com https://identitytoolkit.googleapis.com",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');

  // Apply headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Apply CSP
  response.headers.set('Content-Security-Policy', csp);

  // Apply HSTS for HTTPS
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Basic request validation
  const userAgent = request.headers.get('user-agent');
  const contentType = request.headers.get('content-type');
  const contentLength = request.headers.get('content-length');

  // Block suspicious user agents
  const suspiciousUserAgents = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python', 'java'
  ];

  if (userAgent && suspiciousUserAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    // Log suspicious user agent but don't block (could be legitimate crawlers)
    console.log('Suspicious user agent detected:', userAgent);
  }

  // Validate content length for POST requests
  if (request.method === 'POST' && contentLength) {
    const size = parseInt(contentLength);
    if (size > 50 * 1024 * 1024) { // 50MB limit
      return new NextResponse('Request too large', { status: 413 });
    }
  }

  // Block certain file types in uploads
  if (contentType && request.method === 'POST') {
    const blockedTypes = [
      'application/x-executable',
      'application/x-msdownload',
      'application/x-msi',
      'application/x-msdos-program'
    ];

    if (blockedTypes.some(type => contentType.includes(type))) {
      return new NextResponse('File type not allowed', { status: 400 });
    }
  }

  // Rate limiting headers (basic implementation)
  const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimitKey = `rate_limit:${clientIp}`;
  
  // In a real implementation, you would check against a Redis store or similar
  // For now, we'll just add rate limit headers
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '99'); // Mock value
  response.headers.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + 60).toString());

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
