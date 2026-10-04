import type { Profile } from './save';

/** Arkadaşının linkiyle ilk kez açan oyuncuya verilen hoş geldin bonusu. */
export const REFERRAL_WELCOME_BONUS = 300;
/** Linkini paylaşan oyuncuya bir kez verilen bonus. */
export const REFERRAL_SHARE_BONUS = 150;

export interface ReferralState {
  /** Bu cihazın kendi davet kodu; paylaşılan linkte kullanılır. */
  code: string;
  /** Paylaş düğmesine basınca bir kez verilen bonus alındı mı. */
  sharedBonusClaimed: boolean;
  /** Bu profil başka birinin daveti ile mi başladı (o kişinin kodu). */
  referredBy: string | null;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışan 0/O, 1/I atıldı
const CODE_LEN = 6;

export function randomReferralCode(): string {
  let s = '';
  for (let i = 0; i < CODE_LEN; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

export function defaultReferral(): ReferralState {
  return { code: randomReferralCode(), sharedBonusClaimed: false, referredBy: null };
}

export const isReferralCode = (v: unknown): v is string => typeof v === 'string' && new RegExp(`^[${CODE_ALPHABET}]{1,${CODE_LEN}}$`).test(v);

/**
 * Oyun `?ref=KOD` ile ilk kez açıldığında (henüz hiç sefer yapılmamışsa) hoş geldin bonusu verir.
 * Zaten oynanmış bir profile, kendi koduna ya da tekrar davet edilmeye uygulanmaz.
 */
export function claimReferralFromUrl(p: Profile, rawCode: string | null): Profile | null {
  if (!rawCode || p.stats.trips > 0 || p.referral.referredBy) return null;
  const code = rawCode.trim().toUpperCase().slice(0, CODE_LEN);
  if (!isReferralCode(code) || code === p.referral.code) return null;
  return { ...p, money: p.money + REFERRAL_WELCOME_BONUS, referral: { ...p.referral, referredBy: code } };
}

/** Paylaş düğmesi ilk kez kullanıldığında bonus verir; sonrasında null döner. */
export function claimShareBonus(p: Profile): Profile | null {
  if (p.referral.sharedBonusClaimed) return null;
  return { ...p, money: p.money + REFERRAL_SHARE_BONUS, referral: { ...p.referral, sharedBonusClaimed: true } };
}
