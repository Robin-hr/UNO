// UNO Game Logic Helpers

export const createDeck = () => {
  const colors = ['red', 'blue', 'green', 'yellow'];
  const numbers = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9];
  const specials = ['skip', 'skip', 'reverse', 'reverse', 'draw2', 'draw2'];
  const wildCards = ['wild', 'wild', 'wild', 'wild', 'wild4', 'wild4', 'wild4', 'wild4'];
  
  let deck = [];

  // Add colored cards
  colors.forEach(color => {
    numbers.forEach(num => {
      deck.push({ color, value: num.toString(), type: 'number', id: Math.random().toString(36).substr(2, 9) });
    });
    specials.forEach(spec => {
      deck.push({ color, value: spec, type: 'special', id: Math.random().toString(36).substr(2, 9) });
    });
  });

  // Add wild cards
  wildCards.forEach(wild => {
    deck.push({ color: 'any', value: wild, type: 'wild', id: Math.random().toString(36).substr(2, 9) });
  });

  return shuffle(deck);
};

export const shuffle = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};


export const dealCards = (deck, players) => {
  const hands = {};
  players.forEach(player => {
    hands[player.id] = deck.splice(0, 7);
  });
  return { hands, remainingDeck: deck };
};

export const isValidMove = (card, topCard) => {
  // Wild cards (Wild and Wild +4) can be played on anything
  if (card.value === 'wild' || card.value === 'wild4') return true;
  
  // Normal cards must match color or value
  if (card.color === topCard.color) return true;
  if (card.value === topCard.value) return true;
  
  return false;
};

