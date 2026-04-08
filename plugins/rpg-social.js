import { database } from '../lib/database.js'

const RCANAL = 'https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G'

const sendNino = (conn, m, text) => conn.sendMessage(m.chat, {
    text,
    contextInfo: {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
            serverMessageId: '',
            newsletterName: global.newsletterName || 'Nino Nakano'
        },
        externalAdReply: {
            title: '⚔️ ' + (global.botName || 'Nino Nakano') + ' RPG',
            body: 'Sistema de Aventuras',
            thumbnailUrl: global.banner || '',
            sourceUrl: global.rcanal || RCANAL,
            mediaType: 1,
            renderLargerThumbnail: false,
            showAdAttribution: false
        }
    }
}, { quoted: m })

const toMs = (h = 0, m = 0, s = 0) => ((h * 3600) + (m * 60) + s) * 1000
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const TIENDA_ITEMS = [
    { id: 1, nombre: 'Pocion Pequeña',  emoji: '🧪', tipo: 'pocion', valor: 50,  precio: 80,  efecto: 'Restaura 50 HP' },
    { id: 2, nombre: 'Pocion Grande',   emoji: '💊', tipo: 'pocion', valor: 150, precio: 200, efecto: 'Restaura 150 HP' },
    { id: 3, nombre: 'Elixir Supremo',  emoji: '✨', tipo: 'pocion', valor: 999, precio: 500, efecto: 'Restaura todo el HP' },
    { id: 4, nombre: 'Espada de Fuego', emoji: '🔥', tipo: 'buff',   valor: 15,  precio: 350, efecto: '+15 ATK permanente' },
    { id: 5, nombre: 'Escudo Sagrado',  emoji: '🛡️', tipo: 'buff',  valor: 10,  precio: 300, efecto: '+10 DEF permanente' },
    { id: 6, nombre: 'Amuleto Mistico', emoji: '🔮', tipo: 'buff',   valor: 20,  precio: 600, efecto: '+20 SP permanente' },
    { id: 7, nombre: 'Tomo de Poder',   emoji: '📖', tipo: 'xp',    valor: 500, precio: 400, efecto: '+500 XP' },
    { id: 8, nombre: 'Bolsa de Gold',   emoji: '💰', tipo: 'gold',  valor: 300, precio: 250, efecto: '+300 Gold' }
]

const MISIONES = [
    { id: 1, nombre: 'Primer Sangre',    desc: 'Mata 5 monstruos',     objetivo: 5,    tipo: 'monstruos', xp: 100, gold: 80  },
    { id: 2, nombre: 'Cazador',          desc: 'Mata 20 monstruos',    objetivo: 20,   tipo: 'monstruos', xp: 300, gold: 200 },
    { id: 3, nombre: 'Guerrero Probado', desc: 'Gana 10 combates PvP', objetivo: 10,   tipo: 'pvp',       xp: 500, gold: 350 },
    { id: 4, nombre: 'Explorador',       desc: 'Completa 3 dungeons',  objetivo: 3,    tipo: 'dungeon',   xp: 200, gold: 150 },
    { id: 5, nombre: 'Rico',             desc: 'Acumula 1000 gold',    objetivo: 1000, tipo: 'gold',      xp: 400, gold: 0   }
]

const ensureRPG = (db, jid) => {
    if (!db.users) db.users = {}
    if (!db.users[jid]) db.users[jid] = {}
    const u = db.users[jid]
    if (!u.rpg) u.rpg = {
        clase: null, nivel: 1, xp: 0, hp: 100, maxHp: 100,
        atk: 15, def: 10, sp: 10, gold: 0, inventario: [],
        habilidadCd: 0, dungeonCd: 0, atacarCd: 0,
        victorias: 0, derrotas: 0, monstruosMuertos: 0,
        pvpCd: 0, misionesCompletadas: [], dungeonesCompletados: 0
    }
    if (!u.rpg.pvpCd) u.rpg.pvpCd = 0
    if (!u.rpg.misionesCompletadas) u.rpg.misionesCompletadas = []
    if (!u.rpg.dungeonesCompletados) u.rpg.dungeonesCompletados = 0
    return u.rpg
}

const formatCd = ms => {
    if (ms <= 0) return 'Listo!'
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return m + 'm ' + s + 's'
}

const xpParaNivel = (nivel) => Math.floor(100 * Math.pow(1.5, nivel - 1))

let handler = async (m, { conn, command, text, args, db }) => {
    const cmd = command.toLowerCase()
    const sender = m.sender
    const rpg = ensureRPG(db, sender)
    const now = Date.now()

    // ==================== #pelear PvP ====================
    if (cmd === 'pelear' || cmd === 'pvp' || cmd === 'duel') {
        if (!rpg.clase) return sendNino(conn, m, '⚔️ Primero elige tu clase con *#elegirclase*')
        if (rpg.hp <= 0) return sendNino(conn, m, '💀 Estas muerto. Usa *#curar* para recuperarte.')
        const cd = toMs(0, 15, 0)
        if (now - rpg.pvpCd < cd) {
            return sendNino(conn, m, '⏳ Cooldown PvP: *' + formatCd(rpg.pvpCd + cd - now) + '*')
        }
        const target = m.quoted?.sender || m.mentionedJid?.[0]
        if (!target) return sendNino(conn, m, '⚔️ Menciona o responde a alguien para pelear.\nEjemplo: *#pelear @usuario*')
        if (target === sender) return sendNino(conn, m, '❌ No puedes pelearte contigo mismo.')
        ensureRPG(db, target)
        const rpgTarget = db.users[target].rpg
        if (!rpgTarget.clase) return sendNino(conn, m, '❌ Ese jugador no tiene clase RPG aun.')
        if (rpgTarget.hp <= 0) return sendNino(conn, m, '❌ Ese jugador esta muerto.')
        let hpA = rpg.hp
        let hpB = rpgTarget.hp
        let log = '⚔️ *PvP: @' + sender.split('@')[0] + ' VS @' + target.split('@')[0] + '*\n\n'
        for (let i = 0; i < 10 && hpA > 0 && hpB > 0; i++) {
            const danoA = Math.max(1, randInt(rpg.atk - 5, rpg.atk + 10) - rpgTarget.def)
            const danoB = Math.max(1, randInt(rpgTarget.atk - 5, rpgTarget.atk + 10) - rpg.def)
            hpA -= danoB
            hpB -= danoA
            log += 'R' + (i + 1) + ': Tu *-' + danoB + '* | Rival *-' + danoA + '*\n'
        }
        rpg.pvpCd = now
        const ganoA = hpA >= hpB
        if (ganoA) {
            rpg.victorias++
            rpg.xp += randInt(50, 100)
            rpg.gold += randInt(20, 60)
            rpgTarget.derrotas++
            rpg.hp = Math.max(1, hpA)
            rpgTarget.hp = Math.max(1, Math.floor(rpgTarget.maxHp * 0.2))
        } else {
            rpg.derrotas++
            rpgTarget.victorias++
            rpg.hp = Math.max(1, Math.floor(rpg.maxHp * 0.2))
            rpgTarget.hp = Math.max(1, hpB)
        }
        return conn.sendMessage(m.chat, {
            text: log + '\n' + (ganoA ? '🏆 *@' + sender.split('@')[0] + ' GANO!*' : '💀 *@' + sender.split('@')[0] + ' perdio*\n🏆 *@' + target.split('@')[0] + ' gano*'),
            mentions: [sender, target],
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                    serverMessageId: '',
                    newsletterName: global.newsletterName || 'Nino Nakano'
                },
                externalAdReply: {
                    title: 'PvP Battle',
                    body: (global.botName || 'Nino') + ' RPG',
                    thumbnailUrl: global.banner || '',
                    sourceUrl: global.rcanal || RCANAL,
                    mediaType: 1
                }
            }
        }, { quoted: m })
    }

    // ==================== #tiendarpg ====================
    if (cmd === 'tiendarpg' || cmd === 'shop2') {
        if (!text || !text.trim()) {
            let txt = '🛒 *TIENDA RPG*\n\n'
            TIENDA_ITEMS.forEach(item => {
                txt += '*' + item.id + '.* ' + item.emoji + ' ' + item.nombre + ' — ' + item.precio + ' Gold\n'
                txt += '   _' + item.efecto + '_\n'
            })
            txt += '\n_Usa *#tiendarpg comprar <numero>* para comprar_\n'
            txt += '💰 Tu gold: *' + rpg.gold + '*'
            return sendNino(conn, m, txt)
        }
        if (text.startsWith('comprar')) {
            const idx = parseInt(text.split(' ')[1]) - 1
            const item = TIENDA_ITEMS[idx]
            if (!item) return sendNino(conn, m, '❌ Item invalido. Usa *#tiendarpg* para ver la lista.')
            if (rpg.gold < item.precio) {
                return sendNino(conn, m, '❌ No tienes suficiente gold.\nNecesitas: *' + item.precio + '*\nTienes: *' + rpg.gold + '*')
            }
            rpg.gold -= item.precio
            if (item.tipo === 'buff') {
                if (item.nombre.includes('Espada')) rpg.atk += item.valor
                else if (item.nombre.includes('Escudo')) rpg.def += item.valor
                else if (item.nombre.includes('Amuleto')) rpg.sp += item.valor
                return sendNino(conn, m, item.emoji + ' *Compraste ' + item.nombre + '!*\n\n✅ ' + item.efecto + '\n💰 Gold: ' + rpg.gold)
            } else if (item.tipo === 'xp') {
                rpg.xp += item.valor
                while (rpg.xp >= xpParaNivel(rpg.nivel)) {
                    rpg.xp -= xpParaNivel(rpg.nivel)
                    rpg.nivel++
                    rpg.maxHp += 15
                    rpg.atk += 3
                    rpg.def += 2
                }
                return sendNino(conn, m, item.emoji + ' *Compraste ' + item.nombre + '!*\n\n+' + item.valor + ' XP\nNivel: ' + rpg.nivel + '\n💰 Gold: ' + rpg.gold)
            } else if (item.tipo === 'gold') {
                rpg.gold += item.valor
                return sendNino(conn, m, item.emoji + ' *Compraste ' + item.nombre + '!*\n\n+' + item.valor + ' Gold\n💰 Gold total: ' + rpg.gold)
            } else {
                if (!rpg.inventario) rpg.inventario = []
                rpg.inventario.push({ ...item })
                return sendNino(conn, m, item.emoji + ' *Compraste ' + item.nombre + '!*\n\nAgregado a tu inventario\n💰 Gold: ' + rpg.gold)
            }
        }
    }

    // ==================== #clan ====================
    if (cmd === 'clan') {
        if (!db.clanes) db.clanes = {}
        const subcmd = (args[0] || '').toLowerCase()
        const miClan = Object.entries(db.clanes).find(([, c]) => c.miembros && c.miembros.includes(sender))

        if (!subcmd || subcmd === 'info') {
            if (!miClan) {
                return sendNino(conn, m,
                    '🏰 *CLANES*\n\n' +
                    'No perteneces a ningun clan.\n\n' +
                    '*Comandos:*\n' +
                    '› *#clan crear <nombre>*\n' +
                    '› *#clan unirse <nombre>*\n' +
                    '› *#clan lista*\n' +
                    '› *#clan salir*\n' +
                    '› *#clan kick @usuario*'
                )
            }
            const [, clan] = miClan
            return sendNino(conn, m,
                '🏰 *CLAN: ' + clan.nombre + '*\n\n' +
                '👑 Lider: @' + clan.lider.split('@')[0] + '\n' +
                '👥 Miembros: ' + clan.miembros.length + '\n' +
                '🏆 Victorias: ' + (clan.victorias || 0) + '\n' +
                '💰 Gold: ' + (clan.gold || 0)
            )
        }

        if (subcmd === 'crear') {
            const nombre = args.slice(1).join(' ').trim()
            if (!nombre) return sendNino(conn, m, '❌ Usa: *#clan crear <nombre>*')
            if (miClan) return sendNino(conn, m, '❌ Ya estas en el clan *' + miClan[1].nombre + '*. Sal primero.')
            const existe = Object.values(db.clanes).find(c => c.nombre.toLowerCase() === nombre.toLowerCase())
            if (existe) return sendNino(conn, m, '❌ Ya existe un clan con ese nombre.')
            const clanId = 'clan_' + Date.now()
            db.clanes[clanId] = { nombre, lider: sender, miembros: [sender], victorias: 0, gold: 0 }
            return sendNino(conn, m, '🏰 *CLAN CREADO!*\n\nNombre: *' + nombre + '*\n👑 Lider: @' + sender.split('@')[0])
        }

        if (subcmd === 'unirse') {
            const nombre = args.slice(1).join(' ').trim()
            if (!nombre) return sendNino(conn, m, '❌ Usa: *#clan unirse <nombre>*')
            if (miClan) return sendNino(conn, m, '❌ Ya estas en el clan *' + miClan[1].nombre + '*.')
            const entrada = Object.entries(db.clanes).find(([, c]) => c.nombre.toLowerCase() === nombre.toLowerCase())
            if (!entrada) return sendNino(conn, m, '❌ No encontre el clan *' + nombre + '*.')
            const [clanId, clan] = entrada
            if (clan.miembros.length >= 20) return sendNino(conn, m, '❌ El clan esta lleno (max 20).')
            clan.miembros.push(sender)
            return sendNino(conn, m, '🏰 *Te uniste al clan ' + clan.nombre + '!*\n👥 Miembros: ' + clan.miembros.length)
        }

        if (subcmd === 'salir') {
            if (!miClan) return sendNino(conn, m, '❌ No estas en ningun clan.')
            const [clanId, clan] = miClan
            if (clan.lider === sender && clan.miembros.length > 1) {
                return sendNino(conn, m, '❌ Eres el lider. Pasa el liderazgo primero.')
            }
            clan.miembros = clan.miembros.filter(j => j !== sender)
            if (clan.miembros.length === 0) delete db.clanes[clanId]
            return sendNino(conn, m, '✅ Saliste del clan *' + clan.nombre + '*.')
        }

        if (subcmd === 'lista') {
            const lista = Object.values(db.clanes)
            if (!lista.length) return sendNino(conn, m, '🏰 No hay clanes creados aun.')
            let txt = '🏰 *LISTA DE CLANES*\n\n'
            lista.sort((a, b) => (b.victorias || 0) - (a.victorias || 0))
                .forEach((c, i) => { txt += (i + 1) + '. *' + c.nombre + '* — ' + c.miembros.length + ' miembros\n' })
            return sendNino(conn, m, txt)
        }

        if (subcmd === 'kick') {
            const target = m.quoted?.sender || m.mentionedJid?.[0]
            if (!target) return sendNino(conn, m, '❌ Menciona al usuario a expulsar.')
            const liderClan = Object.entries(db.clanes).find(([, c]) => c.lider === sender)
            if (!liderClan) return sendNino(conn, m, '❌ Solo el lider puede expulsar miembros.')
            const [clanId, clan] = liderClan
            if (!clan.miembros.includes(target)) return sendNino(conn, m, '❌ Ese usuario no esta en tu clan.')
            clan.miembros = clan.miembros.filter(j => j !== target)
            return sendNino(conn, m, '✅ @' + target.split('@')[0] + ' fue expulsado del clan.')
        }
    }

    // ==================== #misiones ====================
    if (cmd === 'misiones' || cmd === 'quest') {
        if (!rpg.clase) return sendNino(conn, m, '⚔️ Primero elige tu clase con *#elegirclase*')
        let txt = '📜 *MISIONES*\n\n'
        MISIONES.forEach(mision => {
            const completada = rpg.misionesCompletadas && rpg.misionesCompletadas.includes(mision.id)
            let progreso = 0
            if (mision.tipo === 'monstruos') progreso = rpg.monstruosMuertos || 0
            else if (mision.tipo === 'pvp')    progreso = rpg.victorias || 0
            else if (mision.tipo === 'dungeon') progreso = rpg.dungeonesCompletados || 0
            else if (mision.tipo === 'gold')   progreso = rpg.gold || 0
            const pct = Math.min(100, Math.floor((progreso / mision.objetivo) * 100))
            const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10))
            if (completada) {
                txt += '✅ *' + mision.nombre + '* — COMPLETADA\n\n'
            } else {
                txt += '📌 *' + mision.nombre + '*\n   ' + mision.desc + '\n   [' + bar + '] ' + progreso + '/' + mision.objetivo + '\n   🎁 XP: ' + mision.xp + ' | Gold: ' + mision.gold + '\n\n'
            }
        })
        txt += '_Usa *#reclamar <numero>* para reclamar_'
        return sendNino(conn, m, txt)
    }

    // ==================== #reclamar ====================
    if (cmd === 'reclamar') {
        if (!rpg.clase) return sendNino(conn, m, '⚔️ Primero elige tu clase con *#elegirclase*')
        const id = parseInt(text)
        const mision = MISIONES.find(mi => mi.id === id)
        if (!mision) return sendNino(conn, m, '❌ Mision invalida. Usa *#misiones* para ver la lista.')
        if (rpg.misionesCompletadas && rpg.misionesCompletadas.includes(id)) {
            return sendNino(conn, m, '❌ Ya reclamaste esta mision.')
        }
        let progreso = 0
        if (mision.tipo === 'monstruos') progreso = rpg.monstruosMuertos || 0
        else if (mision.tipo === 'pvp')    progreso = rpg.victorias || 0
        else if (mision.tipo === 'dungeon') progreso = rpg.dungeonesCompletados || 0
        else if (mision.tipo === 'gold')   progreso = rpg.gold || 0
        if (progreso < mision.objetivo) {
            return sendNino(conn, m, '❌ Aun no completaste *' + mision.nombre + '*\nProgreso: ' + progreso + '/' + mision.objetivo)
        }
        rpg.xp += mision.xp
        rpg.gold += mision.gold
        if (!rpg.misionesCompletadas) rpg.misionesCompletadas = []
        rpg.misionesCompletadas.push(id)
        return sendNino(conn, m,
            '🎉 *MISION COMPLETADA!*\n\n' +
            '📌 *' + mision.nombre + '*\n\n' +
            '✨ XP: +' + mision.xp + '\n' +
            '💰 Gold: +' + mision.gold
        )
    }
}

handler.command = ['pelear', 'pvp', 'duel', 'tiendarpg', 'shop2',
                   'clan', 'misiones', 'quest', 'reclamar']
export default handler
