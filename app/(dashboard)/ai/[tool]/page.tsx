import { notFound } from 'next/navigation'
import { getAiTool } from '@/lib/ai-tools'
import { AiToolClient } from '../ai-tool-client'

export default function AiToolPage({ params }: { params: { tool: string } }) {
  if (params.tool === 'tags' || params.tool === 'gif') notFound()
  const tool = getAiTool(params.tool)
  if (!tool) notFound()
  return <AiToolClient tool={tool} />
}
