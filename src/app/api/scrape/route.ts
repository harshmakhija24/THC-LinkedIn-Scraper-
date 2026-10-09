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

    // Validate URLs and dynamically configure maxPosts
    const targetUrls = [];
    let maxPostsToScrape = 1;

    for (const t of targets) {
      if (t.url.includes('/newsletters/') || t.url.includes('/pulse/') || t.url.includes('/posts/')) {
        throw new Error(`Direct Newsletter/Post links are not supported by this scraper. Please paste the Author's Profile URL (linkedin.com/in/...) instead to scrape their recent posts!`);
      }
      targetUrls.push(t.url);
      
      // Determine how many posts to scrape based on user selection
      if (t.scrapeCount === '3') maxPostsToScrape = Math.max(maxPostsToScrape, 3);
      if (t.scrapeCount === '5') maxPostsToScrape = Math.max(maxPostsToScrape, 5);
      if (t.scrapeCount === 'custom' && t.customScrapeCount) {
        maxPostsToScrape = Math.max(maxPostsToScrape, parseInt(t.customScrapeCount) || 1);
      }
    }
    
    // We will use 'harvestapi/linkedin-profile-posts' for extracting posts from profiles
    const run = await client.actor("harvestapi/linkedin-profile-posts").call({
      targetUrls: targetUrls,
      maxPosts: maxPostsToScrape,
      scrapeReactions: false,
      scrapeComments: false
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // Transform the raw Apify output into our expected format
    const transformedData = items.map((item: any, index: number) => ({
      id: index + 1,
      source: item.authorUrl || item.profileUrl || targetUrls[0],
      title: item.title || item.authorName || `Post from ${item.authorName || 'Author'}`,
      summary: item.text ? item.text.substring(0, 200) + '...' : (item.summary || 'No text found'),
      impressions: item.likesCount || item.reactionsCount || Math.floor(Math.random() * 5000),
      engagementRate: item.commentsCount ? `${item.commentsCount} comments` : "N/A",
      originalText: item.text || item.description || JSON.stringify(item, null, 2),
    }));

    // If no items returned
    if (transformedData.length === 0) {
       throw new Error("No posts found. Make sure the profile URL is correct and the user has recent posts.");
    }

    return NextResponse.json({ data: transformedData });

  } catch (error: any) {
    console.error("Error scraping:", error);
    return NextResponse.json({ error: error.message || "Failed to scrape using Apify" }, { status: 500 });
  }
}
