
export function buildPrompt(params: {
  topic: string;
  articleContent?: string;
  articleTitle?: string;
  tone: string;
  pov: string;
  industry?: string;
  writingSample?: string;
}): string {
  const {
    topic,
    articleContent,
    articleTitle,
    tone,
    pov,
    industry,
    writingSample,
  } = params;

  let prompt = "";

  if (articleContent && articleTitle) {
    prompt = `Write a LinkedIn post about this article titled "${articleTitle}":

${articleContent}

Key requirements:
- Write a thoughtful, engaging LinkedIn post discussing the key points and adding professional insights
- Use a ${tone} tone
- Write in ${pov} perspective
- Make it substantial (4-8 paragraphs)
- Include personal insights and experiences
- End with a thought-provoking question or call to action
`;
  } else {
    prompt = `Write a LinkedIn post about this topic: ${topic}

Key requirements:
- Write a thoughtful, engaging LinkedIn post that explores this topic in depth
- Use a ${tone} tone
- Write in ${pov} perspective
- Make it substantial (4-8 paragraphs)
- Include personal insights and experiences
- End with a thought-provoking question or call to action
`;
  }

  if (industry) {
    prompt += `\n- Add relevant context for the ${industry} industry`;
  }

  if (writingSample) {
    prompt += `\n\nPlease match this writing style:\n${writingSample}`;
  }

  return prompt;
}
