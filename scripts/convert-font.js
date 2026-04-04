// scripts/convert-font.js
// Usage: node scripts/convert-font.js ClashDisplay-Bold.otf
import opentype from 'opentype.js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const fontPath = process.argv[2]
if (!fontPath) {
  console.error('Usage: node scripts/convert-font.js <fontfile.otf>')
  process.exit(1)
}

const buffer = readFileSync(fontPath)
const font = opentype.parse(buffer.buffer)

// Characters needed for hero text: uppercase + space
const CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function glyphToThree(glyph) {
  let o = ''
  if (glyph.path && glyph.path.commands.length > 0) {
    for (const cmd of glyph.path.commands) {
      switch (cmd.type) {
        case 'M': o += `m ${Math.round(cmd.x)} ${Math.round(cmd.y)} `; break
        case 'L': o += `l ${Math.round(cmd.x)} ${Math.round(cmd.y)} `; break
        case 'Q': o += `q ${Math.round(cmd.x1)} ${Math.round(cmd.y1)} ${Math.round(cmd.x)} ${Math.round(cmd.y)} `; break
        case 'C': o += `b ${Math.round(cmd.x1)} ${Math.round(cmd.y1)} ${Math.round(cmd.x2)} ${Math.round(cmd.y2)} ${Math.round(cmd.x)} ${Math.round(cmd.y)} `; break
        case 'Z': o += 'z '; break
      }
    }
  }
  return {
    x_min: Math.round(glyph.xMin ?? 0),
    x_max: Math.round(glyph.xMax ?? 0),
    ha: Math.round(glyph.advanceWidth ?? 0),
    o: o.trim(),
  }
}

const glyphs = {}
for (const char of CHARS) {
  glyphs[char] = glyphToThree(font.charToGlyph(char))
}

const output = {
  glyphs,
  familyName: font.names.fontFamily?.en ?? 'Clash Display',
  ascender: Math.round(font.ascender),
  descender: Math.round(font.descender),
  underlinePosition: Math.round(font.tables.post?.underlinePosition ?? -100),
  underlineThickness: Math.round(font.tables.post?.underlineThickness ?? 50),
  boundingBox: {
    yMin: Math.round(font.tables.head?.yMin ?? font.descender),
    xMin: 0,
    yMax: Math.round(font.tables.head?.yMax ?? font.ascender),
    xMax: Math.round(font.tables.head?.xMax ?? font.unitsPerEm),
  },
  resolution: font.unitsPerEm,
  original_font_information: {},
}

const outPath = 'public/fonts/clash_display_bold.typeface.json'
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(output))
console.log(`Done → ${outPath}`)
