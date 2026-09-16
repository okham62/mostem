/** Browser-side video/image → compact GIF (detail-page friendly). */

export type GifConvertOptions = {
  maxWidth?: number
  fps?: number
  maxColors?: number
  /** How many seconds of video to convert (from startSec). Default 12 */
  maxDurationSec?: number
  /** Video start offset in seconds. Default 0 */
  startSec?: number
  /** Output playback speed (1 = realtime, 2 = 2x faster). Default 1 */
  speed?: number
  /** Image / slideshow frame hold (hundredths of a second). Default 80 = 0.8s */
  imageDelay?: number
  onProgress?: (ratio: number) => void
}

export type GifConvertResult = {
  blob: Blob
  width: number
  height: number
  frames: number
  bytes: number
}

export function isVideoFile(file: File) {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name)
}

export function isImageFile(file: File) {
  return (
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name)
  )
}

function toBlob(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy.buffer], { type: 'image/gif' })
}

function evenSize(n: number) {
  return Math.max(2, Math.round(n / 2) * 2)
}

function fitSize(srcW: number, srcH: number, maxWidth: number) {
  const scale = Math.min(1, maxWidth / Math.max(1, srcW))
  return {
    width: evenSize(srcW * scale),
    height: evenSize(srcH * scale),
  }
}

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = url

    const cleanup = () => URL.revokeObjectURL(url)

    video.onloadedmetadata = () => {
      void video
        .play()
        .then(() => {
          video.pause()
          resolve(video)
        })
        .catch(() => resolve(video))
    }
    video.onerror = () => {
      cleanup()
      reject(new Error('영상을 읽지 못했습니다.'))
    }
  })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 읽지 못했습니다.'))
    }
    img.src = url
  })
}

async function seek(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) < 0.001) return
  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      resolve()
    }
    const onError = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      reject(new Error('프레임 이동 실패'))
    }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    try {
      video.currentTime = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.001))
    } catch (error) {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      reject(error)
    }
  })
}

async function drawToGifFrame(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxColors: number
) {
  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas를 사용할 수 없습니다.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(source, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)
  const palette = quantize(data, maxColors)
  const index = applyPalette(data, palette)
  return { GIFEncoder, index, palette }
}

export async function convertVideoToGif(
  file: File,
  options: GifConvertOptions = {}
): Promise<GifConvertResult> {
  const maxWidth = options.maxWidth ?? 480
  const fps = options.fps ?? 10
  const maxColors = options.maxColors ?? 128
  const maxDurationSec = options.maxDurationSec ?? 12
  const startSec = Math.max(0, options.startSec ?? 0)
  const speed = Math.min(4, Math.max(0.25, options.speed ?? 1))
  const onProgress = options.onProgress

  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')

  const video = await loadVideo(file)
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    throw new Error('영상 길이를 확인할 수 없습니다.')
  }
  const clippedStart = Math.min(startSec, Math.max(0, video.duration - 0.05))
  const available = Math.max(0.05, video.duration - clippedStart)
  const duration = Math.min(available, maxDurationSec)
  if (!duration || duration <= 0) {
    throw new Error('영상 길이를 확인할 수 없습니다.')
  }

  const { width, height } = fitSize(video.videoWidth, video.videoHeight, maxWidth)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas를 사용할 수 없습니다.')

  const gif = GIFEncoder()
  // Faster speed → shorter frame delay so GIF plays quicker than source
  const frameDelay = Math.max(2, Math.round(100 / fps / speed))
  const step = 1 / fps
  const totalFrames = Math.max(1, Math.floor(duration * fps))

  for (let i = 0; i < totalFrames; i++) {
    const t = Math.min(clippedStart + duration - 0.001, clippedStart + i * step)
    await seek(video, t)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(video, 0, 0, width, height)
    const { data } = ctx.getImageData(0, 0, width, height)
    const palette = quantize(data, maxColors)
    const index = applyPalette(data, palette)
    gif.writeFrame(index, width, height, {
      palette,
      delay: frameDelay,
      first: i === 0,
    })
    onProgress?.((i + 1) / totalFrames)
    if (i % 3 === 2) await new Promise((r) => setTimeout(r, 0))
  }

  gif.finish()
  const blob = toBlob(gif.bytes())

  video.removeAttribute('src')
  video.load()

  return { blob, width, height, frames: totalFrames, bytes: blob.size }
}

/** One still image → GIF (held frame so editors/browsers display it). */
export async function convertImageToGif(
  file: File,
  options: GifConvertOptions = {}
): Promise<GifConvertResult> {
  const maxWidth = options.maxWidth ?? 480
  const maxColors = options.maxColors ?? 128
  const imageDelay = options.imageDelay ?? 80
  const onProgress = options.onProgress

  const img = await loadImage(file)
  const { width, height } = fitSize(img.naturalWidth || img.width, img.naturalHeight || img.height, maxWidth)
  onProgress?.(0.4)

  const { GIFEncoder, index, palette } = await drawToGifFrame(img, width, height, maxColors)
  const gif = GIFEncoder()
  gif.writeFrame(index, width, height, {
    palette,
    delay: imageDelay,
    first: true,
  })
  gif.finish()
  onProgress?.(1)

  const blob = toBlob(gif.bytes())
  return { blob, width, height, frames: 1, bytes: blob.size }
}

/** Several images → one slideshow GIF (shared canvas size from first fitted frame). */
export async function convertImagesToGif(
  files: File[],
  options: GifConvertOptions = {}
): Promise<GifConvertResult> {
  if (!files.length) throw new Error('이미지가 없습니다.')
  if (files.length === 1) return convertImageToGif(files[0], options)

  const maxWidth = options.maxWidth ?? 480
  const maxColors = options.maxColors ?? 128
  const imageDelay = options.imageDelay ?? 80
  const onProgress = options.onProgress

  const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
  const images = []
  for (let i = 0; i < files.length; i++) {
    images.push(await loadImage(files[i]))
    onProgress?.(i / (files.length * 2))
  }

  const first = images[0]
  const { width, height } = fitSize(
    first.naturalWidth || first.width,
    first.naturalHeight || first.height,
    maxWidth
  )
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas를 사용할 수 없습니다.')

  const gif = GIFEncoder()
  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    // contain inside frame
    const scale = Math.min(width / (img.naturalWidth || img.width), height / (img.naturalHeight || img.height))
    const dw = (img.naturalWidth || img.width) * scale
    const dh = (img.naturalHeight || img.height) * scale
    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh)
    const { data } = ctx.getImageData(0, 0, width, height)
    const palette = quantize(data, maxColors)
    const index = applyPalette(data, palette)
    gif.writeFrame(index, width, height, {
      palette,
      delay: imageDelay,
      first: i === 0,
    })
    onProgress?.((i + 1) / images.length)
    if (i % 2 === 1) await new Promise((r) => setTimeout(r, 0))
  }

  gif.finish()
  const blob = toBlob(gif.bytes())
  return { blob, width, height, frames: images.length, bytes: blob.size }
}

export async function convertMediaToGif(
  file: File,
  options: GifConvertOptions = {}
): Promise<GifConvertResult> {
  if (isVideoFile(file)) return convertVideoToGif(file, options)
  if (isImageFile(file)) return convertImageToGif(file, options)
  throw new Error('지원하지 않는 파일입니다. 영상 또는 이미지를 올려 주세요.')
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

export function gifFileName(original: string) {
  const base = original.replace(/\.[^.]+$/, '') || 'clip'
  return `${base}.gif`
}
