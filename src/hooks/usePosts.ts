
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface PostInput {
  topic: string;
  tone: string;
  pov: string;
  writingSample?: string;
  industry?: string;
  numPosts?: number;
  includeNews?: boolean;
}

export interface Post {
  id: string;
  content: string;
  topic: string;
  hashtags: string[];
  created_at: string;
  updated_at: string;
  version_group: string;
  is_current_version: boolean;
  sources?: {
    id: string;
    title: string;
    url: string;
  }[];
}

export function usePosts() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const generatePosts = async (input: PostInput) => {
    if (!user) {
      throw new Error('User must be logged in to generate posts');
    }

    setLoading(true);
    try {
      const response = await fetch('/api/edge/generate-linkedin-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          topic: input.topic,
          tone: input.tone,
          pov: input.pov,
          writingSample: input.writingSample,
          industry: input.industry,
          numPosts: input.numPosts || 3,
          includeNews: input.includeNews || false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate posts');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate posts');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPosts = async () => {
    if (!user) {
      throw new Error('User must be logged in to fetch posts');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('linkedin_posts')
        .select(`
          *,
          sources:post_sources(id, title, url)
        `)
        .eq('user_id', user.id)
        .eq('is_current_version', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data as Post[];
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch posts');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPost = async (id: string) => {
    if (!user) {
      throw new Error('User must be logged in to fetch a post');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('linkedin_posts')
        .select(`
          *,
          sources:post_sources(id, title, url)
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw error;
      }

      return data as Post;
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch post');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePost = async (id: string, content: string, hashtags: string[]) => {
    if (!user) {
      throw new Error('User must be logged in to update a post');
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('linkedin_posts')
        .update({
          content,
          hashtags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

      if (error) {
        throw error;
      }

      toast.success('Post updated successfully');
      return data[0];
    } catch (error: any) {
      toast.error(error.message || 'Failed to update post');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!user) {
      throw new Error('User must be logged in to delete a post');
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('linkedin_posts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Post deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete post');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    generatePosts,
    getPosts,
    getPost,
    updatePost,
    deletePost,
  };
}
