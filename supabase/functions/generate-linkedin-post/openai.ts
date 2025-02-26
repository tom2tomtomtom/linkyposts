
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { PersonaPrompt, PostGenInput, PostResponse } from "./types.ts";
import { generatePostPrompt, generatePersonaPrompt } from "./prompts.ts";

const openai = new OpenAI(Deno.env.get("OPENAI_API_KEY") || "");

export async function generatePosts(input: PostGenInput): Promise<PostResponse[]> {
  console.log("Generating posts with input:", input);

  // First, analyze the writing sample if provided
  let persona = "";
  if (input.writingSample) {
    console.log("Analyzing writing sample for persona...");
    const personaResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are a professional content analyst. Analyze the writing sample and describe the writing style and tone." 
        },
        { 
          role: "user", 
          content: generatePersonaPrompt(input) 
        }
      ],
      temperature: 0.7
    });
    persona = personaResponse.choices[0]?.message?.content || "";
    console.log("Generated persona:", persona);
  }

  // Then, generate the posts
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { 
        role: "system", 
        content: `You are a professional LinkedIn content writer that creates engaging posts.
                 Write in a natural, conversational style. Do NOT use any markdown formatting.
                 Do NOT use asterisks (*) or other special characters for emphasis.` 
      },
      { 
        role: "user", 
        content: generatePostPrompt({ ...input, persona }) 
      }
    ],
    temperature: 0.7
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content generated");
  }

  console.log("Raw generated content:", content);

  // Parse the response and clean up any remaining markdown
  try {
    // Remove any remaining markdown characters
    const cleanContent = content.replaceAll('*', '').replaceAll('_', '');
    const posts = JSON.parse(cleanContent) as PostResponse[];
    
    // Additional cleanup for each post
    return posts.map(post => ({
      ...post,
      content: post.content
        .replaceAll('*', '')
        .replaceAll('_', '')
        .trim(),
      hook: post.hook
        ?.replaceAll('*', '')
        .replaceAll('_', '')
        .trim() || null,
      hashtags: post.hashtags
        ?.map(tag => tag.replaceAll('*', '').replaceAll('_', '').trim())
    }));
  } catch (error) {
    console.error("Error parsing OpenAI response:", error);
    throw new Error("Failed to parse generated content");
  }
}

