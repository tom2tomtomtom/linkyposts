
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

  let baseContext = `As a thought leader in ${industry || 'your industry'}, create an insightful LinkedIn post that demonstrates expertise and sparks meaningful discussions.`;
  
  let prompt = '';

  if (articleContent && articleTitle) {
    prompt = `${baseContext}

Based on this article titled "${articleTitle}":

${articleContent}

Write a thought-provoking LinkedIn post that:
1. Starts with a powerful hook that captures attention
2. Analyzes the key insights from the article
3. Adds your professional perspective and experience
4. Relates the content to current industry trends
5. Challenges conventional thinking
6. Includes specific examples or case studies
7. Offers actionable takeaways for readers

Requirements:
- Use a ${tone} tone and write in ${pov} perspective
- Create 4-8 well-structured paragraphs
- Include relevant statistics or data points from the article
- Share a personal story or professional experience related to the topic
- Add thought-provoking questions throughout
- End with a strong call to action
- Use strategic emojis (2-3 max) to enhance readability
- Follow LinkedIn's best practices for formatting and spacing
`;
  } else {
    prompt = `${baseContext}

Create an insightful LinkedIn post about: ${topic}

Your post should:
1. Begin with an attention-grabbing hook
2. Share unique insights about ${topic}
3. Include real-world examples or case studies
4. Connect the topic to broader industry trends
5. Challenge common assumptions
6. Provide actionable value to readers
7. Encourage meaningful discussion

Requirements:
- Use a ${tone} tone and write in ${pov} perspective
- Create 4-8 well-structured paragraphs
- Include specific examples and data points
- Share relevant personal experiences
- Pose thought-provoking questions
- End with a compelling call to action
- Use strategic emojis (2-3 max) to enhance readability
- Follow LinkedIn's best practices for formatting and spacing
`;
  }

  if (writingSample) {
    prompt += `\n\nAdapt your writing style to match this reference:\n${writingSample}\n`;
    prompt += '\nMaintain the voice and structure while incorporating the elements above.';
  }

  return prompt;
}
