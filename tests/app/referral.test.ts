import { describe, expect, it } from 'vitest';
import { defaultProfile } from '../../src/app/save';
import { REFERRAL_SHARE_BONUS, REFERRAL_WELCOME_BONUS, claimReferralFromUrl, claimShareBonus } from '../../src/app/referral';

describe('arkadaş daveti', () => {
  it('taze profil başkasının koduyla açılırsa hoş geldin bonusu alır', () => {
    const p = defaultProfile();
    const friendCode = 'ABCDEF';
    const next = claimReferralFromUrl(p, friendCode);
    expect(next).not.toBeNull();
    expect(next!.money).toBe(p.money + REFERRAL_WELCOME_BONUS);
    expect(next!.referral.referredBy).toBe(friendCode);
  });

  it('zaten sefer yapmış bir profile uygulanmaz', () => {
    const p = defaultProfile();
    p.stats.trips = 1;
    expect(claimReferralFromUrl(p, 'ABCDEF')).toBeNull();
  });

  it('kendi koduna tıklanırsa bonus verilmez', () => {
    const p = defaultProfile();
    expect(claimReferralFromUrl(p, p.referral.code)).toBeNull();
  });

  it('zaten davet edilmiş bir profile tekrar uygulanmaz', () => {
    const p = defaultProfile();
    const once = claimReferralFromUrl(p, 'ABCDEF')!;
    expect(claimReferralFromUrl(once, 'ZYXWVU')).toBeNull();
  });

  it('geçersiz kod kabul edilmez', () => {
    const p = defaultProfile();
    expect(claimReferralFromUrl(p, '')).toBeNull();
    expect(claimReferralFromUrl(p, null)).toBeNull();
    expect(claimReferralFromUrl(p, '!!!###')).toBeNull();
  });

  it('paylaş bonusu bir kez verilir', () => {
    const p = defaultProfile();
    const once = claimShareBonus(p);
    expect(once).not.toBeNull();
    expect(once!.money).toBe(p.money + REFERRAL_SHARE_BONUS);
    expect(claimShareBonus(once!)).toBeNull();
  });
});
