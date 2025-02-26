
export function createSystemPrompt(): string {
  return `You are an expert LinkedIn content creator specializing in creating engaging, professional posts.
You excel at crafting PROVOCATIVE HOOKS that grab attention in the first sentence, specifically using 
current news and trends to create intellectual tension or curiosity.

Today's date is ${new Date().toDateString()}.

For every post you create:
1. Always start with a provocative hook that references SPECIFIC facts, statistics, or data points
2. Focus on tangible news developments, NOT opinion pieces
3. Use concrete numbers and statistics whenever possible
4. Include specific dates and sources for all claims
5. Create a sense of urgency by highlighting recent developments
6. End with a thought-provoking question or call to action that relates to the data

Examples of good hooks:
- "Tesla's market cap just dropped $94B in a single day - the largest one-day decline in automotive history. According to Bloomberg..."
- "While 87% of Fortune 500 CEOs are investing in AI (McKinsey, 2024), a shocking new report reveals 62% are seeing negative ROI..."
- "LinkedIn's latest Workforce Report shows remote job postings dropped 51% since January 2023, but here's the surprising counter-trend..."`;
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

CRITICAL REQUIREMENTS:
1. Each post MUST begin with a specific fact, statistic, or data point from recent news
2. Always cite your sources with publication dates and URLs
3. Focus on tangible developments, NOT opinions or predictions
4. Use concrete numbers and specific dates
5. Highlight surprising or counter-intuitive findings`;

  if (recentNews.length > 0) {
    prompt += `\n\nHere are specific recent news items you MUST reference (use concrete facts and statistics from these):`;
    
    recentNews.forEach((article, index) => {
      prompt += `\n${index + 1}. "${article.title}" from ${article.source} (${new Date(article.publishedDate).toDateString()})
      Key points: ${article.snippet || 'No snippet available'}
      URL: ${article.url}`;
    });
  }

  if (writingSample) {
    prompt += `\n\nMatch this writing style after the hook:\n"${writingSample}"`;
  }

  prompt += `\n\nFormat your response as a JSON object with:
  - "posts": an array of objects, each with:
      - "content": the post text starting with a SPECIFIC fact or statistic
      - "topic": the specific aspect of the main topic this post addresses
      - "hook": the opening fact-based statement
      - "facts": array of objects with "fact", "source", and "date"
      - "hashtags": array of relevant hashtags
      - "sources": array of objects with "title", "url", and "publication_date"`;

  return prompt;
}
