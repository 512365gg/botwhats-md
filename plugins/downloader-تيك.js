
import fetch from 'node-fetch';
import fs from 'fs';

let handler = async (m, { conn, usedPrefix, args, command, text }) => {
  if (!text) throw `*⌬┇━───╌ •⤣⚡⤤• ──╌─━┇⌬*\n*يرجى استخدام الأمر مع رابط فيديو من تيك توك*\nمثال: ${usedPrefix + command} https://vt.tiktok.com/ZSY7P6j5Q/\n*❐━═⏣⊰𝐆𝐎𝐉𝐎⚡𝐁𝐎𝐓⊱⏣═━❐*`;
    ('⏳');

  try {
    let mediaURL = await zoro(text);

    if (!mediaURL) throw '❮ ❌ ┇ حدث خطأ  ❯';

    conn.sendFile(m.chat, mediaURL, '', '❮ ✅ ┇ تم تحميل الفيديو بنجاح ❯\n> أنا لا أتحمل ذنوب ما تشاهده أو تسمعه', m, false, { mimetype: 'video/mp4' });
  } catch (error) {
    throw `❮ ❌ ┇ حدث خطأ ما في تحميل الفيديو ❯`;
  }
};

async function zoro(text) {
  let res = await fetch(`https://zoro-api-zoro-bot-5b28aebf.koyeb.app/api/tiktok?url=${encodeURIComponent(text)}`);
  if (!res.ok) return false;

  const fileName = 'Zoro_tiktok_video.mp4';
  const fileStream = fs.createWriteStream(fileName);
  res.body.pipe(fileStream);

  await new Promise((resolve, reject) => {
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });

  return fileName;
}

handler.help = ['tiktok'];
handler.tags = ['downloader'];
handler.command = /^(tiktokdl|tt|تيكتوك|تيك)$/i;

export default handler;
