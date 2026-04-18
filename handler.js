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
            if (!mod.event || !mod.run) continue;
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

        // ── Bot OFF global ────────────────────────────────────────────────────
        if (global.botOff && !m.fromMe) {
            const senderCheck = (m.sender || '').replace(/:[0-9A-Za-z]+(?=@s\.whatsapp\.net)/, '')
            if (!isOwnerJid(senderCheck)) return
        }

        // ── Primary: sub-bots ignorar grupos con primaryOnly ──────────────────
        if (m.isGroup && conn._subbotId) {
            const groupData = database.data?.groups?.[m.chat]
            if (groupData?.primaryOnly) {
                const body = (m.body || '').trim().toLowerCase()
                const isPrimaryCmd = ['#setprimary','#removeprimary','.setprimary','.removeprimary']
                    .some(c => body.startsWith(c))
                if (!isPrimaryCmd) return
            }
        }

        // ── Mute: eliminar mensajes de usuarios muteados ──────────────────────
        if (m.isGroup) {
            const muted = database.data?.groups?.[m.chat]?.muted || []
            if (muted.includes(m.sender)) {
                try { await conn.sendMessage(m.chat, { delete: m.key }) } catch {}
                return
            }
        }

        if (!m.body) return;

        const prefix = getPrefix(m.body);
        if (m.body && !m.fromMe) {
            printLog(!!prefix, m.sender, m.isGroup ? m.chat : null, m.body, m.pushName);
        }

        // ── Ejecutar handler.before de todos los plugins ──────────────────────
        if (m.isGroup) {
            const bodyCheck = (m.body || '').trim()
            const tienePrefix = ['#', '.', '/', '$'].some(p => bodyCheck.startsWith(p))

            if (!tienePrefix) {
                for (const [, plugin] of plugins) {
                    if (typeof plugin?.before === 'function') {
                        try {
                            const senderB  = (m.sender || '').replace(/:[0-9A-Za-z]+(?=@s\.whatsapp\.net)/, '')
                            const isOwnerB = isOwnerJid(senderB)
                            let isAdminB   = isOwnerB
                            if (!isAdminB) {
                                try {
                                    const gMeta = await conn.groupMetadata(m.chat)
                                    isAdminB = gMeta.participants.some(p =>
                                        (normalizeCore(p.id || p.jid) === normalizeCore(senderB)) &&
                                        (p.admin || p.isAdmin || p.isSuperAdmin)
                                    )
                                } catch {}
                            }
                            const stop = await plugin.before(m, { conn, isAdmin: isAdminB, isOwner: isOwnerB })
                            if (stop === true) return
                        } catch (e) {
                            console.log(chalk.red('[BEFORE ERROR]'), e.message)
                        }
                    }
                }
            }
        }

        if (!prefix) return;

        const body = m.body.slice(prefix.length).trim();
        const args = body.split(/ +/).filter(Boolean);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        // ── Normalización del sender (incluye LID) ────────────────────────────
        let senderJid = m.sender || '';
        const senderRawFull = senderJid;
        const senderCanonical = senderRawFull.replace(/:[0-9A-Za-z]+(?=@s\.whatsapp\.net)/, '');

        if (senderCanonical !== senderJid) {
            m.realSender = senderJid;
            senderJid = senderCanonical;
        }

        if (senderJid.endsWith('@lid') && m.isGroup) {
            try {
                const groupMeta = await conn.groupMetadata(m.chat);
                const rawNum = normalizeCore(senderJid);
                const found = groupMeta.participants.find(p =>
                    normalizeCore(p.id || p.jid) === rawNum
                );
                if (found && (found.jid || found.id)?.endsWith('@s.whatsapp.net')) {
                    senderJid = (found.jid || found.id).includes(':')
                        ? (found.jid || found.id).split(':')[0] + '@s.whatsapp.net'
                        : (found.jid || found.id);
                    m.sender = senderJid;
                }
            } catch {}
        }

        const isROwner = isRootOwnerJid(senderJid);
        const isOwner  = isROwner || isOwnerJid(senderJid);

        // ── Búsqueda de comando ───────────────────────────────────────────────
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

        // ── Comando no encontrado ─────────────────────────────────────────────
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
                ? similares.map(s => `> ✧ \`${prefix + s.cmd}\` → *${s.score}%*`).join('\n')
                : '> _Nada... estás escribiendo puro caos_ 💢';

            const textoNoExiste = isOwner
                ? `Ay mi amorcito, el comando *${prefix + commandName}* no existe 🥺\nPero no te preocupes, yo te ayudo siempre 💕 Usa *${prefix}menu* y te muestro todo lo bonito que tengo para ti~`
                : `¿Huh? El comando *${prefix + commandName}* no existe, tonto.\n¿Quieres que te ayude o qué? Usa *${prefix}menu* y deja de hacerme perder el tiempo 🙄`;

            const finalMessage = similares.length
                ? `${textoNoExiste}\n\n*¿Tal vez quisiste decir...?*\n${sugerencias}`
                : `${textoNoExiste}\n\n${sugerencias}`;

            return conn.sendMessage(m.chat, { text: finalMessage }, { quoted: m });
        }

        const isPremium    = isOwner || isPremiumJid(senderJid);
        const isRegistered = isOwner || !!database.data?.users?.[senderJid]?.registered;

        const isGroup = m.isGroup;
        let isAdmin   = false;
        let isBotAdmin = false;

        if (isGroup) {
            try {
                const groupMeta = await conn.groupMetadata(m.chat);
                isAdmin = groupMeta.participants.some(p =>
                    (p.id === senderJid || p.jid === senderJid) &&
                    (p.admin || p.isAdmin || p.isSuperAdmin)
                ) || isOwner;

                const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
                isBotAdmin = groupMeta.participants.some(p =>
                    (p.id === botJid || p.jid === botJid) &&
                    (p.admin || p.isAdmin || p.isSuperAdmin)
                );
            } catch (err) {
                console.log(chalk.red('[ERROR GROUP META]'), err.message);
            }
        }

        // ── Inicialización segura de DB ───────────────────────────────────────
        if (!database.data.users)  database.data.users  = {};
        if (!database.data.groups) database.data.groups = {};

        if (!database.data.users[senderJid]) {
            database.data.users[senderJid] = {
                registered: false, premium: false, banned: false,
                warning: 0, exp: 0, level: 1, limit: 20,
                lastclaim: 0, registered_time: 0,
                name: m.pushName || '', age: null
            };
        }

        if (isGroup && !database.data.groups[m.chat]) {
            database.data.groups[m.chat] = { modoadmin: false, muted: [] };
        }

        // ── Resolver who (mencionado o citado) — con fix de LID ──────────────
        let who = null;
        if (m.mentionedJid?.[0]) who = m.mentionedJid[0];
        else if (m.quoted?.sender) who = m.quoted.sender;

        if (who) {
            const rawNum = who.split('@')[0].split(':')[0];
            const isLid  = who.endsWith('@lid') || rawNum.length > 13;

            if (isLid && m.isGroup) {
                try {
                    const groupMeta = await conn.groupMetadata(m.chat);
                    const found = groupMeta.participants.find(p =>
                        normalizeCore(p.id || p.jid) === rawNum
                    );
                    if (found?.jid?.endsWith('@s.whatsapp.net')) {
                        who = found.jid.includes(':')
                            ? found.jid.split(':')[0] + '@s.whatsapp.net'
                            : found.jid;
                    } else if (found?.id?.endsWith('@s.whatsapp.net')) {
                        who = found.id;
                    } else {
                        who = rawNum + '@s.whatsapp.net';
                    }
                } catch {
                    who = rawNum + '@s.whatsapp.net';
                }
            } else {
                who = rawNum + '@s.whatsapp.net';
            }
        }

        // ════════════════════════════════════════════════════════════════════
        // VALIDACIONES — Estilo Nino Nakano 🦋
        // ════════════════════════════════════════════════════════════════════

        // Modo admin del grupo
        if (isGroup && database.data.groups[m.chat]?.modoadmin && !isAdmin && !isOwner) {
            return m.reply(
                `*ᐛ🎀* Este reino está en *modo administrador.*\n` +
                `> ✰ Solo los elegidos del grupo pueden hablar ahora. Tú no eres uno de ellos~ 💅`
            )
        }

        // Modo owner global
        if (database.data.settings?.modoowner && !isOwner) {
            return m.reply(
                `*ᐛ🎀* Estoy en modo exclusivo ahora mismo.\n` +
                `> ✰ Solo mis creadores pueden hablar conmigo en este momento~ 🦋`
            )
        }

        // Baneado
        if (database.data.users[senderJid]?.banned && !isOwner) {
            return m.reply(
                `*ᐛ🎀* Fuiste desterrado de mi reino.\n` +
                `> ✰ No puedes usar mis comandos. Habla con mi creador si crees que es un error~ 💢`
            )
        }

        // Solo root owner
        if (cmd.rowner && !isROwner) {
            return m.reply(isOwner
                ? `*ᐛ🎀* Mi amor, esta función es exclusiva de mi *creador principal.*\n` +
                  `> ✰ Ni tú puedes tocarla~ Solo él 💖`
                : `*ᐛ🎀* Esta función solo puede ser usada por mi *creador.*\n` +
                  `> ✰ 𝓐𝓪𝓻𝓸𝓶 (•̀ᴗ•́)و 🦋`
            )
        }

        // Solo owner
        if (cmd.owner && !isOwner) {
            return m.reply(
                `*ᐛ🎀* Esta función solo puede ser usada por mis *creadores.*\n` +
                `> ✰ ¿Y tú quién eres exactamente? (•̀ᴗ•́)و 🦋`
            )
        }

        // Solo premium
        if (cmd.premium && !isPremium) {
            return m.reply(
                `*ᐛ🎀* Esta función es exclusiva para los *ciudadanos premium* de mi reino.\n` +
                `> ✰ Consigue Premium y hablamos, por ahora... no entras~ 💎`
            )
        }

        // Registro requerido
        if (cmd.register && !isRegistered) {
            return m.reply(
                `*ᐛ🎀* No hablo con extraños sin identificación.\n` +
                `> ✰ Regístrate con *${prefix}reg nombre.edad* y luego hablamos~ 📝`
            )
        }

        // Solo grupos
        if (cmd.group && !isGroup) {
            return m.reply(
                `*ᐛ🎀* Esta función encantada solo puede usarse en *reinos de poder (grupos).*\n` +
                `> ✰ Ve a un grupo y vuelve a intentarlo~ 🏰`
            )
        }

        // Solo admins
        if (cmd.admin && !isAdmin) {
            return m.reply(isOwner
                ? `*ᐛ🎀* Tú eres mi creador, no necesitas ser admin mi cielo~ 💕`
                : `*ᐛ🎀* Esta función solo puede ser ejecutada por las *personas más importantes del reino (admins).*\n` +
                  `> ✰ Consigue admin y luego regresa~ 👑`
            )
        }

        // Bot necesita ser admin
        if (cmd.botAdmin && !isBotAdmin) {
            return m.reply(
                `*ᐛ🎀* Esta función solo puede ejecutarse si yo soy *princesa de este reino (admin del grupo).*\n` +
                `> ✰ Dame administrador primero y con gusto lo hago~ 😒🦋`
            )
        }

        // Solo privado
        if (cmd.private && isGroup) {
            return m.reply(
                `*ᐛ🎀* Esta función encantada solo puede ejecutarse en *mi casa (chat privado).*\n` +
                `> ✰ Ven al privado si quieres que te atienda~ 💬`
            )
        }

        // Límite de uso
        if (cmd.limit && !isPremium && !isOwner) {
            const userLimit = database.data.users[senderJid].limit ?? 0;
            if (userLimit < 1) {
                return m.reply(
                    `*ᐛ🎀* Se te agotaron tus *permisos de uso* por hoy.\n` +
                    `> ✰ Consigue Premium o vuelve mañana cuando recargues~ 💢`
                )
            }
            database.data.users[senderJid].limit -= 1;
        }

        // ── Ejecución del plugin ──────────────────────────────────────────────
        try {
            const fn = typeof cmd.run === 'function'
                ? cmd.run.bind(cmd)
                : typeof cmd === 'function' ? cmd : null
            if (!fn) throw new TypeError(`El plugin "${commandName}" no exporta una función válida`)

            await fn(m, {
                conn, args,
                text: args.join(' '),
                command: commandName,
                usedPrefix: prefix,
                isOwner, isROwner, isPremium, isRegistered,
                isAdmin, isBotAdmin, isGroup,
                who, db: database.data, prefix, plugins
            });
        } catch (e) {
            console.log(chalk.red('\n[!] ERROR EN PLUGIN:'), e);

            const name       = e?.name || 'Error desconocido';
            const message    = e?.message || String(e);
            const stackLines = e?.stack?.split('\n') || [];
            let file = 'desconocido', line = '?';

            for (const l of stackLines) {
                const match = l.match(/\((.*plugins.*[\\/]([^:\\/]+)):(\d+):(\d+)\)/);
                if (match) { file = match[2]; line = match[3]; break; }
            }

            const debug = isOwner
                ? `💢 *¡Mi amor, algo se rompió!* 💢\nNo te preocupes, yo te arreglo todo 🥺\n\n📌 *Comando:* ${prefix + commandName}\n📂 *Archivo:* ${file} (Línea: ${line})\n📛 *Error:* ${name}\n\n🧾 *Detalle:*\n ${message.slice(0, 280)}`
                : `💢 *¡UGH! ROMPISTE ALGO, TONTO* 💢\n\nAlgo salió mal en el código…\n\n📌 *Comando:* ${prefix + commandName}\n📂 *Archivo:* ${file} (Línea: ${line})\n📛 *Error:* ${name}\n\n🧾 *Detalle:*\n ${message.slice(0, 280)}`;

            if (m?.reply) await m.reply(debug);
        }

    } catch (e) {
        console.log(chalk.red('[ERROR HANDLER GLOBAL]'), e);
        if (m?.reply) await m.reply(`❌ *El núcleo falló* 🥺\n\n🧾 ${String(e).slice(0, 280)}`);
    }
};
