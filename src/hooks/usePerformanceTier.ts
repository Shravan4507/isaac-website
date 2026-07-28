import { useState, useEffect } from 'react'

export type PerformanceTier = 'high' | 'low'

export function usePerformanceTier(): PerformanceTier {
  const [tier, setTier] = useState<PerformanceTier>('high')

  useEffect(() => {
    // Detect mobile or tablet devices
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
    
    // Check hardware specifications (hardwareConcurrency returns CPU cores)
    const cores = navigator.hardwareConcurrency || 4
    
    // Low-end conditions: mobile browser OR <= 4 CPU cores
    if (isMobile || cores <= 4) {
      setTier('low')
    } else {
      setTier('high')
    }
  }, [])

  return tier
}
