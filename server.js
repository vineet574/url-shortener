const express = require('express')
const mongoose = require('mongoose')
const { nanoid } = require('nanoid')
const validUrl = require('valid-url')
const path = require('path')
require('dotenv').config()

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err))

const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortId: { type: String, required: true, unique: true },
  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
})

const Url = mongoose.model('Url', urlSchema)

app.post('/api/shorten', async (req, res) => {
  const { originalUrl } = req.body
  if (!originalUrl || !validUrl.isWebUri(originalUrl)) {
    return res.status(400).json({ error: 'Invalid URL' })
  }
  try {
    let url = await Url.findOne({ originalUrl })
    if (!url) {
      const shortId = nanoid(7)
      url = new Url({ originalUrl, shortId })
      await url.save()
    }
    const shortUrl = `${req.protocol}://${req.get('host')}/${url.shortId}`
    res.json({ shortUrl })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/:shortId', async (req, res) => {
  const { shortId } = req.params
  try {
    const url = await Url.findOne({ shortId })
    if (!url) return res.status(404).send('URL not found')
    url.clicks++
    await url.save()
    res.redirect(url.originalUrl)
  } catch (err) {
    res.status(500).send('Server error')
  }
})

app.get('/api/stats/:shortId', async (req, res) => {
  const { shortId } = req.params
  try {
    const url = await Url.findOne({ shortId }).select('-__v')
    if (!url) return res.status(404).json({ error: 'URL not found' })
    res.json(url)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
