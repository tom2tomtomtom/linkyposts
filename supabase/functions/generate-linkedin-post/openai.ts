
import OpenAI from "https://deno.land/x/openai@v4.20.1/mod.ts";

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY')!,
});

export async function generateAnalysis(prompt: string): Promise<string[]> {
  try {
    console.log("Sending prompt to OpenAI:", prompt.slice(0, 500) + "...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a skilled professional content creator specializing in LinkedIn posts. When given an article, focus on discussing and analyzing its key points while adding valuable insights. Create engaging, insightful posts that drive engagement and demonstrate thought leadership."
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
