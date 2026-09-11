-- Migration: 001_create_lookup_tables.sql
-- Description: Create initial lookup tables for Governorates, Education Levels, and Service Categories.

-- ==========================================
-- 1. Governorates Table
-- ==========================================
CREATE TABLE public.governorates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Policies will be added in a later migration, default deny all)
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX idx_governorates_name_ar ON public.governorates(name_ar);

-- Insert Seed Data (27 Egyptian Governorates)
INSERT INTO public.governorates (name_ar, name_en) VALUES
('القاهرة', 'Cairo'),
('الإسكندرية', 'Alexandria'),
('الجيزة', 'Giza'),
('الشرقية', 'Al Sharqia'),
('الدقهلية', 'Dakahlia'),
('البحيرة', 'Beheira'),
('المنيا', 'Minya'),
('القليوبية', 'Qalyubia'),
('سوهاج', 'Sohag'),
('الغربية', 'Gharbia'),
('أسيوط', 'Assiut'),
('المنوفية', 'Monufia'),
('الفيوم', 'Faiyum'),
('كفر الشيخ', 'Kafr El Sheikh'),
('قنا', 'Qena'),
('بني سويف', 'Beni Suef'),
('أسوان', 'Aswan'),
('دمياط', 'Damietta'),
('الإسماعيلية', 'Ismailia'),
('الأقصر', 'Luxor'),
('بورسعيد', 'Port Said'),
('السويس', 'Suez'),
('مطروح', 'Matrouh'),
('شمال سيناء', 'North Sinai'),
('البحر الأحمر', 'Red Sea'),
('الوادي الجديد', 'New Valley'),
('جنوب سيناء', 'South Sinai');


-- ==========================================
-- 2. Education Levels Table
-- ==========================================
CREATE TABLE public.education_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_ar TEXT NOT NULL UNIQUE,
    title_en TEXT NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_education_levels_sort_order ON public.education_levels(sort_order);

-- Insert Seed Data (Foundation Years)
INSERT INTO public.education_levels (title_ar, title_en, sort_order) VALUES
('٢-٣ سنوات', '2-3 years', 1),
('٣-٤ سنوات', '3-4 years', 2),
('٤-٥ سنوات', '4-5 years', 3),
('٥-٦ سنوات', '5-6 years', 4);


-- ==========================================
-- 3. Service Categories Table
-- ==========================================
CREATE TABLE public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_ar TEXT NOT NULL UNIQUE,
    title_en TEXT NOT NULL UNIQUE,
    description_ar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_service_categories_title_ar ON public.service_categories(title_ar);

-- Insert Seed Data (10 Main Categories requested)
INSERT INTO public.service_categories (title_ar, title_en, description_ar) VALUES
('تأسيس لغة عربية', 'Arabic Foundation', 'تأسيس الأطفال في القراءة والكتابة باللغة العربية'),
('تأسيس لغة إنجليزية', 'English Foundation', 'تأسيس مهارات اللغة الإنجليزية الأساسية'),
('رياضيات', 'Mathematics', 'تبسيط المفاهيم الرياضية للأطفال'),
('تخاطب', 'Speech Therapy', 'علاج تأخر النطق وصعوبات الكلام'),
('صعوبات تعلم', 'Learning Difficulties', 'التعامل المتخصص مع صعوبات التعلم'),
('مونتيسوري', 'Montessori', 'التعلم من خلال أنشطة ومنهج المونتيسوري'),
('تحفيظ قرآن', 'Quran', 'تحفيظ وتجويد القرآن الكريم للأطفال'),
('تنمية مهارات', 'Skills Development', 'تطوير المهارات الذهنية والحركية والإدراكية'),
('علاج وظيفي', 'Occupational Therapy', 'تطوير المهارات الحركية الدقيقة والاعتماد على النفس'),
('تعديل سلوك', 'Behavior Modification', 'تعديل السلوكيات غير المرغوبة وتطوير السلوك الإيجابي');
