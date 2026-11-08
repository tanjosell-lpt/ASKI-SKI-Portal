import React, { useState } from 'react';

interface AskiLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const AskiLogo: React.FC<AskiLogoProps> = ({ 
  className = '', 
  size = 'md',
  showText = false 
}) => {
  const [imgError, setImgError] = useState(false);

  const dimensionClasses = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size];

  // Official ASKI Skills and Knowledge Institute, Incorporated seal
  const logoSrc = '/assets/aistudio/ASKI-SKI_LOGO_9897f02a.png';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className={`relative ${dimensionClasses} shrink-0 rounded-full bg-white p-0.5 shadow-sm border border-slate-200/90 flex items-center justify-center overflow-hidden select-none`}
        title="ASKI Skills and Knowledge Institute, Incorporated"
      >
        {!imgError ? (
          <img
            src={logoSrc}
            alt="ASKI Skills and Knowledge Institute, Inc. Logo"
            className="w-full h-full object-contain rounded-full"
            onError={() => setImgError(true)}
          />
        ) : (
          /* High-Fidelity SVG Fallback matching official circular seal */
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="48" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="#2563eb" strokeWidth="1" />
            <text x="50" y="70" fontSize="18" fontWeight="900" textAnchor="middle" fill="#0b3b60" fontFamily="sans-serif">
              ASKI
            </text>
            <text x="50" y="90" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#2563eb" fontFamily="sans-serif">
              2010
            </text>
          </svg>
        )}
      </div>

      {showText && (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-base sm:text-lg tracking-tight text-[#0b3b60] uppercase">
              ASKI SKI Portal
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
