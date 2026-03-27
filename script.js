document.addEventListener('DOMContentLoaded', function() {
    const DEFAULT_GRID_SIZE = 12;
    const gridDiv = document.getElementById('grid');
    const wordListDiv = document.getElementById('word-list');
    const wordsearchActions = document.querySelector('.wordsearch-actions');
    const backToSelectionButton = document.getElementById('back-to-selection');
    const showTranslationsBtn = document.getElementById('show-translations-btn');
    const languageWindow = document.getElementById('language-window');
    const themeWindow = document.getElementById('theme-window');
    const themeSelect = document.getElementById('theme-select');
    const toThemeButton = document.getElementById('to-theme-btn');
    const backToLanguageButton = document.getElementById('back-to-language-btn');
    const generateButton = document.getElementById('generate-btn');
    const directionNote = document.getElementById('direction-note');
    const gridLangRadios = document.querySelectorAll('input[name="grid-lang"]');
    const listLangRadios = document.querySelectorAll('input[name="list-lang"]');

    let currentGrid = null;
    let placedWords = [];
    let foundWords = new Set();
    let sourceWordsSet = new Set();
    let currentPuzzleKey = null;
    let isSelecting = false;
    let startCell = null;
    let currentSelection = [];
    let wordData = [];
    let themeCatalog = [];
    let initialThemeFromUrl = null;
    let showingTranslations = false;

    let wordsLoaded = false;
    let loadedTheme = null;

    function getUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            theme: params.get('theme'),
            grid: params.get('grid'),
            list: params.get('list')
        };
    }

    function normalizeLangCode(code) {
        if (!code) return code;
        const normalized = code.toLowerCase();
        if (normalized === 'cs') return 'cz';
        if (normalized === 'cym') return 'cy';
        return normalized;
    }

    function updateUrlParams(theme, gridLang, listLang) {
        const params = new URLSearchParams();
        if (theme) params.set('theme', theme);
        if (gridLang) params.set('grid', normalizeLangCode(gridLang));
        if (listLang) params.set('list', normalizeLangCode(listLang));
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
    }

    function normalizeThemeId(themeId) {
        if (themeId === 'family') return 'relatives';
        return themeId;
    }

    function setThemeOptions(catalog) {
        themeSelect.innerHTML = '<option value="">Select a theme</option>';
        // Temporarily show only food and relatives for translation checking
        const visibleThemes = catalog.filter(theme => ['food', 'fruits', 'relatives', 'cardinal-numbers'].includes(theme.id));
        visibleThemes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.id;
            option.textContent = theme.name;
            themeSelect.appendChild(option);
        });
    }

    async function loadThemeCatalog() {
        const response = await fetch('data/themes/index.json');
        if (!response.ok) {
            throw new Error('Unable to load theme catalog');
        }
        themeCatalog = await response.json();
        setThemeOptions(themeCatalog);
    }

    function applyUrlSettings() {
        const { theme, grid, list } = getUrlParams();
        const validLangs = ['es', 'fr', 'en', 'kw', 'br', 'cy', 'cz'];
        const normalizedGrid = normalizeLangCode(grid);
        const normalizedList = normalizeLangCode(list);
        initialThemeFromUrl = normalizeThemeId(theme);

        if (validLangs.includes(normalizedGrid)) {
            const gridRadio = document.querySelector(`input[name="grid-lang"][value="${normalizedGrid}"]`);
            if (gridRadio) gridRadio.checked = true;
        }

        if (validLangs.includes(normalizedList)) {
            const listRadio = document.querySelector(`input[name="list-lang"][value="${normalizedList}"]`);
            if (listRadio) listRadio.checked = true;
        }
    }

    function showLanguageWindow() {
        languageWindow.hidden = false;
        themeWindow.hidden = true;
        wordsearchActions.hidden = true;
        backToSelectionButton.hidden = true;
        showTranslationsBtn.hidden = true;
        directionNote.textContent = 'Select a language pair, then continue to choose a theme.';
    }

    function showThemeWindow() {
        languageWindow.hidden = true;
        themeWindow.hidden = false;
        wordsearchActions.hidden = true;
        backToSelectionButton.hidden = true;
        showTranslationsBtn.hidden = true;
        directionNote.textContent = 'Select a theme and click "Load Wordsearch".';
    }

    function hasLanguagePairSelected() {
        return Boolean(getCurrentGridLanguage() && getCurrentListLanguage());
    }

    applyUrlSettings();

    const initialParams = getUrlParams();
    const hasLanguagePairInUrl = Boolean(initialParams.grid && initialParams.list);

    if (!getCurrentListLanguage()) setDefaultListLanguage();

    showDirectionPrompt();

    loadThemeCatalog().then(() => {
        if (initialThemeFromUrl && themeCatalog.some(theme => theme.id === initialThemeFromUrl)) {
            themeSelect.value = initialThemeFromUrl;
        }

        if (hasLanguagePairInUrl || (initialThemeFromUrl && hasLanguagePairSelected())) {
            showThemeWindow();
            if (initialThemeFromUrl && themeSelect.value === initialThemeFromUrl) {
                updateUrlParams(initialThemeFromUrl, getCurrentGridLanguage(), getCurrentListLanguage());
                loadWords(initialThemeFromUrl).then(() => {
                    wordsLoaded = true;
                    loadedTheme = initialThemeFromUrl;
                    generateWordsearch();
                });
            } else if (hasLanguagePairInUrl) {
                updateUrlParams(null, getCurrentGridLanguage(), getCurrentListLanguage());
            } else {
                showLanguageWindow();
            }
        } else {
            showLanguageWindow();
        }
    }).catch(error => {
        console.error('Error loading theme catalog:', error);
        directionNote.textContent = 'Unable to load themes. Please refresh the page.';
    });

    themeSelect.addEventListener('change', () => {
        updateUrlParams(getCurrentTheme(), getCurrentGridLanguage(), getCurrentListLanguage());
        wordsLoaded = false;
        loadedTheme = null;
    });

    gridLangRadios.forEach(radio => radio.addEventListener('change', () => {
        updateUrlParams(null, getCurrentGridLanguage(), getCurrentListLanguage());
    }));
    listLangRadios.forEach(radio => radio.addEventListener('change', () => {
        updateUrlParams(null, getCurrentGridLanguage(), getCurrentListLanguage());
    }));

    toThemeButton.addEventListener('click', () => {
        if (!hasLanguagePairSelected()) {
            directionNote.textContent = 'Select both grid and word list languages to continue.';
            return;
        }
        updateUrlParams(null, getCurrentGridLanguage(), getCurrentListLanguage());
        showThemeWindow();
    });

    backToLanguageButton.addEventListener('click', () => {
        updateUrlParams(null, getCurrentGridLanguage(), getCurrentListLanguage());
        showLanguageWindow();
    });

    // Generate button event listener
    generateButton.addEventListener('click', () => {
        const selectedTheme = getCurrentTheme();
        if (!selectedTheme) {
            directionNote.textContent = 'Select a theme before loading the wordsearch.';
            return;
        }

        if (wordsLoaded && loadedTheme === selectedTheme) {
            generateWordsearch();
        } else {
            // If words not loaded yet, load them first
            loadWords(selectedTheme).then(() => {
                wordsLoaded = true;
                loadedTheme = selectedTheme;
                generateWordsearch();
            });
        }
    });

    backToSelectionButton.addEventListener('click', () => {
        document.querySelector('.input-section').style.display = 'block';
        wordsearchActions.hidden = true;
        backToSelectionButton.hidden = true;
        showTranslationsBtn.hidden = true;
        document.title = 'Wordsearch Generator';
        document.querySelector('h1').textContent = 'Language Wordsearch';
        showThemeWindow();
        showDirectionPrompt();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function toggleTranslations(show) {
        showingTranslations = show;
        const lis = wordListDiv.querySelectorAll('li');
        lis.forEach(li => {
            const gridWord = li.dataset.gridWord;
            let translationSpan = li.querySelector('.translation-reveal');
            
            if (show && gridWord && gridWord !== li.textContent) {
                if (!translationSpan) {
                    translationSpan = document.createElement('span');
                    translationSpan.className = 'translation-reveal';
                    translationSpan.textContent = ` (${gridWord})`;
                    li.appendChild(translationSpan);
                }
                translationSpan.style.display = 'inline';
            } else if (translationSpan) {
                translationSpan.style.display = 'none';
            }
        });
    }

    showTranslationsBtn.addEventListener('mousedown', () => {
        toggleTranslations(true);
    });

    showTranslationsBtn.addEventListener('mouseup', () => {
        toggleTranslations(false);
    });

    showTranslationsBtn.addEventListener('mouseleave', () => {
        toggleTranslations(false);
    });

    showTranslationsBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleTranslations(true);
    });

    showTranslationsBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        toggleTranslations(false);
    });

    function showDirectionPrompt() {
        gridDiv.innerHTML = '<p style="color:#333;">Choose options above and click "Load Wordsearch" to begin.</p>';
        wordListDiv.innerHTML = '';
    }

    async function loadWords(themeOverride = null) {
        const theme = normalizeThemeId(themeOverride || getCurrentTheme());
        if (!theme) {
            wordData = [];
            return;
        }

        const fileName = `data/themes/${theme}.json`;

        try {
            const response = await fetch(fileName);
            wordData = await response.json();
            // Ensure words are normalized uppercase for grid placement
            wordData = wordData.map(item => ({
                es: item.es ? item.es.toUpperCase() : item.spanish.toUpperCase(),
                fr: item.fr ? item.fr.toUpperCase() : item.french.toUpperCase(),
                en: item.en ? item.en.toUpperCase() : item.english.toUpperCase(),
                kw: item.kw ? item.kw.toUpperCase() : '',
                br: item.br ? item.br.toUpperCase() : '',
                // Fallback to English until Welsh translations are added to theme files.
                cy: item.cy ? item.cy.toUpperCase() : (item.en ? item.en.toUpperCase() : item.english.toUpperCase()),
                // Fallback to English until Czech translations are added to theme files.
                cz: item.cz ? item.cz.toUpperCase() : (item.en ? item.en.toUpperCase() : item.english.toUpperCase())
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
            case 'kw':
                return 'kw';
            case 'br':
                return 'br';
            case 'cy':
                return 'cy';
            case 'cs':
                return 'cz';
            default:
                return 'en'; // Default fallback
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
        if (['es', 'fr', 'en', 'kw', 'br', 'cy', 'cz'].includes(code)) return code;
        return 'fr';
    }

    function getLanguageDisplayName(code) {
        switch (code) {
            case 'es': return 'Spanish';
            case 'fr': return 'French';
            case 'en': return 'English';
            case 'kw': return 'Cornish';
            case 'br': return 'Breton';
            case 'cy': return 'Welsh';
            case 'cz': return 'Czech';
            default: return 'Unknown';
        }
    }

    function getGridWord(value) {
        return value.replace(/\s+/g, '');
    }

    function getCurrentTheme() {
        return themeSelect.value || null;
    }

    function getCurrentGridLanguage() {
        const selected = document.querySelector('input[name="grid-lang"]:checked');
        return selected ? normalizeLangCode(selected.value) : null;
    }

    function getCurrentListLanguage() {
        const selected = document.querySelector('input[name="list-lang"]:checked');
        return selected ? normalizeLangCode(selected.value) : null;
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
        const theme = normalizeThemeId(getCurrentTheme());

        // If no languages selected, require selection
        if (!gridLang || !listLang) {
            note.textContent = 'Select both grid and word list languages to generate the wordsearch.';
            showDirectionPrompt();
            return;
        }

        if (!theme) {
            note.textContent = 'Select a theme to generate the wordsearch.';
            showDirectionPrompt();
            return;
        }

        if (wordData.length === 0) {
            alert('No words loaded.');
            return;
        }

        const themeMeta = themeCatalog.find(item => item.id === theme);
        const themeName = themeMeta ? themeMeta.name : theme;
        const directionText = `${getLanguageDisplayName(listLang)} → ${getLanguageDisplayName(gridLang)} — ${themeName}`;
        note.textContent = 'Direction set to ' + directionText + '.';

        // Show selected pair/direction in page title and heading
        document.title = `Wordsearch: ${directionText}`;
        document.querySelector('h1').textContent = `Wordsearch: ${directionText}`;

        updateUrlParams(theme, gridLang, listLang);

        const gridSize = DEFAULT_GRID_SIZE;
        currentGrid = createEmptyGrid(gridSize);
        placedWords = [];
        sourceWordsSet = new Set();

        const puzzleKey = `${theme}:${gridLang}:${listLang}`;
        if (puzzleKey !== currentPuzzleKey) {
            foundWords = new Set();
            currentPuzzleKey = puzzleKey;
        }

        const sourceField = mapLangCodeToField(gridLang);
        const targetField = mapLangCodeToField(listLang);
        const seededRandom = createSeededRandom(`${theme}:${sourceField}:${gridSize}`);

        // Keep source words in a lookup for any valid location in the grid
        wordData.forEach(item => sourceWordsSet.add(getGridWord(item[sourceField])));

        // Try to place each word with selected source language in grid
        for (const item of wordData) {
            const sourceWord = getGridWord(item[sourceField]);
            const placement = placeWord(currentGrid, sourceWord, gridSize, seededRandom);
            if (placement) {
                placedWords.push({ ...placement, target: item[targetField], source: sourceWord, gridDisplay: item[sourceField] });
            }
        }

        // Fill empty cells with random letters
        fillEmptyCells(currentGrid, gridSize, seededRandom);

        // Display the grid
        displayGrid(currentGrid, gridSize);

        // Render persisted found-word lines for this puzzle
        renderFoundLines();

        // Display the word list
        displayWordList(placedWords, listLang);

        // Hide the input section to focus on the wordsearch
        document.querySelector('.input-section').style.display = 'none';
        wordsearchActions.hidden = false;
        backToSelectionButton.hidden = false;
        showTranslationsBtn.hidden = false;
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

        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'grid-wrapper';

        const foundOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        foundOverlay.classList.add('selection-overlay', 'found-overlay');
        foundOverlay.setAttribute('aria-hidden', 'true');

        const activeOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        activeOverlay.classList.add('selection-overlay', 'active-overlay');
        activeOverlay.setAttribute('aria-hidden', 'true');

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

        gridWrapper.appendChild(gridElement);
        gridWrapper.appendChild(foundOverlay);
        gridWrapper.appendChild(activeOverlay);
        gridDiv.appendChild(gridWrapper);
    }

    function displayWordList(placements, displayKey) {
        const langName = getLanguageDisplayName(displayKey);
        wordListDiv.innerHTML = '<h3>Words to find:</h3>';
        const ul = document.createElement('ul');
        placements.forEach(placement => {
            const li = document.createElement('li');
            li.textContent = placement.target;
            li.dataset.word = placement.source;
            li.dataset.gridWord = placement.gridDisplay;
            li.dataset.listWord = placement.target;
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
        const absRow = Math.abs(dRow);
        const absCol = Math.abs(dCol);
        const isStraight = dRow === 0 || dCol === 0;
        const isDiagonal = absRow === absCol;

        if (dRow === 0 && dCol === 0) return [start];
        if (!isStraight && !isDiagonal) return [start];

        const steps = Math.max(absRow, absCol);
        const stepRow = Math.sign(dRow);
        const stepCol = Math.sign(dCol);

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
        drawSelectionLine(currentSelection, 'active-overlay', 'selection-line-active', true);
    }

    function clearSelectionDisplay() {
        const activeOverlay = document.querySelector('.active-overlay');
        if (activeOverlay) activeOverlay.innerHTML = '';
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

        renderFoundLines();

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

    function setOverlayViewport(overlay, wrapperRect) {
        overlay.setAttribute('viewBox', `0 0 ${wrapperRect.width} ${wrapperRect.height}`);
        overlay.setAttribute('width', `${wrapperRect.width}`);
        overlay.setAttribute('height', `${wrapperRect.height}`);
    }

    function drawSelectionLine(cells, overlayClass, lineClass, clearFirst = false) {
        const overlay = document.querySelector(`.${overlayClass}`);
        const wrapper = document.querySelector('.grid-wrapper');
        if (!overlay || !wrapper) return;

        if (clearFirst) {
            overlay.innerHTML = '';
        }

        if (!cells || cells.length === 0) return;

        const first = cells[0];
        const last = cells[cells.length - 1];
        const firstCell = document.querySelector(`.cell[data-row="${first.row}"][data-col="${first.col}"]`);
        const lastCell = document.querySelector(`.cell[data-row="${last.row}"][data-col="${last.col}"]`);
        if (!firstCell || !lastCell) return;

        const wrapperRect = wrapper.getBoundingClientRect();
        setOverlayViewport(overlay, wrapperRect);

        const firstRect = firstCell.getBoundingClientRect();
        const lastRect = lastCell.getBoundingClientRect();

        const x1 = firstRect.left - wrapperRect.left + firstRect.width / 2;
        const y1 = firstRect.top - wrapperRect.top + firstRect.height / 2;
        const x2 = lastRect.left - wrapperRect.left + lastRect.width / 2;
        const y2 = lastRect.top - wrapperRect.top + lastRect.height / 2;

        if (cells.length === 1) {
            const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            point.setAttribute('cx', `${x1}`);
            point.setAttribute('cy', `${y1}`);
            point.setAttribute('r', '8');
            point.setAttribute('class', 'selection-point-active');
            overlay.appendChild(point);
            return;
        }

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', `${x1}`);
        line.setAttribute('y1', `${y1}`);
        line.setAttribute('x2', `${x2}`);
        line.setAttribute('y2', `${y2}`);
        line.setAttribute('class', lineClass);
        overlay.appendChild(line);
    }

    function renderFoundLines() {
        const foundOverlay = document.querySelector('.found-overlay');
        if (!foundOverlay) return;
        foundOverlay.innerHTML = '';

        placedWords.forEach(placement => {
            if (foundWords.has(placement.source)) {
                drawSelectionLine(getWordCells(placement), 'found-overlay', 'selection-line-found', false);
            }
        });
    }

    function updateWordList() {
        const lis = wordListDiv.querySelectorAll('li');
        lis.forEach(li => {
            if (foundWords.has(li.dataset.word)) {
                li.classList.add('found');
                const gridWord = li.dataset.gridWord;
            }
        });
    }
});