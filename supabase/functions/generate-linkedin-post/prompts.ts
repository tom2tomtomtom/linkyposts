
interface PromptParams {
  topic: string;
  tone: string;
  pov: string;
  writingSample?: string;
  industry?: string;
  additionalContext?: string;
  newsArticles?: any[];
}

export function generatePrompt({
  topic,
  tone,
  pov,
  writingSample,
  industry,
  additionalContext,
  newsArticles = [],
}: PromptParams): string {
  let prompt = `Write ${newsArticles.length > 1 ? 'multiple engaging' : 'an engaging'} LinkedIn post${newsArticles.length > 1 ? 's' : ''} about ${topic}.`;

  if (additionalContext) {
    prompt += `\n\nUse this article content as context:\n${additionalContext}`;
  }

  if (industry) {
    prompt += `\n\nTarget audience: Professionals in the ${industry} industry.`;
  }

  prompt += `\n\nUse a ${tone} tone and write in the ${pov} point of view.`;

  if (writingSample) {
    prompt += `\n\nMatch this writing style:\n${writingSample}`;
  }

  if (newsArticles.length > 0) {
    prompt += "\n\nIncorporate insights from these related articles:";
    newsArticles.forEach((article) => {
      prompt += `\n- ${article.title}`;
      if (article.description) prompt += `\n  ${article.description}`;
    });
  }

  prompt += "\n\nFormat each post using ===POST=== as a separator and include relevant hashtags after ===HASHTAGS=== for each post.";

  return prompt;
}
