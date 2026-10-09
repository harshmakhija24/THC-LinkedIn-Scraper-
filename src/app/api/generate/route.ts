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
       systemPrompt = `You are an expert Content Analyst. Your goal is to synthesize the provided briefs into a clear, structured summary. \n\nIMPORTANT: Output the summary in clean, plain text formatting. Do NOT use markdown tables, HTML tags (like <br>), or complex markdown. Use standard paragraphs, newlines, and dash (-) or asterisk (*) for bullet points so it reads perfectly in a standard raw text editor.`;
       userPrompt = `Please summarize the following selected topics. Provide the output precisely in this structure:\n\n1. Source(s): [Name of the author(s) or newsletter(s)]\n2. Overarching Topic(s): [Main topics covered]\n3. Overall Summary: [Synthesize what they are saying overall in exactly 150-200 words maximum. Be concise and insightful.]\n4. Emerging Patterns & Trends: [Identify any patterns, new angles, or engagement trends (if metrics like impressions/engagement rate are provided) across these posts.]\n\nHere are the topics:\n\n${briefText}`;
    } else {
       systemPrompt = `You are an expert Ghostwriter and Social Media Strategist. Your goal is to write highly engaging content based on the provided brief(s).\n\nIMPORTANT INSTRUCTIONS:\n- You are ghostwriting AS the owner of this LinkedIn Profile URL: ${targetProfile}. The content must sound like it is coming directly FROM them, written in the first person ("I", "we").\n- The content type you must generate is: ${contentType}.\n- Structure the content specifically for the ${contentType} format to maximize reach and algorithm push.\n- DO NOT use markdown tables or HTML tags (like <br>). Use standard plain text paragraphs, spacing, and emojis so it is ready to be copied and pasted directly to social media.`;
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
      model: "openai/gpt-oss-20b",
    });

    const draft = completion.choices[0]?.message?.content || "";

    return NextResponse.json({ draft });
  } catch (error: any) {
    console.error("Error generating draft:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
