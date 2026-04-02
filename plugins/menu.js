const os = require('os');
const db = require('../lib/database');
require('../settings');

let handler = async (nino, m, { pushname, sender }) => {
    const start = Date.now();
    const end = Date.now();
    const p = `${end - start}ms`;

    const uptimeSeconds = process.uptime();
    const d = Math.floor(uptimeSeconds / (3600 * 24));
    const h = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const min = Math.floor((uptimeSeconds % 3600) / 60);
    const s = Math.floor(uptimeSeconds % 60);
    const uptime = `${d}d ${h}h ${min}m ${s}s`;

    const totalreg = Object.keys(db.data.users).length;
    const user = db.data.users[sender];
    const isOficial = true;
    const nombreBot = global.botName;
    const username = pushname;
    const currency = 'Limit';
    const userMoney = user.limit || 0;
    const userExp = user.xp || 0;
    const userLevel = user.level || 1;

    const sortedExp = Object.entries(db.data.users).sort((a, b) => b[1].xp - a[1].xp);
    const rankIndex = sortedExp.findIndex(u => u[0] === sender) + 1;
    const rankText = `${rankIndex} / ${totalreg}`;

    const getRango = (level) => {
        if (level < 5) return 'Novato';
        if (level < 15) return 'Aprendiz';
        if (level < 30) return 'Guerrero';
        if (level < 50) return 'Élite';
        if (level < 100) return 'Maestro';
        return 'Nino Lover';
    };
    const rango = getRango(userLevel);

    let txt = `¡𝐇𝐨𝐥𝐚! Soy *${nombreBot}* ${isOficial ? '(OficialBot)' : '(Sub-Bot)'}

> ꒰⌢ ʚ˚₊‧ ✎ ꒱ INFO:
- ${nombreBot} es un bot privado, el cual el bot principal no se unirá a tus grupos. Si quieres tener el bot en tu grupo tienes que ser Sub-Bot con *(#code)*
> ꒰⌢ ʚ˚₊‧ ✎ ꒱ ❐ ʚ˚₊‧ʚ˚₊‧ʚ˚

*╭╼𝅄꒰𑁍⃪࣭۪ٜ݊݊݊݊݊໑ٜ࣪ ꒱ 𐔌 BOT - INFO 𐦯*
*|✎ Creador:* 𝓐𝓪𝓻𝓸𝓶
*|✎ Users:* ${totalreg.toLocaleString()}
*|✎ Uptime:* ${uptime}
*|✎ Ping:* ${p}
*|✎ Baileys:* Multi-Device
*|✎ Comandos:* https://github.com/Z0RT-SYSTEMS
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎⃪𐇽۫۬🦋⃘۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*╭╼𝅄꒰✧: ꒱ 𐔌 INFO - USER 𐦯*
*|✎ Nombre:* ${username}
*|✎ ${currency}:* ${userMoney}
*|✎ Exp:* ${userExp}
*|✎ Rango:* ${rango}
*|✎ Nivel:* ${userLevel}
*|✎ Top:* ${rankText}
*╰─ׅ─ׅ┈ ─๋︩︪─☪︎︎︎̸⃘̸࣭ٜ࣪࣪࣪۬◌⃘۪֟፝֯۫۫︎⃪𐇽۫۬🎀⃘۪֟፝֯۫۫۫۬◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸─ׅ─ׅ┈ ─๋︩︪─╯*

*➪ 𝗟𝗜𝗦𝗧𝗔*
       *➪  𝗗𝗘*
           *➪ 𝗖𝗢𝗠𝗔𝗡𝗗𝗢𝗦*

*꒰⌢◌⃘࣭ٜ࣪࣪࣪۬☪︎︎︎︎̸ ♡  ꒱ 𐔌 SISTEMA 𐦯*
> *✧･ﾟ: ❏ #p*
> *✧･ﾟ: ❏ #ping*
> *✧･ﾟ: ❏ #owner*`;

    await nino.sendMessage(m.key.remoteJid, { 
        text: txt,
        contextInfo: {
            externalAdReply: {
                title: nombreBot,
                body: 'Butterfly System Edition',
                thumbnailUrl: 'https://i.pinimg.com/736x/8e/3c/6d/8e3c6d37019842f132f831968846c483.jpg',
                sourceUrl: 'https://github.com/',
                mediaType: 1,
                renderLargerThumbnail: true
            }
        }
    }, { quoted: m });
};

handler.command = ['menu', 'help'];
module.exports = handler;
