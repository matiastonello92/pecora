import { can } from '../permissions';

describe('can', () => {
  test('exact permission', () => {
    expect(can(['orders:view'], 'orders:view')).toBe(true);
  });

  test('wildcard permission', () => {
    expect(can(['*'], 'orders:view')).toBe(true);
  });

  test('module wildcard', () => {
    expect(can(['orders:*'], 'orders:view')).toBe(true);
  });
});
