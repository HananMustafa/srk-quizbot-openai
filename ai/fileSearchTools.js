import {
    VECTOR_STORE_ID
} from './openai.js';


// ============================================================
// FILE SEARCH TOOL
// ============================================================

export function createFileSearchTool() {

    if (
        !VECTOR_STORE_ID
    ) {

        throw new Error(
            'OPENAI_VECTOR_STORE_ID is missing.'
        );

    }


    return {

        type:
            'file_search',

        vector_store_ids: [

            VECTOR_STORE_ID

        ],

        max_num_results:
            5

    };

}