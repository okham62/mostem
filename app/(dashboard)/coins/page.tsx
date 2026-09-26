import { auth } from '@/auth'
import { ensureDefaultCoinPerson } from '@/lib/coin-ledger-store'
import { redirect } from 'next/navigation'
import { CoinsClient } from './coins-client'

export default async function CoinsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const people = await ensureDefaultCoinPerson(session.user.id).catch(() => [])
  return <CoinsClient initial={people} />
}
