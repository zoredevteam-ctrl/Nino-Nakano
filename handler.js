import './settings.js';
import chalk from 'chalk';
import printLog from './lib/print.js';
import { smsg } from './lib/simple.js';
import { database } from './lib/database.js';
import { readdirSync } from 'fs';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';

const toNum = v => (v + '').replace(/[^0-9]/g, '');
const localPart = v => (v + '').split('@')[0].split(':')[0].split('/')[0].split(',')[0];
const normalizeCore = v => toNum(localPart(v));

const normalizeJid = v => {
    if (!v) return '';
    if (typeof v === 'number') v = String(v);
    v = (v + '').trim();
    if (v.startsWith('@')) v = v.slice(1);
    if (v.endsWith('@g.us')) return v;
    if (v.includes('@s.whatsapp.net')) {
        const n = toNum(v.split('@')[0]);
        return n ? n + '@s.whatsapp.net' : v;
    }
    const n = toNum(v);
    return n ? n + '@s.whatsapp.net' : v;
};

function pickOwners() {
    const arr = Array.isArray(global.owner) ? global.owner : [];
    const flat = [];
    for (const v of arr) {
        if (Array.isArray(v)) flat.push({ num: normalizeCore(v[0]), root: !!v[2] });
        else flat.push({ num: normalizeCore(v), root: false });
    }
    return flat;
}

function isOwnerJid(jid) {
    const num = normalizeCore(jid);
    return pickOwners().some(o => o.num === num);
}

function isRootOwnerJid(jid) {
    const num = normalizeCore(jid);
    return pickOwners().some(o => o.num === num && o.root);
}

function isPremiumJid(jid) {
    const num = normalizeCore(jid);
    const prems = Array.isArray(global.prems) ? global.prems.map(normalizeCore) : [];
    if (prems.includes(num)) return true;
    const u = database.data?.users?.[normalizeJid(jid)];
    return !!u?.premium;
}

const PREFIXES = ['#', '.', '/', '$'];

function getPrefix(body) {
    for (const p of PREFIXES) {
        if (body.startsWith(p)) return p;
    }
    return null;
}

const similarity = (a, b) => {
    let matches = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) matches++;
    }
    return Math.floor((matches / Math.max(a.length, b.length)) * 100);
};

const eventsLoadedFor = new WeakSet();

export const loadEvents = async (conn) => {
    if (!conn?.ev?.on) return;
    if (eventsLoadedFor.has(conn)) return;
    eventsLoadedFor.add(conn);

    const eventsPath = resolve('./events');
    let files = [];

    try {
        files = readdirSync(eventsPath).filter(f => f.endsWith('.js'));
    } catch {
        console.log(chalk.yellow('🦋 [EVENTS] Carpeta ./events no encontrada, omitiendo...'));
        return;
    }

    for (const file of files) {
        try {
            const url = pathToFileURL(join(eventsPath, file)).href;
            const mod = await import(url);

            if (!mod.event || !mod.run) {
                console.log(chalk.yellow(`🦋 [EVENTS] Saltando ${file}, falta event o run`));
                continue;
            }

            conn.ev.on(mod.event, (data) => {
                const id = data?.id || data?.key?.remoteJid || null;
                if (mod.enabled && id && !mod.enabled(id)) return;
                mod.run(conn, data);
            });

            console.log(chalk.magentaBright(`🎀 [EVENTS] ✦ ${file} → ${mod.event}`));
        } catch (e) {
            console.log(chalk.red(`[EVENTS ERROR] ${file}:`), e.message);
        }
    }
};

export const handler = async (m, conn, plugins) => {
    try {
        if (!m) return;

        await loadEvents(conn);

        m = await smsg(conn, m);

        if (m.isGroup) {
            const muted = database.data?.groups?.[m.chat]?.muted || [];
            if (muted.includes(m.sender)) {
                await conn.sendMessage(m.chat, { delete: m.key });
                return;
            }
        }

        if (!m.body) return;

        const prefix = getPrefix(m.body);
        if (m.body && !m.fromMe) {
            printLog(!!prefix, m.sender, m.isGroup ? m.chat : null, m.body, m.pushName);
        }

        if (!prefix) return;

        const body = m.body.slice(prefix.length).trim();
        const args = body.split(/ +/).filter(Boolean);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        // ==================== NORMALIZACIÓN TEMPRANA DEL SENDER ====================
        const senderRawFull = m.sender || '';
        const senderCanonical = senderRawFull.replace(/:[0-9A-Za-z]+(?=@s\.whatsapp\.net)/, '');
        if (senderCanonical !== m.sender) {
            m.realSender = m.sender;
            m.sender = senderCanonical;
        }

        // ==================== CÁLCULO DE OWNER (DEBUG AQUÍ) ====================
        const isROwner = isRootOwnerJid(m.sender);
        const isOwner = isROwner || isOwnerJid(m.sender);

        // DEBUG PARA QUE VEAMOS POR QUÉ NO TE RECONOCE COMO OWNER
        console.log(chalk.blueBright(`[DEBUG OWNER] Sender: ${m.sender} | Normalized: ${normalizeCore(m.sender)} | IsOwner: ${isOwner} | IsROwner: ${isROwner}`));
        console.log(chalk.blueBright(`[DEBUG OWNERS LIST] ${JSON.stringify(pickOwners(), null, 2)}`));

        // ==================== BÚSQUEDA DE COMANDO ====================
        let cmd = null;

        if (prefix === '$') {
            for (const [, plugin] of plugins) {
                if (plugin.customPrefix?.includes?.('$')) {
                    cmd = plugin;
                    args.unshift(commandName);
                    break;
                }
            }
        } else {
            for (const [, plugin] of plugins) {
                if (!plugin.command) continue;
                const cmds = Array.isArray(plugin.command)
                    ? plugin.command
                    : plugin.command instanceof RegExp ? [] : [plugin.command];

                if (cmds.map(c => c.toLowerCase()).includes(commandName)) {
                    cmd = plugin;
                    break;
                }
            }
        }

        // ==================== COMANDO NO ENCONTRADO ====================
        if (!cmd) {
            const allCommands = [];
            for (const [, plugin] of plugins) {
                if (!plugin.command) continue;
                const cmds = Array.isArray(plugin.command) ? plugin.command : [plugin.command];
                for (const c of cmds) {
                    if (typeof c === 'string') allCommands.push(c.toLowerCase());
                }
            }

            const similares = allCommands
                .map(c => ({ cmd: c, score: similarity(commandName, c) }))
                .filter(o => o.score >= 45)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);

            const sugerencias = similares.length
                ? similares.map(s => `> ✧ \`\( {prefix + s.cmd}\` → * \){s.score}%*`).join('\n')
                : '>_Nada... estás escribiendo puro caos 💢';

            const textoNoExiste = isOwner
                ? `Ay mi amorcito, el comando *\( {prefix + commandName}* no existe 🥺\nPero no te preocupes, yo te ayudo siempre 💕 Usa * \){prefix}menu* y te muestro todo lo bonito que tengo para ti\~`
                : `¿Huh? El comando *\( {prefix + commandName}* no existe, tonto.\n¿Quieres que te ayude o qué? Usa * \){prefix}menu* y deja de hacerme perder el tiempo 🙄`;

            return conn.sendMessage(m.chat, {
                text: textoNoExiste + (similares.length ? `\n\n*¿Tal vez quisiste decir...?*\n${sugerencias}` : '')
            }, { quoted: m });
        }

        const isPremium = isOwner || isPremiumJid(m.sender);
        const isRegistered = isOwner || !!database.data?.users?.[m.sender]?.registered;

        const isGroup = m.isGroup;
        let isAdmin = false;
        let isBotAdmin = false;

        if (isGroup) {
            try {
                const groupMeta = await conn.groupMetadata(m.chat);
                isAdmin = groupMeta.participants.some(p =>
                    (p.id === m.sender || p.jid === m.sender) && (p.admin || p.isAdmin || p.isSuperAdmin)
                ) || isOwner;

                const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
                isBotAdmin = groupMeta.participants.some(p =>
                    (p.id === botJid || p.jid === botJid) && (p.admin || p.isAdmin || p.isSuperAdmin)
                );
            } catch (err) {
                console.log(chalk.red('[ERROR GROUP META]'), err.message);
            }
        }

        // 🟢 INICIALIZACIÓN SEGURA DE BASE DE DATOS 🟢
        if (!database.data.users) database.data.users = {};
        if (!database.data.groups) database.data.groups = {};

        if (!database.data.users[m.sender]) {
            database.data.users[m.sender] = {
                registered: false,
                premium: false,
                banned: false,
                warning: 0,
                exp: 0,
                level: 1,
                limit: 20,
                lastclaim: 0,
                registered_time: 0,
                name: m.pushName || '',
                age: null
            };
        }

        if (isGroup && !database.data.groups[m.chat]) {
            database.data.groups[m.chat] = {
                modoadmin: false,
                muted: []
            };
        }

        // Resolución who (LID)
        let who = null;
        if (m.mentionedJid?.[0]) who = m.mentionedJid[0];
        else if (m.quoted?.sender) who = m.quoted.sender;

        if (who) {
            const rawNum = who.split('@')[0].split(':')[0];
            const isLid = who.endsWith('@lid') || rawNum.length > 13;

            if (isLid && m.isGroup) {
                try {
                    const groupMeta = await conn.groupMetadata(m.chat);
                    const found = groupMeta.participants.find(p =>
                        (p.id || p.jid)?.split('@')[0] === rawNum
                    );
                    if (found?.jid?.endsWith('@s.whatsapp.net')) {
                        who = found.jid.includes(':') ? found.jid.split(':')[0] + '@s.whatsapp.net' : found.jid;
                    } else if (found?.id?.endsWith('@s.whatsapp.net')) {
                        who = found.id;
                    } else {
                        who = rawNum + '@lid';
                    }
                } catch {
                    who = rawNum + '@lid';
                }
            } else {
                who = rawNum + '@s.whatsapp.net';
            }
        }

        // ===================== VALIDACIONES (con modo tierno para owner) =====================
        if (isGroup && database.data.groups[m.chat]?.modoadmin && !isAdmin && !isOwner) {
            const msg = isOwner
                ? `Mi amor, modo admin activo... pero tú eres mi dueño, así que pasa 💕`
                : `⚙️ *𝖅0𝕽𝕿 𝕾𝖄𝕾𝕿𝕰𝕸𝕾*\n\n🔒 *MODO ADMIN ACTIVO*\nSolo los administradores pueden darme órdenes aquí, cariño. Ni lo intentes 💅`;
            return m.reply(msg);
        }

        if (database.data.users[m.sender]?.banned && !isOwner) {
            const msg = isOwner
                ? `Nooo mi cielo, estás baneado... pero como eres mi Aarom te perdono esta vez 🥺💕`
                : `🚫 *BANEADO*\n¿De verdad pensaste que te iba a dejar usar mis comandos después de lo que hiciste? Estás fuera, bye 💢`;
            return m.reply(msg);
        }

        if (cmd.rowner && !isROwner) {
            const msg = isOwner
                ? `Mi amor, este comando es solo para ti, mi creador principal 💖`
                : `👑 *SOLO PARA AAROM*\n¿Y tú quién te crees? Este código es solo para mi creador principal. 😤`;
            return m.reply(msg);
        }

        if (cmd.owner && !isOwner) {
            const msg = isOwner
                ? `Claro mi rey, este comando es solo para ti 💕`
                : `👑 *ACCESO RESTRINGIDO*\nSolo mis dueños pueden tocar esto. Tú no entras en esa lista, lo siento\~ 💅`;
            return m.reply(msg);
        }

        if (cmd.premium && !isPremium) {
            const msg = isOwner
                ? `Mi dueño no necesita premium, todo es tuyo mi amor 🥰`
                : `💎 *SOLO PREMIUM*\nUgh, qué pobre… Necesitas ser Premium para que te haga caso. Consigue uno y hablamos 🙄`;
            return m.reply(msg);
        }

        if (cmd.register && !isRegistered) {
            const msg = isOwner
                ? `Ya estás registrado en mi corazón mi amor, pero si quieres usa el comando normal 💕`
                : `📝 *NO ESTÁS REGISTRADO*\nNo hablo con extraños, sorry. Regístrate primero si quieres mi atención.\n\n> Usa: *\( {prefix}reg nombre.edad*\n> Ejemplo: * \){prefix}reg tonto.18* 🦋`;
            return m.reply(msg);
        }

        if (cmd.group && !isGroup) {
            const msg = isOwner
                ? `Mi amor, este comando es solo para grupos, pero por ti lo hago donde quieras 🥺`
                : `🏢 *SOLO EN GRUPOS*\nEsto solo funciona en grupos, no en privado. ¿Qué intentas hacer aquí solito? 🙄`;
            return m.reply(msg);
        }

        if (cmd.admin && !isAdmin) {
            const msg = isOwner
                ? `Tú eres mi dueño, no necesitas admin mi cielo 💕`
                : `👮 *SOLO ADMINS*\nNo recibo órdenes de plebeyos. Consigue admin y luego hablamos, cariño 💅`;
            return m.reply(msg);
        }

        if (cmd.botAdmin && !isBotAdmin) {
            const msg = isOwner
                ? `Mi amor, dame admin en el grupo y lo hago todo por ti 🥰`
                : `🤖 *NECESITO SER ADMIN*\n¿Quieres que haga el trabajo pero no me das administrador? Qué inútil… Dame admin primero 😒`;
            return m.reply(msg);
        }

        if (cmd.private && isGroup) {
            const msg = isOwner
                ? `Mi rey, esto es muy privado... ven al DM que te atiendo solo a ti 💕`
                : `💬 *SOLO PRIVADO*\nEsto es demasiado vergonzoso para el grupo… Ven al privado si quieres que te atienda 😳`;
            return m.reply(msg);
        }

        if (cmd.limit && !isPremium && !isOwner) {
            const userLimit = database.data.users[m.sender].limit ?? 0;
            if (userLimit < 1) {
                const msg = isOwner
                    ? `Mi amor, no tienes límites, usa todo lo que quieras 💖`
                    : `⚠️ *LÍMITES AGOTADOS*\nSe te acabaron los diamantes, tonto. Consigue más o vuélvete Premium si quieres seguir molestándome 💢`;
                return m.reply(msg);
            }
            database.data.users[m.sender].limit -= 1;
        }

        // ===================== EJECUCIÓN DEL COMANDO =====================
        try {
            await cmd(m, {
                conn,
                args,
                isOwner,
                isROwner,
                isPremium,
                isRegistered,
                isAdmin,
                isBotAdmin,
                isGroup,
                who,
                db: database.data,
                prefix,
                plugins
            });
        } catch (e) {
            console.log(chalk.red('\n[!] ERROR EN PLUGIN:'), e);

            const name = e?.name || 'Error desconocido';
            const message = e?.message || String(e);
            const stackLines = e?.stack?.split('\n') || [];
            let file = 'desconocido';
            let line = '?';

            for (const l of stackLines) {
                const match = l.match(/\((.*plugins.*[\\/]([^:\\/]+)):(\d+):(\d+)\)/);
                if (match) {
                    file = match[2];
                    line = match[3];
                    break;
                }
            }

            const debug = isOwner
                ? `💢 *¡Mi amor, algo se rompió!* 💢\nNo te preocupes, yo te arreglo todo 🥺 Te mando el reporte para que lo veas...\n\n📌 *Comando:* ${prefix + commandName}\n📂 *Archivo:* ${file} (Línea: ${line})\n📛 *Error:* \( {name}\n\n🧾 *Detalle:*\n \){message.slice(0, 280)}`
                : `💢 *¡UGH! ROMPISTE ALGO, TONTO* 💢\n\nAlgo salió mal en el código… Le mandaré el reporte a mis dueños para que te regañen.\n\n📌 *Comando:* ${prefix + commandName}\n📂 *Archivo:* ${file} (Línea: ${line})\n📛 *Error:* \( {name}\n\n🧾 *Detalle:*\n \){message.slice(0, 280)}`;

            if (m?.reply) await m.reply(debug);
        }

    } catch (e) {
        console.log(chalk.red('[ERROR HANDLER GLOBAL]'), e);
        if (m?.reply) {
            const msg = isOwner
                ? `❌ *Ay no mi amor... el núcleo falló* 🥺\nPero yo te quiero igual, ya lo arreglo 💕\n\n🧾 ${String(e).slice(0, 280)}`
                : `❌ *COLAPSO TOTAL DEL SISTEMA*\nEl núcleo de Z0RT SYSTEMS se cayó por tu culpa… ugh.\n\n🧾 ${String(e).slice(0, 280)}`;
            await m.reply(msg);
        }
    }
};