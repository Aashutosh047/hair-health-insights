import { supabase } from "@/integrations/supabase/client";

export interface UploadedImageRecord {
  id: string;
  profile_id: string;
  label: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export async function uploadImage(
  userId: string,
  profileId: string,
  file: File,
  label: string
): Promise<UploadedImageRecord> {
  // Upload file to storage bucket
  const filePath = `${userId}/${label}-${Date.now()}-${file.name}`;
  
  const { error: uploadError } = await supabase.storage
    .from("assessment-images")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // Save metadata to database
  const { data, error: dbError } = await supabase
    .from("uploaded_images")
    .insert({
      profile_id: profileId,
      label: label,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single();

  if (dbError) {
    // Clean up uploaded file if db insert fails
    await supabase.storage.from("assessment-images").remove([filePath]);
    throw dbError;
  }

  return data;
}

export async function getImages(profileId: string): Promise<UploadedImageRecord[]> {
  const { data, error } = await supabase
    .from("uploaded_images")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getImageUrl(filePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from("assessment-images")
    .createSignedUrl(filePath, 3600); // 1 hour expiry

  return data?.signedUrl || "";
}

export async function getImagesWithUrls(profileId: string) {
  const images = await getImages(profileId);
  
  const imagesWithUrls = await Promise.all(
    images.map(async (img) => ({
      ...img,
      url: await getImageUrl(img.file_path),
    }))
  );

  return imagesWithUrls;
}

export async function deleteImage(imageId: string, filePath: string) {
  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("assessment-images")
    .remove([filePath]);

  if (storageError) throw storageError;

  // Delete from database
  const { error: dbError } = await supabase
    .from("uploaded_images")
    .delete()
    .eq("id", imageId);

  if (dbError) throw dbError;
}
