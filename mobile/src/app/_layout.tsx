import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ title: "Flyr" }} />
        <Stack.Screen name="review" options={{ title: "Review event" }} />
      </Stack>
    </>
  );
}
