document.addEventListener('DOMContentLoaded', function() {
    const gridDiv = document.getElementById('grid');
    const wordListDiv = document.getElementById('word-list');
    const directionRadios = document.querySelectorAll('input[name="direction"]');

    let currentGrid = null;
    let placedWords = [];
    let foundWords = new Set();
    let isSelecting = false;
    let startCell = null;
    let currentSelection = [];
    let wordData = [];

    directionRadios.forEach(radio => radio.addEventListener('change', generateWordsearch));

    // Load words on page load; wait for direction selection to generate
    loadWords().then(() => {
        showDirectionPrompt();
    });

    function showDirectionPrompt() {
        gridDiv.innerHTML = '<p style="color:#333;">Please select language direction to display the wordsearch.</p>';
        wordListDiv.innerHTML = '';
    }

    async function loadWords() {
        try {
            const response = await fetch('words.json');
            wordData = await response.json();
            // Ensure words are normalized uppercase for grid placement
            wordData = wordData.map(item => ({
                spanish: item.spanish.toUpperCase(),
                english: item.english.toUpperCase()
            }));
        } catch (error) {
            console.error('Error loading words:', error);
            alert('Error loading words data.');
        }
    }

    function getCurrentDirection() {
        const selected = document.querySelector('input[name="direction"]:checked');
        return selected ? selected.value : null;
    }

    function generateWordsearch() {
        let direction = getCurrentDirection();
        const note = document.getElementById('direction-note');

        // If no direction explicitly checked, require selection
        if (!direction) {
            note.textContent = 'Direction not selected. Please choose one to generate the wordsearch.';
            showDirectionPrompt();
            return;
        }

        document.querySelector('.input-section').style.display = 'none';

        note.textContent = 'Direction set to ' + (direction === 'es-en' ? 'Spanish → English' : 'English → Spanish') + '.';

        if (wordData.length === 0) {
            alert('No words loaded.');
            return;
        }

        const gridSize = 15;
        currentGrid = createEmptyGrid(gridSize);
        placedWords = [];
        foundWords = new Set();

        const sourceKey = direction === 'es-en' ? 'spanish' : 'english';
        const displayKey = direction === 'es-en' ? 'english' : 'spanish';

        // Try to place each word with selected source language in grid
        for (const item of wordData) {
            const sourceWord = item[sourceKey];
            const placement = placeWord(currentGrid, sourceWord, gridSize);
            if (placement) {
                placedWords.push({ ...placement, target: item[displayKey], source: sourceWord });
            }
        }

        // Fill empty cells with random letters
        fillEmptyCells(currentGrid, gridSize);

        // Display the grid
        displayGrid(currentGrid, gridSize);

        // Display the word list
        displayWordList(placedWords, displayKey);
    }

    function createEmptyGrid(size) {
        return Array.from({ length: size }, () => Array(size).fill(null));
    }

    function placeWord(grid, word, size) {
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
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const startRow = Math.floor(Math.random() * size);
            const startCol = Math.floor(Math.random() * size);

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

    function fillEmptyCells(grid, size) {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (grid[row][col] === null) {
                    grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
                }
            }
        }
    }

    function displayGrid(grid, size) {
        gridDiv.innerHTML = '';
        const gridElement = document.createElement('div');
        gridElement.className = 'grid';

        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.textContent = grid[row][col];
                cell.dataset.row = row;
                cell.dataset.col = col;
                cell.addEventListener('mousedown', handleMouseDown);
                cell.addEventListener('mouseenter', handleMouseEnter);
                gridElement.appendChild(cell);
            }
        }

        gridDiv.appendChild(gridElement);
    }

    function displayWordList(placements, displayKey) {
        if (displayKey === 'english') {
            wordListDiv.innerHTML = '<h3>Words to find (English):</h3>';
        } else {
            wordListDiv.innerHTML = '<h3>Words to find (Spanish):</h3>';
        }
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
        const dRow = end.row - start.row;
        const dCol = end.col - start.col;
        const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
        if (steps === 0) return [start];

        const stepRow = dRow / steps;
        const stepCol = dCol / steps;

        for (let i = 0; i <= steps; i++) {
            const row = Math.round(start.row + i * stepRow);
            const col = Math.round(start.col + i * stepCol);
            if (row >= 0 && row < 15 && col >= 0 && col < 15) {
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

        for (const placement of placedWords) {
            if (foundWords.has(placement.source)) continue;

            const wordCells = getWordCells(placement);
            if (arraysEqual(currentSelection, wordCells) || arraysEqual(currentSelection, wordCells.slice().reverse())) {
                // Found the word
                foundWords.add(placement.source);
                highlightWord(placement);
                updateWordList();
                break;
            }
        }
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