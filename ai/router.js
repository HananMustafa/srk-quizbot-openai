import {
    solveTextQuestion
} from './textSolver.js';


// ============================================================
// AI ROUTER
// ============================================================

export async function solveQuiz(
    contextMessages,
    currentRound
) {

    return await solveTextQuestion(
        contextMessages,
        currentRound
    );

}