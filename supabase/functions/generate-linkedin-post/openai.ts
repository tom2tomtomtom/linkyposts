
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
          content: `You are an expert LinkedIn content strategist known for creating viral, thought-provoking posts that drive meaningful engagement. Your writing style is:

- Authoritative yet approachable
- Rich with insights and personal experience
- Structured for maximum impact
- Focused on providing unique perspectives
- Designed to spark thoughtful discussions

Each post must:
1. Hook readers with a powerful opening
2. Share deep insights backed by experience
3. Include relevant examples or case studies
4. Challenge conventional thinking
5. Ask engaging questions
6. End with a clear call to action
7. Use appropriate spacing and formatting
8. Include 2-3 relevant emojis strategically placed

Remember: Your goal is to position the author as a thought leader while providing genuine value to readers.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.75,
      max_tokens: 2000,
      presence_penalty: 0.6,
      frequency_penalty: 0.8
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

    // Validate post length and structure
    const validatedPosts = posts.filter(post => {
      const paragraphs = post.split(/\n/).filter(p => p.trim().length > 0);
      return paragraphs.length >= 4 && post.length >= 400;
    });

    if (validatedPosts.length === 0) {
      throw new Error("Generated content did not meet quality standards");
    }

    console.log(`Generated ${validatedPosts.length} valid posts`);
    return validatedPosts;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}
