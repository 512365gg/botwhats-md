import fetch from 'node-fetch'
import { FormData, Blob } from 'formdata-node'
import { fileTypeFromBuffer } from 'file-type'

export default async function uploadImage(buffer) {
  try {
    const type = await fileTypeFromBuffer(buffer)
    if (!type) throw new Error('No se pudo detectar el tipo de archivo')

    const { ext, mime } = type

    const form = new FormData()
    const blob = new Blob([buffer], { type: mime })

    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', blob, `upload.${ext}`)

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: form
    })

    const text = await response.text()

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${text}`)
    }

    if (!text.startsWith('https://')) {
      throw new Error(`Respuesta inválida de Catbox: ${text}`)
    }

    return text.trim()

  } catch (err) {
    console.error('Error en uploadImage:', err)
    throw err
  }
}
