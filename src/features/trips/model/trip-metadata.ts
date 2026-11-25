export function validTripBudget(value: string): boolean {
  return /^[1-9][0-9]{0,11}$/.test(value);
}

export function validTripTimezone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
