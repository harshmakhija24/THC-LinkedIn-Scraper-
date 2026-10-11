import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'fake-key', 
});

export async function POST(req: Request) {
  try {
    const { briefs, targetProfile, contentType, generateType } = await req.json();

    const briefText = briefs.map((b: any, i: number) => {
      let text = `Brief ${i+1}:\nSource/Author: ${b.source || 'Unknown'}\nTitle: ${b.title}\n`;
      if (b.engagementRate) text += `Engagement Rate: ${b.engagementRate}\n`;
      if (b.impressions) text += `Impressions: ${b.impressions}\n`;
      text += `Summary: ${b.summary}\nOriginal Context: ${b.originalText}`;
      return text;
    }).join('\n\n');

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ 
        draft: `[MOCK DRAFT - PLEASE SET GROQ_API_KEY in .env.local]\n\nDraft for ${targetProfile} as a ${contentType} based on ${briefs.length} brief(s).` 
      });
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (generateType === 'summary') {
       systemPrompt = `You are an expert Content Analyst. Your goal is to synthesize the provided briefs into a clear, structured summary. \n\nIMPORTANT: Output the summary in clean, plain text formatting. Do NOT use markdown tables, HTML tags (like <br>), or complex markdown. Use standard paragraphs, newlines, and dash (-) or bullet points so it reads perfectly in a standard raw text editor. DO NOT use asterisks (**) for bolding, as this will be copied as raw text.`;
       userPrompt = `Please summarize the following selected topics. Provide the output precisely in this structure:\n\n1. Source(s): [Name of the author(s) or newsletter(s)]\n2. Overarching Topic(s): [Main topics covered]\n3. Overall Summary: [Synthesize what they are saying overall in exactly 150-200 words maximum. Be concise and insightful.]\n4. Emerging Patterns & Trends: [Identify any patterns, new angles, or engagement trends (if metrics like impressions/engagement rate are provided) across these posts.]\n\nHere are the topics:\n\n${briefText}`;
    } else if (generateType === 'variations') {
       systemPrompt = `You are an expert Ghostwriter. The user has provided a raw draft. Your goal is to rewrite it into 4 distinct variations for ${contentType}.

CRITICAL FORMATTING RULES:
1. You are ghostwriting AS the owner of this LinkedIn Profile URL: ${targetProfile}. Write in the first person.
2. DO NOT output any introduction like "Here are 4 variations:". Just output the variations directly.
3. DO NOT use ANY markdown formatting. NO asterisks (**) for bold, NO underscores (_) for italics, NO hashtags (#) for headings, NO markdown tables, NO HTML.
4. Separate EACH variation using EXACTLY this string on its own line:
---VARIATION_SPLIT---
5. DO NOT add titles like "Variation 1: Professional" before the content. Just write the post content directly.

Example Output:
[Variation 1 post content...]
---VARIATION_SPLIT---
[Variation 2 post content...]
---VARIATION_SPLIT---
[Variation 3 post content...]
---VARIATION_SPLIT---
[Variation 4 post content...]`;
       userPrompt = `Please rewrite this raw draft into 4 different variations (e.g., 1. Professional, 2. Conversational, 3. Short & Punchy, 4. Story-Driven):\n\n${briefText}`;
    } else {
       systemPrompt = `You are an expert Ghostwriter and Social Media Strategist. Your goal is to write highly engaging content based on the provided brief(s).

CRITICAL FORMATTING RULES:
1. You are ghostwriting AS the owner of this LinkedIn Profile URL: ${targetProfile}. The content must sound like it is coming directly FROM them, written in the first person ("I", "we").
2. The content type you must generate is: ${contentType}.
3. DO NOT output any titles like "Newsletter Issue" or "LinkedIn Post" at the top. Just output the content directly.
4. DO NOT use ANY markdown formatting. NO asterisks (**) for bold, NO underscores (_) for italics, NO hashtags (#) for headings, NO markdown tables, NO HTML.
5. Use ONLY plain text, standard spacing, and emojis. This text must be directly copyable to social media without exposing markdown symbols.`;
       userPrompt = `Write a compelling ${contentType} for ${targetProfile} based on the following topics. You can combine them or focus on the most interesting aspects:\n\n${briefText}`;
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      model: "llama3-70b-8192",
    });

    let draft = completion.choices[0]?.message?.content || "";
    
    // Force strip markdown characters that LLMs stubbornly include
    draft = draft.replace(/\*/g, ''); // Removes all asterisks, including **
    draft = draft.replace(/### /g, '');
    draft = draft.replace(/## /g, '');
    draft = draft.replace(/^# /gm, '');
    draft = draft.replace(/_/g, '');


    if (generateType === 'variations') {
      // Use regex split to handle cases where LLM might add spaces around the separator or use lowercase
      const variations = draft.split(/\s*---VARIATION_SPLIT---\s*/i).map(v => v.trim()).filter(v => v);
      return NextResponse.json({ variations: variations.length > 0 ? variations : [draft] });
    }

    return NextResponse.json({ draft });
  } catch (error: any) {
    console.error("Error generating draft:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
