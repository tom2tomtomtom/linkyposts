
interface ContentPromptParams {
  topic: string
  tone: string
  pov: string
  writingSample: string
  newsArticles: any[]
}

export function buildContentPrompt({
  topic,
  tone,
  pov,
  writingSample,
  newsArticles,
}: ContentPromptParams): string {
  let prompt = `Write an engaging LinkedIn post about ${topic}. `
  
  if (tone) {
    prompt += `Use a ${tone} tone. `
  }
  
  if (pov) {
    prompt += `Write from a ${pov} perspective. `
  }

  if (newsArticles.length > 0) {
    prompt += `\n\nIncorporate insights from these recent news articles:\n`
    newsArticles.forEach(article => {
      prompt += `- ${article.title}\n`
      if (article.snippet) {
        prompt += `  Summary: ${article.snippet}\n`
      }
    })
  }

  if (writingSample) {
    prompt += `\n\nMatch this writing style:\n${writingSample}`
  }

  prompt += `\n\nEnsure the post is professional, engaging, and follows LinkedIn best practices. Include 2-3 relevant hashtags.`

  return prompt
}

export function buildImagePrompt(postContent: string): string {
  return `Create a professional, high-quality image that represents the following LinkedIn post content. The image should be business-appropriate and enhance the post's message. Make it visually appealing and suitable for a professional social media platform. Avoid text in the image. Post content: ${postContent}`
}
