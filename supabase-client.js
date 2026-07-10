/* ============================================
   SUPABASE CLIENT — shared across all pages
   ============================================ */
const SUPABASE_URL = 'https://qjhdkfygwsmtnjuxgork.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqaGRrZnlnd3NtdG5qdXhnb3JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODgwMTAsImV4cCI6MjA5OTI2NDAxMH0.sIqLSOwpCc02SE_KDQ7KGU4OdguYTtUo1XQlA4ISTio';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
