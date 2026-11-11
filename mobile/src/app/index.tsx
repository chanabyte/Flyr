import { useState } from "react";
import { ActivityIndicator, Alert, Image, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Button } from "@/components/Button";
import { extractEvent } from "@/lib/api";
import { eventStore } from "@/lib/eventStore";

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  base64: true,
  quality: 0.5, // smaller upload, still plenty for reading text
};

export default function CaptureScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handle(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) return Alert.alert("Could not read that image");

    setImageUri(asset.uri);
    setLoading(true);
    try {
      const event = await extractEvent(asset.base64, asset.mimeType ?? "image/jpeg");
      eventStore.set(event);
      router.push("/review");
    } catch (err) {
      Alert.alert("Couldn't find an event", err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert("Camera permission is needed to photograph flyers");
    handle(await ImagePicker.launchCameraAsync(pickerOptions));
  }

  async function chooseFromLibrary() {
    handle(await ImagePicker.launchImageLibraryAsync(pickerOptions));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Snap a flyer, get a calendar event.</Text>

      <View style={styles.preview}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.placeholder}>No photo yet</Text>
        )}
        {loading && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.overlayText}>Reading flyer…</Text>
          </View>
        )}
      </View>

      <View style={styles.buttons}>
        <Button title="Take photo" onPress={takePhoto} disabled={loading} />
        <Button title="Choose from library" variant="secondary" onPress={chooseFromLibrary} disabled={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 20, backgroundColor: "#fff" },
  heading: { fontSize: 20, fontWeight: "600", textAlign: "center", marginTop: 8 },
  preview: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#f1f3f4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  placeholder: { color: "#80868b" },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  overlayText: { color: "#fff", fontSize: 16 },
  buttons: { gap: 12, paddingBottom: 12 },
});
