// =====================================================================
//  МОДУЛЬ ЗАДАЧ (Канбан)
// =====================================================================
const Tasks = {
    columns: ['todo', 'progress', 'review', 'done', 'archive'],
    columnLabels: {
        todo: 'To Do',
        progress: 'В работе',
        review: 'На проверке',
        done: 'Готово',
        archive: 'Архив'
    },
    columnColors: {
        todo: 'var(--todo-color)',
        progress: 'var(--progress-color)',
        review: 'var(--review-color)',
        done: 'var(--done-color)',
        archive: 'var(--archive-color)'
    },

    _data: null,
    _currentFilter: 'all',
    _searchQuery: '',
    _draggedId: null,

    colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#64748b'],

    init() {
        this._data = Store.getAll();
        if (!this._data.tasks) this._data.tasks = [];
        this.render();
        this._bindEvents();
    },

    refresh() {
        this._data = Store.getAll();
        if (!this._data.tasks) this._data.tasks = [];
        this.render();
    },

    get tasks() { return this._data.tasks; },

    _boardTasks() {
        const boardId = Boards?.currentId;
        if (!boardId) return this.tasks;
        return this.tasks.filter(t => t.boardId === boardId);
    },

    getFiltered() {
        let list = this._boardTasks();
        if (this._currentFilter !== 'all') {
            list = list.filter(t => t.column === this._currentFilter);
        }
        if (this._searchQuery.trim()) {
            const q = this._searchQuery.trim().toLowerCase();
            list = list.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.desc && t.desc.toLowerCase().includes(q))
            );
        }
        return list;
    },

    getByColumn(col) {
        let list = this._boardTasks().filter(t => t.column === col);
        if (this._searchQuery.trim()) {
            const q = this._searchQuery.trim().toLowerCase();
            list = list.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.desc && t.desc.toLowerCase().includes(q))
            );
        }
        return list;
    },

    saveTask(data) {
        const isEdit = !!data.id;
        let task;
        if (isEdit) {
            const idx = this.tasks.findIndex(t => t.id === data.id);
            if (idx === -1) return false;
            task = { ...this.tasks[idx], ...data };
            this.tasks[idx] = task;
        } else {
            task = {
                id: Store.generateId(),
                title: data.title.trim(),
                desc: (data.desc || '').trim(),
                link: (data.link || '').trim(),
                priority: data.priority || 'medium',
                category: data.category || 'work',
                color: data.color || null,
                deadline: data.deadline || null,
                boardId: Boards?.currentId || this._data.boards?.[0]?.id,
                column: 'todo',
                createdAt: new Date().toISOString(),
                completedAt: null,
                archivedAt: null
            };
            this.tasks.unshift(task);
        }
        if (Store.save(this._data)) {
            this.render();
            return task;
        }
        return null;
    },

    moveTask(id, targetColumn) {
        const idx = this.tasks.findIndex(t => t.id === id);
        if (idx === -1) return false;
        const task = this.tasks[idx];
        const oldCol = task.column;
        if (oldCol === targetColumn) return true;

        task.column = targetColumn;
        if (targetColumn === 'done' && oldCol !== 'done') {
            task.completedAt = new Date().toISOString();
        }
        if (targetColumn === 'archive' && oldCol !== 'archive') {
            task.archivedAt = new Date().toISOString();
        }
        if (oldCol === 'archive' && targetColumn !== 'archive') {
            task.archivedAt = null;
        }
        if (oldCol === 'done' && targetColumn !== 'done') {
            task.completedAt = null;
        }

        if (Store.save(this._data)) {
            this.render();
            Toast.show(`Задача перемещена в "${this.columnLabels[targetColumn]}"`, 'success');
            return true;
        }
        return false;
    },

    deleteTask(id) {
        if (!confirm('Удалить задачу?')) return false;
        const idx = this.tasks.findIndex(t => t.id === id);
        if (idx === -1) return false;
        this.tasks.splice(idx, 1);
        if (Store.save(this._data)) {
            this.render();
            Toast.show('Задача удалена', 'info');
            return true;
        }
        return false;
    },

    getById(id) {
        return this.tasks.find(t => t.id === id) || null;
    },

    render() {
        const board = document.getElementById('kanbanBoard');
        board.innerHTML = '';

        let colsToShow = this.columns;
        if (this._currentFilter !== 'all' && this.columns.includes(this._currentFilter)) {
            colsToShow = [this._currentFilter];
        }

        colsToShow.forEach(col => {
            const tasks = this.getByColumn(col);
            const colEl = document.createElement('div');
            colEl.className = 'kanban-column';
            colEl.dataset.column = col;

            const header = document.createElement('div');
            header.className = 'column-header';
            const colAccent = {
                todo: '#6366f1',
                progress: '#f59e0b',
                review: '#a855f7',
                done: '#10b981',
                archive: '#64748b'
            };
            header.innerHTML = `
                <span class="column-title">
                    <span class="column-dot" style="background:${colAccent[col]}"></span>
                    ${this.columnLabels[col]}
                    <span class="count">${tasks.length}</span>
                </span>
            `;
            colEl.appendChild(header);

            const body = document.createElement('div');
            body.className = 'column-body droppable';
            body.dataset.column = col;

            if (tasks.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'empty-column';
                empty.textContent = 'Нет задач';
                body.appendChild(empty);
            } else {
                tasks.forEach(task => {
                    body.appendChild(this._createCard(task));
                });
            }

            body.addEventListener('dragover', (e) => {
                e.preventDefault();
                body.classList.add('drag-over');
            });
            body.addEventListener('dragleave', () => {
                body.classList.remove('drag-over');
            });
            body.addEventListener('drop', (e) => {
                e.preventDefault();
                body.classList.remove('drag-over');
                const id = this._draggedId;
                if (id) {
                    this.moveTask(id, body.dataset.column);
                    this._draggedId = null;
                }
            });

            colEl.appendChild(body);
            board.appendChild(colEl);
        });

        this._updateStats();
    },

    _createCard(task) {
        const card = document.createElement('div');
        card.className = `task-card${task.column === 'done' ? ' done' : ''}${task.color ? ' has-color' : ''}`;
        card.draggable = true;
        card.dataset.id = task.id;
        if (task.color) {
            card.style.setProperty('--task-color', task.color);
            card.style.borderLeftColor = task.color;
        }

        card.addEventListener('dragstart', (e) => {
            this._draggedId = task.id;
            card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        const priorityLabels = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
        const categoryLabels = {
            work: 'Работа',
            personal: 'Личное',
            study: 'Учеба',
            health: 'Здоровье',
            other: 'Другое'
        };

        let deadlineHtml = '';
        if (task.deadline) {
            const d = new Date(task.deadline);
            const now = new Date();
            const isOverdue = d < now && task.column !== 'done' && task.column !== 'archive';
            deadlineHtml =
                `<span class="tag tag-deadline">⏰ ${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'})}${isOverdue ? ' ⚠️' : ''}</span>`;
        }

        let linkHtml = '';
        if (task.link && task.link.trim()) {
            const url = task.link.trim();
            const fullUrl = url.match(/^https?:\/\//) ? url : 'https://' + url;
            linkHtml = `
                <div class="task-link-wrapper">
                    <a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="task-link" title="${this._escape(url)}">
                        ${this._escape(url.length > 50 ? url.slice(0, 50) + '…' : url)}
                    </a>
                </div>
            `;
        }

        const created = task.createdAt ? new Date(task.createdAt).toLocaleDateString('ru-RU') : '';

        card.innerHTML = `
            <div class="task-title">${this._escape(task.title)}</div>
            ${task.desc ? `<div class="task-desc">${this._escape(task.desc)}</div>` : ''}
            ${linkHtml}
            <div class="task-tags">
                <span class="tag tag-priority-${task.priority}">${priorityLabels[task.priority]}</span>
                <span class="tag tag-category">${categoryLabels[task.category] || 'Другое'}</span>
                ${deadlineHtml}
                ${task.column === 'done' && task.completedAt ? `<span class="tag" style="background:rgba(39,174,96,0.15);color:var(--success-color);">✅ ${new Date(task.completedAt).toLocaleDateString('ru-RU')}</span>` : ''}
                ${task.column === 'archive' ? `<span class="tag" style="background:var(--border-color);color:var(--text-muted);">📦 архив</span>` : ''}
                ${task.link ? `<span class="tag tag-link" onclick="window.open('${task.link.match(/^https?:\/\//) ? task.link : 'https://' + task.link}', '_blank')">🔗 ссылка</span>` : ''}
            </div>
            <div class="task-meta">
                <span>📅 ${created}</span>
                ${task.deadline ? `<span>⏳ ${new Date(task.deadline).toLocaleDateString('ru-RU')}</span>` : ''}
            </div>
            <div class="task-actions">
                <button class="edit-btn" data-id="${task.id}" title="Редактировать">✏️</button>
                <button class="delete-btn" data-id="${task.id}" title="Удалить">🗑️</button>
            </div>
        `;

        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this._openTaskForm(task.id);
        });
        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteTask(task.id);
        });

        return card;
    },

    _escape(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    _updateStats() {
        const boardTasks = this._boardTasks();
        const total = boardTasks.length;
        const progress = boardTasks.filter(t => t.column === 'progress' || t.column === 'review').length;
        const done = boardTasks.filter(t => t.column === 'done').length;
        const archive = boardTasks.filter(t => t.column === 'archive').length;

        document.getElementById('totalTasks').textContent = total;
        document.getElementById('progressTasks').textContent = progress;
        document.getElementById('doneTasks').textContent = done;
        document.getElementById('archiveTasks').textContent = archive;
    },

    _updateDate() {
        const now = new Date();
        document.getElementById('currentDate').textContent =
            now.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    },

    _openTaskForm(id) {
        const task = id ? this.getById(id) : null;
        document.getElementById('editTaskId').value = task ? task.id : '';
        document.getElementById('taskTitle').value = task ? task.title : '';
        document.getElementById('taskDesc').value = task ? task.desc || '' : '';
        document.getElementById('taskLink').value = task ? task.link || '' : '';
        document.getElementById('taskDeadline').value = task ? task.deadline || '' : '';
        document.getElementById('taskCategory').value = task ? task.category || 'work' : 'work';
        document.getElementById('taskFormTitle').textContent = task ? '✏️ Редактировать задачу' : '➕ Новая задача';
        document.getElementById('taskFormSubmit').textContent = task ? 'Сохранить' : 'Добавить';

        this._renderColorPicker(task?.color || null);

        document.querySelectorAll('#prioritySelector .priority-opt').forEach(el => {
            el.classList.toggle('selected', el.dataset.priority === (task ? task.priority : 'medium'));
        });

        document.getElementById('taskFormOverlay').classList.add('active');
    },

    _closeTaskForm() {
        document.getElementById('taskFormOverlay').classList.remove('active');
        document.getElementById('editTaskId').value = '';
        document.getElementById('taskForm').reset();
        document.getElementById('taskCategory').value = 'work';
        document.querySelectorAll('#prioritySelector .priority-opt').forEach(el => {
            el.classList.toggle('selected', el.dataset.priority === 'medium');
        });
        this._renderColorPicker(null);
        const now = new Date();
        document.getElementById('taskDeadline').value =
            `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    },

    _renderColorPicker(selectedColor) {
        const picker = document.getElementById('taskColorPicker');
        if (!picker) return;
        picker.innerHTML = '';

        const noneBtn = document.createElement('button');
        noneBtn.type = 'button';
        noneBtn.className = `color-swatch color-swatch-none${!selectedColor ? ' selected' : ''}`;
        noneBtn.title = 'Без цвета';
        noneBtn.dataset.color = '';
        noneBtn.textContent = '×';
        noneBtn.addEventListener('click', () => {
            picker.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            noneBtn.classList.add('selected');
        });
        picker.appendChild(noneBtn);

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
    },

    _getSelectedTaskColor() {
        const selected = document.querySelector('#taskColorPicker .color-swatch.selected');
        const color = selected?.dataset.color;
        return color || null;
    },

    _bindEvents() {
        document.getElementById('addTaskBtn').addEventListener('click', () => this._openTaskForm(null));

        document.getElementById('taskFormCancel').addEventListener('click', () => this._closeTaskForm());
        document.getElementById('taskFormOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this._closeTaskForm();
        });

        document.querySelectorAll('#prioritySelector .priority-opt').forEach(el => {
            el.addEventListener('click', () => {
                document.querySelectorAll('#prioritySelector .priority-opt').forEach(o => o.classList
                    .remove('selected'));
                el.classList.add('selected');
            });
        });

        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value.trim();
            if (!title) { Toast.show('Введите название!', 'warning'); return; }
            const editId = document.getElementById('editTaskId').value;
            const priority = document.querySelector('#prioritySelector .priority-opt.selected')
                ?.dataset.priority || 'medium';
            const data = {
                id: editId || undefined,
                title,
                desc: document.getElementById('taskDesc').value.trim(),
                link: document.getElementById('taskLink').value.trim(),
                priority,
                category: document.getElementById('taskCategory').value,
                color: this._getSelectedTaskColor(),
                deadline: document.getElementById('taskDeadline').value || null
            };
            if (this.saveTask(data)) {
                this._closeTaskForm();
                Toast.show(editId ? 'Задача обновлена' : 'Задача добавлена', 'success');
            }
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._currentFilter = btn.dataset.filter;
                this.render();
            });
        });

        let searchTimer;
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                this._searchQuery = e.target.value;
                this.render();
            }, 300);
        });

        // Навигация
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                const pageId = 'page' + tab.dataset.page.charAt(0).toUpperCase() + tab.dataset.page
                    .slice(1);
                document.getElementById(pageId).classList.add('active');
                if (tab.dataset.page === 'links') Links.render();
                if (tab.dataset.page === 'notes') Notes.render();
            });
        });
    }
};
