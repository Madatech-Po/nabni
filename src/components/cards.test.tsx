import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RequestCard from '@/components/requests/RequestCard';
import TutorCard from '@/components/educators/TutorCard';
import type { RequestFeedItem } from '@/services/requests';
import type { EducatorDirectoryItem } from '@/services/tutors';

const request: RequestFeedItem = {
  id: 'r1',
  student_age: 5,
  description: 'نحتاج معلمة لتأسيس القراءة والكتابة باللغة العربية لطفل في الخامسة',
  preferred_educator_gender: 'female',
  budget: 150,
  area: 'المعادي',
  created_at: new Date().toISOString(),
  service_category: { name_ar: 'تأسيس عربي' },
  education_level: { name_ar: 'من 4 إلى 5 سنوات' },
  teaching_place: { name_ar: 'منزل ولي الأمر' },
  governorate: { name_ar: 'القاهرة' },
  pricing_unit: { name_ar: 'حصة' },
};

const educator: EducatorDirectoryItem = {
  id: 'e1',
  full_name: 'منى علي',
  bio: 'معلمة تأسيس',
  profile_image: null,
  experience_years: 4,
  gender: 'female',
  governorate_id: 1,
  governorate_name_ar: 'الجيزة',
  city_id: null,
  city_name_ar: null,
  subject_ids: [4, 5, 6, 7],
  level_ids: [],
  location_governorate_ids: [],
  created_at: null,
  subjects: [
    { id: 4, name_ar: 'تأسيس عربي' },
    { id: 5, name_ar: 'تأسيس إنجليزي' },
    { id: 6, name_ar: 'رياضيات' },
    { id: 7, name_ar: 'تخاطب' },
  ],
};

describe('RequestCard', () => {
  it('shows the request details from the lookups', () => {
    render(<RequestCard request={request} />);

    for (const text of ['تأسيس عربي', 'معلمة', 'القاهرة - المعادي', '5 سنوات', 'من 4 إلى 5 سنوات', 'منزل ولي الأمر', '150 ج.م / حصة']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('shows "negotiable" without a budget and "no preference" without a gender', () => {
    render(<RequestCard request={{ ...request, budget: null, pricing_unit: null, preferred_educator_gender: null }} />);

    expect(screen.getByText('قابل للتفاوض')).toBeInTheDocument();
    expect(screen.getByText('لا يوجد تفضيل')).toBeInTheDocument();
  });

  it('hides the education level row when there is none', () => {
    render(<RequestCard request={{ ...request, education_level: null }} />);

    expect(screen.queryByText('من 4 إلى 5 سنوات')).not.toBeInTheDocument();
  });
});

describe('TutorCard', () => {
  it('shows name, governorate, experience and bio', () => {
    render(<TutorCard tutor={educator} />);

    for (const text of ['منى علي', 'الجيزة', '4 سنوات خبرة', 'معلمة تأسيس']) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });

  it('lists at most three services', () => {
    render(<TutorCard tutor={educator} />);

    expect(screen.getByText('رياضيات')).toBeInTheDocument();
    expect(screen.queryByText('تخاطب')).not.toBeInTheDocument();
  });

  it('falls back to a generic name', () => {
    render(<TutorCard tutor={{ ...educator, full_name: '' }} />);

    expect(screen.getByText('معلم نبني')).toBeInTheDocument();
  });
});
