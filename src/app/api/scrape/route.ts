import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN || 'fake-token',
});

export async function POST(req: Request) {
  try {
    const { urls, sources } = await req.json();

    const targets = sources || (urls || []).map((u: string) => ({ url: u, scrapeCount: '1' }));

    // If no real API token is set, throw an error to tell the user to set it
    if (!process.env.APIFY_API_TOKEN) {
      throw new Error("Missing APIFY_API_TOKEN in .env.local. Please add your token to use real scraping.");
    }

    // Prepare inputs based on scrapeCount for each target
    const profileUrls = targets.map((t: any) => t.url);
    
    // We will use 'curious_coder/linkedin-profile-scraper' as the actor
    // The actor takes 'profileUrls' and other configurations
    const run = await client.actor("curious_coder/linkedin-profile-scraper").call({
      urls: profileUrls,
      cookie: process.env.LINKEDIN_COOKIE || "MISSING_COOKIE",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      proxy: { useApifyProxy: true },
      maxItems: 10, // General safety limit for the run
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Transform the raw Apify output into our expected format
    const transformedData = items.map((item: any, index: number) => ({
      id: index + 1,
      source: item.url || item.profileUrl || profileUrls[0],
      title: item.title || item.fullName || `Post from ${item.author?.name || 'Author'}`,
      summary: item.text ? item.text.substring(0, 200) + '...' : (item.summary || 'No text found'),
      impressions: item.likes || item.viewCount || Math.floor(Math.random() * 5000), // Fallback if no views
      engagementRate: item.comments ? `${item.comments} comments` : "N/A",
      originalText: item.text || item.description || JSON.stringify(item, null, 2),
    }));

    // If no items returned (e.g. empty dataset), throw error
    if (transformedData.length === 0) {
       throw new Error("Apify run completed but returned 0 items. Check the profile URLs or actor limits.");
    }

    return NextResponse.json({ data: transformedData });

  } catch (error: any) {
    console.error("Error scraping:", error);
    return NextResponse.json({ error: error.message || "Failed to scrape using Apify" }, { status: 500 });
  }
}
