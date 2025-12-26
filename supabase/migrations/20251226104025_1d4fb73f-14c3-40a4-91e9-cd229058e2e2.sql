-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questionnaire_responses table
CREATE TABLE public.questionnaire_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  hair_fall_severity TEXT NOT NULL,
  family_history TEXT NOT NULL,
  stress_level TEXT NOT NULL,
  diet_quality TEXT NOT NULL,
  sleep_duration TEXT NOT NULL,
  scalp_itching BOOLEAN NOT NULL DEFAULT false,
  scalp_dandruff BOOLEAN NOT NULL DEFAULT false,
  scalp_redness BOOLEAN NOT NULL DEFAULT false,
  hair_wash_frequency TEXT NOT NULL,
  use_heat_styling BOOLEAN NOT NULL DEFAULT false,
  use_chemical_treatments BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create uploaded_images table (metadata only - files go to storage)
CREATE TABLE public.uploaded_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  questionnaire_id UUID REFERENCES public.questionnaire_responses(id) ON DELETE SET NULL,
  overall_risk_level TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  possible_causes TEXT[] NOT NULL DEFAULT '{}',
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  lifestyle_impact TEXT NOT NULL,
  scalp_health_warning BOOLEAN NOT NULL DEFAULT false,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_messages table
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for questionnaire_responses (via profile ownership)
CREATE POLICY "Users can view their own questionnaire responses"
  ON public.questionnaire_responses FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create questionnaire responses for their profile"
  ON public.questionnaire_responses FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for uploaded_images (via profile ownership)
CREATE POLICY "Users can view their own uploaded images"
  ON public.uploaded_images FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can upload images for their profile"
  ON public.uploaded_images FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own uploaded images"
  ON public.uploaded_images FOR DELETE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for reports (via profile ownership)
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create reports for their profile"
  ON public.reports FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Contact messages - anyone can insert (public contact form)
CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('assessment-images', 'assessment-images', false);

-- Storage policies for assessment images
CREATE POLICY "Users can upload their own assessment images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'assessment-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own assessment images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'assessment-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own assessment images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'assessment-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();