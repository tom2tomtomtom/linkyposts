
export async function generateContent(
  openAIApiKey: string,
  systemPrompt: string,
  userPrompt: string
): Promise<AIResponse> {
  console.log('Generating content with OpenAI');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    console.error('OpenAI API error:', response.status, await response.text());
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const completion = await response.json();
  const parsedContent = JSON.parse(completion.choices[0]?.message?.content || '{"posts":[], "styleAnalysis":{}}');
  
  console.log('Generated content successfully:', parsedContent);
  return parsedContent;
}

