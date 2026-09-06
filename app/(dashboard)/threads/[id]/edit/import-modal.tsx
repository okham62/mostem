'use client'

import { ImagePlus, Images, X } from 'lucide-react'

export function ImportModal({
  onClose,
  onUseOriginal,
  onAttach,
}: {
  onClose: () => void
  onUseOriginal: () => void
  onAttach: (files: File[]) => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a20] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">가져오기</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-white/40">원문 미디어를 그대로 쓸지, 직접 첨부할지 고르세요.</p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              onUseOriginal()
              onClose()
            }}
            className="flex w-full items-start gap-3 rounded-xl border border-white/10 px-4 py-3 text-left hover:bg-white/5"
          >
            <Images className="mt-0.5 h-5 w-5 text-gold" />
            <span>
              <p className="text-sm font-semibold text-white">원문 영상·사진 그대로</p>
              <p className="mt-0.5 text-xs text-white/40">수집한 게시물의 사진과 영상을 그대로 씁니다.</p>
            </span>
          </button>
          <label className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-white/10 px-4 py-3 text-left hover:bg-white/5">
            <ImagePlus className="mt-0.5 h-5 w-5 text-brand" />
            <span>
              <p className="text-sm font-semibold text-white">내가 직접 첨부</p>
              <p className="mt-0.5 text-xs text-white/40">내 사진이나 영상을 골라 붙입니다.</p>
            </span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                if (files.length) onAttach(files)
                onClose()
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
