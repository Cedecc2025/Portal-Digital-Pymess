// supabaseClient.js
// Este módulo configura y exporta el cliente de Supabase para ser reutilizado en todo el proyecto.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://jsjwgjaprgymeonsadny.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzandnamFwcmd5bWVvbnNhZG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzY5NjQsImV4cCI6MjA3NDIxMjk2NH0.4fjXkdOCyaubZuVIZNeViaA6MfdDK-4pdH9h-Ty2bfk";

// Se crea una única instancia del cliente de Supabase para toda la aplicación.
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
