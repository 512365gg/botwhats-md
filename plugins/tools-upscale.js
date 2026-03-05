import fs from "fs"
import axios from "axios"
import { uploadImage } from "../lib/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const user = global.db.data.users[m.sender] || {}
    const idioma = user.language || global.defaultLenguaje

    const _translate = JSON.parse(
      fs.readFileSync(`./src/languages/${idioma}.json`)
    )
    const tradutor = _translate.plugins.herramientas_hd

    const q = m.quoted ? m.quoted : m
    const mime = q.mimetype || q.msg?.mimetype || ""

    if (!mime || !mime.startsWith("image/")) {
      throw `${tradutor.texto1 || "Responde a una imagen"} ${usedPrefix + command}`
    }

    m.reply(tradutor.texto3 || "🪄 Mejorando imagen...")

    const img = await q.download()
    const fileUrl = await uploadImage(img)

    if (!fileUrl) throw "Error subiendo imagen"

    const response = await axios.get(
      `https://api.stellarwa.xyz/tools/upscale?url=${fileUrl}&key=BrunoSobrino`,
      {
        responseType: "arraybuffer",
        validateStatus: () => true
      }
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
