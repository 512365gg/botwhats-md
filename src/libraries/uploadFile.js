import fetch from 'node-fetch'
import { FormData, Blob } from 'formdata-node'
import { fileTypeFromBuffer } from 'file-type'

/**
 * Upload epheremal file to file.io
 * Expira en 1 día
 * Máx: 100MB
 */
const fileIO = async (buffer) => {
  const type = await fileTypeFromBuffer(buffer) || {}
  const ext = type.ext || 'bin'
  const mime = type.mime || 'application/octet-stream'

  const form = new FormData()
  const blob = new Blob([buffer], { type: mime })

  form.append('file', blob, `tmp.${ext}`)

  const res = await fetch('https://file.io/?expires=1d', {
    method: 'POST',
    body: form
  })

  const json = await res.json()

  if (!json.success) throw json

  return json.link
}

/**
 * Upload a storage.restfulapi.my.id
 */
const RESTfulAPI = async (inp) => {
  const form = new FormData()
  let buffers = Array.isArray(inp) ? inp : [inp]

  for (const buffer of buffers) {
    const blob = new Blob([buffer])
    form.append('file', blob)
  }

  const res = await fetch('https://storage.restfulapi.my.id/upload', {
    method: 'POST',
    body: form
  })

  let json = await res.text()

  try {
    json = JSON.parse(json)

    if (!Array.isArray(inp)) {
      return json.files?.[0]?.url || null
    }

    return json.files.map(v => v.url)

  } catch {
    throw new Error(json)
  }
}

/**
 * Intentar subir a varios servidores
 */
export default async function uploadFile(inp) {
  let err

  for (const uploader of [RESTfulAPI, fileIO]) {
    try {
      return await uploader(inp)
    } catch (e) {
      err = e
    }
  }

  throw err
}
