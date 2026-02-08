/**
 * Web Audio API utilities and compatibility checks
 */

/**
 * Check if Web Audio API is supported in the current browser
 */
export function isWebAudioAPISupported(): boolean {
  return typeof AudioContext !== 'undefined' || 
         typeof (window as any).webkitAudioContext !== 'undefined'
}

/**
 * Check if getUserMedia is supported in the current browser
 */
export function isGetUserMediaSupported(): boolean {
  return !!(
    navigator.mediaDevices?.getUserMedia ||
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia ||
    (navigator as any).msGetUserMedia
  )
}

/**
 * Create an AudioContext with cross-browser compatibility
 */
export function createAudioContext(): AudioContext | null {
  if (!isWebAudioAPISupported()) {
    return null
  }

  try {
    // Use standard AudioContext
    if (typeof AudioContext !== 'undefined') {
      return new AudioContext()
    }
    
    // Fallback to webkitAudioContext for older Safari
    if (typeof (window as any).webkitAudioContext !== 'undefined') {
      return new (window as any).webkitAudioContext() as AudioContext
    }
  } catch (error) {
    console.error('Failed to create AudioContext:', error)
    return null
  }

  return null
}

/**
 * Get user media with cross-browser compatibility
 */
export async function getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
  if (!isGetUserMediaSupported()) {
    throw new Error('getUserMedia is not supported in this browser')
  }

  // Modern API
  if (navigator.mediaDevices?.getUserMedia) {
    return navigator.mediaDevices.getUserMedia(constraints)
  }

  // Legacy API with promises
  const legacyGetUserMedia = 
    (navigator as any).getUserMedia ||
    (navigator as any).webkitGetUserMedia ||
    (navigator as any).mozGetUserMedia ||
    (navigator as any).msGetUserMedia

  if (legacyGetUserMedia) {
    return new Promise((resolve, reject) => {
      legacyGetUserMedia.call(navigator, constraints, resolve, reject)
    })
  }

  throw new Error('getUserMedia is not available')
}

/**
 * Get a user-friendly error message for getUserMedia errors
 */
export function getUserMediaErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Failed to access microphone'
  }

  const errorName = (error as any).name || error.constructor.name

  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Microphone access denied. Please allow microphone access in your browser settings.'
    
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'No microphone found. Please connect a microphone and try again.'
    
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Microphone is already in use by another application. Please close other applications using the microphone.'
    
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'Microphone does not support the required settings. Please try a different microphone.'
    
    case 'SecurityError':
      return 'Microphone access blocked for security reasons. Please use HTTPS or localhost.'
    
    case 'TypeError':
      return 'Invalid microphone settings. Please check your browser configuration.'
    
    default:
      return error.message || 'Failed to access microphone'
  }
}

/**
 * Check if Web Audio API features are fully supported
 */
export function checkWebAudioAPISupport(): {
  supported: boolean
  audioContext: boolean
  getUserMedia: boolean
  analyserNode: boolean
  mediaStreamSource: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  const audioContext = isWebAudioAPISupported()
  if (!audioContext) {
    errors.push('AudioContext is not supported')
  }

  const getUserMedia = isGetUserMediaSupported()
  if (!getUserMedia) {
    errors.push('getUserMedia is not supported')
  }

  let analyserNode = false
  let mediaStreamSource = false

  if (audioContext) {
    try {
      const ctx = createAudioContext()
      if (ctx) {
        analyserNode = typeof ctx.createAnalyser === 'function'
        mediaStreamSource = typeof ctx.createMediaStreamSource === 'function'
        
        if (!analyserNode) {
          errors.push('AnalyserNode is not supported')
        }
        if (!mediaStreamSource) {
          errors.push('MediaStreamAudioSourceNode is not supported')
        }
        
        ctx.close()
      }
    } catch (error) {
      errors.push(`Error checking AudioContext features: ${error}`)
    }
  }

  return {
    supported: errors.length === 0,
    audioContext,
    getUserMedia,
    analyserNode,
    mediaStreamSource,
    errors,
  }
}
