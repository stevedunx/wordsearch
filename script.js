document.addEventListener('DOMContentLoaded', function() {
    const DEFAULT_GRID_SIZE = 12;
    const gridDiv = document.getElementById('grid');
    const wordListDiv = document.getElementById('word-list');
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    const gridLangRadios = document.querySelectorAll('input[name="grid-lang"]');
    const listLangRadios = document.querySelectorAll('input[name="list-lang"]');

    let currentGrid = null;
    let placedWords = [];
    let foundWords = new Set();
    let sourceWordsSet = new Set();
    let isSelecting = false;
    let startCell = null;
    let currentSelection = [];
    let wordData = [];

    let wordsLoaded = false;

    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            theme: params.get('theme'),
            grid: params.get('grid'),
            list: params.get('list')
        };
    }

    function updateUrlParams(theme, gridLang, listLang) {
        const params = new URLSearchParams();
        if (theme) params.set('theme', theme);
        if (gridLang) params.set('grid', gridLang);
        if (listLang) params.set('list', listLang);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
    }

    function applyUrlSettings() {
        const { theme, grid, list } = getUrlParams();
        const validThemes = ['food', 'family'];
        const validLangs = ['es', 'fr', 'en'];

        if (validThemes.includes(theme)) {
            const themeRadio = document.querySelector(`input[name="theme"][value="${theme}"]`);
            if (themeRadio) themeRadio.checked = true;
        }

        if (validLangs.includes(grid)) {
            const gridRadio = document.querySelector(`input[name="grid-lang"][value="${grid}"]`);
            if (gridRadio) gridRadio.checked = true;
        }

        if (validLangs.includes(list)) {
            const listRadio = document.querySelector(`input[name="list-lang"][value="${list}"]`);
            if (listRadio) listRadio.checked = true;
        }

        if (theme || grid || list) {
            updateUrlParams(getCurrentTheme(), getCurrentGridLanguage(), getCurrentListLanguage());
        }
    }

    applyUrlSettings();

    // Load words on page load; wait for selections to generate
    loadWords().then(() => {
        wordsLoaded = true;
        if (!getCurrentListLanguage()) setDefaultListLanguage();
        showDirectionPrompt();

        const { theme, grid, list } = getUrlParams();
        if (theme && grid && list && grid !== list) {
            generateWordsearch();
        }
    });

    themeRadios.forEach(radio => radio.addEventListener('change', () => {
        applyUrlSettings();
        loadWords().then(() => {
            wordsLoaded = true;
            if (!getCurrentListLanguage()) setDefaultListLanguage();
        });
    }));
    gridLangRadios.forEach(radio => radio.addEventListener('change', () => {
        updateUrlParams(getCurrentTheme(), getCurrentGridLanguage(), getCurrentListLanguage());
    }));
    listLangRadios.forEach(radio => radio.addEventListener('change', () => {
        updateUrlParams(getCurrentTheme(), getCurrentGridLanguage(), getCurrentListLanguage());
    }));

    // Generate button event listener
    document.getElementById('generate-btn').addEventListener('click', () => {
        if (wordsLoaded) {
            generateWordsearch();
        } else {
            // If words not loaded yet, load them first
            loadWords().then(() => {
                wordsLoaded = true;
                generateWordsearch();
            });
        }
    });

    function showDirectionPrompt() {
        gridDiv.innerHTML = '<p style="color:#333;">Select your options above and click "Load Wordsearch" to begin.</p>';
        wordListDiv.innerHTML = '';
    }

    async function loadWords() {
        const theme = getCurrentTheme();
        const fileName = theme === 'family' ? 'family.json' : 'food.json';

        try {
            const response = await fetch(fileName);
            wordData = await response.json();
            // Ensure words are normalized uppercase for grid placement
            wordData = wordData.map(item => ({
                es: item.es ? item.es.toUpperCase() : item.spanish.toUpperCase(),
                fr: item.fr ? item.fr.toUpperCase() : item.french.toUpperCase(),
                en: item.en ? item.en.toUpperCase() : item.english.toUpperCase()
            }));
        } catch (error) {
            console.error('Error loading words:', error);
            alert('Error loading words data.');
        }
    }

    function getBrowserLanguage() {
        const lang = navigator.language || navigator.userLanguage;
        const primaryLang = lang.split('-')[0].toLowerCase();

        switch (primaryLang) {
            case 'es':
                return 'es';
            case 'fr':
                return 'fr';
            case 'en':
                return 'en';
            default:
                return 'fr'; // Default fallback
        }
    }

    function setDefaultListLanguage() {
        const browserLang = getBrowserLanguage();
        const listLangRadio = document.querySelector(`input[name="list-lang"][value="${browserLang}"]`);
        if (listLangRadio) {
            listLangRadio.checked = true;
        }
    }

    function mapLangCodeToField(code) {
        // JSON now uses language code keys directly
        if (['es', 'fr', 'en'].includes(code)) return code;
        return 'fr';
    }

    function getLanguageDisplayName(code) {
        switch (code) {
            case 'es': return 'Spanish';
            case 'fr': return 'French';
            case 'en': return 'English';
            default: return 'Unknown';
        }
    }

    function getCurrentTheme() {
        const selected = document.querySelector('input[name="theme"]:checked');
        return selected ? selected.value : 'food';
    }

    function getCurrentGridLanguage() {
        const selected = document.querySelector('input[name="grid-lang"]:checked');
        return selected ? selected.value : null;
    }

    function getCurrentListLanguage() {
        const selected = document.querySelector('input[name="list-lang"]:checked');
        return selected ? selected.value : null;
    }

    function isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    function hashString(value) {
        let hash = 2166136261;
        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    function createSeededRandom(seedValue) {
        let seed = hashString(seedValue);
        return function seededRandom() {
            seed += 0x6D2B79F5;
            let next = seed;
            next = Math.imul(next ^ (next >>> 15), next | 1);
            next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
            return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
        };
    }

    function generateWordsearch() {
        const gridLang = getCurrentGridLanguage();
        const listLang = getCurrentListLanguage();
        const note = document.getElementById('direction-note');

        // If no languages selected, require selection
        if (!gridLang || !listLang) {
            note.textContent = 'Select both grid and word list languages to generate the wordsearch.';
            showDirectionPrompt();
            return;
        }

        // Don't allow same language for grid and list
        if (gridLang === listLang) {
            note.textContent = 'Grid and word list languages must be different.';
            showDirectionPrompt();
            return;
        }

        if (wordData.length === 0) {
            alert('No words loaded.');
            return;
        }

        const theme = getCurrentTheme();
        const themeName = theme === 'family' ? 'Family Members' : 'Food';
        const directionText = `${getLanguageDisplayName(gridLang)} → ${getLanguageDisplayName(listLang)} - ${themeName}`;
        note.textContent = 'Direction set to ' + directionText + '.';

        // Show selected pair/direction in page title and heading
        document.title = `Wordsearch: ${directionText}`;
        document.querySelector('h1').textContent = `Wordsearch: ${directionText}`;

        updateUrlParams(theme, gridLang, listLang);

        const gridSize = DEFAULT_GRID_SIZE;
        currentGrid = createEmptyGrid(gridSize);
        placedWords = [];
        foundWords = new Set();
        sourceWordsSet = new Set();

        const sourceField = mapLangCodeToField(gridLang);
        const targetField = mapLangCodeToField(listLang);
        const seededRandom = createSeededRandom(`${theme}:${sourceField}:${gridSize}`);

        // Keep source words in a lookup for any valid location in the grid
        wordData.forEach(item => sourceWordsSet.add(item[sourceField]));

        // Try to place each word with selected source language in grid
        for (const item of wordData) {
            const sourceWord = item[sourceField];
            const placement = placeWord(currentGrid, sourceWord, gridSize, seededRandom);
            if (placement) {
                placedWords.push({ ...placement, target: item[targetField], source: sourceWord });
            }
        }

        // Fill empty cells with random letters
        fillEmptyCells(currentGrid, gridSize, seededRandom);

        // Display the grid
        displayGrid(currentGrid, gridSize);

        // Display the word list
        displayWordList(placedWords, listLang);

        // Hide the input section to focus on the wordsearch
        document.querySelector('.input-section').style.display = 'none';
    }

    function createEmptyGrid(size) {
        return Array.from({ length: size }, () => Array(size).fill(null));
    }

    function placeWord(grid, word, size, random) {
        const directions = [
            [0, 1],   // right
            [1, 0],   // down
            [1, 1],   // down-right
            [1, -1],  // down-left
            [0, -1],  // left
            [-1, 0],  // up
            [-1, -1], // up-left
            [-1, 1]   // up-right
        ];

        // Try up to 100 times to place the word
        for (let attempt = 0; attempt < 100; attempt++) {
            const direction = directions[Math.floor(random() * directions.length)];
            const startRow = Math.floor(random() * size);
            const startCol = Math.floor(random() * size);

            if (canPlaceWord(grid, word, startRow, startCol, direction, size)) {
                // Place the word
                for (let i = 0; i < word.length; i++) {
                    const row = startRow + i * direction[0];
                    const col = startCol + i * direction[1];
                    grid[row][col] = word[i];
                }
                return { word, startRow, startCol, direction };
            }
        }
        return null; // Couldn't place the word
    }

    function canPlaceWord(grid, word, startRow, startCol, direction, size) {
        for (let i = 0; i < word.length; i++) {
            const row = startRow + i * direction[0];
            const col = startCol + i * direction[1];

            if (row < 0 || row >= size || col < 0 || col >= size) {
                return false; // Out of bounds
            }

            if (grid[row][col] !== null && grid[row][col] !== word[i]) {
                return false; // Conflict with existing letter
            }
        }
        return true;
    }

    function fillEmptyCells(grid, size, random) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (grid[row][col] === null) {
                    grid[row][col] = letters[Math.floor(random() * letters.length)];
                }
            }
        }
    }

    function displayGrid(grid, size) {
        gridDiv.innerHTML = '';

        if (isTouchDevice()) {
            const mobileHint = document.createElement('p');
            mobileHint.className = 'mobile-hint';
            mobileHint.textContent = 'On mobile: drag your finger across the letters to select a word.';
            gridDiv.appendChild(mobileHint);
        }

        const gridElement = document.createElement('div');
        gridElement.className = 'grid';
        gridElement.style.gridTemplateColumns = `repeat(${size}, 28px)`;
        gridElement.style.gridTemplateRows = `repeat(${size}, 28px)`;

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = grid[row][col];
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('mousedown', handleMouseDown);
                cell.addEventListener('mouseenter', handleMouseEnter);
                cell.addEventListener('touchstart', handleTouchStart, { passive: false });
                cell.addEventListener('touchmove', handleTouchMove, { passive: false });
                gridElement.appendChild(cell);
            }
        }

        gridDiv.appendChild(gridElement);
    }

    function displayWordList(placements, displayKey) {
        const langName = getLanguageDisplayName(displayKey);
        wordListDiv.innerHTML = '<h3>Words to find:</h3>';
        const ul = document.createElement('ul');
        placements.forEach(placement => {
            const li = document.createElement('li');
            li.textContent = placement.target;
            li.dataset.word = placement.source;
            if (foundWords.has(placement.source)) {
                li.classList.add('found');
            }
            ul.appendChild(li);
        });
        wordListDiv.appendChild(ul);
    }

    function handleMouseDown(e) {
        if (isSelecting) return;
        isSelecting = true;
        startCell = { row: parseInt(e.target.dataset.row), col: parseInt(e.target.dataset.col) };
        currentSelection = [startCell];
        updateSelectionDisplay();
        document.addEventListener('mouseup', handleMouseUp);
    }

    function getCellFromTouch(event) {
        const touch = event.touches[0] || event.changedTouches[0];
        if (!touch) return null;
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!element || !element.classList.contains('cell')) return null;
        return element;
    }

    function handleTouchStart(e) {
        if (isSelecting) return;
        const cell = getCellFromTouch(e);
        if (!cell) return;
        e.preventDefault();
        isSelecting = true;
        startCell = { row: parseInt(cell.dataset.row), col: parseInt(cell.dataset.col) };
        currentSelection = [startCell];
        updateSelectionDisplay();
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchcancel', handleTouchEnd);
    }

    function handleTouchMove(e) {
        if (!isSelecting) return;
        const cell = getCellFromTouch(e);
        if (!cell) return;
        e.preventDefault();
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        currentSelection = getSelectionCells(startCell, { row, col });
        updateSelectionDisplay();
    }

    function handleTouchEnd() {
        if (!isSelecting) return;
        isSelecting = false;
        checkSelection();
        clearSelectionDisplay();
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
        document.removeEventListener('touchcancel', handleTouchEnd);
    }

    function handleMouseEnter(e) {
        if (!isSelecting) return;
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        currentSelection = getSelectionCells(startCell, { row, col });
        updateSelectionDisplay();
    }

    function handleMouseUp() {
        if (!isSelecting) return;
        isSelecting = false;
        checkSelection();
        clearSelectionDisplay();
        document.removeEventListener('mouseup', handleMouseUp);
    }

    function getSelectionCells(start, end) {
        const cells = [];
        const gridSize = currentGrid ? currentGrid.length : DEFAULT_GRID_SIZE;
        const dRow = end.row - start.row;
        const dCol = end.col - start.col;
        const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
        if (steps === 0) return [start];

        const stepRow = dRow / steps;
        const stepCol = dCol / steps;

        for (let i = 0; i <= steps; i++) {
            const row = Math.round(start.row + i * stepRow);
            const col = Math.round(start.col + i * stepCol);
            if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
                cells.push({ row, col });
            }
        }
        return cells;
    }

    function updateSelectionDisplay() {
        document.querySelectorAll('.cell.selected').forEach(cell => cell.classList.remove('selected'));
        currentSelection.forEach(({ row, col }) => {
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) cell.classList.add('selected');
        });
    }

    function clearSelectionDisplay() {
        document.querySelectorAll('.cell.selected').forEach(cell => cell.classList.remove('selected'));
        currentSelection = [];
    }

    function checkSelection() {
        if (currentSelection.length < 2) return;

        const selectedText = currentSelection.map(({ row, col }) => currentGrid[row][col]).join('');
        const reversedText = selectedText.split('').reverse().join('');

        let foundWord = null;
        if (sourceWordsSet.has(selectedText) && !foundWords.has(selectedText)) {
            foundWord = selectedText;
        } else if (sourceWordsSet.has(reversedText) && !foundWords.has(reversedText)) {
            foundWord = reversedText;
        }

        if (!foundWord) {
            return;
        }

        // Mark found and persist
        foundWords.add(foundWord);

        currentSelection.forEach(({ row, col }) => {
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) {
                cell.classList.add('found');
                cell.classList.remove('selected');
            }
        });

        updateWordList();
    }

    function getWordCells(placement) {
        const cells = [];
        const length = placement.source.length;
        for (let i = 0; i < length; i++) {
            const row = placement.startRow + i * placement.direction[0];
            const col = placement.startCol + i * placement.direction[1];
            cells.push({ row, col });
        }
        return cells;
    }

    function arraysEqual(a, b) {
        if (a.length !== b.length) return false;
        return a.every((val, index) => val.row === b[index].row && val.col === b[index].col);
    }

    function highlightWord(placement) {
        const cells = getWordCells(placement);
        cells.forEach(({ row, col }) => {
            const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
            if (cell) cell.classList.add('found');
        });
    }

    function updateWordList() {
        const lis = wordListDiv.querySelectorAll('li');
        lis.forEach(li => {
            if (foundWords.has(li.dataset.word)) {
                li.classList.add('found');
            }
        });
    }
});