import path from 'node:path'
import os from 'node:os'
import { chromium } from 'playwright'

const profileDir = path.join(os.homedir(), 'AppData', 'Local', 'mostem-blog-agent', 'chrome-profile')

let contextPromise = null
let opening = null
let captchaResolve = null

export function provideCaptchaAnswer(answer) {
  const text = String(answer || '').trim()
  if (!text || !captchaResolve) return false
  const done = captchaResolve
  captchaResolve = null
  done(text)
  return true
}

function waitCaptchaAnswer() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      captchaResolve = null
      reject(new Error('보안 확인 답변 시간이 지났습니다'))
    }, 90000)
    captchaResolve = (answer) => {
      clearTimeout(timer)
      resolve(answer)
    }
  })
}

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
  await field.pressSequentially(text, { delay: 12 })
}

async function securityQuestion(page) {
  const text = await page.locator('body').innerText().catch(() => '')
  const match = text.match(/([^\n]{4,80}얼마[^\n?]{0,40}\?)|([^\n]{4,80}입니까\?)/)
  return match ? match[0].trim() : ''
}

async function captureChallenge(page) {
  const images = page.locator('img')
  const count = await images.count()
  let best = null
  let bestArea = 0
  for (let i = 0; i < count; i += 1) {
    const box = await images.nth(i).boundingBox()
    if (!box || box.width < 80 || box.height < 40) continue
    const area = box.width * box.height
    if (area > bestArea) {
      bestArea = area
      best = images.nth(i)
    }
  }
  const buffer = best ? await best.screenshot() : await page.screenshot({ fullPage: false })
  return buffer.toString('base64')
}

async function answerSecurityCheck(page, report) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const field = page.getByPlaceholder('정답을 입력해 주세요')
    if (!(await field.isVisible().catch(() => false))) return
    const question = await securityQuestion(page)
    const image = await captureChallenge(page)
    report('captcha', '보안 확인 문제를 읽는 중', { question, image })
    const answer = await waitCaptchaAnswer()
    report('captcha', '보안 확인 정답을 입력하는 중')
    await field.click({ timeout: 10000 })
    await field.fill('')
    await field.pressSequentially(answer, { delay: 12 })
    await page.getByRole('button', { name: '확인' }).click({ timeout: 10000 })
    await page.waitForTimeout(1200)
  }
  if (await page.getByPlaceholder('정답을 입력해 주세요').isVisible().catch(() => false)) {
    throw new Error('보안 확인 정답이 맞지 않습니다. 열린 창에서 직접 입력해 주세요.')
  }
}

async function login(page, loginId, password, report) {
  await page.goto('https://nid.naver.com/nidlogin.login', { waitUntil: 'domcontentloaded', timeout: 30000 })
  if (!page.url().includes('nid.naver.com')) return
  if (await page.locator('#id').count()) {
    await typeInto(page, '#id', loginId)
    await typeInto(page, '#pw', password)
    await page.locator('#loginBtn_column:visible, #loginBtn_row:visible').first().click({ timeout: 10000 })
  }
  const deadline = Date.now() + 30000
  while (Date.now() < deadline) {
    if (await page.getByPlaceholder('정답을 입력해 주세요').isVisible().catch(() => false)) {
      await answerSecurityCheck(page, report)
    }
    const url = page.url()
    if (!url.includes('nid.naver.com')) return
    if (!url.includes('nidlogin') && !(await page.locator('#id').count())) return
    await page.waitForTimeout(400)
  }
  if (page.url().includes('nidlogin')) {
    throw new Error('로그인 화면에서 넘어가지 못했습니다. 열린 창을 확인해 주세요.')
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

async function openEditor(input, onStatus) {
  const report = (phase, message, extra) => onStatus?.({ phase, message, ...extra })
  report('chrome', '크롬 창을 여는 중')
  const context = await browser()
  const page = context.pages()[0] || (await context.newPage())
  await page.bringToFront()
  const blogId = input.blogId
  const writeUrl = `https://blog.naver.com/PostWriteForm.naver?blogId=${encodeURIComponent(blogId)}`
  report('login', '네이버 로그인 중')
  await page.goto(writeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  if (page.url().includes('nid.naver.com') || (await page.locator('#id').count())) {
    await login(page, input.loginId, input.password, report)
    await page.goto(writeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  }
  report('ready', '글쓰기 화면입니다')
  return page
}

export function beginNaver(input, onStatus) {
  if (!opening) {
    opening = openEditor(input, onStatus).catch((error) => {
      opening = null
      throw error
    })
  }
  return opening
}

export async function typeNaverPost(input, onStatus) {
  const report = (phase, message, extra) => onStatus?.({ phase, message, ...extra })
  const page = await beginNaver(input, onStatus)
  opening = null

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
