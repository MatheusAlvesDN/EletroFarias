import { Preferences } from '@capacitor/preferences';

const K_ACCESS = 'accessToken';
const K_REFRESH = 'refreshToken';

export async function saveSession(accessToken: string, refreshToken?: string) {
  await Preferences.set({ key: K_ACCESS, value: accessToken });
  if (refreshToken) await Preferences.set({ key: K_REFRESH, value: refreshToken });
}

export async function loadSession() {
  const { value: accessToken } = await Preferences.get({ key: K_ACCESS });
  const { value: refreshToken } = await Preferences.get({ key: K_REFRESH });
  return { accessToken, refreshToken };
}

export async function clearSession() {
  await Preferences.remove({ key: K_ACCESS });
  await Preferences.remove({ key: K_REFRESH });
}
