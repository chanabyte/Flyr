import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { eventStore } from "@/lib/eventStore";
import { googleCalendarUrl } from "@/lib/calendar";
import { deviceTimeZone } from "@/lib/api";
import { fromForm, toForm, type EventForm } from "@/lib/event";

export default function ReviewScreen() {
  const result = eventStore.get();
  const [form, setForm] = useState<EventForm | null>(result ? toForm(result.event, deviceTimeZone()) : null);
  const [showOcr, setShowOcr] = useState(false);

  if (!result || !form) {
    return (
      <View style={styles.container}>
        <Text>No event yet.</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const update = <K extends keyof EventForm>(key: K, value: EventForm[K]) => setForm({ ...form, [key]: value });

  function toggleAllDay(allDay: boolean) {
    // Switch between "2026-11-14" and "2026-11-14T09:00:00" style values
    const conv = (v: string) => (allDay ? v.slice(0, 10) : `${v.slice(0, 10)}T09:00:00`);
    setForm({ ...form!, allDay, start: conv(form!.start), end: conv(form!.end) });
  }

  async function addToCalendar() {
    try {
      // fromForm gives a Google Calendar API event body; for now we open it as a link
      await Linking.openURL(googleCalendarUrl(fromForm(form!)));
    } catch (err) {
      Alert.alert("Couldn't open Google Calendar", err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Field label="Title" value={form.summary} onChange={(v) => update("summary", v)} />
      <View style={styles.row}>
        <Text style={styles.label}>All day</Text>
        <Switch value={form.allDay} onValueChange={toggleAllDay} />
      </View>
      <Field label="Start" value={form.start} onChange={(v) => update("start", v)} hint={pretty(form.start, form.allDay)} />
      <Field label="End" value={form.end} onChange={(v) => update("end", v)} hint={pretty(form.end, form.allDay)} />
      <Field label="Location" value={form.location} onChange={(v) => update("location", v)} />
      <Field label="Details" value={form.description} onChange={(v) => update("description", v)} multiline />

      <Button title="Add to Google Calendar" onPress={addToCalendar} />
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

function pretty(value: string, allDay: boolean): string {
  // Date-only strings parse as UTC, so add a local midnight time for display
  const d = new Date(allDay ? `${value.slice(0, 10)}T00:00:00` : value);
  if (isNaN(d.getTime())) return "⚠️ Not a valid date";
  return allDay ? d.toDateString() : d.toLocaleString();
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; hint?: string; multiline?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: "top" }]}
        value={props.value}
        onChangeText={props.onChange}
        multiline={props.multiline}
      />
      {props.hint && <Text style={styles.hint}>{props.hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16, backgroundColor: "#fff", flexGrow: 1 },
  label: { fontSize: 14, fontWeight: "600", color: "#3c4043" },
  input: { borderWidth: 1, borderColor: "#dadce0", borderRadius: 10, padding: 12, fontSize: 16 },
  hint: { fontSize: 13, color: "#5f6368" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ocrToggle: { color: "#1a73e8", textAlign: "center", marginTop: 8 },
  ocrText: { fontFamily: "Courier", fontSize: 12, color: "#3c4043", backgroundColor: "#f1f3f4", padding: 12, borderRadius: 8 },
});
