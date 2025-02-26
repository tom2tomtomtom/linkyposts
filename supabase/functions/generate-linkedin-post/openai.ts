
import { OpenAI } from "https://esm.sh/openai@4.24.1";

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

export async function generateImage(prompt: string): Promise<string | null> {
  try {
    console.log('Generating image with prompt:', prompt);
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    console.log('Image generation response:', response.data[0]?.url ? 'Success' : 'No URL returned');
    return response.data[0]?.url || null;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

export async function generateContent(prompt: string, systemPrompt: string): Promise<string> {
  try {
    console.log('Generating content with prompt:', { systemPrompt, prompt });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
    });

    const content = completion.choices[0].message.content || '';
    console.log('Content generation successful:', content.substring(0, 50) + '...');
    return content;
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

