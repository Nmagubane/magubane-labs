/**
 * The grown-up who handed this family device to a child, so coming back only needs their password.
 * Kept in this browser only (never sent anywhere). Not used on classroom devices: children use those.
 */
const KEY = 'ml_grownup_email';

export function rememberGrownUp(email: string): void {
  try {
    localStorage.setItem(KEY, email);
  } catch {
    // private mode or storage blocked: the email just isn't pre-filled
  }
}

export function rememberedGrownUp(): string {
  try {
    return localStorage.getItem(KEY) ?? '';
  } catch {
    return '';
  }
}

export function forgetGrownUp(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing stored
  }
}
