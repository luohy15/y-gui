import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-8 w-8" }: LogoProps) {
  const { isDarkMode } = useTheme();

  return (
    <div className={`${className} rounded-full flex items-center justify-center shadow-sm overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <div className="text-lg font-bold text-[#4285f4]">Y</div>
    </div>
  );
}
