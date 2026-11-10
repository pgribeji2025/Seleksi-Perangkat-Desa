import React, { useEffect, useRef, useState } from 'react';
import { Award, Crown, Edit3, Printer, Sparkles, Trophy, Volume2 } from 'lucide-react';
import { ComputedCandidate, SelectionConfig } from '../types';
import { PemdaLogo } from './PemdaLogo';

interface GoldenCelebrationProps {
  rankedCandidates: ComputedCandidate[];
  config: SelectionConfig;
  onPrint?: () => void;
  onBackToEdit?: () => void;
}

interface GoldParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  tiltAngleIncremental: number;
  tiltAngle: number;
  shape: 'flake' | 'ribbon' | 'diamond';
}

const GOLD_PALETTE = [
  '#F59E0B', // Royal Amber Gold
  '#FBBF24', // Pure Bright Gold
  '#FDE047', // Shimmering Yellow Gold
  '#D97706', // Rich Gold
  '#10B981', // Fresh Pasuruan Emerald
  '#34D399', // Bright Mint Green
];

export const GoldenCelebration: React.FC<GoldenCelebrationProps> = ({
  rankedCandidates,
  config,
  onPrint,
  onBackToEdit,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [burstKey, setBurstKey] = useState(0);

  const sorted = [...rankedCandidates].sort((a, b) => a.peringkat - b.peringkat);
  const winner = sorted[0];
  const others = sorted.slice(1);

  const playVictoryFanfare = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + idx * 0.12 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.48);
      });
    } catch {
      // Ignore audio block before user gesture
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const updateSize = () => {
      if (!canvas.parentElement) return;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    const particleCount = window.innerWidth < 640 ? 75 : 140;
    const particles: GoldParticle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      vx: (Math.random() - 0.5) * 2.2,
      vy: Math.random() * 2.3 + 1.3,
      size: Math.random() * 8 + 5,
      color: GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 6,
      tiltAngleIncremental: Math.random() * 0.07 + 0.03,
      tiltAngle: 0,
      shape:
        Math.random() > 0.6
          ? 'diamond'
          : Math.random() > 0.3
          ? 'flake'
          : 'ribbon',
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.tiltAngle) * 0.9;
        p.rotation += p.rotationSpeed;

        if (p.y > canvas.height + 24) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.x < -20) p.x = canvas.width + 20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.7, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.7, 0);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'ribbon') {
          ctx.fillRect(-p.size * 0.8, -p.size * 0.28, p.size * 1.6, p.size * 0.56);
        } else {
          ctx.beginPath();
          ctx.ellipse(
            0,
            0,
            p.size * 0.75,
            Math.max(2, Math.abs(p.size * 0.5 * Math.cos(p.tiltAngle))),
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateSize);
    };
  }, [burstKey]);

  if (!winner) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-emerald-50 text-slate-900 shadow-lg">
      {/* Continuous Shimmering Golden Confetti Canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />

      <div className="relative z-20 p-4 sm:p-7 lg:p-9">
        {/* Top Action & Congratulatory Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 text-center sm:text-left">
            <div className="mx-auto sm:mx-0">
              <PemdaLogo size="md" />
            </div>
            <div>
              <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs font-extrabold tracking-wider text-emerald-700 uppercase">
                <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>PENGUMUMAN HASIL AKHIR SELEKSI PERANGKAT DESA BAUJENG</span>
              </div>
              <h2 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
                Selamat & Sukses Atas Terpilihnya Kawil Dusun Tanggul
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-2xl">
                Semoga senantiasa amanah, jujur, dan berdedikasi tinggi dalam melayani masyarakat{' '}
                <strong className="text-emerald-800">Dusun Tanggul, Desa Baujeng</strong>, Kecamatan Beji, Kabupaten Pasuruan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 no-print shrink-0 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => {
                setBurstKey((prev) => prev + 1);
                playVictoryFanfare();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-xs hover:bg-amber-300 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Taburkan Emas & Fanfare</span>
            </button>
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-xs hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Cetak Hasil</span>
              </button>
            )}
            {onBackToEdit && (
              <button
                type="button"
                onClick={onBackToEdit}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4 shrink-0" />
                <span>Ubah Nilai / Kembali</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Winner Podium Spotlight */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
          {/* Peringkat 1 Card */}
          <div className="lg:col-span-7 rounded-2xl border-2 border-amber-400 bg-white p-4 sm:p-6 shadow-md flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
            <div className="relative shrink-0 mt-2 sm:mt-0">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-4 border-amber-400 shadow-md bg-emerald-50">
                <img
                  src={winner.fotoUrl}
                  alt={winner.nama}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-1 text-[11px] font-extrabold text-slate-950 shadow-sm whitespace-nowrap">
                <Crown className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                <span>PERINGKAT 1 TERBAIK</span>
              </div>
              <div className="mt-2.5 text-center">
                <span className="text-xs font-mono-tabular font-extrabold text-emerald-700">
                  NOMOR URUT {winner.nomorUrut}
                </span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left w-full min-w-0">
              <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 text-[11px] sm:text-xs font-extrabold tracking-wide text-amber-600 uppercase">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span>PERAIH NILAI TERTINGGI KAWIL DUSUN TANGGUL</span>
              </div>
              <h3 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
                {winner.nama}
              </h3>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600">
                {winner.alamat}
              </p>

              {/* Ucapan Selamat Khusus */}
              <div className="mt-3 rounded-xl bg-amber-50/90 border border-amber-200 px-3 py-2.5 text-xs font-semibold text-amber-950 leading-relaxed">
                "Selamat mengemban amanah baru sebagai Kepala Kewilayahan (Kawil) Dusun Tanggul. Semoga membawa keberkahan dan kemajuan bagi Pemerintah Desa Baujeng."
              </div>

              {/* 3 Subject Scores */}
              <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 p-2.5 sm:p-3 text-center">
                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-600 truncate">
                    Tes Tulis
                  </div>
                  <div className="text-base sm:text-lg font-extrabold font-mono-tabular text-emerald-800">
                    {winner.scores.tulis?.toFixed(1)}
                  </div>
                </div>
                <div className="border-x border-emerald-200 px-1">
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-600 truncate">
                    BTQ Al-Qur'an
                  </div>
                  <div className="text-base sm:text-lg font-extrabold font-mono-tabular text-emerald-800">
                    {winner.scores.btq?.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] font-bold text-slate-600 truncate">
                    Wawancara
                  </div>
                  <div className="text-base sm:text-lg font-extrabold font-mono-tabular text-emerald-800">
                    {winner.scores.wawancara?.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Total Score */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-500 uppercase">
                    TOTAL NILAI AKHIR TERPADU
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono-tabular text-emerald-700">
                    {winner.totalAkumulasi.toFixed(1)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={playVictoryFanfare}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-100 px-3.5 py-2 text-xs font-extrabold text-emerald-800 hover:bg-emerald-200 transition-colors cursor-pointer no-print"
                >
                  <Volume2 className="w-4 h-4 shrink-0" />
                  <span>Bunyikan Nada Selamat</span>
                </button>
              </div>
            </div>
          </div>

          {/* Peringkat 2 & 3 Cards */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            {others.map((cand) => (
              <div
                key={cand.id}
                className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={cand.fotoUrl}
                      alt={cand.nama}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover object-top border-2 border-emerald-500"
                    />
                    <span className="absolute -top-2 -left-2 rounded-lg bg-amber-400 px-2 py-0.5 text-xs font-mono-tabular font-extrabold text-slate-950 shadow-xs">
                      #{cand.peringkat}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-mono-tabular font-bold text-emerald-700">
                      No. Urut {cand.nomorUrut}
                    </div>
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                      {cand.nama}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-mono-tabular font-semibold text-slate-600">
                      <span>Tulis: {cand.scores.tulis?.toFixed(1)}</span>
                      <span>·</span>
                      <span>BTQ: {cand.scores.btq?.toFixed(1)}</span>
                      <span>·</span>
                      <span>Wawancara: {cand.scores.wawancara?.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 sm:border-l border-slate-200 pt-2.5 sm:pt-0 sm:pl-3 shrink-0">
                  <div className="text-[11px] font-bold text-slate-500">Total Nilai</div>
                  <div className="text-lg sm:text-2xl font-extrabold font-mono-tabular text-emerald-700">
                    {cand.totalAkumulasi.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
