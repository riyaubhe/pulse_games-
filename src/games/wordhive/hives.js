// Word Hive: one 7-letter hive per weekday, ramping from moderate (Mon) to very
// difficult (Fri): fewer words, rarer letters (W, K, Y, X), and Friday's hive
// has a single vowel. Every word must be 4+ letters, use the center letter,
// and use only the 7 hive letters (letters may repeat). A pangram uses all 7.
// These lists were hand-checked for common words; names, abbreviations and
// slang were removed. NYT-style scoring: 4 letters = 1 point, longer words
// = their length, pangram = +7.
export const HIVES = {
  mon: {
    letters: 'acforty',
    center: 'r',
    words: ['actor', 'afar', 'aorta', 'array', 'arroyo', 'arty', 'attar', 'attract', 'carat', 'carrot', 'carry', 'cart', 'cataract', 'craft', 'crafty', 'croc', 'croft', 'factor', 'factory', 'faro', 'fora', 'foray', 'fort', 'forty', 'fray', 'orator', 'oratory', 'orca', 'racy', 'raft', 'ratty', 'roar', 'rococo', 'roof', 'root', 'rota', 'rotary', 'rotator', 'rotor', 'taro', 'tarot', 'tarry', 'tart', 'tartar', 'tract', 'tractor', 'tray', 'trot', 'troy'],
  },
  tue: {
    letters: 'egilmnt',
    center: 'm',
    words: ['element', 'eminent', 'emit', 'emitting', 'gentlemen', 'gimlet', 'imminent', 'item', 'lemming', 'lime', 'limit', 'limiting', 'linemen', 'meet', 'meeting', 'melee', 'melt', 'melting', 'meme', 'mettle', 'mien', 'mile', 'millet', 'milling', 'milt', 'mime', 'miming', 'mine', 'mingle', 'mingling', 'mini', 'mining', 'mint', 'minting', 'mite', 'mitt', 'mitten', 'teeming', 'tenement', 'time', 'timeline', 'timing'],
  },
  wed: {
    letters: 'aeilnpx',
    center: 'i',
    words: ['alexia', 'alien', 'alpine', 'axial', 'exile', 'explain', 'inane', 'inline', 'lain', 'lien', 'line', 'lineal', 'linen', 'nail', 'nile', 'nine', 'pail', 'pain', 'pile', 'pill', 'pine', 'pineal', 'pineapple', 'pipe', 'pipeline', 'pippin', 'pixel', 'pixie', 'plain'],
  },
  thu: {
    letters: 'abekrwy',
    center: 'w',
    words: ['awake', 'aware', 'away', 'awry', 'beware', 'breakaway', 'brew', 'brewer', 'brewery', 'ewer', 'eyewear', 'wake', 'ware', 'wary', 'weak', 'weaker', 'wear', 'wearer', 'weary', 'week', 'were', 'wreak'],
  },
  fri: {
    letters: 'adklrwy',
    center: 'd',
    words: ['award', 'awkward', 'awkwardly', 'daddy', 'dally', 'dark', 'darkly', 'draw', 'drawl', 'dray', 'dryly', 'drywall', 'dyad', 'lady', 'lard', 'radar', 'ward', 'wayward', 'yard'],
  },
};
