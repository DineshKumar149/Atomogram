-- Grant admin overarching access to all major tables
-- In Postgres, policies are OR'ed together, so adding these will override any restrictive policies for the admin.

DO $$ 
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles', 'posts', 'comments', 'stories', 'user_follows', 
    'user_blocks', 'notifications', 'messages', 'conversations', 
    'conversation_participants', 'message_reads', 'message_reactions', 
    'typing_indicators'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admin has full access on %s" ON public.%s;', t, t);
    
    EXECUTE format('
      CREATE POLICY "Admin has full access on %s"
      ON public.%s FOR ALL
      USING (public.is_app_admin())
      WITH CHECK (public.is_app_admin());
    ', t, t);
  END LOOP;
END $$;
