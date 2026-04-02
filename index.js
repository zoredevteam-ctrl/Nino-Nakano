import './settings.js'
import { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeInMemoryStore, 
    jidDecode
} from '@whiskeysockets/baileys'
import pino from 'pino'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import chalk from 'chalk'
import readline from 'readline'
import qrcode from 'qrcode-terminal'
import { handler } from './handler.js'
import { smsg } from './lib/simple.js'
import { database } from './lib/database.js'
import path from 'path'

// Configuración de almacenamiento
const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) })
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function startNino() {
    // Usamos la carpeta de sesión que tenías originalmente
    const { state, saveCreds } = await useMultiFileAuthState('./session_nino')
    const { version } = await fetchLatestBaileysVersion()

    console.clear()
    // --- TU DISEÑO ORIGINAL ---
    console.log(chalk.hex('#FF69B4').bold(`
    ███╗   ██╗██╗███╗   ██╗ ██████╗ 
    ████╗  ██║██║████╗  ██║██╔═══██╗
    ██╔██╗ ██║██║██╔██╗ ██║██║   ██║
    ██║╚██╗██║██║██║╚██╗██║██║   ██║
    ██║ ╚████║██║██║ ╚████║╚██████╔╝
    ╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝ ╚═════╝ 
    ███╗   ██╗ █████╗ ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗ 
    ████╗  ██║██╔══██╗██║ ██╔╝██╔══██╗████╗  ██║██╔═══██╗
    ██╔██╗ ██║███████║█████╔╝ ███████║██╔██╗ ██║██║   ██║
    ██║╚██╗██║██╔══██║██╔═██╗ ██╔══██║██║╚██╗██║██║   ██║
    ██║ ╚████║██║  ██║██║  ██╗██║  ██║██║ ╚████║╚██████╔╝
    ╚═╝  ╚═══╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝`))
    console.log(chalk.white.bold('                 power by 𝓐𝓪𝓻𝓸𝓶\n'))
    
    let method = 0
    if (!state.creds.registered) {
        console.log(chalk.cyan('Selecciona el método de vinculación:'))
        console.log(chalk.white('1. Código de 8 dígitos'))
        console.log(chalk.white('2. Código QR'))
        method = await question(chalk.magenta('\nOpcion > '))
    }

    const nino = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: method == '2',
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    })

    // Vinculación por código (Tu lógica original)
    if (method == '1' && !nino.authState.creds.registered) {
        const phoneNumber = await question(chalk.cyan('\nIngresa tu número de WhatsApp (ej: 573123456789):\n> '))
        const code = await nino.requestPairingCode(phoneNumber.trim())
        console.log(chalk.white('\nTu código de vinculación es: ') + chalk.hex('#FF69B4').bold(code) + '\n')
    }

    store.bind(nino.ev)

    // --- MANEJO DE CONEXIÓN ---
    nino.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode
            if (reason === DisconnectReason.restartRequired) { startNino() }
            else if (reason === DisconnectReason.loggedOut) { nino.logout(); startNino() }
            else { startNino() }
        } else if (connection === 'open') {
            console.log(chalk.hex('#FF69B4').bold('\n🦋 ¡Nino Nakano está en línea y lista! 🦋\n'))
        }
    })

    nino.ev.on('creds.update', saveCreds)

    // --- SISTEMA DE BIENVENIDA Y DESPEDIDA ---
    nino.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await nino.groupMetadata(anu.id)
            const participants = anu.participants
            for (let num of participants) {
                let ppuser
                try { ppuser = await nino.profilePictureUrl(num, 'image') } catch { ppuser = global.banner }

                if (anu.action == 'add') {
                    let txt = `¡Oye, @${num.split('@')[0]}! No creas que me alegra que te hayas unido, pero intenta no ser una molestia en *${metadata.subject}*. Bienvenid@, supongo... 🦋🙄`
                    await nino.sendMessage(anu.id, {
                        text: txt,
                        contextInfo: {
                            mentionedJid: [num],
                            externalAdReply: {
                                title: `NUEVO INTEGRANTE 🦋`,
                                body: `Bienvenido a ${metadata.subject}`,
                                thumbnailUrl: ppuser,
                                sourceUrl: global.rcanal,
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    })
                } else if (anu.action == 'remove') {
                    let txt = `@${num.split('@')[0]} se fue del grupo. Ugh, una molestia menos de la cual preocuparse. ¡Ni regreses! 💅💢`
                    await nino.sendMessage(anu.id, {
                        text: txt,
                        contextInfo: {
                            mentionedJid: [num],
                            externalAdReply: {
                                title: `USUARIO SALIENTE 🦋`,
                                body: `Se fue de ${metadata.subject}`,
                                thumbnailUrl: ppuser,
                                sourceUrl: global.rcanal,
                                mediaType: 1,
                                renderLargerThumbnail: true
                            }
                        }
                    })
                }
            }
        } catch (err) { console.log(err) }
    })

    // --- PROCESAMIENTO DE MENSAJES (Adaptado a Handler ESM) ---
    nino.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (!chatUpdate.messages[0]) return
            let m = chatUpdate.messages[0]
            if (m.key.remoteJid === 'status@broadcast') return
            m = await smsg(nino, m)
            
            // Cargamos plugins dinámicamente para el handler
            const plugins = {}
            const __dirname = path.dirname(fileURLToPath(import.meta.url))
            const directory = path.join(__dirname, 'plugins')
            const files = fs.readdirSync(directory).filter(f => f.endsWith('.js'))
            for (let file of files) {
                const plugin = await import(`./plugins/${file}`)
                plugins[file] = plugin.default || plugin
            }

            await handler(m, nino, plugins)
        } catch (err) {
            console.error(err)
        }
    })
}

// Iniciar base de datos antes del bot
(async () => {
    await database.read()
    startNino()
})()
