const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { UPLOADS_DIR } = require('../config/archivos')

const ensureUploadsDir = () => {
  const dir = UPLOADS_DIR
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = ensureUploadsDir()
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `team-logo${ext}`)
  },
})

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(Object.assign(new Error('Formato no permitido'), { status: 400 }))
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } })

const getTeamSettings = (req, res) => {
  const dir = ensureUploadsDir()
  const candidates = ['team-logo.png', 'team-logo.jpg', 'team-logo.jpeg', 'team-logo.webp', 'team-logo.gif']
  const file = candidates.find(f => fs.existsSync(path.join(dir, f)))
  const baseUrl = `${req.protocol}://${req.get('host')}`
  const logoUrl = file ? `${baseUrl}/uploads/${file}` : null
  res.json({ logoUrl })
}

const uploadTeamLogo = (req, res) => {
  const dir = ensureUploadsDir()
  const existing = fs.readdirSync(dir).filter(f => f.startsWith('team-logo.'))
  for (const f of existing) {
    try { fs.unlinkSync(path.join(dir, f)) } catch {}
  }
  const file = req.file
  if (!file) return res.status(400).json({ error: 'No se recibió archivo' })
  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.json({ logoUrl: `${baseUrl}/uploads/${path.basename(file.path)}` })
}

module.exports = {
  uploadMiddleware: upload.single('logo'),
  getTeamSettings,
  uploadTeamLogo,
}
