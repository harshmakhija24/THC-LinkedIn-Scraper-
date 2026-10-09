import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'fake-key', 
});

export async function POST(req: Request) {
  try {
    const { briefs, targetProfile, contentType, generateType } = await req.json();

    const briefText = briefs.map((b: any, i: number) => `Brief ${i+1}:\nTitle: ${b.title}\nSummary: ${b.summary}\nOriginal Context: ${b.originalText}`).join('\n\n');

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ 
        draft: `[MOCK DRAFT - PLEASE SET GROQ_API_KEY in .env.local]\n\nDraft for ${targetProfile} as a ${contentType} based on ${briefs.length} brief(s).` 
      });
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (generateType === 'summary') {
       systemPrompt = `You are an expert Content Analyst. Your goal is to synthesize the provided briefs into a clear, structured summary.`;
       userPrompt = `Please summarize the following topics. Pull out the key themes, insights, and potential angles that could be useful for writing a ${contentType} later:\n\n${briefText}`;
    } else {
       systemPrompt = `You are an expert Ghostwriter and Social Media Strategist. Your goal is to write highly engaging content based on the provided brief(s).\n\nIMPORTANT INSTRUCTIONS:\n- You are ghostwriting AS the owner of this LinkedIn Profile URL: ${targetProfile}. The content must sound like it is coming directly FROM them, written in the first person ("I", "we").\n- The content type you must generate is: ${contentType}.\n- Structure the content specifically for the ${contentType} format to maximize reach and algorithm push.\n- Use formatting like bullet points or emojis where appropriate. Keep it engaging and professional.`;
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
