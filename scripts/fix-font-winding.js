// scripts/fix-font-winding.js
// Fixes counter-form winding in the existing typeface JSON so that
// Three.js FontLoader (toShapes(false): CW=outer, CCW=hole) renders
// letters with enclosed spaces (A, O, R, B, D, P, ...) correctly.
import { readFileSync, writeFileSync } from 'fs'

const FONT_PATH = 'public/fonts/clash_display_bold.typeface.json'
const font = JSON.parse(readFileSync(FONT_PATH, 'utf8'))

// ── Parse Three.js typeface o-string → command objects ──────────────────────
function parsePathString(o) {
  if (!o) return []
  const tok = o.trim().split(/\s+/)
  const cmds = []
  let i = 0
  while (i < tok.length) {
    const t = tok[i]
    if (t === 'm') { cmds.push({ type: 'M', x: +tok[i+1], y: +tok[i+2] }); i += 3 }
    else if (t === 'l') { cmds.push({ type: 'L', x: +tok[i+1], y: +tok[i+2] }); i += 3 }
    else if (t === 'q') { cmds.push({ type: 'Q', x1: +tok[i+1], y1: +tok[i+2], x: +tok[i+3], y: +tok[i+4] }); i += 5 }
    else if (t === 'b') { cmds.push({ type: 'C', x1: +tok[i+1], y1: +tok[i+2], x2: +tok[i+3], y2: +tok[i+4], x: +tok[i+5], y: +tok[i+6] }); i += 7 }
    else if (t === 'z') { cmds.push({ type: 'Z' }); i += 1 }
    else { i++ }
  }
  return cmds
}

// ── Split at each M into separate contours ───────────────────────────────────
function splitIntoContours(cmds) {
  const contours = []
  let cur = []
  for (const cmd of cmds) {
    if (cmd.type === 'M' && cur.length > 0) { contours.push(cur); cur = [] }
    cur.push(cmd)
  }
  if (cur.length > 0) contours.push(cur)
  return contours
}

// ── Sample bezier curves to approximate polygon points ───────────────────────
function sampleContour(cmds) {
  const pts = []
  let cx = 0, cy = 0
  for (const cmd of cmds) {
    if (cmd.type === 'M') {
      cx = cmd.x; cy = cmd.y; pts.push({ x: cx, y: cy })
    } else if (cmd.type === 'L') {
      cx = cmd.x; cy = cmd.y; pts.push({ x: cx, y: cy })
    } else if (cmd.type === 'Q') {
      for (let j = 1; j <= 8; j++) {
        const t = j / 8, mt = 1 - t
        pts.push({ x: mt*mt*cx + 2*mt*t*cmd.x1 + t*t*cmd.x, y: mt*mt*cy + 2*mt*t*cmd.y1 + t*t*cmd.y })
      }
      cx = cmd.x; cy = cmd.y
    } else if (cmd.type === 'C') {
      for (let j = 1; j <= 8; j++) {
        const t = j / 8, mt = 1 - t
        pts.push({
          x: mt*mt*mt*cx + 3*mt*mt*t*cmd.x1 + 3*mt*t*t*cmd.x2 + t*t*t*cmd.x,
          y: mt*mt*mt*cy + 3*mt*mt*t*cmd.y1 + 3*mt*t*t*cmd.y2 + t*t*t*cmd.y,
        })
      }
      cx = cmd.x; cy = cmd.y
    }
  }
  return pts
}

// Signed area via standard shoelace (positive = CCW in Y-up, negative = CW)
function signedArea(pts) {
  let a = 0
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return a / 2
}

// ── Reverse a contour (flips CW ↔ CCW) ──────────────────────────────────────
function reverseContour(cmds) {
  const segs = []
  let px = 0, py = 0
  for (const cmd of cmds) {
    if (cmd.type === 'M') { px = cmd.x; py = cmd.y }
    else if (cmd.type !== 'Z') { segs.push({ from: { x: px, y: py }, cmd }); px = cmd.x; py = cmd.y }
  }
  if (segs.length === 0) return cmds

  const result = [{ type: 'M', x: px, y: py }]
  for (let i = segs.length - 1; i >= 0; i--) {
    const { from, cmd } = segs[i]
    if (cmd.type === 'L') result.push({ type: 'L', x: from.x, y: from.y })
    else if (cmd.type === 'Q') result.push({ type: 'Q', x1: cmd.x1, y1: cmd.y1, x: from.x, y: from.y })
    else if (cmd.type === 'C') result.push({ type: 'C', x1: cmd.x2, y1: cmd.y2, x2: cmd.x1, y2: cmd.y1, x: from.x, y: from.y })
  }
  result.push({ type: 'Z' })
  return result
}

// Three.js FontLoader uses toShapes(false): CW (area<0) = outer, CCW (area>0) = hole
// Font data has: outer = CCW (area>0), holes = CW (area<0) → need to reverse both
function fixWinding(contours) {
  if (contours.length <= 1) return contours

  const areas = contours.map(c => signedArea(sampleContour(c)))
  const absAreas = areas.map(Math.abs)
  const maxAbs = Math.max(...absAreas)

  return contours.map((contour, i) => {
    const area = areas[i]
    const isOuter = Math.abs(area) === maxAbs
    if (isOuter) return area > 0 ? reverseContour(contour) : contour  // outer → CW
    else         return area < 0 ? reverseContour(contour) : contour  // hole  → CCW
  })
}

// ── Serialize back to o-string ────────────────────────────────────────────────
function cmdsToString(cmds) {
  return cmds.map(cmd => {
    switch (cmd.type) {
      case 'M': return `m ${Math.round(cmd.x)} ${Math.round(cmd.y)}`
      case 'L': return `l ${Math.round(cmd.x)} ${Math.round(cmd.y)}`
      case 'Q': return `q ${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`
      case 'C': return `b ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`
      case 'Z': return 'z'
      default:  return ''
    }
  }).filter(Boolean).join(' ')
}

// ── Apply fix to all glyphs ───────────────────────────────────────────────────
let fixedCount = 0
for (const [char, glyph] of Object.entries(font.glyphs)) {
  if (!glyph.o) continue
  const cmds = parsePathString(glyph.o)
  const contours = splitIntoContours(cmds)
  if (contours.length <= 1) continue

  const fixed = fixWinding(contours)
  glyph.o = fixed.map(cmdsToString).join(' ')
  fixedCount++
  console.log(`Fixed '${char}' — ${contours.length} contours`)
}

writeFileSync(FONT_PATH, JSON.stringify(font))
console.log(`\nDone — fixed ${fixedCount} glyphs → ${FONT_PATH}`)
