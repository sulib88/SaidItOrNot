import { NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
};

async function GET() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE}/api/authors`,
    {
      cache: 'no-store',
    }
  );

  const data = await res.json();
  return NextResponse.json(data);
}

export default GET;
