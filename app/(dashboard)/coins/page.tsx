import { auth } from '@/auth'
import { holdingsFromTrades } from '@/lib/coin-ledger'
import { ensureDefaultCoinPerson } from '@/lib/coin-ledger-store'
import { fetchCoinPrices } from '@/lib/coin-prices'
import { redirect } from 'next/navigation'
import { CoinsClient } from './coins-client'

export const dynamic = 'force-dynamic'

export default async function CoinsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const people = await ensureDefaultCoinPerson(session.user.id).catch(() => [])
  const symbols = [...new Set(people.flatMap((person) => holdingsFromTrades(person.trades).map((item) => item.symbol)))]
  const initialPrices = await fetchCoinPrices(symbols).catch(() => ({}))
  return <CoinsClient initial={people} initialPrices={initialPrices} />
}
