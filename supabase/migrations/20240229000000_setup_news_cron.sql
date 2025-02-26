
-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the cron job to run every 6 hours
SELECT cron.schedule(
  'fetch-news-articles',
  '0 */6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://kwxaqyxwwmpytiawjgjm.supabase.co/functions/v1/fetch-news',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3eGFxeXh3d21weXRpYXdqZ2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1NDQ4NzUsImV4cCI6MjA1NjEyMDg3NX0.6UhU4YFNvytTJn9HHC0BO3vh0BV6Pg3a4VHUuOanDBc"}'::jsonb,
      body:='{}'::jsonb
    );
  $$
);
