# Spanish-English Food Wordsearch Generator

A static website that generates wordsearch puzzles with Spanish/English food vocabulary. Choose direction and find the target language words in the grid.

## Features

- Pre-loaded Spanish food words from `words.json`
- Generates a 15x15 wordsearch grid from Spanish or English based on selected direction
- Translation words displayed in the list for lookup
- Interactive selection: click and drag to find words
- Visual feedback for found words (highlighted in yellow, struck through in list)

## How to Use

1. Open `index.html` in a web browser
2. Select direction: Spanish->English or English->Spanish
3. Click and drag on the grid to select sequences of letters
4. Find all the target-language words - reference words are in the list
5. Found words are highlighted and marked complete

## Adding More Words

Edit `words.json` to add more word pairs:

```json
[
  {
    "spanish": "PAN",
    "english": "Bread"
  }
]
```

## Hosting on GitHub Pages

1. Create a new repository on GitHub
2. Upload these files: `index.html`, `styles.css`, `script.js`, `words.json`
3. Go to repository Settings > Pages
4. Set source to "Deploy from a branch"
5. Select "main" branch and "/ (root)" folder
6. Save and wait for deployment

Your wordsearch will be available at `https://yourusername.github.io/repositoryname/`

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript