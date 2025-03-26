import { useEffect, useState, useRef } from 'react';
import { 
  View, Text, Image, TouchableOpacity, ActivityIndicator, 
  StyleSheet, Animated, StatusBar 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current; // Animation value
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          router.replace('/dashboard'); // Redirect if logged in
          return;
        }
      } catch (error) {
        console.error('Error checking login status:', error);
      }

      setIsLoading(false);

      // Fade-in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    };

    checkLoginStatus();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    router.push('/otp_verification');
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Animated Logo */}
      <LottieView 
        source={require('../assets/animations/money.json')}
        autoPlay 
        loop 
        style={styles.lottie}
      />

      {/* Welcome Text */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.title}>Welcome to CashFlow</Text>
        <Text style={styles.subtitle}>Seamless Transactions, Instantly!</Text>
      </Animated.View>

      {/* Get Started Button */}
      <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity 
          onPressIn={handlePressIn} 
          onPressOut={handlePressOut} 
          style={styles.button}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF', // White background
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  lottie: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  title: {
    fontSize: 34, 
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18, 
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonWrapper: {
    marginTop: 50, // Moved button lower
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 20,
    paddingHorizontal: 120,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
});
