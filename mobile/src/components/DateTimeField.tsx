import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

interface Props {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
  /** Hide the time picker (all-day events). */
  dateOnly?: boolean;
}

/**
 * A date + time picker that feels native on each platform:
 * - iOS: compact pickers inline (tap to open the system calendar / time wheel)
 * - Android: buttons that open the system date and time dialogs
 * (Android has no combined date+time mode, so date and time are picked separately.)
 */
export function DateTimeField({ label, value, onChange, dateOnly }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickers}>
        {Platform.OS === "ios" ? (
          <>
            <DateTimePicker value={value} mode="date" display="compact" onValueChange={(_e, d) => onChange(d)} />
            {!dateOnly && (
              <DateTimePicker
                value={value}
                mode="time"
                display="compact"
                minuteInterval={5}
                onValueChange={(_e, d) => onChange(d)}
              />
            )}
          </>
        ) : (
          <>
            <AndroidButton text={value.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              onPress={() => openAndroid("date", value, onChange)} />
            {!dateOnly && (
              <AndroidButton text={value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                onPress={() => openAndroid("time", value, onChange)} />
            )}
          </>
        )}
      </View>
    </View>
  );
}

function openAndroid(mode: "date" | "time", value: Date, onChange: (d: Date) => void) {
  DateTimePickerAndroid.open({
    value,
    mode,
    // Picking a date keeps the current time, and picking a time keeps the current date
    onValueChange: (_e, picked) => {
      const d = new Date(value);
      if (mode === "date") d.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
      else d.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
      onChange(d);
    },
  });
}

function AndroidButton({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}>
      <Text style={styles.chipText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: "#3c4043" },
  pickers: { flexDirection: "row", gap: 8, flexShrink: 1, justifyContent: "flex-end" },
  chip: { backgroundColor: "#f1f3f4", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  chipText: { fontSize: 15, color: "#202124" },
});
