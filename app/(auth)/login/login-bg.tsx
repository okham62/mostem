'use client'

import { useEffect, useRef } from 'react'

export function LoginBg() {
  const orbRef = useRef<HTMLDivElement>(null)
  const orb2Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let animFrame: number
    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let currentX = mouseX
    let currentY = mouseY
    let currentX2 = mouseX
    let currentY2 = mouseY

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    const animate = () => {
      // 부드럽게 따라오기 (lerp)
      currentX += (mouseX - currentX) * 0.06
      currentY += (mouseY - currentY) * 0.06
      currentX2 += (mouseX - currentX2) * 0.03
      currentY2 += (mouseY - currentY2) * 0.03

      if (orbRef.current) {
        orbRef.current.style.transform = `translate(${currentX - 300}px, ${currentY - 300}px)`
      }
      if (orb2Ref.current) {
        orb2Ref.current.style.transform = `translate(${currentX2 - 200}px, ${currentY2 - 200}px)`
      }

      animFrame = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove)
    animate()

    return () => {
      window.removeEventListener('mousemove', onMove)
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

      {/* 메인 오브 - 마우스 빠르게 따라옴 */}
      <div
        ref={orbRef}
        className="absolute top-0 left-0 h-[600px] w-[600px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #6366f1 0%, #8b5cf6 40%, transparent 70%)',
          filter: 'blur(60px)',
          willChange: 'transform',
        }}
      />

      {/* 보조 오브 - 마우스 느리게 따라옴 */}
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
