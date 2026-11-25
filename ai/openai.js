import 'dotenv/config';

import OpenAI from 'openai';


// ============================================================
// OPENAI CLIENT
// ============================================================

const apiKey =
    process.env.OPENAI_API_KEY;


if (!apiKey) {

    throw new Error(
        'OPENAI_API_KEY is missing from .env'
    );

}


export const openai =
    new OpenAI({

        apiKey

    });


// ============================================================
// MODELS
// ============================================================

export const FAST_MODEL =
    process.env.OPENAI_FAST_MODEL ||
    'gpt-6-luna';


export const DEEP_MODEL =
    process.env.OPENAI_DEEP_MODEL ||
    'gpt-6.1-sol';


// ============================================================
// VECTOR STORE / FILE SEARCH
// ============================================================

export const VECTOR_STORE_ID =
    process.env.OPENAI_VECTOR_STORE_ID ||
    '';


export const FILE_SEARCH_ENABLED =
    (
        process.env.OPENAI_FILE_SEARCH_ENABLED ||
        'false'
    ).toLowerCase() === 'true';


// ============================================================
// STARTUP INFORMATION
// ============================================================

console.log(
    '🤖 OpenAI initialized'
);

console.log(
    'Fast model:',
    FAST_MODEL
);

console.log(
    'Deep model:',
    DEEP_MODEL
);

console.log(
    'File Search:',
    FILE_SEARCH_ENABLED
        ? 'ENABLED'
        : 'DISABLED'
);

if (
    FILE_SEARCH_ENABLED &&
    !VECTOR_STORE_ID
) {

    console.warn(
        '⚠️ File Search is enabled but OPENAI_VECTOR_STORE_ID is missing.'
    );

}