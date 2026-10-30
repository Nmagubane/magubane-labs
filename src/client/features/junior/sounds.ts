/** Tiny sounds made in code (no audio files): a bright rising pair for right, a soft low note for not yet. */
let ctx: AudioContext | null = null;
function tone(freq: number, start: number, dur: number, gain = 0.08) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  o.connect(g).connect(ctx.destination);
  o.start(ctx.currentTime + start);
  o.stop(ctx.currentTime + start + dur + 0.05);
}
export function playSound(kind: 'right' | 'notyet' | 'tap' | 'ican', on: boolean): void {
  if (!on) return;
  try {
    ctx ??= new AudioContext();
    if (kind === 'right') {
      tone(660, 0, 0.18);
      tone(880, 0.12, 0.25);
    } else if (kind === 'ican') {
      // a small rising chord for something new the child can do
      tone(523, 0, 0.3, 0.06);
      tone(659, 0.14, 0.3, 0.06);
      tone(784, 0.28, 0.5, 0.07);
    } else if (kind === 'notyet') tone(300, 0, 0.3, 0.05);
    else tone(520, 0, 0.06, 0.03);
  } catch {
    // no audio: fine
  }
}
