import fs from 'fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import chalk from 'chalk'

class Database {
    constructor(filePath = './database.json') {
        this.filePath = path.resolve(filePath)
        this.data = {
            users: {},
            groups: {},
            chats: {},
            settings: {},
            subbots: {},
            subbotConfig: { codeEnabled: true }
        }
        this._ready = false
        this._isReading = false
        this._isWriting = false
        this._pendingWrite = false
    }

    /**
     * Asegura que todos los campos necesarios existen
     * Compatible con dbs viejas y nuevas
     */
    _patch() {
        if (!this.data || typeof this.data !== 'object') {
            this.data = {}
        }
        // Campos base
        if (!this.data.users)       this.data.users = {}
        if (!this.data.groups)      this.data.groups = {}
        if (!this.data.chats)       this.data.chats = {}
        if (!this.data.settings)    this.data.settings = {}
        if (!this.data.subbots)     this.data.subbots = {}
        if (!this.data.subbotConfig) this.data.subbotConfig = { codeEnabled: true }

        // Parche para usuarios existentes — agregar campos que falten
        for (const jid of Object.keys(this.data.users)) {
            const u = this.data.users[jid]
            if (u.banned === undefined)          u.banned = false
            if (u.premium === undefined)         u.premium = false
            if (u.registered === undefined)      u.registered = false
            if (u.exp === undefined)             u.exp = 0
            if (u.level === undefined)           u.level = 1
            if (u.limit === undefined)           u.limit = 20
            if (u.money === undefined)           u.money = 0
            if (u.bank === undefined)            u.bank = 0
        }
    }

    /**
     * Carga los datos — siempre espera a que termine antes de usar la db
     */
    async read() {
        if (this._isReading) {
            // Esperar a que termine la lectura en curso
            await new Promise(r => {
                const check = setInterval(() => {
                    if (!this._isReading) { clearInterval(check); r() }
                }, 50)
            })
            return
        }

        this._isReading = true
        try {
            if (existsSync(this.filePath)) {
                const content = await fs.readFile(this.filePath, 'utf-8')
                if (content.trim().length > 0) {
                    try {
                        this.data = JSON.parse(content)
                    } catch {
                        console.error(chalk.red('🦋 [Database]: JSON corrupto. Haciendo backup y usando base vacía.'))
                        // Hacer backup del archivo corrupto
                        const backupPath = `${this.filePath}.backup_${Date.now()}`
                        await fs.copyFile(this.filePath, backupPath).catch(() => {})
                        this.data = {}
                    }
                }
            } else {
                console.log(chalk.cyan('🦋 [Database]: Archivo no encontrado. Creando uno nuevo...'))
                // Crear directorio si no existe
                const dir = path.dirname(this.filePath)
                if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
            }

            // Aplicar parche de compatibilidad
            this._patch()
            this._ready = true

            // Guardar con los campos nuevos inmediatamente
            await this.write()

        } catch (e) {
            console.error(chalk.red('🦋 [Database Error]:'), e.message)
            this.data = {}
            this._patch()
            this._ready = true
        } finally {
            this._isReading = false
        }
    }

    /**
     * Guarda los datos de forma atómica
     */
    async write() {
        if (this._isWriting) {
            this._pendingWrite = true
            return
        }
        this._isWriting = true
        try {
            if (!this.data || typeof this.data !== 'object') return

            const dir = path.dirname(this.filePath)
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

            const tmpPath = `${this.filePath}.tmp`
            const strData = JSON.stringify(this.data, null, 2)

            await fs.writeFile(tmpPath, strData, 'utf-8')
            await fs.rename(tmpPath, this.filePath)

        } catch (e) {
            console.error(chalk.red('🦋 [Database]: Error al guardar.'), e.message)
        } finally {
            this._isWriting = false
            // Si había una escritura pendiente, ejecutarla
            if (this._pendingWrite) {
                this._pendingWrite = false
                this.write().catch(() => {})
            }
        }
    }

    /**
     * Auto-guardado cada 40 segundos
     */
    async _startAutoSave() {
        await new Promise(r => setTimeout(r, 40000))
        await this.write()
        this._startAutoSave()
    }

    /**
     * Obtener o crear usuario con todos los campos
     * Úsalo en los plugins en vez de acceder directo a db.users[jid]
     */
    getUser(jid) {
        if (!this.data.users) this.data.users = {}
        if (!this.data.users[jid]) {
            this.data.users[jid] = {
                registered: false,
                premium: false,
                banned: false,
                warning: 0,
                exp: 0,
                level: 1,
                limit: 20,
                money: 0,
                bank: 0,
                lastclaim: 0,
                registered_time: 0,
                name: '',
                age: null
            }
        }
        // Asegurar que tenga todos los campos aunque sea usuario viejo
        const u = this.data.users[jid]
        if (u.money === undefined)  u.money = 0
        if (u.bank === undefined)   u.bank = 0
        if (u.exp === undefined)    u.exp = 0
        if (u.level === undefined)  u.level = 1
        if (u.limit === undefined)  u.limit = 20
        if (u.banned === undefined) u.banned = false
        return u
    }

    // Alias de compatibilidad
    async load() { await this.read() }
    async save() { await this.write() }
}

const database = new Database()

// Iniciar autosave después de que la db esté lista
database._startAutoSave()

export { database }
export default database
