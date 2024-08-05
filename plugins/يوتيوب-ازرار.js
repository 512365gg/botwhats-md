import ytSearch from 'yt-search';
const {
  generateWAMessageContent,
  generateWAMessageFromContent,
  proto
} = (await import("@whiskeysockets/baileys")).default;

let handler = async (message, { conn, text, usedPrefix, command }) => {

  if (!text) {
    return conn.reply(message.chat, `[❗] @${message.sender.split('@')[0]} *شكلك نسيت تحط نص*\n> ادخل نصا لاستطيع البحث في يوتيوب`, message);
  }

  async function fetchVideo(url) {
    const apiUrls22 = [
      `https://api.cafirexos.com/api/v1/ytmp4?url=${url}`,
      `https://api.cafirexos.com/api/v2/ytmp4?url=${url}`,
      `https://api-brunosobrino.onrender.com/api/v1/ytmp4?url=${url}&apikey=BrunoSobrino`,
      `https://api-brunosobrino.onrender.com/api/v2/ytmp4?url=${url}&apikey=BrunoSobrino`,
      `https://api-brunosobrino-dcaf9040.koyeb.app/api/v1/ytmp4?url=${url}`,
      `https://api-brunosobrino-dcaf9040.koyeb.app/api/v2/ytmp4?url=${url}`
    ];

    for (const apiUrl of apiUrls22) {
      try {
        const response = await fetch(apiUrl);
        if (response.ok) {
          const jsonResponse = await response.json();
          if (jsonResponse.result && jsonResponse.result.url) {
            return jsonResponse.result.url;
          }
        }
      } catch (error) {
        console.log(`Error fetching from ${apiUrl}: ${error.message}`);
      }
    }
    throw new Error("Failed to fetch video from all APIs.");
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  try {
    let results = [];
    let searchResults = await ytSearch(text);
    let videos = searchResults.videos.slice(0, 5);

    shuffleArray(videos);

    for (let video of videos) {
      let videoUrl;
      try {
        videoUrl = await fetchVideo(video.url);
      } catch (error) {
        console.log(`Failed to fetch video for ${video.title}: ${error.message}`);
        continue;
      }

      const { videoMessage } = await generateWAMessageContent({
        video: { url: videoUrl }
      }, {
        upload: conn.waUploadToServer
      });

      results.push({
        'body': proto.Message.InteractiveMessage.Body.fromObject({
          'text': video.title
        }),
        'footer': proto.Message.InteractiveMessage.Footer.fromObject({
          'text': "𝐆𝐎𝐉𝐎⚡𝐁𝐎𝐓"
        }),
        'header': proto.Message.InteractiveMessage.Header.fromObject({
          'title': '',
          'hasMediaAttachment': true,
          'videoMessage': videoMessage.videoMessage
        }),
        'nativeFlowMessage': proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          'buttons': [{
            'name': "cta_url",
            'buttonParamsJson': JSON.stringify({
              "display_text": "Watch Video 📹",
              "url": videoUrl
            })
          }]
        })
      });
    }

    const messageContent = generateWAMessageFromContent(message.chat, proto.Message.fromObject({
      'viewOnceMessage': {
        'message': {
          'messageContextInfo': {
            'deviceListMetadata': {},
            'deviceListMetadataVersion': 2
          },
          'interactiveMessage': proto.Message.InteractiveMessage.fromObject({
            'body': proto.Message.InteractiveMessage.Body.fromObject({
              'text': "[❗] النتيجه لي ❤🎦 : " + text
            }),
            'footer': proto.Message.InteractiveMessage.Footer.fromObject({
              'text': "🔎 `Y O U T U B E - S E A R C H`"
            }),
            'header': proto.Message.InteractiveMessage.Header.fromObject({
              'hasMediaAttachment': false
            }),
            'carouselMessage': proto.Message.InteractiveMessage.CarouselMessage.fromObject({
              'cards': results
            })
          })
        }
      }
    }), {
      'quoted': message
    });

    await conn.relayMessage(message.chat, messageContent.message, { 'messageId': messageContent.key.id });
  } catch (error) {
    console.log(error);
    throw `حدث خطأ أثناء المعالجة.`;
  }
};

handler.help = ["youtube"];
handler.tags = ["downloader"];
handler.command = /^(تيوبي)$/i;

export default handler;
