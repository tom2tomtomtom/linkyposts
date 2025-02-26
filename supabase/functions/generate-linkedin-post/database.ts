
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Create a Supabase client with the service role key
export function createDbClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing environment variables for Supabase client');
  }

  return createClient(supabaseUrl, supabaseKey);
}

export async function saveGeneratedContent(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  topic: string,
  tone: string,
  pov: string,
  writingSample: string | undefined,
  styleAnalysis: any
): Promise<string> {
  const { data: generatedContent, error: contentError } = await supabase
    .from('generated_content')
    .insert({
      user_id: userId,
      topic,
      tone,
      pov,
      writing_sample: writingSample,
      style_analysis: styleAnalysis,
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
  posts: string[]
): Promise<void> {
  const versionGroup = crypto.randomUUID();

  for (const content of posts) {
    const { error: postError } = await supabase
      .from('linkedin_posts')
      .insert({
        user_id: userId,
        generated_content_id: generatedContentId,
        content,
        topic: content.slice(0, 100), // Using first 100 chars as topic summary
        version_group: versionGroup,
        is_current_version: true
      });

    if (postError) {
      console.error('Error creating LinkedIn post:', postError);
      throw new Error('Failed to save LinkedIn post');
    }
  }
}
