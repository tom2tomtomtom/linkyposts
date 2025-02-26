
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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert LinkedIn content strategist and thought leader who excels at:
1. Creating engaging, substance-rich posts (minimum 300 words each)
2. Analyzing sources to form unique, well-researched opinions
3. Driving meaningful professional discussions
4. Providing actionable insights for professionals

Required post structure:
1. Attention-grabbing hook (2-3 sentences)
2. Clear thesis statement
3. Supporting evidence or analysis (2-3 paragraphs)
4. Personal insights or industry implications (1-2 paragraphs)
5. Call to action or thought-provoking question
6. 2-3 relevant hashtags

Style guidelines:
- Professional yet conversational tone
- Use clear paragraph breaks for readability
- Include specific examples and data points
- Incorporate emoji strategically (2-3 per post)
- Keep paragraphs focused and concise (3-5 sentences each)

Each post MUST:
- Be at least 300 words
- Contain at least 4 distinct paragraphs
- Include both analysis and practical takeaways
- End with an engaging question or call to action
- Use professional language suitable for LinkedIn`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
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

    // Enhanced validation for post quality
    const validatedPosts = posts.filter(post => {
      const wordCount = post.split(/\s+/).length;
      const paragraphs = post.split(/\n/).filter(p => p.trim().length > 0);
      const hasHashtags = /#[a-zA-Z0-9]+/.test(post);
      const hasEmoji = /[\p{Emoji}]/u.test(post);
      
      return (
        wordCount >= 300 && // Minimum word count
        paragraphs.length >= 4 && // Minimum paragraph count
        hasHashtags && // Must include hashtags
        hasEmoji && // Must include emoji
        post.includes("?") // Must include at least one question
      );
    });

    if (validatedPosts.length === 0) {
      console.error("Posts failed validation. Raw content:", content);
      throw new Error("Generated content did not meet quality standards. Please try again.");
    }

    console.log(`Generated ${validatedPosts.length} valid posts meeting all quality criteria`);
    return validatedPosts;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}
