import { supabase } from "@/integrations/supabase/client";
import { QuestionnaireData } from "@/types/assessment";

export async function saveQuestionnaireResponse(profileId: string, data: QuestionnaireData) {
  const { data: response, error } = await supabase
    .from("questionnaire_responses")
    .insert({
      profile_id: profileId,
      hair_fall_severity: data.hairFallSeverity,
      family_history: data.familyHistory,
      stress_level: data.stressLevel,
      diet_quality: data.dietQuality,
      sleep_duration: data.sleepDuration,
      scalp_itching: data.scalpItching,
      scalp_dandruff: data.scalpDandruff,
      scalp_redness: data.scalpRedness,
      use_heat_styling: data.useHeatStyling,
      use_chemical_treatments: data.useChemicalTreatments,
      hair_wash_frequency: data.hairWashFrequency,
    })
    .select()
    .single();

  if (error) throw error;
  return response;
}

export async function getQuestionnaireResponse(profileId: string) {
  const { data, error } = await supabase
    .from("questionnaire_responses")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getAllQuestionnaireResponses(profileId: string) {
  const { data, error } = await supabase
    .from("questionnaire_responses")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
