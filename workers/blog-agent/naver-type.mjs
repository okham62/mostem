import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const profileDir = path.join(os.homedir(), 'AppData', 'Local', 'mostem-blog-agent', 'chrome-profile')
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const debugPort = 9333

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

function debugReady() {
  return fetch(`http://127.0.0.1:${debugPort}/json/version`, { signal: AbortSignal.timeout(800) })
    .then((res) => res.ok)
    .catch(() => false)
}

async function ensureChrome() {
  if (await debugReady()) return
  if (!fs.existsSync(chromePath)) throw new Error('크롬을 찾지 못했습니다')
  const child = spawn(
    chromePath,
    [
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${debugPort}`,
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
    ],
    { detached: true, stdio: 'ignore' }
  )
  child.unref()
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    if (await debugReady()) return
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
  throw new Error('크롬 창을 열지 못했습니다')
}

async function browser() {
  if (!contextPromise) {
    contextPromise = ensureChrome()
      .then(async () => {
        const connected = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`)
        connected.close = async () => {}
        const context = connected.contexts()[0]
        if (!context) throw new Error('크롬 창을 열지 못했습니다')
        return context
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

async function visibleAnswerField(frame) {
  const locators = [frame.getByPlaceholder(/정답/), frame.locator('input[placeholder*="정답"]')]
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0)
    for (let i = 0; i < count; i += 1) {
      const item = locator.nth(i)
      if (await item.isVisible().catch(() => false)) return item
    }
  }
  return null
}

async function findChallenge(page) {
  for (const frame of page.frames()) {
    const field = await visibleAnswerField(frame)
    const text = await frame.locator('body').innerText().catch(() => '')
    const looksLikeCheck = /추가 확인|자동입력 방지|얼마입니까|정답을 입력/.test(text)
    if (!field && !looksLikeCheck) continue
    if (!field) continue
    return { frame, field, text }
  }
  return null
}

function questionFrom(text) {
  const lines = text
    .split('\n')
    .map((item) => item.trim())
    .filter((item) => item && item.length < 160 && !item.includes('입력해') && !item.includes('가상으로'))
  return (
    lines.find((item) => /입니까\?|얼마|몇\s*번째|숫자/.test(item)) ||
    lines.find((item) => /[?？]$/.test(item)) ||
    ''
  )
}

async function captureCheck(frame, page) {
  const question = frame.getByText(/입니까\?|얼마입니까|무엇입니까/).last()
  if (await question.count().catch(() => 0)) {
    let target = question
    for (let i = 0; i < 8; i += 1) {
      const parent = target.locator('xpath=..')
      const box = await parent.boundingBox().catch(() => null)
      if (box && box.width >= 260 && box.height >= 240 && box.height < 900) {
        return (await parent.screenshot()).toString('base64')
      }
      target = parent
    }
  }
  const images = frame.locator('img')
  const count = await images.count().catch(() => 0)
  let shot = null
  let bestArea = 0
  for (let i = 0; i < count; i += 1) {
    const box = await images.nth(i).boundingBox().catch(() => null)
    if (!box || box.width < 80) continue
    const area = box.width * box.height
    if (area > bestArea) {
      bestArea = area
      shot = images.nth(i)
    }
  }
  const buffer = shot ? await shot.screenshot() : await page.screenshot({ fullPage: false })
  return buffer.toString('base64')
}

async function answerSecurityCheck(page, report) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const challenge = await findChallenge(page)
    if (!challenge) return
    const question = questionFrom(challenge.text)
    const image = await captureCheck(challenge.frame, page)
    report('captcha', question ? `이번 문제: ${question}` : '보안 확인 문제를 읽는 중', { question, image })
    const answer = await waitCaptchaAnswer()
    report('captcha', `${question || '이번 문제'} → ${answer}`)
    await challenge.field.click({ timeout: 10000 })
    await challenge.field.fill('')
    await challenge.field.pressSequentially(answer, { delay: 12 })
    const confirm = challenge.frame.getByRole('button', { name: '확인' })
    if (await confirm.count()) await confirm.first().click({ timeout: 10000 })
    else await page.getByRole('button', { name: '확인' }).first().click({ timeout: 10000 })
    await page.waitForTimeout(2000)
    if (!(await findChallenge(page))) return
  }
  if (await findChallenge(page)) {
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
  const deadline = Date.now() + 45000
  while (Date.now() < deadline) {
    if (await findChallenge(page)) {
      await answerSecurityCheck(page, report)
      continue
    }
    const url = page.url()
    if (!url.includes('nid.naver.com')) return
    if (!url.includes('nidlogin') && !(await page.locator('#id').count())) return
    await page.waitForTimeout(400)
  }
  if (await findChallenge(page) || page.url().includes('nidlogin')) {
    throw new Error('로그인 화면에서 넘어가지 못했습니다. 열린 창을 확인해 주세요.')
  }
}

async function editorFrame(page) {
  const deadline = Date.now() + 25000
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      const hit = frame.locator('.se-title-text, .se-documentTitle, .se-text-paragraph')
      if (await hit.count().catch(() => 0)) return frame
    }
    await page.waitForTimeout(400)
  }
  throw new Error('글쓰기 편집 화면을 찾지 못했습니다')
}

async function attachImage(page, frame, filePath) {
  const button = frame.locator('button[data-name="image"], button.se-image-toolbar-button, button[data-name="picture"]').first()
  const chooserWait = page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null)
  await button.click({ timeout: 10000 })
  const chooser = await chooserWait
  if (chooser) {
    await chooser.setFiles(filePath)
  } else {
    await frame.locator('input[type="file"]').last().setInputFiles(filePath)
  }
  await page.waitForTimeout(800)
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
  await editorFrame(page)
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

  const frame = await editorFrame(page)
  report('title', '제목을 입력하는 중')
  const title = frame.locator('.se-title-text, .se-documentTitle .se-text-paragraph, .se-documentTitle').first()
  await title.click({ timeout: 15000 })
  await page.keyboard.type(input.title || '', { delay: 20 })
  await page.keyboard.press('Enter')

  const blocks =
    Array.isArray(input.blocks) && input.blocks.length
      ? input.blocks
      : (input.imagePaths || []).map((imagePath, index) => ({
          imagePath,
          text: (input.paragraphs || [])[index] || '',
        }))
  const body = frame.locator('.se-component.se-text .se-text-paragraph, .se-text-paragraph').nth(1)
  if (await body.count()) await body.click({ timeout: 10000 }).catch(() => {})

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    report('images', `사진 ${i + 1}/${blocks.length} 올리고 그 사진 멘트를 쓰는 중`)
    if (block.imagePath) await attachImage(page, frame, block.imagePath)
    await page.keyboard.press('Enter')
    if (block.text) {
      await page.keyboard.type(block.text, { delay: 12 })
      await page.keyboard.press('Enter')
      await page.keyboard.press('Enter')
    }
  }
  if (input.hashtags) {
    report('body', '해시태그를 넣는 중')
    await page.keyboard.type(String(input.hashtags), { delay: 8 })
  }

  report('done', '입력이 끝났습니다. 창은 닫지 않습니다. 발행은 직접 눌러 주세요.')
}
