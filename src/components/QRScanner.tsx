'use client'

import { useEffect, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { X } from 'lucide-react'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onCancel: () => void
}

export default function QRScanner({ onScanSuccess, onCancel }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    let html5QrcodeScanner: Html5QrcodeScanner | null = null

    try {
      html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      )
      
      html5QrcodeScanner.render(
        (decodedText) => {
          if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().catch(console.error)
          }
          onScanSuccess(decodedText)
        },
        (errorMessage) => {
          // Typically we ignore scan errors until it hits something
          console.debug(errorMessage)
        }
      )
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- safe: only called once during initialization failure, not in a render cycle
      setError('Failed to initialize scanner. Camera permissions might be required.')
    }

    return () => {
      if (html5QrcodeScanner) {
        // cleanup on unmount
        html5QrcodeScanner.clear().catch(console.error)
      }
    }
  }, [onScanSuccess])

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-4 animate-in fade-in zoom-in duration-300">
      <div className="w-full relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
        <div id="qr-reader" className="w-full"></div>
      </div>
      
      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <button
        onClick={onCancel}
        type="button"
        className="mt-4 flex items-center justify-center py-2 px-4 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all w-full"
      >
        <X className="w-4 h-4 mr-2" />
        Cancel Scanning
      </button>
      
      <p className="text-xs text-slate-500 text-center mt-2">
        Position your virtual or physical Library Card QR code in the frame.
      </p>
    </div>
  )
}
