-- Migration: 004_create_educators.sql
-- Description: Create the educators table for educator-specific data.

-- Create Teaching Mode Enum
CREATE TYPE public.teaching_mode AS ENUM ('online', 'offline', 'both');

-- Create Educators Table
CREATE TABLE public.educators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    headline TEXT,
    bio TEXT,
    experience_years INT DEFAULT 0,
    teaching_mode public.teaching_mode DEFAULT 'both',
    hourly_rate NUMERIC(10, 2),
    verified BOOLEAN NOT NULL DEFAULT false,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    reviews_count INT DEFAULT 0,
    completed_bookings INT DEFAULT 0,
    response_time INT, -- average response time in minutes
    profile_completed INT DEFAULT 0, -- percentage of profile completion
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.educators ENABLE ROW LEVEL SECURITY;

-- Create Indexes
CREATE UNIQUE INDEX idx_educators_profile_id ON public.educators(profile_id);
CREATE INDEX idx_educators_verified ON public.educators(verified);
CREATE INDEX idx_educators_average_rating ON public.educators(average_rating);

-- Trigger for updated_at
CREATE TRIGGER update_educators_updated_at
    BEFORE UPDATE ON public.educators
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
