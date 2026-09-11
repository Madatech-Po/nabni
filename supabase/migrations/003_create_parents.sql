-- Migration: 003_create_parents.sql
-- Description: Create the parents table for parent-specific data.

-- Create Contact Preference Enum
CREATE TYPE public.contact_preference AS ENUM ('whatsapp', 'phone_call', 'platform_message');

-- Create Parents Table
CREATE TABLE public.parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    children_count INT DEFAULT 1,
    preferred_contact public.contact_preference DEFAULT 'platform_message',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- Create Indexes
CREATE UNIQUE INDEX idx_parents_profile_id ON public.parents(profile_id);
