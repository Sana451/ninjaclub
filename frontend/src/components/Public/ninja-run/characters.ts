// Внешность персонажа: boy — мужская модель (без хвоста), pal — переопределение цветов базовой палитры
export type Look = {
  boy: boolean
  pal: Partial<Record<string, string>>
  cap?: string
  horns?: boolean
}

export type Character = {
  id: string
  name: string
  look: Look
}

export const CHARACTERS: Character[] = [
  {
    id: "taisia",
    name: "Таисия",
    look: { boy: false, pal: {} },
  },
  {
    id: "sanya",
    name: "СуперСаня",
    look: {
      boy: true,
      pal: {
        tee: "#161616",
        teeHi: "#34343a",
        legs: "#1f2430",
        legsHi: "#3a4356",
        hair: "#8a6a4a",
        hair2: "#5b4330",
      },
    },
  },
  {
    id: "semen",
    name: "Семён OCR",
    look: {
      boy: true,
      pal: {
        tee: "#ff6a1a",
        teeHi: "#ff9a52",
        legs: "#1b1e26",
        legsHi: "#3a3f4d",
        hair: "#2b1d12",
        hair2: "#1a110a",
      },
    },
  },
  {
    id: "sensei",
    name: "Sensei",
    look: {
      boy: true,
      cap: "#ffffff",
      pal: {
        tee: "#1f8f8c",
        teeHi: "#35b5b0",
        legs: "#2a2e3a",
        legsHi: "#454c60",
        hair: "#2b1d12",
        hair2: "#1a110a",
      },
    },
  },
  {
    id: "sila",
    name: "SilaNinja",
    look: {
      boy: false,
      horns: true,
      pal: {
        tee: "#ff6a1a",
        teeHi: "#ff9a52",
        hair: "#6b4a2e",
        hair2: "#4a2f1c",
      },
    },
  },
  {
    id: "arnold",
    name: "Арнольд",
    look: {
      boy: true,
      pal: {
        tee: "#3a3f48",
        teeHi: "#5a6170",
        legs: "#1a1a1a",
        legsHi: "#333333",
        hair: "#1a1a1a",
        hair2: "#0a0a0a",
      },
    },
  },
  {
    id: "marko",
    name: "Водопроводчик Марко",
    look: {
      boy: true,
      cap: "#d12020",
      pal: {
        tee: "#2a5bd6",
        teeHi: "#4f7fe8",
        legs: "#2a2a6a",
        legsHi: "#44449a",
        hair: "#5a3a1e",
        hair2: "#3a2412",
      },
    },
  },
  {
    id: "yoda",
    name: "Ёдя Старый",
    look: {
      boy: true,
      pal: {
        tee: "#6b4a2e",
        teeHi: "#8a6440",
        legs: "#3a2a1a",
        legsHi: "#55402a",
        hair: "#e8e8e8",
        hair2: "#b8b8b8",
      },
    },
  },
  {
    id: "zelenych",
    name: "Зелёныч",
    look: {
      boy: true,
      pal: {
        skin: "#8fd16a",
        skin2: "#5fa34a",
        tee: "#6b4a2e",
        teeHi: "#8a6440",
        legs: "#3a2a1a",
        legsHi: "#55402a",
        hair: "#3a2a18",
        hair2: "#2a1c10",
      },
    },
  },
  {
    id: "mr-zero",
    name: "Мистер Ноль",
    look: {
      boy: true,
      pal: {
        tee: "#2a2a2a",
        teeHi: "#444444",
        legs: "#1f1f1f",
        legsHi: "#333333",
        hair: "#c9a266",
        hair2: "#a07a44",
      },
    },
  },
  {
    id: "jack",
    name: "Капитан Джек",
    look: {
      boy: true,
      cap: "#1a1a1a",
      pal: {
        tee: "#f5f5f5",
        teeHi: "#ffffff",
        legs: "#2a2030",
        legsHi: "#443a4e",
        hair: "#2b1d12",
        hair2: "#1a110a",
      },
    },
  },
  {
    id: "harlin",
    name: "Харлин",
    look: {
      boy: false,
      pal: {
        tee: "#202020",
        teeHi: "#383838",
        hair: "#ff6fb5",
        hair2: "#c24a8a",
      },
    },
  },
  {
    id: "neo",
    name: "Нео Матрикс",
    look: {
      boy: true,
      pal: {
        tee: "#0b0b0b",
        teeHi: "#1f1f1f",
        legs: "#0b0b0b",
        legsHi: "#1a1a1a",
        hair: "#1a1a1a",
        hair2: "#0a0a0a",
      },
    },
  },
  {
    id: "pika",
    name: "Пика-Чу",
    look: {
      boy: false,
      horns: true,
      pal: {
        tee: "#ffd23f",
        teeHi: "#ffe680",
        hair: "#f5d142",
        hair2: "#d6a92a",
      },
    },
  },
]

export const DEFAULT_CHARACTER = "taisia"

export function lookOf(id: string | undefined): Look {
  return (
    CHARACTERS.find((c) => c.id === id)?.look ??
    (CHARACTERS[0] as Character).look
  )
}

export function characterName(id: string | undefined): string {
  return (
    CHARACTERS.find((c) => c.id === id)?.name ??
    (CHARACTERS[0] as Character).name
  )
}
