import { getSupabaseClient } from "./client";

export const ALLOWED_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
] as const;

export const BUCKET_SIZE_LIMITS = {
  "portfolio-public": 10 * 1024 * 1024, // 10MB
  "portfolio-private": 50 * 1024 * 1024, // 50MB
} as const;

export interface UploadAssetParams {
  bucket: "portfolio-public" | "portfolio-private";
  path: string;
  file: File | Blob;
}

export interface UploadAssetResult {
  path?: string;
  publicUrl?: string;
  error?: string;
}

export function validateMediaFile(
  file: File,
  bucket: "portfolio-public" | "portfolio-private"
): string | null {
  const mime = file.type;
  if (!ALLOWED_MEDIA_MIME_TYPES.includes(mime as (typeof ALLOWED_MEDIA_MIME_TYPES)[number])) {
    return `File type "${mime || "unknown"}" is not permitted. Allowed types: JPEG, PNG, WebP, SVG, PDF.`;
  }
  const limit = BUCKET_SIZE_LIMITS[bucket];
  if (file.size > limit) {
    const mb = Math.round(limit / (1024 * 1024));
    return `This file is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size for ${bucket} is ${mb} MB.`;
  }
  return null;
}

/**
 * Upload an asset to Supabase Storage with size and MIME validation.
 */
export async function uploadAsset({
  bucket,
  path,
  file,
}: UploadAssetParams): Promise<UploadAssetResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: "Supabase storage is not configured." };
  }

  if (file instanceof File) {
    const validationErr = validateMediaFile(file, bucket);
    if (validationErr) return { error: validationErr };
  }

  const sanitizedPath = path.replace(/^\/+/, "").replace(/\.\./g, "");

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(sanitizedPath, file, {
      upsert: true,
      cacheControl: "3600",
    });

  if (error || !data) {
    return { error: error?.message || "Upload failed." };
  }

  let publicUrl: string | undefined;
  if (bucket === "portfolio-public") {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    publicUrl = urlData.publicUrl;
  }

  return {
    path: data.path,
    publicUrl,
  };
}

export async function deleteStorageAsset(
  bucket: "portfolio-public" | "portfolio-private",
  path: string
): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: "Supabase storage is not configured." };

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) return { error: error.message };
  return {};
}

/**
 * Get a temporary signed URL for private bucket asset preview (admin only).
 */
export async function getPrivateSignedUrl(
  path: string,
  expiresInSeconds = 300
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.storage
    .from("portfolio-private")
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Get the public URL for an asset in portfolio-public.
 */
export function getPublicAssetUrl(path: string): string | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data } = supabase.storage.from("portfolio-public").getPublicUrl(path);
  return data.publicUrl;
}
