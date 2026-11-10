import React, { useState } from 'react';

export const PASURUAN_LOGO_URL =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Lambang_Kabupaten_Pasuruan.png/500px-Lambang_Kabupaten_Pasuruan.png?utm_source=id.wikipedia.org&utm_campaign=index&utm_content=thumbnail';

interface PemdaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const PemdaLogo: React.FC<PemdaLogoProps> = ({ className = '', size = 'md' }) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: 'w-9 h-10',
    md: 'w-12 h-14',
    lg: 'w-16 h-20',
    xl: 'w-24 h-28',
  };

  if (!imgError) {
    return (
      <img
        src={PASURUAN_LOGO_URL}
        alt="Lambang Pemerintah Kabupaten Pasuruan"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeMap[size]} object-contain select-none shrink-0 drop-shadow-sm ${className}`}
      />
    );
  }

  // High-precision SVG fallback matching the Emerald Green & Gold Shield of Kabupaten Pasuruan
  return (
    <svg
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeMap[size]} select-none shrink-0 drop-shadow-sm ${className}`}
      role="img"
      aria-label="Lambang Kabupaten Pasuruan"
    >
      {/* Five-sided Shield Base */}
      <path
        d="M60 6L110 26V72C110 103 87 124 60 134C33 124 10 103 10 72V26L60 6Z"
        fill="#065F46"
        stroke="#F59E0B"
        strokeWidth="5"
      />
      <path
        d="M60 13L103 30V71C103 98 83 116 60 126C37 116 17 98 17 71V30L60 13Z"
        fill="#047857"
        stroke="#FDE68A"
        strokeWidth="1.5"
      />
      {/* Gold Star on Top */}
      <polygon
        points="60,22 63.5,30 72,30.8 65.5,36.5 67.5,45 60,40.2 52.5,45 54.5,36.5 48,30.8 56.5,30"
        fill="#FBBF24"
      />
      {/* Traditional Gate / Kubah & Keris Centerpiece */}
      <path
        d="M44 82V56C44 47 60 42 60 42C60 42 76 47 76 56V82H44Z"
        fill="#064E3B"
        stroke="#FBBF24"
        strokeWidth="2"
      />
      <path
        d="M60 48L57 58L62 65L58 72L61 79"
        stroke="#FDE047"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Sugarcane & Kapok Wreath */}
      <path
        d="M28 50C26 72 35 94 52 104"
        stroke="#FBBF24"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M92 50C94 72 85 94 68 104"
        stroke="#FDE68A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Blue Water Waves */}
      <path
        d="M35 92Q47 87 60 92T85 92"
        stroke="#38BDF8"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Bottom Scroll Ribbon */}
      <path
        d="M22 114H98L92 125H28L22 114Z"
        fill="#F59E0B"
        stroke="#78350F"
        strokeWidth="1.5"
      />
      <text
        x="60"
        y="122"
        textAnchor="middle"
        fill="#064E3B"
        fontSize="7.5"
        fontWeight="800"
        fontFamily="sans-serif"
      >
        PASURUAN
      </text>
    </svg>
  );
};
