import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
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
        this._isReading = false
        this._isWriting = false

        this._startAutoSave()
    }

    async read() {
        if (this._isReading) return
        this._isReading = true
        try {
            if (existsSync(this.filePath)) {
                const content = await fs.readFile(this.filePath, 'utf-8')
                if (content.trim().length > 0) {
                    this.data = JSON.parse(content)
                }
            } else {
                console.log(chalk.cyan('🦋 [Database]: Archivo no encontrado. Creando uno nuevo...'))
                await this.write()
            }

            // ✅ Parche de compatibilidad: agregar campos nuevos si no existen
            if (!this.data.users)        this.data.users = {}
            if (!this.data.groups)       this.data.groups = {}
            if (!this.data.chats)        this.data.chats = {}
            if (!this.data.settings)     this.data.settings = {}
            if (!this.data.subbots)      this.data.subbots = {}
            if (!this.data.subbotConfig) this.data.subbotConfig = { codeEnabled: true }

        } catch (e) {
            console.error(chalk.red('🦋 [Database Error]:'), 'El archivo está corrupto. Usando base vacía para evitar crash.')
            this.data = {
                users: {},
                groups: {},
                chats: {},
                settings: {},
                subbots: {},
                subbotConfig: { codeEnabled: true }
            }
        } finally {
            this._isReading = false
        }
    }

    async write() {
        if (this._isWriting) return
        this._isWriting = true
        try {
            if (!this.data || typeof this.data !== 'object') return

            const dir = path.dirname(this.filePath)
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

            const tmpPath = `${this.filePath}.tmp`
            const strData = JSON.stringify(this.data, null, 2)

            await fs.writeFile(tmpPath, strData)
            await fs.rename(tmpPath, this.filePath)
        } catch (e) {
            console.error(chalk.red('🦋 [Database]: Error al sincronizar datos.'), e)
        } finally {
            this._isWriting = false
        }
    }

    async _startAutoSave() {
        await new Promise(resolve => setTimeout(resolve, 40000))
        await this.write()
        this._startAutoSave()
    }

    async load() { await this.read() }
    async save() { await this.write() }
}

const database = new Database()
export { database }
export default database
