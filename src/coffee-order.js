export const DRINK_PRICE = 50;
export const drinks = [
  ['espresso', 'Эспрессо', 'Крепкий и насыщенный', '#48291b'],
  ['ristretto', 'Ристретто', 'Короткий, особенно крепкий', '#382219'],
  ['americano', 'Американо', 'Чёрный кофе без молока', '#533020'],
  ['lungo', 'Лунго', 'Долгий пролив, мягкий вкус', '#65422b'],
  ['cappuccino', 'Капучино', 'Кофе с молочной пеной', '#d3b78c'],
  ['flatWhite', 'Флэт уайт', 'Двойной кофе с молоком', '#bd9769'],
  ['latte', 'Латте', 'Много молока, нежный вкус', '#d8c39e'],
  ['macchiato', 'Макиато', 'Эспрессо с молочной пеной', '#a87c50'],
  ['chocolate', 'Шоколад', 'Густой горячий шоколад', '#6c3c28'],
  ['mocha', 'Мокка', 'Кофе, молоко и шоколад', '#96704e'],
  ['tea', 'Чай', 'Горячий чёрный чай', '#946029'],
  ['cocoa', 'Какао', 'Какао с тёплым молоком', '#ad835c'],
].map(([id, name, description, color]) => ({id, name, description, color, price: DRINK_PRICE}));

export const durations = {paying: 1.4, brewing: 4.6, taking: .65, drinking: 3.8};
const nextPhase = {paying: 'brewing', brewing: 'ready', taking: 'holding', drinking: 'idle'};
const phases = new Set(['idle', 'paying', 'brewing', 'ready', 'taking', 'holding', 'drinking']);
const clamp = value => Math.max(0, Math.min(1, value));

// Transactions and saved orders are independent of the render frame rate.
export class CoffeeOrder {
  constructor(saved) { this.restore(saved); }
  restore(saved) {
    const drink = drinks.find(drink => drink.id === saved?.drinkId);
    const valid = saved && (saved.balance === 50 || saved.balance === 0) && phases.has(saved.phase)
      && Number.isFinite(saved.elapsed) && saved.elapsed >= 0
      && (saved.phase === 'idle' || (drink && saved.balance === 0))
      && (!durations[saved.phase] || saved.elapsed < durations[saved.phase]);
    this.balance = valid ? saved.balance : 50;
    this.phase = valid ? saved.phase : 'idle';
    this.drinkId = valid && drink ? drink.id : null;
    this.elapsed = valid ? saved.elapsed : 0;
  }
  get drink() { return drinks.find(drink => drink.id === this.drinkId); }
  get progress() { return durations[this.phase] ? clamp(this.elapsed / durations[this.phase]) : 0; }
  get fill() {
    if (this.phase === 'brewing') return clamp((this.elapsed - .65) / 3.25);
    if (this.phase === 'drinking') return 1 - clamp((this.elapsed - .85) / 1.85);
    return ['ready', 'taking', 'holding'].includes(this.phase) ? 1 : 0;
  }
  pay(id) {
    const drink = drinks.find(drink => drink.id === id);
    if (this.phase !== 'idle' || !drink || this.balance < drink.price) return false;
    this.balance -= drink.price;
    this.drinkId = id;
    this.phase = 'paying';
    this.elapsed = 0;
    return true;
  }
  take() {
    if (this.phase !== 'ready') return false;
    this.phase = 'taking'; this.elapsed = 0; return true;
  }
  drinkNow() {
    if (this.phase !== 'holding') return false;
    this.phase = 'drinking'; this.elapsed = 0; return true;
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    while (durations[this.phase] && dt > 0) {
      const remaining = durations[this.phase] - this.elapsed;
      if (dt < remaining) { this.elapsed += dt; break; }
      dt -= remaining; this.phase = nextPhase[this.phase]; this.elapsed = 0;
    }
  }
  snapshot() { return {balance: this.balance, phase: this.phase, drinkId: this.drinkId, elapsed: this.elapsed}; }
}
