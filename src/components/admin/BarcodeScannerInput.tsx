'use client';

import { useEffect, useState, useRef } from 'react';

interface BarcodeScannerInputProps {
  onScan: (barcode: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * A specialized input component designed to listen to rapid 1D barcode scanner inputs.
 * Barcode scanners typically emulate a keyboard, rapidly typing characters and ending with an 'Enter' keypress.
 */
export default function BarcodeScannerInput({ 
  onScan, 
  placeholder = "Scan Barcode or QR...", 
  className = "",
  autoFocus = true 
}: BarcodeScannerInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus logic to ensure the scanner input is always ready
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const scannedValue = inputValue.trim();
      if (scannedValue) {
        onScan(scannedValue);
        setInputValue(''); // Clear for the next scan
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
          <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
          <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
          <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
          <line x1="7" y1="12" x2="17" y2="12"></line>
        </svg>
      </div>
    </div>
  );
}
