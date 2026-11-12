import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { DateTimeField } from "@/components/DateTimeField";
import { eventStore } from "@/lib/eventStore";
import { googleCalendarUrl } from "@/lib/calendar";
import {
  ApiError,
  createCalendarEvent,
  deviceTimeZone,
  getAuthStatus,
  signIn,
  signOut,
  type AuthStatus,
} from "@/lib/api";
import { fromForm, moveStart, setEnd, toForm, toggleAllDay, type EventForm } from "@/lib/event";

export default function ReviewScreen() {
  const result = eventStore.get();
  const [form, setForm] = useState<EventForm | null>(result ? toForm(result.event, deviceTimeZone()) : null);
  const [showOcr, setShowOcr] = useState(false);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const refreshAuth = () => getAuthStatus().then(setAuth).catch(() => setAuth(null));
  useEffect(() => {
    refreshAuth();
  }, []);

  if (!result || !form) {
    return (
      <View style={styles.container}>
        <Text>No event yet.</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const update = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setForm({ ...form, [key]: value });

  /** Fallback when Google sign-in isn't set up on the server: open a prefilled Google Calendar page. */
  async function openPrefilledLink() {
    try {
      await Linking.openURL(googleCalendarUrl(fromForm(form!)));
    } catch (err) {
      Alert.alert("Couldn't open Google Calendar", err instanceof Error ? err.message : String(err));
    }
  }

  async function addToCalendar() {
    if (!auth?.configured) return openPrefilledLink();

    setSaving(true);
    try {
      if (!auth.signedIn) {
        const ok = await signIn();
        await refreshAuth();
        if (!ok) return;
      }
      const created = await createCalendarEvent(fromForm(form!));
      Alert.alert("Added to your calendar", form!.summary, [
        { text: "View in Calendar", onPress: () => Linking.openURL(created.htmlLink) },
        { text: "Scan another", onPress: () => router.back() },
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Sign-in expired or was revoked: show the sign-in button again
        await refreshAuth();
        Alert.alert("Please sign in again", err.message);
      } else {
        Alert.alert("Couldn't add the event", err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut().catch(() => {});
    refreshAuth();
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Field label="Title" value={form.summary} onChange={(v) => update("summary", v)} />

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>All day</Text>
          <Switch value={form.allDay} onValueChange={(v) => setForm(toggleAllDay(form, v))} />
        </View>
        <DateTimeField label="Starts" value={form.start} dateOnly={form.allDay} onChange={(d) => setForm(moveStart(form, d))} />
        <DateTimeField label="Ends" value={form.end} dateOnly={form.allDay} onChange={(d) => setForm(setEnd(form, d))} />
      </View>

      <Field label="Location" value={form.location} onChange={(v) => update("location", v)} />
      <Field label="Details" value={form.description} onChange={(v) => update("description", v)} multiline />

      <Button
        title={saving ? "Saving…" : auth?.configured && !auth.signedIn ? "Sign in & add to Google Calendar" : "Add to Google Calendar"}
        onPress={addToCalendar}
        disabled={saving}
      />
      {auth?.signedIn && (
        <Text style={styles.account}>
          Saving to {auth.email ?? "your Google account"} ·{" "}
          <Text style={styles.link} onPress={handleSignOut}>Sign out</Text>
        </Text>
      )}
      <Button title="Retake" variant="secondary" onPress={() => router.back()} />

      <Pressable onPress={() => setShowOcr(!showOcr)}>
        <Text style={styles.ocrToggle}>
          {showOcr ? "Hide" : "Show"} OCR text ({Math.round(result.ocrConfidence)}% confidence)
        </Text>
      </Pressable>
      {showOcr && <Text style={styles.ocrText}>{result.rawText}</Text>}
    </ScrollView>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: "top" }]}
        value={props.value}
        onChangeText={props.onChange}
        multiline={props.multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, backgroundColor: "#fff", flexGrow: 1 },
  card: { gap: 14, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#dadce0" },
  label: { fontSize: 14, fontWeight: "600", color: "#3c4043" },
  input: { borderWidth: 1, borderColor: "#dadce0", borderRadius: 10, padding: 12, fontSize: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  account: { textAlign: "center", color: "#5f6368", fontSize: 13 },
  link: { color: "#1a73e8" },
  ocrToggle: { color: "#1a73e8", textAlign: "center", marginTop: 8 },
  ocrText: { fontFamily: "Courier", fontSize: 12, color: "#3c4043", backgroundColor: "#f1f3f4", padding: 12, borderRadius: 8 },
});
