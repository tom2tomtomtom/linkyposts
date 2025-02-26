
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export async function generateAnalysis(prompt: string): Promise<string[]> {
  try {
    console.log("Sending prompt to OpenAI:", prompt.slice(0, 500) + "...");

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are an expert LinkedIn content strategist and thought leader who excels at:
1. Analyzing multiple sources to form unique, well-researched opinions
2. Creating viral, thought-provoking posts that drive meaningful engagement
3. Connecting ideas across different sources to provide fresh insights
4. Challenging conventional wisdom with data-backed arguments

Your writing style is:
- Authoritative yet approachable
- Research-based and analytical
- Structured for maximum impact
- Focused on providing unique perspectives
- Designed to spark thoughtful discussions

Each post must:
1. Start with a powerful hook based on the main article
2. Present a clear thesis/opinion supported by multiple sources
3. Include specific examples and data points
4. Challenge common assumptions
5. Connect ideas across different sources
6. Offer unique insights and practical takeaways
7. End with a thought-provoking question or call to action
8. Use proper spacing and formatting for readability
9. Include 2-3 relevant emojis strategically placed

Structure each post with:
- Opening hook (1-2 sentences)
- Main insight/opinion (2-3 sentences)
- Supporting evidence from sources (2-3 paragraphs)
- Counter-arguments or nuanced perspective (1 paragraph)
- Personal/professional experience or example (1 paragraph)
- Action-oriented conclusion (1-2 sentences)
- Engaging question or call to action

Remember: Your goal is to demonstrate thought leadership by synthesizing information from multiple sources into valuable insights for your audience.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        presence_penalty: 0.6,
        frequency_penalty: 0.8
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    console.log("Received response from OpenAI:", JSON.stringify(data).slice(0, 500) + "...");

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    // Split the response into individual posts
    const posts = content
      .split(/(?:\r?\n){2,}/)
      .filter(post => post.trim().length > 0)
      .map(post => post.trim());

    // Validate post length and structure
    const validatedPosts = posts.filter(post => {
      const paragraphs = post.split(/\n/).filter(p => p.trim().length > 0);
      return paragraphs.length >= 3 && post.length >= 100;
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
