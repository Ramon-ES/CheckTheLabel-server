const admin = require('firebase-admin');
require('dotenv').config();

let db = null;
let isInitialized = false;

function initializeFirebase() {
    if (isInitialized) {
        return db;
    }

    try {
        // Check if Firebase is already initialized
        if (admin.apps.length === 0) {
            // Initialize with service account from environment variables
            const serviceAccount = {
                type: process.env.FIREBASE_TYPE || "service_account",
                project_id: process.env.FIREBASE_PROJECT_ID,
                private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
                private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                client_id: process.env.FIREBASE_CLIENT_ID,
                auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
                token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
            };

            // Validate required fields
            if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
                console.warn('⚠️  Firebase credentials not found in environment variables. Running without Firestore.');
                return null;
            }

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });

            console.log('✅ Firebase Admin initialized successfully');
        }

        db = admin.firestore();
        
        // Configure Firestore settings
        db.settings({
            timestampsInSnapshots: true,
        });

        isInitialized = true;
        return db;

    } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error.message);
        return null;
    }
}

function getFirestore() {
    if (!db) {
        return initializeFirebase();
    }
    return db;
}

function isFirebaseEnabled() {
    return db !== null;
}

module.exports = {
    initializeFirebase,
    getFirestore,
    isFirebaseEnabled,
    admin
};