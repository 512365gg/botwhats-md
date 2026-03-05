import axios from "axios"
import { uploadImage } from "../lib/uploadImage.js"

const handler = async (m, { conn, usedPrefix, command }) => {
try {

const q = m.quoted ? m.quoted : m
const mime = q.mimetype || q.msg?.mimetype || ""

if (!mime || !mime.startsWith("image/")) {
throw `📸 Responde a una imagen con *${usedPrefix + command}*`
}

m.reply("🪄 Mejorando calidad de la imagen...")

const img = await q.download()
const fileUrl = await uploadImage(img)

if (!fileUrl) throw "❌ Error subiendo imagen"

const res = await axios.get(
`https://vihangayt.me/tools/upscale?url=${encodeURIComponent(fileUrl)}`,
{
responseType: "arraybuffer"
}
)

await conn.sendMessage(
m.chat,
{ image: res.data, caption: "✨ Imagen mejorada en HD" },
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
