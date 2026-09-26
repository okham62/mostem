import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  stripPersonFiles,
  type CoinPerson,
  type CoinTrade,
} from '@/lib/coin-ledger'

const LEDGER_TAG = 'coin_ledger'
const MARK = '__mostem_coin_ledger_v1'

type TemplateRow = {
  id: string
  name: string
  description_format: string | null
  default_tags: string[] | null
}

type Envelope = {
  [MARK]: true
  trades: CoinTrade[]
}

function encodeTrades(trades: CoinTrade[]) {
  const payload: Envelope = { [MARK]: true, trades }
  return JSON.stringify(payload)
}

function decodeTrades(raw: string): CoinTrade[] {
  try {
    const parsed = JSON.parse(raw) as Partial<Envelope>
    if (parsed && parsed[MARK] === true && Array.isArray(parsed.trades)) {
      return parsed.trades.filter(isTrade)
    }
  } catch {
    /* empty book */
  }
  return []
}

function isTrade(value: unknown): value is CoinTrade {
  const row = value as CoinTrade
  return Boolean(
    row &&
      typeof row.id === 'string' &&
      typeof row.symbol === 'string' &&
      (row.side === 'buy' || row.side === 'sell'),
  )
}

function fromRow(row: TemplateRow): CoinPerson {
  return {
    id: row.id,
    name: row.name,
    trades: decodeTrades(row.description_format ?? ''),
  }
}

export async function listCoinPeople(userId: string): Promise<CoinPerson[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('templates')
    .select('id, name, description_format, default_tags, created_at')
    .eq('user_id', userId)
    .contains('default_tags', [LEDGER_TAG])
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as TemplateRow[]).map(fromRow).map(stripPersonFiles)
}

export async function getCoinPerson(userId: string, id: string): Promise<CoinPerson | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('templates')
    .select('id, name, description_format, default_tags')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  const row = data as TemplateRow
  if (!(row.default_tags ?? []).includes(LEDGER_TAG)) return null
  return fromRow(row)
}

export async function createCoinPerson(userId: string, name: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('templates')
    .insert({
      user_id: userId,
      name,
      description_format: encodeTrades([]),
      default_tags: [LEDGER_TAG],
    })
    .select('id, name, description_format, default_tags')
    .single()
  if (error || !data) throw new Error(error?.message || '사람을 만들지 못했습니다.')
  return stripPersonFiles(fromRow(data as TemplateRow))
}

export async function ensureDefaultCoinPerson(userId: string) {
  const people = await listCoinPeople(userId)
  if (people.length) return people
  await createCoinPerson(userId, '본인')
  return listCoinPeople(userId)
}

export async function renameCoinPerson(userId: string, id: string, name: string) {
  const current = await getCoinPerson(userId, id)
  if (!current) throw new Error('사람을 찾지 못했습니다.')
  const supabase = createAdminClient()
  const { error } = await supabase.from('templates').update({ name }).eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
  return listCoinPeople(userId)
}

export async function deleteCoinPerson(userId: string, id: string) {
  const current = await getCoinPerson(userId, id)
  if (!current) throw new Error('사람을 찾지 못했습니다.')
  const supabase = createAdminClient()
  const { error } = await supabase.from('templates').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
  return ensureDefaultCoinPerson(userId)
}

async function saveTrades(userId: string, person: CoinPerson, trades: CoinTrade[]) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('templates')
    .update({ description_format: encodeTrades(trades) })
    .eq('id', person.id)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
  return stripPersonFiles({ ...person, trades })
}

export async function upsertCoinTrade(userId: string, personId: string, trade: CoinTrade) {
  const current = await getCoinPerson(userId, personId)
  if (!current) throw new Error('사람을 찾지 못했습니다.')
  const next = current.trades.some((item) => item.id === trade.id)
    ? current.trades.map((item) => (item.id === trade.id ? { ...item, ...trade, files: trade.files ?? item.files } : item))
    : [...current.trades, trade]
  return saveTrades(userId, current, next)
}

export async function deleteCoinTrade(userId: string, personId: string, tradeId: string) {
  const current = await getCoinPerson(userId, personId)
  if (!current) throw new Error('사람을 찾지 못했습니다.')
  return saveTrades(
    userId,
    current,
    current.trades.filter((item) => item.id !== tradeId),
  )
}

export function newTradeId() {
  return randomUUID()
}
