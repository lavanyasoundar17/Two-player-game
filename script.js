const WaterBlockStatus = Object.freeze({
  WATER: "WATER",
  SHIP: "SHIP",
  WATER_HIT: "WATER_HIT",
  SHIP_HIT: "SHIP_HIT",
});

// define water co-ordinates
const x_axis = ["a", "b", "c", "d", "e"];
const y_axis = [1, 2, 3, 4, 5];

// grids
var playerGrid, botGrid;
var playerGridShipCoordinates = [];
var botGridShipCoordinates = [];
var botPossibleFireSlots = [];

// game state
const gameStateIdentifier = Object.freeze({
  YET_TO_START: "yet_to_start",
  PLAYING: "playing",
  OVER: "over",
});
const playerIdentifier = Object.freeze({
  PLAYER: "player",
  BOT: "bot",
  NONE: "none",
});

let gameTurn = playerIdentifier.NONE;
let gameState = gameStateIdentifier.YET_TO_START;

// map the 2D array with the html table
// flatmap -> map + flat
const coordinate_mapping = x_axis.flatMap((x) =>
  y_axis.map((y) => `${x}${y - 1}`)
);
let bot_picking_coordinates = [...coordinate_mapping];
//util functions
// convert alphabet index to numeric index
const convertAlphabetIndexToNumericIndex = (letter) =>
  parseInt(letter.charCodeAt(0) - "a".charCodeAt(0));

const convertNumericIndexToAlphabetIndex = (number) =>
  String.fromCharCode(parseInt(number) + "a".charCodeAt(0));

function parseCoordinate(coord) {
  return {
    row: convertAlphabetIndexToNumericIndex(coord[0]), // Convert 'a' to 0, 'b' to 1, etc.
    col: parseInt(coord[1], 10) - 1, // Convert '1' to 0, '2' to 1, etc.
  };
}

// place ship
function placeShipsOnGrid(ships, coordinates, playerType) {
  // const gridSize = Math.sqrt(coordinates.length);
  const grid = Array.from({ length: x_axis.length }, () =>
    Array(y_axis.length).fill(WaterBlockStatus.WATER)
  );

  function canPlaceShip(row, col, length, direction) {
    if (direction === "horizontal") {
      if (col + length > x_axis.length) return false;
      for (let i = 0; i < length; i++) {
        if (grid[row][col + i] !== WaterBlockStatus.WATER) return false;
      }
    } else if (direction === "vertical") {
      if (row + length > y_axis.length) return false;
      for (let i = 0; i < length; i++) {
        if (grid[row + i][col] !== WaterBlockStatus.WATER) return false;
      }
    }
    return true;
  }

  function placeShip(row, col, length, direction, playerType) {
    if (direction === "horizontal") {
      for (let i = 0; i < length; i++) {
        grid[row][col + i] = WaterBlockStatus.SHIP;
        // shipName
        playerType === "player"
          ? playerGridShipCoordinates.push(
              `${convertNumericIndexToAlphabetIndex(row)}${col + i}`
            )
          : botGridShipCoordinates.push(
              `${convertNumericIndexToAlphabetIndex(row)}${col + i}`
            );
      }
    } else if (direction === "vertical") {
      for (let i = 0; i < length; i++) {
        grid[row + i][col] = WaterBlockStatus.SHIP;
        // shipName
        playerType === "player"
          ? playerGridShipCoordinates.push(
              `${convertNumericIndexToAlphabetIndex(row + i)}${col}`
            )
          : botGridShipCoordinates.push(
              `${convertNumericIndexToAlphabetIndex(row + i)}${col}`
            );
      }
    }
  }

  ships.forEach((shipLength, index) => {
    const shipName = `ship${index + 1}`;
    let placed = false;

    while (!placed) {
      const randomIndex = Math.floor(Math.random() * coordinates.length);
      const { row, col } = parseCoordinate(coordinates[randomIndex]);
      const direction = Math.random() < 0.5 ? "horizontal" : "vertical";
      if (canPlaceShip(row, col, shipLength, direction)) {
        placeShip(row, col, shipLength, direction, playerType);
        placed = true;
      }
    }
  });

  return grid;
}

function startGame() {
  playerGrid = placeShipsOnGrid([4, 3, 2], coordinate_mapping, "player");
  botGrid = placeShipsOnGrid([4, 3, 2], coordinate_mapping, "bot");

  console.log("Player ship cords:", playerGridShipCoordinates);
  console.log("Bot ship cords:", botGridShipCoordinates);

  const playerContainer = document.getElementById("player-container");
  playerContainer.appendChild(createGameGrid(playerGrid, "player"));

  const botContainer = document.getElementById("bot-container");
  botContainer.appendChild(createGameGrid(botGrid, "bot"));

  document.getElementById("start-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "flex";

  decideWhoStarts();
}

function createGameGrid(grid, playerType) {
  const table = document.createElement("table");
  table.classList.add("water-table");
  table.id = `${playerType}-table`;
  x_axis.forEach((x, xIndex) => {
    const row = document.createElement("tr");
    row.classList.add(`row-${xIndex + 1}`);
    y_axis.forEach((y, yIndex) => {
      const cell = document.createElement("td");
      cell.setAttribute("data-coord", `${x}${y}`);
      cell.setAttribute("data-x", `${x}`);
      cell.setAttribute("data-y", `${y}`);
      cell.setAttribute("value", grid[xIndex][yIndex]);
      cell.classList.add(grid[xIndex][yIndex]);
      cell.classList.add(`col-${yIndex + 1}`);
      if (playerType === "bot")
        cell.addEventListener("click", () => playerShootListner(cell));
      row.appendChild(cell);
    });
    table.appendChild(row);
  });
  return table;
}

function playerShootListner(cell) {
  if (
    gameState === gameStateIdentifier.OVER ||
    gameTurn !== playerIdentifier.PLAYER
  )
    return;
  const coord = cell.getAttribute("data-coord");
  const x = cell.getAttribute("data-x");
  const y = cell.getAttribute("data-y");
  const value = cell.getAttribute("value");

  if (value === WaterBlockStatus.WATER) {
    setCellToWaterHit(cell);
    botGrid[convertAlphabetIndexToNumericIndex(x)][y - 1] =
      WaterBlockStatus.WATER_HIT;

    gameTurn = playerIdentifier.BOT;
    setTimeout(() => {
      askBotToShoot();
    }, 1000);
  } else if (value === WaterBlockStatus.SHIP) {
    setCellToShipHit(cell);
    botGrid[convertAlphabetIndexToNumericIndex(x)][y - 1] =
      WaterBlockStatus.SHIP_HIT;
    removeShipCoord(`${x}${y - 1}`, "player");

    if (!checkWinCondition(playerIdentifier.PLAYER)) {
      setMessage("You hit a ship, fire next round");
    }
  } else {
    setMessage("Already hit at, try with new block");
  }
}

function removeShipCoord(coord, playerType) {
  playerType === "player"
    ? (botGridShipCoordinates = botGridShipCoordinates.filter(
        (c) => c !== coord
      ))
    : (playerGridShipCoordinates = playerGridShipCoordinates.filter(
        (c) => c !== coord
      ));
}

function checkWinCondition(playerType) {
  if (playerType === "player") {
    if (botGridShipCoordinates.length === 0) {
      setMessage("You won!");
      // break game loop
      gameState = gameStateIdentifier.OVER;
      return true;
    }
    return false;
  }
  if (playerType === "bot") {
    if (playerGridShipCoordinates.length === 0) {
      setMessage("Bot won!");
      // break game loop
      gameState = gameStateIdentifier.OVER;
      return true;
    }
    return false;
  }
}

function decideWhoStarts() {
  gameTurn =
    Math.random() < 0.5 ? playerIdentifier.PLAYER : playerIdentifier.BOT;
  gameState = gameStateIdentifier.PLAYING;

  gameTurn === playerIdentifier.PLAYER
    ? setMessage("You are starting the game")
    : setMessage("Bot is starting the game");
  if (gameTurn === playerIdentifier.BOT) {
    setTimeout(() => {
      askBotToShoot();
    }, 1000);
  }
}
function askBotToShoot() {
  setMessage("Bot's turn");
  if (
    gameState === gameStateIdentifier.OVER ||
    gameTurn !== playerIdentifier.BOT
  )
    return;

  const randomIndex = Math.floor(
    Math.random() * bot_picking_coordinates.length
  );
  console.log(bot_picking_coordinates[randomIndex], "picked value");
  const row = convertAlphabetIndexToNumericIndex(
    bot_picking_coordinates[randomIndex][0]
  );
  const col = parseInt(bot_picking_coordinates[randomIndex][1]);
  console.log(
    "Bot shoots at:",
    `${convertNumericIndexToAlphabetIndex(row)}${col}`
  );
  console.log("picked index value is", playerGrid[row][col]);

  if (
    playerGrid[row][col] === WaterBlockStatus.WATER_HIT ||
    playerGrid[row][col] === WaterBlockStatus.SHIP_HIT
  ) {
    removeCoordinateFired(row, col);
    setTimeout(() => {
      askBotToShoot();
    }, 1000);
  } else if (playerGrid[row][col] === WaterBlockStatus.WATER) {
    const shortFiredElement = getFiredCell(row, col);
    playerGrid[row][col] = WaterBlockStatus.WATER_HIT;
    setCellToWaterHit(shortFiredElement);
    removeCoordinateFired(row, col);

    gameTurn = playerIdentifier.PLAYER;
    setMessage("Your turn");
  } else if (playerGrid[row][col] === WaterBlockStatus.SHIP) {
    const shortFiredElement = getFiredCell(row, col);
    playerGrid[row][col] = WaterBlockStatus.SHIP_HIT;
    setCellToShipHit(shortFiredElement);
    removeShipCoord(`${bot_picking_coordinates[randomIndex][0]}${col}`, "bot");
    removeCoordinateFired(row, col);
    if (!checkWinCondition(playerIdentifier.BOT)) {
      setTimeout(() => {
        askBotToShoot();
      }, 1000);
    }
    // constructNextPossibleSlots(row, col);
  }
}

function removeCoordinateFired(row, col) {
  console.log(
    `${convertNumericIndexToAlphabetIndex(row)}${col}`,
    "element to remove"
  );
  bot_picking_coordinates = bot_picking_coordinates.filter(
    (val) => val != `${convertNumericIndexToAlphabetIndex(row)}${col}`
  );
  console.log(bot_picking_coordinates, "pending coordinates bot");
}

function getFiredCell(row, col) {
  return document.getElementById("player-table")?.childNodes[row]?.childNodes[
    col
  ];
}

function setCellToWaterHit(cell) {
  cell.classList.remove(WaterBlockStatus.WATER);
  cell.classList.add(WaterBlockStatus.WATER_HIT);
  cell.setAttribute("value", WaterBlockStatus.WATER_HIT);
}

function setCellToShipHit(cell) {
  cell.classList.remove(WaterBlockStatus.SHIP);
  cell.classList.add(WaterBlockStatus.SHIP_HIT);
  cell.setAttribute("value", WaterBlockStatus.SHIP_HIT);
}

function setMessage(message) {
  document.getElementById("message-container").textContent = message;
}
