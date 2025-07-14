-- Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    court INTEGER NOT NULL CHECK (court IN (2, 3)),
    date DATE NOT NULL,
    time VARCHAR(5) NOT NULL CHECK (time IN ('09:00', '10:30', '12:00', '13:30', '16:30', '18:00', '19:30', '21:00')),
    name VARCHAR(100) NOT NULL,
    comment TEXT,
    secret_key VARCHAR(6) NOT NULL CHECK (LENGTH(secret_key) = 6 AND secret_key ~ '^[0-9]+$'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique booking per court, date and time
    UNIQUE(court, date, time)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bookings_date_court ON public.bookings(date, court);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no authentication is required initially)
-- Allow anyone to read bookings
CREATE POLICY "Allow public read access" ON public.bookings
    FOR SELECT USING (true);

-- Allow anyone to insert bookings
CREATE POLICY "Allow public insert access" ON public.bookings
    FOR INSERT WITH CHECK (true);

-- Allow anyone to delete their own bookings (using secret_key)
CREATE POLICY "Allow delete with correct secret_key" ON public.bookings
    FOR DELETE USING (true);

-- Function to automatically delete old bookings (older than 2 weeks)
CREATE OR REPLACE FUNCTION cleanup_old_bookings()
RETURNS void AS $$
BEGIN
    DELETE FROM public.bookings 
    WHERE date < CURRENT_DATE - INTERVAL '14 days';
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run cleanup daily
-- Note: You'll need to set up a cron job or edge function to call this function regularly