import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage
} from '@whiskeysockets/baileys';

import qrcode from 'qrcode-terminal';

import {
    solveQuiz
} from './ai/router.js';

import {
    resetQuizState,
    setRound,
    getRound,

    addRoundInstructionText,
    addRoundInstructionImage,

    addQuestionText,
    addQuestionImage,

    getContext,

    markAnswered,
    hasAnswered,

    getQuestionId,
    closeQuestion

} from './quiz.js';


// ============================================================
// QUIZ CONFIGURATION
// ============================================================

// Group A = SOURCE
// Bot reads host messages from this group.

// const QUIZ_GROUP_A_ID =
//     '919549268003-1497842350@g.us'; // Group A (SRK EMPIRE)

const QUIZ_GROUP_A_ID =
    '120363429972255083@g.us'; // Group A (Quiz Practice)

// const QUIZ_GROUP_A_ID =
//     '120363412882749320@g.us'; // Source (Quiz Practice)
    
    


// Group B = DESTINATION
// Bot sends AI answers to this group.
const QUIZ_GROUP_B_ID =
    '120363429972255083@g.us'; // Group B (Quiz Practice)


// Host whose messages the bot listens to.


// const QUIZ_HOST_ID =
//     '46154322571284@lid'; // mavi

// const QUIZ_HOST_ID =
//     '227903899988043@lid'; // Laksh

// const QUIZ_HOST_ID =
//     '82098350231586@lid'; // Brand Raees

const QUIZ_HOST_ID =
    '203242751393984@lid'; // Hanan

// const QUIZ_HOST_ID =
//     '126095995211821@lid'; // Chetan/Zenitsu




    


// ============================================================
// TERMINAL CONTROL STATE
// ============================================================

let pendingMessage = null;

let pendingGroupAConfirmation = null;

let terminalBusy = false;


// ============================================================
// START WHATSAPP
// ============================================================

async function startWhatsApp() {

    console.log(
        'Starting WhatsApp connection...'
    );


    const {
        state,
        saveCreds
    } =
        await useMultiFileAuthState('./auth');


    const sock =
        makeWASocket({

            auth: state,

            printQRInTerminal: false

        });

    currentSocket = sock;


    // ========================================================
    // SAVE AUTH
    // ========================================================

    sock.ev.on(
        'creds.update',
        saveCreds
    );


    // ========================================================
    // CONNECTION
    // ========================================================

    sock.ev.on(
        'connection.update',
        async (update) => {

            const {
                connection,
                lastDisconnect,
                qr
            } = update;


            if (qr) {

                console.log(
                    '\nScan this QR code with WhatsApp:\n'
                );

                qrcode.generate(
                    qr,
                    {
                        small: true
                    }
                );

            }


            if (
                connection === 'open'
            ) {

                console.log(
                    '\n========================================'
                );

                console.log(
                    '✅ WHATSAPP CONNECTED'
                );

                console.log(
                    '========================================'
                );

                console.log(
                    'Source Group (A):',
                    QUIZ_GROUP_A_ID
                );

                console.log(
                    'Response Group (B):',
                    QUIZ_GROUP_B_ID
                );

                console.log(
                    'Quiz Host        :',
                    QUIZ_HOST_ID
                );

                console.log(
                    '========================================'
                );

                console.log(
                    '\n🎮 TERMINAL CONTROL READY'
                );

                console.log(
                    'r = reject'
                );

                console.log(
                    'h = hold'
                );

                console.log(
                    'i = round instruction'
                );

                console.log(
                    's = send to AI'
                );

                console.log(
                    '========================================\n'
                );

            }


            if (
                connection === 'close'
            ) {

                const shouldReconnect =
                    lastDisconnect
                        ?.error
                        ?.output
                        ?.statusCode !==
                    DisconnectReason.loggedOut;


                console.log(
                    '❌ WhatsApp connection closed.'
                );


                if (
                    shouldReconnect
                ) {

                    console.log(
                        '🔄 Reconnecting...\n'
                    );

                    startWhatsApp();

                } else {

                    console.log(
                        '⚠️ WhatsApp logged out.'
                    );

                }

            }

        }
    );


    // ========================================================
    // INCOMING MESSAGES
    // ========================================================

    sock.ev.on(
        'messages.upsert',
        async ({
            messages,
            type
        }) => {

            if (
                type !== 'notify'
            ) {

                return;

            }


            for (
                const message of messages
            ) {

                const remoteJid =
                    message.key.remoteJid;


                if (!remoteJid) {
                    continue;
                }


                // ------------------------------------------------
                // ONLY GROUP
                // ------------------------------------------------

                if (
                    !remoteJid.endsWith('@g.us')
                ) {

                    continue;

                }


                // ------------------------------------------------
                // ONLY QUIZ GROUP
                // ------------------------------------------------

                if (remoteJid !== QUIZ_GROUP_A_ID) {
                        continue;
                }


                // ------------------------------------------------
                // HOST
                // ------------------------------------------------

                const sender =
                    message.key.participant ||
                    '';


                if (
                    sender !== QUIZ_HOST_ID
                ) {

                    continue;

                }


                if (
                    !message.message
                ) {

                    continue;

                }


                // =================================================
                // TEXT
                // =================================================

                const text =
                    message.message?.conversation ||
                    message.message
                        ?.extendedTextMessage
                        ?.text ||
                    '';


                // =================================================
                // STOP
                // =================================================

                if (
                    isStopMessage(text)
                ) {

                    console.log(
                        '\n🛑 HOST STOPPED QUESTION'
                    );


                    closeQuestion();


                    console.log(
                        '🧹 Current question cleared.'
                    );

                    console.log(
                        '📌 Round instructions preserved.'
                    );

                    console.log(
                        '⏳ Waiting for next question...\n'
                    );


                    // ------------------------------------------------
                    // If a terminal message is waiting,
                    // discard it.
                    // ------------------------------------------------

                    pendingMessage = null;


                    continue;

                }


                // =================================================
                // ROUND
                // =================================================

                const round =
                    detectRound(text);


                if (
                    round !== null
                ) {

                    console.log(
                        `\n🎯 ROUND ${round} STARTED`
                    );


                    setRound(round);


                    console.log(
                        '🧹 Previous round context cleared.'
                    );

                    console.log(
                        '📌 New round instructions ready.'
                    );

                    console.log(
                        '========================================\n'
                    );


                    continue;

                }


                // =================================================
                // QUIZ FINISHED
                // =================================================

                if (
                    isQuizFinishedMessage(text)
                ) {

                    resetQuizState();


                    console.log(
                        '\n🏁 QUIZ FINISHED\n'
                    );


                    continue;

                }


                // =================================================
                // ALREADY ANSWERED
                // =================================================

                if (
                    hasAnswered()
                ) {

                    console.log(
                        '⏭️ Ignoring message because question already answered.'
                    );

                    continue;

                }


                // =================================================
                // TEXT MESSAGE
                // =================================================

                if (
                    text
                ) {

                    await handleTextMessage(
                        text
                    );


                    continue;

                }


                // =================================================
                // IMAGE MESSAGE
                // =================================================

                const imageMessage =
                    message.message?.imageMessage;


                if (
                    imageMessage
                ) {

                    await handleImageMessage(
                        sock,
                        message,
                        imageMessage
                    );

                }

            }

        }
    );

}


// ============================================================
// HANDLE TEXT MESSAGE
// ============================================================

async function handleTextMessage(text) {

    console.log(
        '\n========================================'
    );

    console.log(
        '🎯 HOST MESSAGE'
    );

    console.log(
        '========================================'
    );

    console.log(
        text
    );

    console.log(
        '========================================'
    );


    await requestTerminalAction({

        type: 'text',

        text

    });

}


// ============================================================
// HANDLE IMAGE MESSAGE
// ============================================================

async function handleImageMessage(

    sock,

    message,

    imageMessage

) {

    console.log(
        '\n========================================'
    );

    console.log(
        '🖼️ HOST IMAGE'
    );

    console.log(
        '========================================'
    );

    console.log(
        'Caption:',
        imageMessage.caption ||
        '(none)'
    );

    console.log(
        'MIME:',
        imageMessage.mimetype
    );

    console.log(
        'Size:',
        `${imageMessage.width}x${imageMessage.height}`
    );


    try {

        console.log(
            '\nDownloading image...'
        );


        const imageBuffer =
            await downloadMediaMessage(

                message,

                'buffer',

                {},

                {
                    reuploadRequest:
                        sock.updateMediaMessage
                }

            );


        const base64 =
            imageBuffer.toString(
                'base64'
            );


        console.log(
            '✅ Image downloaded!'
        );

        console.log(
            'Image size:',
            imageBuffer.length,
            'bytes'
        );


        await requestTerminalAction({

            type: 'image',

            base64,

            mimetype:
                imageMessage.mimetype ||
                'image/jpeg',

            caption:
                imageMessage.caption ||
                ''

        });


    } catch (error) {

        console.error(
            '❌ Failed to download image:'
        );

        console.error(
            error
        );

    }


    console.log(
        '========================================\n'
    );

}


// ============================================================
// TERMINAL ACTION REQUEST
// ============================================================

async function requestTerminalAction(message) {

    pendingMessage = message;


    console.log(
        '\n----------------------------------------'
    );

    console.log(
        'ACTION?'
    );

    console.log(
        '[r] Reject'
    );

    console.log(
        '[h] Hold'
    );

    console.log(
        '[i] Round instruction'
    );

    console.log(
        '[s] Send to AI'
    );

    console.log(
        '----------------------------------------'
    );

    process.stdout.write(
        'Enter action: '
    );


    // If terminal is not already listening,
    // start the key listener.
    startTerminalListener();

}


// ============================================================
// TERMINAL LISTENER
// ============================================================

let terminalListenerStarted = false;


function startTerminalListener() {

    if (
        terminalListenerStarted
    ) {

        return;

    }


    terminalListenerStarted = true;


    process.stdin.setEncoding(
        'utf8'
    );


    process.stdin.resume();


    process.stdin.on(
        'data',
        async (input) => {

            const action =
                input
                    .trim()
                    .toLowerCase();


            // ========================================================
            // GROUP A CONFIRMATION — MUST BE CHECKED FIRST
            // ========================================================

            if (pendingGroupAConfirmation !== null) {

                if (!['y', 'n'].includes(action)) {

                    console.log('\n⚠️ Invalid response.');
                    console.log('Please enter y or n.');

                    process.stdout.write(
                        'Send to Group A? (y/n): '
                    );

                    return;
                }

                const answer = pendingGroupAConfirmation;

                pendingGroupAConfirmation = null;

                if (action === 'y') {

                    try {

                        await currentSocket.sendMessage(
                            QUIZ_GROUP_A_ID,
                            {
                                text: answer
                            }
                        );

                        console.log(
                            '\n✅ ANSWER ALSO SENT TO GROUP A'
                        );

                    } catch (error) {

                        console.error(
                            '\n❌ Failed to send answer to Group A:'
                        );

                        console.error(error);

                    }

                } else {

                    console.log(
                        '\n⏭️ Answer NOT sent to Group A.'
                    );

                }

                console.log(
                    '----------------------------------------\n'
                );

                return;
            }


            // ========================================================
            // NORMAL TERMINAL ACTION VALIDATION
            // ========================================================

            if (
                !['r', 'h', 'i', 's'].includes(action)
            ) {

                console.log(
                    '\n⚠️ Invalid action.'
                );

                console.log(
                    'Use r, h, i or s.'
                );

                process.stdout.write(
                    'Enter action: '
                );

                return;
            }


            if (
                !pendingMessage
            ) {

                console.log(
                    '\n⚠️ No pending message.'
                );

                return;

            }


            const message =
                pendingMessage;


            pendingMessage = null;


            await processTerminalAction(
                action,
                message
            );

        }
    );

}


// ============================================================
// PROCESS TERMINAL ACTION
// ============================================================

async function processTerminalAction(

    action,

    message

) {

    // ========================================================
    // REJECT
    // ========================================================

    if (
        action === 'r'
    ) {

        console.log(
            '\n❌ MESSAGE REJECTED'
        );

        console.log(
            'Nothing added to AI context.'
        );

        console.log(
            '----------------------------------------\n'
        );

        return;

    }


    // ========================================================
    // ROUND INSTRUCTION
    // ========================================================

    if (
        action === 'i'
    ) {

        if (
            message.type === 'text'
        ) {

            addRoundInstructionText(
                message.text
            );

        }

        else if (
            message.type === 'image'
        ) {

            addRoundInstructionImage({

                base64:
                    message.base64,

                mimetype:
                    message.mimetype,

                caption:
                    message.caption

            });

        }


        console.log(
            '\n📌 SAVED AS ROUND INSTRUCTION'
        );

        console.log(
            'This will be included with every question in this round.'
        );

        console.log(
            '----------------------------------------\n'
        );

        return;

    }


    // ========================================================
    // HOLD
    // ========================================================

    if (
        action === 'h'
    ) {

        if (
            message.type === 'text'
        ) {

            addQuestionText(
                message.text
            );

        }

        else if (
            message.type === 'image'
        ) {

            addQuestionImage({

                base64:
                    message.base64,

                mimetype:
                    message.mimetype,

                caption:
                    message.caption

            });

        }


        console.log(
            '\n⏸️ MESSAGE ACCEPTED AND HELD'
        );

        console.log(
            'It will NOT be sent to AI yet.'
        );

        console.log(
            '----------------------------------------\n'
        );

        return;

    }


    // ========================================================
    // SEND
    // ========================================================

    if (
        action === 's'
    ) {

        if (
            message.type === 'text'
        ) {

            addQuestionText(
                message.text
            );

        }

        else if (
            message.type === 'image'
        ) {

            addQuestionImage({

                base64:
                    message.base64,

                mimetype:
                    message.mimetype,

                caption:
                    message.caption

            });

        }


        await processCurrentQuestion();

    }

}


// ============================================================
// PROCESS QUESTION
// ============================================================

async function processCurrentQuestion() {

    if (
        terminalBusy
    ) {

        console.log(
            '\n⚠️ AI is already processing another question.'
        );

        console.log(
            'Please wait for the current AI response.'
        );

        return;

    }


    const context =
        getContext();


    if (
        context.length === 0
    ) {

        console.log(
            '\n⚠️ No accepted context to send to AI.'
        );

        return;

    }


    terminalBusy = true;


    // --------------------------------------------------------
    // IMPORTANT:
    //
    // Save the question ID BEFORE calling AI.
    // --------------------------------------------------------

    const requestQuestionId =
        getQuestionId();


    try {

        const answer =
            await solveQuiz(

                context,
                getRound()

            );


        // ====================================================
        // CHECK FOR LATE RESPONSE
        // ====================================================

        if (
            requestQuestionId !==
            getQuestionId()
        ) {

            console.log(
                '\n⚠️ LATE AI RESPONSE'
            );

            console.log(
                'Question was already closed.'
            );

            console.log(
                '🚫 Response will NOT be sent to WhatsApp.'
            );

            return;

        }


        // ====================================================
        // API ERROR
        // ====================================================

        if (
            answer === null
        ) {

            console.log(
                '⚠️ AI request failed.'
            );

            console.log(
                'No WhatsApp message sent.'
            );

            return;

        }


        // ====================================================
        // NULL
        // ====================================================

        // Displaying NULL on terminal and sending it to Group B
        if (answer === 'NULL') {

            displayAnswerPanel(
                'No answer found.\nSending NULL to Group B only.',
                'null'
            );

            try {
                await currentSocket.sendMessage(QUIZ_GROUP_B_ID, {
                    text: 'Null'
                });

                console.log('📨 NULL sent to Group B.');

            } catch (error) {
                console.error('❌ Failed to send NULL to Group B:');
                console.error(error);
            }

            return;
        }


        // ====================================================
        // ANSWER
        // ====================================================

        //DISPLAY ANSWER ON TERMINAL
        displayAnswerPanel(answer);


        markAnswered();


        // ====================================================
        // SEND WHATSAPP
        // ====================================================

        // try {

        //     await sendAnswerToWhatsApp(
        //         answer
        //     );

        // } catch (error) {

        //     console.error(
        //         '❌ Failed to send answer:'
        //     );

        //     console.error(
        //         error
        //     );

        // }
        try {

        // First, send the answer to Group B.
        await sendAnswerToWhatsApp(answer);

        // ----------------------------------------------------
        // CHECK WHETHER GROUP A AND GROUP B ARE THE SAME
        // ----------------------------------------------------

        if (QUIZ_GROUP_A_ID === QUIZ_GROUP_B_ID) {

            console.log(
                '\nℹ️ Group A and Group B are the same group.'
            );

            console.log(
                'Answer is already available in Group A.'
            );

        } else {

            // ------------------------------------------------
            // ASK WHETHER TO SEND THE SAME ANSWER TO GROUP A
            // ------------------------------------------------

            pendingGroupAConfirmation = answer;

            console.log(
                '\n----------------------------------------'
            );

            console.log(
                '📨 ANSWER SENT TO GROUP B'
            );

            console.log(
                'Send the same answer to Group A as well?'
            );

            process.stdout.write(
                'Enter y or n: '
            );

        }

    } catch (error) {

        console.error(
            '❌ Failed to send answer:'
        );

        console.error(error);

    }


    } finally {

        terminalBusy = false;

    }

}


// ============================================================
// SEND ANSWER
// ============================================================

// COLORFUL AND BOLD ANSWER


function displayAnswerPanel(answer, type = 'success') {

    const RESET = '\x1b[0m';
    const BOLD = '\x1b[1m';
    const CYAN = '\x1b[96m';
    const GREEN = '\x1b[92m';
    const YELLOW = '\x1b[93m';
    const RED = '\x1b[91m';

    const width = 56;

    const border = '═'.repeat(width);

    const isNull = type === 'null';

    const heading = isNull
        ? ' AI COULD NOT FIND AN ANSWER '
        : ' AI GENERATED ANSWER ';

    const answerColor = isNull ? RED : GREEN;

    const lines = String(answer).split('\n');

    console.log('\n');

    console.log(
        `${CYAN}${BOLD}╔${border}╗${RESET}`
    );

    console.log(
        `${CYAN}${BOLD}║${RESET}${YELLOW}${BOLD}${heading.padEnd(width)}${RESET}${CYAN}${BOLD}║${RESET}`
    );

    console.log(
        `${CYAN}${BOLD}╠${border}╣${RESET}`
    );

    for (const line of lines) {

        console.log(
            `${CYAN}${BOLD}║${RESET}  ${answerColor}${BOLD}${line}${RESET}`
        );

    }

    console.log(
        `${CYAN}${BOLD}╚${border}╝${RESET}`
    );

    console.log('\n');
}




let currentSocket = null;


async function sendAnswerToWhatsApp(
    answer
) {

    if (
        !currentSocket
    ) {

        throw new Error(
            'WhatsApp socket is not available.'
        );

    }


    await currentSocket.sendMessage(

        QUIZ_GROUP_B_ID,

        {
            text: answer
        }

    );


    console.log(
        '✅ ANSWER SENT TO GROUP B'
    );

    console.log(
        'Destination:',
        QUIZ_GROUP_B_ID
    );

}


// ============================================================
// DETECT ROUND
// ============================================================
//
// Supports:
//
// Round 1
// ROUND 1
// round 1
// *Round 1*
// *ROUND 1*
// **Round 1**
//
// Also supports any round number.
// Round 10, Round 25, etc.
//
// ============================================================

function detectRound(text) {

    if (!text) {

        return null;

    }


    const normalized =
        text
            .trim()
            .replace(/[*_~`]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();


    const match =
        normalized.match(
            /^round\s+(\d+)\b/
        );


    if (!match) {

        return null;

    }


    return Number(
        match[1]
    );

}


// // ============================================================
// // STOP DETECTION
// // ============================================================
// //
// // Supports:
// //
// // Stop
// // stop
// // STOP
// // *Stop*
// // *STOP*
// // **STOP**
// // * *STOP* *
// // etc.
// //
// // We remove WhatsApp formatting characters first.
// //
// // ============================================================

// function isStopMessage(text) {

//     if (!text) {

//         return false;

//     }


//     const normalized =
//         text
//             .trim()
//             .replace(/[*_~`]/g, '')
//             .replace(/[.!！。]+$/g, '')
//             .replace(/\s+/g, ' ')
//             .trim()
//             .toLowerCase();


//     return (
//         normalized === 'stop'
//     );

// }
// ============================================================
// STOP DETECTION
// ============================================================
//
// Any message that:
//   1. Contains the word "stop" (case-insensitive)
//   2. Is 10 characters or less
//
// will be considered a STOP command.
//
// Examples:
//   Stop
//   STOP
//   stop
//   *Stop..*
//   Stop kro
//   ~Stop
//   #stop#
//   *#Stop...*
//
// ============================================================

function isStopMessage(text) {

    if (!text) {

        return false;

    }


    const normalized =
        text
            .trim()
            .toLowerCase();


    // --------------------------------------------------------
    // Maximum 10 characters
    // --------------------------------------------------------

    if (normalized.length > 10) {

        return false;

    }


    // --------------------------------------------------------
    // Must contain "stop"
    // --------------------------------------------------------

    return normalized.includes('stop');

}


// ============================================================
// QUIZ FINISHED
// ============================================================

function isQuizFinishedMessage(text) {

    if (!text) {

        return false;

    }


    const normalized =
        text
            .trim()
            .replace(/[*_~`]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();


    return (

        normalized ===
        'thank you for participating'

        ||

        normalized ===
        'thank you'

    );

}


// ============================================================
// START
// ============================================================

startWhatsApp()
    .then(() => {

        // Socket is assigned inside startWhatsApp below.

    });