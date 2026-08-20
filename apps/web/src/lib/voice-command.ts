/**
 * Parses a spoken shopping command ("2 phone case", "dui charger", "ekta case
 * please") into a quantity and a search query. Deliberately narrow: digits,
 * English number words one–twenty, common Banglish number words 1–10, and
 * "dozen" (12) — no compound numbers ("twenty-five"), no multiplicative
 * phrases ("2 dozen" is treated as 12, not 24). Voice requests for an
 * e-commerce store rarely need more range than that.
 */

export interface VoiceCommand {
  quantity: number;
  itemText: string;
}

const DIGIT_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20,
};

// Banglish number words 1-10, including the combined number+counter form
// ("ekta" = "ek" + "ta", a single word meaning "one [of something]").
const BANGLISH_WORDS: Record<string, number> = {
  ek: 1, ekta: 1,
  dui: 2, duita: 2,
  tin: 3, tinta: 3,
  char: 4, charta: 4,
  pach: 5, panch: 5, pachta: 5,
  choy: 6, choyta: 6,
  shat: 7, shatta: 7, xat: 7,
  at: 8, atta: 8,
  noy: 9, noyta: 9,
  dosh: 10, doshta: 10,
};

const DOZEN_WORDS = new Set(['dozen', 'dozens']);

const LEADING_FILLERS = [
  /^i want to\s+/i,
  /^i want\s+/i,
  /^i need\s+/i,
  /^get me\s+/i,
  /^search for\s+/i,
  /^add\s+/i,
  /^buy\s+/i,
  /^find\s+/i,
  /^please\s+/i,
];

const TRAILING_FILLERS = [
  /\s+to (my )?cart$/i,
  /\s+please$/i,
];

function stripFillers(text: string): string {
  let result = text;
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of LEADING_FILLERS) {
      if (re.test(result)) {
        result = result.replace(re, '');
        changed = true;
      }
    }
  }
  for (const re of TRAILING_FILLERS) {
    result = result.replace(re, '');
  }
  return result.trim();
}

export function parseVoiceCommand(rawTranscript: string): VoiceCommand {
  const tokens = stripFillers(rawTranscript).split(/\s+/).filter(Boolean);

  let quantity = 1;
  let quantityFound = false;
  const remaining: string[] = [];

  for (const raw of tokens) {
    const word = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

    // "dozen" always wins, even overriding a number word spoken just before it
    // ("one dozen" -> 12, not 1).
    if (DOZEN_WORDS.has(word)) {
      quantity = 12;
      quantityFound = true;
      continue;
    }

    if (!quantityFound) {
      if (/^\d+$/.test(word)) {
        quantity = parseInt(word, 10);
        quantityFound = true;
        continue;
      }
      if (word in DIGIT_WORDS) {
        quantity = DIGIT_WORDS[word];
        quantityFound = true;
        continue;
      }
      if (word in BANGLISH_WORDS) {
        quantity = BANGLISH_WORDS[word];
        quantityFound = true;
        continue;
      }
    } else if (remaining.length === 0 && word === 'ta') {
      // Bangla counting particle immediately after the quantity ("2 ta", "dui ta") — drop it.
      continue;
    }

    remaining.push(raw);
  }

  return { quantity, itemText: remaining.join(' ').trim() };
}
