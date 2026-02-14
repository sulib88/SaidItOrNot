import { NextRequest, NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

async function POST(request: NextRequest) {
  const body = await request.json();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/api/quote/random`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    }
  );

  const data = await res.json();
  return NextResponse.json(data);
}

export default POST;
