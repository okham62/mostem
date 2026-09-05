'use client'

import Link from 'next/link'
import {
  Aperture,
  AudioLines,
  Clapperboard,
  Eraser,
  Film,
  ImageIcon,
  Languages,
  PenLine,
  Tags,
} from 'lucide-react'
import { AI_TOOLS } from '@/lib/ai-tools'

const ICONS = {
  copy: PenLine,
  image: ImageIcon,
  voice: AudioLines,
  localize: Languages,
  'photo-video': Clapperboard,
  'bg-remove': Eraser,
  raw: Aperture,
  remix: Film,
  tags: Tags,
}

export function AiToolsHub() {
  return (
    <div className="mx-auto w-full max-w-[920px]">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-white md:text-3xl">AI 도구</h1>
        <p className="mt-2 text-sm text-white/45">
          이미지·음성·영상·카피·태그를 한곳에서 만듭니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {AI_TOOLS.map((tool) => {
          const Icon = ICONS[tool.id]
          return (
            <Link
              key={tool.id}
              href={tool.id === 'tags' ? '/ai/tags' : `/ai/${tool.id}`}
              className="group rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 transition hover:-translate-y-0.5 hover:border-gold/35 hover:bg-white/[0.04]"
            >
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/12 text-gold">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="text-sm font-bold text-white">{tool.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-white/40">{tool.description}</p>
              <p className="mt-3 text-[11px] font-semibold text-gold/80 group-hover:text-gold">
                열기 →
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
