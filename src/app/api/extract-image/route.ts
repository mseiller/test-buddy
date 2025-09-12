import { NextResponse } from 'next/server';

const OR_KEY = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export async function POST(req: Request) {
  if (!OR_KEY) {
    return NextResponse.json({ error: 'OCR service not configured' }, { status: 500 });
  }

  // --- Pro-only gate ---
  const plan = req.headers.get('x-user-plan')?.toLowerCase() ?? 'free';
  if (plan !== 'pro') {
    return NextResponse.json({ error: 'OCR is a Pro feature' }, { status: 403 });
  }

  let body: { fileName?: string; dataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { dataUrl, fileName = 'image' } = body || {};
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Expected dataUrl: data:image/*;base64,...' }, { status: 400 });
  }

  // Only these two models, in this order
  const models = ['openai/gpt-4o-mini', 'openai/gpt-5-mini'] as const;

  // Build a single prompt that coerces JSON back
  const content = [
    {
      type: 'input_text',
      text: 'Extract all readable text from the image. Return plain text. No JSON, no extra words.'
    },
    { type: 'input_image', image_url: dataUrl }
  ];

  let lastErr: any;
  for (const model of models) {
    try {
      const r = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OR_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://example.com',
          'X-Title': 'Test Buddy OCR'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content }],
          temperature: 0.0,
        })
      });

      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error?.message || r.statusText);

      const text = json?.choices?.[0]?.message?.content?.trim?.();
      if (text) {
        return NextResponse.json({ text, model, fileName });
      } else {
        throw new Error('Empty OCR result');
      }
    } catch (e) {
      lastErr = e;
      // continue to backup model
    }
  }

  return NextResponse.json(
    { error: 'OCR failed with both models', detail: String(lastErr) },
    { status: 502 }
  );
}