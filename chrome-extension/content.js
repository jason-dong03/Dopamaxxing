'use strict'

// How long with no in-tab activity before we consider the user idle (2 min).
// Video playback resets this timer, so lecture watchers stay active.
const IDLE_MS = 2 * 60 * 1000

// Rapid-scroll speed threshold (pixels per second). Flipping through slides or
// skimming a PDF faster than this doesn't count as studying.
const RAPID_SCROLL_PX_S = 2500

let lastActivity = Date.now()
let mouseMoveThrottle = 0
let _isRapidScrolling = false

function markActive() {
  lastActivity = Date.now()
}

function onMouseMove() {
  const now = Date.now()
  if (now - mouseMoveThrottle > 5000) {
    mouseMoveThrottle = now
    markActive()
  }
}

// ─── Scroll speed detection ───────────────────────────────────────────────────
// Slow reading-pace scroll marks active; rapid flipping does not.
const _scrollSamples = []

function onScroll() {
  const now = Date.now()
  _scrollSamples.push({ time: now, y: window.scrollY })

  // Keep a 3-second window of samples
  while (_scrollSamples.length && now - _scrollSamples[0].time > 3000) {
    _scrollSamples.shift()
  }

  if (_scrollSamples.length >= 2) {
    const first = _scrollSamples[0]
    const last  = _scrollSamples[_scrollSamples.length - 1]
    const dt    = Math.max((last.time - first.time) / 1000, 0.05)
    const speed = Math.abs(last.y - first.y) / dt
    _isRapidScrolling = speed > RAPID_SCROLL_PX_S
  } else {
    _isRapidScrolling = false
  }

  if (!_isRapidScrolling) markActive()
}

document.addEventListener('mousemove',   onMouseMove, { passive: true, capture: true })
document.addEventListener('keydown',     markActive,  { passive: true, capture: true })
document.addEventListener('keypress',    markActive,  { passive: true, capture: true })
document.addEventListener('scroll',      onScroll,    { passive: true, capture: true })
document.addEventListener('wheel',       markActive,  { passive: true, capture: true })
document.addEventListener('click',       markActive,  { passive: true, capture: true })
document.addEventListener('mousedown',   markActive,  { passive: true, capture: true })
document.addEventListener('touchstart',  markActive,  { passive: true, capture: true })
document.addEventListener('input',       markActive,  { passive: true, capture: true })
document.addEventListener('pointerdown', markActive,  { passive: true, capture: true })

// ─── Video playback detection ─────────────────────────────────────────────────
// Watching a lecture video keeps the session alive even with no other input.
function attachVideoTracking(video) {
  let videoThrottle = 0
  video.addEventListener('timeupdate', () => {
    if (video.paused || video.ended) return
    const now = Date.now()
    if (now - videoThrottle > 10000) {
      videoThrottle = now
      markActive()
    }
  }, { passive: true })
}

function scanVideos() {
  document.querySelectorAll('video').forEach(attachVideoTracking)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scanVideos)
} else {
  scanVideos()
}

// Catch videos injected dynamically (Canvas media player, embedded lectures, etc.)
const _videoObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue
      if (node.nodeName === 'VIDEO') attachVideoTracking(node)
      node.querySelectorAll?.('video').forEach(attachVideoTracking)
    }
  }
})
_videoObserver.observe(document.documentElement, { childList: true, subtree: true })

// ─── Page content extraction for AI classification ────────────────────────────
// Tries known content-area selectors before falling back to body text.
// Sent to the background once per page load / URL change so Grok can verify
// whether this is genuine lecture/study material.
function extractPageText() {
  const candidates = [
    '#docs-editor-container',   // Google Docs
    '.slide-content',           // Google Slides
    '.wiki-page-body',          // Canvas pages
    '.show-content',            // Canvas assignments/quizzes
    '.quiz-description',        // Canvas quiz instructions
    '.notion-page-content',     // Notion
    'article',
    'main',
    '[role="main"]',
  ]
  for (const sel of candidates) {
    const el = document.querySelector(sel)
    const text = el?.innerText?.trim()
    if (text) return text.slice(0, 1000)
  }
  return document.body?.innerText?.trim().slice(0, 1000) ?? ''
}

// ─── Heartbeat ping ───────────────────────────────────────────────────────────
let _lastPingUrl   = null
let _lastPingTitle = null

function sendPing() {
  const idleFor = Date.now() - lastActivity
  const isActive = idleFor < IDLE_MS && !_isRapidScrolling

  // Send page metadata only when the URL or title changes (not every 20 s) so
  // the background can trigger Grok classification without spamming it.
  const currentTitle = document.title
  const changed = location.href !== _lastPingUrl || currentTitle !== _lastPingTitle
  const pageInfo = changed ? { pageTitle: currentTitle, pageText: extractPageText() } : {}
  if (changed) {
    _lastPingUrl   = location.href
    _lastPingTitle = currentTitle
  }

  try {
    chrome.runtime.sendMessage({
      type: 'activity-ping',
      lastActivity,
      isActive,
      idleFor,
      rapidScrolling: _isRapidScrolling,
      url: location.href,
      ...pageInfo,
    })
  } catch {
    clearInterval(pingInterval)
    _videoObserver.disconnect()
  }
}

const pingInterval = setInterval(sendPing, 20000)
document.addEventListener('visibilitychange', () => { if (!document.hidden) sendPing() })
sendPing()
