import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const data = await kv.get('thc_scraped_data') || [];
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("Error fetching scraped data from KV:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { data } = await request.json();
    await kv.set('thc_scraped_data', data);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving scraped data to KV:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
