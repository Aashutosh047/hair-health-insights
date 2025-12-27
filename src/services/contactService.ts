import { supabase } from "@/integrations/supabase/client";

export async function saveContactMessage(name: string, email: string, message: string) {
  const { data, error } = await supabase
    .from("contact_messages")
    .insert({
      name,
      email,
      message,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
