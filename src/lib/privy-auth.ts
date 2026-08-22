import 'server-only';

import { verifyAccessToken } from '@privy-io/node';

export async function isPrivyAccessTokenValid(token: string | undefined): Promise<boolean> {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  const verificationKey = process.env.PRIVY_VERIFICATION_KEY?.trim();

  if (!token || !appId || !verificationKey) {
    return false;
  }

  try {
    await verifyAccessToken({
      access_token: token,
      app_id: appId,
      verification_key: verificationKey
    });
    return true;
  } catch {
    return false;
  }
}
