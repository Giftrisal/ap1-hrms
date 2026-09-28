import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Return OK indicating no pending commands
  return new NextResponse('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' }
  });
}
