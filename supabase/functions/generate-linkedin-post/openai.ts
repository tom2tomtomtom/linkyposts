
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface GeneratePostsParams {
  topic: string;
  tone?: string;
  pov?: string;
  writingSample?: string;
  industry?: string;
  numPosts?: number;
  additionalContext?: string;
  newsArticles?: any[];
}

export async function generatePosts(params: GeneratePostsParams) {
  const {
    topic,
    tone = "professional",
    pov = "first person",
    writingSample = "",
    industry = "",
    numPosts = 3,
    additionalContext = "",
    newsArticles = [],
  } = params;

  console.log("Generating posts with params:", {
    topic,
    tone,
    pov,
    industry,
    numPosts,
    hasWritingSample: !!writingSample,
    hasAdditionalContext: !!additionalContext,
    newsArticlesCount: newsArticles.length,
  });

  try {
    const prompt = generatePrompt({
      topic,
      tone,
      pov,
      writingSample,
      industry,
      additionalContext,
      newsArticles,
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional LinkedIn content writer that creates engaging posts.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error(error.error?.message || 'Failed to generate content');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) throw new Error("No content generated");

    // Parse the generated content into separate posts
    const posts = content
      .split("===POST===")
      .filter(Boolean)
      .map((post) => {
        const [rawContent, rawHashtags] = post.split("===HASHTAGS===");
        return {
          content: rawContent.trim(),
          hashtags: (rawHashtags?.trim() ?? "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        };
      });

    return posts.slice(0, numPosts);
  } catch (error) {
    console.error("Error in generatePosts:", error);
    throw error;
  }
}

interface PromptParams {
  topic: string;
  tone: string;
  pov: string;
  writingSample?: string;
  industry?: string;
  additionalContext?: string;
  newsArticles?: any[];
}

function generatePrompt({
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

