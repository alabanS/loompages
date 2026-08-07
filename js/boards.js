// =====================================================================
//  МОДУЛЬ СПРИНТ-ДОСОК
// =====================================================================
const Boards = {
    _data: null,
    _currentBoardId: null,
    _initialized: false,

    colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#64748b'],

    init() {
        this._data = Store.getAll();
        this._ensureBoards();
        this._currentBoardId = this._data.activeBoardId || this._data.boards[0]?.id;
        if (!this._data.boards.find(b => b.id === this._currentBoardId)) {
            this._currentBoardId = this._data.boards[0]?.id;
        }
        this._data.activeBoardId = this._currentBoardId;
        Store.save(this._data);
        this._initCollapse();
        this.render();
        if (!this._initialized) {
            this._bindEvents();
            this._initialized = true;
        }
    },

    refresh() {
        this._data = Store.getAll();
        this._ensureBoards();
        this._currentBoardId = this._data.activeBoardId || this._data.boards[0]?.id;
        if (!this._data.boards.find(b => b.id === this._currentBoardId)) {
            this._currentBoardId = this._data.boards[0]?.id;
        }
        this._data.activeBoardId = this._currentBoardId;
        Store.save(this._data);
        this.render();
    },

    _ensureBoards() {
        if (!this._data.boards) this._data.boards = [];
        if (this._data.boards.length === 0) {
            const defaultBoard = {
                id: Store.generateId(),
                name: 'Бэклог',
                startDate: null,
                endDate: null,
                color: this.colors[0],
                createdAt: new Date().toISOString()
            };
            this._data.boards.push(defaultBoard);
            this._data.activeBoardId = defaultBoard.id;
            (this._data.tasks || []).forEach(t => {
                if (!t.boardId) t.boardId = defaultBoard.id;
            });
            Store.save(this._data);
        } else {
            let migrated = false;
            (this._data.tasks || []).forEach(t => {
                if (!t.boardId) {
                    t.boardId = this._data.boards[0].id;
                    migrated = true;
                }
            });
            if (migrated) Store.save(this._data);
        }
    },

    get boards() { return this._data.boards; },
    get currentId() { return this._currentBoardId; },

    getCurrent() {
        return this._data.boards.find(b => b.id === this._currentBoardId) || this._data.boards[0];
    },

    getTaskCount(boardId) {
        return (this._data.tasks || []).filter(t => t.boardId === boardId).length;
    },

    switchBoard(id) {
        if (id === this._currentBoardId) return;
        this._currentBoardId = id;
        this._data.activeBoardId = id;
        Store.save(this._data);
        this.render();
        Tasks.render();
    },

    saveBoard(data) {
        const isEdit = !!data.id;
        if (isEdit) {
            const idx = this._data.boards.findIndex(b => b.id === data.id);
            if (idx === -1) return false;
            this._data.boards[idx] = {
                ...this._data.boards[idx],
                name: data.name.trim(),
                startDate: data.startDate || null,
                endDate: data.endDate || null,
                color: data.color || this.colors[0]
            };
        } else {
            const board = {
                id: Store.generateId(),
                name: data.name.trim(),
                startDate: data.startDate || null,
                endDate: data.endDate || null,
                color: data.color || this.colors[this._data.boards.length % this.colors.length],
                createdAt: new Date().toISOString()
            };
            this._data.boards.push(board);
            this._currentBoardId = board.id;
            this._data.activeBoardId = board.id;
        }
        if (Store.save(this._data)) {
            this.render();
            Tasks.render();
            return true;
        }
        return false;
    },

    deleteBoard(id) {
        if (this._data.boards.length <= 1) {
            Toast.show('Нельзя удалить последнюю доску', 'warning');
            return false;
        }
        const board = this._data.boards.find(b => b.id === id);
        if (!board) return false;

        const taskCount = this.getTaskCount(id);
        const msg = taskCount > 0
            ? `Удалить доску «${board.name}»? ${taskCount} задач(и) будут перенесены в другую доску.`
            : `Удалить доску «${board.name}»?`;
        if (!confirm(msg)) return false;

        const fallback = this._data.boards.find(b => b.id !== id);
        (this._data.tasks || []).forEach(t => {
            if (t.boardId === id) t.boardId = fallback.id;
        });

        this._data.boards = this._data.boards.filter(b => b.id !== id);
        if (this._currentBoardId === id) {
            this._currentBoardId = fallback.id;
            this._data.activeBoardId = fallback.id;
        }

        if (Store.save(this._data)) {
            this.render();
            Tasks.render();
            Toast.show('Доска удалена', 'info');
            return true;
        }
        return false;
    },

    _formatDateRange(board) {
        if (!board.startDate && !board.endDate) return '';
        const fmt = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        if (board.startDate && board.endDate) return `${fmt(board.startDate)} — ${fmt(board.endDate)}`;
        if (board.startDate) return `с ${fmt(board.startDate)}`;
        return `до ${fmt(board.endDate)}`;
    },

    render() {
        const current = this.getCurrent();
        const titleEl = document.getElementById('currentBoardTitle');
        const datesEl = document.getElementById('currentBoardDates');
        if (titleEl && current) titleEl.textContent = current.name;
        if (datesEl && current) {
            const range = this._formatDateRange(current);
            datesEl.textContent = range;
            datesEl.style.display = range ? 'block' : 'none';
        }

        const list = document.getElementById('boardsList');
        if (!list) return;
        list.innerHTML = '';

        this._data.boards.forEach(board => {
            const count = this.getTaskCount(board.id);
            const isActive = board.id === this._currentBoardId;
            const chip = document.createElement('div');
            chip.className = `board-chip${isActive ? ' active' : ''}`;
            chip.dataset.id = board.id;
            chip.style.setProperty('--board-color', board.color);

            const range = this._formatDateRange(board);
            chip.innerHTML = `
                <span class="board-chip-dot"></span>
                <span class="board-chip-info">
                    <span class="board-chip-name">${this._escape(board.name)}</span>
                    ${range ? `<span class="board-chip-dates">${range}</span>` : ''}
                </span>
                <span class="board-chip-count">${count}</span>
                <span class="board-chip-actions">
                    <button class="board-edit-btn" data-id="${board.id}" title="Редактировать">✏️</button>
                    <button class="board-delete-btn" data-id="${board.id}" title="Удалить">✕</button>
                </span>
            `;

            chip.addEventListener('click', (e) => {
                if (e.target.closest('.board-chip-actions')) return;
                this.switchBoard(board.id);
            });

            chip.querySelector('.board-edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this._openBoardForm(board.id);
            });
            chip.querySelector('.board-delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteBoard(board.id);
            });

            list.appendChild(chip);
        });
    },

    _escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _openBoardForm(id) {
        const board = id ? this._data.boards.find(b => b.id === id) : null;
        document.getElementById('editBoardId').value = board ? board.id : '';
        document.getElementById('boardName').value = board ? board.name : '';
        document.getElementById('boardStartDate').value = board?.startDate || '';
        document.getElementById('boardEndDate').value = board?.endDate || '';
        document.getElementById('boardFormTitle').textContent = board ? '✏️ Редактировать спринт' : '🏃 Новый спринт';
        document.getElementById('boardFormSubmit').textContent = board ? 'Сохранить' : 'Создать';

        const picker = document.getElementById('boardColorPicker');
        picker.innerHTML = '';
        const selectedColor = board?.color || this.colors[this._data.boards.length % this.colors.length];
        this.colors.forEach(color => {
            const swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = `color-swatch${color === selectedColor ? ' selected' : ''}`;
            swatch.style.background = color;
            swatch.dataset.color = color;
            swatch.addEventListener('click', () => {
                picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                swatch.classList.add('selected');
            });
            picker.appendChild(swatch);
        });

        document.getElementById('boardFormOverlay').classList.add('active');
    },

    _closeBoardForm() {
        document.getElementById('boardFormOverlay').classList.remove('active');
        document.getElementById('editBoardId').value = '';
        document.getElementById('boardForm').reset();
    },

    _bindEvents() {
        document.getElementById('addBoardBtn').addEventListener('click', () => this._openBoardForm(null));

        const toggleBtn = document.getElementById('boardsToggleBtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this._toggleCollapse());
        }

        document.getElementById('boardFormCancel').addEventListener('click', () => this._closeBoardForm());
        document.getElementById('boardFormOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this._closeBoardForm();
        });

        document.getElementById('boardForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('boardName').value.trim();
            if (!name) { Toast.show('Введите название спринта!', 'warning'); return; }

            const startDate = document.getElementById('boardStartDate').value || null;
            const endDate = document.getElementById('boardEndDate').value || null;
            if (startDate && endDate && startDate > endDate) {
                Toast.show('Дата начала не может быть позже даты окончания', 'warning');
                return;
            }

            const selectedSwatch = document.querySelector('#boardColorPicker .color-swatch.selected');
            const editId = document.getElementById('editBoardId').value;
            const data = {
                id: editId || undefined,
                name,
                startDate,
                endDate,
                color: selectedSwatch?.dataset.color || this.colors[0]
            };

            if (this.saveBoard(data)) {
                this._closeBoardForm();
                Toast.show(editId ? 'Спринт обновлён' : 'Спринт создан', 'success');
            }
        });
    },

    _initCollapse() {
        const section = document.getElementById('boardsSection');
        const toggleBtn = document.getElementById('boardsToggleBtn');
        if (!section || !toggleBtn) return;

        const collapsed = localStorage.getItem('boardsCollapsed') === 'true';
        section.classList.toggle('collapsed', collapsed);
        toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    },

    _toggleCollapse() {
        const section = document.getElementById('boardsSection');
        const toggleBtn = document.getElementById('boardsToggleBtn');
        if (!section || !toggleBtn) return;

        const collapsed = !section.classList.contains('collapsed');
        section.classList.toggle('collapsed', collapsed);
        toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        localStorage.setItem('boardsCollapsed', collapsed ? 'true' : 'false');
    }
};
