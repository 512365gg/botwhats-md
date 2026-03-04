import fetch from 'node-fetch'
import { FormData, Blob } from 'formdata-node'
import { fileTypeFromBuffer } from 'file-type'

export default async function uploadImage(buffer) {
  const fileType = await fileTypeFromBuffer(buffer)
  if (!fileType) throw new Error('No se pudo detectar el tipo de archivo')

  const { ext, mime } = fileType

  const form = new FormData()
  const blob = new Blob([buffer], { type: mime })

  form.append('fileToUpload', blob, `tmp.${ext}`)
  form.append('reqtype', 'fileupload')

  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form
  })

  const result = await res.text()

  if (!result.startsWith('https://files.catbox.moe/')) {
    console.log(result)
    throw new Error('Error subiendo a Catbox')
  }

  return result.trim()
}
