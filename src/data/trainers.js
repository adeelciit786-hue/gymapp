const slots = (a) => a
export const TRAINERS = [
  { id: 't1', name: 'Marcus Reyes', spec: 'Strength', exp: 11, certs: ['NSCA-CSCS', 'Precision Nutrition L1'], bio: 'Former competitive powerlifter turned coach. Marcus builds sustainable strength for lifters of every level.', philosophy: 'Master the basics, then earn the heavy weight.', slots: slots(['Mon 07:00', 'Wed 18:30', 'Fri 12:00']), img: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=600&q=65' },
  { id: 't2', name: 'Layla Haddad', spec: 'Fat Loss', exp: 8, certs: ['ACE-CPT', 'HIIT Specialist'], bio: 'Layla blends metabolic conditioning with smart habits to deliver lasting body composition changes.', philosophy: 'Consistency beats intensity every single week.', slots: slots(['Tue 06:30', 'Thu 19:00', 'Sat 09:00']), img: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=600&q=65' },
  { id: 't3', name: 'Daniel Okafor', spec: 'Muscle Building', exp: 9, certs: ['ISSA-CPT', 'Sports Nutrition Coach'], bio: 'Hypertrophy-focused coach who has guided hundreds of members through their first 10 kg of muscle.', philosophy: 'Train hard, recover harder, track everything.', slots: slots(['Mon 19:30', 'Wed 07:00', 'Sun 10:00']), img: 'https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?auto=format&fit=crop&w=600&q=65' },
  { id: 't4', name: 'Sofia Marin', spec: 'Mobility & Yoga', exp: 12, certs: ['RYT-500', 'FRC Mobility Specialist'], bio: 'Sofia helps athletes and desk workers move pain-free with mobility, yoga and breathwork.', philosophy: 'Strength without mobility is borrowed time.', slots: slots(['Tue 12:30', 'Thu 07:30', 'Sat 11:00']), img: 'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=600&q=65' },
  { id: 't5', name: 'Karim Nasser', spec: 'Boxing & Conditioning', exp: 7, certs: ['Boxing Coach L2', 'CrossFit L1'], bio: 'A former amateur boxer, Karim brings fight-camp conditioning to members of all fitness levels.', philosophy: 'Be sharp, be fit, be fearless.', slots: slots(['Mon 18:00', 'Wed 20:00', 'Fri 17:30']), img: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=65' },
  { id: 't6', name: 'Priya Menon', spec: 'Functional Training', exp: 6, certs: ['NASM-CPT', 'Kettlebell Instructor'], bio: 'Priya designs playful, practical sessions that improve everyday movement and endurance.', philosophy: 'Fitness should make life easier, not harder.', slots: slots(['Tue 17:00', 'Thu 12:00', 'Sat 08:30']), img: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=600&q=65' },
]
export const SPECS = ['All', ...new Set(TRAINERS.map((t) => t.spec))]

export const CLASS_TYPES = [
  { type: 'HIIT', instr: 'Layla Haddad', dur: 45, diff: 'Hard', cap: 20 },
  { type: 'Strength & Conditioning', instr: 'Marcus Reyes', dur: 60, diff: 'Hard', cap: 16 },
  { type: 'Boxing', instr: 'Karim Nasser', dur: 50, diff: 'Medium', cap: 18 },
  { type: 'Yoga', instr: 'Sofia Marin', dur: 60, diff: 'Easy', cap: 22 },
  { type: 'Spin', instr: 'Priya Menon', dur: 45, diff: 'Medium', cap: 24 },
  { type: 'Functional Training', instr: 'Priya Menon', dur: 50, diff: 'Medium', cap: 18 },
  { type: 'Mobility & Recovery', instr: 'Sofia Marin', dur: 40, diff: 'Easy', cap: 20 },
]
export const TIMES = ['06:30', '12:00', '18:00', '19:30']
export const PLANS = [
  { id: 'starter', name: 'Starter', price: 199, tag: 'Get moving', feats: ['Gym access', 'Standard equipment', 'Basic workout tracking'] },
  { id: 'performance', name: 'Performance', price: 349, tag: 'Most Popular', feats: ['Full gym access', 'Group fitness classes', 'Advanced progress tracking', 'Workout planning'], pop: true },
  { id: 'elite', name: 'Elite', price: 599, tag: 'Everything, unlocked', feats: ['Premium facilities', 'All group classes', 'Personal training consultation', 'Advanced analytics', 'Priority booking'] },
]
