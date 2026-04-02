const fs = require('fs');
const path = require('path');

class Database {
    constructor(filePath = './database.json') {
        this.filePath = path.resolve(filePath);
        this.data = {
            users: {},
            groups: {},
            settings: {}
        };
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
            } else {
                this.save();
            }
        } catch (e) {
            console.error('Error cargando database.json:', e);
            this.data = { users: {}, groups: {}, settings: {} };
        }
    }

    save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
        } catch (e) {
            console.error('Error guardando database.json:', e);
        }
    }
}

module.exports = new Database();
