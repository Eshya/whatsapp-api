import { Boom } from '@hapi/boom'
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay, AnyMessageContent, AuthenticationState, Browsers } from "@whiskeysockets/baileys";
import { FormatToPhoneNumber, FormatToWhatsappJid } from '../util/formatter';
import * as fs from 'fs';
// import * as msgProcessorService from "../services/msg-processor-service";
import logger from '../util/logger';

const AUTH_FILE_LOCATION = './data/session';

export interface ReceivedMessage {
    id: string;
    from: string;
    message: string;
    timestamp: Date;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'other';
}

export class WhatsappService {
    qrcode: string = "";
    phoneNumber: string = "";
    needRestartService: boolean = false;
    sock: any;
    state: AuthenticationState | null = null;
    saveCreds: any;
    receivedMessages: ReceivedMessage[] = [];
    messageCallbacks: ((message: ReceivedMessage) => void)[] = [];

    constructor() {

    }

    // Add callback for new messages
    onMessage(callback: (message: ReceivedMessage) => void) {
        this.messageCallbacks.push(callback);
    }

    // Get all received messages
    getReceivedMessages(): ReceivedMessage[] {
        return [...this.receivedMessages];
    }

    // Clear received messages
    clearReceivedMessages() {
        this.receivedMessages = [];
    }

    // Process and store incoming message
    private processIncomingMessage(message: any): ReceivedMessage | null {
        try {
            // Skip if message is from me
            if (message.key.fromMe) {
                return null;
            }

            const from = FormatToPhoneNumber(message.key.remoteJid);
            let messageText = '';
            let messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'other' = 'other';

            // Extract message content based on type
            if (message.message?.conversation) {
                messageText = message.message.conversation;
                messageType = 'text';
            } else if (message.message?.extendedTextMessage?.text) {
                messageText = message.message.extendedTextMessage.text;
                messageType = 'text';
            } else if (message.message?.imageMessage) {
                messageText = `[Image] ${message.message.imageMessage.caption || ''}`;
                messageType = 'image';
            } else if (message.message?.videoMessage) {
                messageText = `[Video] ${message.message.videoMessage.caption || ''}`;
                messageType = 'video';
            } else if (message.message?.audioMessage) {
                messageText = '[Audio Message]';
                messageType = 'audio';
            } else if (message.message?.documentMessage) {
                messageText = `[Document] ${message.message.documentMessage.fileName || ''}`;
                messageType = 'document';
            } else {
                messageText = '[Unsupported Message Type]';
                messageType = 'other';
            }

            const receivedMessage: ReceivedMessage = {
                id: message.key.id || `msg_${Date.now()}_${Math.random()}`,
                from: from,
                message: messageText,
                timestamp: new Date(),
                type: messageType
            };

            return receivedMessage;
        } catch (error) {
            logger.error('Error processing incoming message:', error);
            return null;
        }
    }

    async Initialize() {
        this.sock = await this.CreateNewSocket();
    }

    async CreateNewSocket() {
        const { version, isLatest } = await fetchLatestBaileysVersion();
        logger.info(`Using wa version v${version.join('.')}, isLatest: ${isLatest}`);

        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FILE_LOCATION);
        this.state = state;
        this.saveCreds = saveCreds;

        var socket = makeWASocket({
            version: version,
            printQRInTerminal: true,
            auth: state,
            markOnlineOnConnect: true,
            browser: Browsers.macOS('Desktop'),
            syncFullHistory: true,
            // Add timeout configuration
            connectTimeoutMs: 60000,
            // Add retry configuration
            retryRequestDelayMs: 1000
        });

        // autoreconnect with better error handling
        socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, isNewLogin, qr } = update;

            logger.info(`connection update: ${connection}, isNewLogin: ${isNewLogin}, qr: ${qr}`)
            if (qr !== undefined) {
                logger.info("gets qr code")
                this.qrcode = qr as string;
            }

            // closed connection
            if (connection == 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                logger.info('connection closed due to', lastDisconnect?.error, statusCode);

                // Handle session conflict
                if (statusCode === 440) {
                    logger.error('Session conflict detected - clearing session data');
                    try {
                        fs.rmSync(AUTH_FILE_LOCATION, { recursive: true, force: true });
                        logger.info('Session data cleared due to conflict');
                    } catch (error) {
                        logger.error('Failed to clear session data:', error);
                    }
                    this.needRestartService = true;
                    return;
                }

                if (statusCode !== DisconnectReason.loggedOut) {
                    logger.info('Attempting to reconnect...');
                    try {
                        // Add delay before reconnecting to avoid rapid reconnection
                        await delay(2000);
                        this.sock = await this.CreateNewSocket();
                    } catch (error) {
                        logger.error('Failed to reconnect:', error);
                        this.needRestartService = true;
                    }
                }
                else
                {
                    logger.info('Client logged out, clearing session data');
                    try {
                        fs.rmSync(AUTH_FILE_LOCATION, { recursive: true, force: true });
                    } catch (error) {
                        logger.error('Failed to clear session data:', error);
                    }
                    this.needRestartService = true;
                    logger.info('client logged out, please restart the service for new qrcode');
                }
            }
            // opened connection 
            else if (connection == 'open') {
                logger.info('opened connection');
                this.phoneNumber = FormatToPhoneNumber(state.creds.me?.id as string);
                this.qrcode = "";
            }
        });

        socket.ev.on('creds.update', this.saveCreds);

        socket.ev.on('chats.upsert', item => {
            try {
                logger.info(`recv ${item.length} chats`);
            } catch (error) {
                logger.error('Error in chats.upsert:', error);
            }
        });
        
        socket.ev.on('chats.update', m => {
            try {
                logger.info('chats.update event', m);
            } catch (error) {
                logger.error('Error in chats.update:', error);
            }
        });
        
        socket.ev.on('chats.delete', m => {
            try {
                logger.info('chats.delete event', m);
            } catch (error) {
                logger.error('Error in chats.delete:', error);
            }
        });

        socket.ev.on('contacts.upsert', item => {
            try {
                logger.info(`recv ${item.length} contacts`);
            } catch (error) {
                logger.error('Error in contacts.upsert:', error);
            }
        });
        
        socket.ev.on('contacts.update', m => {
            try {
                logger.info('contacts.update event', m);
            } catch (error) {
                logger.error('Error in contacts.update:', error);
            }
        });

        socket.ev.on('messages.upsert', async m => {
            try {
                logger.info('messages.upsert event', m);

                if (!m.messages || !Array.isArray(m.messages)) {
                    logger.warn('Invalid messages.upsert event format');
                    return;
                }

                for (const message of m.messages) {
                    try {
                        // Process incoming message
                        const receivedMessage = this.processIncomingMessage(message);
                        if (receivedMessage) {
                            // Store the message
                            this.receivedMessages.push(receivedMessage);
                            logger.info(`📥 Stored message from ${receivedMessage.from}: ${receivedMessage.message}`);
                            
                            // Notify all callbacks
                            logger.info(`📡 Notifying ${this.messageCallbacks.length} callbacks about new message`);
                            this.messageCallbacks.forEach((callback, index) => {
                                try {
                                    logger.info(`📡 Executing callback ${index + 1}`);
                                    callback(receivedMessage);
                                    logger.info(`✅ Callback ${index + 1} executed successfully`);
                                } catch (error) {
                                    logger.error(`❌ Error in message callback ${index + 1}:`, error);
                                }
                            });

                            logger.info(`✅ Message processing completed for: ${receivedMessage.from}`);
                        } else {
                            logger.info('⚠️ Message was not processed (filtered out)');
                        }

                        // skip message if the message sent by me
                        if (message.key.fromMe) {
                            logger.info('⏭️ Skipping message sent by me');
                            continue;
                        }
                    } catch (error) {
                        logger.error('Error processing individual message:', error);
                    }
                }
            } catch (error) {
                logger.error('Error in messages.upsert event handler:', error);
            }
        });

        socket.ev.on('messages.update', m => {
            try {
                logger.info('messages.update event', m);
            } catch (error) {
                logger.error('Error in messages.update:', error);
            }
        });
        
        socket.ev.on('message-receipt.update', m => {
            try {
                logger.info('message-receipt.update event', m);
            } catch (error) {
                logger.error('Error in message-receipt.update:', error);
            }
        });
        
        socket.ev.on('presence.update', m => {
            try {
                logger.info('presence.update event', m);
            } catch (error) {
                logger.error('Error in presence.update:', error);
            }
        });

        return socket;
    }

    async SendWhatsappSimpleMessage(phoneNumber: string | null | undefined, message: AnyMessageContent) {
        logger.info(`Sending To: ${phoneNumber} with message: ${message}`);

        const jid = FormatToWhatsappJid(phoneNumber);
        logger.info(`Formatted jid to: ${jid}`);

        await this.sock.presenceSubscribe(jid);
        await delay(10);
        await this.sock.sendPresenceUpdate('composing', jid);
        await delay(10);
        await this.sock.sendPresenceUpdate('available', jid);
        await delay(10);
        await this.sock.sendMessage(jid, {
            text: message
        });
    }

    async Logout() {
        // Check if the socket is already logged out
        if (this.state) {
            try {
                // Perform the logout operation
                await this.sock.logout();
                // Remove the authentication file
                fs.rmSync(AUTH_FILE_LOCATION, { recursive: true, force: true });
                this.needRestartService = true;
                logger.info('Logged out successfully. Please restart the service for a new login.');
            } catch (error) {
                logger.error('Error logging out:', error);
            }
        } else {
            logger.info('Not logged in. No need to log out.');
        }
    }

    GetStatus() {
        if (this.needRestartService){
            return {
                isConnected: false,
                phoneNumber: "",
                qrcode: "",
                needRestart: true
            };
        }
        if (this.qrcode === "") {
            return {
                isConnected: true,
                phoneNumber: this.phoneNumber,
                qrcode: "",
                needRestart: false
            };
        }
        return {
            isConnected: false,
            phoneNumber: "",
            qrcode: this.qrcode,
            needRestart: false
        };
    }
};