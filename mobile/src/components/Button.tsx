import { Pressable, StyleSheet, Text } from "react-native";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export function Button({ title, onPress, variant = "primary", disabled }: Props) {
  const primary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.text, primary ? styles.primaryText : styles.secondaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, alignItems: "center" },
  primary: { backgroundColor: "#1a73e8" },
  secondary: { backgroundColor: "#e8f0fe" },
  text: { fontSize: 16, fontWeight: "600" },
  primaryText: { color: "#fff" },
  secondaryText: { color: "#1a73e8" },
});
