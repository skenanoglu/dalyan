export const money = (n: number): string => `₺ ${Math.round(n).toLocaleString('tr-TR')}`;

export const signedMoney = (n: number): string => (n < 0 ? `−${money(-n)}` : `+${money(n)}`);
