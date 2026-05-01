import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function RootPage() {
  const session = await auth()
  if (session?.user?.status === 'approved') redirect('/dashboard')
  redirect('/login')
}
