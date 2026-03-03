'use client'

import { useEffect, useState, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, AlertCircle } from 'lucide-react'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onCancel: () => void
}

type ScannerState = 'idle' | 'requesting' | 'scanning' | 'error' | 'permission_denied'

export default function QRScanner({ onScanSuccess, onCancel }: QRScannerProps) {
  const [scannerState, setScannerState] = useState<ScannerState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Keep a reference to the active scanner instance so we can stop it on unmount
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current.clear()
        html5QrCodeRef.current = null
      }
    } catch (e) {
      console.error("Failed to stop scanner", e)
    }
  }

  const startScanning = async () => {
    setScannerState('requesting')
    setErrorMsg(null)

    try {
      // 1. Check if the browser supports media devices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setScannerState('error')
        setErrorMsg('Your browser does not support camera access or it is blocked by security settings. (HTTPS is required on mobile)')
        return;
      }

      // 2. Request permissions explicitly (Html5Qrcode.getCameras() does this internally, but we can catch the error)
      const cameras = await Html5Qrcode.getCameras()
      
      if (!cameras || cameras.length === 0) {
        setScannerState('error')
        setErrorMsg('No cameras found on this device.')
        return;
      }

      // 3. Initialize the scanner instance if needed
      if (!html5QrCodeRef.current) {
        // We initialize with the div ID "qr-reader-custom"
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-custom")
      }

      setScannerState('scanning')

      // 4. Start scanning using the environment-facing (rear) camera
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Success callback
          stopScanner().then(() => {
            onScanSuccess(decodedText)
          })
        },
        () => {
          // Failure callback (rapidly fires every frame it doesn't find a code, safely ignore)
          // console.debug(errorMessage) 
        }
      )

    } catch (err: unknown) {
      console.error("Camera Init Error:", err)
      // Determine if it was a permission error
      const errObj = err as Error
      if (errObj?.name === "NotAllowedError" || errObj?.message?.toLowerCase().includes("permission")) {
        setScannerState('permission_denied')
        setErrorMsg('Camera access was denied. Please enable permissions in your browser settings to scan books.')
      } else {
        setScannerState('error')
        setErrorMsg(errObj?.message || 'Failed to initialize the camera. Try refreshing the page.')
      }
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-4 animate-in fade-in zoom-in duration-300">
      
      {/* Container for the actual video feed */}
      <div 
        className={`w-full relative bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 transition-all ${
          scannerState === 'requesting' || scannerState === 'scanning' ? 'block' : 'hidden'
        }`}
      >
        {/* We use min-h-[300px] but the scanner will replace its contents anyway */}
        <div id="qr-reader-custom" className="w-full min-h-[300px] flex items-center justify-center">
           {scannerState === 'requesting' && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm z-10 text-white animate-pulse">
               <div className="w-12 h-12 border-4 border-indigo-400 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
               <p className="font-medium text-slate-200">Requesting camera access...</p>
               <p className="text-xs text-slate-400 mt-2">Please click &quot;Allow&quot; if prompted by your browser.</p>
             </div>
           )}
        </div>
      </div>

      {/* Pre-scan / Requesting UI */}
      {scannerState === 'idle' && (
        <div className="w-full py-12 px-6 flex flex-col items-center justify-center bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-500 mb-2">
            <Camera className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 text-lg">Scan Book Barcode</h4>
            <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
              We need access to your camera to scan the ISBN barcode or QR code on the book.
            </p>
          </div>
          <button
            onClick={startScanning}
            type="button"
            className="flex items-center justify-center py-3 px-6 mt-2 rounded-xl text-white font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all w-full sm:w-auto"
          >
            <Camera className="w-5 h-5 mr-2" />
            Enable Camera
          </button>
        </div>
      )}



      {/* Error / Permission Denied State */}
      {(scannerState === 'error' || scannerState === 'permission_denied') && (
        <div className="w-full py-8 px-6 flex flex-col items-center justify-center bg-red-50 rounded-2xl border border-red-100 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
          <div className="space-y-1">
            <h4 className="font-semibold text-red-800">Camera Error</h4>
            <p className="text-sm text-red-600/90 max-w-sm mx-auto">
              {errorMsg}
            </p>
          </div>
          {scannerState === 'error' && (
             <button
               onClick={startScanning}
               type="button"
               className="mt-2 py-2 px-6 rounded-xl font-semibold bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
             >
               Try Again
             </button>
          )}
        </div>
      )}

      <button
        onClick={() => {
          stopScanner().then(() => onCancel())
        }}
        type="button"
        className="mt-4 flex items-center justify-center py-2 px-4 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all w-full"
      >
        <X className="w-4 h-4 mr-2" />
        Cancel
      </button>
      
      {scannerState === 'scanning' && (
        <p className="text-xs text-slate-500 text-center mt-2 font-medium">
          Position the ISBN Barcode or QR code inside the frame.
        </p>
      )}
    </div>
  )
}
