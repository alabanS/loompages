// =====================================================================
//  МОДУЛЬ УВЕДОМЛЕНИЙ
// =====================================================================
const Toast = {
    show(msg, type = 'info', duration = 2800) {
        const container = document.getElementById('toastContainer');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = msg;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(40px)';
            el.style.transition = '0.3s ease';
            setTimeout(() => el.remove(), 350);
        }, duration);
    }
};

// =====================================================================
//  МОДУЛЬ ТЕМЫ
// =====================================================================
const Theme = {
    init() {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark') {
            document.body.classList.add('dark-theme');
            document.getElementById('themeToggle').textContent = '☀️';
        }
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            document.getElementById('themeToggle').textContent = isDark ? '☀️' : '🌓';
        });
    }
};

// =====================================================================
//  ОБНОВЛЕНИЕ ДАТЫ
// =====================================================================
function updateDate() {
    const now = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateString = now.toLocaleDateString('ru-RU', options);
    document.getElementById('currentDate').textContent = dateString;
}

// =====================================================================
//  МОДУЛЬ ЭКСПОРТА/ИМПОРТА
// =====================================================================
const Backup = {
    // Экспорт данных
    exportData() {
        try {
            const data = Store.snapshot();
            
            const exportData = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                appName: 'Loompage',
                data: data
            };
            
            // Преобразуем в JSON
            const json = JSON.stringify(exportData, null, 2);
            
            // Создаём файл для скачивания
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `loompage-backup-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            Toast.show('✅ Бэкап успешно скачан!', 'success');
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            Toast.show('❌ Ошибка при экспорте данных', 'error');
        }
    },
    
    // Импорт данных
    importData() {
        const input = document.getElementById('fileInput');
        input.click();
        
        input.onchange = function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const content = e.target.result;
                    const importedData = JSON.parse(content);
                    
                    // Проверяем, что это наш файл
                    if (!importedData.data || !importedData.version) {
                        Toast.show('❌ Неверный формат файла', 'error');
                        return;
                    }
                    
                    // Проверяем версию
                    if (importedData.version !== '1.0') {
                        Toast.show('⚠️ Версия файла не совпадает, но попробуем импортировать', 'warning');
                    }
                    
                    // Подтверждение
                    const confirmMsg = `
                        Импортировать данные?
                        
                        📊 Задач: ${importedData.data.tasks?.length || 0}
                        📝 Заметок: ${importedData.data.notes?.length || 0}
                        📂 Категорий: ${importedData.data.categories?.length || 0}
                        🔗 Ссылок: ${importedData.data.links?.length || 0}
                        🏃 Спринтов: ${importedData.data.boards?.length || 0}
                        
                        ⚠️ Текущие данные будут заменены!
                    `;
                    
                    if (!confirm(confirmMsg)) return;
                    
                    Store.replace(importedData.data);
                    
                    Boards.refresh();
                    Tasks.refresh();
                    Links.refresh();
                    Notes.refresh();
                    
                    Toast.show('✅ Данные успешно импортированы!', 'success');
                    
                    // Очищаем input
                    input.value = '';
                    
                } catch (error) {
                    console.error('Ошибка импорта:', error);
                    Toast.show('❌ Ошибка при импорте данных', 'error');
                    input.value = '';
                }
            };
            reader.readAsText(file);
        };
    }
};

// =====================================================================
//  ЗАПУСК
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
    updateDate();
    Boards.init();
    Tasks.init();
    Links.init();
    Notes.init();
    Feedback.init();

    const now = new Date();
    document.getElementById('taskDeadline').value =
        `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    // Обработчики экспорта/импорта
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        Backup.exportData();
    });
    
    document.getElementById('importDataBtn').addEventListener('click', () => {
        Backup.importData();
    });
});
