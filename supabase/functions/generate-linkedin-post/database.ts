
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AIResponse, GeneratedPost } from './types.ts';

export async function saveGeneratedContent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  topic: string,
  tone: string,
  pov: string,
  writingSample: string | undefined,
  aiResponse: AIResponse
): Promise<string> {
  const { data: generatedContent, error: contentError } = await supabase
    .from('generated_content')
    .insert({
      user_id: userId,
      topic,
      tone,
      pov,
      writing_sample: writingSample,
      style_analysis: aiResponse.styleAnalysis,
      status: 'draft'
    })
    .select('id')
    .single();

  if (contentError) {
    console.error('Error creating generated content:', contentError);
    throw new Error('Failed to save generated content');
  }

  return generatedContent.id;
}

export async function saveLinkedInPosts(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  generatedContentId: string,
  posts: GeneratedPost[]
): Promise<void> {
  const versionGroup = crypto.randomUUID();

  for (const post of posts) {
    const { error: postError } = await supabase
      .from('linkedin_posts')
      .insert({
        user_id: userId,
        generated_content_id: generatedContentId,
        content: post.content,
        topic: post.topic,
        version_group: versionGroup,
        is_current_version: true,
        hashtags: post.hashtags || []
      });

    if (postError) {
      console.error('Error creating LinkedIn post:', postError);
      continue;
    }

    if (post.sources && post.sources.length > 0) {
      const { error: sourcesError } = await supabase
        .from('post_sources')
        .insert(
          post.sources.map(source => ({
            linkedin_post_id: post.id,
            title: source.title,
            url: source.url,
            publication_date: new Date().toISOString().split('T')[0]
          }))
        );

      if (sourcesError) {
        console.error('Error creating post sources:', sourcesError);
      }
    }
  }
}
