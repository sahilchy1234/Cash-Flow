import { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SendMoneyScreen() {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const router = useRouter();

  const handleSendMoney = async () => {
    const token = await AsyncStorage.getItem('token');
    try {
      await axios.post('http://localhost:5000/send-money', { recipient, amount }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Alert.alert('Success', 'Money Sent!');
      router.push('/');
    } catch (error) {
      Alert.alert('Error', 'Transaction failed');
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Recipient Email:</Text>
      <TextInput value={recipient} onChangeText={setRecipient} style={{ borderWidth: 1, padding: 10 }} />
      <Text>Amount:</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="numeric" style={{ borderWidth: 1, padding: 10 }} />
      <Button title="Send Money" onPress={handleSendMoney} />
      <Button title="Back to Home" onPress={() => router.push('/')} />
    </View>
  );
}
