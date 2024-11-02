const WaterBlockStatus = Object.freeze({
    WATER: 'WATER',
    SHIP: 'SHIP',
    WATER_HIT: 'WATER_HIT',
    SHIP_HIT: 'SHIP_HIT',
});
  
// define water co-ordinates
    const x_axis = ['a', 'b', 'c', 'd', 'e'];
    const y_axis = [1, 2, 3, 4, 5]; 
  
// grids
  var playerGrid, botGrid;
  var playerGridShipCoordinates = []; 
  var botGridShipCoordinates = [];

// game state
const gameStateIdentifier = Object.freeze({
    YET_TO_START: 'yet_to_start',
    PLAYING: 'playing',
    OVER: 'over',
});
const playerIdentifier = Object.freeze({
    PLAYER: 'player',
    BOT: 'bot',
    NONE: 'none'
});

let gameTurn = playerIdentifier.NONE;
let gameState = gameStateIdentifier.YET_TO_START;
  
// map the 2D array with the html table
// flatmap -> map + flat
  const coordinate_mapping = x_axis.flatMap(x => y_axis.map(y => `${x}${y}`));
  
//util functions
// convert alphabet index to numeric index
convertAlphabetIndexToNumericIndex = (letter) => letter.charCodeAt(0) - 'a'.charCodeAt(0);

convertNumericIndexToAlphabetIndex = (number) => String.fromCharCode(number + 'a'.charCodeAt(0));

function parseCoordinate(coord) {
    return {
      row: convertAlphabetIndexToNumericIndex(coord[0]), // Convert 'a' to 0, 'b' to 1, etc.
      col: parseInt(coord[1], 10) - 1 // Convert '1' to 0, '2' to 1, etc.
    };
  }

// place ship
  function placeShipsOnGrid(ships, coordinates, playerType) {
    const gridSize = Math.sqrt(coordinates.length);
    const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(WaterBlockStatus.WATER));
  
    function canPlaceShip(row, col, length, direction) {
      if (direction === 'horizontal') {
        if (col + length > gridSize) return false;
        for (let i = 0; i < length; i++) {
          if (grid[row][col + i] !== WaterBlockStatus.WATER) return false;
        }
      } else if (direction === 'vertical') {
        if (row + length > gridSize) return false;
        for (let i = 0; i < length; i++) {
          if (grid[row + i][col] !== WaterBlockStatus.WATER) return false;
        }
      }
      return true;
    }
  
    function placeShip(row, col, length, direction, playerType) {
      if (direction === 'horizontal') {
        for (let i = 0; i < length; i++) {
          grid[row][col + i] = WaterBlockStatus.SHIP;
          // shipName
          playerType === 'player' ? playerGridShipCoordinates.push(`${convertNumericIndexToAlphabetIndex(row)}${col + i}`) : botGridShipCoordinates.push(`${convertNumericIndexToAlphabetIndex(row)}${col + i}`);
        }
      } else if (direction === 'vertical') {
        for (let i = 0; i < length; i++) {
          grid[row + i][col] = WaterBlockStatus.SHIP;
          // shipName
          playerType === 'player' ? playerGridShipCoordinates.push(`${convertNumericIndexToAlphabetIndex(row + i)}${col}`) : botGridShipCoordinates.push(`${convertNumericIndexToAlphabetIndex(row + i)}${col}`)  ;
        }
      }
    }
  
    ships.forEach((shipLength, index) => {
        const shipName = `ship${index+1}`
      let placed = false;
    
      while (!placed) {
        const randomIndex = Math.floor(Math.random() * coordinates.length);
        const { row, col } = parseCoordinate(coordinates[randomIndex]);
        const direction = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        if (canPlaceShip(row, col, shipLength, direction)) {
          placeShip(row, col, shipLength, direction, playerType);
          placed = true;
        }
      }
    });
  
    return grid;
  }
  
  function startGame() {
      playerGrid = placeShipsOnGrid([4, 3, 2], coordinate_mapping, 'player');
      botGrid = placeShipsOnGrid([4, 3, 2], coordinate_mapping, 'bot');

      console.log('Player ship cords:', playerGridShipCoordinates);
      console.log('Bot ship cords:', botGridShipCoordinates);

      const playerContainer = document.getElementById('player-container');
      playerContainer.appendChild(createGameGrid(playerGrid, 'player'));

      const botContainer = document.getElementById('bot-container');
      botContainer.appendChild(createGameGrid(botGrid, 'bot'));    
      
      document.getElementById('start-screen').style.display = 'none';
      document.getElementById('game-screen').style.display = 'flex';

      decideWhoStarts();
  }

  function createGameGrid(grid, playerType) {
    const table = document.createElement('table');
    table.classList.add('water-table');
    x_axis.forEach((x, xIndex) => {
        const row = document.createElement('tr');
        row.classList.add(`row-${xIndex+1}`);
        y_axis.forEach((y, yIndex) => {
            const cell = document.createElement('td');
            cell.setAttribute('data-coord', `${x}${y}`);
            cell.setAttribute('data-x', `${x}`);
            cell.setAttribute('data-y', `${y}`);
            cell.setAttribute('value', grid[xIndex][yIndex]);
            cell.classList.add(grid[xIndex][yIndex])
            if(playerType === 'bot') cell.addEventListener('click', () => playerShootListner(cell));
            row.appendChild(cell);
        });
        table.appendChild(row);
    });
    return table;
  }

  function playerShootListner(cell) {
    const coord = cell.getAttribute('data-coord');
    const x = cell.getAttribute('data-x');
    const y = cell.getAttribute('data-y');
    const value = cell.getAttribute('value');

    if (value === WaterBlockStatus.WATER) {
      cell.classList.remove(WaterBlockStatus.WATER);
      cell.classList.add(WaterBlockStatus.WATER_HIT);
      cell.setAttribute('value', WaterBlockStatus.WATER_HIT);
      botGrid[convertAlphabetIndexToNumericIndex(x)][y-1] = WaterBlockStatus.WATER_HIT;
      document.getElementById('message-container').textContent = `Missed at ${coord}`;

      gameTurn = playerIdentifier.BOT;
      askBotToShoot();
    } else if (value === WaterBlockStatus.SHIP) {
      cell.classList.remove(WaterBlockStatus.SHIP);
      cell.classList.add(WaterBlockStatus.SHIP_HIT);
      cell.setAttribute('value', WaterBlockStatus.SHIP_HIT);
      botGrid[convertAlphabetIndexToNumericIndex(x)][y-1] = WaterBlockStatus.SHIP_HIT;
      removeShipCoord(`${x}${y-1}`, 'player');
      document.getElementById('message-container').textContent = `Hit at ${coord}`;
      checkWinCondition('player');
    } else {
      document.getElementById('message-container').textContent = `Already hit at ${coord}`;
    }
  }

  function removeShipCoord(coord, playerType) {
    playerType === 'player' ? botGridShipCoordinates = botGridShipCoordinates.filter(c => c!== coord) : playerGridShipCoordinates = playerGridShipCoordinates.filter(c => c!== coord);
  }

  function checkWinCondition(playerType) {
    if(playerType === 'player') { 
        if(botGridShipCoordinates.length === 0) {
            document.getElementById('message-container').textContent = 'You won!';
            // break game loop
            gameState = gameStateIdentifier.OVER;
            return;
        }

        gameTurn = playerIdentifier.BOT;
        askBotToShoot();
    }
    if(playerType === 'bot') { 
        if(playerGridShipCoordinates.length === 0) {
            document.getElementById('message-container').textContent = 'Bot won!';
            // break game loop
            gameState = gameStateIdentifier.OVER;
        }
    }
  }

  function decideWhoStarts() {
    gameTurn = Math.random() < 0.5 ? playerIdentifier.PLAYER : playerIdentifier.BOT;
    gameState = gameStateIdentifier.PLAYING;
    document.getElementById('message-container').textContent = `${gameTurn === playerIdentifier.PLAYER ? 'You are starting the game' : 'Bot is starting the game'}`;
    if(gameTurn === playerIdentifier.BOT) {
        askBotToShoot();
    }
  }

  function askBotToShoot(isSubsequent = false, previousCoord = '') {
    if(gameState === gameStateIdentifier.OVER) return;
    if(!isSubsequent) {
        const randomIndex = Math.floor(Math.random() * coordinate_mapping.length);
        const { row, col } = parseCoordinate(coordinate_mapping[randomIndex]);
        console.log('Bot shoots at:', `${convertNumericIndexToAlphabetIndex(row)}${col}`);
        // const x = convertAlphabetIndexToNumericIndex(coord[0]);
        // const y = parseInt(coord[1], 10) + 1;
        // const cell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        // if(cell) {
        //     cell.click();
        //     askBotToShoot(true, coord);
        // }
    }
  }