-- Phase 8A: Admin email notification on new user signup
-- Uses Supabase pg_net extension to call Resend API directly from PostgreSQL
-- No serverless function needed — runs entirely inside the database

-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to send signup notification email via Resend
CREATE OR REPLACE FUNCTION notify_admin_new_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resend_api_key TEXT;
  username_val TEXT;
  signup_method TEXT;
  email_html TEXT;
BEGIN
  -- Get the Resend API key from Supabase Vault
  SELECT decrypted_secret INTO resend_api_key
  FROM vault.decrypted_secrets
  WHERE name = 'resend_api_key'
  LIMIT 1;

  -- If no API key configured, skip silently
  IF resend_api_key IS NULL OR resend_api_key = '' THEN
    RETURN NEW;
  END IF;

  username_val := COALESCE(NEW.username, 'Unknown');

  -- Detect signup method from avatar URL
  IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url LIKE '%googleusercontent%' THEN
    signup_method := 'Google OAuth';
  ELSE
    signup_method := 'Email';
  END IF;

  email_html := format(
    '<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
      <div style="background: #09090B; border-radius: 12px; padding: 24px; color: #FAFAFA;">
        <h2 style="margin: 0 0 16px; color: #F59E0B; font-size: 18px;">New SoundSauce User!</h2>
        <table style="width: 100%%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #A1A1AA; width: 100px;">Username</td><td style="padding: 8px 0; color: #FAFAFA; font-weight: 600;">%s</td></tr>
          <tr><td style="padding: 8px 0; color: #A1A1AA;">Method</td><td style="padding: 8px 0; color: #FAFAFA;">%s</td></tr>
          <tr><td style="padding: 8px 0; color: #A1A1AA;">User ID</td><td style="padding: 8px 0; color: #71717A; font-family: monospace; font-size: 12px;">%s</td></tr>
        </table>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #27272A;">
          <a href="https://soundsauce.app/admin" style="color: #F59E0B; text-decoration: none; font-size: 14px;">View Admin Dashboard →</a>
        </div>
      </div>
    </div>',
    username_val, signup_method, NEW.id::text
  );

  -- Send email via Resend API using pg_net
  PERFORM net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || resend_api_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'SoundSauce <noreply@soundsauce.app>',
      'to', 'soundsauceapp@gmail.com',
      'subject', 'New user signup: ' || username_val,
      'html', email_html
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger on new profile creation (fires after handle_new_user populates the row)
DROP TRIGGER IF EXISTS on_new_signup_notify_admin ON profiles;
CREATE TRIGGER on_new_signup_notify_admin
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_new_signup();
