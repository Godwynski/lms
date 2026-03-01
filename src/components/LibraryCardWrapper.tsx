'use client'

/**
 * Thin client-side wrapper around LibraryCard.
 * Using dynamic() with ssr:false here (inside a Client Component) is valid.
 * The QRCodeSVG from qrcode.react uses browser APIs, so SSR must be disabled.
 */
import dynamic from 'next/dynamic'

const LibraryCard = dynamic(() => import('./LibraryCard'), { ssr: false })

export default LibraryCard
