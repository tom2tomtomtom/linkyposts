
import { Configuration, OpenAIApi } from "https://esm.sh/openai@4.11.1";
import { generatePrompt } from "./prompts.ts";

const openaiConfig = new Configuration({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

const openai = new OpenAIApi(openaiConfig);

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

    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional LinkedIn content writer that creates engaging posts.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = completion.data.choices[0]?.message?.content;
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
