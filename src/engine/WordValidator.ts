/**
 * Trie-based dictionary for fast word validation.
 * For MVP we load a word list at runtime. Later we'll precompile to DAWG.
 */

interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
}

function createNode(): TrieNode {
  return { children: new Map(), isWord: false };
}

export class WordValidator {
  private root: TrieNode = createNode();
  private wordCount = 0;

  /** Load words from a newline-separated string */
  loadWords(text: string): void {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const word = line.trim().toUpperCase();
      if (word.length >= 2) {
        this.insert(word);
      }
    }
  }

  private insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, createNode());
      }
      node = node.children.get(ch)!;
    }
    if (!node.isWord) {
      node.isWord = true;
      this.wordCount++;
    }
  }

  isWord(word: string): boolean {
    const upper = word.toUpperCase();
    let node = this.root;
    for (const ch of upper) {
      if (!node.children.has(ch)) return false;
      node = node.children.get(ch)!;
    }
    return node.isWord;
  }

  hasPrefix(prefix: string): boolean {
    const upper = prefix.toUpperCase();
    let node = this.root;
    for (const ch of upper) {
      if (!node.children.has(ch)) return false;
      node = node.children.get(ch)!;
    }
    return true;
  }

  getCompletions(prefix: string, maxResults = 10): string[] {
    const upper = prefix.toUpperCase();
    let node = this.root;
    for (const ch of upper) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch)!;
    }
    const results: string[] = [];
    this.collectWords(node, upper, results, maxResults);
    return results;
  }

  private collectWords(node: TrieNode, prefix: string, results: string[], max: number): void {
    if (results.length >= max) return;
    if (node.isWord) results.push(prefix);
    for (const [ch, child] of node.children) {
      this.collectWords(child, prefix + ch, results, max);
    }
  }

  get size(): number {
    return this.wordCount;
  }
}

// Singleton instance
let validatorInstance: WordValidator | null = null;

export function getValidator(): WordValidator {
  if (!validatorInstance) {
    validatorInstance = new WordValidator();
  }
  return validatorInstance;
}

export async function loadDictionary(): Promise<WordValidator> {
  const validator = getValidator();
  if (validator.size > 0) return validator;

  try {
    const response = await fetch('/dictionary.txt');
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('text/plain')) {
      throw new Error('Dictionary file not found');
    }
    const text = await response.text();
    // Sanity check: dictionary should have many words
    if (text.split('\n').length < 100) {
      throw new Error('Dictionary file appears invalid');
    }
    validator.loadWords(text);
    console.log(`Dictionary loaded: ${validator.size} words`);
  } catch (_err) {
    // Load a built-in fallback for development
    loadFallbackDictionary(validator);
    console.log(`Fallback dictionary loaded: ${validator.size} words`);
  }

  return validator;
}

/** Minimal dictionary for development/testing */
function loadFallbackDictionary(validator: WordValidator): void {
  const words = [
    // Common 2-letter words
    'AA', 'AB', 'AD', 'AE', 'AG', 'AH', 'AI', 'AL', 'AM', 'AN', 'AR', 'AS', 'AT', 'AW', 'AX', 'AY',
    'BA', 'BE', 'BI', 'BO', 'BY',
    'DA', 'DE', 'DO',
    'ED', 'EF', 'EH', 'EL', 'EM', 'EN', 'ER', 'ES', 'ET', 'EW', 'EX',
    'FA', 'FE',
    'GI', 'GO',
    'HA', 'HE', 'HI', 'HM', 'HO',
    'ID', 'IF', 'IN', 'IS', 'IT',
    'JO',
    'KA', 'KI',
    'LA', 'LI', 'LO',
    'MA', 'ME', 'MI', 'MM', 'MO', 'MU', 'MY',
    'NA', 'NE', 'NO', 'NU',
    'OD', 'OE', 'OF', 'OH', 'OI', 'OK', 'OM', 'ON', 'OP', 'OR', 'OS', 'OU', 'OW', 'OX', 'OY',
    'PA', 'PE', 'PI', 'PO',
    'QI',
    'RE',
    'SH', 'SI', 'SO',
    'TA', 'TI', 'TO',
    'UH', 'UM', 'UN', 'UP', 'US', 'UT',
    'WE', 'WO',
    'XI', 'XU',
    'YA', 'YE',
    'ZA', 'ZO',
    // Common 3-letter words
    'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR',
    'ACE', 'ACT', 'ADD', 'AGE', 'AGO', 'AID', 'AIM', 'AIR', 'ALE', 'APE', 'ARC', 'ARK', 'ARM', 'ART', 'ATE', 'AWE',
    'BAD', 'BAG', 'BAN', 'BAR', 'BAT', 'BED', 'BET', 'BIG', 'BIT', 'BOW', 'BOX', 'BOY', 'BUD', 'BUG', 'BUS', 'BUY',
    'CAB', 'CAP', 'CAR', 'CAT', 'COP', 'COT', 'COW', 'CRY', 'CUB', 'CUP', 'CUT',
    'DAD', 'DAM', 'DAY', 'DID', 'DIG', 'DIM', 'DIP', 'DOC', 'DOG', 'DOT', 'DRY', 'DUB', 'DUG', 'DUN',
    'EAR', 'EAT', 'EEL', 'EGG', 'ELF', 'ELM', 'EMU', 'END', 'ERA', 'EVE', 'EWE', 'EYE',
    'FAN', 'FAR', 'FAT', 'FAX', 'FED', 'FEW', 'FIG', 'FIN', 'FIT', 'FIX', 'FLY', 'FOG', 'FOP', 'FOR', 'FOX', 'FRY', 'FUN', 'FUR',
    'GAB', 'GAG', 'GAP', 'GAS', 'GEM', 'GET', 'GIG', 'GIN', 'GNU', 'GOB', 'GOD', 'GOT', 'GUM', 'GUN', 'GUT', 'GUY',
    'HAD', 'HAM', 'HAS', 'HAT', 'HAY', 'HEN', 'HEW', 'HID', 'HIM', 'HIP', 'HIS', 'HIT', 'HOG', 'HOP', 'HOT', 'HOW', 'HUB', 'HUE', 'HUG', 'HUM', 'HUT',
    'ICE', 'ICY', 'ILL', 'IMP', 'INK', 'INN', 'ION', 'IRE', 'IRK', 'ITS', 'IVY',
    'JAB', 'JAG', 'JAM', 'JAR', 'JAW', 'JAY', 'JET', 'JIG', 'JOB', 'JOG', 'JOT', 'JOY', 'JUG', 'JUT',
    'KEG', 'KEN', 'KEY', 'KID', 'KIN', 'KIT',
    'LAB', 'LAD', 'LAG', 'LAP', 'LAW', 'LAY', 'LEA', 'LED', 'LEG', 'LET', 'LID', 'LIE', 'LIP', 'LIT', 'LOG', 'LOT', 'LOW',
    'MAD', 'MAN', 'MAP', 'MAR', 'MAT', 'MAW', 'MAY', 'MEN', 'MET', 'MID', 'MIX', 'MOB', 'MOM', 'MOP', 'MOW', 'MUD', 'MUG', 'MUM',
    'NAB', 'NAG', 'NAP', 'NET', 'NEW', 'NIL', 'NIT', 'NOD', 'NOR', 'NOT', 'NOW', 'NUB', 'NUN', 'NUT',
    'OAK', 'OAR', 'OAT', 'ODD', 'ODE', 'OFF', 'OFT', 'OHM', 'OIL', 'OLD', 'ONE', 'OPT', 'ORB', 'ORE', 'OUR', 'OUT', 'OWE', 'OWL', 'OWN',
    'PAD', 'PAN', 'PAP', 'PAT', 'PAW', 'PAY', 'PEA', 'PEG', 'PEN', 'PEP', 'PER', 'PET', 'PEW', 'PIE', 'PIG', 'PIN', 'PIT', 'PLY', 'POD', 'POP', 'POT', 'POW', 'PRY', 'PUB', 'PUG', 'PUN', 'PUP', 'PUS', 'PUT',
    'RAG', 'RAM', 'RAN', 'RAP', 'RAT', 'RAW', 'RAY', 'RED', 'REF', 'RIB', 'RID', 'RIG', 'RIM', 'RIP', 'ROB', 'ROD', 'ROE', 'ROT', 'ROW', 'RUB', 'RUG', 'RUM', 'RUN', 'RUT',
    'SAC', 'SAD', 'SAG', 'SAP', 'SAT', 'SAW', 'SAY', 'SEA', 'SET', 'SEW', 'SHE', 'SHY', 'SIN', 'SIP', 'SIS', 'SIT', 'SIX', 'SKI', 'SKY', 'SLY', 'SOB', 'SOD', 'SON', 'SOP', 'SOT', 'SOW', 'SOY', 'SPA', 'SPY', 'STY', 'SUB', 'SUM', 'SUN', 'SUP',
    'TAB', 'TAD', 'TAG', 'TAN', 'TAP', 'TAR', 'TAT', 'TAX', 'TEA', 'TEN', 'THE', 'TIE', 'TIN', 'TIP', 'TOE', 'TON', 'TOO', 'TOP', 'TOT', 'TOW', 'TOY', 'TUB', 'TUG',
    'URN', 'USE',
    'VAN', 'VAT', 'VET', 'VEX', 'VIA', 'VIE', 'VOW',
    'WAD', 'WAG', 'WAR', 'WAX', 'WAY', 'WEB', 'WED', 'WET', 'WHO', 'WHY', 'WIG', 'WIN', 'WIT', 'WOE', 'WOK', 'WON', 'WOO', 'WOW',
    'YAK', 'YAM', 'YAP', 'YAW', 'YEA', 'YES', 'YET', 'YEW', 'YIN',
    'ZAP', 'ZEN', 'ZIP', 'ZIT', 'ZOO',
    // Common 4-letter words
    'ABLE', 'ACHE', 'ACRE', 'AGED', 'AIDE', 'AMID', 'ARCH', 'AREA', 'ARMY', 'ARTS',
    'BACK', 'BAKE', 'BALD', 'BALE', 'BALL', 'BAND', 'BANE', 'BANG', 'BANK', 'BARE', 'BARK', 'BARN', 'BASE', 'BATH', 'BEAD', 'BEAM', 'BEAN', 'BEAR', 'BEAT', 'BEEF', 'BEEN', 'BEER', 'BELL', 'BELT', 'BEND', 'BEST', 'BIKE', 'BILL', 'BIND', 'BIRD', 'BITE', 'BLED', 'BLEW', 'BLOW', 'BLUE', 'BLUR', 'BOAT', 'BODY', 'BOLD', 'BOLT', 'BOMB', 'BOND', 'BONE', 'BOOK', 'BOOM', 'BOOT', 'BORE', 'BORN', 'BOSS', 'BOTH', 'BOWL', 'BRED', 'BREW', 'BULK', 'BULL', 'BUMP', 'BURN', 'BUSH', 'BUSY', 'BUZZ',
    'CAFE', 'CAGE', 'CAKE', 'CALL', 'CALM', 'CAME', 'CAMP', 'CAPE', 'CARD', 'CARE', 'CART', 'CASE', 'CASH', 'CAST', 'CAVE', 'CHAR', 'CHAT', 'CHIN', 'CHIP', 'CHOP', 'CITE', 'CITY', 'CLAD', 'CLAM', 'CLAN', 'CLAP', 'CLAY', 'CLIP', 'CLOT', 'CLUB', 'CLUE', 'COAL', 'COAT', 'CODE', 'COIL', 'COIN', 'COLD', 'COLT', 'COME', 'COOK', 'COOL', 'COPE', 'COPY', 'CORD', 'CORE', 'CORK', 'CORN', 'COST', 'COUP', 'COVE', 'CREW', 'CROP', 'CROW', 'CUBE', 'CULT', 'CURB', 'CURE', 'CURL',
    'DALE', 'DAME', 'DAMP', 'DARE', 'DARK', 'DART', 'DASH', 'DATA', 'DATE', 'DAWN', 'DEAD', 'DEAF', 'DEAL', 'DEAR', 'DEBT', 'DECK', 'DEED', 'DEEM', 'DEEP', 'DEER', 'DENY', 'DESK', 'DIAL', 'DICE', 'DIED', 'DIET', 'DIRT', 'DISH', 'DISK', 'DOCK', 'DOES', 'DOME', 'DONE', 'DOOM', 'DOOR', 'DOSE', 'DOWN', 'DRAG', 'DRAM', 'DRAW', 'DREW', 'DRIP', 'DROP', 'DRUG', 'DRUM', 'DUAL', 'DUEL', 'DUKE', 'DULL', 'DUMB', 'DUMP', 'DUNE', 'DUNG', 'DUSK', 'DUST', 'DUTY',
    'EACH', 'EARL', 'EARN', 'EASE', 'EAST', 'EASY', 'EDGE', 'EDIT', 'ELSE', 'EMIT', 'ENVY', 'EPIC', 'EVEN', 'EVER', 'EVIL', 'EXAM', 'EXEC', 'EXIL', 'EXIT', 'EYED', 'EYES',
    'FACE', 'FACT', 'FADE', 'FAIL', 'FAIR', 'FAKE', 'FALL', 'FAME', 'FANG', 'FARE', 'FARM', 'FAST', 'FATE', 'FAWN', 'FEAR', 'FEAT', 'FEED', 'FEEL', 'FEET', 'FELL', 'FELT', 'FERN', 'FILE', 'FILL', 'FILM', 'FIND', 'FINE', 'FIRE', 'FIRM', 'FISH', 'FIST', 'FLAG', 'FLAK', 'FLAP', 'FLAT', 'FLAW', 'FLEA', 'FLED', 'FLEW', 'FLIP', 'FLIT', 'FLOG', 'FLOW', 'FOAM', 'FOIL', 'FOLD', 'FOLK', 'FOND', 'FONT', 'FOOD', 'FOOL', 'FOOT', 'FORD', 'FORE', 'FORK', 'FORM', 'FORT', 'FOUL', 'FOUR', 'FREE', 'FROM', 'FUEL', 'FULL', 'FUME', 'FUND', 'FURY', 'FUSE', 'FUSS',
    'GAIN', 'GAIT', 'GALE', 'GAME', 'GANG', 'GAPE', 'GARB', 'GATE', 'GAVE', 'GAZE', 'GEAR', 'GIFT', 'GILD', 'GIRL', 'GIVE', 'GLAD', 'GLEN', 'GLIB', 'GLOW', 'GLUE', 'GLUM', 'GNAT', 'GNAW', 'GOAT', 'GOES', 'GOLD', 'GOLF', 'GONE', 'GOOD', 'GORE', 'GRAB', 'GRAY', 'GREW', 'GRID', 'GRIM', 'GRIN', 'GRIP', 'GRIT', 'GROW', 'GULF', 'GUST',
    'HACK', 'HAIL', 'HAIR', 'HALE', 'HALF', 'HALL', 'HALT', 'HAND', 'HANG', 'HARE', 'HARM', 'HARP', 'HASH', 'HAST', 'HATE', 'HAUL', 'HAVE', 'HAZE', 'HEAD', 'HEAL', 'HEAP', 'HEAR', 'HEAT', 'HEED', 'HEEL', 'HELD', 'HELL', 'HELM', 'HELP', 'HERB', 'HERD', 'HERE', 'HERO', 'HIDE', 'HIGH', 'HIKE', 'HILL', 'HILT', 'HIND', 'HINT', 'HIRE', 'HOLD', 'HOLE', 'HOME', 'HONE', 'HOOD', 'HOOK', 'HOPE', 'HORN', 'HOSE', 'HOST', 'HOUR', 'HOWL', 'HUGE', 'HULL', 'HUMP', 'HUNG', 'HUNT', 'HURL', 'HURT',
    'IDEA', 'IDLE', 'IDOL',
    'JAIL', 'JAMB', 'JAWS', 'JAZZ', 'JEST', 'JILT', 'JIVE', 'JOBS', 'JOIN', 'JOKE', 'JOLT', 'JURY', 'JUST',
    'KEEN', 'KEEP', 'KEPT', 'KICK', 'KILL', 'KIND', 'KING', 'KISS', 'KITE', 'KNEE', 'KNEW', 'KNIT', 'KNOB', 'KNOT', 'KNOW',
    'LACE', 'LACK', 'LAID', 'LAKE', 'LAMB', 'LAME', 'LAMP', 'LAND', 'LANE', 'LARD', 'LARK', 'LAST', 'LATE', 'LAWN', 'LEAD', 'LEAF', 'LEAK', 'LEAN', 'LEAP', 'LEFT', 'LEND', 'LENS', 'LESS', 'LEST', 'LEVY', 'LICK', 'LIED', 'LIEU', 'LIFE', 'LIFT', 'LIKE', 'LIMB', 'LIME', 'LIMP', 'LINE', 'LINK', 'LION', 'LIST', 'LIVE', 'LOAD', 'LOAF', 'LOAM', 'LOAN', 'LOCK', 'LODE', 'LOFT', 'LONE', 'LONG', 'LOOK', 'LOOM', 'LOOP', 'LOOT', 'LORD', 'LORE', 'LOSE', 'LOSS', 'LOST', 'LOUD', 'LOVE', 'LUCK', 'LUMP', 'LURE', 'LURK', 'LUSH', 'LUST',
    'MADE', 'MAIL', 'MAIN', 'MAKE', 'MALE', 'MALL', 'MALT', 'MANE', 'MANY', 'MARE', 'MARK', 'MARS', 'MASH', 'MASK', 'MASS', 'MAST', 'MATE', 'MAZE', 'MEAD', 'MEAL', 'MEAN', 'MEAT', 'MEET', 'MELD', 'MELT', 'MEMO', 'MEND', 'MENU', 'MERE', 'MESH', 'MESS', 'MILD', 'MILE', 'MILK', 'MILL', 'MIME', 'MIND', 'MINE', 'MINT', 'MISS', 'MIST', 'MOAN', 'MOAT', 'MOCK', 'MODE', 'MOLD', 'MOLE', 'MOOD', 'MOON', 'MOOR', 'MORE', 'MOSS', 'MOST', 'MOTH', 'MOVE', 'MUCH', 'MULE', 'MUSE', 'MUST', 'MUTE',
    'NAIL', 'NAME', 'NAPE', 'NAVE', 'NAVY', 'NEAR', 'NEAT', 'NECK', 'NEED', 'NEST', 'NEWS', 'NEXT', 'NICE', 'NINE', 'NODE', 'NONE', 'NOON', 'NORM', 'NOSE', 'NOTE', 'NOUN',
    'OATH', 'OBEY', 'ODDS', 'OMEN', 'OMIT', 'ONCE', 'ONLY', 'ONTO', 'OPEN', 'ORAL', 'ORCA', 'OVEN', 'OVER', 'OWED', 'OWLS',
    'PACE', 'PACK', 'PACT', 'PAGE', 'PAID', 'PAIL', 'PAIN', 'PAIR', 'PALE', 'PALM', 'PANE', 'PARE', 'PARK', 'PART', 'PASS', 'PAST', 'PATH', 'PAVE', 'PAWN', 'PEAK', 'PEAL', 'PEAR', 'PEAT', 'PECK', 'PEEL', 'PEER', 'PEST', 'PICK', 'PIER', 'PIKE', 'PILE', 'PINE', 'PINK', 'PIPE', 'PLAN', 'PLAY', 'PLEA', 'PLOD', 'PLOT', 'PLOW', 'PLOY', 'PLUG', 'PLUM', 'PLUS', 'POEM', 'POET', 'POKE', 'POLE', 'POLL', 'POLO', 'POND', 'PONY', 'POOL', 'POOR', 'POPE', 'PORE', 'PORK', 'PORT', 'POSE', 'POST', 'POUR', 'PRAY', 'PREY', 'PROP', 'PULL', 'PULP', 'PUMP', 'PURE', 'PUSH',
    'QUIT', 'QUIZ',
    'RACE', 'RACK', 'RAFT', 'RAGE', 'RAID', 'RAIL', 'RAIN', 'RAKE', 'RAMP', 'RANG', 'RANK', 'RARE', 'RASH', 'RATE', 'RAVE', 'READ', 'REAL', 'REAP', 'REAR', 'REED', 'REEF', 'REEL', 'REIN', 'RELY', 'REND', 'RENT', 'REST', 'RICE', 'RICH', 'RIDE', 'RIFT', 'RILE', 'RIND', 'RING', 'RIOT', 'RISE', 'RISK', 'ROAD', 'ROAM', 'ROAR', 'ROBE', 'ROCK', 'RODE', 'ROLE', 'ROLL', 'ROOF', 'ROOM', 'ROOT', 'ROPE', 'ROSE', 'ROTE', 'ROUT', 'RUDE', 'RUIN', 'RULE', 'RUMP', 'RUNG', 'RUSH', 'RUST',
    'SACK', 'SAFE', 'SAGE', 'SAID', 'SAIL', 'SAKE', 'SALE', 'SALT', 'SAME', 'SAND', 'SANE', 'SANG', 'SANK', 'SASH', 'SAVE', 'SEAL', 'SEAM', 'SEAT', 'SECT', 'SEED', 'SEEK', 'SEEM', 'SEEN', 'SELF', 'SELL', 'SEMI', 'SEND', 'SENT', 'SHED', 'SHIN', 'SHIP', 'SHOE', 'SHOO', 'SHOP', 'SHOT', 'SHOW', 'SHUT', 'SICK', 'SIDE', 'SIFT', 'SIGH', 'SIGN', 'SILK', 'SILL', 'SILT', 'SING', 'SINK', 'SIRE', 'SITE', 'SIZE', 'SKIT', 'SLAB', 'SLAG', 'SLAM', 'SLAP', 'SLAT', 'SLAW', 'SLAY', 'SLED', 'SLEW', 'SLID', 'SLIM', 'SLIP', 'SLIT', 'SLOB', 'SLOP', 'SLOT', 'SLOW', 'SLUG', 'SLUM', 'SMOG', 'SNAP', 'SNIP', 'SNOB', 'SNUG', 'SOAK', 'SOAP', 'SOAR', 'SOCK', 'SODA', 'SOFA', 'SOFT', 'SOIL', 'SOLD', 'SOLE', 'SOME', 'SONG', 'SOON', 'SOOT', 'SORE', 'SORT', 'SOUL', 'SOUR', 'SPAN', 'SPAR', 'SPEC', 'SPED', 'SPIN', 'SPIT', 'SPOT', 'SPUR', 'STAB', 'STAG', 'STAR', 'STAY', 'STEM', 'STEP', 'STEW', 'STIR', 'STOP', 'STUB', 'STUD', 'STUN', 'SUCH', 'SUIT', 'SULK', 'SURE', 'SURF', 'SWAN', 'SWAP', 'SWIM',
    'TACK', 'TACT', 'TAIL', 'TAKE', 'TALE', 'TALK', 'TALL', 'TAME', 'TANG', 'TANK', 'TAPE', 'TAPS', 'TARN', 'TART', 'TASK', 'TAXI', 'TEAK', 'TEAL', 'TEAM', 'TEAR', 'TELL', 'TEND', 'TENT', 'TERM', 'TEST', 'TEXT', 'THAN', 'THAT', 'THEM', 'THEN', 'THEY', 'THIN', 'THIS', 'THUD', 'THUS', 'TICK', 'TIDE', 'TIDY', 'TIED', 'TIER', 'TILE', 'TILL', 'TILT', 'TIME', 'TINE', 'TINY', 'TIRE', 'TOAD', 'TOIL', 'TOLD', 'TOLL', 'TOMB', 'TOME', 'TONE', 'TOOK', 'TOOL', 'TOPS', 'TORE', 'TORN', 'TORT', 'TOSS', 'TOUR', 'TOWN', 'TRAP', 'TRAY', 'TREE', 'TREK', 'TRIM', 'TRIO', 'TRIP', 'TROD', 'TROT', 'TRUE', 'TUBE', 'TUCK', 'TUFT', 'TUNA', 'TUNE', 'TURN', 'TURF', 'TUSK', 'TWIN', 'TYPE',
    'UGLY', 'UNDO', 'UNIT', 'UNTO', 'UPON', 'URGE', 'USED',
    'VAIN', 'VALE', 'VANE', 'VARY', 'VASE', 'VAST', 'VEAL', 'VEER', 'VEIL', 'VEIN', 'VENT', 'VERB', 'VERY', 'VEST', 'VETO', 'VIEW', 'VILE', 'VINE', 'VOID', 'VOLT', 'VOTE', 'VOWED',
    'WADE', 'WAGE', 'WAIL', 'WAIT', 'WAKE', 'WALK', 'WALL', 'WAND', 'WANT', 'WARD', 'WARM', 'WARN', 'WARP', 'WART', 'WARY', 'WASH', 'WASP', 'WAVE', 'WAVY', 'WAXY', 'WEAK', 'WEAN', 'WEAR', 'WEED', 'WEEK', 'WEEP', 'WELD', 'WELL', 'WELT', 'WENT', 'WEPT', 'WERE', 'WEST', 'WHAT', 'WHEN', 'WHIM', 'WHIP', 'WHOM', 'WICK', 'WIDE', 'WIFE', 'WILD', 'WILL', 'WILT', 'WILY', 'WIMP', 'WIND', 'WINE', 'WING', 'WINK', 'WIPE', 'WIRE', 'WISE', 'WISH', 'WISP', 'WITH', 'WOKE', 'WOLF', 'WOMB', 'WOOD', 'WOOL', 'WORD', 'WORE', 'WORK', 'WORM', 'WORN', 'WOVE', 'WRAP', 'WREN',
    'YARD', 'YARN', 'YEAR', 'YELL', 'YOUR',
    'ZEAL', 'ZERO', 'ZEST', 'ZINC', 'ZONE', 'ZOOM',
    // Common 5-letter words (for testing INSERT and longer-word mechanics)
    'ABOUT', 'ABOVE', 'ABUSE', 'ACTED', 'ADDED', 'ADMIT', 'ADOPT', 'AFTER', 'AGAIN', 'AGENT', 'AGREE', 'AHEAD', 'AIMED', 'ALARM', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE', 'ALLEY', 'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'AMAZE', 'AMONG', 'AMPLE', 'ANGEL', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLY', 'ARENA', 'ARGUE', 'ARISE', 'ASIDE', 'ATLAS',
    'BADGE', 'BAKER', 'BASIC', 'BASIN', 'BASIS', 'BEACH', 'BEAST', 'BEGAN', 'BEGIN', 'BEING', 'BELOW', 'BENCH', 'BERRY', 'BLACK', 'BLADE', 'BLAME', 'BLANK', 'BLAST', 'BLAZE', 'BLEED', 'BLEND', 'BLESS', 'BLIND', 'BLISS', 'BLOCK', 'BLOOD', 'BLOOM', 'BLOWN', 'BOARD', 'BOAST', 'BONUS', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRAVE', 'BREAD', 'BREAK', 'BREED', 'BRICK', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROOK', 'BROOD', 'BRUSH', 'BUILD', 'BUILT', 'BUNCH', 'BURST', 'BUYER',
    'CABIN', 'CANDY', 'CARGO', 'CARRY', 'CATCH', 'CAUSE', 'CEASE', 'CHAIN', 'CHAIR', 'CHALK', 'CHANT', 'CHAOS', 'CHARM', 'CHART', 'CHASE', 'CHEAP', 'CHEAT', 'CHECK', 'CHEEK', 'CHEER', 'CHESS', 'CHEST', 'CHIEF', 'CHILD', 'CHILL', 'CHINA', 'CHOIR', 'CHORD', 'CHOSE', 'CIVIL', 'CLAIM', 'CLASH', 'CLASS', 'CLEAN', 'CLEAR', 'CLERK', 'CLICK', 'CLIFF', 'CLIMB', 'CLING', 'CLOCK', 'CLONE', 'CLOSE', 'CLOTH', 'CLOUD', 'COACH', 'COAST', 'COLOR', 'COMIC', 'CORAL', 'COUNT', 'COURT', 'COVER', 'CRACK', 'CRAFT', 'CRANE', 'CRASH', 'CRAZY', 'CREAM', 'CREEK', 'CREST', 'CRIME', 'CRISP', 'CROSS', 'CROWD', 'CROWN', 'CRUEL', 'CRUSH', 'CURVE', 'CYCLE',
    'DAIRY', 'DANCE', 'DEATH', 'DEBUT', 'DECAY', 'DELAY', 'DEMON', 'DENSE', 'DEPTH', 'DEVIL', 'DIARY', 'DIRTY', 'DOING', 'DOUBT', 'DOUGH', 'DRAFT', 'DRAIN', 'DRAMA', 'DRANK', 'DRAWN', 'DREAM', 'DRESS', 'DRIED', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'DROVE', 'DRUNK', 'DYING',
    'EAGER', 'EAGLE', 'EARLY', 'EARTH', 'EIGHT', 'ELECT', 'ELITE', 'EMBER', 'EMPTY', 'ENEMY', 'ENJOY', 'ENTER', 'EQUAL', 'ERROR', 'EVENT', 'EVERY', 'EXACT', 'EXILE', 'EXIST', 'EXTRA',
    'FABLE', 'FAITH', 'FALSE', 'FANCY', 'FAULT', 'FEAST', 'FENCE', 'FEVER', 'FIBER', 'FIELD', 'FIFTH', 'FIFTY', 'FIGHT', 'FINAL', 'FIRST', 'FIXED', 'FLAGS', 'FLAME', 'FLASH', 'FLESH', 'FLIES', 'FLINT', 'FLOAT', 'FLOCK', 'FLOOD', 'FLOOR', 'FLOUR', 'FLUID', 'FLUSH', 'FOCUS', 'FORCE', 'FORGE', 'FORTH', 'FORUM', 'FOUND', 'FRAME', 'FRANK', 'FRAUD', 'FRESH', 'FRONT', 'FROST', 'FROZE', 'FRUIT', 'FULLY',
    'GHOST', 'GIANT', 'GIVEN', 'GLAD', 'GLASS', 'GLOBE', 'GLOOM', 'GLORY', 'GLOVE', 'GOING', 'GRACE', 'GRADE', 'GRAIN', 'GRAND', 'GRANT', 'GRAPE', 'GRAPH', 'GRASP', 'GRASS', 'GRAVE', 'GREAT', 'GREEN', 'GREET', 'GRIEF', 'GRILL', 'GRIND', 'GROAN', 'GROOM', 'GROSS', 'GROUP', 'GROWN', 'GUARD', 'GUESS', 'GUEST', 'GUIDE', 'GUILT',
    'HABIT', 'HAPPY', 'HARSH', 'HASTE', 'HEART', 'HEAVY', 'HENCE', 'HINGE', 'HONEY', 'HONOR', 'HORSE', 'HOTEL', 'HOUSE', 'HUMAN', 'HUMOR', 'HURRY',
    'IMAGE', 'IMPLY', 'INDEX', 'INNER', 'INPUT',
    'JEWEL', 'JOINT', 'JOLLY', 'JUDGE', 'JUICE',
    'KNACK', 'KNEEL', 'KNIFE', 'KNOCK',
    'LABEL', 'LARGE', 'LATER', 'LAUGH', 'LAYER', 'LEARN', 'LEAST', 'LEAVE', 'LEGAL', 'LEMON', 'LEVEL', 'LIGHT', 'LIMIT', 'LINEN', 'LIVER', 'LOCAL', 'LOGIC', 'LOOSE', 'LOVER', 'LOWER', 'LOYAL', 'LUCKY', 'LUNAR', 'LUNCH',
    'MAGIC', 'MAJOR', 'MAKER', 'MANOR', 'MAPLE', 'MARCH', 'MATCH', 'MAYOR', 'MEANT', 'MEDAL', 'MEDIA', 'MERCY', 'MERGE', 'METAL', 'MIGHT', 'MINOR', 'MINUS', 'MODEL', 'MONEY', 'MONTH', 'MORAL', 'MOTOR', 'MOUNT', 'MOUSE', 'MOUTH', 'MOVIE', 'MUSIC', 'MUTUAL',
    'NAKED', 'NERVE', 'NEVER', 'NIGHT', 'NOBLE', 'NOISE', 'NORTH', 'NOTED', 'NOVEL', 'NURSE',
    'OCEAN', 'OCCUR', 'OFFER', 'OFTEN', 'OLIVE', 'ORDER', 'ORGAN', 'OTHER', 'OUGHT', 'OUTER', 'OWNER',
    'PAINT', 'PANEL', 'PANIC', 'PAPER', 'PARTY', 'PASTE', 'PATCH', 'PAUSE', 'PEACE', 'PEACH', 'PEARL', 'PENNY', 'PHASE', 'PHONE', 'PHOTO', 'PIANO', 'PIECE', 'PILOT', 'PITCH', 'PIXEL', 'PLACE', 'PLAIN', 'PLANE', 'PLANT', 'PLATE', 'PLAZA', 'PLEAD', 'PLUMB', 'PLUME', 'PLUMP', 'POINT', 'POISE', 'POLAR', 'PORCH', 'POUCH', 'POUND', 'POWER', 'PRESS', 'PRICE', 'PRIDE', 'PRIME', 'PRINCE', 'PRINT', 'PRIOR', 'PRIZE', 'PROBE', 'PROOF', 'PROUD', 'PROVE', 'PSALM', 'PUNCH', 'PUPIL', 'PURSE',
    'QUEEN', 'QUEST', 'QUEUE', 'QUICK', 'QUIET', 'QUITE', 'QUOTA', 'QUOTE',
    'RADAR', 'RAISE', 'RALLY', 'RANCH', 'RANGE', 'RAPID', 'RATIO', 'REACH', 'REACT', 'READY', 'REALM', 'REBEL', 'REFER', 'REIGN', 'RELAX', 'REPLY', 'RIDER', 'RIDGE', 'RIFLE', 'RIGHT', 'RIGID', 'RISEN', 'RISKY', 'RIVAL', 'RIVER', 'ROBOT', 'ROCKY', 'ROMAN', 'ROUGH', 'ROUND', 'ROUTE', 'ROYAL', 'RUGBY', 'RULER', 'RURAL',
    'SADLY', 'SAINT', 'SALAD', 'SCALE', 'SCARE', 'SCENE', 'SCENT', 'SCOPE', 'SCORE', 'SCOUT', 'SCRUB', 'SENSE', 'SERVE', 'SEVEN', 'SHALL', 'SHAME', 'SHAPE', 'SHARE', 'SHARP', 'SHAVE', 'SHAWL', 'SHEEP', 'SHEER', 'SHEET', 'SHELF', 'SHELL', 'SHIFT', 'SHINE', 'SHIRT', 'SHOCK', 'SHORE', 'SHORT', 'SHOUT', 'SHOVE', 'SIGHT', 'SINCE', 'SIXTH', 'SIXTY', 'SKILL', 'SKULL', 'SLASH', 'SLATE', 'SLAVE', 'SLEEP', 'SLICE', 'SLIDE', 'SLOPE', 'SMALL', 'SMART', 'SMELL', 'SMILE', 'SMITH', 'SMOKE', 'SNACK', 'SNAKE', 'SOLAR', 'SOLID', 'SOLVE', 'SORRY', 'SOUND', 'SOUTH', 'SPACE', 'SPARE', 'SPARK', 'SPEAK', 'SPEED', 'SPELL', 'SPEND', 'SPENT', 'SPICE', 'SPLIT', 'SPOKE', 'SPORT', 'SPRAY', 'STAFF', 'STAGE', 'STAIN', 'STAIR', 'STAKE', 'STALE', 'STALL', 'STAMP', 'STAND', 'STARE', 'START', 'STATE', 'STAYS', 'STEAK', 'STEAL', 'STEAM', 'STEEL', 'STEEP', 'STEER', 'STERN', 'STICK', 'STIFF', 'STILL', 'STOCK', 'STOLE', 'STONE', 'STOOD', 'STORE', 'STORM', 'STORY', 'STOVE', 'STRAP', 'STRAW', 'STRIP', 'STUCK', 'STUDY', 'STUFF', 'STUMP', 'STYLE', 'SUGAR', 'SUITE', 'SUNNY', 'SUPER', 'SURGE', 'SWAMP', 'SWARM', 'SWEAR', 'SWEAT', 'SWEET', 'SWEPT', 'SWIFT', 'SWING', 'SWIRL', 'SWORD', 'SWORE', 'SWUNG',
    'TASTE', 'TEACH', 'TEETH', 'THEIR', 'THEME', 'THERE', 'THICK', 'THIEF', 'THING', 'THINK', 'THIRD', 'THOSE', 'THREE', 'THREW', 'THROW', 'THUMB', 'TIGER', 'TIGHT', 'TIMER', 'TIRED', 'TITLE', 'TODAY', 'TOKEN', 'TOTAL', 'TOUCH', 'TOUGH', 'TOWEL', 'TOWER', 'TRACE', 'TRACK', 'TRADE', 'TRAIL', 'TRAIN', 'TRAIT', 'TRASH', 'TREAT', 'TREND', 'TRIAL', 'TRIBE', 'TRICK', 'TRIED', 'TROOP', 'TRUCK', 'TRULY', 'TRUNK', 'TRUST', 'TRUTH', 'TUMOR', 'TWICE',
    'UNCLE', 'UNDER', 'UNION', 'UNITE', 'UNITY', 'UNTIL', 'UPPER', 'UPSET', 'URBAN', 'USAGE', 'USUAL', 'UTTER',
    'VALID', 'VALUE', 'VALVE', 'VAULT', 'VIDEO', 'VIGOR', 'VIRUS', 'VISIT', 'VITAL', 'VIVID', 'VOCAL', 'VOICE', 'VOTER',
    'WAIST', 'WATCH', 'WATER', 'WEARY', 'WEAVE', 'WEDGE', 'WEIRD', 'WHEAT', 'WHEEL', 'WHERE', 'WHICH', 'WHILE', 'WHITE', 'WHOLE', 'WHOSE', 'WIDOW', 'WIDTH', 'WITCH', 'WOMAN', 'WORLD', 'WORRY', 'WORSE', 'WORST', 'WORTH', 'WOULD', 'WOUND', 'WRATH', 'WRITE', 'WRONG', 'WROTE',
    'YACHT', 'YIELD', 'YOUNG', 'YOUTH',
    // 6+ letter words for INSERT testing
    'BANTER', 'BANNER', 'BARKED', 'BASKET', 'BATTLE', 'BLISTER', 'BOLDER', 'BRANCH', 'BRIGHT', 'BRUTAL',
    'CASTLE', 'CHANGE', 'CHEESE', 'CLEVER', 'CLOSED', 'COFFEE', 'COMBAT', 'COMING', 'COMMON', 'COPPER',
    'DAMAGE', 'DANGER', 'DECIDE', 'DEFEND', 'DEGREE', 'DESIGN', 'DETAIL', 'DINNER', 'DIVINE', 'DOUBLE', 'DRAGON', 'DURING',
    'EMPIRE', 'ENERGY', 'ENGINE', 'ENOUGH', 'ESCAPE', 'EVENING', 'EXPERT',
    'FABRIC', 'FAMILY', 'FAMOUS', 'FATHER', 'FINGER', 'FLIGHT', 'FLOWER', 'FOREST', 'FORGET', 'FORMER', 'FRIEND', 'FROZEN', 'FUTURE',
    'GARDEN', 'GATHER', 'GENTLE', 'GINGER', 'GLOBAL', 'GOLDEN', 'GROUND', 'GROWTH',
    'HAMMER', 'HANDLE', 'HAPPEN', 'HARBOR', 'HEALTH', 'HEIGHT', 'HIDDEN', 'HOLLOW', 'HONEST', 'HUNGER', 'HUNTER',
    'IMPACT', 'IMPORT', 'INCOME', 'INDEED', 'INSECT', 'INSIDE', 'INTENT', 'INVEST', 'ISLAND',
    'JACKET', 'JUNGLE', 'JUNIOR', 'JUSTICE',
    'KEEPER', 'KIDNEY', 'KILLER', 'KINDLY', 'KINGDOM', 'KNIGHT', 'KITTEN',
    'LADDER', 'LAUNCH', 'LEADER', 'LEAGUE', 'LEGEND', 'LESSEN', 'LETTER', 'LINKED', 'LIQUID', 'LISTEN', 'LITTLE', 'LIVING', 'LOVELY', 'LUMBER',
    'MANNER', 'MARBLE', 'MARKET', 'MASTER', 'MATTER', 'MEDIUM', 'MEMORY', 'MENTAL', 'METHOD', 'MIDDLE', 'MIGHTY', 'MIRROR', 'MODERN', 'MOMENT', 'MONKEY', 'MOTHER', 'MOTION', 'MURDER', 'MUSCLE', 'MUSEUM', 'MUTUAL',
    'NARROW', 'NATION', 'NATURE', 'NEARBY', 'NEARLY', 'NEEDLE', 'NEWEST', 'NORMAL', 'NOTICE', 'NUMBER',
    'OBTAIN', 'OBJECT', 'OFFICE', 'ONLINE', 'OPPOSE', 'OPTION', 'ORANGE', 'ORIGIN', 'OUTPUT',
    'PALACE', 'PARENT', 'PATENT', 'PATROL', 'PENCIL', 'PEOPLE', 'PERIOD', 'PERMIT', 'PERSON', 'PICKED', 'PILLAR', 'PLANET', 'PLAYER', 'PLEASE', 'PLEDGE', 'PLUNGE', 'POCKET', 'POETRY', 'POISON', 'POLICE', 'POLICY', 'POLISH', 'POLITE', 'PORTAL', 'POSTER', 'POTATO', 'POWDER', 'PRAYER', 'PRINCE', 'PRISON', 'PROFIT', 'PROMPT', 'PROPEL', 'PROPER', 'PROVEN', 'PUBLIC', 'PUNISH', 'PURPLE', 'PURSUE', 'PUZZLE',
    'RABBIT', 'RANDOM', 'RANGER', 'RATTLE', 'REASON', 'RECALL', 'RECORD', 'REDUCE', 'REFORM', 'REFUSE', 'REGION', 'REGRET', 'REJECT', 'RELATE', 'RELIEF', 'REMAIN', 'REMEDY', 'REMOTE', 'REMOVE', 'REPAIR', 'REPEAT', 'REPORT', 'RESCUE', 'RESIGN', 'RESIST', 'RESORT', 'RESULT', 'RETAIN', 'RETIRE', 'RETURN', 'REVEAL', 'REVIEW', 'REVOLT', 'REWARD', 'RHYTHM', 'RIBBON', 'RISING', 'ROCKET', 'RUBBER', 'RUMBLE', 'RUNNER',
    'SACRED', 'SADDLE', 'SAFETY', 'SAILOR', 'SALMON', 'SAMPLE', 'SAVAGE', 'SAYING', 'SCARCE', 'SCHOOL', 'SCREEN', 'SEARCH', 'SEASON', 'SECOND', 'SECRET', 'SECTOR', 'SECURE', 'SELECT', 'SENIOR', 'SETTLE', 'SEVERE', 'SHADOW', 'SHIELD', 'SIGNAL', 'SILENT', 'SILVER', 'SIMPLE', 'SINGER', 'SINGLE', 'SISTER', 'SMOOTH', 'SOCIAL', 'SOFTEN', 'SOLDIER', 'SOURCE', 'SPEECH', 'SPHERE', 'SPIDER', 'SPIRIT', 'SPREAD', 'SPRING', 'SQUARE', 'STABLE', 'STARED', 'STATUS', 'STEADY', 'STOLEN', 'STREAM', 'STREET', 'STRESS', 'STRIDE', 'STRIKE', 'STRING', 'STROKE', 'STRONG', 'STRUCK', 'STUDIO', 'SUBMIT', 'SUDDEN', 'SUFFER', 'SUMMER', 'SUMMIT', 'SUPPLY', 'SURELY', 'SURVEY', 'SWITCH', 'SYMBOL', 'SYSTEM',
    'TALENT', 'TARGET', 'TEMPLE', 'TENDER', 'TERROR', 'THANKS', 'THEORY', 'THIRTY', 'THORNY', 'THREAD', 'THREAT', 'THRILL', 'THRONE', 'TIMBER', 'TISSUE', 'TONGUE', 'TOWARD', 'TRAVEL', 'TREATY', 'TRENCH', 'TRIBAL', 'TROPHY', 'TUNNEL', 'TWELVE', 'TURTLE',
    'UNABLE', 'UNIQUE', 'UNITED', 'UNLESS', 'UNLIKE', 'UNREST', 'UPDATE', 'USEFUL',
    'VALLEY', 'VANISH', 'VARIED', 'VENDOR', 'VERBAL', 'VESSEL', 'VICTIM', 'VISION', 'VISUAL', 'VOLUME',
    'WANDER', 'WANTED', 'WARMTH', 'WEALTH', 'WEAPON', 'WEEKLY', 'WEIGHT', 'WICKED', 'WIDELY', 'WINDOW', 'WINNER', 'WINTER', 'WISDOM', 'WITHIN', 'WONDER', 'WORKER', 'WORTHY', 'WRITER',
    // INSERT test pairs
    'TIRED', // TIED -> T[R]IED -> TIRED
    'TILED', // TIED -> TI[L]ED -> TILED
    'STING', // SING -> S[T]ING -> STING
    'COULD', // COLD -> CO[U]LD -> COULD
    'WHEAT', // WHET -> WHE[A]T -> WHEAT
    'BRING', // BING -> B[R]ING -> BRING
    'REIGN', // REIN -> REI[G]N -> REIGN
    'BOARD', // BARD -> B[O]ARD -> BOARD
    'PLAIN', // PLAN -> PLA[I]N -> PLAIN
    'STARE', 'SPARE', 'SHARE', 'STORE', 'SCORE', 'SNORE', 'SWORE',
    'BACKSTAGE',
  ];

  // Load all at once (join into newline-separated text)
  validator.loadWords(words.join('\n'));
}
