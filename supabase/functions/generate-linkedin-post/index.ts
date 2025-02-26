
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, topic, tone, pov, writingSample, industry, numPosts = 1, includeNews = true } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const systemPrompt = `You are a professional LinkedIn content creator specializing in crafting highly engaging, authentic posts. Your expertise lies in writing content that drives engagement and sparks meaningful conversations.

Key guidelines:
- Write in a conversational yet professional tone
- Include specific examples and personal insights
- Focus on providing value through actionable insights
- Use short paragraphs and clear formatting
- Avoid generic advice or clichéd business speak
- Create content that encourages discussion and sharing`;

    const userPrompt = `Generate ${numPosts} LinkedIn ${numPosts > 1 ? 'posts' : 'post'} about "${topic}" with these specifications:
- Tone: ${tone || 'professional and authentic'}
- Point of View: ${pov || 'first person'}
- Industry Focus: ${industry || 'general business'}
- Writing Style: ${writingSample ? `Match this style: ${writingSample}` : 'Clear, engaging, and conversational'}
${includeNews ? '- Include relevant industry insights or trends' : ''}

Make each post:
1. Start with a hook that grabs attention
2. Share specific experiences or insights
3. Include practical takeaways
4. End with a thought-provoking question or call to action
5. Keep length between 800-1200 characters

Format as JSON:
{
  "posts": [
    {
      "content": "post content here",
      "hashtags": ["relevant", "hashtags"],
      "topic": "specific theme"
    }
  ]
}`;

    console.log('Sending request to OpenAI with prompts:', { systemPrompt, userPrompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const generatedContent = JSON.parse(data.choices[0].message.content);

    console.log('Successfully generated content:', generatedContent);

    return new Response(JSON.stringify(generatedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-linkedin-post function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
