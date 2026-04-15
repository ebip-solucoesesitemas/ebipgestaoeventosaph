import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves a signature URL string:
 * - If null/undefined → returns null
 * - If base64 (data:image...) → returns as-is
 * - If storage public URL → extracts path and creates a signed URL (1h)
 */
export async function resolveSignatureUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:image')) return url;

  // Extract path from public URL pattern
  const match = url.match(/\/storage\/v1\/object\/public\/signatures\/(.+)$/);
  if (match) {
    const path = decodeURIComponent(match[1]);
    const { data, error } = await supabase.storage
      .from('signatures')
      .createSignedUrl(path, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  // If it doesn't match known patterns, return as-is (could be an external URL)
  return url;
}
