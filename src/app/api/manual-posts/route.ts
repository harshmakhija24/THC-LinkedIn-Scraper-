import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const posts = await kv.get('thc_manual_posts') || [];
    return NextResponse.json({ posts });
  } catch (error: any) {
    console.error("Error fetching manual posts from KV:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { posts } = await request.json();
    await kv.set('thc_manual_posts', posts);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving manual posts to KV:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
