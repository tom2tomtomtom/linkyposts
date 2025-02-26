
import { PostGenInput } from "./types.ts";

export function generatePersonaPrompt(input: PostGenInput): string {
  return `Analyze this writing sample and describe the writing style, tone, and unique characteristics:

${input.writingSample}

Focus on:
1. Vocabulary level and complexity
2. Sentence structure and length
3. Use of industry jargon
4. Overall tone and personality
5. Common phrases or writing patterns

Provide a concise summary that can be used to match this style.`;
}

export function generatePostPrompt(input: PostGenInput & { persona?: string }): string {
  const {
    topic,
    tone = "professional",
    pov = "first person",
    industry,
    numPosts = 1,
    includeNews = true,
    persona = "",
    news = []
  } = input;

  return `Create ${numPosts} engaging LinkedIn post${numPosts > 1 ? 's' : ''} about ${topic}.

Key requirements:
- Write naturally without any markdown or formatting
- Don't use asterisks, underscores, or special characters for emphasis
- Each post should have a compelling hook
- Include relevant hashtags (without the # symbol in the post content)
- Keep posts between 800-1200 characters

Style guide:
- Tone: ${tone}
- Point of view: ${pov}
- Industry focus: ${industry}
${persona ? `- Match this writing style: ${persona}` : ''}

${includeNews && news.length > 0 ? `
Reference these recent developments:
${news.map(n => `- ${n.title}`).join('\n')}
` : ''}

Return response as a JSON array with each post having:
{
  "content": "the post content",
  "hook": "attention-grabbing first line",
  "hashtags": ["relevant", "hashtags"]
}

Make sure the JSON is valid and doesn't include any markdown characters.`;
}

