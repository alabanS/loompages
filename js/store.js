// =====================================================================
//  МОДУЛЬ ДАННЫХ (localStorage)
// =====================================================================
const Store = {
    key: 'kanban_full_data_v2',
    _cache: null,

    _empty() {
        return {
            tasks: [],
            notes: [],
            categories: [],
            links: [],
            boards: [],
            activeBoardId: null
        };
    },

    normalize(data) {
        const src = data || {};
        return {
            tasks: Array.isArray(src.tasks) ? src.tasks.slice() : [],
            notes: Array.isArray(src.notes) ? src.notes.slice() : [],
            categories: Array.isArray(src.categories) ? src.categories.slice() : [],
            links: Array.isArray(src.links) ? src.links.slice() : [],
            boards: Array.isArray(src.boards) ? src.boards.slice() : [],
            activeBoardId: src.activeBoardId || null
        };
    },

    _load() {
        try {
            const raw = localStorage.getItem(this.key);
            this._cache = raw ? this.normalize(JSON.parse(raw)) : this._empty();
        } catch {
            this._cache = this._empty();
        }
    },

    getAll() {
        if (!this._cache) this._load();
        return this._cache;
    },

    reload() {
        this._cache = null;
        return this.getAll();
    },

    save() {
        if (!this._cache) this._load();
        try {
            localStorage.setItem(this.key, JSON.stringify(this._cache));
            return true;
        } catch {
            Toast.show('Ошибка сохранения!', 'error');
            return false;
        }
    },

    replace(data) {
        this._cache = this.normalize(data);
        return this.save();
    },

    snapshot() {
        return JSON.parse(JSON.stringify(this.getAll()));
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
};
