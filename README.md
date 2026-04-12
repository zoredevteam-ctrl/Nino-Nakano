<div align="center">

<!-- ══════════════════════════════════════════════════════════════ -->
<!--                    HEADER BANNER                              -->
<!-- ══════════════════════════════════════════════════════════════ -->

<img src="https://causas-files.vercel.app/fl/9vih.gif" alt="Nino Nakano Banner" width="100%"/>

<br/>

# 🦋 NINO NAKANO — WHATSAPP BOT 🦋

<samp><strong>Modular · High-Performance · Anime-Powered</strong></samp>

<br/>

<!-- BADGES ROW 1 -->
[![WhatsApp Channel](https://img.shields.io/badge/Canal%20Oficial-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029Vb85bh7EAKWOM4Zw8N3G)
[![Status](https://img.shields.io/badge/Status-🟢%20Online-00FF88?style=for-the-badge&labelColor=0d0d0d)](.)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](.)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](.)

<!-- BADGES ROW 2 -->
[![License](https://img.shields.io/badge/License-MIT-FF69B4?style=for-the-badge&labelColor=0d0d0d)](./LICENSE)
[![Baileys](https://img.shields.io/badge/Powered%20By-Baileys-8A2BE2?style=for-the-badge&logo=whatsapp&logoColor=white)](.)
[![Platform](https://img.shields.io/badge/Platform-Termux%20%7C%20Linux%20%7C%20Windows-orange?style=for-the-badge&logo=linux&logoColor=white)](.)
[![Made with ❤️](https://img.shields.io/badge/Made%20with-❤️%20by%20𝓐𝓪𝓻𝓸𝓶-FF1493?style=for-the-badge&labelColor=0d0d0d)](.)

<br/>

---

</div>

## 🌸 ¿Qué es Nino Nakano Bot?

<img align="right" src="https://causas-files.vercel.app/fl/blr8.png" alt="Aarom - Creador" width="160" style="border-radius: 12px; margin-left: 20px"/>

**Nino Nakano** es un bot de WhatsApp **modular y de alto rendimiento**, diseñado bajo la arquitectura de **𝓐𝓪𝓻𝓸𝓶 / Z0RT SYSTEMS**. No es un bot genérico: fue construido con enfoque en **seguridad**, **gestión avanzada de grupos**, **entretenimiento** y **personalización extrema**, todo envuelto en una estética **cyberpunk/anime**.

> *"No creas que estoy aquí para ayudarte porque quiero... ¡solo asegúrate de usarme bien, tonto!"*  
> — **Nino Nakano**

<br clear="right"/>

---

## 🧬 Stack Tecnológico

<div align="center">

| Tecnología | Uso |
|:---:|:---|
| ![JS](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black) | Lenguaje principal del proyecto |
| ![Node](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) | Runtime de ejecución |
| ![Baileys](https://img.shields.io/badge/Baileys-8A2BE2?style=flat-square&logo=whatsapp&logoColor=white) | Librería de WhatsApp Web API |
| ![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?style=flat-square&logo=ffmpeg&logoColor=white) | Procesamiento multimedia |
| ![ImageMagick](https://img.shields.io/badge/ImageMagick-CC0000?style=flat-square) | Manipulación de imágenes |

</div>

---

## ✨ Características Principales

<details>
<summary><b>⚙️ Sistema de Plugins Dinámico</b></summary>
<br/>
Agrega o elimina funciones sin tocar el código base. Cada plugin es independiente, permitiendo una arquitectura limpia y escalable con hot-reload en tiempo real.
</details>

<details>
<summary><b>🛡️ Gestión de Grupos Pro</b></summary>
<br/>
Comandos de administración avanzados: <code>#kick</code>, <code>#ban</code>, <code>#mute</code>, <code>#promote</code> con sistema de validación de permisos y logs de auditoría. Seguridad primero.
</details>

<details>
<summary><b>👋 Bienvenida Personalizada</b></summary>
<br/>
Saludos automáticos con la foto de perfil del usuario, menciones directas y mensajes personalizables por grupo.
</details>

<details>
<summary><b>🏆 Sistema de Niveles & XP</b></summary>
<br/>
Ranking automático de usuarios basado en actividad. Usuarios más activos ascienden en el ranking del grupo en tiempo real.
</details>

<details>
<summary><b>🔗 Vinculación Versátil</b></summary>
<br/>
Soporte completo tanto para <strong>código de 8 dígitos</strong> como para <strong>código QR</strong>. Conecta desde cualquier dispositivo o entorno.
</details>

<details>
<summary><b>📱 Optimizado para Termux</b></summary>
<br/>
Bajo consumo de recursos, alta estabilidad y compatibilidad completa con Android vía Termux sin necesidad de root.
</details>

---

## 🚀 Instalación

### 📲 En Termux (Android)

```bash
# 1. Actualizar paquetes
pkg update && pkg upgrade -y

# 2. Instalar dependencias del sistema
pkg install nodejs-lts git ffmpeg imagemagick -y

# 3. Clonar el repositorio
git clone https://github.com/zoredevteam-ctrl/Nino-Nakano
cd Nino-Nakano

# 4. Instalar módulos de Node.js
npm install

# 5. ¡Encender el bot!
npm start
```

### 🐧 En Linux / VPS

```bash
# Requisitos: Node.js 18+, Git, FFmpeg
sudo apt update && sudo apt install -y nodejs git ffmpeg imagemagick

git clone https://github.com/zoredevteam-ctrl/Nino-Nakano
cd Nino-Nakano
npm install
npm start
```

> [!TIP]
> Para mantener el bot activo en segundo plano en un VPS, usa `pm2`:  
> `npm install -g pm2 && pm2 start index.js --name NinoBot`

---

## ⚙️ Configuración — `settings.js`

Edita este archivo antes de iniciar el bot:

```js
// settings.js — Configuración principal de Nino Nakano

global.ownerNumber  = ['521XXXXXXXXXX']   // Tu número (con código de país)
global.botName      = 'Nino Nakano'       // Nombre del bot
global.rcanal       = 'https://whatsapp.com/channel/...' // Tu canal
global.banner       = './assets/menu.jpg' // Imagen de menú
global.prefix       = '#'                 // Prefijo de comandos
global.autoRead     = true               // Marcar mensajes como leídos
```

> [!WARNING]
> Nunca compartas tu `session/` ni tu `settings.js` con tu número real. Mantenlos fuera de cualquier repositorio público.

---

## 🔐 Buenas Prácticas de Seguridad

```
✅  Usa una cuenta de WhatsApp secundaria, nunca tu número personal
✅  No expongas la carpeta /session en GitHub (.gitignore)
✅  Valida siempre que quien ejecuta comandos admin sea ownerNumber
✅  Mantén tus dependencias actualizadas (npm audit)
✅  En VPS: usa firewall y nunca abras puertos innecesarios
❌  Jamás hardcodees tokens o contraseñas en el código
```

---

## 🤝 Contribuciones

¡Los pull requests son bienvenidos! Si quieres mejorar a Nino:

1. Haz un **fork** del repositorio
2. Crea tu rama: `git checkout -b feature/mi-mejora`
3. Commitea: `git commit -m 'feat: agrego nueva función'`
4. Push: `git push origin feature/mi-mejora`
5. Abre un **Pull Request** 🎉

> Mantén el código limpio, modular y bien comentado. Nino lo agradecerá.

---

## 👤 Creador

<div align="center">

<img src="https://causas-files.vercel.app/fl/l7is.png" alt="𝓐𝓪𝓻𝓸𝓶" width="100" style="border-radius: 50%"/>

### 𝓐𝓪𝓻𝓸𝓶
**Desarrollo, Arquitectura & Seguridad — Z0RT SYSTEMS**

[![WhatsApp](https://img.shields.io/badge/Canal-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029Vb6p68rF6smrH4Jeay3Y)
[![GitHub](https://img.shields.io/badge/GitHub-zoredevteam--ctrl-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/zoredevteam-ctrl)

</div>

---

<div align="center">

<sub>Desarrollado con ❤️ y mucha actitud tsundere · <strong>Z0RT SYSTEMS</strong> · 🦋</sub>

<br/>

![Footer](https://img.shields.io/badge/𝓝𝓲𝓷𝓸%20𝓝𝓪𝓴𝓪𝓷𝓸%20Bot-FF69B4?style=for-the-badge&labelColor=0d0d0d)

</div>
