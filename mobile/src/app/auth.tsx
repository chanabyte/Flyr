import { useEffect } from "react";
import { router } from "expo-router";

/**
 * Landing spot for the deep link the server sends after Google sign-in
 * (exp://.../--/auth?status=ok). signIn() in lib/api.ts reads the result;
 * this screen only exists so Expo Router doesn't show "Unmatched route",
 * and immediately goes back to where the user was.
 */
export default function AuthRedirect() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, []);
  return null;
}
