
import { OpenAI } from "https://deno.land/x/openai@v4.20.1/mod.ts";

const openai = new OpenAI(Deno.env.get('OPENAI_API_KEY')!);

export async function generateAnalysis(prompt: string): Promise<string[]> {
  try {
    console.log("Sending prompt to OpenAI:", prompt.slice(0, 500) + "...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert LinkedIn content creator who specializes in writing engaging, thought-provoking posts that generate high engagement. Your posts should:

1. Be 4-8 paragraphs long
2. Include a strong hook in the first line
3. Share personal insights or experiences
4. Use appropriate spacing for readability
5. Include thought-provoking questions
6. End with a clear call to action
7. Use relevant emojis sparingly (1-3 per post)
8. Follow LinkedIn best practices for formatting

When given an article, analyze its key points and add your professional perspective while maintaining the specified tone and point of view.

Each post should feel authentic, professionally written, and encourage meaningful discussions.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.85,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    console.log("Received response from OpenAI:", content.slice(0, 500) + "...");

    // Split the response into individual posts
    const posts = content
      .split(/(?:\r?\n){2,}/)
      .filter(post => post.trim().length > 0)
      .map(post => post.trim());

    console.log(`Split response into ${posts.length} posts`);
    return posts;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}
