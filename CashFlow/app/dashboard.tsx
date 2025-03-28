import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
// Define TypeScript Types
interface Transaction {
    id: number;
    avatar: string;
    name: string;
    amount: number;
}

const DashboardScreen: React.FC = () => {
    const router = useRouter();
    const [balance, setBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        fetchWalletData();
    }, []);

    const fetchWalletData = async () => {
        try {
            const token = await AsyncStorage.getItem('authToken');
            if (!token) return;

            const response = await axios.get('http://192.168.1.5:5000/wallet', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBalance(response.data.wallet_balance);

            const transactionsResponse = await axios.get('http://192.168.1.5:5000/transactions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTransactions(transactionsResponse.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Cashflow</Text>
                <TouchableOpacity onPress={() => router.push('/indexcopy')}>
                    <Text style={styles.profileIcon}>👤</Text>
                </TouchableOpacity>
            </View>

            {/* Wallet Card */}
            <View style={styles.walletCard}>
                <Text style={styles.walletTitle}>My Wallet</Text>
                <Text style={styles.maskedNumber}>••••  ••••  ••••  84</Text>
                <Text style={styles.balance}>${balance.toLocaleString()}</Text>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.sendButton} onPress={() => router.push('/send_payment')}>
                        <Text style={styles.buttonText}>Send</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.receiveButton}>
                        <Text style={styles.buttonText}>Receive</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsRow}>
                    {[
                        { icon: '⭐', text: 'Favorites' },
                        { icon: '📞', text: 'Contacts' },
                        { icon: '💳', text: 'Cards' },
                        { icon: '⚙️', text: 'More' }
                    ].map((action, index) => (
                        <TouchableOpacity key={index} style={styles.actionButton}>
                            <Text style={styles.actionButtonText}>{action.icon} {action.text}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Transactions */}
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <FlatList
                data={transactions}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={styles.transactionItem}>
                        <Image source={{ uri: item.avatar }} style={styles.avatar} />
                        <Text style={styles.transactionName}>{item.name}</Text>
                        <Text style={[
                            styles.transactionAmount, 
                            { color: item.amount > 0 ? '#4CAF50' : '#F44336' }
                        ]}>
                            {item.amount > 0 ? `+$${item.amount}` : `-$${Math.abs(item.amount)}`}
                        </Text>
                    </View>
                )}
            />



        </View>

        
    );
};

// Styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '700', color: '#333333' },
    profileIcon: { fontSize: 24 },
    walletCard: { backgroundColor: '#3498DB', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 10 },
    walletTitle: { color: '#FFFFFF', fontSize: 16, opacity: 0.8 },
    maskedNumber: { color: '#FFFFFF', fontSize: 16, marginVertical: 10, letterSpacing: 2 },
    balance: { color: '#FFFFFF', fontSize: 32, fontWeight: '700' },
    buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, gap: 10 },
    sendButton: { backgroundColor: '#2980B9', padding: 12, borderRadius: 10, flex: 1 },
    receiveButton: { backgroundColor: '#27AE60', padding: 12, borderRadius: 10, flex: 1 },
    buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '600' },
    quickActions: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#333333' },
    actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    actionButton: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 10, flex: 1, alignItems: 'center' },
    actionButtonText: { fontSize: 14, color: '#333333' },
    transactionItem: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F9F9F9', marginBottom: 10, borderRadius: 10, elevation: 3 },
    avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
    transactionName: { flex: 1, fontSize: 16, color: '#333333' },
    transactionAmount: { fontSize: 16, fontWeight: '600' }
});

export default DashboardScreen;
