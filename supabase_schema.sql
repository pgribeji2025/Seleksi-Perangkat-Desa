-- ============================================================================
-- SKRIP POSTGRESQL SUPABASE — SELEKSI PERANGKAT DESA BAUJENG
-- Formasi: Kepala Kewilayahan (Kawil) Dusun Tanggul, Desa Baujeng, Kec. Beji
-- Jalankan skrip ini di menu "SQL Editor" pada Dashboard Supabase Anda.
-- ============================================================================

-- 1. Buat tabel utama calon perangkat desa
CREATE TABLE IF NOT EXISTS public.calon_perangkat_desa (
  id TEXT PRIMARY KEY,
  nomor_urut TEXT NOT NULL,
  nama TEXT NOT NULL,
  nomor_peserta TEXT NOT NULL DEFAULT '',
  pendidikan TEXT NOT NULL DEFAULT '',
  alamat TEXT NOT NULL DEFAULT '',
  foto_url TEXT NOT NULL DEFAULT '',
  nilai_tulis NUMERIC(5,2) NULL,
  nilai_btq NUMERIC(5,2) NULL,
  nilai_wawancara NUMERIC(5,2) NULL,
  catatan_panitia TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS) dan izinkan akses baca/tulis untuk aplikasi web
ALTER TABLE public.calon_perangkat_desa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Izinkan publik membaca data calon" ON public.calon_perangkat_desa;
CREATE POLICY "Izinkan publik membaca data calon"
  ON public.calon_perangkat_desa
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Izinkan insert data calon" ON public.calon_perangkat_desa;
CREATE POLICY "Izinkan insert data calon"
  ON public.calon_perangkat_desa
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Izinkan update nilai dan foto calon" ON public.calon_perangkat_desa;
CREATE POLICY "Izinkan update nilai dan foto calon"
  ON public.calon_perangkat_desa
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Izinkan delete data calon" ON public.calon_perangkat_desa;
CREATE POLICY "Izinkan delete data calon"
  ON public.calon_perangkat_desa
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- 3. Masukkan data awal 3 Calon Perangkat Desa Formasi Kawil Dusun Tanggul
INSERT INTO public.calon_perangkat_desa (
  id,
  nomor_urut,
  nama,
  nomor_peserta,
  pendidikan,
  alamat,
  foto_url,
  nilai_tulis,
  nilai_btq,
  nilai_wawancara
) VALUES
  (
    'calon-1',
    '01',
    'Ahmad Fauzi Hidayat, S.AP.',
    'BJG-KWL-01',
    'S1 Administrasi Publik',
    'Dusun Tanggul RT 002 / RW 004, Desa Baujeng',
    '',
    NULL,
    NULL,
    NULL
  ),
  (
    'calon-2',
    '02',
    'Siti Nurhaliza Rahmawati, S.Pd.',
    'BJG-KWL-02',
    'S1 Pendidikan Ekonomi',
    'Dusun Tanggul RT 004 / RW 004, Desa Baujeng',
    '',
    NULL,
    NULL,
    NULL
  ),
  (
    'calon-3',
    '03',
    'Hendra Kusuma Wijaya, S.H.',
    'BJG-KWL-03',
    'S1 Ilmu Hukum',
    'Dusun Tanggul RT 001 / RW 003, Desa Baujeng',
    '',
    NULL,
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- 4. Aktifkan Realtime agar perubahan nilai langsung tampil otomatis di semua perangkat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'calon_perangkat_desa'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calon_perangkat_desa;
  END IF;
END $$;
