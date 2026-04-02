const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    Browsers // <-- Importación necesaria para arreglar el código de vinculación
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
    const { state, saveCreds } = await useMultiFileAuthState('./session_nino');
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.clear();
    // ASCII Art con espaciado uniforme
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
        printQRInTerminal: method === '2',
        auth: state,
        // Usamos una configuración estándar para evitar el bloqueo de WhatsApp
        browser: Browsers.ubuntu('Chrome'), 
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            return { conversation: 'Nino Nakano está procesando este mensaje...' };
        }
    });

    if (method === '1' && !nino.authState.creds.registered) {
        const phoneNumber = await question(chalk.cyan('\nIngresa tu número de WhatsApp (ej: 573123456789):\n> '));
        
        // Un pequeño retraso asegura que el socket esté listo para solicitar el código
        setTimeout(async () => {
            try {
                // Limpiamos cualquier espacio o carácter raro del número
                let numeroLimpio = phoneNumber.trim().replace(/[^0-9]/g, '');
                let code = await nino.requestPairingCode(numeroLimpio);
                
                // Formateamos el código para que sea más legible (ej: 1234-5678)
                let formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(chalk.white('\nTu código de vinculación es: ') + chalk.hex('#FF69B4').bold(formattedCode) + '\n');
            } catch (err) {
                console.log(chalk.red('\nError al solicitar el código. Asegúrate de que el número sea correcto y no esté baneado: '), err.message);
            }
        }, 2000); // 2 segundos de espera
    }

    nino.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

            if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) { 
                console.log(chalk.red.bold(`\n❌ Sesión cerrada o corrupta detectada.`)); 
                try {
                    fs.rmSync('./session_nino', { recursive: true, force: true });
                    console.log(chalk.yellow('🗑️ Carpeta session_nino eliminada automáticamente.'));
                } catch (e) {
                    console.log(chalk.red('⚠️ No se pudo borrar la carpeta automáticamente.'));
                }
                console.log(chalk.cyan('🔄 Ejecuta "npm start" de nuevo para generar una nueva sesión.'));
                process.exit(0);
            } 
            else if (reason === DisconnectReason.connectionClosed) { 
                console.log(chalk.yellow("Conexión cerrada, reconectando..."));
                setTimeout(() => startNino(), 3000);
            }
            else if (reason === DisconnectReason.connectionLost) { 
                console.log(chalk.yellow("Conexión perdida, reconectando..."));
                setTimeout(() => startNino(), 3000);
            }
            else if (reason === DisconnectReason.connectionReplaced) { 
                console.log(chalk.red("Sesión reemplazada. Cierra la otra conexión.")); 
                process.exit(0); 
            }
            else if (reason === DisconnectReason.restartRequired) { 
                console.log(chalk.cyan("Reinicio requerido por el servidor..."));
                setTimeout(() => startNino(), 3000);
            }
            else { 
                console.log(chalk.white(`Desconexión desconocida: ${reason}`));
                setTimeout(() => startNino(), 5000);
            }

        } else if (connection === 'open') {
            console.log(chalk.hex('#FF69B4').bold('\n🦋 ¡Nino Nakano está en línea y lista para operar! 🦋\n'));
        }
    });

    nino.ev.on('creds.update', saveCreds);

    nino.ev.on('group-participants.update', async (anu) => {
        try {
            const metadata = await nino.groupMetadata(anu.id);
            const participants = anu.participants;
            for (let num of participants) {
                let ppuser;
                try { ppuser = await nino.profilePictureUrl(num, 'image'); } 
                catch { ppuser = global.banner; }

                if (anu.action === 'add') {
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
                } else if (anu.action === 'remove') {
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
        } catch (err) { 
            console.log('Error en Welcome System:', err.message); 
        }
    });

    nino.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            await handler(nino, chatUpdate);
        } catch (err) {
            console.error(chalk.red('Error crítico enviando al Handler:'), err.message);
        }
    });
}

startNino();
