import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface LogoProps {
  className?: string;
  letter?: string;
}

export default function Logo({ className = "h-8 w-8", letter = "Y" }: LogoProps) {
  const { isDarkMode } = useTheme();

  return (
    <div className={`${className} rounded-full flex items-center justify-center shadow-sm overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
      <div className="text-lg font-bold text-[#4285f4]">{letter}</div>
    </div>
  );
}

// Model-specific logo components
export function ClaudeLogo(props: Omit<LogoProps, 'letter'>) {
  return <Logo {...props} letter="C" />;
}

export function GeminiLogo(props: Omit<LogoProps, 'letter'>) {
  return <Logo {...props} letter="G" />;
}

export function DeepseekLogo(props: Omit<LogoProps, 'letter'>) {
  return <Logo {...props} letter="D" />;
}
