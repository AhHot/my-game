// ==========================================
// 底层地基：游戏核心配置（永不需要动这里）
// ==========================================
const CONFIG = {
  WIDTH: 720, HEIGHT: 1280, MAX_ROUNDS: 50, ACTION_DELAY: 900,
  GRID_SIZE: 4, CELL_SIZE: 110, ADVANTAGE_MULT: 1.5, DISADVANTAGE_MULT: 0.7, START_MP_RATIO: 0.3,
};

const ELEMENTS = {
  fire:  { name: '火', color: 0xE74C3C, beats: 'wind',  weak: 'water' },
  water: { name: '水', color: 0x3498DB, beats: 'fire',  weak: 'wind'  },
  wind:  { name: '风', color: 0x2ECC71, beats: 'water', weak: 'fire'  },
  light: { name: '光', color: 0xF1C40F, beats: 'dark',  weak: 'dark'  },
  dark:  { name: '暗', color: 0x9B59B6, beats: 'light', weak: 'light' },
};

// 这三个是默认兜底数据，游戏会自动优先读取你在编辑器里改的本地数据
const SKILLS = {};
const STATUSES = {};
const CHARACTERS = [];
