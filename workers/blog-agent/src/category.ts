import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type BrowserContext, type Page } from 'playwright'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, '..', '.auth')
const PROFILE = path.join(AUTH_DIR, 'chromium')

export async function openContext(headless = false): Promise<BrowserContext> {
  fs.mkdirSync(PROFILE, { recursive: true })
  return chromium.launchPersistentContext(PROFILE, {
    headless,
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
  })
}

function categoryUrl(blogId: string) {
  const tpl =
    process.env.NAVER_CATEGORY_URL ||
    'https://section.blog.naver.com/BlogHome.naver?directoryNo=0&currentPage=1&groupId=0'
  if (tpl.includes('{blogId}')) return tpl.replaceAll('{blogId}', blogId)
  if (blogId) return `https://blog.naver.com/${blogId}`
  return tpl
}

/**
 * Best-effort Naver category visibility toggle.
 * Naver admin UI changes often — adjust selectors as needed.
 */
export async function toggleCategoryVisibility(input: {
  categoryName: string
  blogId?: string
  open: boolean
}) {
  const context = await openContext(false)
  const page = context.pages()[0] || (await context.newPage())
  const shots = path.join(__dirname, '..', '.shots')
  fs.mkdirSync(shots, { recursive: true })

  try {
    const start = categoryUrl(input.blogId || '')
    await page.goto(start, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForTimeout(1500)

    // Heuristic: find admin / category management links
    const adminCandidates = [
      'text=관리',
      'text=카테고리',
      'a[href*="Category"]',
      'a[href*="category"]',
      'text=통계',
    ]
    for (const sel of adminCandidates) {
      const el = page.locator(sel).first()
      if (await el.count()) {
        try {
          await el.click({ timeout: 2000 })
          await page.waitForTimeout(800)
        } catch {
          /* continue */
        }
      }
    }

    // Try open category settings if a dedicated link exists
    const catLink = page.locator('text=카테고리').first()
    if (await catLink.count()) {
      try {
        await catLink.click({ timeout: 3000 })
        await page.waitForTimeout(1000)
      } catch {
        /* ignore */
      }
    }

    const row = page.locator(`text=${input.categoryName}`).first()
    if (!(await row.count())) {
      const shot = path.join(shots, `missing-${Date.now()}.png`)
      await page.screenshot({ path: shot, fullPage: true })
      throw new Error(`카테고리 "${input.categoryName}" 를 화면에서 찾지 못했습니다. 스크린샷: ${shot}`)
    }

    await row.scrollIntoViewIfNeeded()
    // Click nearby menu / open-close control if present
    const parent = row.locator('xpath=ancestor::*[self::tr or self::li or self::div][1]')
    const toggle = parent
      .locator(
        input.open
          ? 'text=공개, text=Open, button:has-text("공개"), [aria-label*="공개"]'
          : 'text=비공개, text=Close, button:has-text("비공개"), [aria-label*="비공개"]'
      )
      .first()

    if (await toggle.count()) {
      await toggle.click({ timeout: 5000 })
    } else {
      // Fallback: right-side select / checkbox
      const select = parent.locator('select').first()
      if (await select.count()) {
        await select.selectOption({ label: input.open ? '공개' : '비공개' }).catch(async () => {
          await select.selectOption({ index: input.open ? 0 : 1 })
        })
      } else {
        const shot = path.join(shots, `no-toggle-${Date.now()}.png`)
        await page.screenshot({ path: shot, fullPage: true })
        throw new Error(`공개/비공개 컨트롤을 찾지 못했습니다. 스크린샷: ${shot}`)
      }
    }

    await page.waitForTimeout(1200)
    const okShot = path.join(shots, `ok-${input.open ? 'open' : 'close'}-${Date.now()}.png`)
    await page.screenshot({ path: okShot, fullPage: true })
    return { ok: true as const, screenshot: okShot }
  } finally {
    await context.close()
  }
}

export async function ensureLoggedInInteractive() {
  const context = await openContext(false)
  const page: Page = context.pages()[0] || (await context.newPage())
  await page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'domcontentloaded' })
  console.log('브라우저에서 네이버 로그인 후, 이 터미널에서 Enter를 누르세요…')
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve())
  })
  await context.close()
  console.log('로그인 세션이 .auth/chromium 에 저장되었습니다.')
}
