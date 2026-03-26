import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vviwuymehnsqacneutiz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2aXd1eW1laG5zcWFjbmV1dGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzA2NjQsImV4cCI6MjA5MDEwNjY2NH0.hr4OdPC5a55fIwZkaYbjeHfoWpqWWMq-_avy1mgyOMY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
