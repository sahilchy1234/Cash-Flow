import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    StyleSheet, 
    Alert, 
    Image,
    Modal,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    ImageStyle,
    Linking
} from 'react-native';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera } from 'expo-camera';
import Icon from 'react-native-vector-icons/Ionicons';


import { CameraView, useCameraPermissions } from 'expo-camera';


interface SendPaymentStyles {
    container: ViewStyle;
    title: TextStyle;
    inputContainer: ViewStyle;
    input: TextStyle;
    qrButton: ViewStyle;
    findButton: ViewStyle;
    findButtonText: TextStyle;
    recipientCard: ViewStyle;
    avatar: ImageStyle;
    recipientName: TextStyle;
    recipientPhone: TextStyle;
    amountInput: TextStyle;
    errorContainer: ViewStyle;
    errorText: TextStyle;
    sendButton: ViewStyle;
    disabledButton: ViewStyle;
    sendButtonText: TextStyle;
    qrModalContainer: ViewStyle;
    qrModalContent: ViewStyle;
    centerText: TextStyle;
    buttonTouchable: ViewStyle;
    buttonText: TextStyle;
    permissionContainer: ViewStyle;
    permissionText: TextStyle;
    permissionButton: ViewStyle;
    permissionButtonText: TextStyle;
    qrOverlay: ViewStyle;
    qrFrame: ViewStyle;
}

interface SendPaymentScreenProps {
    navigation: any;
}

interface ErrorResponse {
    message?: string;
    errorCode?: string;
}

interface RecipientDetails {
    name: string;
    phone: string;
}

const SendPaymentScreen: React.FC<SendPaymentScreenProps> = ({ navigation }) => {    const [recipientPhone, setRecipientPhone] = useState('');
   
    const [permission, requestPermission] = useCameraPermissions();

   
    const [amount, setAmount] = useState('');
    const [recipientDetails, setRecipientDetails] = useState<RecipientDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [isQRModalVisible, setIsQRModalVisible] = useState(false);
    const [transactionError, setTransactionError] = useState<string | null>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasCameraPermission(status === 'granted');
        })();
    }, []);


    const requestCameraPermission = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        if (status === 'granted') {
            setHasCameraPermission(true);
        } else if (status === 'denied') {
            Alert.alert(
                'Permission Required',
                'Camera access is required to scan QR codes',
                [
                    {
                        text: 'Open Settings',
                        onPress: () => Linking.openSettings()
                    },
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    }
                ]
            );
        }
        return status === 'granted';
    };

    const findUser = async () => {
        if (!recipientPhone) {
            Alert.alert('Error', 'Please enter a phone number');
            return;
        }

        setLoading(true);
        setTransactionError(null);
        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await axios.get(`http://192.168.1.5:5000/find-user?phone=${recipientPhone}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setRecipientDetails(response.data.user);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const serverError = error as AxiosError<ErrorResponse>;
                const errorMessage = serverError.response?.data?.message || 'User not found';
                console.error(errorMessage);
                Alert.alert('Error', errorMessage);
            } else {
                console.error(error);
                Alert.alert('Error', 'An unexpected error occurred');
            }
            setRecipientDetails(null);
        } finally {
            setLoading(false);
        }
    };

    const sendPayment = async () => {
        if (!recipientDetails) {
            Alert.alert('Error', 'Please find a user first');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        setLoading(true);
        setTransactionError(null);
        try {
            const token = await AsyncStorage.getItem('authToken');
            const response = await axios.post('http://192.168.1.5:5000/transfer', 
                { 
                    recipientPhone: recipientDetails.phone, 
                    amount: parseFloat(amount) 
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            Alert.alert('Success', 'Payment sent successfully');
            navigation.goBack();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const serverError = error as AxiosError<ErrorResponse>;
                let errorMessage = 'Failed to send payment';
                let detailedError = 'Unknown error occurred';

                switch (serverError.response?.data?.errorCode) {
                    case 'INSUFFICIENT_FUNDS':
                        detailedError = 'Insufficient balance in your account';
                        break;
                    case 'RECIPIENT_INACTIVE':
                        detailedError = 'Recipient account is inactive';
                        break;
                    case 'DAILY_LIMIT_EXCEEDED':
                        detailedError = 'Daily transaction limit exceeded';
                        break;
                    case 'NETWORK_ERROR':
                        detailedError = 'Network transaction failed. Please try again';
                        break;
                    default:
                        detailedError = serverError.response?.data?.message || errorMessage;
                }

                console.error(detailedError);
                setTransactionError(detailedError);
                Alert.alert('Transaction Failed', detailedError);
            } else {
                console.error(error);
                Alert.alert('Error', 'An unexpected error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        setScanned(true);
        try {
            const qrData = JSON.parse(data);
            if (qrData.phone) {
                setRecipientPhone(qrData.phone);
                findUser();
                setIsQRModalVisible(false);
            } else {
                Alert.alert('Invalid QR Code', 'Please scan a valid user QR code.');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not read QR code.');
        }
    };

    const checkCameraPermission = async () => {
        if (!permission) {
          const { status } = await Camera.requestCameraPermissionsAsync();
          return status === 'granted';
        }
        return permission.granted;
      };

    const openQRScanner = async () => {
        if (hasCameraPermission === null) {
            await checkCameraPermission();
        }
        
        if (hasCameraPermission) {
            setScanned(false);
            setIsQRModalVisible(true);
        } else {
            const granted = await requestCameraPermission();
            if (granted) {
                setScanned(false);
                setIsQRModalVisible(true);
            }
        }
    };


    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Send Payment</Text>
            
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Enter recipient's phone number"
                    value={recipientPhone}
                    onChangeText={setRecipientPhone}
                    keyboardType="phone-pad"
                />
                <TouchableOpacity 
                    style={styles.qrButton} 
                    onPress={openQRScanner}
                >
                    <Icon name="qr-code-outline" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.findButton} 
                    onPress={findUser}
                    disabled={loading}
                >
                    <Text style={styles.findButtonText}>
                        {loading ? 'Searching...' : 'Find'}
                    </Text>
                </TouchableOpacity>
            </View>

            {recipientDetails && (
                <View style={styles.recipientCard}>
                    <Image 
                        source={{ uri: `https://ui-avatars.com/api/?name=${recipientDetails.name}&background=3498DB&color=fff` }} 
                        style={styles.avatar} 
                    />
                    <View>
                        <Text style={styles.recipientName}>{recipientDetails.name || 'Unknown'}</Text>
                        <Text style={styles.recipientPhone}>{recipientDetails.phone}</Text>
                    </View>
                </View>
            )}

            <TextInput
                style={styles.amountInput}
                placeholder="Enter amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
            />

            {transactionError && (
                <View style={styles.errorContainer}>
                    <Icon name="warning" size={20} color="#FF6B6B" />
                    <Text style={styles.errorText}>{transactionError}</Text>
                </View>
            )}

            <TouchableOpacity 
                style={[
                    styles.sendButton, 
                    (!recipientDetails || !amount) && styles.disabledButton
                ]} 
                onPress={sendPayment}
                disabled={!recipientDetails || !amount || loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.sendButtonText}>Send Payment</Text>
                )}
            </TouchableOpacity>



            <Modal visible={isQRModalVisible} transparent animationType="slide">
      <View style={styles.qrModalContainer}>
        <View style={styles.qrModalContent}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr']
              }}
            >
              <View style={styles.qrOverlay}>
                <View style={styles.qrFrame} />
                <Text style={styles.centerText}>Align QR code within the frame</Text>
                <TouchableOpacity 
                  style={styles.buttonTouchable}
                  onPress={() => setIsQRModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          ) : (
            <View style={styles.permissionContainer}>
              <Icon name="camera-off" size={50} color="#BDC3C7" />
              <Text style={styles.permissionText}>
                Camera permission is required to scan QR codes
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
              >
                <Text style={styles.permissionButtonText}>
                  Request Permission
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
        </View>
    );
};

const styles = StyleSheet.create<SendPaymentStyles>({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F7F9FB'
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#2C3E50'
    },
    inputContainer: {
        flexDirection: 'row',
        marginBottom: 15
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#BDC3C7',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginRight: 10
    },
    qrButton: {
        backgroundColor: '#3498DB',
        justifyContent: 'center',
        alignItems: 'center',
        width: 50,
        borderRadius: 10,
        marginRight: 10
    },
    findButton: {
        backgroundColor: '#2ECC71',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 15,
        borderRadius: 10
    },
    findButtonText: {
        color: 'white',
        fontWeight: '600'
    },
    recipientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        overflow: 'hidden'
    },
    recipientName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2C3E50'
    },
    recipientPhone: {
        color: '#7F8C8D'
    },
    amountInput: {
        borderWidth: 1,
        borderColor: '#BDC3C7',
        borderRadius: 10,
        paddingHorizontal: 15,
        marginBottom: 15
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3F3',
        padding: 10,
        borderRadius: 10,
        marginBottom: 15
    },
    errorText: {
        color: '#FF6B6B',
        marginLeft: 10
    },
    sendButton: {
        backgroundColor: '#3498DB',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center'
    },
    disabledButton: {
        backgroundColor: '#BDC3C7'
    },
    sendButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    qrModalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)'
    },
    qrModalContent: {
        flex: 1,
        backgroundColor: 'transparent'
    },
    centerText: {
        fontSize: 16,
        color: 'white',
        textAlign: 'center',
        marginVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 5
    },
    buttonTouchable: {
        backgroundColor: '#E74C3C',
        padding: 10,
        borderRadius: 10,
        marginTop: 20,
        alignSelf: 'center'
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
    },
    permissionText: {
        fontSize: 16,
        color: '#2C3E50',
        textAlign: 'center',
        marginVertical: 15
    },
    permissionButton: {
        backgroundColor: '#3498DB',
        padding: 12,
        borderRadius: 10,
        width: '100%',
        alignItems: 'center'
    },
    permissionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600'
    },
    qrOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    qrFrame: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 10,
        position: 'absolute'
    }
});

export default SendPaymentScreen;