const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeInMemoryStore, 
    jidDecode,
    proto
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const chalk = require('chalk');
const readline = require('readline');
const qrcode = require('qrcode-terminal');
const handler = require('./handler');
require('./settings');

const store = makeInMemoryStore({ logger: pino({ level: 'silent' }) });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startNino() {
    const { state, saveCreds } = await useMultiFileAuthState('./session_nino');
    const { version } = await fetchLatestBaileysVersion();

    console.clear();
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
    ╚═╝  ╚═══╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝`));
    console.log(chalk.white.bold('                 power by 𝓐𝓪𝓻𝓸𝓶\n'));
    
    let method = 0;
    if (!state.creds.registered) {
        console.log(chalk.cyan('Selecciona el método de vinculación:'));
        console.log(chalk.white('1. Código de 8 dígitos'));
        console.log(chalk.white('2. Código QR'));
        method = await question(chalk.magenta('\nOpcion > '));
    }

    const nino = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: method == '2',
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    if (method == '1' && !nino.authState.creds.registered) {
        const phoneNumber = await question(chalk.cyan('\nIngresa tu número de WhatsApp (ej: 573123456789):\n> '));
        const code = await nino.requestPairingCode(phoneNumber.trim());
        console.log(chalk.white('\nTu código de vinculación es: ') + chalk.hex('#FF69B4').bold(code) + '\n');
    }

    store.bind(nino.ev);

    nino.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            if (reason === DisconnectReason.badSession) { console.log(chalk.red(`Sesión corrupta, por favor elimina la carpeta session_nino y escanea de nuevo.`)); startNino(); }
            else if (reason === DisconnectReason.connectionClosed) { console.log(chalk.yellow("Conexión cerrada, reconectando...")); startNino(); }
            else if (reason === DisconnectReason.connectionLost) { console.log(chalk.yellow("Conexión perdida con el servidor, reconectando...")); startNino(); }
            else if (reason === DisconnectReason.connectionReplaced) { console.log(chalk.red("Sesión reemplazada, por favor cierra la sesión actual primero.")); nino.logout(); }
            else if (reason === DisconnectReason.loggedOut) { console.log(chalk.red(`Dispositivo vinculado, elimina la carpeta session_nino y escanea de nuevo.`)); nino.logout(); }
            else if (reason === DisconnectReason.restartRequired) { console.log(chalk.cyan("Reinicio requerido, reiniciando...")); startNino(); }
            else { console.log(chalk.white(`Motivo de desconexión desconocido: ${reason}|${connection}`)); startNino(); }
        } else if (connection === 'open') {
            console.log(chalk.hex('#FF69B4').bold('\n🦋 ¡Nino Nakano está en línea y lista! 🦋\n'));
        }
    });

    nino.ev.on('creds.update', saveCreds);

    nino.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await nino.groupMetadata(anu.id);
            const participants = anu.participants;
            for (let num of participants) {
                let ppuser;
                try { ppuser = await nino.profilePictureUrl(num, 'image'); } catch { ppuser = global.banner; }

                if (anu.action == 'add') {
                    let txt = `¡Oye, @${num.split('@')[0]}! No creas que me alegra que te hayas unido, pero intenta no ser una molestia en *${metadata.subject}*. Bienvenid@, supongo... 🦋🙄`;
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
                    });
                } else if (anu.action == 'remove') {
                    let txt = `@${num.split('@')[0]} se fue del grupo. Ugh, una molestia menos de la cual preocuparse. ¡Ni regreses! 💅💢`;
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
                    });
                }
            }
        } catch (err) { console.log(err); }
    });

    nino.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            await handler(nino, chatUpdate);
        } catch (err) {
            console.error(err);
        }
    });
}

startNino();
