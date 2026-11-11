import { useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { eventStore } from "@/lib/eventStore";
import { googleCalendarUrl } from "@/lib/calendar";
import type { FlyerEvent } from "@/lib/types";

export default function ReviewScreen() {
  const initial = eventStore.get();
  const [event, setEvent] = useState<FlyerEvent | null>(initial);

  if (!event) {
    return (
      <View style={styles.container}>
        <Text>No event yet.</Text>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    );
  }

  const update = <K extends keyof FlyerEvent>(key: K, value: FlyerEvent[K]) =>
    setEvent({ ...event, [key]: value });

  async function addToCalendar() {
    try {
      await Linking.openURL(googleCalendarUrl(event!));
    } catch (err) {
      Alert.alert("Couldn't open Google Calendar", err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Field label="Title" value={event.title} onChange={(v) => update("title", v)} />
      <Field label="Start" value={event.start} onChange={(v) => update("start", v)} hint={pretty(event.start, event.allDay)} />
      <Field label="End" value={event.end} onChange={(v) => update("end", v)} hint={pretty(event.end, event.allDay)} />
      <View style={styles.row}>
        <Text style={styles.label}>All day</Text>
        <Switch value={event.allDay} onValueChange={(v) => update("allDay", v)} />
      </View>
      <Field label="Location" value={event.location} onChange={(v) => update("location", v)} />
      <Field label="Details" value={event.description} onChange={(v) => update("description", v)} multiline />

      <Button title="Add to Google Calendar" onPress={addToCalendar} />
      <Button title="Retake" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

function pretty(iso: string, allDay: boolean): string {
  const d = new Date(iso);
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
});
