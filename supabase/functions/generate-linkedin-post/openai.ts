
import { OpenAI } from "https://esm.sh/openai@4.24.1";

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

export async function generateImage(prompt: string): Promise<string | null> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    return response.data[0].url || null;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

export async function generateContent(prompt: string, systemPrompt: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
    });

    return completion.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}
