// ============================================================
// QUIZ STATE
// ============================================================

const quizState = {

    round: null,

    // Messages marked with "i"
    // These stay for the entire round.
    roundInstructions: [],

    // Messages marked with "h" or "s"
    // These belong only to the current question.
    questionMessages: [],

    // True after an answer has been successfully sent.
    answered: false,

    // Changes every time a question is closed.
    // Used to invalidate late AI responses.
    questionId: 0

};


// ============================================================
// RESET ENTIRE QUIZ
// ============================================================

export function resetQuizState() {

    quizState.round = null;

    quizState.roundInstructions = [];

    quizState.questionMessages = [];

    quizState.answered = false;

    quizState.questionId++;

}


// ============================================================
// START NEW ROUND
// ============================================================

export function setRound(roundNumber) {

    quizState.round = roundNumber;

    // New round = remove previous round instructions.
    quizState.roundInstructions = [];

    // Also remove current question.
    quizState.questionMessages = [];

    quizState.answered = false;

    quizState.questionId++;

}


// ============================================================
// GET ROUND
// ============================================================

export function getRound() {

    return quizState.round;

}


// ============================================================
// ADD ROUND INSTRUCTION
// ============================================================

export function addRoundInstruction(message) {

    quizState.roundInstructions.push(message);

}


// ============================================================
// ADD QUESTION MESSAGE
// ============================================================

export function addQuestionMessage(message) {

    quizState.questionMessages.push(message);

}


// ============================================================
// ADD TEXT AS ROUND INSTRUCTION
// ============================================================

export function addRoundInstructionText(text) {

    addRoundInstruction({

        type: 'text',

        text

    });

}


// ============================================================
// ADD TEXT AS QUESTION MESSAGE
// ============================================================

export function addQuestionText(text) {

    addQuestionMessage({

        type: 'text',

        text

    });

}


// ============================================================
// ADD IMAGE AS ROUND INSTRUCTION
// ============================================================

export function addRoundInstructionImage({

    base64,

    mimetype,

    caption = ''

}) {

    addRoundInstruction({

        type: 'image',

        base64,

        mimetype,

        caption

    });

}


// ============================================================
// ADD IMAGE AS QUESTION MESSAGE
// ============================================================

export function addQuestionImage({

    base64,

    mimetype,

    caption = ''

}) {

    addQuestionMessage({

        type: 'image',

        base64,

        mimetype,

        caption

    });

}


// ============================================================
// GET AI CONTEXT
// ============================================================
//
// AI receives:
//
// ROUND INSTRUCTIONS
// +
// CURRENT QUESTION
//
// ============================================================

export function getContext() {

    return [

        ...quizState.roundInstructions,

        ...quizState.questionMessages

    ];

}


// ============================================================
// MARK ANSWERED
// ============================================================

export function markAnswered() {

    quizState.answered = true;

}


// ============================================================
// CHECK ANSWERED
// ============================================================

export function hasAnswered() {

    return quizState.answered;

}


// ============================================================
// GET QUESTION ID
// ============================================================
//
// Every question gets a unique ID.
//
// If STOP arrives while AI is processing,
// the question ID changes and the old response
// becomes invalid.
// ============================================================

export function getQuestionId() {

    return quizState.questionId;

}


// ============================================================
// CLOSE CURRENT QUESTION
// ============================================================
//
// IMPORTANT:
//
// Do NOT remove round instructions.
// Only remove the current question.
// ============================================================

export function closeQuestion() {

    quizState.questionMessages = [];

    quizState.answered = false;

    quizState.questionId++;

}