// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// --- WORKAROUND SEMENTARA UNTUK MASALAH .ENV ---
// Kita memasukkan kunci langsung di sini untuk melewati masalah pemuatan environment.
// Ini hanya untuk development. JANGAN UNGGAH INI KE REPOSITORI PUBLIK.

const supabaseUrl = "https://hrwaitomvydbsdccmyck.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyd2FpdG9tdnlkYnNkY2NteWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NjU0NTgsImV4cCI6MjA3MjU0MTQ1OH0.WIxFvm8yiNAqMvgSMMzz-bl3fDfMfJsPy7s-PQzpNyA"

// Pengecekan untuk memastikan nilai tidak kosong
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL dan Anon Key kosong! Harap masukkan nilainya di supabaseClient.js untuk tes ini.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)