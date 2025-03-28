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

// Twilio Setup
const twilioClient = new Twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// Database Setup
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
});

(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        await sequelize.sync({ alter: true });
        console.log('✅ Database synced successfully');
    } catch (error) {
        console.error('❌ Database error:', error.message);
        process.exit(1);
    }
})();




(async () => {
    await sequelize.sync({ alter: true });
})();


// User Model
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    phone: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: true },
    birthdate: { type: DataTypes.DATEONLY, allowNull: true },
    otp_code: { type: DataTypes.STRING, allowNull: true },
    otp_expires_at: { type: DataTypes.DATE, allowNull: true },
    wallet_balance: { type: DataTypes.DECIMAL, defaultValue: 0.0 },
});

// Authentication Middleware
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: '❌ Unauthorized' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: '❌ Invalid token' });
    }
};


const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    type: { 
        type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer'), 
        allowNull: false 
    },
    amount: { 
        type: DataTypes.DECIMAL, 
        allowNull: false,
        validate: { min: 0.01 } // Ensure amount is positive
    },
    status: { 
        type: DataTypes.ENUM('pending', 'completed', 'failed'), 
        defaultValue: 'pending' 
    },
}, { timestamps: true });



User.hasMany(Transaction, { foreignKey: 'userId' });
Transaction.belongsTo(User, { foreignKey: 'userId' });


app.get('/transactions', authenticate, async (req, res) => {
    try {
        const transactions = await Transaction.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
        res.json({ transactions });
    } catch (error) {
        console.error('Fetch Transactions Error:', error);
        res.status(500).json({ message: '❌ Failed to fetch transactions', error: error.message });
    }
});

// Add this to the existing server code

// Transfer Route
app.post('/transfer', authenticate, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { recipientPhone, amount } = req.body;
        
        // Validate input
        if (!recipientPhone || !amount || amount <= 0) {
            return res.status(400).json({ message: '❌ Invalid transfer details' });
        }

        // Find sender (current user)
        const sender = await User.findByPk(req.user.id, { transaction });
        if (!sender) {
            return res.status(404).json({ message: '❌ Sender not found' });
        }

        // Find recipient
        const recipient = await User.findOne({ 
            where: { phone: recipientPhone },
            transaction 
        });
        if (!recipient) {
            return res.status(404).json({ message: '❌ Recipient not found' });
        }

        // Check sender's balance
        const senderBalance = parseFloat(sender.wallet_balance);
        const transferAmount = parseFloat(amount);
        
        if (senderBalance < transferAmount) {
            return res.status(400).json({ message: '❌ Insufficient balance' });
        }

        // Perform transfer
        sender.wallet_balance = senderBalance - transferAmount;
        recipient.wallet_balance = parseFloat(recipient.wallet_balance) + transferAmount;

        // Save changes
        await sender.save({ transaction });
        await recipient.save({ transaction });

        // Create transaction records
        await Transaction.create({
            userId: sender.id,
            type: 'transfer',
            amount: transferAmount,
            status: 'completed'
        }, { transaction });

        await Transaction.create({
            userId: recipient.id,
            type: 'transfer',
            amount: transferAmount,
            status: 'completed'
        }, { transaction });

        // Commit transaction
        await transaction.commit();

        res.json({ 
            message: '✅ Transfer successful', 
            newBalance: sender.wallet_balance 
        });
    } catch (error) {
        // Rollback transaction in case of error
        if (transaction) await transaction.rollback();
        
        console.error('Transfer Error:', error);
        res.status(500).json({ 
            message: '❌ Transfer failed', 
            error: error.message 
        });
    }
});

// New route to find user by phone number (for send payment screen)
app.get('/find-user', authenticate, async (req, res) => {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            return res.status(400).json({ message: '❌ Phone number is required' });
        }

        const user = await User.findOne({ 
            where: { phone },
            attributes: ['id', 'name', 'phone'] 
        });

        if (!user) {
            return res.status(404).json({ message: '❌ User not found' });
        }

        res.json({ user: { name: user.name, phone: user.phone } });
    } catch (error) {
        console.error('Find User Error:', error);
        res.status(500).json({ 
            message: '❌ Failed to find user', 
            error: error.message 
        });
    }
});

// OTP Routes
app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ message: '❌ Phone number is required' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

        let user = await User.findOne({ where: { phone } });

        if (!user) {
            user = await User.create({ phone, otp_code: otp, otp_expires_at: otpExpiresAt });
        } else {
            await user.update({ otp_code: otp, otp_expires_at: otpExpiresAt });
        }

        await twilioClient.messages.create({
            body: `Your verification code is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone,
        });

        res.json({ message: '✅ OTP sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '❌ Failed to send OTP', error: error.message });
    }
});

app.post('/deposit', authenticate, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: '❌ Invalid deposit amount' });

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: '❌ User not found' });

        user.wallet_balance = parseFloat(user.wallet_balance) + parseFloat(amount);
        await user.save();

        await Transaction.create({ userId: user.id, type: 'deposit', amount, status: 'completed' });

        res.json({ message: '✅ Deposit successful', wallet_balance: user.wallet_balance });
    } catch (error) {
        console.error('Deposit Error:', error);
        res.status(500).json({ message: '❌ Deposit failed', error: error.message });
    }
});


app.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ message: '❌ Phone number and OTP are required' });

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(400).json({ message: '❌ User not found' });

        if (user.otp_code !== otp) return res.status(400).json({ message: '❌ Invalid OTP' });
        if (Date.now() > new Date(user.otp_expires_at).getTime()) return res.status(400).json({ message: '❌ OTP expired' });

        await user.update({ otp_code: null, otp_expires_at: null });

        const token = jwt.sign({ id: user.id, phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ 
            message: '✅ OTP verified successfully', 
            token, 
            user: { id: user.id, phone: user.phone, name: user.name, birthdate: user.birthdate, wallet_balance: user.wallet_balance } 
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: '❌ OTP verification failed', error: error.message });
    }
});

// User Routes
app.post('/update-user', authenticate, async (req, res) => {
    try {
        const { name, birthdate } = req.body;
        if (!name || !birthdate) return res.status(400).json({ message: '❌ Name and birthdate are required' });

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: '❌ User not found' });

        await user.update({ name, birthdate });

        res.json({ message: '✅ User details updated successfully', user });
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ message: '❌ Failed to update user details', error: error.message });
    }
});

// Wallet Routes
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

// Logout Route
app.post('/logout', authenticate, (req, res) => {
    res.json({ message: '✅ Logged out successfully' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
