import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000'

// 구 엔드포인트 - 새 authorize 엔드포인트로 리다이렉트
export async function GET() {
  return NextResponse.redirect(new URL('/api/oauth/youtube/authorize', BASE_URL))
}
