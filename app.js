/**
 * GNDH Dictionary - App Logic
 */

// Состояние приложения
const state = {
    cache: {}, // Кеш загруженных словарей: { 'a': [...], 'b': [...] }
    currentLetter: null,
    dictionaryPath: '12/',
    lastQuery: ''
};

// DOM Элементы
const input = document.getElementById('dictionary-input');
const resultsContainer = document.getElementById('results-container');
const clearButton = document.getElementById('clear-button');

/**
 * Инициализация слушателей событий
 */
function init() {
    input.addEventListener('input', handleInput);
    clearButton.addEventListener('click', clearSearch);
}

/**
 * Обработка ввода в поле поиска
 */
async function handleInput(e) {
    const query = e.target.value.trim().toLowerCase();
    
    // Показываем/скрываем кнопку очистки
    clearButton.style.display = query.length > 0 ? 'flex' : 'none';

    if (query.length === 0) {
        resultsContainer.innerHTML = '';
        return;
    }

    const firstLetter = query[0];

    // Если первая буква изменилась, загружаем новый словарь
    if (firstLetter !== state.currentLetter) {
        if (!state.cache[firstLetter]) {
            try {
                const words = await fetchDictionary(firstLetter);
                state.cache[firstLetter] = words;
            } catch (error) {
                console.error(error);
                state.cache[firstLetter] = [];
            }
        }
        state.currentLetter = firstLetter;
    }

    performSearch(query);
	state.lastQuery = query;
}

/**
 * Загрузка и парсинг файла словаря
 */
async function fetchDictionary(letter) {
    const response = await fetch(`${state.dictionaryPath}${letter}.txt`);
    if (!response.ok) throw new Error('File not found');
    
    let text = await response.text();
    
    // Удаляем BOM (Byte Order Mark), если он есть
    text = text.replace(/^\uFEFF/, '');
    
    // Разделяем по строкам
    const lines = text.split(/\r?\n/);
    
    const words = [];
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Более гибкий парсинг формата: слово [транскрипция] перевод
        const openBracket = trimmedLine.indexOf('[');
        const closeBracket = trimmedLine.lastIndexOf(']'); // На всякий случай берем последний
        
        if (openBracket !== -1 && closeBracket !== -1 && closeBracket > openBracket) {
            words.push({
                word: trimmedLine.substring(0, openBracket).trim(),
                transcription: trimmedLine.substring(openBracket + 1, closeBracket).trim(),
                translation: trimmedLine.substring(closeBracket + 1).trim()
            });
        }
    }
    return words;
}

/**
 * Поиск по загруженному словарю с использованием Regex
 */
function performSearch(query) {
    const firstLetter = query[0].toLowerCase();
    const words = state.cache[firstLetter] || [];
    
    if (words.length === 0) {
        showStatus('Результаты не найдены');
        return;
    }

    // Экранируем специальные символы для безопасности регулярного выражения
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Регулярное выражение для поиска с начала слова (регистронезависимое)
    const regex = new RegExp(`^${escapedQuery}`, 'i');
    
    const matches = words.filter(item => regex.test(item.word));
    
    renderResults(matches);
}

/**
 * Отрисовка результатов в DOM
 */
function renderResults(matches) {
    if (matches.length === 0) {
        showStatus('Совпадений не найдено');
        return;
    }

    resultsContainer.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    matches.forEach(item => {
        const card = document.createElement('div');
        card.className = 'word-card';
        
        card.innerHTML = `
            <div class="word-header">
                <span class="word-title"><span class="powershine">${state.lastQuery}</span>${item.word.slice(length(state.lastQuery))}</span>
                <span class="transcription">[${item.transcription}]</span>
            </div>
            <div class="translation">${item.translation}</div>
        `;
        
        fragment.appendChild(card);
    });
    
    resultsContainer.appendChild(fragment);
}

/**
 * Отображение статусных сообщений
 */
function showStatus(message) {
    resultsContainer.innerHTML = `
        <div class="status-message">
            ${message}
        </div>
    `;
}

/**
 * Очистка поиска
 */
function clearSearch() {
    input.value = '';
    input.focus();
    clearButton.style.display = 'none';
    resultsContainer.innerHTML = '';
    state.currentLetter = null;
}

// Запуск приложения
init();
