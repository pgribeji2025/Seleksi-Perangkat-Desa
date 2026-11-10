import { createClient } from '@supabase/supabase-js';
import { Candidate } from '../types';
import { BUNDLED_CANDIDATE_PHOTOS, INITIAL_CANDIDATES } from '../utils/scoreUtils';

export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://rootsmlqlideeglndraz.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvb3RzbWxxbGlkZWVnbG5kcmF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMDYxMzksImV4cCI6MjEwOTg4MjEzOX0.8OojQTgn77C5jxusloxO6uFs64bF7te-Shg4kI7VC2Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface CalonRow {
  id: string;
  nomor_urut: string;
  nama: string;
  nomor_peserta: string;
  pendidikan: string;
  alamat: string;
  foto_url: string;
  nilai_tulis: number | null;
  nilai_btq: number | null;
  nilai_wawancara: number | null;
  catatan_panitia: string;
  updated_at?: string;
}

export function rowToCandidate(row: CalonRow): Candidate {
  const defaultCand =
    INITIAL_CANDIDATES.find((c) => c.id === row.id) || INITIAL_CANDIDATES[0];

  const resolvedPhoto =
    row.foto_url &&
    row.foto_url.trim() !== '' &&
    !row.foto_url.startsWith('/src/assets/')
      ? row.foto_url
      : BUNDLED_CANDIDATE_PHOTOS[row.id] || defaultCand.fotoUrl;

  const sTulis =
    row.nilai_tulis !== null && row.nilai_tulis !== undefined
      ? Number(row.nilai_tulis)
      : null;
  const sBtq =
    row.nilai_btq !== null && row.nilai_btq !== undefined
      ? Number(row.nilai_btq)
      : null;
  const sWawancara =
    row.nilai_wawancara !== null && row.nilai_wawancara !== undefined
      ? Number(row.nilai_wawancara)
      : null;

  return {
    id: row.id,
    nomorUrut: row.nomor_urut || defaultCand.nomorUrut,
    nama: row.nama || defaultCand.nama,
    nomorPeserta: row.nomor_peserta || defaultCand.nomorPeserta,
    pendidikan: row.pendidikan || defaultCand.pendidikan,
    alamat: row.alamat || defaultCand.alamat,
    fotoUrl: resolvedPhoto,
    scores: {
      tulis: sTulis,
      btq: sBtq,
      wawancara: sWawancara,
    },
    manualInputs: {
      tulis: sTulis !== null ? String(sTulis) : '',
      btq: sBtq !== null ? String(sBtq) : '',
      wawancara: sWawancara !== null ? String(sWawancara) : '',
      catatanPanitia: row.catatan_panitia || '',
    },
  };
}

export function candidateToRow(cand: Candidate): CalonRow {
  // Only store custom uploaded base64/external URLs in DB; keep empty string if using default bundled asset
  const defaultPhoto = BUNDLED_CANDIDATE_PHOTOS[cand.id];
  const storedPhoto =
    cand.fotoUrl && cand.fotoUrl !== defaultPhoto ? cand.fotoUrl : '';

  return {
    id: cand.id,
    nomor_urut: cand.nomorUrut,
    nama: cand.nama,
    nomor_peserta: cand.nomorPeserta,
    pendidikan: cand.pendidikan,
    alamat: cand.alamat,
    foto_url: storedPhoto,
    nilai_tulis: cand.scores.tulis,
    nilai_btq: cand.scores.btq,
    nilai_wawancara: cand.scores.wawancara,
    catatan_panitia: cand.manualInputs.catatanPanitia || '',
    updated_at: new Date().toISOString(),
  };
}

export async function fetchCandidatesFromSupabase(): Promise<{
  data: Candidate[] | null;
  error: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('calon_perangkat_desa')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data || data.length === 0) {
      // Seed initial 3 candidates into Supabase if table is empty
      const initialRows = INITIAL_CANDIDATES.map(candidateToRow);
      const { data: inserted, error: insertError } = await supabase
        .from('calon_perangkat_desa')
        .upsert(initialRows, { onConflict: 'id' })
        .select('*');

      if (insertError || !inserted) {
        return { data: INITIAL_CANDIDATES, error: null };
      }
      return {
        data: (inserted as CalonRow[]).map(rowToCandidate),
        error: null,
      };
    }

    return {
      data: (data as CalonRow[]).map(rowToCandidate),
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Gagal terhubung ke Supabase',
    };
  }
}

export async function upsertCandidatesToSupabase(
  candidates: Candidate[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    const rows = candidates.map(candidateToRow);
    const { error } = await supabase
      .from('calon_perangkat_desa')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Gagal menyimpan ke Supabase',
    };
  }
}
