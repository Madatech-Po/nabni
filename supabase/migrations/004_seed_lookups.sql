-- Migration: 004_seed_lookups.sql
-- Description: NAB-26. Seed the lookup tables. Cities are left for later.
-- ON CONFLICT DO NOTHING keeps the seed safe to re-run.
--
-- NOTE: written on the wrong assumption that the tables were empty. They already held seed
-- data from 2026-08-07, so this added duplicates in four tables; 007_remove_duplicate_seed_rows
-- removes them. Keep this file only as a record of what was applied.

INSERT INTO public.governorates (name_ar, name_en) VALUES
  ('القاهرة', 'Cairo'),
  ('الجيزة', 'Giza'),
  ('الإسكندرية', 'Alexandria'),
  ('القليوبية', 'Qalyubia'),
  ('الشرقية', 'Sharqia'),
  ('الدقهلية', 'Dakahlia'),
  ('البحيرة', 'Beheira'),
  ('الغربية', 'Gharbia'),
  ('المنوفية', 'Monufia'),
  ('كفر الشيخ', 'Kafr El Sheikh'),
  ('دمياط', 'Damietta'),
  ('بورسعيد', 'Port Said'),
  ('الإسماعيلية', 'Ismailia'),
  ('السويس', 'Suez'),
  ('الفيوم', 'Faiyum'),
  ('بني سويف', 'Beni Suef'),
  ('المنيا', 'Minya'),
  ('أسيوط', 'Assiut'),
  ('سوهاج', 'Sohag'),
  ('قنا', 'Qena'),
  ('الأقصر', 'Luxor'),
  ('أسوان', 'Aswan'),
  ('البحر الأحمر', 'Red Sea'),
  ('الوادي الجديد', 'New Valley'),
  ('مطروح', 'Matrouh'),
  ('شمال سيناء', 'North Sinai'),
  ('جنوب سيناء', 'South Sinai')
ON CONFLICT DO NOTHING;

INSERT INTO public.service_categories (name_ar, name_en, slug, description, display_order) VALUES
  ('تأسيس لغة عربية', 'Arabic Foundation', 'arabic-foundation', 'تأسيس الأطفال في القراءة والكتابة باللغة العربية', 1),
  ('تأسيس لغة إنجليزية', 'English Foundation', 'english-foundation', 'تأسيس مهارات اللغة الإنجليزية الأساسية', 2),
  ('رياضيات', 'Mathematics', 'mathematics', 'تبسيط المفاهيم الرياضية للأطفال', 3),
  ('تحفيظ قرآن', 'Quran', 'quran', 'تحفيظ وتجويد القرآن الكريم للأطفال', 4),
  ('مونتيسوري', 'Montessori', 'montessori', 'التعلم من خلال أنشطة ومنهج المونتيسوري', 5),
  ('تنمية مهارات', 'Skills Development', 'skills-development', 'تطوير المهارات الذهنية والحركية والإدراكية', 6),
  ('تخاطب', 'Speech Therapy', 'speech-therapy', 'علاج تأخر النطق وصعوبات الكلام', 7),
  ('صعوبات تعلم', 'Learning Difficulties', 'learning-difficulties', 'التعامل المتخصص مع صعوبات التعلم', 8),
  ('علاج وظيفي', 'Occupational Therapy', 'occupational-therapy', 'تطوير المهارات الحركية الدقيقة والاعتماد على النفس', 9),
  ('تعديل سلوك', 'Behavior Modification', 'behavior-modification', 'تعديل السلوكيات غير المرغوبة وتطوير السلوك الإيجابي', 10)
ON CONFLICT DO NOTHING;

INSERT INTO public.education_levels (name_ar, name_en, min_age, max_age, display_order) VALUES
  ('حضانة', 'Nursery', 2, 4, 1),
  ('رياض أطفال (KG1)', 'Kindergarten 1', 4, 5, 2),
  ('رياض أطفال (KG2)', 'Kindergarten 2', 5, 6, 3),
  ('ابتدائي (١-٣)', 'Primary 1-3', 6, 9, 4),
  ('ابتدائي (٤-٦)', 'Primary 4-6', 9, 12, 5),
  ('إعدادي', 'Preparatory', 12, 15, 6)
ON CONFLICT DO NOTHING;

INSERT INTO public.teaching_places (name_ar, name_en, icon, display_order) VALUES
  ('في منزل الطالب', 'At student''s home', 'home', 1),
  ('في منزل المعلم', 'At educator''s home', 'school', 2),
  ('أونلاين', 'Online', 'videocam', 3),
  ('في مركز تعليمي', 'At a learning center', 'business', 4)
ON CONFLICT DO NOTHING;

INSERT INTO public.pricing_units (name_ar, name_en, display_order) VALUES
  ('الحصة', 'Per session', 1),
  ('الساعة', 'Per hour', 2),
  ('الشهر', 'Per month', 3)
ON CONFLICT DO NOTHING;

-- Codes match the educator_verification_status enum.
INSERT INTO public.verification_statuses (code, name_ar, name_en, display_order) VALUES
  ('pending', 'قيد المراجعة', 'Pending', 1),
  ('approved', 'موثّق', 'Approved', 2),
  ('rejected', 'مرفوض', 'Rejected', 3)
ON CONFLICT DO NOTHING;
