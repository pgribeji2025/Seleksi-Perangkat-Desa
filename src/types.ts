export type CalculationMode = 'bobot' | 'rata_rata' | 'akumulasi';

export interface SubjectScores {
  tulis: number | null;
  btq: number | null;
  wawancara: number | null;
}

export interface ManualNoteInputs {
  tulis: string;
  btq: string;
  wawancara: string;
  catatanPanitia: string;
}

export interface Candidate {
  id: string;
  nomorUrut: string;
  nama: string;
  nomorPeserta: string;
  pendidikan: string;
  alamat: string;
  fotoUrl: string;
  scores: SubjectScores;
  manualInputs: ManualNoteInputs;
}

export interface SelectionConfig {
  desa: string;
  kecamatan: string;
  kabupaten: string;
  formasi: string;
  tahunAnggaran: string;
  tanggalSeleksi: string;
  ketuaPanitia: string;
  sekretarisPanitia: string;
  kepalaDesa: string;
  modeHitung: CalculationMode;
  bobot: {
    tulis: number;
    btq: number;
    wawancara: number;
  };
  passingGrade: number;
}

export interface ComputedCandidate extends Candidate {
  totalAkumulasi: number;
  rataRata: number;
  nilaiTerbobot: number;
  nilaiAkhir: number;
  isComplete: boolean;
  filledCount: number;
  peringkat: number;
  lulusPassingGrade: boolean;
}
