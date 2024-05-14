const fs = require('fs')
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const multer = require('multer')

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const STATIC_PATH = path.resolve(__dirname, '../static')

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/static', express.static('static'))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  next()
})

app.post('/uploadChunk', upload.array('file'), async (req, res) => {
  const chunkName = req.body.chunkName
  const buffer = req.files[0].buffer

  try {
    await isExistDir()
  } catch(error) {
    try {
      fs.mkdirSync(path.resolve(__dirname, '../static'))
    } catch {}
  }
  fs.writeFileSync(path.resolve(STATIC_PATH, chunkName), buffer)

  res.send('success')
})

app.post('/megerChunks', async (req, res) => {
  try {
    const { fileName, size } = req.body
    const dir = fs.readdirSync(STATIC_PATH).filter((file) => file.includes(fileName))
    dir.sort((a, b) => a - b)
    dir.forEach(async (file, index) => {
      console.log(file)
      const readStream = fs.createReadStream(path.resolve(STATIC_PATH, file))
      readStream.on('end', () => {
        fs.rmSync(path.resolve(STATIC_PATH, file))
      })
      const writeStream = fs.createWriteStream(
        path.resolve(STATIC_PATH, fileName),
        {
          start: size * index,
          end: size * (index + 1)
        }
      )
      await pipeline(readStream, writeStream)
    })
    res.send({
      url: `http://localhost:3000/static/${fileName}`
    })
  } catch (error) {
    res.send(error)
  }
})

const pipeline = (readStream, writeStream) => {
  return new Promise((resolve, reject) => {
    writeStream.on('end', () => resolve())
    writeStream.on('error', (error) => reject(error))
    readStream.pipe(writeStream)
  })
}

const isExistDir = () => {
  return new Promise((resolve, reject) => {
    fs.readdir(STATIC_PATH, (error, data) => {
      if (error) {
        reject(error)
      } else {
        resolve(data)
      }
    })
  })
}

app.listen(3000)
