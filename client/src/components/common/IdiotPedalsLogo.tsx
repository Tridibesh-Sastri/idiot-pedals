import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'pedal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const IdiotPedalsLogo: React.FC<LogoProps> = ({
  className = '',
  variant = 'light',
  size = 'md',
}) => {
  // Color selection
  const idiotColor = variant === 'dark' ? '#F3EFE6' : '#0B0B0A';
  const pedalsColor = '#D91E18';

  const sizeClasses = {
    sm: 'h-7',
    md: 'h-10',
    lg: 'h-14',
    xl: 'h-20',
  };

  return (
    <div className={`inline-flex flex-col items-start select-none relative ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 460 170"
        className="h-full w-auto overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="IDIOT Pedals"
      >
        {/* IDIOT - Heavy Slab Serif */}
        <text
          x="10"
          y="105"
          fill={idiotColor}
          fontFamily="'Cinzel', 'Rockwell', 'Georgia', serif"
          fontWeight="900"
          fontSize="115"
          letterSpacing="4"
          className="transition-colors duration-200"
        >
          IDIOT
        </text>

        {/* Decorative shadow accent for pedal plate view */}
        {variant === 'pedal' && (
          <text
            x="8"
            y="107"
            fill="rgba(0,0,0,0.15)"
            fontFamily="'Cinzel', 'Rockwell', 'Georgia', serif"
            fontWeight="900"
            fontSize="115"
            letterSpacing="4"
          >
            IDIOT
          </text>
        )}

        {/* Pedals - Dynamic Signature Script in Pedal Red with Underline Flourish */}
        <g transform="rotate(-4 190 120)">
          <text
            x="130"
            y="152"
            fill={pedalsColor}
            fontFamily="'Caveat', cursive"
            fontWeight="700"
            fontSize="92"
            fontStyle="italic"
            letterSpacing="1"
          >
            Pedals
          </text>

          {/* Elegant script underline swash connecting to 's' */}
          <path
            d="M 125 158 Q 230 172 360 148 Q 280 162 135 160"
            fill={pedalsColor}
          />
        </g>
      </svg>
    </div>
  );
};
