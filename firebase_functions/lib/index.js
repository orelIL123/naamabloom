"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
const firebase_functions_1 = require("firebase-functions");
// Initialize Firebase Admin
admin.initializeApp();
// SMS4FREE configuration - set as Functions config
// Run once: firebase functions:config:set sms4free.api_key="..." sms4free.user="..." sms4free.pass="..." sms4free.sender="..."
const sms4freeConfig = (0, firebase_functions_1.config)().sms4free || {};
const sms4freeApiKey = sms4freeConfig.api_key || '';
const sms4freeUser = sms4freeConfig.user || '';
const sms4freePass = sms4freeConfig.pass || '';
const sms4freeSender = sms4freeConfig.sender || '';
// SMS sending function
exports.sendSMS = firebase_functions_1.https.onRequest(async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(200).send();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    try {
        const { phoneNumber, message } = req.body;
        if (!phoneNumber) {
            res.status(400).json({ error: 'Phone number is required' });
            return;
        }
        // Get the verification code from the request (sent by Firebase Auth or generate for fallback)
        const verificationCode = req.body.code || Math.floor(100000 + Math.random() * 900000).toString();
        // Use the message as-is if it already contains the code, otherwise add it
        let fullMessage;
        if (message && message.includes(verificationCode)) {
            fullMessage = message; // Message already contains the code
        }
        else {
            fullMessage = `${message || 'קוד האימות שלך הוא: '}${verificationCode}`;
        }
        console.log(`Sending SMS to ${phoneNumber}: ${fullMessage}`);
        if (sms4freeApiKey && sms4freeUser && sms4freePass && sms4freeSender) {
            // Send SMS via SMS4FREE API
            try {
                const body = {
                    key: sms4freeApiKey,
                    user: sms4freeUser,
                    pass: sms4freePass,
                    sender: sms4freeSender,
                    recipient: phoneNumber,
                    msg: fullMessage,
                };
                console.log(`📱 ToriX SMS: Sending via ${sms4freeSender} to ${phoneNumber}`);
                const response = await fetch('https://api.sms4free.co.il/ApiSMS/v2/SendSMS', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const smsResult = await response.json();
                console.log('ToriX SMS response:', smsResult);
                if (typeof (smsResult === null || smsResult === void 0 ? void 0 : smsResult.status) === 'number' && smsResult.status > 0) {
                    res.status(200).json({
                        success: true,
                        code: verificationCode,
                        verificationId: `sms4free-${Date.now()}`,
                        message: 'SMS sent successfully via ToriX SMS',
                        messageId: String(smsResult.status)
                    });
                }
                else {
                    const errText = (smsResult === null || smsResult === void 0 ? void 0 : smsResult.message) || 'Unknown SMS4FREE error';
                    console.error('SMS4FREE SMS failed:', errText);
                    throw new Error(errText);
                }
            }
            catch (sms4freeError) {
                console.error('SMS4FREE failed:', sms4freeError);
                res.status(500).json({
                    success: false,
                    error: 'SMS4FREE API request failed.',
                    details: sms4freeError.message,
                    isSMS4FreeError: true,
                });
            }
        }
        else {
            // Development mode - just return the code
            console.log(`DEVELOPMENT: SMS code for ${phoneNumber} is: ${verificationCode}`);
            res.status(200).json({
                success: true,
                code: verificationCode,
                verificationId: `dev-${Date.now()}`,
                message: 'SMS sent (development mode - check logs)',
                development: true
            });
        }
    }
    catch (error) {
        console.error('Error sending SMS:', error);
        res.status(500).json({
            error: 'Failed to send SMS',
            details: error.message
        });
    }
});
//# sourceMappingURL=index.js.map