const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    Browsers 
} = require('@whiskeysockets/baileys');

const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const chalk = require('chalk');
const readline = require('readline');
const handler = require('./handler');
require('./settings');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startNino() {
    // 1. GESTIÓN DE ESTADO Y VERSIÓN
    const { state, saveCreds } = await useMultiFileAuthState('./session_nino');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.clear();
    console.log(chalk.hex('#FF69B4').bold(`
    ███╗   ██╗██╗███╗   ██╗ ██████╗ 
    ████╗  ██║██║████╗  ██║██╔═══██╗
    ██╔██╗ ██║██║██╔██╗ ██║██║   ██║
    ██║╚██╗██║██║██║╚██╗██║██║   ██║
    ██║ ╚████║██║██║ ╚████║╚██████╔╝
    ╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝ ╚═════╝ 
    ███╗   ██╗█████╗ ██╗  ██╗█████╗ ███╗   ██╗██████╗ 
    ████╗  ██║██╔══██╗██║ ██╔╝██╔══██╗████╗  ██║██╔═══██╗
    ██╔██╗ ██║███████║█████╔╝ ███████║██╔██╗ ██║██║   ██║
    ██║╚██╗██║██╔══██║██╔═██╗ ██╔══██║██║╚██╗██║██║   ██║
    ██║ ╚████║██║  ██║██║  ██╗██║  ██║██║ ╚████║╚██████╔╝
    ╚═╝  ╚═══╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝`));
    console.log(chalk.white.bold('                 power by 𝓐𝓪𝓻𝓸𝓶\n'));
    console.log(chalk.gray(`Motor: Baileys v${version.join('.')} ${isLatest ? '(Actualizado)' : ''}\n`));

    // 2. SELECCIÓN DE MÉTODO (QR O CÓDIGO)
    let method = 0;
    if (!state.creds.registered) {
        console.log(chalk.cyan('Selecciona el método de vinculación:'));
        console.log(chalk.white('1. Código de 8 dígitos'));
        console.log(chalk.white('2. Código QR'));
        method = await question(chalk.magenta('\nOpcion > '));
    }

    // 3. CONFIGURACIÓN DEL SOCKET
    const nino = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: method === '2',
        auth: state,
        browser: Browsers.ubuntu('Chrome'), // Evita detecciones de bots genéricos
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true,
        syncFullHistory: false, // Optimiza el arranque
        getMessage: async (key) => {
            return { conversation: 'Nino Nakano está procesando...' };
        }
    });

    // 4. LÓGICA DE PAIRING CODE (OPCIÓN 1)
    if (method === '1' && !nino.authState.creds.registered) {
        const phoneNumber = await question(chalk.cyan('\nIngresa tu número de WhatsApp (ej: 573123456789):\n> '));
        const numeroLimpio = phoneNumber.trim().replace(/[^0-9]/g, '');

        setTimeout(async () => {
            try {
                let code = await nino.requestPairingCode(numeroLimpio);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(chalk.white('\nTu código es: ') + chalk.hex('#FF69B4').bold(code) + '\n');
            } catch (err) {
                console.log(chalk.red('\nError al generar código: '), err.message);
            }
        }, 3000); 
    }

    // 5. GESTIÓN DE CONEXIÓN Y AUTO-LIMPIEZA
    nino.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

            if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) { 
                console.log(chalk.red.bold(`\n❌ Sesión inválida. Eliminando datos...`)); 
                fs.rmSync('./session_nino', { recursive: true, force: true });
                process.exit(0);
            } 
            else {
                console.log(chalk.yellow(`\n🔄 Reconectando en 5 segundos... (Razón: ${reason})`));
                setTimeout(() => startNino(), 5000);
            }

        } else if (connection === 'open') {
            console.log(chalk.hex('#FF69B4').bold('\n🦋 ¡Nino Nakano está en línea! 🦋\n'));
        }
    });

    nino.ev.on('creds.update', saveCreds);

    // 6. SISTEMA DE BIENVENIDA / DESPEDIDA
    nino.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await nino.groupMetadata(anu.id);
            const participants = anu.participants;
            for (let num of participants) {
                let ppuser;
                try { ppuser = await nino.profilePictureUrl(num, 'image'); } 
                catch { ppuser = global.banner; }

                const context = {
                    mentionedJid: [num],
                    externalAdReply: {
                        title: anu.action === 'add' ? 'NUEVO INTEGRANTE 🦋' : 'USUARIO SALIENTE 🦋',
                        body: metadata.subject,
                        thumbnailUrl: ppuser,
                        sourceUrl: global.rcanal,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                };

                if (anu.action === 'add') {
                    let txt = `¡Oye, @${num.split('@')[0]}! No creas que me alegra que estés aquí, pero intenta no molestar en *${metadata.subject}*. 🦋🙄`;
                    await nino.sendMessage(anu.id, { text: txt, contextInfo: context });
                } else if (anu.action === 'remove') {
                    let txt = `@${num.split('@')[0]} se fue. Ugh, una molestia menos. ¡Ni regreses! 💅💢`;
                    await nino.sendMessage(anu.id, { text: txt, contextInfo: context });
                }
            }
        } catch (err) { 
            console.log('Error en Evento de Grupo:', err.message); 
        }
    });

    // 7. ENTRADA AL HANDLER
    nino.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (!chatUpdate.messages[0]) return;
            await handler(nino, chatUpdate);
        } catch (err) {
            console.error(chalk.red('Error en Handler:'), err.message);
        }
    });
}

// Arrancar el bot
startNino().catch(err => console.error("Error fatal:", err));
