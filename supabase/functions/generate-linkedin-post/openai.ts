
import OpenAI from "https://deno.land/x/openai@v4.20.1/mod.ts";

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
});

export async function generateAnalysis(prompt: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a skilled professional content creator specializing in LinkedIn posts. Create engaging, insightful posts that drive engagement and demonstrate thought leadership. When article content is provided, focus primarily on discussing and analyzing that content while adding professional insights."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    // Split the response into individual posts
    const posts = content
      .split(/(?:\r?\n){2,}/)
      .filter(post => post.trim().length > 0)
      .map(post => post.trim());

    return posts;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}
