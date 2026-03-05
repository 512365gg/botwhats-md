import fetch from 'node-fetch'
import fs from 'fs'
import { sizeFormatter } from 'human-readable'

const formatSize = sizeFormatter({
  std: 'JEDEC',
  decimalPlaces: 2,
  keepTrailingZeroes: false,
  render: (literal, symbol) => `${literal} ${symbol}B`
})

const handler = async (m, { conn, args, usedPrefix, command }) => {

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.descargas_gdrive

  if (!args[0]) {
    throw `${tradutor.texto1}\n${usedPrefix + command} https://drive.google.com/file/d/ID/view`
  }

  try {

    conn.reply(m.chat, tradutor.texto2, m)

    const res = await GDriveDl(args[0])

    if (!res) throw 'Error downloading file'

    await conn.sendFile(
      m.chat,
      res.downloadUrl,
      res.fileName,
      '',
      m,
      null,
      {
        mimetype: res.mimetype,
        asDocument: true
      }
    )

  } catch (e) {
    console.log(e)
    m.reply(tradutor.texto3)
  }
}

handler.command = /^(gdrive)$/i
export default handler

async function GDriveDl(url) {

  if (!url.match(/drive\.google/i)) throw 'Invalid Google Drive URL'

  const id = (url.match(/\/?id=(.+)/i) || url.match(/\/d\/(.*?)\//))?.[1]

  if (!id) throw 'File ID not found'

  const res = await fetch(`https://drive.google.com/uc?id=${id}&export=download`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'user-agent': 'Mozilla/5.0'
    }
  })

  const json = JSON.parse((await res.text()).slice(4))

  if (!json.downloadUrl) throw 'Download limit reached'

  const data = await fetch(json.downloadUrl)

  if (!data.ok) throw data.statusText

  return {
    downloadUrl: json.downloadUrl,
    fileName: json.fileName,
    fileSize: formatSize(json.sizeBytes),
    mimetype: data.headers.get('content-type')
  }
}
