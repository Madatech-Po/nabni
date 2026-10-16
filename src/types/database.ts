// Generated from the live Supabase schema (project wubqoyzlaodchwldgkbt) on 2026-10-14.
// Regenerate after every migration instead of editing by hand.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Lookup = {
  Row: { id: number; name_ar: string; name_en: string; is_active: boolean; created_at: string };
  Insert: { id?: never; name_ar: string; name_en: string; is_active?: boolean; created_at?: string };
  Update: { id?: never; name_ar?: string; name_en?: string; is_active?: boolean; created_at?: string };
  Relationships: [];
};

type OrderedLookup<Extra = {}> = {
  Row: Lookup['Row'] & { display_order: number } & Extra;
  Insert: Lookup['Insert'] & { display_order?: number } & Partial<Extra>;
  Update: Lookup['Update'] & { display_order?: number } & Partial<Extra>;
  Relationships: [];
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export type EducatorGender = 'male' | 'female';
export type EducatorVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type UserRole = 'parent' | 'educator' | 'admin';
export type RequestStatus = 'open' | 'closed' | 'cancelled';

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.15' };
  public: {
    Tables: {
      governorates: Lookup;
      cities: {
        Row: Lookup['Row'] & { governorate_id: number };
        Insert: Lookup['Insert'] & { governorate_id: number };
        Update: Lookup['Update'] & { governorate_id?: number };
        Relationships: [
          { foreignKeyName: 'cities_governorate_id_fkey'; columns: ['governorate_id']; isOneToOne: false; referencedRelation: 'governorates'; referencedColumns: ['id'] },
        ];
      };
      service_categories: OrderedLookup<{
        slug: string;
        description: string | null;
        icon: string | null;
        color: string | null;
        image_url: string | null;
      }>;
      education_levels: OrderedLookup<{ min_age: number; max_age: number }>;
      teaching_places: OrderedLookup<{ icon: string | null }>;
      pricing_units: OrderedLookup;
      verification_statuses: OrderedLookup<{ code: string }>;
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          governorate_id: number | null;
          city: string | null;
          is_active: boolean;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        // Rows are created by the handle_new_user trigger; users may only update these columns.
        Insert: never;
        Update: {
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          governorate_id?: number | null;
          city?: string | null;
          onboarding_completed?: boolean;
        };
        Relationships: [
          { foreignKeyName: 'profiles_governorate_id_fkey'; columns: ['governorate_id']; isOneToOne: false; referencedRelation: 'governorates'; referencedColumns: ['id'] },
        ];
      };
      educators: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          phone: string;
          whatsapp_number: string | null;
          governorate_id: number | null;
          city_id: number | null;
          bio: string | null;
          profile_image: string | null;
          experience_years: number | null;
          gender: EducatorGender | null;
          verification_status: EducatorVerificationStatus | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone: string;
          whatsapp_number?: string | null;
          governorate_id?: number | null;
          city_id?: number | null;
          bio?: string | null;
          profile_image?: string | null;
          experience_years?: number | null;
          gender?: EducatorGender | null;
        };
        Update: Partial<Database['public']['Tables']['educators']['Insert']>;
        Relationships: Relationship[];
      };
      educator_subjects: {
        Row: { id: string; educator_id: string; subject_id: number; created_at: string | null };
        Insert: { id?: string; educator_id: string; subject_id: number };
        Update: { educator_id?: string; subject_id?: number };
        Relationships: Relationship[];
      };
      educator_levels: {
        Row: { id: string; educator_id: string; level_id: number; created_at: string | null };
        Insert: { id?: string; educator_id: string; level_id: number };
        Update: { educator_id?: string; level_id?: number };
        Relationships: Relationship[];
      };
      educator_locations: {
        Row: {
          id: string;
          educator_id: string;
          governorate_id: number;
          city_id: number | null;
          address: string | null;
          created_at: string | null;
        };
        Insert: { id?: string; educator_id: string; governorate_id: number; city_id?: number | null; address?: string | null };
        Update: { governorate_id?: number; city_id?: number | null; address?: string | null };
        Relationships: Relationship[];
      };
      requests: {
        Row: {
          id: string;
          parent_id: string;
          service_category_id: number;
          education_level_id: number | null;
          teaching_place_id: number;
          governorate_id: number;
          city_id: number | null;
          area: string | null;
          student_age: number;
          description: string;
          preferred_educator_gender: EducatorGender | null;
          budget: number | null;
          pricing_unit_id: number | null;
          status: RequestStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          service_category_id: number;
          education_level_id?: number | null;
          teaching_place_id: number;
          governorate_id: number;
          city_id?: number | null;
          area?: string | null;
          student_age: number;
          description: string;
          preferred_educator_gender?: EducatorGender | null;
          budget?: number | null;
          pricing_unit_id?: number | null;
          status?: RequestStatus;
        };
        Update: Partial<Database['public']['Tables']['requests']['Insert']>;
        Relationships: [
          { foreignKeyName: 'requests_service_category_id_fkey'; columns: ['service_category_id']; isOneToOne: false; referencedRelation: 'service_categories'; referencedColumns: ['id'] },
          { foreignKeyName: 'requests_education_level_id_fkey'; columns: ['education_level_id']; isOneToOne: false; referencedRelation: 'education_levels'; referencedColumns: ['id'] },
          { foreignKeyName: 'requests_teaching_place_id_fkey'; columns: ['teaching_place_id']; isOneToOne: false; referencedRelation: 'teaching_places'; referencedColumns: ['id'] },
          { foreignKeyName: 'requests_governorate_id_fkey'; columns: ['governorate_id']; isOneToOne: false; referencedRelation: 'governorates'; referencedColumns: ['id'] },
          { foreignKeyName: 'requests_pricing_unit_id_fkey'; columns: ['pricing_unit_id']; isOneToOne: false; referencedRelation: 'pricing_units'; referencedColumns: ['id'] },
          { foreignKeyName: 'requests_parent_id_fkey'; columns: ['parent_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
    };
    Views: {
      educator_directory: {
        Row: {
          id: string;
          full_name: string;
          bio: string | null;
          profile_image: string | null;
          experience_years: number | null;
          gender: EducatorGender | null;
          governorate_id: number | null;
          governorate_name_ar: string | null;
          city_id: number | null;
          city_name_ar: string | null;
          subject_ids: number[];
          level_ids: number[];
          location_governorate_ids: number[];
          created_at: string | null;
        };
        Relationships: [];
      };
    };
    Functions: { [_ in never]: never };
    Enums: {
      educator_gender: EducatorGender;
      educator_verification_status: EducatorVerificationStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])> =
  (PublicSchema['Tables'] & PublicSchema['Views'])[T] extends { Row: infer R } ? R : never;
