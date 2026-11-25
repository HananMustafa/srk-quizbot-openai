import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason
} from '@whiskeysockets/baileys';

import qrcode from 'qrcode-terminal';

async function startMonitor() {
    console.log('Starting WhatsApp message monitor...\n');

    const { state, saveCreds } =
        await useMultiFileAuthState('./auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const {
            connection,
            lastDisconnect,
            qr
        } = update;

        if (qr) {
            console.log('\nScan this QR code with WhatsApp:\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('\n========================================');
            console.log('✅ WHATSAPP CONNECTED');
            console.log('📡 Monitoring incoming messages...');
            console.log('========================================\n');
        }

        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !==
                DisconnectReason.loggedOut;

            console.log('❌ WhatsApp connection closed.');

            if (shouldReconnect) {
                console.log('🔄 Reconnecting...\n');
                startMonitor();
            } else {
                console.log('⚠️ WhatsApp logged out.');
            }
        }
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {

        if (type !== 'notify') {
            return;
        }

        for (const message of messages) {

            const remoteJid = message.key.remoteJid;

            if (!remoteJid) {
                continue;
            }

            const isGroup =
                remoteJid.endsWith('@g.us');

            const text =
                message.message?.conversation ||
                message.message?.extendedTextMessage?.text ||
                '';

            console.log('\n========================================');
            console.log('📨 NEW MESSAGE');
            console.log('========================================');

            console.log('Chat ID :', remoteJid);
            console.log(
                'Chat Type:',
                isGroup ? 'GROUP' : 'PRIVATE'
            );

            console.log(
                'Sender ID:',
                message.key.participant || '(private chat)'
            );

            console.log(
                'From Me:',
                message.key.fromMe
            );

            console.log('Message:', text);

            console.log('========================================\n');
        }
    });
}

startMonitor();