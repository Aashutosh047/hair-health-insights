import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AnalyzeRequest {
  profileId: string;
  questionnaireId: string;
  questionnaire: {
    hairFallSeverity: string;
    familyHistory: string;
    stressLevel: string;
    dietQuality: string;
    sleepDuration: string;
    scalpItching: boolean;
    scalpDandruff: boolean;
    scalpRedness: boolean;
    useHeatStyling: boolean;
    useChemicalTreatments: boolean;
    hairWashFrequency: string;
  };
  userInfo: {
    age: number | null;
    gender: string | null;
  };
  images: Array<{
    label: string;
    url: string;
  }>;
}

interface MLResponse {
  ml_predictions?: {
    hair_loss_stage?: number;
    pattern_type?: string;
    confidence?: number;
  };
  recommendations?: string[];
  risk_factors?: string[];
}

// Fallback rule-based report generator
function generateFallbackReport(questionnaire: AnalyzeRequest["questionnaire"]) {
  let riskScore = 0;
  const possibleCauses: string[] = [];
  const recommendations: string[] = [];

  // Hair fall severity scoring
  if (questionnaire.hairFallSeverity === "high") {
    riskScore += 35;
    possibleCauses.push("Significant hair shedding pattern detected");
  } else if (questionnaire.hairFallSeverity === "medium") {
    riskScore += 20;
    possibleCauses.push("Moderate hair fall observed");
  } else {
    riskScore += 5;
  }

  // Family history
  if (questionnaire.familyHistory === "yes") {
    riskScore += 25;
    possibleCauses.push("Genetic predisposition (family history of hair loss)");
    recommendations.push("Consider early intervention treatments");
  }

  // Stress level
  if (questionnaire.stressLevel === "high") {
    riskScore += 15;
    possibleCauses.push("High stress levels may contribute to hair fall");
    recommendations.push("Practice stress management techniques like meditation or yoga");
  } else if (questionnaire.stressLevel === "moderate") {
    riskScore += 8;
  }

  // Diet quality
  if (questionnaire.dietQuality === "poor") {
    riskScore += 15;
    possibleCauses.push("Poor nutrition may affect hair health");
    recommendations.push("Improve diet with protein, iron, and biotin-rich foods");
  } else if (questionnaire.dietQuality === "average") {
    riskScore += 8;
    recommendations.push("Consider adding more nutrient-rich foods for hair health");
  }

  // Sleep duration
  if (questionnaire.sleepDuration === "less_than_5") {
    riskScore += 10;
    possibleCauses.push("Inadequate sleep affecting hair growth cycle");
    recommendations.push("Aim for 7-9 hours of quality sleep per night");
  } else if (questionnaire.sleepDuration === "5_to_7") {
    riskScore += 5;
  }

  // Scalp issues
  let scalpIssues = 0;
  if (questionnaire.scalpItching) scalpIssues++;
  if (questionnaire.scalpDandruff) scalpIssues++;
  if (questionnaire.scalpRedness) scalpIssues++;

  const scalpHealthWarning = scalpIssues >= 2;

  if (scalpIssues > 0) {
    riskScore += scalpIssues * 5;
    possibleCauses.push("Scalp health issues may be contributing to hair problems");
    recommendations.push("Consider using medicated shampoos or consulting a dermatologist");
  }

  // Hair care habits
  if (questionnaire.useHeatStyling) {
    riskScore += 5;
    recommendations.push("Reduce heat styling frequency and use heat protectant products");
  }

  if (questionnaire.useChemicalTreatments) {
    riskScore += 8;
    possibleCauses.push("Chemical treatments may be damaging hair");
    recommendations.push("Space out chemical treatments and use deep conditioning");
  }

  // Hair wash frequency
  if (questionnaire.hairWashFrequency === "daily") {
    recommendations.push("Consider washing every other day to preserve natural oils");
  }

  // Normalize score
  riskScore = Math.min(100, Math.max(0, riskScore));

  // Determine risk level
  let overallRiskLevel: "low" | "medium" | "high";
  if (riskScore < 35) {
    overallRiskLevel = "low";
  } else if (riskScore < 65) {
    overallRiskLevel = "medium";
  } else {
    overallRiskLevel = "high";
  }

  // Determine lifestyle impact
  let lifestyleImpact: "low" | "moderate" | "significant";
  const lifestyleFactors =
    (questionnaire.stressLevel === "high" ? 1 : 0) +
    (questionnaire.dietQuality === "poor" ? 1 : 0) +
    (questionnaire.sleepDuration === "less_than_5" ? 1 : 0);

  if (lifestyleFactors >= 2) {
    lifestyleImpact = "significant";
  } else if (lifestyleFactors === 1) {
    lifestyleImpact = "moderate";
  } else {
    lifestyleImpact = "low";
  }

  // Add general recommendations if needed
  if (recommendations.length === 0) {
    recommendations.push("Maintain your current healthy hair care routine");
  }
  recommendations.push("Stay hydrated and maintain a balanced diet");
  recommendations.push("Consider regular scalp massages to improve circulation");

  return {
    overallRiskLevel,
    riskScore,
    possibleCauses,
    recommendations,
    lifestyleImpact,
    scalpHealthWarning,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mlApiUrl = Deno.env.get("ML_API_URL");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: AnalyzeRequest = await req.json();
    console.log("Received analyze request for profile:", requestData.profileId);

    let report;

    // Try to call external ML API if configured
    if (mlApiUrl) {
      console.log("Calling external ML API:", mlApiUrl);
      try {
        const mlResponse = await fetch(`${mlApiUrl}/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            images: requestData.images,
            questionnaire: requestData.questionnaire,
            user_info: requestData.userInfo,
          }),
        });

        if (mlResponse.ok) {
          const mlData: MLResponse = await mlResponse.json();
          console.log("ML API response received:", mlData);

          // Merge ML predictions with rule-based analysis
          const fallback = generateFallbackReport(requestData.questionnaire);

          report = {
            overallRiskLevel: fallback.overallRiskLevel,
            riskScore: mlData.ml_predictions?.hair_loss_stage
              ? Math.min(100, mlData.ml_predictions.hair_loss_stage * 15)
              : fallback.riskScore,
            possibleCauses: mlData.risk_factors?.length
              ? mlData.risk_factors
              : fallback.possibleCauses,
            recommendations: mlData.recommendations?.length
              ? mlData.recommendations
              : fallback.recommendations,
            lifestyleImpact: fallback.lifestyleImpact,
            scalpHealthWarning: fallback.scalpHealthWarning,
          };
        } else {
          console.error("ML API error:", mlResponse.status, await mlResponse.text());
          report = generateFallbackReport(requestData.questionnaire);
        }
      } catch (mlError) {
        console.error("ML API call failed:", mlError);
        report = generateFallbackReport(requestData.questionnaire);
      }
    } else {
      console.log("No ML_API_URL configured, using fallback rule-based analysis");
      report = generateFallbackReport(requestData.questionnaire);
    }

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from("reports")
      .insert({
        profile_id: requestData.profileId,
        questionnaire_id: requestData.questionnaireId,
        overall_risk_level: report.overallRiskLevel,
        risk_score: report.riskScore,
        possible_causes: report.possibleCauses,
        recommendations: report.recommendations,
        lifestyle_impact: report.lifestyleImpact,
        scalp_health_warning: report.scalpHealthWarning,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving report:", saveError);
      throw saveError;
    }

    console.log("Report saved successfully:", savedReport.id);

    return new Response(
      JSON.stringify({
        success: true,
        report: {
          id: savedReport.id,
          ...report,
          generatedAt: savedReport.generated_at,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-hair function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
