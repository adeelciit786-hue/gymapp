export const QUOTES = [
  ["The only bad workout is the one that didn't happen.", 'FORGE Coaching'],
  ['Discipline is choosing between what you want now and what you want most.', 'FORGE Coaching'],
  ['Strong is built one rep at a time.', 'FORGE Coaching'],
  ['Small wins stack into big changes.', 'FORGE Coaching'],
  ['Show up. Do the work. Repeat.', 'FORGE Coaching'],
  ['Your future self is watching. Make them proud.', 'FORGE Coaching'],
  ['Progress, not perfection.', 'FORGE Coaching'],
]

export const FOODS = [
  { id: 'oats', name: 'Oatmeal with banana', cal: 320, p: 10, c: 58, f: 6 },
  { id: 'eggs', name: 'Scrambled eggs (3)', cal: 270, p: 19, c: 2, f: 20 },
  { id: 'yogurt', name: 'Greek yogurt & berries', cal: 190, p: 17, c: 20, f: 4 },
  { id: 'toast', name: 'Avocado toast', cal: 290, p: 8, c: 30, f: 16 },
  { id: 'chicken', name: 'Grilled chicken breast (150g)', cal: 250, p: 46, c: 0, f: 5 },
  { id: 'rice', name: 'Basmati rice (1 cup)', cal: 205, p: 4, c: 45, f: 0 },
  { id: 'salmon', name: 'Baked salmon (150g)', cal: 310, p: 34, c: 0, f: 19 },
  { id: 'salad', name: 'Chicken Caesar salad', cal: 380, p: 32, c: 14, f: 22 },
  { id: 'beef', name: 'Lean beef bowl', cal: 520, p: 40, c: 48, f: 18 },
  { id: 'pasta', name: 'Whole-wheat pasta (1.5 cups)', cal: 350, p: 14, c: 68, f: 3 },
  { id: 'shake', name: 'Whey protein shake', cal: 160, p: 25, c: 6, f: 3 },
  { id: 'almonds', name: 'Almonds (30g)', cal: 175, p: 6, c: 6, f: 15 },
  { id: 'apple', name: 'Apple', cal: 95, p: 0, c: 25, f: 0 },
  { id: 'hummus', name: 'Hummus & veggies', cal: 210, p: 8, c: 22, f: 11 },
  { id: 'bar', name: 'Protein bar', cal: 220, p: 20, c: 22, f: 7 },
  { id: 'lentil', name: 'Lentil soup', cal: 240, p: 15, c: 38, f: 3 },
]

const U = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=65`
export const IMG = {
  hero: U('1534438327276-14e5300c3a48', 1920),
  about: U('1581009146145-b5ef050c2e1e', 1000),
  facilities: [
    ['Strength Floor', U('1571019613454-1cb2f99b2d8b')],
    ['Studio Spaces', U('1518611012118-696072aa579a')],
    ['Boxing Zone', U('1549719386-74dfcbf7dbed')],
    ['Recovery Lounge', U('1544367567-0f2fcb009e0b')],
  ],
  programs: [
    ['Strength Lab', 'Progressive barbell and dumbbell programming.', U('1517836357463-d25dfeac3438')],
    ['HIIT Engine', 'High-intensity intervals that torch calories.', U('1599058917212-d750089bc07e')],
    ['Functional Flow', 'Move better, lift better, live better.', U('1540497077202-7c8a3999166f')],
  ],
}
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
