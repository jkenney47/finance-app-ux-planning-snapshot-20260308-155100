import { Text, View } from "react-native";

export default function App() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111",
      }}
    >
      <Text style={{ color: "white", fontSize: 18 }}>Baseline app render</Text>
    </View>
  );
}
