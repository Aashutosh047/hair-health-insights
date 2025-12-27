import { supabase } from "@/integrations/supabase/client";
import { HairHealthReport } from "@/types/assessment";

export interface ReportRecord {
  id: string;
  profile_id: string;
  questionnaire_id: string | null;
  overall_risk_level: string;
  risk_score: number;
  lifestyle_impact: string;
  possible_causes: string[];
  recommendations: string[];
  scalp_health_warning: boolean;
  generated_at: string;
}

export async function saveReport(
  profileId: string,
  questionnaireId: string | null,
  report: HairHealthReport
): Promise<ReportRecord> {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      profile_id: profileId,
      questionnaire_id: questionnaireId,
      overall_risk_level: report.overallRiskLevel,
      risk_score: report.riskScore,
      lifestyle_impact: report.lifestyleImpact,
      possible_causes: report.possibleCauses,
      recommendations: report.recommendations,
      scalp_health_warning: report.scalpHealthWarning,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getReport(reportId: string): Promise<ReportRecord | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error) throw error;
  return data;
}

export async function getLatestReport(profileId: string): Promise<ReportRecord | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("profile_id", profileId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getReportHistory(profileId: string): Promise<ReportRecord[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("profile_id", profileId)
    .order("generated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Convert database record to frontend format
export function toHairHealthReport(record: ReportRecord): HairHealthReport {
  return {
    overallRiskLevel: record.overall_risk_level as HairHealthReport["overallRiskLevel"],
    riskScore: record.risk_score,
    lifestyleImpact: record.lifestyle_impact as HairHealthReport["lifestyleImpact"],
    possibleCauses: record.possible_causes,
    recommendations: record.recommendations,
    scalpHealthWarning: record.scalp_health_warning,
    generatedAt: new Date(record.generated_at),
  };
}
