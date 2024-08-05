import path from 'path'  
import { toAudio } from './converter.js'
import chalk from 'chalk'
import fetch from 'node-fetch'
import PhoneNumber from 'awesome-phonenumber'
import fs from 'fs'
import util from 'util'
import { fileTypeFromBuffer } from 'file-type' 
import { format } from 'util'
import { fileURLToPath } from 'url'
import store from './store.js'
import Jimp from 'jimp'  
import pino from 'pino'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** 
 * @type {import('@adiwajshing/baileys')}
 */
const {
    default: _makeWaSocket,
    makeWALegacySocket,
    proto,
    downloadContentFromMessage,
    jidDecode,
    areJidsSameUser,
    generateWAMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    WAMessageStubType,
    extractMessageContent,
    makeInMemoryStore,
    getAggregateVotesInPollMessage, 
    prepareWAMessageMedia,
    WA_DEFAULT_EPHEMERAL
} = (await import('@whiskeysockets/baileys')).default

export function makeWASocket(connectionOptions, options = {}) {
    /**
     * @type {import('@adiwajshing/baileys').WASocket | import('@adiwajshing/baileys').WALegacySocket}
     */
    let conn = (global.opts['legacy'] ? makeWALegacySocket : _makeWaSocket)(connectionOptions)

    let sock = Object.defineProperties(conn, {
        chats: {
            value: { ...(options.chats || {}) },
            writable: true
        },
        decodeJid: {
            value(jid) {
                if (!jid || typeof jid !== 'string') return (!nullish(jid) && jid) || null
                return jid.decodeJid()
            }
        },
        logger: {
            get() {
                return {
                    info(...args) {
                        console.log(
                            chalk.bold.bgRgb(51, 204, 51)('INFO '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.cyan(format(...args))
                        )
                    },
                    error(...args) {
                        console.log(
                            chalk.bold.bgRgb(247, 38, 33)('ERROR '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.rgb(255, 38, 0)(format(...args))
                        )
                    },
                    warn(...args) {
                        console.log(
                            chalk.bold.bgRgb(255, 153, 0)('WARNING '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.redBright(format(...args))
                        )
                    },
                    trace(...args) {
                        console.log(
                            chalk.grey('TRACE '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.white(format(...args))
                        )
                    },
                    debug(...args) {
                        console.log(
                            chalk.bold.bgRgb(66, 167, 245)('DEBUG '),
                            `[${chalk.rgb(255, 255, 255)(new Date().toUTCString())}]:`,
                            chalk.white(format(...args))
                        )
                    }
                }
            },
            enumerable: true
        },
        //GataBot
        sendGataBot: {
    async value(jid, text = '', buffer, title, body, url, quoted, options) {
    if (buffer) try { (type = await conn.getFile(buffer), buffer = type.data) } catch { buffer = buffer }
	let prep = generateWAMessageFromContent(jid, { extendedTextMessage: { text: text, contextInfo: { externalAdReply: { title: title, body: body, thumbnail: buffer, sourceUrl: url }, mentionedJid: await conn.parseMention(text) }}}, { quoted: quoted })
    return conn.relayMessage(jid, prep.message, { messageId: prep.key.id })
}
},
        sendPayment: {
           async value(jid, amount, text, quoted, options) {
               conn.relayMessage(jid,  {
             requestPaymentMessage: {
             currencyCodeIso4217: 'PEN',
             amount1000: amount,
             requestFrom: null,
             noteMessage: {
           extendedTextMessage: {
             text: text,
           contextInfo: {
           externalAdReply: {
             showAdAttribution: true
           }, mentionedJid: conn.parseMention(text) }}}}}, {})}
      },        
        getFile: {
            /**
             * getBuffer hehe
             * @param {fs.PathLike} PATH 
             * @param {Boolean} saveToFile
             */
            async value(PATH, saveToFile = false) {
                let res, filename
                const data = Buffer.isBuffer(PATH) ? PATH : PATH instanceof ArrayBuffer ? PATH.toBuffer() : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
                if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
                const type = await fileTypeFromBuffer(data) || {
                    mime: 'application/octet-stream',
                    ext: '.bin'
                }
                if (data && saveToFile && !filename) (filename = path.join(__dirname, '../tmp/' + new Date * 1 + '.' + type.ext), await fs.promises.writeFile(filename, data))
                return {
                    res,
                    filename,
                    ...type,
                    data,
                    deleteFile() {
                        return filename && fs.promises.unlink(filename)
                    }
                }
            },
            enumerable: true
        },
        waitEvent: {
            /**
             * waitEvent
             * @param {String} eventName 
             * @param {Boolean} is 
             * @param {Number} maxTries 
             */
            value(eventName, is = () => true, maxTries = 25) { //Idk why this exist?
                return new Promise((resolve, reject) => {
                    let tries = 0
                    let on = (...args) => {
                        if (++tries > maxTries) reject('Max tries reached')
                        else if (is()) {
                            conn.ev.off(eventName, on)
                            resolve(...args)
                        }
                    }
                    conn.ev.on(eventName, on)
                })
            }
        },   
	sendContact: {
            /**
             * Send Contact
             * @param {String} jid 
             * @param {String[][]|String[]} data
             * @param {import('@adiwajshing/baileys').proto.WebMessageInfo} quoted 
             * @param {Object} options 
             */
            async value(jid, data, quoted, options) {
                if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data]
                let contacts = []
                for (let [number, name] of data) {
                    number = number.replace(/[^0-9]/g, '')
                    let njid = number + '@s.whatsapp.net'
                    let biz = await conn.getBusinessProfile(njid).catch(_ => null) || {}
                    let vcard = `
BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, '\\n')};;;
FN:${name.replace(/\n/g, '\\n')}
TEL;type=CELL;type=VOICE;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}${biz.description ? `
X-WA-BIZ-NAME:${(conn.chats[njid]?.vname || conn.getName(njid) || name).replace(/\n/, '\\n')}
X-WA-BIZ-DESCRIPTION:${biz.description.replace(/\n/g, '\\n')}
`.trim() : ''}
END:VCARD
        `.trim()
                    contacts.push({ vcard, displayName: name })

                }
                return await conn.sendMessage(jid, {
                    ...options,
                    contacts: {
                        ...options,
                        displayName: (contacts.length >= 2 ? `${contacts.length} kontak` : contacts[0].displayName) || null,
                        contacts,
                    }
                }, { quoted, ...options })
            },
            enumerable: true
        },
        resize: {
        	value(buffer, ukur1, ukur2) {
        	return new Promise(async(resolve, reject) => {
        var baper = await Jimp.read(buffer)
        var ab = await baper.resize(ukur1, ukur2).getBufferAsync(Jimp.MIME_JPEG)
        resolve(ab)
       })
      }
    },
	    
        relayWAMessage: {
            async value (pesanfull) {
                    if (pesanfull.message.audioMessage) {
                        await conn.sendPresenceUpdate('recording', pesanfull.key.remoteJid)
                    } else {
                        await conn.sendPresenceUpdate('composing', pesanfull.key.remoteJid)
                    }
                    var mekirim = await conn.relayMessage(pesanfull.key.remoteJid, pesanfull.message, { messageId: pesanfull.key.id })
                    conn.ev.emit('messages.upsert', { messages: [pesanfull], type: 'append' });
                    return mekirim
                }
        },
    /**
    * Send a list message
    * @param jid the id to send to
    * @param button the optional button text, title and description button
    * @param rows the rows of sections list message
    */
    sendListM: {
    async value(jid, button, rows, quoted, options = {}) {
	let fsizedoc = '1'.repeat(10)    
        const sections = [
            {
                title: button.title,
                rows: [...rows]
            }
        ]
        const listMessage = {
            text: button.description,
            footer: button.footerText,
            mentions: await conn.parseMention(button.description),
            ephemeralExpiration: '86400',
            title: '',
            buttonText:button.buttonText,
            sections
        }
        conn.sendMessage(jid, listMessage, {
            quoted,
            ephemeralExpiration: fsizedoc,
            contextInfo: {
                forwardingScore: fsizedoc,
                isForwarded: true,
                mentions: await conn.parseMention(button.description + button.footerText),
                ...options
            }
        })
      }
    },	
 
        sendList: {
            async value(jid, title, text, footer, buttonText, buffer, listSections, quoted, options) {
     if (buffer) try { (type = await conn.getFile(buffer), buffer = type.data) } catch { buffer = buffer }
                if (buffer && !Buffer.isBuffer(buffer) && (typeof buffer === 'string' || Array.isArray(buffer))) (options = quoted, quoted = listSections, listSections = buffer, buffer = null)
                if (!options) options = {}
                // send a list message!
                const sections = listSections.map(([title, rows]) => ({
                    title: !nullish(title) && title || !nullish(rowTitle) && rowTitle || '',
                    rows: rows.map(([rowTitle, rowId, description]) => ({
                        title: !nullish(rowTitle) && rowTitle || !nullish(rowId) && rowId || '',
                        rowId: !nullish(rowId) && rowId || !nullish(rowTitle) && rowTitle || '',
                        description: !nullish(description) && description || ''
                    }))
                }))

                const listMessage = {
                    text,
                    footer,
                    title,
                    buttonText,
                    sections
                }
                return await conn.sendMessage(jid, listMessage, {
                    quoted,
                    upload: conn.waUploadToServer,
                   contextInfo: {
          mentionedJid: await conn.parseMention(text),
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: '120363236795889672@newsletter',
            newsletterName: '『🇵🇸⤥Anime⊰❄️⊱World⤦🇯🇵』', 
            serverMessageId: '' }, 
                ...options
                }
                })
            }
        },   
        
	/**
     * Send Contact Array
     * @param {String} jid 
     * @param {String} number 
     * @param {String} name 
     * @param {Object} quoted 
     * @param {Object} options 
     */	    
sendContactArray: {
  async value(jid, data, quoted, options) {
    if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data]
    let contacts = []
    let buttons = []
    for (let [number, name, isi, isi1, isi2, isi3, isi4, isi5, ...extraLinks] of data) {
      number = number.replace(/[^0-9]/g, '')
      let njid = number + '@s.whatsapp.net'
      let biz = await conn.getBusinessProfile(njid).catch(_ => null) || {};
      let vcard = `
BEGIN:VCARD
VERSION:3.0
N:Sy;Bot;;;
FN:${name.replace(/\n/g, '\\n')}
item.ORG:${isi}
item1.TEL;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}
item1.X-ABLabel:${isi1}
${isi2 ? `item2.EMAIL;type=INTERNET:${isi2}\nitem2.X-ABLabel:📧 Email` : ''}
${isi3 ? `item3.ADR:;;${isi3};;;;\nitem3.X-ABADR:ac \nitem3.X-ABLabel:📍 Region` : ''}
${isi4 ? `item4.URL;type=pref:${isi4}\nitem4.X-ABLabel:Website` : ''}
${extraLinks.map((link, index) => link ? `item${index + 5}.URL;type=pref:${link}\nitem${index + 5}.X-ABLabel:Extra Link ${index + 1}` : '').join('\n')}
${isi5 ? `${extraLinks.length > 0 ? `item${extraLinks.length + 5}` : 'item5'}.X-ABLabel:${isi5}` : ''}
END:VCARD`.trim()

      let newButtons = extraLinks.map((link, index) => ({
        buttonId: `extra-link-${index + 1}`,
        buttonText: { displayText: `Extra Link ${index + 1}` },
        type: 1,
        url: `http://${link}`
      }))
      buttons.push(...newButtons)

      contacts.push({ vcard, displayName: name })
    }

    let displayName = null
    if (contacts.length === 1) {
      displayName = contacts[0].displayName
    } else if (contacts.length > 1) {
      displayName = `${contacts.length} kontak`
    }

    let contactsWithButtons = []
    for (let i = 0; i < contacts.length; i++) {
      let contact = contacts[i]
      let contactButtons = buttons.filter(button => button.buttonId.startsWith(`extra-link-${i + 1}`))
      contactsWithButtons.push({ ...contact, ...{ buttons: contactButtons } })
    }

    return await conn.sendMessage(jid, {
      contacts: {
        displayName,
        contacts: contactsWithButtons
      }
    }, {
      quoted,
      ...options
    })
  }
},
 
        sendFile: {
            /**
             * Send Media/File with Automatic Type Specifier
             * @param {String} jid
             * @param {String|Buffer} path
             * @param {String} filename
             * @param {String} caption
             * @param {import('@adiwajshing/baileys').proto.WebMessageInfo} quoted
             * @param {Boolean} ptt
             * @param {Object} options
             */
            async value(jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) {
                let type = await conn.getFile(path, true)
                let { res, data: file, filename: pathFile } = type
                if (res && res.status !== 200 || file.length <= 65536) {
                    try { throw { json: JSON.parse(file.toString()) } }
                    catch (e) { if (e.json) throw e.json }
                }
                //const fileSize = fs.statSync(pathFile).size / 1024 / 1024
                //if (fileSize >= 100) throw new Error('File size is too big!')
                let opt = {}
                if (quoted) opt.quoted = quoted
                if (!type) options.asDocument = true
                let mtype = '', mimetype = options.mimetype || type.mime, convert
                if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'
                else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'
                else if (/video/.test(type.mime)) mtype = 'video'
                else if (/audio/.test(type.mime)) (
                    convert = await toAudio(file, type.ext),
                    file = convert.data,
                    pathFile = convert.filename,
                    mtype = 'audio',
                    mimetype = options.mimetype || 'audio/ogg; codecs=opus'
                )
                else mtype = 'document'
                if (options.asDocument) mtype = 'document'

                delete options.asSticker
                delete options.asLocation
                delete options.asVideo
                delete options.asDocument
                delete options.asImage

                let message = {
                    ...options,
                    caption,
                    ptt,
                    [mtype]: { url: pathFile },
                    mimetype,
                    fileName: filename || pathFile.split('/').pop()
                }
                /**
                 * @type {import('@adiwajshing/baileys').proto.WebMessageInfo}
                 */
                let m
                try {
                    m = await conn.sendMessage(jid, message, { ...opt, ...options })
                } catch (e) {
                    console.error(e)
                    m = null
                } finally {
                    if (!m) m = await conn.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options })
                    file = null // releasing the memory
                    return m
                }
            },
            enumerable: true
        }, 

reply: {
/**
* Reply to a message
* @param {String} jid
* @param {String|Buffer} text
* @param {import('@adiwajshing/baileys').proto.WebMessageInfo} quoted
* @param {Object} options
*/

async value(jid, text = '', quoted, options) {
if (Buffer.isBuffer(text)) {
return conn.sendFile(jid, text, 'file', '', quoted, false, options)
} else {
let canalId = ["120363236795889672@newsletter", "120363236795889672@newsletter", "120363236795889672@newsletter", "120363236795889672@newsletter"]
let canalNombre = ["『🇵🇸⤥Anime⊰❄️⊱World⤦🇯🇵』", "『🇵🇸⤥Anime⊰❄️⊱World⤦🇯🇵』", "『🇵🇸⤥Anime⊰❄️⊱World⤦🇯🇵』", "『🇵🇸⤥Anime⊰❄️⊱World⤦🇯🇵』"]

async function getRandomChannel() {
let randomIndex = Math.floor(Math.random() * canalId.length)
let id = canalId[randomIndex]
let nombre = canalNombre[randomIndex]
return { id, nombre }
} 
	
let randomChannel = await getRandomChannel()
const contextInfo = {
mentionedJid: await conn.parseMention(text),
isForwarded: true,
forwardingScore: 1, 
forwardedNewsletterMessageInfo: {
newsletterJid: randomChannel.id, 
newsletterName: randomChannel.nombre, 
serverMessageId: ''
}}
        
const messageOptions = { ...options, text, contextInfo }
return conn.sendMessage(jid, messageOptions, { quoted, ...options })
}}
},
	    
      /** Resize Image
      *
      * @param {Buffer} Buffer (Only Image)
      * @param {Numeric} Width
      * @param {Numeric} Height
      */
      resize: {
      async value(image, width, height) {
       let oyy = await Jimp.read(image)
       let kiyomasa = await oyy.resize(width, height).getBufferAsync(Jimp.MIME_JPEG)
       return kiyomasa
      }
    },
    /** Profile Image
      *
      * @param {Buffer} Buffer (Only Image)
      * @param {Numeric} Width
      * @param {Numeric} Height
      */
    generateProfilePicture: {
    async value(buffer) {
	const jimp_1 = await Jimp.read(buffer);
	const resz = jimp_1.getWidth() > jimp_1.getHeight() ? jimp_1.resize(550, Jimp.AUTO) : jimp_1.resize(Jimp.AUTO, 650)
	const jimp_2 = await Jimp.read(await resz.getBufferAsync(Jimp.MIME_JPEG));
	return {
	  img: await resz.getBufferAsync(Jimp.MIME_JPEG)
	}}
	},
	
	    /**
     * send Button Img
     * @param {String} jid 
     * @param {String} contentText 
     * @param {String} footer
     * @param {Buffer|String} buffer 
     * @param {String[]} buttons
     * @param {Object} quoted 
     * @param {Object} options 
     */
    sendButtonImg: {
    async value(jid, buffer, contentText, footerText, button1, id1, quoted, options) {
        let type = await conn.getFile(buffer)
        let { res, data: file } = type
        if (res && res.status !== 200 || file.length <= 65536) {
        try { throw { json: JSON.parse(file.toString()) } }
        catch (e) { if (e.json) throw e.json }
        }
        const buttons = [
        { buttonId: id1, buttonText: { displayText: button1 }, type: 1 }
        ]

        const buttonMessage = {
            image: file,
            fileLength: 800000000000000,
            caption: contentText,
            footer: footerText,
            mentions: await conn.parseMention(contentText + footerText),
            ...options,
            buttons: buttons,
            headerType: 4
        }

        return conn.sendMessage(jid, buttonMessage, { quoted, ephemeralExpiration: 86400, contextInfo: { mentionedJid: conn.parseMention(contentText + footerText) }, ...options })
    }},
	    
/**
     * send Button Vid
     * @param {String} jid 
     * @param {String} contentText 
     * @param {String} footer
     * @param {Buffer|String} buffer
     * @param {String} buttons1
     * @param {String} row1
     * @param {Object} quoted 
     * @param {Object} options 
     */
    send1ButtonVid: {
    async value(jid, buffer, contentText, footerText, button1, id1, quoted, options) {
        let type = await conn.getFile(buffer)
        let { res, data: file } = type
        if (res && res.status !== 200 || file.length <= 65536) {
        try { throw { json: JSON.parse(file.toString()) } }
        catch (e) { if (e.json) throw e.json }
        }
        let buttons = [
        { buttonId: id1, buttonText: { displayText: button1 }, type: 1 }
        ]
        const buttonMessage = {
            video: file,
            fileLength: 800000000000000,
            caption: contentText,
            footer: footerText,
            mentions: await conn.parseMention(contentText),
            ...options,
            buttons: buttons,
            headerType: 4
        }
        return conn.sendMessage(jid, buttonMessage, {
            quoted,
            ephemeralExpiration: 86400,
            ...options
        })
    }},
	    
send2ButtonVid: {
    async value(jid, buffer, contentText, footerText, button1, id1, button2, id2, quoted, options) {
        let type = await conn.getFile(buffer)
        let { res, data: file } = type
        if (res && res.status !== 200 || file.length <= 65536) {
        try { throw { json: JSON.parse(file.toString()) } }
        catch (e) { if (e.json) throw e.json }
        }
        let buttons = [
        { buttonId: id1, buttonText: { displayText: button1 }, type: 1 },
        { buttonId: id2, buttonText: { displayText: button2 }, type: 1 }
        ]
        const buttonMessage = {
            video: file,
            fileLength: 800000000000000,
            caption: contentText,
            footer: footerText,
            mentions: await conn.parseMention(contentText + footerText),
            ...options,
            buttons: buttons,
            headerType: 4
        }
        return conn.sendMessage(jid, buttonMessage, {
            quoted,
            ephemeralExpiration: 86400,
            ...options
        })
    }},

sendButtonLoc: {
                            /**
     * send Button Loc
     * @param {String} jid 
     * @param {String} contentText
     * @param {String} footer
     * @param {Buffer|String} buffer
     * @param {String[]} buttons 
     * @param {Object} quoted 
     * @param {Object} options 
     */
                        async value (jid, buffer, content, footer, button1, row1, quoted, options = {}) {
                            let type = await conn.getFile(buffer)
                            let { res, data: file } = type
                            if (res && res.status !== 200 || file.length <= 65536) {
                            try { throw { json: JSON.parse(file.toString()) } }
                            catch (e) { if (e.json) throw e.json }
                            }
                            let buttons = [
                            { buttonId: row1, buttonText: { displayText: button1 }, type: 1 }
                            ]
                        
                            let buttonMessage = {
                                location: { jpegThumbnail: file },
                                caption: content,
                                footer: footer,
                                mentions: await conn.parseMention(content + footer),
                                ...options,
                                buttons: buttons,
                                headerType: 6
                            }
                            return await  conn.sendMessage(jid, buttonMessage, {
                                quoted,
                                upload: conn.waUploadToServer,
                                ephemeralExpiration: global.ephemeral,
                                mentions: await conn.parseMention(content + footer),
                                ...options})}
                        },

    /** This Section **/
    sendButtonVid: {
    async value(jid, buffer, contentText, footerText, button1, id1, button2, id2, button3, id3, quoted, options) {
        let type = await conn.getFile(buffer)
        let { res, data: file } = type
        if (res && res.status !== 200 || file.length <= 65536) {
        try { throw { json: JSON.parse(file.toString()) } }
        catch (e) { if (e.json) throw e.json }
        }
        let buttons = [
        { buttonId: id1, buttonText: { displayText: button1 }, type: 1 },
        { buttonId: id2, buttonText: { displayText: button2 }, type: 1 },
        { buttonId: id3, buttonText: { displayText: button3 }, type: 1 },
        ]
        const buttonMessage = {
            video: file,
            fileLength: 800000000000000,
            caption: contentText,
            footer: footerText,
            mentions: await conn.parseMention(contentText + footerText),
            ...options,
            buttons: buttons,
            headerType: 4
        }
        return conn.sendMessage(jid, buttonMessage, {
            quoted,
            ephemeralExpiration: 86400,
            ...options
        })
    }},

/** This Section **/
    sendTemplateButtonLoc: {
    async value(jid, buffer, contentText, footer, buttons1, row1, quoted, options) {
        let file = await conn.resize(buffer, 300, 150)
    const template = generateWAMessageFromContent(jid, proto.Message.fromObject({
      templateMessage: {
        hydratedTemplate: {
          locationMessage: { jpegThumbnail: file },
          hydratedContentText: contentText,
          hydratedFooterText: footer,
          ...options,
          hydratedButtons: [{
            urlButton: {
              displayText: global.author,
              url: global.md
            }
          },
          {
            quickReplyButton: {
              displayText: buttons1,
              id: row1
            }
          }]
        }
      }
    }), { userJid: conn.user.jid, quoted: quoted, contextInfo: { mentionedJid: conn.parseMention(contentText + footer) }, ephemeralExpiration: "86400", ...options });
    return conn.relayMessage(
      jid,
      template.message,
      { messageId: template.key.id }
    )
  }},
	    
sendGroupV4Invite: {
            /**
             * sendGroupV4Invite
             * @param {String} jid 
             * @param {*} participant 
             * @param {String} inviteCode 
             * @param {Number} inviteExpiration 
             * @param {String} groupName 
             * @param {String} caption 
             * @param {Buffer} jpegThumbnail
             * @param {*} options 
             */
            async value(jid, participant, inviteCode, inviteExpiration, groupName = 'unknown subject', caption = 'Invitation to join my WhatsApp group', jpegThumbnail, options = {}) {
                const msg = proto.Message.fromObject({
                    groupInviteMessage: proto.GroupInviteMessage.fromObject({
                        inviteCode,
                        inviteExpiration: parseInt(inviteExpiration) || + new Date(new Date + (3 * 86400000)),
                        groupJid: jid,
                        groupName: (groupName ? groupName : await conn.getName(jid)) || null,
                        jpegThumbnail: Buffer.isBuffer(jpegThumbnail) ? jpegThumbnail : null,
                        caption
                    })
                })
                const message = generateWAMessageFromContent(participant, msg, options)
                await conn.relayMessage(participant, message.message, { messageId: message.key.id, additionalAttributes: { ...options } })
                return message
            },
            enumerable: true
        },

     /**
     * Send nativeFlowMessage
     */
    sendButtonMessages: {
      async value(jid, messages, quoted, options) {
        messages.length > 1 ? await conn.sendCarousel(jid, messages, quoted, options) : await conn.sendNCarousel(
          jid, ...messages[0], quoted, options);
      }
    }, 

    /**
     * Send nativeFlowMessage
     */
    sendNCarousel: {
      async value(jid, text = '', footer = '', buffer, buttons, copy, urls, list, quoted, options) {
        let img, video;
        if (buffer) {
          if (/^https?:\/\//i.test(buffer)) {
            try {
              const response = await fetch(buffer);
              const contentType = response.headers.get('content-type');
              if (/^image\//i.test(contentType)) {
                img = await prepareWAMessageMedia({
                  image: {
                    url: buffer
                  }
                }, {
                  upload: conn.waUploadToServer,
                  ...options
                });
              } else if (/^video\//i.test(contentType)) {
                video = await prepareWAMessageMedia({
                  video: {
                    url: buffer
                  }
                }, {
                  upload: conn.waUploadToServer,
                  ...options
                });
              } else {
                console.error("Incompatible MIME type:", contentType);
              }
            } catch (error) {
              console.error("Failed to get MIME type:", error);
            }
          } else {
            try {
              const type = await conn.getFile(buffer);
              if (/^image\//i.test(type.mime)) {
                img = await prepareWAMessageMedia({
                  image: (/^https?:\/\//i.test(buffer)) ? {
                    url: buffer
                  } : (type && type?.data)
                }, {
                  upload: conn.waUploadToServer,
                  ...options
                });
              } else if (/^video\//i.test(type.mime)) {
                video = await prepareWAMessageMedia({
                  video: (/^https?:\/\//i.test(buffer)) ? {
                    url: buffer
                  } : (type && type?.data)
                }, {
                  upload: conn.waUploadToServer,
                  ...options
                });
              }
            } catch (error) {
              console.error("Failed to get file type:", error);
            }
          }
        }
        const dynamicButtons = buttons.map(btn => ({
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: btn[0],
            id: btn[1]
          }),
        }));
        dynamicButtons.push(
          (copy && (typeof copy === 'string' || typeof copy === 'number')) ? {
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
              display_text: 'Copy',
              copy_code: copy
            })
          } : null);
        urls?.forEach(url => {
          dynamicButtons.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: url[0],
              url: url[1],
              merchant_url: url[1]
            })
          });
        });
        list?.forEach(lister => {
          dynamicButtons.push({
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: lister[0],
              sections: lister[1]
            })
          });
        })
        const interactiveMessage = {
          body: {
            text: text || ''
          },
          footer: {
            text: footer || wm
          },
          header: {
            hasMediaAttachment: img?.imageMessage || video?.videoMessage ? true : false,
            imageMessage: img?.imageMessage || null,
            videoMessage: video?.videoMessage || null
          },
          nativeFlowMessage: {
            buttons: dynamicButtons.filter(Boolean),
            messageParamsJson: ''
          },
          ...Object.assign({
            mentions: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
            contextInfo: {
              mentionedJid: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
            }
          }, {
            ...(options || {}),
            ...(conn.temareply?.contextInfo && {
              contextInfo: {
                ...(options?.contextInfo || {}),
                ...conn.temareply?.contextInfo,
                externalAdReply: {
                  ...(options?.contextInfo?.externalAdReply || {}),
                  ...conn.temareply?.contextInfo?.externalAdReply,
                },
              },
            })
          })
        };
        const messageContent = proto.Message.fromObject({
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2
              },
              interactiveMessage
            }
          }
        });
        const msgs = await generateWAMessageFromContent(jid, messageContent, {
          userJid: conn.user.jid,
          quoted: quoted,
          upload: conn.waUploadToServer,
          ephemeralExpiration: WA_DEFAULT_EPHEMERAL
        });
        await conn.relayMessage(jid, msgs.message, {
          messageId: msgs.key.id
        });
      }
    }, 
    /**
     * Send carouselMessage
     */
    sendCarousel: {
      async value(jid, text = '', footer = '', text2 = '', messages, quoted, options) {
        if (messages.length > 1) {
          const cards = await Promise.all(messages.map(async ([text = '', footer = '', buffer, buttons, copy,
            urls, list
          ]) => {
            let img, video;
            if (/^https?:\/\//i.test(buffer)) {
              try {
                const response = await fetch(buffer);
                const contentType = response.headers.get('content-type');
                if (/^image\//i.test(contentType)) {
                  img = await prepareWAMessageMedia({
                    image: {
                      url: buffer
                    }
                  }, {
                    upload: conn.waUploadToServer,
                    ...options
                  });
                } else if (/^video\//i.test(contentType)) {
                  video = await prepareWAMessageMedia({
                    video: {
                      url: buffer
                    }
                  }, {
                    upload: conn.waUploadToServer,
                    ...options
                  });
                } else {
                  console.error("Incompatible MIME types:", contentType);
                }
              } catch (error) {
                console.error("Failed to get MIME type:", error);
              }
            } else {
              try {
                const type = await conn.getFile(buffer);
                if (/^image\//i.test(type.mime)) {
                  img = await prepareWAMessageMedia({
                    image: (/^https?:\/\//i.test(buffer)) ? {
                      url: buffer
                    } : (type && type?.data)
                  }, {
                    upload: conn.waUploadToServer,
                    ...options
                  });
                } else if (/^video\//i.test(type.mime)) {
                  video = await prepareWAMessageMedia({
                    video: (/^https?:\/\//i.test(buffer)) ? {
                      url: buffer
                    } : (type && type?.data)
                  }, {
                    upload: conn.waUploadToServer,
                    ...options
                  });
                }
              } catch (error) {
                console.error("Failed to get file type:", error);
              }
            }
            const dynamicButtons = buttons.map(btn => ({
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: btn[0],
                id: btn[1]
              }),
            }));
	    copy = Array.isArray(copy) ? copy : [copy]
	    copy.map(copy => {
                dynamicButtons.push({
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Copy',
                        copy_code: copy[0]
                    })
                });
            });
            urls?.forEach(url => {
              dynamicButtons.push({
                name: 'cta_url',
                buttonParamsJson: JSON.stringify({
                  display_text: url[0],
                  url: url[1],
                  merchant_url: url[1]
                })
              });
            });

	          list?.forEach(lister => {
              dynamicButtons.push({
                name: 'single_select',
                buttonParamsJson: JSON.stringify({
                  title: lister[0],
                  sections: lister[1]
                })
              });
            })

            return {
              body: proto.Message.InteractiveMessage.Body.fromObject({
                text: text || ''
              }),
              footer: proto.Message.InteractiveMessage.Footer.fromObject({
                text: footer || wm
              }),
              header: proto.Message.InteractiveMessage.Header.fromObject({
                title: text2,
                subtitle: text || '',
                hasMediaAttachment: img?.imageMessage || video?.videoMessage ? true : false,
                imageMessage: img?.imageMessage || null,
                videoMessage: video?.videoMessage || null
              }),
              nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                buttons: dynamicButtons.filter(Boolean),
                messageParamsJson: ''
              }),
              ...Object.assign({
                mentions: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
                contextInfo: {
                  mentionedJid: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
                }
              }, {
                ...(options || {}),
                ...(conn.temareply?.contextInfo && {
                  contextInfo: {
                    ...(options?.contextInfo || {}),
                    ...conn.temareply?.contextInfo,
                    externalAdReply: {
                      ...(options?.contextInfo?.externalAdReply || {}),
                      ...conn.temareply?.contextInfo?.externalAdReply,
                    },
                  },
                })
              })
            };
          }));
          const interactiveMessage = proto.Message.InteractiveMessage.create({
            body: proto.Message.InteractiveMessage.Body.fromObject({
              text: text || ''
            }),
            footer: proto.Message.InteractiveMessage.Footer.fromObject({
              text: footer || wm
            }),
            header: proto.Message.InteractiveMessage.Header.fromObject({
              title: text || '',
              subtitle: text || '',
              hasMediaAttachment: false
            }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
              cards,
            }),
            ...Object.assign({
              mentions: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
              contextInfo: {
                mentionedJid: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
              }
            }, {
              ...(options || {}),
              ...(conn.temareply?.contextInfo && {
                contextInfo: {
                  ...(options?.contextInfo || {}),
                  ...conn.temareply?.contextInfo,
                  externalAdReply: {
                    ...(options?.contextInfo?.externalAdReply || {}),
                    ...conn.temareply?.contextInfo?.externalAdReply,
                  },
                },
              })
            })
          });
          const messageContent = proto.Message.fromObject({
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2
                },
                interactiveMessage
              }
            }
          });
          const msgs = await generateWAMessageFromContent(jid, messageContent, {
            userJid: conn.user.jid,
            quoted: quoted,
            upload: conn.waUploadToServer,
            ephemeralExpiration: WA_DEFAULT_EPHEMERAL
          });
          await conn.relayMessage(jid, msgs.message, {
            messageId: msgs.key.id
          });
        } else {
          await conn.sendNCarousel(jid, ...messages[0], quoted, options);
        }
      }
    }, 
	    
       // sendButton: {
            /**
             * send Button
             * @param {String} jid
             * @param {String} text
             * @param {String} footer
             * @param {Buffer} buffer
             * @param {String[] | String[][]} buttons
             * @param {import('@adiwajshing/baileys').proto.WebMessageInfo} quoted
             * @param {Object} options
             */
            /*async value(jid, text = '', footer = '', buffer, buttons, quoted, options) {
                let type
                if (Array.isArray(buffer)) (options = quoted, quoted = buttons, buttons = buffer, buffer = null)
                else if (buffer) try { (type = await conn.getFile(buffer), buffer = type.data) } catch { buffer = null }
                if (!Array.isArray(buttons[0]) && typeof buttons[0] === 'string') buttons = [buttons]
                if (!options) options = {}
                let message = {
                    ...options,
                    [buffer ? 'caption' : 'text']: text || '',
                    footer,
                    buttons: buttons.map(btn => ({
                        buttonId: !nullish(btn[1]) && btn[1] || !nullish(btn[0]) && btn[0] || '',
                        buttonText: {
                            displayText: !nullish(btn[0]) && btn[0] || !nullish(btn[1]) && btn[1] || ''
                        }
                    })),
                    ...(buffer ?
                        options.asLocation && /image/.test(type.mime) ? {
                            location: {
                                ...options,
                                jpegThumbnail: buffer
                            }
                        } : {
                            [/video/.test(type.mime) ? 'video' : /image/.test(type.mime) ? 'image' : 'document']: buffer
                        } : {})
                }

                return await conn.sendMessage(jid, message, {
                    quoted,
                    upload: conn.waUploadToServer,
                    ...options
                })
            },
            enumerable: true
        }, 
       sendPoll: {
            async value(jid, name = '', optiPoll, options) {
                if (!Array.isArray(optiPoll[0]) && typeof optiPoll[0] === 'string') optiPoll = [optiPoll]
                if (!options) options = {}
                const pollMessage = {
        name: name,
        options: optiPoll.map(btn => ({
                            optionName: !nullish(btn[0]) && btn[0] || ''
                    })),
                    selectableOptionsCount: 1
        }
                return conn.relayMessage(jid, { pollCreationMessage: pollMessage }, { ...options });
                }
        },*/
        
        //-- new
sendButton: {
    async value(jid, text = '', footer = '', buffer, buttons, copy, urls, quoted, options) {
        let img, video

    
        if (/^https?:\/\//i.test(buffer)) {
            try {
                // Obtener el tipo MIME de la URL
                const response = await fetch(buffer)
                const contentType = response.headers.get('content-type')
                if (/^image\//i.test(contentType)) {
                    img = await prepareWAMessageMedia({ image: { url: buffer } }, { upload: conn.waUploadToServer })
                } else if (/^video\//i.test(contentType)) {
                    video = await prepareWAMessageMedia({ video: { url: buffer } }, { upload: conn.waUploadToServer })
                } else {
                    console.error("Tipo MIME no compatible:", contentType)
                }
            } catch (error) {
                console.error("Error al obtener el tipo MIME:", error)
            }
        } else {
            
            try {
                const type = await conn.getFile(buffer)
               if (/^image\//i.test(type.mime)) {
                    img = await prepareWAMessageMedia({ image: { url: buffer } }, { upload: conn.waUploadToServer })
                } else if (/^video\//i.test(type.mime)) {
                    video = await prepareWAMessageMedia({ video: { url: buffer } }, { upload: conn.waUploadToServer })
                }
            } catch (error) {
                console.error("Error al obtener el tipo de archivo:", error);
            }
        }

        const dynamicButtons = buttons.map(btn => ({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: btn[0],
                id: btn[1]
            }),
        }));

       
        if (copy && (typeof copy === 'string' || typeof copy === 'number')) {
            // Añadir botón de copiar
            dynamicButtons.push({
                name: 'cta_copy',
                buttonParamsJson: JSON.stringify({
                    display_text: 'Copy',
                    copy_code: copy
                })
            });
        }

        // Añadir botones de URL
        if (urls && Array.isArray(urls)) {
            urls.forEach(url => {
                dynamicButtons.push({
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: url[0],
                        url: url[1],
                        merchant_url: url[1]
                    })
                })
            })
        }


        const interactiveMessage = {
            body: { text: text },
            footer: { text: footer },
            header: {
                hasMediaAttachment: false,
                imageMessage: img ? img.imageMessage : null,
                videoMessage: video ? video.videoMessage : null
            },
            nativeFlowMessage: {
                buttons: dynamicButtons,
                messageParamsJson: ''
            }
        }

              
        let msgL = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    interactiveMessage } } }, { userJid: conn.user.jid, quoted })
        
       conn.relayMessage(jid, msgL.message, { messageId: msgL.key.id, ...options })
            
    }
}, 

sendList: {
    async value(jid, title, text, buttonText, listSections, quoted, options = {}) {
        const sections = [...listSections];
        
        const message = {
            interactiveMessage: {
                header: {title: title} ,
                body: {text: text}, 
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: buttonText,
                                sections
                            })
                        }
                    ],
                    messageParamsJson: ''
                }
            }
        };
        await conn.relayMessage(jid, { viewOnceMessage: { message } }, {});
    }
},

        //--
        sendListM: {
    async value(jid, button, rows, quoted, options = {}) {
        const sections = [
            {
                title: button.title,
                rows: [...rows]
            }
        ]
        const listMessage = {
            text: button.description,
            footer: button.footerText,
            mentions: await conn.parseMention(button.description),
            title: '',
            buttonText:button.buttonText,
            sections
        }
        conn.sendMessage(jid, listMessage, {
            quoted
        })
      }
    },
            
sendPoll: {
async value(jid, name = '', values = [], selectableCount = 1) {
return conn.sendMessage(jid, { poll: { name, values, selectableCount }})
 }
},
	    
	/** Send Button Gif
     *
     * @param {*} jid
     * @param {*} text
     * @param {*} footer
     * @param {*} Gif
     * @param [*] button
     * @param {*} options
     * @returns
     */
    sendButtonGif: {
    async value(jid , text = '' , footer = '', gif, but = []
