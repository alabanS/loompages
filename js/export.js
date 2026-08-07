// Модуль экспорта
const exportModule = (function() {
    
    // Экспорт в Excel
    function exportToExcel() {
        const tasks = tasksModule.getTasks();
        
        if (tasks.length === 0) {
            alert('Нет задач для экспорта');
            return;
        }

        // Форматирование даты и времени
        function formatDateTime(dateTimeStr) {
            if (!dateTimeStr) return '-';
            const date = new Date(dateTimeStr);
            return date.toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // Подготовка данных для Excel
        const data = [['Название', 'Описание', 'Приоритет', 'Выполнена', 'Дата/время', 'Дата создания', 'Дата выполнения', 'Подзадачи']];
        
        tasks.forEach(task => {
            const priorityLabels = {
                high: 'Высокий',
                medium: 'Средний',
                low: 'Низкий'
            };
            
            let subtasksText = '';
            if (task.subtasks && task.subtasks.length > 0) {
                subtasksText = task.subtasks.map(s => 
                    `${s.title} (${s.completed ? '✓' : '○'}${s.deadline ? ', ' + formatDateTime(s.deadline) : ''})`
                ).join('; ');
            }
            
            data.push([
                task.title,
                task.description || '-',
                priorityLabels[task.priority],
                task.completed ? 'Да' : 'Нет',
                task.dateTime ? formatDateTime(task.dateTime) : '-',
                task.createdAt,
                task.completedAt || '-',
                subtasksText || '-'
            ]);
        });

        // Создаем и сохраняем Excel файл
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Задачи');
        
        const fileName = `tasks-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }

    // Публичные методы
    return {
        exportToExcel
    };
})();