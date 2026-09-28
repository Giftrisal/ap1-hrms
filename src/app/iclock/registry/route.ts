import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return new NextResponse('RegistryCode=1\r\n', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}
