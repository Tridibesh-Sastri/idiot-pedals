import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'pedal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const IdiotPedalsLogo: React.FC<LogoProps> = ({
  className = '',
  variant = 'dark',
  size = 'md',
}) => {
  const idiotColor = variant === 'light' ? '#0B0E14' : '#F6F4EE';
  const pedalsColor = '#FF5E1E';

  const sizeClasses = {
    sm: 'h-6',
    md: 'h-9',
    lg: 'h-12',
    xl: 'h-16',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 select-none ${sizeClasses[size]} ${className}`}>
      <span className="font-editorial text-2xl font-bold tracking-tight text-[#F6F4EE] uppercase leading-none">
        IDIOT
      </span>
      <span className="font-script text-2xl font-bold italic text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FF4500] leading-none">
        Pedals
      </span>
    </div>
  );
};
