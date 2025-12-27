import { supabase } from "@/integrations/supabase/client";
import { UserDetails } from "@/types/assessment";

export async function createProfile(userId: string, userDetails: UserDetails) {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      name: userDetails.name,
      email: userDetails.email,
      age: userDetails.age ? parseInt(userDetails.age) : null,
      gender: userDetails.gender || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, userDetails: Partial<UserDetails>) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      name: userDetails.name,
      email: userDetails.email,
      age: userDetails.age ? parseInt(userDetails.age) : null,
      gender: userDetails.gender || null,
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOrCreateProfile(userId: string, email: string) {
  // Try to get existing profile
  let profile = await getProfile(userId);
  
  if (!profile) {
    // Create new profile with minimal data
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        name: "",
        email: email,
      })
      .select()
      .single();

    if (error) throw error;
    profile = data;
  }
  
  return profile;
}
