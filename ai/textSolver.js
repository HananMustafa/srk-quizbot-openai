import {
    openai,
    FAST_MODEL,
    FILE_SEARCH_ENABLED,
    VECTOR_STORE_ID
} from './openai.js';

import {
    SRK_SYSTEM_PROMPT
} from './prompts.js';

import {
    DATABASE_TOOLS,
    executeDatabaseTool
} from './databaseTools.js';

// File Search
import {
    createFileSearchTool
} from './fileSearchTools.js';


// ============================================================
// MAXIMUM DATABASE TOOL CALLS
// ============================================================

const MAX_DATABASE_CALLS = 3;


// ============================================================
// BUILD TOOLS
// ============================================================

function buildTools() {

    const tools = [
        ...DATABASE_TOOLS
    ];


    if (
        FILE_SEARCH_ENABLED
    ) {

        tools.push(
            createFileSearchTool()
        );

    }


    return tools;

}


// ============================================================
// BUILD INPUT
// ============================================================

function buildInput(
    contextMessages,
    currentRound
) {

    const inputParts = [];


    inputParts.push(
        `Current quiz round: ${currentRound ?? 'Unknown'}`
    );


    if (
        FILE_SEARCH_ENABLED
    ) {

        inputParts.push(
            'File Search is available for SRK knowledge that is not available through the structured database.'
        );

    }


    for (
        const message of contextMessages
    ) {

        if (
            message.type === 'text'
        ) {

            inputParts.push(
                message.text
            );

        }

        else if (
            message.type === 'image'
        ) {

            inputParts.push(
                '[IMAGE QUESTION — image analysis will be implemented in the Image stage]'
            );


            if (
                message.caption
            ) {

                inputParts.push(
                    `Image caption: ${message.caption}`
                );

            }

        }

    }


    return inputParts.join(
        '\n\n'
    );

}


// ============================================================
// SOLVE TEXT QUESTION
// ============================================================

export async function solveTextQuestion(
    contextMessages,
    currentRound
) {

    const startTime =
        Date.now();


    const input =
        buildInput(
            contextMessages,
            currentRound
        );


    const tools =
        buildTools();


    // ========================================================
    // SOURCE TRACKING
    // ========================================================

    let databaseCalls = 0;

    let fileSearchCalls = 0;

    let usedDirectFastGPT = false;


    // ========================================================
    // STARTUP LOG
    // ========================================================

    console.log(
        '\n============================================================'
    );

    console.log(
        '🤖 OPENAI QUIZ SOLVER'
    );

    console.log(
        '============================================================'
    );

    console.log(
        'Model:',
        FAST_MODEL
    );

    console.log(
        'Database tools:',
        DATABASE_TOOLS.length
    );

    console.log(
        'File Search:',
        FILE_SEARCH_ENABLED
            ? 'ENABLED'
            : 'DISABLED'
    );


    // ========================================================
    // INITIAL REQUEST
    // ========================================================

    try {

        console.log(
            '\n📤 Sending question to Fast GPT...'
        );


        let response =
            await openai.responses.create({

                model:
                    FAST_MODEL,

                reasoning: {
                    effort: 'none'
                },

                instructions:
                    SRK_SYSTEM_PROMPT,

                tools,

                input,

                max_output_tokens:
                    300

            });


        // ====================================================
        // CHECK SOURCES USED BY INITIAL RESPONSE
        // ====================================================

        const initialFileSearchCalls =
            response.output.filter(
                item =>
                    item.type ===
                    'file_search_call'
            );


        if (
            initialFileSearchCalls.length > 0
        ) {

            fileSearchCalls +=
                initialFileSearchCalls.length;


            console.log(
                '\n📚 SOURCE: FILE SEARCH'
            );

            console.log(
                'Vector Store:',
                VECTOR_STORE_ID
            );


            for (
                const call
                of initialFileSearchCalls
            ) {

                console.log(
                    'File Search ID:',
                    call.id
                );

                console.log(
                    'Status:',
                    call.status
                );

            }

        }


        // ====================================================
        // TOOL LOOP
        // ====================================================

        while (
            true
        ) {

            const functionCalls =
                response.output.filter(
                    item =>
                        item.type ===
                        'function_call'
                );


            // ------------------------------------------------
            // NO DATABASE FUNCTION CALLS
            // ------------------------------------------------

            if (
                functionCalls.length === 0
            ) {

                break;

            }


            // ------------------------------------------------
            // DATABASE CALL LIMIT
            // ------------------------------------------------

            if (
                databaseCalls +
                functionCalls.length >
                MAX_DATABASE_CALLS
            ) {

                console.log(
                    '\n⚠️ Maximum database tool calls reached.'
                );

                break;

            }


            const toolOutputs = [];


            // ------------------------------------------------
            // EXECUTE DATABASE TOOLS
            // ------------------------------------------------

            for (
                const call
                of functionCalls
            ) {

                databaseCalls++;


                console.log(
                    '\n🗄️ SOURCE: DATABASE'
                );

                console.log(
                    'Tool:',
                    call.name
                );

                console.log(
                    'Arguments:',
                    call.arguments
                );


                try {

                    const argumentsObject =
                        JSON.parse(
                            call.arguments
                        );


                    const result =
                        executeDatabaseTool(
                            call.name,
                            argumentsObject
                        );


                    console.log(
                        'Database results:',
                        Array.isArray(result)
                            ? result.length
                            : result
                                ? 1
                                : 0
                    );


                    toolOutputs.push({

                        type:
                            'function_call_output',

                        call_id:
                            call.call_id,

                        output:
                            JSON.stringify(
                                result ?? null
                            )

                    });

                }

                catch (toolError) {

                    console.error(
                        '❌ Database tool failed:',
                        toolError.message
                    );


                    toolOutputs.push({

                        type:
                            'function_call_output',

                        call_id:
                            call.call_id,

                        output:
                            JSON.stringify({

                                error:
                                    toolError.message

                            })

                    });

                }

            }


            // ------------------------------------------------
            // SEND TOOL RESULTS BACK TO OPENAI
            // ------------------------------------------------

            console.log(
                '\n📤 Sending database results back to Fast GPT...'
            );


            response =
                await openai.responses.create({

                    model:
                        FAST_MODEL,

                    reasoning: {
                        effort: 'none'
                    },

                    instructions:
                        SRK_SYSTEM_PROMPT,

                    tools,

                    input: [

                        {
                            role: 'user',
                            content: input
                        },

                        ...response.output,

                        ...toolOutputs

                    ],

                    max_output_tokens:
                        300

                });


            // ------------------------------------------------
            // CHECK FILE SEARCH AFTER DATABASE CALL
            // ------------------------------------------------

            const newFileSearchCalls =
                response.output.filter(
                    item =>
                        item.type ===
                        'file_search_call'
                );


            if (
                newFileSearchCalls.length > 0
            ) {

                fileSearchCalls +=
                    newFileSearchCalls.length;


                console.log(
                    '\n📚 SOURCE: FILE SEARCH'
                );

                console.log(
                    'Vector Store:',
                    VECTOR_STORE_ID
                );


                for (
                    const call
                    of newFileSearchCalls
                ) {

                    console.log(
                        'File Search ID:',
                        call.id
                    );

                    console.log(
                        'Status:',
                        call.status
                    );

                }

            }

        }


        // ====================================================
        // DETERMINE DIRECT FAST GPT
        // ====================================================

        if (
            databaseCalls === 0 &&
            fileSearchCalls === 0
        ) {

            usedDirectFastGPT =
                true;


            console.log(
                '\n⚡ SOURCE: FAST GPT'
            );

        }


        // ====================================================
        // FINAL ANSWER
        // ====================================================

        let answer =
            response.output_text
                ?.trim();


        if (
            !answer
        ) {

            console.log(
                '⚠️ OpenAI returned an empty response.'
            );

            return 'NULL';

        }


        // ----------------------------------------------------
        // CLEAN MARKDOWN CODE FENCES
        // ----------------------------------------------------

        answer =
            answer
                .replace(
                    /^```[a-zA-Z]*\s*/i,
                    ''
                )
                .replace(
                    /\s*```$/i,
                    ''
                )
                .trim();


        // ====================================================
        // FINAL SOURCE SUMMARY
        // ====================================================

        const elapsed =
            Date.now() -
            startTime;


        console.log(
            '\n============================================================'
        );

        console.log(
            '✅ ANSWER READY'
        );

        console.log(
            '============================================================'
        );


        if (
            usedDirectFastGPT
        ) {

            console.log(
                'Source: ⚡ Fast GPT'
            );

        }
        else {

            if (
                databaseCalls > 0
            ) {

                console.log(
                    'Source: 🗄️ Database'
                );

            }


            if (
                fileSearchCalls > 0
            ) {

                console.log(
                    'Source: 📚 File Search'
                );

            }

        }


        console.log(
            'Database calls:',
            databaseCalls
        );

        console.log(
            'File Search calls:',
            fileSearchCalls
        );

        console.log(
            `Response time: ${elapsed} ms`
        );

        console.log(
            'Answer:',
            answer
        );

        console.log(
            '============================================================\n'
        );


        return answer;

    }

    catch (error) {

        const elapsed =
            Date.now() -
            startTime;


        console.error(
            '\n❌ OpenAI request failed after',
            `${elapsed} ms`
        );


        console.error(
            error?.message ||
            error
        );


        return 'NULL';

    }

}