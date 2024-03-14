import config from "./config.js"
import { Client, Serialize } from "./lib/serialize.js"

import baileys from "@whiskeysockets/baileys"
const { useMultiFileAuthState, DisconnectReason, makeInMemoryStore, jidNormalizedUser, makeCacheableSignalKeyStore, PHONENUMBER_MCC } = baileys
import { Boom } from "@hapi/boom"
import Pino from "pino"
import NodeCache from "node-cache"
import chalk from "chalk"
import readline from "readline"
import { parsePhoneNumber } from "libphonenumber-js"
import open from "open"
import path from "path"

// Jadibot database
import fs from "fs"
const ygnumpang = JSON.parse(fs.readFileSync('./temp/numpang.json'));

const database = (new (await import("./lib/database.js")).default())
const store = makeInMemoryStore({ logger: Pino({ level: "fatal" }).child({ level: "fatal" }) })

export const jadibot = (m, siapa) => {
async function connectToWhatsApp() {
   const content = await database.read()
   if (content && Object.keys(content).length === 0) {
      global.db = {
         users: {},
         groups: {},
         confirm: {},
         ...(content || {}),
      }
      await database.write(global.db)
   } else {
      global.db = content
   }

   const { state, saveCreds } = await useMultiFileAuthState(`./${siapa}`)
   const msgRetryCounterCache = new NodeCache() // for retry message, "waiting message"

   const hisoka = baileys.default({
      logger: Pino({ level: "fatal" }).child({ level: "fatal" }), // hide log
      printQRInTerminal: false, // popping up QR in terminal log
      mobile: false, // mobile api (prone to bans)
      auth: {
         creds: state.creds,
         keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" }).child({ level: "fatal" })),
      },
      browser: ['Chrome (Linux)', '', ''], // for this issues https://github.com/WhiskeySockets/Baileys/issues/328
      markOnlineOnConnect: true, // set false for offline
      generateHighQualityLinkPreview: true, // make high preview link
      getMessage: async (key) => {
         let jid = jidNormalizedUser(key.remoteJid)
         let msg = await store.loadMessage(jid, key.id)

         return msg?.message || ""
      },
      msgRetryCounterCache, // Resolve waiting messages
      defaultQueryTimeoutMs: undefined, // for this issues https://github.com/WhiskeySockets/Baileys/issues/276
   })
   // bind store, write store maybe
   store.bind(hisoka.ev)

   // push update name to store.contacts
   hisoka.ev.on("contacts.update", (update) => {
      for (let contact of update) {
         let id = jidNormalizedUser(contact.id)
         if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
      }
   })

   // bind extra client
   await Client({ hisoka, store })

   // login use pairing code
   // source code https://github.com/WhiskeySockets/Baileys/blob/master/Example/example.ts#L61
   if (!ygnumpang.includes(siapa) && !hisoka.authState.creds.registered) {
      setTimeout(async () => {
         let code = await hisoka.requestPairingCode(siapa)
         let hasilcode = code?.match(/.{1,4}/g)?.join("-") || code
         m.reply(hasilcode)
      }, 3000)
   }

   // for auto reconnectToWhatsApp when error client
   hisoka.ev.on("connection.update", async (update) => {
      const { lastDisconnect, connection, qr } = update
      if (connection) {
         console.log(`Connection Status : ${connection}`)
      }

      if (connection === "close") {
         let reason = new Boom(lastDisconnect?.error)?.output.statusCode
         if (reason === DisconnectReason.badSession) {
            console.log(`Bad Session File, Please Delete Session and Scan Again`)
            //process.send('reset')
            
            // MENGHAPUS FILE SESSION
const userjadibot = JSON.parse(fs.readFileSync('./temp/numpang.json'));
userjadibot.splice(userjadibot.indexOf(siapa), 1)
fs.writeFileSync('./temp/numpang.json', JSON.stringify(userjadibot))

         } else if (reason === DisconnectReason.connectionClosed) {
            console.log("Connection closed, reconnecting....")
            await connectToWhatsApp()
         } else if (reason === DisconnectReason.connectionLost) {
            console.log("Connection Lost from Server, reconnecting...")
            await connectToWhatsApp()
         } else if (reason === DisconnectReason.connectionReplaced) {
            console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First")
            //process.exit(1)
            
            // MENGHAPUS FILE SESSION
const userjadibot = JSON.parse(fs.readFileSync('./temp/numpang.json'));
userjadibot.splice(userjadibot.indexOf(siapa), 1)
fs.writeFileSync('./temp/numpang.json', JSON.stringify(userjadibot))

         } else if (reason === DisconnectReason.loggedOut) {
            console.log(`Device Logged Out, Please Scan Again And Run.`)
            //process.exit(1)
            
            // MENGHAPUS FILE SESSION
const userjadibot = JSON.parse(fs.readFileSync('./temp/numpang.json'));
userjadibot.splice(userjadibot.indexOf(siapa), 1)
fs.writeFileSync('./temp/numpang.json', JSON.stringify(userjadibot))
            
         } else if (reason === DisconnectReason.restartRequired) {
            console.log("Restart Required, Restarting...")
            await connectToWhatsApp()
         } else if (reason === DisconnectReason.timedOut) {
            console.log("Connection TimedOut, Reconnecting...")
            process.send('reset')
         } else if (reason === DisconnectReason.multideviceMismatch) {
            console.log("Multi device mismatch, please scan again")
            process.exit(0)
            
            // MENGHAPUS FILE SESSION
const userjadibot = JSON.parse(fs.readFileSync('./temp/numpang.json'));
userjadibot.splice(userjadibot.indexOf(siapa), 1)
fs.writeFileSync('./temp/numpang.json', JSON.stringify(userjadibot))
            
         } else {
            console.log(reason)
            process.send('reset')
         }
      }

      if (connection === "open") {
         hisoka.sendMessage(config.options.owner[0] + "@s.whatsapp.net", {
            text: `${hisoka?.user?.name || "Miku"} Sekarang Terhubung...`,
         })
         

        // MENAMBAHKAN KE DATABASE
        if (!ygnumpang.includes(siapa)) {
           ygnumpang.push(siapa)
           fs.writeFileSync('./temp/numpang.json', JSON.stringify(ygnumpang))
        }


         
      }
   })

   // write session
   hisoka.ev.on("creds.update", saveCreds)

   // messages
   hisoka.ev.on("messages.upsert", async (message) => {
      if (!message.messages) return
      const m = await Serialize(hisoka, message.messages[0])
      await (await import(`./event/message.js?v=${Date.now()}`)).default(hisoka, m, message)
   })

   // group participants update
   hisoka.ev.on("group-participants.update", async (message) => {
      await (await import(`./event/group-participants.js?v=${Date.now()}`)).default(hisoka, message)
   })

   // group update
   hisoka.ev.on("groups.update", async (update) => {
      await (await import(`./event/group-update.js?v=${Date.now()}`)).default(hisoka, update)
   })

   // auto reject call when user call
   hisoka.ev.on("call", async (json) => {
      if (config.options.antiCall) {
         for (const id of json) {
            if (id.status === "offer") {
               let msg = await hisoka.sendMessage(id.from, {
                  text: `Maaf untuk saat ini, Kami tidak dapat menerima panggilan, entah dalam group atau pribadi\n\nJika Membutuhkan bantuan ataupun request fitur silahkan chat owner :p`,
                  mentions: [id.from],
               })
               hisoka.sendContact(id.from, config.options.owner, msg)
               await hisoka.rejectCall(id.id, id.from)
            }
         }
      }
   })

   // rewrite database every 30 seconds
   setInterval(async () => {
      if (global.db) await database.write(global.db)
   }, 30000) // write database every 30 seconds

   return hisoka
}
// menjalankan
connectToWhatsApp();
}