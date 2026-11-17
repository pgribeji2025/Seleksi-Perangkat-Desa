import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  Download,
  Edit3,
  FileSpreadsheet,
  Hash,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Printer,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
  X,
  ZoomIn,
} from 'lucide-react';
import { Candidate, SelectionConfig } from './types';
import {
  BUNDLED_CANDIDATE_PHOTOS,
  computeCandidates,
  DEFAULT_CONFIG,
  INITIAL_CANDIDATES,
  SAMPLE_COMPLETE_SCORES,
} from './utils/scoreUtils';
import { PemdaLogo } from './components/PemdaLogo';
import { GoldenCelebration } from './components/GoldenCelebration';
import {
  fetchCandidatesFromSupabase,
  supabase,
  upsertCandidatesToSupabase,
} from './lib/supabase';

const STORAGE_KEY_CANDIDATES = 'sipedes_baujeng_candidates_v3';
const STORAGE_KEY_SAVED_MAP = 'sipedes_baujeng_saved_map_v3';
const STORAGE_KEY_AUTH = 'sipedes_baujeng_auth_v3';
const HERO_BALAI_DESA_IMG =
  'https://lh3.googleusercontent.com/d/1rlyamBLrSh-tBtEzl6_5rQwPiNM_t4PZ';

type MainView = 'landing' | 'dashboard';

export default function App() {
  const [config] = useState<SelectionConfig>(DEFAULT_CONFIG);
  const [mainView, setMainView] = useState<MainView>('landing');

  // Admin Authentication State (username: admin, password: adminbaujeng@1)
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
    } catch {
      return false;
    }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // 3-Click Secret Trigger on Lambang Kabupaten Pasuruan Icon
  const clickCountRef = useRef<number>(0);
  const clickTimerRef = useRef<number | null>(null);

  const handleLogoClick = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      if (isAdmin) {
        setMainView('dashboard');
        showToast('Mode Admin sudah aktif.');
      } else {
        setShowLoginModal(true);
      }
      return;
    }

    clickTimerRef.current = window.setTimeout(() => {
      clickCountRef.current = 0;
    }, 1200);
  };

  // 3 Candidates State (Formasi Kawil Dusun Tanggul)
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CANDIDATES);
      if (!saved) return INITIAL_CANDIDATES;
      const parsed: Candidate[] = JSON.parse(saved);
      return parsed.map((c) => ({
        ...c,
        fotoUrl:
          c.fotoUrl && c.fotoUrl.startsWith('/src/assets/')
            ? BUNDLED_CANDIDATE_PHOTOS[c.id] || c.fotoUrl
            : c.fotoUrl,
      }));
    } catch {
      return INITIAL_CANDIDATES;
    }
  });

  // Tracks whether each candidate's scores have been explicitly saved via "Simpan Nilai Peserta"
  const [savedCandidateMap, setSavedCandidateMap] = useState<Record<string, boolean>>(() => {
    try {
      const savedMapStr = localStorage.getItem(STORAGE_KEY_SAVED_MAP);
      if (savedMapStr) {
        return JSON.parse(savedMapStr);
      }
    } catch {
      // Ignore
    }
    const initialMap: Record<string, boolean> = {};
    for (const c of candidates) {
      initialMap[c.id] =
        c.scores.tulis !== null &&
        c.scores.btq !== null &&
        c.scores.wawancara !== null;
    }
    return initialMap;
  });

  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);

  // Controls whether the Admin explicitly clicked "Ubah Nilai" while all 9 scores are complete
  const [isEditingWhenComplete, setIsEditingWhenComplete] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [previewCandidatePhoto, setPreviewCandidatePhoto] = useState<Candidate | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);

  const scheduleSupabaseSync = (updatedCandidates: Candidate[], immediate = false) => {
    if (syncTimeoutRef.current) {
      window.clearTimeout(syncTimeoutRef.current);
    }
    if (immediate) {
      void upsertCandidatesToSupabase(updatedCandidates);
      return;
    }
    syncTimeoutRef.current = window.setTimeout(() => {
      void upsertCandidatesToSupabase(updatedCandidates);
    }, 350);
  };

  // Initial fetch & Realtime subscription from Supabase
  useEffect(() => {
    let isMounted = true;

    const syncFromRemote = (data: Candidate[]) => {
      setCandidates(data);
      setSavedCandidateMap((prev) => {
        const next = { ...prev };
        for (const c of data) {
          const hasAllThree =
            c.scores.tulis !== null &&
            c.scores.btq !== null &&
            c.scores.wawancara !== null;
          next[c.id] = hasAllThree ? true : Boolean(prev[c.id] && hasAllThree);
        }
        return next;
      });
    };

    const loadInitial = async () => {
      const { data } = await fetchCandidatesFromSupabase();
      if (isMounted && data && data.length > 0) {
        syncFromRemote(data);
      }
    };

    void loadInitial();

    const channel = supabase
      .channel('calon_perangkat_desa_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calon_perangkat_desa',
        },
        async () => {
          const { data } = await fetchCandidatesFromSupabase();
          if (isMounted && data && data.length > 0) {
            syncFromRemote(data);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CANDIDATES, JSON.stringify(candidates));
    } catch {
      // Ignore storage quota errors
    }
  }, [candidates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_MAP, JSON.stringify(savedCandidateMap));
    } catch {
      // Ignore
    }
  }, [savedCandidateMap]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, String(isAdmin));
    } catch {
      // Ignore
    }
  }, [isAdmin]);

  const showToast = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Computed Candidates with Live Ranking & Totals
  const computedCandidates = useMemo(
    () => computeCandidates(candidates, config),
    [candidates, config]
  );

  // Candidates sorted by Nomor Urut (determined in Admin, automatically ordered in Dashboard Calon Perangkat Desa)
  const sortedByNomorUrut = useMemo(() => {
    return [...computedCandidates].sort((a, b) => {
      const numA = parseInt(a.nomorUrut.replace(/\D/g, ''), 10);
      const numB = parseInt(b.nomorUrut.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return a.nomorUrut.localeCompare(b.nomorUrut, undefined, { numeric: true });
    });
  }, [computedCandidates]);

  const sortedByRank = useMemo(
    () => [...computedCandidates].sort((a, b) => a.peringkat - b.peringkat),
    [computedCandidates]
  );

  const totalFilledCount = useMemo(
    () => computedCandidates.reduce((acc, c) => acc + c.filledCount, 0),
    [computedCandidates]
  );

  const savedCompleteCandidatesCount = useMemo(
    () =>
      computedCandidates.filter(
        (c) => c.filledCount === 3 && Boolean(savedCandidateMap[c.id])
      ).length,
    [computedCandidates, savedCandidateMap]
  );

  // Celebration only appears when ALL 9 scores are filled AND all 3 candidates up to the last candidate have been saved
  const isAllComplete =
    totalFilledCount === 9 &&
    computedCandidates.length > 0 &&
    computedCandidates.every(
      (c) => c.filledCount === 3 && Boolean(savedCandidateMap[c.id])
    );

  // Automatically open Page 2 (Halaman Hasil & Perayaan) only when all candidates' scores are filled and saved
  useEffect(() => {
    if (isAllComplete) {
      setIsEditingWhenComplete(false);
    }
  }, [isAllComplete]);

  // Show Hasil page automatically when all 9 scores are filled & saved (unless Admin clicked "Ubah Nilai")
  const showResultPage = isAllComplete && !isEditingWhenComplete;

  // Login Handler (username: admin, password: adminbaujeng@1)
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername.trim() === 'admin' && loginPassword === 'adminbaujeng@1') {
      setIsAdmin(true);
      setLoginUsername('');
      setLoginPassword('');
      setLoginError('');
      setShowLoginModal(false);
      setMainView('dashboard');
      showToast('Login Admin berhasil.');
    } else {
      setLoginError('Username atau password yang Anda masukkan tidak sesuai.');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    showToast('Anda telah keluar dari sesi Admin.');
  };

  // Update a candidate's numeric score in draft state; marks candidate as unsaved until "Simpan Nilai" is clicked
  const handleDirectScoreChange = (
    candidateId: string,
    subject: 'tulis' | 'btq' | 'wawancara',
    valueStr: string
  ) => {
    const trimmed = valueStr.trim();
    const num =
      trimmed === ''
        ? null
        : Math.min(100, Math.max(0, parseFloat(trimmed.replace(',', '.'))));
    const validNum =
      num !== null && !isNaN(num) ? Math.round(num * 100) / 100 : null;

    setSavedCandidateMap((prev) => ({
      ...prev,
      [candidateId]: false,
    }));

    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== candidateId) return c;
        return {
          ...c,
          scores: {
            ...c.scores,
            [subject]: validNum,
          },
          manualInputs: {
            ...c.manualInputs,
            [subject]: valueStr,
          },
        };
      })
    );
  };

  // Explicit Save Handler per Candidate ("Simpan Nilai Peserta")
  const handleSaveCandidate = async (candidateId: string) => {
    const target = candidates.find((c) => c.id === candidateId);
    if (!target) return;

    setSavingCandidateId(candidateId);
    await upsertCandidatesToSupabase([target]);
    setSavingCandidateId(null);

    const isTargetAllThreeFilled =
      target.scores.tulis !== null &&
      target.scores.btq !== null &&
      target.scores.wawancara !== null;

    const nextSavedMap: Record<string, boolean> = {
      ...savedCandidateMap,
      [candidateId]: isTargetAllThreeFilled,
    };
    setSavedCandidateMap(nextSavedMap);

    const willAllBeComplete = candidates.every(
      (c) =>
        c.scores.tulis !== null &&
        c.scores.btq !== null &&
        c.scores.wawancara !== null &&
        Boolean(nextSavedMap[c.id])
    );

    if (willAllBeComplete) {
      setIsEditingWhenComplete(false);
      showToast(
        'Seluruh nilai hingga peserta terakhir berhasil disimpan! Membuka Halaman Hasil & Perayaan.'
      );
    } else if (isTargetAllThreeFilled) {
      showToast(
        `Nilai peserta No. Urut ${target.nomorUrut} (${target.nama}) berhasil disimpan.`
      );
    } else {
      showToast(
        `Data peserta No. Urut ${target.nomorUrut} disimpan sebagian. Lengkapi 3 materi uji peserta ini untuk mengunci nilai.`
      );
    }
  };

  const handleCandidateFieldChange = (
    candidateId: string,
    field: keyof Candidate,
    value: string,
    immediateSync = false
  ) => {
    setCandidates((prev) => {
      const next = prev.map((c) =>
        c.id === candidateId ? { ...c, [field]: value } : c
      );
      scheduleSupabaseSync(next, immediateSync);
      return next;
    });
  };

  const handlePhotoUpload = (
    candidateId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleCandidateFieldChange(candidateId, 'fotoUrl', reader.result, true);
        showToast('Foto calon perangkat desa berhasil diperbarui & disimpan ke database.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearScores = () => {
    setCandidates((prev) => {
      const next = prev.map((c) => ({
        ...c,
        scores: { tulis: null, btq: null, wawancara: null },
        manualInputs: { tulis: '', btq: '', wawancara: '', catatanPanitia: '' },
      }));
      scheduleSupabaseSync(next, true);
      return next;
    });
    setSavedCandidateMap({});
    setIsEditingWhenComplete(false);
    showToast('Nilai berhasil direset. Silakan input kembali.');
  };

  const handleFillSampleScores = () => {
    const nextSaved: Record<string, boolean> = {};
    setCandidates((prev) => {
      const next = prev.map((c, idx) => {
        nextSaved[c.id] = true;
        const sample = SAMPLE_COMPLETE_SCORES[idx] || {
          tulis: 85,
          btq: 85,
          wawancara: 85,
        };
        return {
          ...c,
          scores: { ...sample },
          manualInputs: {
            tulis: String(sample.tulis),
            btq: String(sample.btq),
            wawancara: String(sample.wawancara),
            catatanPanitia: '',
          },
        };
      });
      scheduleSupabaseSync(next, true);
      return next;
    });
    setSavedCandidateMap(nextSaved);
    setIsEditingWhenComplete(false);
    showToast(
      'Seluruh nilai 3 calon terisi & tersimpan lengkap! Halaman Hasil & Perayaan terbuka.'
    );
  };

  const handleExportCSV = () => {
    const headers = [
      'Peringkat',
      'No Urut',
      'Nama Lengkap',
      'Tes Tulis',
      'Baca Tulis Al-Quran',
      'Wawancara',
      'Total Nilai Akhir',
      'Keterangan',
    ];
    const rows = sortedByRank.map((c) => [
      c.peringkat,
      c.nomorUrut,
      `"${c.nama}"`,
      c.scores.tulis ?? '',
      c.scores.btq ?? '',
      c.scores.wawancara ?? '',
      c.totalAkumulasi,
      c.peringkat === 1 ? 'PERINGKAT 1 TERBAIK' : `PERINGKAT ${c.peringkat}`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Rekap_Hasil_Seleksi_Kawil_Tanggul_Baujeng_${config.tahunAnggaran}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 overflow-x-hidden">
      {/* Toast Notification Banner */}
      {statusBanner && (
        <div className="bg-emerald-700 text-white px-4 py-2.5 text-center text-xs sm:text-sm font-bold shadow-xs no-print">
          {statusBanner}
        </div>
      )}

      {/* Main Content Container */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-3 sm:px-6 py-4 sm:py-7 space-y-5 sm:space-y-7">
        {/* =====================================================================
            INSTITUTIONAL HEADER (NON-FLOATING, MOBILE & LAPTOP RESPONSIVE)
            - Clicking the Kabupaten Pasuruan Logo 3 times opens the Admin Login!
           ===================================================================== */}
        <header className="rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/95 via-white to-amber-50/85 p-4 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-5">
            {/* Left / Top Zone: Logo + Identity Text */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start lg:items-center text-center sm:text-left gap-3.5 sm:gap-4">
              {/* Kabupaten Pasuruan Emblem — 3 Clicks Trigger Admin Login */}
              <div
                onClick={handleLogoClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleLogoClick();
                  }
                }}
                title="Lambang Kabupaten Pasuruan"
                className="flex items-center justify-center rounded-2xl bg-white p-2.5 sm:p-3 border-2 border-amber-400/80 shadow-2xs w-fit cursor-pointer select-none transition-transform active:scale-95 shrink-0"
              >
                <PemdaLogo size="lg" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-0.5 text-[11px] sm:text-xs font-extrabold tracking-wider text-emerald-800">
                  <span>PEMERINTAH {config.kabupaten.toUpperCase()}</span>
                  <span aria-hidden="true">·</span>
                  <span>{config.kecamatan.toUpperCase()}</span>
                  <span aria-hidden="true">·</span>
                  <span>{config.desa.toUpperCase()}</span>
                </div>
                <h1 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
                  Seleksi Perangkat {config.desa}
                </h1>
                <p className="mt-0.5 text-xs sm:text-base font-bold text-amber-700">
                  Formasi: {config.formasi} · Tahun {config.tahunAnggaran}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-x-2.5 gap-y-1 text-[11px] sm:text-xs font-semibold text-slate-600">
                  <span>Materi Uji:</span>
                  <strong className="text-emerald-800">1. Tes Tulis</strong>
                  <span aria-hidden="true">·</span>
                  <strong className="text-emerald-800">2. Baca Tulis Al-Qur'an</strong>
                  <span aria-hidden="true">·</span>
                  <strong className="text-emerald-800">3. Wawancara</strong>
                </div>
              </div>
            </div>

            {/* Right / Bottom Zone: Desktop/Tablet Navigation Switcher & Admin Status */}
            <div className="flex flex-col items-stretch sm:items-center lg:items-end gap-3 w-full lg:w-auto shrink-0 no-print">
              {/* Desktop & Tablet Navigation Tabs (Hidden on Mobile, since Mobile uses Floating Bottom Nav) */}
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-slate-100/90 p-1.5 border border-slate-200/90 w-auto">
                <button
                  type="button"
                  onClick={() => setMainView('landing')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-extrabold transition-colors cursor-pointer ${
                    mainView === 'landing'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Beranda Publik</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMainView('dashboard')}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-extrabold transition-colors cursor-pointer ${
                    mainView === 'dashboard'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {isAllComplete ? 'Hasil Seleksi' : 'Dashboard Calon'}
                  </span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 text-xs font-extrabold text-amber-950 hover:bg-amber-200 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>Keluar Admin</span>
                  </button>
                )}
              </div>

              {/* Status Kelengkapan Nilai Calon — Shown ONLY in Admin */}
              {isAdmin && (
                <div className="flex flex-col items-stretch sm:items-center lg:items-end gap-2 w-full sm:w-auto">
                  <div className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 shadow-2xs text-center sm:text-left">
                    <div className="text-[11px] font-bold text-slate-500 uppercase">
                      Status Kelengkapan Nilai Calon
                    </div>
                    <div className="mt-0.5 flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-sm font-extrabold font-mono-tabular text-emerald-700">
                        {totalFilledCount} / 9 Nilai Terisi · {savedCompleteCandidatesCount} / 3 Peserta Disimpan
                      </span>
                      {isAllComplete && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-slate-500">
                      {isAllComplete
                        ? 'Seluruh nilai hingga peserta terakhir telah disimpan — Perayaan Terbuka'
                        : 'Input & klik Simpan Nilai pada setiap peserta hingga peserta terakhir untuk membuka Perayaan'}
                    </div>
                  </div>

                  {isAllComplete && isEditingWhenComplete && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingWhenComplete(false);
                        setMainView('dashboard');
                      }}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs hover:bg-amber-300 transition-colors cursor-pointer"
                    >
                      <Trophy className="w-4 h-4 shrink-0" />
                      <span>Buka Halaman Hasil & Perayaan</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =====================================================================
            VIEW A: PUBLIC LANDING PAGE (SEDERHANA: INTEGRITAS, TRANSPARANSI, PROFESIONAL)
           ===================================================================== */}
        {mainView === 'landing' ? (
          <main className="space-y-5 sm:space-y-7">
            {/* Hero Section: Balai Desa Photograph on Top, Followed by SI-PRABU & 3 Core Words */}
            <section className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
              {/* Top Zone: Precision-Framed Balai Desa Baujeng Main Photograph */}
              <div className="p-3 sm:p-6 lg:p-8 bg-gradient-to-br from-emerald-50/50 via-slate-50 to-amber-50/40 border-b border-slate-200/80">
                <div className="mx-auto w-full max-w-4xl rounded-2xl overflow-hidden border-2 border-white ring-1 ring-slate-200/90 shadow-md bg-slate-900">
                  <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full overflow-hidden bg-slate-100">
                    <img
                      src={HERO_BALAI_DESA_IMG}
                      alt="Balai Desa Baujeng Kecamatan Beji Kabupaten Pasuruan"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = '/assets/balai_desa_baujeng.jpg';
                      }}
                      className="w-full h-full object-cover object-[50%_36%] transition-transform duration-500 hover:scale-[1.02]"
                    />
                  </div>
                  <div className="bg-white px-4 py-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                    <span className="font-extrabold text-emerald-900 truncate">
                      Balai Desa Baujeng
                    </span>
                    <span className="font-semibold text-slate-500 shrink-0">
                      Kec. Beji · Kab. Pasuruan
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Zone: SI-PRABU Identity & 3 Core Words (Integritas, Transparansi, Profesional) */}
              <div className="p-5 sm:p-8 lg:p-10 bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/30">
                <div className="mx-auto max-w-4xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-center sm:text-left">
                  <div className="space-y-4">
                    <div>
                      <div className="inline-flex items-center justify-center sm:justify-start gap-2 text-[11px] sm:text-xs font-extrabold tracking-widest text-emerald-800 uppercase">
                        <Scale className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>SELEKSI PERANGKAT DESA BAUJENG</span>
                      </div>
                      <div className="mt-1.5 text-4xl sm:text-6xl font-extrabold tracking-tight text-emerald-900">
                        SI-PRABU
                      </div>
                      <p className="mt-1.5 text-base sm:text-xl font-extrabold tracking-tight text-slate-900">
                        Sistem Informasi Penjaringan Perangkat Desa Baujeng
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                        Integritas.
                      </h2>
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-emerald-700 leading-tight">
                        Transparansi.
                      </h2>
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-amber-600 leading-tight">
                        Profesional.
                      </h2>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setMainView('dashboard')}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-emerald-700 px-5 sm:px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-emerald-800 transition-colors cursor-pointer"
                    >
                      <span>
                        {isAllComplete
                          ? 'Lihat Hasil Akhir & Perayaan'
                          : 'Buka Dashboard Calon Perangkat Desa'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-amber-300 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Preview of Registered Candidates Ordered by Nomor Urut */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-7 shadow-2xs space-y-4 sm:space-y-5">
              <div className="border-b border-slate-200 pb-3.5 sm:pb-4">
                <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-700 uppercase">
                  <Users className="w-4 h-4 shrink-0" />
                  <span>PESERTA TERDAFTAR</span>
                </div>
                <h3 className="mt-0.5 text-base sm:text-xl font-extrabold text-slate-900">
                  Calon Perangkat Desa Formasi Kawil Dusun Tanggul
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {sortedByNomorUrut.map((cand) => (
                  <div
                    key={cand.id}
                    onClick={() => setMainView('dashboard')}
                    className="group rounded-2xl border border-slate-200 bg-slate-50/60 p-4 flex items-center gap-4 hover:border-emerald-500 hover:bg-white transition-all cursor-pointer"
                  >
                    <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden border border-slate-300 bg-slate-100 shrink-0 shadow-2xs">
                      <img
                        src={cand.fotoUrl}
                        alt={cand.nama}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="inline-flex items-center rounded-lg bg-amber-400/90 px-2.5 py-0.5 text-[11px] font-mono-tabular font-extrabold text-slate-950">
                        NOMOR URUT {cand.nomorUrut}
                      </div>
                      <h4 className="mt-1.5 text-sm sm:text-base font-extrabold text-slate-900 leading-snug group-hover:text-emerald-800">
                        {cand.nama}
                      </h4>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                        {cand.alamat}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        ) : (
          /* =====================================================================
             VIEW B: DASHBOARD CALON PERANGKAT DESA & AUTOMATIC RESULT PAGE
             ===================================================================== */
          <main className="space-y-6 sm:space-y-8">
            {showResultPage ? (
              <div className="space-y-6 sm:space-y-8">
                {/* Golden Celebration with Winner Photo, Relevant Congratulatory Message, and Gold Confetti */}
                <GoldenCelebration
                  rankedCandidates={computedCandidates}
                  config={config}
                  onPrint={() => window.print()}
                  onBackToEdit={
                    isAdmin ? () => setIsEditingWhenComplete(true) : undefined
                  }
                />

                {/* Clean Unified Score Recapitulation (Mobile Cards + Desktop Table) */}
                <section className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs font-extrabold text-emerald-700 uppercase">
                        <Award className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>REKAPITULASI NILAI TERPADU SELEKSI PERANGKAT DESA</span>
                      </div>
                      <h3 className="mt-0.5 text-base sm:text-xl font-extrabold text-slate-900">
                        Hasil Akhir Penilaian 3 Calon — {config.formasi}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 no-print w-full sm:w-auto">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsEditingWhenComplete(true)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 sm:py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Edit Nilai & Nomor Urut</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 sm:py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span>Unduh CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 sm:py-2 text-xs font-extrabold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                        <span>Cetak Rekapitulasi</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile View (< md): Full-Width Responsive Recap Cards (Zero Horizontal Scroll Needed) */}
                  <div className="md:hidden divide-y divide-slate-200">
                    {sortedByRank.map((cand) => {
                      const isWinner = cand.peringkat === 1;
                      return (
                        <div
                          key={cand.id}
                          className={`p-4 space-y-3 ${
                            isWinner ? 'bg-amber-50/50' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-mono-tabular shrink-0 ${
                                  cand.peringkat === 1
                                    ? 'bg-amber-400 text-slate-950 font-extrabold shadow-2xs'
                                    : cand.peringkat === 2
                                    ? 'bg-emerald-100 text-emerald-900 font-bold'
                                    : 'bg-slate-200 text-slate-800 font-bold'
                                }`}
                              >
                                #{cand.peringkat}
                              </span>
                              <img
                                src={cand.fotoUrl}
                                alt={cand.nama}
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-xl object-cover object-top border border-slate-300 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-[11px] font-mono-tabular font-bold text-emerald-700">
                                  No. Urut {cand.nomorUrut}
                                </div>
                                <div className="text-sm font-extrabold text-slate-900 truncate">
                                  {cand.nama}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-[10px] font-bold text-slate-500 uppercase">
                                Total Nilai
                              </div>
                              <div className="text-lg font-extrabold font-mono-tabular text-emerald-700">
                                {cand.totalAkumulasi.toFixed(1)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-center text-xs">
                            <div>
                              <div className="text-[10px] text-slate-500 font-semibold">
                                Tes Tulis
                              </div>
                              <div className="font-mono-tabular font-bold text-slate-900">
                                {cand.scores.tulis?.toFixed(1) ?? '—'}
                              </div>
                            </div>
                            <div className="border-x border-slate-200">
                              <div className="text-[10px] text-slate-500 font-semibold">
                                BTQ Al-Qur'an
                              </div>
                              <div className="font-mono-tabular font-bold text-slate-900">
                                {cand.scores.btq?.toFixed(1) ?? '—'}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10px] text-slate-500 font-semibold">
                                Wawancara
                              </div>
                              <div className="font-mono-tabular font-bold text-slate-900">
                                {cand.scores.wawancara?.toFixed(1) ?? '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop & Print View (md+): Full Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-extrabold uppercase tracking-wider text-slate-600">
                          <th className="py-3.5 px-4">Peringkat</th>
                          <th className="py-3.5 px-4">Calon Perangkat Desa</th>
                          <th className="py-3.5 px-4 text-right">Tes Tulis</th>
                          <th className="py-3.5 px-4 text-right">
                            Baca Tulis Al-Qur'an
                          </th>
                          <th className="py-3.5 px-4 text-right">Wawancara</th>
                          <th className="py-3.5 px-4 text-right">Total Nilai Akhir</th>
                          <th className="py-3.5 px-4">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                        {sortedByRank.map((cand) => {
                          const isWinner = cand.peringkat === 1;
                          return (
                            <tr
                              key={cand.id}
                              className={
                                isWinner
                                  ? 'bg-amber-50/50 hover:bg-amber-50/80'
                                  : 'hover:bg-slate-50/80'
                              }
                            >
                              <td className="py-4 px-4 font-mono-tabular font-extrabold">
                                <span
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-sm ${
                                    cand.peringkat === 1
                                      ? 'bg-amber-400 text-slate-950 font-extrabold shadow-2xs'
                                      : cand.peringkat === 2
                                      ? 'bg-emerald-100 text-emerald-900 font-bold'
                                      : 'bg-slate-200 text-slate-800 font-bold'
                                  }`}
                                >
                                  #{cand.peringkat}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={cand.fotoUrl}
                                    alt={cand.nama}
                                    referrerPolicy="no-referrer"
                                    className="w-12 h-12 rounded-xl object-cover object-top border border-slate-300 shrink-0"
                                  />
                                  <div>
                                    <div className="text-xs font-mono-tabular font-bold text-emerald-700">
                                      No. Urut {cand.nomorUrut}
                                    </div>
                                    <div className="font-extrabold text-slate-900">
                                      {cand.nama}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                      {cand.alamat}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right font-mono-tabular font-bold text-slate-800">
                                {cand.scores.tulis !== null
                                  ? cand.scores.tulis.toFixed(1)
                                  : '—'}
                              </td>
                              <td className="py-4 px-4 text-right font-mono-tabular font-bold text-slate-800">
                                {cand.scores.btq !== null
                                  ? cand.scores.btq.toFixed(1)
                                  : '—'}
                              </td>
                              <td className="py-4 px-4 text-right font-mono-tabular font-bold text-slate-800">
                                {cand.scores.wawancara !== null
                                  ? cand.scores.wawancara.toFixed(1)
                                  : '—'}
                              </td>
                              <td className="py-4 px-4 text-right font-mono-tabular text-base font-extrabold text-emerald-700">
                                {cand.totalAkumulasi.toFixed(1)}
                              </td>
                              <td className="py-4 px-4">
                                {isWinner ? (
                                  <span className="inline-flex items-center gap-1.5 font-extrabold text-xs text-emerald-800">
                                    <UserCheck className="w-4 h-4 text-emerald-600" />
                                    PERINGKAT 1 TERBAIK
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-slate-600">
                                    Peringkat #{cand.peringkat}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Official Signature Footer */}
                  <div className="border-t border-slate-200 bg-slate-50/60 p-5 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs text-slate-700">
                      <div>
                        <div className="font-semibold">Mengetahui,</div>
                        <div className="font-bold text-slate-900">
                          Kepala {config.desa}
                        </div>
                        <div className="h-10 sm:h-14" />
                        <div className="font-extrabold text-slate-900 underline">
                          {config.kepalaDesa}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold">
                          Panitia Seleksi Perangkat Desa,
                        </div>
                        <div className="font-bold text-slate-900">
                          Sekretaris Panitia
                        </div>
                        <div className="h-10 sm:h-14" />
                        <div className="font-extrabold text-slate-900 underline">
                          {config.sekretarisPanitia}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold">
                          {config.desa}, {config.tanggalSeleksi}
                        </div>
                        <div className="font-bold text-slate-900">
                          Ketua Panitia Seleksi
                        </div>
                        <div className="h-10 sm:h-14" />
                        <div className="font-extrabold text-slate-900 underline">
                          {config.ketuaPanitia}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              /* =====================================================================
                 DASHBOARD CALON PERANGKAT DESA (AUTOMATICALLY ORDERED BY NOMOR URUT)
                 ===================================================================== */
              <section className="space-y-5 sm:space-y-6">
                {/* Simple Toolbar Header */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <div>
                    <h2 className="text-base sm:text-xl font-extrabold text-slate-900">
                      {isAdmin
                        ? 'Panel Admin — Pengaturan Nomor Urut & Input Nilai Manual 3 Calon'
                        : 'Dashboard Calon Perangkat Desa — Formasi Kawil Dusun Tanggul'}
                    </h2>
                    {isAdmin && (
                      <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                        Tentukan Nomor Urut peserta, unggah foto, dan masukkan nilai manual (0–100). Urutan kartu di dashboard menyesuaikan Nomor Urut secara otomatis.
                      </p>
                    )}
                  </div>

                  {/* Simple Action Buttons for Admin Only */}
                  {isAdmin && (
                    <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleFillSampleScores}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-2xs hover:bg-amber-300 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>Simulasi Nilai Lengkap (9/9)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearScores}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                        <span>Reset Nilai</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3 Candidate Cards — Sorted by Nomor Urut on Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                  {sortedByNomorUrut.map((cand) => (
                    <div
                      key={cand.id}
                      className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs flex flex-col justify-between transition-all hover:border-emerald-300"
                    >
                      <div>
                        {/* Candidate Photo Frame — Unobstructed Formal Portrait Ratio */}
                        <div className="relative aspect-[4/4] sm:aspect-[4/4] w-full bg-slate-100 overflow-hidden border-b border-slate-200 group">
                          <img
                            src={cand.fotoUrl}
                            alt={cand.nama}
                            referrerPolicy="no-referrer"
                            onClick={() => setPreviewCandidatePhoto(cand)}
                            className="h-full w-full object-cover object-top cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                          />

                          {/* Nomor Urut Badge */}
                          <div className="absolute top-3 left-3 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-mono-tabular font-extrabold text-slate-950 shadow-sm border border-amber-300">
                            NO. URUT {cand.nomorUrut}
                          </div>

                          {/* Zoom Photo Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewCandidatePhoto(cand)}
                            title="Perbesar Foto Calon"
                            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900/75 hover:bg-slate-900 text-white px-2.5 py-1.5 text-[11px] font-bold backdrop-blur-xs shadow-xs transition-colors cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span>Perbesar Foto</span>
                          </button>

                          {/* Upload Photo Button (Visible when Admin is logged in) */}
                          {isAdmin && (
                            <label className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-xl bg-white/95 border border-slate-300 px-3 py-1.5 text-xs font-extrabold text-slate-900 shadow-sm hover:bg-amber-300 transition-colors cursor-pointer">
                              <Camera className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>Upload Foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePhotoUpload(cand.id, e)}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* Candidate Name & Address Block (Below Photo so Face & Portrait Are Never Covered) */}
                        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-200/80 bg-white">
                          {isAdmin ? (
                            <div className="space-y-1.5">
                              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                                Nama Lengkap Calon
                              </label>
                              <input
                                type="text"
                                value={cand.nama}
                                onChange={(e) =>
                                  handleCandidateFieldChange(
                                    cand.id,
                                    'nama',
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm sm:text-base font-extrabold text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none"
                                placeholder="Nama Calon Perangkat Desa"
                              />
                            </div>
                          ) : (
                            <h3 className="text-base sm:text-lg font-extrabold leading-snug text-slate-900">
                              {cand.nama}
                            </h3>
                          )}
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {cand.alamat}
                          </p>
                        </div>

                        {/* Admin Input for Nomor Urut + 3 Subject Scores */}
                        <div className="p-4 sm:p-5 space-y-2.5 sm:space-y-3">
                          {/* Nomor Urut Setting (Visible & Editable in Admin) */}
                          {isAdmin && (
                            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 border border-slate-300 px-3 py-2">
                              <label className="flex items-center gap-2 text-xs font-extrabold text-slate-800 min-w-0">
                                <Hash className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="truncate">Nomor Urut Peserta</span>
                              </label>
                              <input
                                type="text"
                                value={cand.nomorUrut}
                                onChange={(e) =>
                                  handleCandidateFieldChange(
                                    cand.id,
                                    'nomorUrut',
                                    e.target.value
                                  )
                                }
                                placeholder="01"
                                className="w-20 shrink-0 rounded-lg border border-slate-400 bg-white px-2.5 py-1 text-center text-sm font-mono-tabular font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
                              />
                            </div>
                          )}

                          {/* 1. Tes Tulis */}
                          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/90 px-3 py-2.5">
                            <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 min-w-0">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span className="truncate">1. Tes Tulis</span>
                            </label>
                            {isAdmin ? (
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={cand.scores.tulis ?? ''}
                                onChange={(e) =>
                                  handleDirectScoreChange(
                                    cand.id,
                                    'tulis',
                                    e.target.value
                                  )
                                }
                                placeholder="0 - 100"
                                className="w-20 sm:w-24 shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-right text-sm font-mono-tabular font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
                              />
                            ) : (
                              <span className="text-sm sm:text-base font-mono-tabular font-extrabold text-emerald-800 shrink-0">
                                {cand.scores.tulis !== null
                                  ? cand.scores.tulis.toFixed(1)
                                  : 'Belum Diisi'}
                              </span>
                            )}
                          </div>

                          {/* 2. Baca Tulis Al-Qur'an */}
                          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/90 px-3 py-2.5">
                            <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 min-w-0">
                              <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="truncate">2. Baca Tulis Al-Qur'an</span>
                            </label>
                            {isAdmin ? (
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={cand.scores.btq ?? ''}
                                onChange={(e) =>
                                  handleDirectScoreChange(
                                    cand.id,
                                    'btq',
                                    e.target.value
                                  )
                                }
                                placeholder="0 - 100"
                                className="w-20 sm:w-24 shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-right text-sm font-mono-tabular font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
                              />
                            ) : (
                              <span className="text-sm sm:text-base font-mono-tabular font-extrabold text-amber-700 shrink-0">
                                {cand.scores.btq !== null
                                  ? cand.scores.btq.toFixed(1)
                                  : 'Belum Diisi'}
                              </span>
                            )}
                          </div>

                          {/* 3. Wawancara */}
                          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/90 px-3 py-2.5">
                            <label className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 min-w-0">
                              <MessageSquare className="w-4 h-4 text-teal-700 shrink-0" />
                              <span className="truncate">3. Wawancara</span>
                            </label>
                            {isAdmin ? (
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={cand.scores.wawancara ?? ''}
                                onChange={(e) =>
                                  handleDirectScoreChange(
                                    cand.id,
                                    'wawancara',
                                    e.target.value
                                  )
                                }
                                placeholder="0 - 100"
                                className="w-20 sm:w-24 shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-right text-sm font-mono-tabular font-extrabold text-slate-900 focus:border-emerald-600 focus:outline-none"
                              />
                            ) : (
                              <span className="text-sm sm:text-base font-mono-tabular font-extrabold text-teal-800 shrink-0">
                                {cand.scores.wawancara !== null
                                  ? cand.scores.wawancara.toFixed(1)
                                  : 'Belum Diisi'}
                              </span>
                            )}
                          </div>
                          {/* Tombol Simpan Nilai Peserta (Khusus Admin) */}
                          {isAdmin && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => void handleSaveCandidate(cand.id)}
                                disabled={savingCandidateId === cand.id}
                                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-xs transition-all cursor-pointer ${
                                  cand.filledCount === 3 && savedCandidateMap[cand.id]
                                    ? 'bg-emerald-100 border border-emerald-300 text-emerald-900 hover:bg-emerald-200'
                                    : 'bg-emerald-700 text-white hover:bg-emerald-800'
                                }`}
                              >
                                {cand.filledCount === 3 && savedCandidateMap[cand.id] ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                                    <span>
                                      {savingCandidateId === cand.id
                                        ? 'Menyimpan...'
                                        : 'Nilai Peserta Tersimpan (3/3)'}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Save className="w-4 h-4 shrink-0" />
                                    <span>
                                      {savingCandidateId === cand.id
                                        ? 'Menyimpan Nilai...'
                                        : 'Simpan Nilai Peserta'}
                                    </span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Automatic Total Score */}
                      <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-extrabold text-slate-500 uppercase">
                            Total Nilai
                          </span>
                          <div className="text-lg sm:text-xl font-extrabold font-mono-tabular text-emerald-800">
                            {cand.totalAkumulasi.toFixed(1)}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-1.5">
                          {cand.filledCount === 3 && savedCandidateMap[cand.id] ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-xs font-mono-tabular font-extrabold text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>Tersimpan</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-mono-tabular font-bold text-slate-700">
                              {cand.filledCount}/3 Terisi
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
        )}
      </div>

      {/* Modern Professional Footer (with extra bottom spacing on mobile for floating bottom nav) */}
      <footer className="mt-auto border-t border-slate-200 bg-white pt-4 pb-24 sm:pb-4 px-4 sm:px-6 text-xs font-semibold text-slate-500 no-print">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div>
            Panitia Seleksi Perangkat {config.desa} · {config.kecamatan} · Pemerintah{' '}
            {config.kabupaten}
          </div>
          <div className="text-emerald-800 font-bold">Formasi: {config.formasi}</div>
        </div>
      </footer>

      {/* Floating Mobile Bottom Navigation Bar (Only visible on HP / mobile screens) */}
      <nav
        aria-label="Navigasi Utama Mobile"
        className="fixed bottom-3 left-3 right-3 z-40 sm:hidden no-print"
      >
        <div className="mx-auto max-w-md rounded-2xl border border-emerald-200/90 bg-white/95 backdrop-blur-md p-1.5 shadow-xl ring-1 ring-slate-900/10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMainView('landing')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
              mainView === 'landing'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span className="truncate">Beranda Publik</span>
          </button>

          <button
            type="button"
            onClick={() => setMainView('dashboard')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
              mainView === 'dashboard'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {isAllComplete ? 'Hasil Seleksi' : 'Dashboard Calon'}
            </span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar Admin"
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-100 border border-amber-300 px-3 py-2.5 text-xs font-extrabold text-amber-950 hover:bg-amber-200 transition-colors cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </nav>

      {/* Admin Login Modal (Triggered by 3 clicks on Lambang Kabupaten Pasuruan) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-emerald-700 p-2 text-amber-300">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Otentikasi Admin Panitia
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seleksi Perangkat Desa Baujeng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer px-2 py-1"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  required
                />
              </div>

              {loginError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs font-semibold text-red-700">
                  {loginError}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-xs sm:text-sm font-extrabold text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Photo Lightbox Modal (Full Clear Portrait View) */}
      {previewCandidatePhoto && (
        <div
          onClick={() => setPreviewCandidatePhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="rounded-lg bg-amber-400 px-2.5 py-0.5 text-xs font-mono-tabular font-extrabold text-slate-950 shrink-0">
                  NO. URUT {previewCandidatePhoto.nomorUrut}
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 truncate">
                  {previewCandidatePhoto.nama}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCandidatePhoto(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup</span>
              </button>
            </div>
            <div className="bg-slate-100 aspect-square w-full overflow-hidden">
              <img
                src={previewCandidatePhoto.fotoUrl}
                alt={previewCandidatePhoto.nama}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="p-4 bg-white text-center">
              <div className="text-base font-extrabold text-slate-900">
                {previewCandidatePhoto.nama}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">
                {previewCandidatePhoto.alamat}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
