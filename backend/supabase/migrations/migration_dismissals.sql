-- Add table to track notification dismissals per user/vendor
CREATE TABLE IF NOT EXISTS public.dismissed_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.dismissed_messages ENABLE ROW LEVEL SECURITY;

-- Create policy so users can only view and insert their own dismissals
CREATE POLICY "Users can insert their own dismissals" ON public.dismissed_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own dismissals" ON public.dismissed_messages
    FOR SELECT USING (auth.uid() = user_id);
