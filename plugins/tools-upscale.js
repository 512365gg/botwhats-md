import fs from "fs"
import axios from "axios"
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const q = m.quoted ? m.quoted : m
    const mime = q.mimetype || q.msg?.mimetype || ""

    if (!mime.startsWith("image/"))
      throw `Responde a una imagen con ${usedPrefix + command}`

    m.reply("🪄 Mejorando imagen...")

    const img = await q.download()
    const fileUrl = await uploadImage(img)

    if (!fileUrl) throw "Error subiendo imagen"

    const response = await axios.get(
      `https://api.stellarwa.xyz/tools/upscale?url=${fileUrl}&key=BrunoSobrino`,
      { responseType: "arraybuffer", validateStatus: () => true }
    )

    if (response.status !== 200) {
      console.log(response.data.toString())
      throw "La API falló"
    }

    await conn.sendMessage(
      m.chat,
      { image: Buffer.from(response.data) },
      { quoted: m }
    )

  } catch (e) {
    console.error(e)
    m.reply("❌ Error al mejorar la imagen.")
  }
}

handler.help = ["remini", "hd", "enhance"]
handler.tags = ["ai", "tools"]
handler.command = ["remini", "hd", "enhance"]

export default handler
