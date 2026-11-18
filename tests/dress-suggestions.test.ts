import { describe, expect, it } from 'vitest';
import {
  dressRegion,
  dressSuggestionText,
  dressSuggestions,
  dressWeather,
  plainText,
} from '../src/features/dress-code/dress-suggestions';

const ids = (weather: Parameters<typeof dressSuggestions>[0], texts: string[]) =>
  dressSuggestions(weather, texts).map((item) => item.id);

describe('Dress code suggestions', () => {
  it('matches Vietnamese text without diacritics and only on whole words', () => {
    expect(plainText('  Hội An — Đà Nẵng! ')).toBe(' hoi an da nang ');
    expect(ids('HOT', ['Tắm biển Mỹ Khê'])).toContain('place-beach');
    expect(ids('HOT', ['Dạo phố buổi chiều'])).not.toContain('place-beach');
    expect(ids('HOT', ['Nộp thuế'])).not.toContain('place-hue');
    expect(ids('HOT', ['Đến sân bay'])).toEqual(['weather-hot']);
  });
  it('finds the region from place names first, then from latitude', () => {
    expect(dressRegion(['Wolfari Demo — Đà Nẵng'])).toBe('CENTRAL');
    expect(dressRegion(['Săn mây Sa Pa'], 22.3)).toBe('HIGHLAND');
    expect(dressRegion(['Chuyến đi mùa hè'], 21.03)).toBe('NORTH');
    expect(dressRegion(['Chuyến đi mùa hè'], 10.2)).toBe('SOUTH');
    expect(dressRegion(['Chuyến đi mùa hè'])).toBeNull();
    expect(dressRegion(['Chuyến đi mùa hè'], Number.NaN)).toBeNull();
  });
  it.each([
    ['CENTRAL', 11, 'RAINY'],
    ['CENTRAL', 6, 'HOT'],
    ['CENTRAL', 1, 'COOL'],
    ['NORTH', 1, 'COLD'],
    ['NORTH', 10, 'COOL'],
    ['NORTH', 7, 'HOT'],
    ['SOUTH', 8, 'RAINY'],
    ['SOUTH', 2, 'HOT'],
    ['HIGHLAND', 12, 'COLD'],
    ['HIGHLAND', 6, 'COOL'],
    [null, 11, 'HOT'],
  ] as const)('typical weather for %s in month %s is %s', (region, month, weather) =>
    expect(dressWeather(region, month)).toBe(weather),
  );
  it('puts the weather preset first, then the places that match', () => {
    expect(
      ids('RAINY', ['Đà Nẵng', 'Chùa Linh Ứng', 'Phố cổ Hội An', 'Ăn tối trên rooftop']),
    ).toEqual(['weather-rainy', 'place-beach', 'place-sacred', 'place-old-town', 'place-dinner']);
    expect(ids('COLD', [])).toEqual(['weather-cold']);
  });
  it('writes the palette into the description because dress codes have no colour field', () => {
    const [rainy] = dressSuggestions('RAINY', []);
    expect(dressSuggestionText(rainy!)).toMatch(
      /^Tông màu: xanh navy, xám, xanh rêu\. Đồ nhanh khô/,
    );
    for (const weather of ['HOT', 'RAINY', 'COOL', 'COLD'] as const)
      for (const item of dressSuggestions(weather, [
        'biển chùa phố cổ huế núi đà lạt tiệc thuyền cafe',
      ])) {
        expect(item.label.length).toBeLessThanOrEqual(100);
        expect(item.colors).toHaveLength(3);
        expect(dressSuggestionText(item).length).toBeLessThan(400);
      }
  });
});
