import React, { useState, useEffect } from "react";
import { 
  View, Text, TextInput, TouchableOpacity, Alert, 
  StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";

export default function UserInfoScreen() {
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    // Fetch phone number from AsyncStorage after OTP verification
    const fetchPhoneNumber = async () => {
      const storedPhoneNumber = await AsyncStorage.getItem('userPhoneNumber');
      if (storedPhoneNumber) {
        setPhoneNumber(storedPhoneNumber);
      }
    };
    fetchPhoneNumber();
  }, []);

  // Format date for display (YYYY-MM-DD)
  const formatDate = (date: Date): string => date.toISOString().split("T")[0];

  // Handle form submission
  const saveUserData = async () => {
    if (!name.trim()) {
      return Alert.alert("⚠️ Validation Error", "Name cannot be empty!");
    }

    setLoading(true);
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      await axios.post("http://192.168.1.5:5000/update-user", {
        phone: phoneNumber,
        name,
        birthdate: formatDate(birthdate),
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      Alert.alert("✅ Success", "Your information has been successfully saved!");
    } catch (error) {
      Alert.alert("❌ Error", "Failed to save data. Please try again.");
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Personal Information</Text>
        <Text style={styles.description}>Please enter your full name and birthdate.</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#777" 
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity style={styles.datePicker} onPress={() => setShowPicker(true)}>
            <Text style={styles.dateText}>{`🎂 ${formatDate(birthdate)}`}</Text>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={birthdate}
              mode="date"
              textColor = "black"
              display={Platform.OS === "ios" ? "spinner" : "calendar"}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setBirthdate(selectedDate);
                }
                setShowPicker(Platform.OS === "ios");
              }}
            />
          )}
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={saveUserData} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Details</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafe",
  },
  scrollContainer: {
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 15,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    color: "#444",
    marginBottom: 5,
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: 15,
    fontSize: 16,
    borderRadius: 10,
    color: "#333",
  },
  datePicker: {
    width: "100%",
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#EAF3FF",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007AFF",
  },
  button: {
    width: "100%",
    backgroundColor: "#007AFF",
    padding: 15,
    alignItems: "center",
    borderRadius: 10,
    marginTop: 15,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
});


