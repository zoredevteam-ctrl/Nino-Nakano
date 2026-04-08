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
            title: `⚔️ ${global.botName || 'Nino Nakano'} RPG`,
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

const CLASES = {
    guerrero:  { emoji: '⚔️',  hp: 180, atk: 25, def: 20, sp: 10, habilidad: 'Golpe Brutal',    desc: 'Tanque cuerpo a cuerpo' },
    mago:      { emoji: '🔮',  hp: 120, atk: 40, def: 10, sp: 20, habilidad: 'Bola de Fuego',   desc: 'Alto daño magico' },
    arquero:   { emoji: '🏹',  hp: 140, atk: 30, def: 15, sp: 25, habilidad: 'Flecha Certera',  desc: 'Velocidad y precision' },
    asesino:   { emoji: '🔪',  hp: 130, atk: 35, def: 12, sp: 30, habilidad: 'Golpe Critico',   desc: 'Daño critico alto' },
    sacerdote: { emoji: '✨',  hp: 150, atk: 15, def: 18, sp: 15, habilidad: 'Curacion Divina', desc: 'Soporte y curacion' },
    gotica:    { emoji: '🖤',  hp: 160, atk: 20, def: 15, sp: 35, habilidad: 'Pedo Maldito',    desc: 'Daño por gas toxico' }
}

const DUNGEONS = [
    { nombre: 'Cueva Oscura',     nivel: 1,  enemigoMin: 1,  enemigoMax: 3,  xpMin: 50,  xpMax: 120,  goldMin: 30,  goldMax: 80  },
    { nombre: 'Bosque Maldito',   nivel: 3,  enemigoMin: 3,  enemigoMax: 6,  xpMin: 100, xpMax: 200,  goldMin: 60,  goldMax: 150 },
    { nombre: 'Torre del Dragon', nivel: 5,  enemigoMin: 5,  enemigoMax: 10, xpMin: 200, xpMax: 400,  goldMin: 120, goldMax: 300 },
    { nombre: 'Castillo Sombrio', nivel: 10, enemigoMin: 8,  enemigoMax: 15, xpMin: 350, xpMax: 600,  goldMin: 200, goldMax: 500 },
    { nombre: 'Abismo del Caos',  nivel: 20, enemigoMin: 15, enemigoMax: 25, xpMin: 600, xpMax: 1000, goldMin: 400, goldMax: 800 }
]

const ENEMIGOS = [
    { nombre: 'Slime',        hp: 30,  atk: 8,  def: 3  },
    { nombre: 'Goblin',       hp: 50,  atk: 12, def: 5  },
    { nombre: 'Esqueleto',    hp: 70,  atk: 18, def: 8  },
    { nombre: 'Orco',         hp: 100, atk: 25, def: 12 },
    { nombre: 'Vampiro',      hp: 120, atk: 30, def: 15 },
    { nombre: 'Dragon Joven', hp: 200, atk: 45, def: 25 },
    { nombre: 'Lich',         hp: 180, atk: 50, def: 20 }
]

const xpParaNivel = (nivel) => Math.floor(100 * Math.pow(1.5, nivel - 1))

const ensureRPG = (db, jid) => {
    if (!db.users) db.users = {}
    if (!db.users[jid]) db.users[jid] = {}
    const u = db.users[jid]
    if (!u.rpg) {
        u.rpg = {
            clase: null, nivel: 1, xp: 0, hp: 100, maxHp: 100,
            atk: 15, def: 10, sp: 10, gold: 0, inventario: [],
            habilidadCd: 0, dungeonCd: 0, atacarCd: 0,
            victorias: 0, derrotas: 0, monstruosMuertos: 0
        }
    }
    return u.rpg
}

const formatCd = ms => {
    if (ms <= 0) return 'Listo!'
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return m + 'm ' + s + 's'
}

let handler = async (m, { conn, command, text, args, db }) => {
    const cmd = command.toLowerCase()
    const sender = m.sender
    const rpg = ensureRPG(db, sender)
    const now = Date.now()

    if (cmd === 'clases') {
        let txt = '⚔️ *CLASES DISPONIBLES*\n\n'
        for (const [nombre, c] of Object.entries(CLASES)) {
            txt += c.emoji + ' *' + nombre.toUpperCase() + '*\n'
            txt += '   ❤️ HP: ' + c.hp + ' | ATK: ' + c.atk + ' | DEF: ' + c.def + '\n'
            txt += '   ✨ Habilidad: ' + c.habilidad + '\n'
            txt += '   📖 ' + c.desc + '\n\n'
        }
        txt += '_Usa *#elegirclase <nombre>* para elegir tu clase_'
        return sendNino(conn, m, txt)
    }

    if (cmd === 'elegirclase') {
        const claseElegida = (text || '').toLowerCase().trim()
        if (!claseElegida || !CLASES[claseElegida]) {
            return sendNino(conn, m,
                '❌ Clase invalida.\n\n' +
                'Clases disponibles: ' + Object.keys(CLASES).join(', ') + '\n\n' +
                'Usa *#clases* para ver los detalles.'
            )
        }
        if (rpg.clase) {
            return sendNino(conn, m, '❌ Ya tienes la clase *' + rpg.clase + '*. No puedes cambiarla.')
        }
        const c = CLASES[claseElegida]
        rpg.clase = claseElegida
        rpg.hp    = c.hp
        rpg.maxHp = c.hp
        rpg.atk   = c.atk
        rpg.def   = c.def
        rpg.sp    = c.sp
        return sendNino(conn, m,
            c.emoji + ' *CLASE ELEGIDA!*\n\n' +
            'Ahora eres un *' + claseElegida.toUpperCase() + '*\n\n' +
            '❤️ HP: ' + c.hp + '\n' +
            '⚔️ ATK: ' + c.atk + '\n' +
            'DEF: ' + c.def + '\n' +
            '⚡ SP: ' + c.sp + '\n\n' +
            '✨ Habilidad: *' + c.habilidad + '*\n\n' +
            '_Usa *#dungeon* para explorar_'
        )
    }

    if (cmd === 'perfil' || cmd === 'rpg') {
        if (!rpg.clase) {
            return sendNino(conn, m,
                '⚔️ *Aun no tienes clase!*\n\n' +
                'Usa *#clases* para ver las clases disponibles\n' +
                'y *#elegirclase <nombre>* para empezar tu aventura'
            )
        }
        const c = CLASES[rpg.clase]
        const xpNecesaria = xpParaNivel(rpg.nivel)
        const xpBar = Math.floor((rpg.xp / xpNecesaria) * 10)
        const barFill = '█'.repeat(Math.max(0, xpBar)) + '░'.repeat(Math.max(0, 10 - xpBar))
        return sendNino(conn, m,
            c.emoji + ' *PERFIL RPG*\n\n' +
            '👤 *Jugador:* ' + (m.pushName || 'Aventurero') + '\n' +
            '🎭 *Clase:* ' + rpg.clase.toUpperCase() + '\n' +
            '⭐ *Nivel:* ' + rpg.nivel + '\n\n' +
            '❤️ *HP:* ' + rpg.hp + ' / ' + rpg.maxHp + '\n' +
            '⚔️ *ATK:* ' + rpg.atk + '\n' +
            'DEF: ' + rpg.def + '\n' +
            '⚡ *SP:* ' + rpg.sp + '\n' +
            '💰 *Gold:* ' + rpg.gold + '\n\n' +
            '📊 *XP:* [' + barFill + '] ' + rpg.xp + '/' + xpNecesaria + '\n\n' +
            '🏆 *Victorias:* ' + rpg.victorias + '\n' +
            '💀 *Derrotas:* ' + rpg.derrotas + '\n' +
            '👹 *Monstruos:* ' + rpg.monstruosMuertos + '\n\n' +
            '✨ *Habilidad:* ' + c.habilidad
        )
    }

    if (cmd === 'dungeon' || cmd === 'explorar') {
        if (!rpg.clase) return sendNino(conn, m, '⚔️ Primero elige tu clase con *#elegirclase*')
        if (rpg.hp <= 0) return sendNino(conn, m, '💀 Estas muerto. Usa *#curar* para recuperarte.')
        const cd = toMs(0, 30, 0)
        if (now - rpg.dungeonCd < cd) {
            return sendNino(conn, m, '⏳ Cooldown: *' + formatCd(rpg.dungeonCd + cd - now) + '*\nDescansa antes de explorar.')
        }
        const dungeonsDisponibles = DUNGEONS.filter(d => rpg.nivel >= d.nivel)
        const dungeon = dungeonsDisponibles[dungeonsDisponibles.length - 1] || DUNGEONS[0]
        const numEnemigos = randInt(dungeon.enemigoMin, dungeon.enemigoMax)
        const enemigo = ENEMIGOS[Math.min(Math.floor(rpg.nivel / 3), ENEMIGOS.length - 1)]
        let hpJugador = rpg.hp
        let rondas = 0
        let victoria = false
        while (hpJugador > 0 && rondas < 20) {
            rondas++
            const danoJ = Math.max(1, randInt(rpg.atk - 5, rpg.atk + 10) - enemigo.def)
            const danoE = Math.max(1, randInt(enemigo.atk - 3, enemigo.atk + 5) - rpg.def)
            let hpEnemigo = enemigo.hp * numEnemigos
            hpEnemigo -= danoJ * rondas
            hpJugador -= danoE
            if (hpEnemigo <= 0) { victoria = true; break }
            if (hpJugador <= 0) { hpJugador = 0; break }
        }
        rpg.dungeonCd = now
        rpg.hp = Math.max(0, hpJugador)
        if (victoria) {
            const xpGanada = randInt(dungeon.xpMin, dungeon.xpMax)
            const goldGanado = randInt(dungeon.goldMin, dungeon.goldMax)
            rpg.xp += xpGanada
            rpg.gold += goldGanado
            rpg.victorias++
            rpg.monstruosMuertos += numEnemigos
            let subioNivel = false
            while (rpg.xp >= xpParaNivel(rpg.nivel)) {
                rpg.xp -= xpParaNivel(rpg.nivel)
                rpg.nivel++
                rpg.maxHp += 15
                rpg.atk += 3
                rpg.def += 2
                rpg.hp = rpg.maxHp
                subioNivel = true
            }
            if (!db.users[sender].money) db.users[sender].money = 0
            db.users[sender].money += Math.floor(goldGanado / 2)
            return sendNino(conn, m,
                '⚔️ *DUNGEON: ' + dungeon.nombre + '*\n\n' +
                'Derrotaste *' + numEnemigos + ' ' + enemigo.nombre + '(s)*\n\n' +
                '✅ *VICTORIA!*\n' +
                '✨ XP: +' + xpGanada + '\n' +
                '💰 Gold: +' + goldGanado + '\n' +
                '❤️ HP: ' + rpg.hp + '/' + rpg.maxHp + '\n' +
                (subioNivel ? '\n🎉 *SUBISTE AL NIVEL ' + rpg.nivel + '!*\n' : '') +
                '_Vuelve en 30 minutos_'
            )
        } else {
            rpg.derrotas++
            rpg.hp = Math.max(1, Math.floor(rpg.maxHp * 0.1))
            return sendNino(conn, m,
                '⚔️ *DUNGEON: ' + dungeon.nombre + '*\n\n' +
                'Fuiste derrotado por *' + numEnemigos + ' ' + enemigo.nombre + '(s)*\n\n' +
                '❌ *DERROTA*\n' +
                '❤️ HP: ' + rpg.hp + '/' + rpg.maxHp + '\n\n' +
                '_Usa *#curar* para recuperar HP_'
            )
        }
    }

    if (cmd === 'atacar') {
        if (!rpg.clase) return sendNino(conn, m, '⚔️ Primero elige tu clase con *#elegirclase*')
        if (rpg.hp <= 0) return sendNino(conn, m, '💀 Estas muerto. Usa *#curar* para recuperarte.')
        const cd = toMs(0, 5, 0)
        if (now - rpg.atacarCd < cd) {
            return sendNino(conn, m, '⏳ Cooldown: *' + formatCd(rpg.atacarCd + cd - now) + '*')
        }
        const enemigo = ENEMIGOS[randInt(0, Math.min(Math.floor(rpg.nivel / 2), ENEMIGOS.length - 1))]
        let hpEnemigo = enemigo.hp
        let hpJugador = rpg.hp
        let combatLog = '⚔️ *VS ' + enemigo.nombre + '*\n\n'
        for (let i = 0; i < 5; i++) {
            const danoJ = Math.max(1, randInt(rpg.atk - 3, rpg.atk + 8) - enemigo.def)
            const danoE = Math.max(1, randInt(enemigo.atk - 2, enemigo.atk + 4) - rpg.def)
            hpEnemigo -= danoJ
            combatLog += 'Ronda ' + (i + 1) + ': Tu causas *' + danoJ + '* daño'
            if (hpEnemigo <= 0) { combatLog += '\n'; break }
            hpJugador -= danoE
            combatLog += ' | Recibes *' + danoE + '* daño\n'
            if (hpJugador <= 0) { hpJugador = 0; break }
        }
        rpg.atacarCd = now
        rpg.hp = Math.max(0, hpJugador)
        if (hpEnemigo <= 0) {
            const xp = randInt(10, 30)
            const gold = randInt(5, 20)
            rpg.xp += xp
            rpg.gold += gold
            rpg.monstruosMuertos++
            rpg.victorias++
            while (rpg.xp >= xpParaNivel(rpg.nivel)) {
                rpg.xp -= xpParaNivel(rpg.nivel)
                rpg.nivel++
                rpg.maxHp += 15
                rpg.atk += 3
                rpg.def += 2
                rpg.hp = rpg.maxHp
            }
            return sendNino(conn, m, combatLog + '\n✅ *Ganaste!*\n✨ XP: +' + xp + ' | 💰 Gold: +' + gold + '\n❤️ HP: ' + rpg.hp + '/' + rpg.maxHp)
        } else {
            rpg.derrotas++
            return sendNino(conn, m, combatLog + '\n❌ *Perdiste*\n❤️ HP: ' + rpg.hp + '/' + rpg.maxHp)
        }
    }

    if (cmd === 'habilidad' || cmd === 'skill') {
        if (!rpg.clase) return sendNino(conn, m, '⚔️ Primero elige tu clase con *#elegirclase*')
        if (rpg.hp <= 0) return sendNino(conn, m, '💀 Estas muerto. Usa *#curar* para recuperarte.')
        const cd = toMs(1, 0, 0)
        if (now - rpg.habilidadCd < cd) {
            return sendNino(conn, m, '⏳ Habilidad en cooldown: *' + formatCd(rpg.habilidadCd + cd - now) + '*')
        }
        const c = CLASES[rpg.clase]
        const enemigo = ENEMIGOS[randInt(0, ENEMIGOS.length - 1)]
        let resultado = ''
        let xpBonus = 0
        let goldBonus = 0
        if (rpg.clase === 'guerrero') {
            const dano = randInt(rpg.atk * 2, rpg.atk * 3)
            xpBonus = 40; goldBonus = 25
            resultado = '💥 *Golpe Brutal* causa *' + dano + '* de daño masivo a ' + enemigo.nombre + '!'
        } else if (rpg.clase === 'mago') {
            const dano = randInt(rpg.atk * 2, rpg.atk * 4)
            xpBonus = 50; goldBonus = 30
            resultado = '🔥 *Bola de Fuego* explota por *' + dano + '* de daño magico a ' + enemigo.nombre + '!'
        } else if (rpg.clase === 'arquero') {
            const dano = randInt(rpg.atk * 1.5, rpg.atk * 3)
            xpBonus = 35; goldBonus = 20
            resultado = '🏹 *Flecha Certera* impacta por *' + dano + '* de daño a ' + enemigo.nombre + '!'
        } else if (rpg.clase === 'asesino') {
            const critico = Math.random() > 0.3
            const dano = critico ? randInt(rpg.atk * 3, rpg.atk * 5) : randInt(rpg.atk, rpg.atk * 2)
            xpBonus = 45; goldBonus = 35
            resultado = '🔪 *Golpe Critico* ' + (critico ? 'CRITICO!' : '') + ' causa *' + dano + '* de daño a ' + enemigo.nombre + '!'
        } else if (rpg.clase === 'gotica') {
            const victimas = randInt(1, 5)
            const dano = randInt(rpg.sp * 2, rpg.sp * 4)
            rpg.hp = Math.min(rpg.maxHp, rpg.hp + 10)
            xpBonus = 55; goldBonus = 40
            resultado = '🖤💨 *Pedo Maldito* lanzo un gas toxico a *' + victimas + ' enemigos* causando *' + dano + '* de daño!\n\n_Los enemigos huyeron... y tu casi tambien_ 💀\n❤️ HP: +10'
        } else if (rpg.clase === 'sacerdote') {
            const cura = randInt(30, 80)
            rpg.hp = Math.min(rpg.maxHp, rpg.hp + cura)
            xpBonus = 30; goldBonus = 15
            resultado = '✨ *Curacion Divina* restaura *' + cura + '* HP!\n❤️ HP: ' + rpg.hp + '/' + rpg.maxHp
        }
        rpg.xp += xpBonus
        rpg.gold += goldBonus
        rpg.habilidadCd = now
        rpg.monstruosMuertos++
        while (rpg.xp >= xpParaNivel(rpg.nivel)) {
            rpg.xp -= xpParaNivel(rpg.nivel)
            rpg.nivel++
            rpg.maxHp += 15
            rpg.atk += 3
            rpg.def += 2
            rpg.hp = rpg.maxHp
        }
        return sendNino(conn, m,
            c.emoji + ' *HABILIDAD: ' + c.habilidad.toUpperCase() + '*\n\n' +
            resultado + '\n\n' +
            '✨ XP: +' + xpBonus + ' | 💰 Gold: +' + goldBonus + '\n' +
            '_Cooldown: 1 hora_'
        )
    }

    if (cmd === 'curar' || cmd === 'heal') {
        if (!rpg.clase) return sendNino(conn, m, '⚔️ Primero elige tu clase con *#elegirclase*')
        if (rpg.hp >= rpg.maxHp) return sendNino(conn, m, '❤️ Ya tienes el HP al maximo! (' + rpg.hp + '/' + rpg.maxHp + ')')
        const costo = 50
        if (rpg.gold < costo) {
            return sendNino(conn, m,
                '💊 *CURAR*\n\n' +
                'Cuesta *' + costo + ' Gold* curarte.\n' +
                'Tu gold: *' + rpg.gold + '*\n\n' +
                '_Gana gold explorando dungeons_'
            )
        }
        rpg.gold -= costo
        const hpAntes = rpg.hp
        rpg.hp = rpg.maxHp
        return sendNino(conn, m,
            '💊 *CURADO!*\n\n' +
            '❤️ HP: ' + hpAntes + ' → ' + rpg.maxHp + '/' + rpg.maxHp + '\n' +
            '💰 Gold gastado: ' + costo + '\n' +
            '💰 Gold restante: ' + rpg.gold
        )
    }

    if (cmd === 'inventario' || cmd === 'inv') {
        if (!rpg.clase) return sendNino(conn, m, '⚔️ Primero elige tu clase con *#elegirclase*')
        if (!rpg.inventario?.length) {
            return sendNino(conn, m, '🎒 *INVENTARIO*\n\nTu mochila esta vacia.\n\n_Usa *#tiendarpg* para comprar items_')
        }
        let txt = '🎒 *INVENTARIO*\n\n'
        rpg.inventario.forEach((item, i) => {
            txt += (i + 1) + '. ' + item.emoji + ' *' + item.nombre + '* — ' + item.efecto + '\n'
        })
        txt += '\n_Usa *#usar <numero>* para usar un item_'
        return sendNino(conn, m, txt)
    }

    if (cmd === 'usar') {
        if (!rpg.clase) return sendNino(conn, m, '⚔️ Primero elige tu clase con *#elegirclase*')
        const idx = parseInt(text) - 1
        if (isNaN(idx) || !rpg.inventario[idx]) {
            return sendNino(conn, m, '❌ Item invalido. Usa *#inventario* para ver tus items.')
        }
        const item = rpg.inventario[idx]
        rpg.inventario.splice(idx, 1)
        if (item.tipo === 'pocion') {
            rpg.hp = Math.min(rpg.maxHp, rpg.hp + item.valor)
            return sendNino(conn, m, item.emoji + ' Usaste *' + item.nombre + '*\n❤️ HP: +' + item.valor + '\n❤️ HP actual: ' + rpg.hp + '/' + rpg.maxHp)
        } else if (item.tipo === 'buff') {
            rpg.atk += item.valor
            return sendNino(conn, m, item.emoji + ' Usaste *' + item.nombre + '*\n⚔️ ATK: +' + item.valor)
        }
        return sendNino(conn, m, item.emoji + ' Usaste *' + item.nombre + '*')
    }

    if (cmd === 'rpgtop') {
        const users = db.users || {}
        const top = Object.entries(users)
            .filter(([, u]) => u.rpg && u.rpg.clase)
            .map(([jid, u]) => ({ jid, nivel: u.rpg.nivel, victorias: u.rpg.victorias }))
            .sort((a, b) => b.nivel - a.nivel || b.victorias - a.victorias)
            .slice(0, 10)
        if (!top.length) return sendNino(conn, m, '⚔️ Nadie ha empezado su aventura aun.')
        let txt = '🏆 *TOP RPG*\n\n'
        top.forEach((p, i) => {
            txt += (i + 1) + '. @' + p.jid.split('@')[0] + ' — Nv.' + p.nivel + ' | ' + p.victorias + ' victorias\n'
        })
        return conn.sendMessage(m.chat, {
            text: txt,
            mentions: top.map(p => p.jid),
            contextInfo: {
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: global.newsletterJid || '120363408182996815@newsletter',
                    serverMessageId: '',
                    newsletterName: global.newsletterName || 'Nino Nakano'
                },
                externalAdReply: {
                    title: 'TOP RPG',
                    body: global.botName || 'Nino Nakano',
                    thumbnailUrl: global.banner || '',
                    sourceUrl: global.rcanal || RCANAL,
                    mediaType: 1
                }
            }
        }, { quoted: m })
    }
}

handler.command = ['perfil', 'rpg', 'clases', 'elegirclase', 'dungeon', 'explorar',
                   'atacar', 'habilidad', 'skill', 'curar', 'heal',
                   'inventario', 'inv', 'usar', 'rpgtop']
export default handler
