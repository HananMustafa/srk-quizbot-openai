import 'dotenv/config';

import {
    openai,
    FAST_MODEL
} from '../ai/openai.js';


// ============================================================
// VECTOR STORE
// ============================================================

const VECTOR_STORE_ID =
    process.env.OPENAI_VECTOR_STORE_ID;


if (!VECTOR_STORE_ID) {

    throw new Error(
        'OPENAI_VECTOR_STORE_ID is missing from .env'
    );

}


// ============================================================
// WAIT FOR VECTOR STORE FILES
// ============================================================

async function waitForFiles() {

    console.log(
        '\n🔎 Checking Vector Store files...'
    );


    const maxAttempts = 30;

    const delay =
        2000;


    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        const files =
            await openai.vectorStores.files.list(
                VECTOR_STORE_ID
            );


        const fileList =
            files.data;


        console.log(
            `Attempt ${attempt}/${maxAttempts}`
        );


        if (
            fileList.length === 0
        ) {

            console.log(
                '⚠️ No files found in Vector Store.'
            );

            await sleep(
                delay
            );

            continue;

        }


        const statuses =
            fileList.map(
                file =>
                    file.status
            );


        console.log(
            'Statuses:',
            statuses.join(', ')
        );


        const hasFailed =
            fileList.some(
                file =>
                    file.status ===
                    'failed'
            );


        if (
            hasFailed
        ) {

            throw new Error(
                'One or more Vector Store files failed to process.'
            );

        }


        const allCompleted =
            fileList.every(
                file =>
                    file.status ===
                    'completed'
            );


        if (
            allCompleted
        ) {

            console.log(
                '✅ All Vector Store files are ready.'
            );

            return;

        }


        console.log(
            '⏳ Files are still processing...'
        );


        await sleep(
            delay
        );

    }


    throw new Error(
        'Timed out waiting for Vector Store files to finish processing.'
    );

}


// ============================================================
// SLEEP
// ============================================================

function sleep(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );

}


// ============================================================
// FILE SEARCH TEST
// ============================================================

async function testFileSearch() {

    console.log(
        '\n🔎 Testing OpenAI File Search...'
    );


    const question =
        'Which character did Shah Rukh Khan play in Swades?';


    console.log(
        'Question:',
        question
    );


    const startTime =
        Date.now();


    const response =
        await openai.responses.create({

            model:
                FAST_MODEL,

            reasoning: {
                effort: 'none'
            },

            instructions: `

You are testing an SRK knowledge retrieval system.

Answer the user's question using the provided
File Search knowledge.

Use only information supported by the retrieved
knowledge.

Return only the final answer.

Do not explain your reasoning.

If the retrieved knowledge does not contain
the answer, return NULL.

`,

            tools: [

                {

                    type:
                        'file_search',

                    vector_store_ids: [

                        VECTOR_STORE_ID

                    ],

                    max_num_results:
                        5

                }

            ],

            input:
                question,

            max_output_tokens:
                100

        });


    const elapsed =
        Date.now() -
        startTime;


    console.log(
        `\n⏱️ Response time: ${elapsed} ms`
    );


    console.log(
        '\n📄 Output:'
    );


    console.log(
        response.output_text ||
        'EMPTY'
    );


    // --------------------------------------------------------
    // SHOW FILE SEARCH TOOL CALL
    // --------------------------------------------------------

    const fileSearchCalls =
        response.output.filter(
            item =>
                item.type ===
                'file_search_call'
        );


    console.log(
        '\n🔍 File Search calls:',
        fileSearchCalls.length
    );


    for (
        const call of fileSearchCalls
    ) {

        console.log(
            'Search call:',
            call
        );

    }


    console.log(
        '\n✅ File Search test completed.'
    );

}


// ============================================================
// MAIN
// ============================================================

async function main() {

    console.log(
        '============================================================'
    );

    console.log(
        'SRK FILE SEARCH TEST'
    );

    console.log(
        '============================================================'
    );

    console.log(
        'Vector Store:',
        VECTOR_STORE_ID
    );


    await waitForFiles();


    await testFileSearch();

}


main()
    .catch(
        error => {

            console.error(
                '\n❌ File Search test failed:'
            );


            console.error(
                error?.message ||
                error
            );


            process.exit(
                1
            );

        }
    );