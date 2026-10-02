import path from 'node:path'
import os from 'node:os'
import { chromium } from 'playwright'

const profileDir = path.join(os.homedir(), 'AppData', 'Local', 'mostem-blog-agent', 'chrome-profile')

let contextPromise = null

async function browser() {
  if (!contextPromise) {
    contextPromise = chromium
      .launchPersistentContext(profileDir, {
        channel: 'chrome',
        headless: false,
        viewport: null,
        locale: 'ko-KR',
        args: ['--start-maximized'],
      })
      .catch((error) => {
        contextPromise = null
        throw error
      })
  }
  return contextPromise
}

async function typeInto(page, selector, text) {
  const field = page.locator(selector).first()
  await field.click({ timeout: 15000 })
  await field.evaluate((node) => node.removeAttribute('readonly'))
  await field.fill('')
  await field.pressSequentially(text, { delay: 45 })
}

async function login(page, loginId, password) {
  await page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(800)
  if (!page.url().includes('nid.naver.com')) return
  await typeInto(page, '#id', loginId)
  await typeInto(page, '#pw', password)
  await page.locator('#log\\.login, button.btn_login').first().click()
  await page.waitForTimeout(2500)
  if (page.url().includes('nidlogin')) {
    throw new Error('로그인 창이 남아 있습니다. 캡차가 있으면 열린 크롬 창에서 직접 완료해 주세요.')
  }
}

async function attachImage(page, filePath) {
  const button = page.locator('button[data-name="image"], button.se-image-toolbar-button, button[data-name="picture"]').first()
  const chooserWait = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null)
  await button.click({ timeout: 10000 })
  const chooser = await chooserWait
  if (chooser) {
    await chooser.setFiles(filePath)
  } else {
    await page.locator('input[type="file"]').last().setInputFiles(filePath)
  }
  await page.waitForTimeout(1200)
}

export async function typeNaverPost(input, onStatus) {
  const report = (phase, message) => onStatus?.({ phase, message })
  report('chrome', '크롬 창을 여는 중')
  const context = await browser()
  const page = context.pages()[0] || (await context.newPage())
  await page.bringToFront()

  const blogId = input.blogId
  const writeUrl = `https://blog.naver.com/PostWriteForm.naver?blogId=${encodeURIComponent(blogId)}`
  report('login', '네이버 글쓰기 화면으로 이동')
  await page.goto(writeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(1200)
  if (page.url().includes('nid.naver.com') || (await page.locator('#id').count())) {
    report('login', '네이버 로그인 중')
    await login(page, input.loginId, input.password)
    await page.goto(writeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(1500)
  }

  report('title', '제목을 입력하는 중')
  const title = page.locator('.se-title-text, .se-documentTitle .se-text-paragraph').first()
  await title.click({ timeout: 30000 })
  await page.keyboard.type(input.title, { delay: 35 })

  report('body', '본문을 입력하는 중')
  const body = page.locator('.se-component.se-text .se-text-paragraph, .se-text-paragraph').nth(1)
  if (await body.count()) await body.click()
  for (const paragraph of input.paragraphs || []) {
    await page.keyboard.type(paragraph, { delay: 16 })
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
  }

  const images = Array.isArray(input.imagePaths) ? input.imagePaths : []
  for (let i = 0; i < images.length; i += 1) {
    report('images', `이미지 첨부 ${i + 1}/${images.length}`)
    await attachImage(page, images[i])
  }

  report('done', '입력이 끝났습니다. 발행은 크롬 창에서 눌러 주세요.')
}
