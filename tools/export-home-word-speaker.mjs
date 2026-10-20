import {readFileSync} from 'node:fs'
import sharp from 'sharp'

// Original vector artwork; export without EXIF, XMP or source-image metadata.
const directory='src/static/icons/controls'
const source=readFileSync(directory+'/clay-speaker-3d.svg','utf8')
await sharp(Buffer.from(source)).resize(256,256).png().toFile(directory+'/clay-speaker-3d.png')
const dark=source.replace(/#[A-Fa-f0-9]{6}/g,color=>({
 '#CA956B':'#FFE3BD','#93603D':'#E3B889','#5C3424':'#B87948','#D5A77B':'#FFE8C8','#825335':'#CE9864',
 '#8F5F40':'#F2C99F','#47271C':'#A5693F','#B98256':'#FFE3BD','#6B402A':'#D9A16F','#6D432D':'#BD8858',
 '#805135':'#D6A574','#70442D':'#CF9C6B','#976744':'#E5B98C','#5C3826':'#BC8758','#65432C':'#15100D'
}[color]||color))
await sharp(Buffer.from(dark)).resize(256,256).png().toFile(directory+'/clay-speaker-3d-dark.png')
console.log('Exported the home word-card speaker at 256px.')
