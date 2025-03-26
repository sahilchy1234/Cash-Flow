const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
const Twilio = require('twilio');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Twilio Setup (for OTP verification)
const twilioClient = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Database Connection
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
});

(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
})();

// Define User Model
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    phone: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: true }, // Optional if using OTP-only login
    otp_code: { type: DataTypes.STRING, allowNull: true }, // Temporary OTP Storage
    otp_expires_at: { type: DataTypes.DATE, allowNull: true }, // OTP Expiry Time
    wallet_balance: { type: DataTypes.DECIMAL, defaultValue: 0.0 },
});

// Sync Database
(async () => {
    try {
        
        await sequelize.sync({ alter: true }); // Updates tables to match models        console.log('✅ Database synced successfully');
    } catch (error) {
        console.error('❌ Database sync error:', error.message);
    }
})();

/**
 * 📌 Step 1: Send OTP (Registration & Login)
 */
app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: '❌ Phone number is required' });

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes

        let user = await User.findOne({ where: { phone } });

        if (!user) {
            // Create a new user if they don't exist
            user = await User.create({ phone, otp_code: otp, otp_expires_at: otpExpiresAt });
        } else {
            // Update OTP for existing user
            await user.update({ otp_code: otp, otp_expires_at: otpExpiresAt });
        }

        // Send OTP via Twilio
        await twilioClient.messages.create({
            body: `Your Cash Flow verification code is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
        });

        res.json({ message: '✅ OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '❌ Failed to send OTP', error: error.message });
    }
});

/**
 * 📌 Step 2: Verify OTP and Login/Register
 */
app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ message: '❌ Phone number and OTP are required' });

        const user = await User.findOne({ where: { phone } });
        
        // Add debug logs
        console.log('User found:', user ? true : false);
        if (user) {
            console.log('Stored OTP:', user.otp_code, 'Type:', typeof user.otp_code);
            console.log('Received OTP:', otp, 'Type:', typeof otp);
            console.log('OTP Expires At:', user.otp_expires_at);
            console.log('Current Time:', new Date());
        }

        if (!user) {
            return res.status(400).json({ message: '❌ User not found' });
        }

        // Convert both OTPs to string for comparison
        if (user.otp_code !== otp) {
            return res.status(400).json({ message: '❌ Invalid OTP' });
        }

        // Check expiration using server time
        if (Date.now() > new Date(user.otp_expires_at).getTime()) {
            return res.status(400).json({ message: '❌ OTP expired' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Clear OTP fields
        await user.update({ 
            otp_code: null, 
            otp_expires_at: null 
        });

        res.json({ 
            message: '✅ Login successful', 
            token, 
            user: { 
                id: user.id, 
                phone: user.phone, 
                wallet_balance: user.wallet_balance 
            } 
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: '❌ OTP verification failed', error: error.message });
    }
});

/**
 * 📌 Step 3: Middleware to Protect Routes
 */
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: '❌ Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: '❌ Invalid token' });
    }
};

/**
 * 📌 Step 4: Protected Route Example (Get Wallet Balance)
 */
app.get('/wallet', authenticate, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: '❌ User not found' });

        res.json({ wallet_balance: user.wallet_balance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '❌ Failed to fetch wallet balance', error: error.message });
    }
});

/**
 * 📌 Step 5: Logout (Optional - Clears JWT on Frontend)
 */
app.post('/logout', authenticate, (req, res) => {
    res.json({ message: '✅ Logged out successfully' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Cash Flow Server running on port ${PORT}`));
