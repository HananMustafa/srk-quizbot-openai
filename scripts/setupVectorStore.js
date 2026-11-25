import 'dotenv/config';

import fs from 'fs';
import path from 'path';

import {
    openai
} from '../ai/openai.js';


// ============================================================
// CONFIGURATION
// ============================================================

const KNOWLEDGE_DIR =
    path.resolve(
        './knowledge'
    );


// ============================================================
// CHECK KNOWLEDGE DIRECTORY
// ============================================================

if (
    !fs.existsSync(
        KNOWLEDGE_DIR
    )
) {

    throw new Error(
        `Knowledge directory does not exist: ${KNOWLEDGE_DIR}`
    );

}


// ============================================================
// FIND FILES
// ============================================================

const files =
    fs
        .readdirSync(
            KNOWLEDGE_DIR
        )
        .filter(
            file =>
                file
                    .toLowerCase()
                    .endsWith('.txt')
        );


if (
    files.length === 0
) {

    throw new Error(
        'No .txt files found inside knowledge/'
    );

}


console.log(
    `📚 Found ${files.length} knowledge file(s).`
);


for (
    const file of files
) {

    console.log(
        `   • ${file}`
    );

}


// ============================================================
// CREATE VECTOR STORE
// ============================================================

console.log(
    '\n🧠 Creating OpenAI Vector Store...'
);


const vectorStore =
    await openai.vectorStores.create({

        name:
            'SRK Quiz Knowledge'

    });


console.log(
    '\n✅ Vector Store created.'
);


console.log(
    'Vector Store ID:',
    vectorStore.id
);


// ============================================================
// UPLOAD FILES
// ============================================================

for (
    const filename of files
) {

    const filepath =
        path.join(
            KNOWLEDGE_DIR,
            filename
        );


    console.log(
        `\n📤 Uploading: ${filename}`
    );


    const uploadedFile =
        await openai.files.create({

            file:
                fs.createReadStream(
                    filepath
                ),

            purpose:
                'assistants'

        });


    console.log(
        'File ID:',
        uploadedFile.id
    );


    // --------------------------------------------------------
    // ADD FILE TO VECTOR STORE
    // --------------------------------------------------------

    const vectorFile =
        await openai.vectorStores.files.create(

            vectorStore.id,

            {
                file_id:
                    uploadedFile.id
            }

        );


    console.log(
        'Vector Store file:',
        vectorFile.id
    );

}


// ============================================================
// SAVE VECTOR STORE ID
// ============================================================

console.log(
    '\n============================================================'
);

console.log(
    'VECTOR STORE CREATED'
);

console.log(
    '============================================================'
);

console.log(
    `ID: ${vectorStore.id}`
);

console.log(
    '\nAdd this ID to your .env:'
);

console.log(
    `OPENAI_VECTOR_STORE_ID=${vectorStore.id}`
);

console.log(
    '\nIMPORTANT: Files may still be processing.'
);

console.log(
    'Wait until the files finish processing before testing File Search.'
);