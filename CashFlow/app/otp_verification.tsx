import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import LottieView from "lottie-react-native";
import axios from "axios";
import CountryPicker, { Country, CountryCode } from "react-native-country-picker-modal";
import OTPTextInput from "react-native-otp-textinput";
import { useRouter } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PhoneVerification() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState<CountryCode>("US");
  const [callingCode, setCallingCode] = useState("1");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const router = useRouter();
  const otpInputRef = useRef<any>(null);

  const fadeIn = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const sanitizePhoneNumber = (number: string) => {
    return number.replace(/[^0-9]/g, '');
  };

  const sendOtp = async () => {
    const sanitizedNumber = sanitizePhoneNumber(phoneNumber);
    if (!sanitizedNumber || sanitizedNumber.length < 6) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const fullNumber = `+${callingCode}${sanitizedNumber}`;
      
      await axios.post("http://192.168.1.5:5000/send-otp", {
        phone: fullNumber,
      }, {
        timeout: 10000
      });

      setOtpSent(true);
      fadeIn();
      otpInputRef.current?.focus();
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to send OTP. Please try again.";
      Alert.alert("Error", message);
      console.error("Send OTP Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (submittedOtp: string) => {
    if (!submittedOtp || submittedOtp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP");
      return;
    }
  
    setLoading(true);
    try {
      const fullNumber = `+${callingCode}${sanitizePhoneNumber(phoneNumber)}`;
      
      const response = await axios.post("http://192.168.1.5:5000/verify-otp", {
        phone: fullNumber,
        otp: submittedOtp // Use directly passed value
      }, {
        timeout: 10000
      });
  
      await AsyncStorage.setItem('authToken', response.data.token);
      router.replace({ pathname: "/user_info", params: { user: JSON.stringify(response.data.user) }});
    } catch (error: any) {
      const message = error.response?.data?.message || "Invalid OTP. Please try again.";
      Alert.alert("Error", message);
      console.error("Verify OTP Error:", error);
      setOtp("");
      otpInputRef.current?.clear();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (enteredOtp: string) => {
    // Sanitize input to only numbers
    const sanitizedOtp = enteredOtp.replace(/[^0-9]/g, '');
    setOtp(sanitizedOtp);
    
    if (sanitizedOtp.length === 6) {
      Keyboard.dismiss();
      verifyOtp(sanitizedOtp); // Pass current value directly
    }
  };

  return (
    <View style={styles.container}>
      <LottieView
        source={require("../assets/animations/phone_verification.json")}
        autoPlay
        loop
        style={styles.lottie}
      />

      <Text style={styles.title}>📱 Phone Verification</Text>
      <Text style={styles.subtitle}>
        We'll send a 6-digit code to verify your phone number
      </Text>

      <View style={styles.phoneContainer}>
        <CountryPicker
          withFilter
          withFlag
          withCallingCode
          countryCode={countryCode}
          onSelect={(country: Country) => {
            setCountryCode(country.cca2 as CountryCode);
            setCallingCode(country.callingCode[0]);
          }}
          theme={{
            onBackgroundTextColor: '#333',
            backgroundColor: '#fff',
          }}
        />
        <Text style={styles.countryCode}>+{callingCode}</Text>
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#888"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={text => setPhoneNumber(sanitizePhoneNumber(text))}
          maxLength={15}
          editable={!otpSent}
        />
      </View>

      {!otpSent ? (
        <TouchableOpacity 
          style={[styles.button, loading && styles.disabledButton]} 
          onPress={sendOtp} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Verification Code</Text>
          )}
        </TouchableOpacity>
      ) : (
        <Animated.View style={[styles.otpContainer, { opacity: fadeAnim }]}>
          <Text style={styles.otpLabel}>Enter 6-digit Code</Text>
          <OTPTextInput
            ref={otpInputRef}
            inputCount={6}
            tintColor="#007AFF"
            offTintColor="#ddd"
            handleTextChange={handleOtpChange}
            textInputStyle={styles.otpBox}
            keyboardType="number-pad"
            autoFocus={true}
          />


          
          <TouchableOpacity 
            style={styles.resendButton} 
            onPress={sendOtp}
            disabled={loading}
          >
            <Text style={styles.resendText}>
              Didn't receive code? {loading ? 'Sending...' : 'Resend'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
    marginTop :-300,
  },
  lottie: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 10,
    color: "#1a1a1a",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 25,
    fontSize: 15,
    color: "#666",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginLeft: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 10,
    paddingVertical: 8,
  },
  button: {
    width: "100%",
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  otpContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  otpLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 15,
  },
  otpBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  resendButton: {
    marginTop: 25,
  },
  resendText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
});