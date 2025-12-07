
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = 'https://fjthidpieisuskclfmjh.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdGhpZHBpZWlzdXNrY2xmbWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwODY5OTcsImV4cCI6MjA4MDY2Mjk5N30.GuLV-feymUm2YLskAI9FA5fgyDp9F5D0CI_JWXEBOI4';

let client: SupabaseClient | null = null;

// Validação básica para garantir que as chaves não estão vazias
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
    console.log("✅ Supabase conectado com sucesso.");
  } catch (error) {
    console.warn("⚠️ Erro ao inicializar Supabase:", error);
    client = null;
  }
} else {
    console.warn("⚠️ Credenciais do Supabase ausentes.");
    client = null;
}

export const supabase = client;
