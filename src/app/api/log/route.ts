import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message, details, fileInfo } = await req.json();
    console.error('--- FRONTEND ERROR LOG ---');
    console.error('Message:', message);
    console.error('Details:', details);
    console.error('File Info:', fileInfo);
    console.error('--------------------------');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
