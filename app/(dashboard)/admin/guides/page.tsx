import { auth } from '@/auth'
import { listAiGuides, seedAiGuides } from '@/lib/ai-guides-store'
import { redirect } from 'next/navigation'
import { GuidesClient } from './guides-client'

export default async function AdminGuidesPage() {
  const session = await auth()
  if (session?.user?.role !== 'admin') redirect('/dashboard')
  const guides = await seedAiGuides(session.user.id).catch(() => listAiGuides())
  return <GuidesClient initial={guides} />
}
