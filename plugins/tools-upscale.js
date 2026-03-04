import fs from "fs"
import axios from "axios"
import uploadImage from "../src/libraries/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const user = global.db.data.users[m.sender] || {}
    const idioma = user.language || global.defaultLenguaje
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
    const tradutor = _translate.plugins.herramientas_hd

    const q = m.quoted ? m.quoted : m
    const mime = (q.msg || q).mimetype || ""

    if (!mime || !mime.startsWith("image/"))
      throw `${tradutor.texto1} ${usedPrefix + command}`

    m.reply(tradutor.texto3)

    const img = await q.download()
    const fileUrl = await uploadImage(img)

    const { data } = await axios.get(
      `https://api.stellarwa.xyz/tools/upscale?url=${fileUrl}&key=BrunoSobrino`,
      { responseType: "arraybuffer" }
    )

    await conn.sendMessage(
      m.chat,
      { image: Buffer.from(data) },
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
