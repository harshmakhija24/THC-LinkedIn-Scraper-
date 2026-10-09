import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const sources = await kv.get('thc_sources') || [];
    return NextResponse.json({ sources });
  } catch (error: any) {
    console.error("Error fetching sources from KV:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { sources } = await req.json();
    await kv.set('thc_sources', sources);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving sources to KV:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
