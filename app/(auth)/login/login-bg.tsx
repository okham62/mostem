'use client'

import { useEffect, useRef } from 'react'

export function LoginBg() {
  const orbRef = useRef<HTMLDivElement>(null)
  const orb2Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let animFrame: number
    const W = window.innerWidth
    const H = window.innerHeight

    let targetX = W / 2
    let targetY = H / 2
    let currentX = targetX
    let currentY = targetY
    let currentX2 = targetX
    let currentY2 = targetY

    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    // ── 데스크탑: 마우스 추적 ──────────────────────
    const onMouseMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
    }

    // ── 모바일: 자이로스코프 ────────────────────────
    let gyroAvailable = false

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return
      gyroAvailable = true
      // gamma: 좌우 기울기 (-90 ~ 90), beta: 앞뒤 기울기 (-180 ~ 180)
      const x = W / 2 + (e.gamma / 25) * (W * 0.5)
      const y = H / 2 + ((e.beta - 30) / 25) * (H * 0.5)
      targetX = Math.max(0, Math.min(W, x))
      targetY = Math.max(0, Math.min(H, y))
    }

    // ── 모바일: 터치 추적 (백업) ────────────────────
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        targetX = e.touches[0].clientX
        targetY = e.touches[0].clientY
      }
    }

    // ── 자이로 없을 때: 자동 부유 애니메이션 ──────────
    let floatAngle = 0
    const floatAnim = () => {
      if (!gyroAvailable && isMobile) {
        floatAngle += 0.003
        targetX = W / 2 + Math.sin(floatAngle) * W * 0.25
        targetY = H / 2 + Math.cos(floatAngle * 0.7) * H * 0.2
      }
    }

    // 이벤트 등록
    if (isMobile) {
      // iOS 13+: 권한 요청
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        const req = (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission
        req().then((res: string) => {
          if (res === 'granted') {
            window.addEventListener('deviceorientation', onOrientation)
          }
        }).catch(() => {})
      } else {
        window.addEventListener('deviceorientation', onOrientation)
      }
      window.addEventListener('touchmove', onTouch, { passive: true })
    } else {
      window.addEventListener('mousemove', onMouseMove)
    }

    // ── 애니메이션 루프 ─────────────────────────────
    const animate = () => {
      floatAnim()

      // lerp - 모바일은 더 빠르게, 데스크탑은 부드럽게
      const speed1 = isMobile ? 0.18 : 0.06
      const speed2 = isMobile ? 0.10 : 0.03
      currentX += (targetX - currentX) * speed1
      currentY += (targetY - currentY) * speed1
      currentX2 += (targetX - currentX2) * speed2
      currentY2 += (targetY - currentY2) * speed2

      if (orbRef.current) {
        orbRef.current.style.transform = `translate(${currentX - 300}px, ${currentY - 300}px)`
      }
      if (orb2Ref.current) {
        orb2Ref.current.style.transform = `translate(${currentX2 - 200}px, ${currentY2 - 200}px)`
      }

      animFrame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('deviceorientation', onOrientation)
      window.removeEventListener('touchmove', onTouch)
      cancelAnimationFrame(animFrame)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* 배경 그리드 */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* 메인 오브 */}
      <div
        ref={orbRef}
        className="absolute top-0 left-0 h-[600px] w-[600px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #6366f1 0%, #8b5cf6 40%, transparent 70%)',
          filter: 'blur(60px)',
          willChange: 'transform',
        }}
      />

      {/* 보조 오브 */}
      <div
        ref={orb2Ref}
        className="absolute top-0 left-0 h-[400px] w-[400px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #06b6d4 0%, #3b82f6 50%, transparent 70%)',
          filter: 'blur(80px)',
          willChange: 'transform',
        }}
      />

      {/* 고정 배경 오브들 */}
      <div
        className="absolute -bottom-32 -left-32 h-[500px] w-[500px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute -top-32 -right-32 h-[400px] w-[400px] rounded-full opacity-10"
        style={{
          background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* 노이즈 텍스처 */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />
    </div>
  )
}
