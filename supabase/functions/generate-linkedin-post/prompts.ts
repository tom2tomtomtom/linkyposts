
import { NewsArticle } from './types.ts';

export function createSystemPrompt(): string {
  return `You are an expert LinkedIn content creator specializing in creating engaging, professional posts.
You excel at crafting PROVOCATIVE HOOKS that grab attention in the first sentence, specifically using 
current news and trends to create intellectual tension or curiosity.

Today's date is ${new Date().toDateString()}.

For every post you create:
1. Always start with a provocative hook based on recent news
2. Use specific facts, statistics, or developments from the news - be concrete, not generic
3. Create a sense of urgency, surprise, or contradiction to grab attention
4. Transition smoothly from the hook to your main point
5. End with a thought-provoking question or call to action

Examples of provocative hooks:
- "While 87% of executives are investing in AI, a shocking new report reveals most are wasting their money."
- "As remote work policies get slashed across tech, LinkedIn's latest data shows a surprising counter-trend."
- "The strategy Tesla just abandoned is the exact one that helped Microsoft secure its $2.8 trillion valuation."`;
}

export function createUserPrompt(
  topic: string,
  tone: string,
  pov: string,
  industry: string,
  numPosts: number,
  recentNews: NewsArticle[],
  writingSample?: string
): string {
  let prompt = `Generate ${numPosts} LinkedIn posts about "${topic}" with a "${tone}" tone, written from the "${pov}" point of view.
These posts are for a professional in the ${industry} industry.

CRITICAL REQUIREMENT: EACH post MUST begin with a provocative hook based on a SPECIFIC piece of recent news or data.
The hook should create intellectual tension, surprise, or curiosity. Never start with a generic statement.`;

  if (recentNews.length > 0) {
    prompt += `\n\nHere are specific recent news items to reference in your posts (use at least one specific detail from these in EACH post):`;
    
    recentNews.forEach((article, index) => {
      prompt += `\n${index + 1}. "${article.title}" from ${article.source} (${new Date(article.publishedDate).toDateString()})
      Key points: ${article.snippet || 'No snippet available'}
      URL: ${article.url}`;
    });
    
    prompt += `\n\nFOR EACH POST:
    1. Start with a provocative hook directly referencing a specific news item or statistic
    2. Include the publication date of the news (e.g., "According to yesterday's report..." or "In new data released last week...")
    3. Create a sense of urgency or surprise in the opening line
    4. Connect the news to a valuable insight for your audience
    5. Always cite your sources with a link`;
  } else {
    prompt += `\n\nSince specific news sources aren't available, create compelling hooks based on:
    - Recent industry trends in ${industry}
    - Contrarian viewpoints on commonly held beliefs about ${topic}
    - Surprising statistics or facts (be specific with numbers)
    - Provocative "what if" scenarios that challenge conventional thinking
    
    FOR EACH POST:
    1. Start with a specific, concrete statement that sounds like breaking news
    2. Include specific numbers, percentages, or dates to add credibility
    3. Create a sense of urgency or surprise in the opening line
    4. Make it sound extremely current (e.g., "New data released this week shows...")`;
  }

  if (writingSample) {
    prompt += `\n\nHere's a sample of my writing style to emulate:\n\n"${writingSample}"\n\nMatch this style AFTER you've created the provocative hook.`;
  }

  prompt += `\n\nFormat your response as a JSON object with:
  - "posts": an array of objects, each with:
      - "content": the post text starting with a provocative hook
      - "topic": the specific aspect of the main topic this post addresses
      - "hook": the opening provocative statement (for reference)
      - "newsReference": the specific news item referenced
      - "hashtags": array of strings
      - "sources": array of objects with "title" and "url"
  - "styleAnalysis": an object with "writingStyle", "toneDescription", "keyCharacteristics" (array), and "recommendedTopics" (array)`;

  return prompt;
}
