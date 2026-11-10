import { Candidate, ComputedCandidate, SelectionConfig } from '../types';
import calon1Img from '../assets/images/calon_kawil_1_1794310514038.jpg';
import calon2Img from '../assets/images/calon_kawil_2_1794310516996.jpg';
import calon3Img from '../assets/images/calon_kawil_3_1794310515872.jpg';

export const BUNDLED_CANDIDATE_PHOTOS: Record<string, string> = {
  'calon-1': calon1Img,
  'calon-2': calon2Img,
  'calon-3': calon3Img,
};

export const DEFAULT_CONFIG: SelectionConfig = {
  desa: 'Desa Baujeng',
  kecamatan: 'Kecamatan Beji',
  kabupaten: 'Kabupaten Pasuruan',
  formasi: 'Kepala Kewilayahan (Kawil) Dusun Tanggul',
  tahunAnggaran: '2026',
  tanggalSeleksi: '10 November 2026',
  ketuaPanitia: 'H. Mochammad Choirul Anam, S.Sos.',
  sekretarisPanitia: 'Lutfi Hakim, S.AP.',
  kepalaDesa: 'H. Sobirin',
  modeHitung: 'rata_rata',
  bobot: {
    tulis: 40,
    btq: 30,
    wawancara: 30,
  },
  passingGrade: 0,
};

export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'calon-1',
    nomorUrut: '01',
    nama: 'Ahmad Fauzi Hidayat, S.AP.',
    nomorPeserta: 'BJG-KWL-01',
    pendidikan: 'S1 Administrasi Publik',
    alamat: 'Dusun Tanggul RT 002 / RW 004, Desa Baujeng',
    fotoUrl: calon1Img,
    scores: {
      tulis: null,
      btq: null,
      wawancara: null,
    },
    manualInputs: {
      tulis: '',
      btq: '',
      wawancara: '',
      catatanPanitia: '',
    },
  },
  {
    id: 'calon-2',
    nomorUrut: '02',
    nama: 'Siti Nurhaliza Rahmawati, S.Pd.',
    nomorPeserta: 'BJG-KWL-02',
    pendidikan: 'S1 Pendidikan Ekonomi',
    alamat: 'Dusun Tanggul RT 004 / RW 004, Desa Baujeng',
    fotoUrl: calon2Img,
    scores: {
      tulis: null,
      btq: null,
      wawancara: null,
    },
    manualInputs: {
      tulis: '',
      btq: '',
      wawancara: '',
      catatanPanitia: '',
    },
  },
  {
    id: 'calon-3',
    nomorUrut: '03',
    nama: 'Hendra Kusuma Wijaya, S.H.',
    nomorPeserta: 'BJG-KWL-03',
    pendidikan: 'S1 Ilmu Hukum',
    alamat: 'Dusun Tanggul RT 001 / RW 003, Desa Baujeng',
    fotoUrl: calon3Img,
    scores: {
      tulis: null,
      btq: null,
      wawancara: null,
    },
    manualInputs: {
      tulis: '',
      btq: '',
      wawancara: '',
      catatanPanitia: '',
    },
  },
];

export const SAMPLE_COMPLETE_SCORES = [
  { tulis: 88.5, btq: 92.0, wawancara: 90.0 },
  { tulis: 86.0, btq: 89.5, wawancara: 88.0 },
  { tulis: 84.0, btq: 85.0, wawancara: 86.5 },
];

export function parseManualNoteScore(rawText: string): number | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const matches = trimmed.match(/\d+(?:[.,]\d+)?/g);
  if (!matches || matches.length === 0) return null;

  const validNumbers = matches
    .map((m) => parseFloat(m.replace(',', '.')))
    .filter((n) => !isNaN(n) && n >= 0 && n <= 100);

  if (validNumbers.length === 0) return null;

  const sum = validNumbers.reduce((acc, val) => acc + val, 0);
  const avg = sum / validNumbers.length;
  return Math.round(avg * 100) / 100;
}

export function computeCandidates(
  candidates: Candidate[],
  _config: SelectionConfig
): ComputedCandidate[] {
  const enriched = candidates.map((c) => {
    const sTulis = c.scores.tulis;
    const sBtq = c.scores.btq;
    const sWawancara = c.scores.wawancara;

    const filledScores = [sTulis, sBtq, sWawancara].filter(
      (v): v is number => v !== null && !isNaN(v)
    );
    const filledCount = filledScores.length;
    const isComplete = filledCount === 3;

    const vTulis = sTulis ?? 0;
    const vBtq = sBtq ?? 0;
    const vWawancara = sWawancara ?? 0;

    const totalAkumulasi = Math.round((vTulis + vBtq + vWawancara) * 100) / 100;
    const rataRata =
      filledCount > 0
        ? Math.round(((vTulis + vBtq + vWawancara) / 3) * 100) / 100
        : 0;

    return {
      ...c,
      totalAkumulasi,
      rataRata,
      nilaiTerbobot: totalAkumulasi,
      nilaiAkhir: totalAkumulasi,
      isComplete,
      filledCount,
      peringkat: 1,
      lulusPassingGrade: isComplete,
    };
  });

  const sortedByScore = [...enriched].sort((a, b) => {
    if (b.nilaiAkhir !== a.nilaiAkhir) return b.nilaiAkhir - a.nilaiAkhir;
    if (b.totalAkumulasi !== a.totalAkumulasi) return b.totalAkumulasi - a.totalAkumulasi;
    return (b.scores.tulis ?? 0) - (a.scores.tulis ?? 0);
  });

  const rankMap = new Map<string, number>();
  sortedByScore.forEach((item, idx) => {
    rankMap.set(item.id, idx + 1);
  });

  return enriched.map((c) => ({
    ...c,
    peringkat: rankMap.get(c.id) ?? 1,
  }));
}
