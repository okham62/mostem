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
let sessionId = 0

export function chromeAlive() {
  return debugReady()
}

export function resetNaverSession() {
  sessionId += 1
  opening = null
  contextPromise = null
  captchaResolve = null
}

function guardStatus(onStatus) {
  const id = sessionId
  return (status) => {
    if (id !== sessionId) return
    onStatus?.(status)
  }
}

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

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

async function ensureChrome(startUrl) {
  if (await debugReady()) return
  if (!fs.existsSync(chromePath)) throw new Error('크롬을 찾지 못했습니다')
  const args = [
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${debugPort}`,
    '--start-maximized',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-session-crashed-bubble',
    '--hide-crash-restore-bubble',
    '--new-window',
  ]
  if (startUrl) args.push(startUrl)
  const child = spawn(chromePath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  })
  child.unref()
  const deadline = Date.now() + 12000
  while (Date.now() < deadline) {
    if (await debugReady()) return
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error('크롬 창을 열지 못했습니다')
}

async function browser(startUrl) {
  if (!contextPromise) {
    contextPromise = ensureChrome(startUrl)
      .then(async () => {
        const connected = await withTimeout(
          chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`),
          8000,
          '크롬 창 연결이 지연되었습니다'
        )
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

function isLoginUrl(url) {
  return url.includes('nid.naver.com') || url.includes('nidlogin')
}

function isWriteUrl(url, blogId) {
  try {
    const current = new URL(url)
    return (
      current.hostname.includes('blog.naver.com') &&
      current.pathname.includes('PostWriteForm') &&
      current.searchParams.get('blogId') === blogId
    )
  } catch {
    return false
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

export async function loginNaverAccount(input, onStatus) {
  const report = guardStatus(onStatus)
  const loginId = String(input.loginId || '')
  const blogId = String(input.blogId || loginId)
  report('chrome', '로그인 창을 여는 중')
  const context = await browser('https://nid.naver.com/nidlogin.login')
  const pages = context.pages()
  const page = pages.find((item) => isLoginUrl(item.url())) || pages[0] || (await context.newPage())
  await page.bringToFront()
  report('login', `${loginId} 계정으로 로그인 중`)
  await page.goto('https://nid.naver.com/nidlogin.logout', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
  await login(page, loginId, input.password, report)
  const home = blogId ? `https://blog.naver.com/${encodeURIComponent(blogId)}` : 'https://www.naver.com'
  await page.goto(home, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
  report('done', `${loginId} 로그인했습니다. 창은 닫지 않습니다.`)
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

async function dismissContinueDraft(page, fresh) {
  const names = fresh ? ['취소', '새로 작성', '새 글쓰기'] : ['확인']
  for (const frame of page.frames()) {
    const ask = frame.getByText('작성 중인 글이 있습니다')
    if (!(await ask.isVisible().catch(() => false))) continue
    for (const name of names) {
      const button = frame.getByRole('button', { name, exact: true })
      if (await button.first().isVisible().catch(() => false)) {
        await button.first().click({ timeout: 3000 }).catch(() => {})
        return
      }
    }
  }
}

async function typeTitle(page, frame, title) {
  const field = frame.locator('.se-title-text, .se-documentTitle .se-text-paragraph, .se-documentTitle').first()
  await field.click({ timeout: 8000 })
  await page.keyboard.press('Control+A')
  await page.keyboard.type(title, { delay: 8 })
  await page.keyboard.press('Enter')
}

async function openEditor(input, onStatus) {
  const report = (phase, message, extra) => onStatus?.({ phase, message, ...extra })
  const blogId = String(input.blogId || '')
  const writeUrl = `https://blog.naver.com/PostWriteForm.naver?blogId=${encodeURIComponent(blogId)}${input.fresh ? `&n=${Date.now()}` : ''}`
  report('chrome', input.fresh ? '다음 글을 위해 새 글쓰기 화면으로 이동' : '글쓰기 창으로 이동')
  const context = await browser(writeUrl)
  const pages = context.pages()
  const page =
    pages.find((item) => isWriteUrl(item.url(), blogId)) ||
    pages.find((item) => isLoginUrl(item.url())) ||
    pages[0] ||
    (await context.newPage())
  await page.bringToFront()
  const onLogin = () => isLoginUrl(page.url())
  const here = isWriteUrl(page.url(), blogId)
  if (input.fresh || !here || (await page.locator('#id').count())) {
    if (!onLogin() && !(await page.locator('#id').count())) {
      await page.goto(writeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    }
    if (onLogin() || (await page.locator('#id').count())) {
      report('login', '네이버 로그인 중')
      await login(page, input.loginId, input.password, report)
      await page.goto(writeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    }
  }
  if (input.fresh) await page.waitForTimeout(800)
  await dismissContinueDraft(page, Boolean(input.fresh))
  const frame = await editorFrame(page)
  if (input.title) {
    report('title', '제목을 입력하는 중')
    await typeTitle(page, frame, input.title)
  }
  report('ready', '제목을 넣었습니다. 사진 멘트를 준비하는 중')
  return page
}

export async function beginNaver(input, onStatus) {
  if (!(await chromeAlive())) resetNaverSession()
  const report = guardStatus(onStatus)
  if (!opening) {
    const id = sessionId
    opening = openEditor(input, report).catch((error) => {
      if (id === sessionId) {
        opening = null
        contextPromise = null
      }
      throw error
    })
  }
  return opening
}

export async function typeNaverPost(input, onStatus) {
  const send = guardStatus(onStatus)
  const report = (phase, message, extra) => send({ phase, message, ...extra })
  const page = await beginNaver(input, onStatus)
  opening = null

  const frame = await editorFrame(page)
  if (!input.skipTitle && input.title) {
    report('title', '제목을 입력하는 중')
    await typeTitle(page, frame, input.title)
  }

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

  if (input.finish === 'schedule') {
    await schedulePost(page, input.scheduleAt, report)
    report('done', '예약했습니다. 창은 닫지 않습니다.')
  } else {
    await saveDraft(page, report)
    report('done', '일시저장했습니다. 창은 닫지 않습니다.')
  }
}

async function visibleExactButtons(page, name) {
  const found = []
  for (const frame of page.frames()) {
    const buttons = frame.getByRole('button', { name, exact: true })
    const count = await buttons.count().catch(() => 0)
    for (let i = 0; i < count; i += 1) {
      const button = buttons.nth(i)
      if (await button.isVisible().catch(() => false)) found.push(button)
    }
  }
  return found
}

async function clickExactText(page, text) {
  for (const frame of page.frames()) {
    const items = frame.getByText(text, { exact: true })
    const count = await items.count().catch(() => 0)
    for (let i = 0; i < count; i += 1) {
      const item = items.nth(i)
      if (await item.isVisible().catch(() => false)) {
        await item.click({ timeout: 5000 })
        return true
      }
    }
  }
  return false
}

async function chooseOption(select, wanted) {
  const target = String(Number(wanted))
  const padded = String(wanted).padStart(2, '0')
  const options = select.locator('option')
  const count = await options.count().catch(() => 0)
  for (let i = 0; i < count; i += 1) {
    const option = options.nth(i)
    const value = (await option.getAttribute('value')) || ''
    const text = (await option.innerText().catch(() => '')).trim()
    if (value === padded || value === target || text === padded || text.startsWith(target)) {
      await select.selectOption(value || { label: text })
      return true
    }
  }
  return false
}

async function fillReserveTime(page, when) {
  const copy = new Date(when.getTime())
  copy.setMinutes(Math.ceil(copy.getMinutes() / 10) * 10, 0, 0)
  const date = `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, '0')}-${String(copy.getDate()).padStart(2, '0')}`
  const hour = String(copy.getHours()).padStart(2, '0')
  const minute = String(copy.getMinutes()).padStart(2, '0')
  let filled = false
  for (const frame of page.frames()) {
    const dateInput = frame.locator('input[type="date"], input[type="datetime-local"]').first()
    if (await dateInput.isVisible().catch(() => false)) {
      await dateInput.fill(date)
      filled = true
    }
    const timeInput = frame.locator('input[type="time"]').first()
    if (await timeInput.isVisible().catch(() => false)) {
      await timeInput.fill(`${hour}:${minute}`)
      filled = true
    }
    const selects = frame.locator('select')
    const count = await selects.count().catch(() => 0)
    const visible = []
    for (let i = 0; i < count; i += 1) {
      const select = selects.nth(i)
      if (await select.isVisible().catch(() => false)) visible.push(select)
    }
    if (visible.length >= 2) {
      if (await chooseOption(visible[0], hour)) filled = true
      if (await chooseOption(visible[1], minute)) filled = true
    }
  }
  return filled
}

async function schedulePost(page, scheduleAt, report) {
  report('save', '예약하는 중')
  await page.bringToFront()
  const when = new Date(scheduleAt)
  if (Number.isNaN(when.getTime())) throw new Error('예약 시각을 확인해 주세요.')
  const openButtons = await visibleExactButtons(page, '발행')
  if (!openButtons.length) throw new Error('발행 버튼을 찾지 못했습니다. 열린 창에서 예약해 주세요.')
  await openButtons[0].click({ timeout: 8000 })
  await page.waitForTimeout(700)
  if (!(await clickExactText(page, '예약'))) {
    throw new Error('예약 항목을 찾지 못했습니다. 열린 창에서 예약해 주세요.')
  }
  await page.waitForTimeout(400)
  if (!(await fillReserveTime(page, when))) {
    throw new Error('예약 시각 칸을 찾지 못했습니다. 열린 창에서 시각을 정해 주세요.')
  }
  const confirmButtons = await visibleExactButtons(page, '발행')
  const confirm = confirmButtons[confirmButtons.length - 1]
  if (!confirm) throw new Error('예약 확인 버튼을 찾지 못했습니다. 열린 창에서 예약을 눌러 주세요.')
  await confirm.click({ timeout: 8000 })
  await page.waitForTimeout(1200)
}

async function saveDraft(page, report) {
  report('save', '저장하는 중')
  await page.bringToFront()
  const button = await findSaveButton(page)
  if (!button) throw new Error('저장 버튼을 찾지 못했습니다. 열린 창에서 저장을 눌러 주세요.')
  await button.click({ timeout: 8000 })
  await page.waitForTimeout(1200)
  for (const frame of page.frames()) {
    const saved = frame.getByText(/저장되었습니다|임시저장/)
    if (await saved.first().isVisible().catch(() => false)) {
      const confirm = frame.getByRole('button', { name: '확인' })
      if (await confirm.first().isVisible().catch(() => false)) {
        await confirm.first().click({ timeout: 3000 }).catch(() => {})
      }
      return
    }
  }
}

async function findSaveButton(page) {
  for (const frame of page.frames()) {
    const buttons = frame.getByRole('button', { name: '저장', exact: true })
    const count = await buttons.count().catch(() => 0)
    for (let i = 0; i < count; i += 1) {
      const button = buttons.nth(i)
      if (await button.isVisible().catch(() => false)) return button
    }
  }
  return null
}
