import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import vm from 'vm';


// ============================================================
// PATHS
// ============================================================

const DB_PATH =
    path.resolve(
        'data',
        'srk.db'
    );

const TEMPLATE_DIR =
    path.resolve(
        'database-manager',
        'templates'
    );


// ============================================================
// DATABASE
// ============================================================

const db =
    new Database(
        DB_PATH
    );


db.pragma(
    'foreign_keys = ON'
);


// ============================================================
// TABLES
// ============================================================

const TABLES = [

    'movies',

    'characters',

    'songs',

    'awards',

    'srk_bio',

    'television',

    'dialogues',

    'qna',

    'hidden_facts'

];


// ============================================================
// TEMPLATE FIELD DEFINITIONS
// ============================================================

const TEMPLATE_FIELDS = {

    movies: [

        ['title', 'text'],
        ['release_date', 'text'],
        ['Srk_character_name', 'text'],
        ['lead_actor', 'text'],
        ['lead_actress', 'text'],
        ['villain', 'text'],
        ['storyline', 'text'],
        ['lead_actor_characteristics', 'text'],
        ['genre', 'text'],
        ['director', 'text'],
        ['producer', 'text'],
        ['writer', 'text'],
        ['plot_summary', 'text'],
        ['visual_clues', 'text'],
        ['notes', 'text'],
        ['cast', 'text']

    ],


    characters: [

        ['movie_id', 'number'],
        ['character_name', 'text'],
        ['character_real_name', 'text'],
        [
            'character_relationship_with_lead_actor',
            'text'
        ],
        ['characteristics', 'text'],
        ['role_in_movie', 'text'],
        ['notes', 'text']

    ],


    songs: [

        ['movie_id', 'number'],
        ['title', 'text'],
        ['singer', 'text'],
        ['screen_female', 'text'],
        ['screen_male', 'text'],
        ['views_on_youtube', 'number'],
        ['likes_on_youtube', 'number'],
        ['release_date', 'text'],
        ['complete_lyrics', 'text'],
        ['notes', 'text']

    ],


    awards: [

        ['title', 'text'],
        ['company', 'text'],
        ['category', 'text'],
        ['receiving_date', 'text'],
        ['movie_id', 'number']

    ],


    srk_bio: [

        ['key', 'text'],
        ['pair', 'text']

    ],


    television: [

        ['title', 'text'],
        ['release_date', 'text'],
        ['srk_character_name', 'text'],
        ['lead_actor', 'text'],
        ['lead_actress', 'text'],
        ['storyline', 'text'],
        ['episodes', 'number'],
        ['genre', 'text'],
        ['director', 'text'],
        ['producer', 'text'],
        ['plot_summary', 'text'],
        ['visual_clues', 'text'],
        ['notes', 'text']

    ],


    dialogues: [

        ['dialogue', 'text'],
        ['movie_id', 'number'],
        ['television_id', 'number']

    ],


    qna: [

        ['question', 'text'],
        ['correct_answer', 'text']

    ],


    hidden_facts: [

        ['movie_id', 'number'],
        ['fact_details', 'text']

    ]

};


const REQUIRED_FIELDS = {
    dialogues: ['dialogue'],
};



// ============================================================
// GET DATABASE TABLE COLUMNS
// ============================================================

function getTableColumns(
    tableName
) {

    return db
        .prepare(
            `PRAGMA table_info("${tableName}")`
        )
        .all()
        .map(
            column =>
                column.name
        )
        .filter(
            column =>
                column !== 'id'
        );

}


// ============================================================
// CREATE EMPTY TEMPLATE
// ============================================================

function createDefaultTemplate(
    tableName
) {

    const fields =
        TEMPLATE_FIELDS[
            tableName
        ] || [];


    const lines = [];


    lines.push(
        '// ============================================================'
    );

    lines.push(
        `// ${tableName.toUpperCase()} IMPORT TEMPLATE`
    );

    lines.push(
        '// Add one or more records below.'
    );

    lines.push(
        '// Do NOT add the id field. SQLite generates it automatically.'
    );

    lines.push(
        '// ============================================================'
    );

    lines.push(
        ''
    );

    lines.push(
        '// Example:'
    );

    lines.push(
        '// {'
    );


    for (
        const [
            field,
            type
        ]
        of fields
    ) {

        lines.push(
            `//     ${field}:`
        );


        if (
            type === 'number'
        ) {

            lines.push(
                '//         null,'
            );

        }
        else {

            lines.push(
                '//         \'\','
            );

        }

    }


    lines.push(
        '// },'
    );

    lines.push(
        ''
    );


    return lines.join(
        '\n'
    );

}


// ============================================================
// WRITE DEFAULT TEMPLATE
// ============================================================

function resetTemplate(
    filePath,
    tableName
) {

    fs.writeFileSync(
        filePath,
        createDefaultTemplate(
            tableName
        ),
        'utf8'
    );

}


// ============================================================
// READ TEMPLATE
// ============================================================

function readTemplate(
    filePath
) {

    if (
        !fs.existsSync(
            filePath
        )
    ) {

        return [];

    }


    let content =
        fs.readFileSync(
            filePath,
            'utf8'
        );


    content =
        content.trim();


    if (
        !content
    ) {

        return [];

    }


    // --------------------------------------------------------
    // Remove comment-only lines
    // --------------------------------------------------------

    content =
        content
            .split(/\r?\n/)
            .filter(
                line =>
                    !line.trim().startsWith('//')
            )
            .join('\n')
            .trim();


    if (
        !content
    ) {

        return [];

    }


    // --------------------------------------------------------
    // User templates are object fragments.
    //
    // Example:
    //
    // {
    //     title: 'Swades'
    // },
    //
    // {
    //     title: 'Devdas'
    // },
    //
    // We wrap them in an array.
    // --------------------------------------------------------

    const source =
        `[${content}]`;


    try {

        const result =
            vm.runInNewContext(
                source,
                Object.create(null),
                {
                    timeout: 2000
                }
            );


        if (
            !Array.isArray(
                result
            )
        ) {

            throw new Error(
                'Template must contain object records.'
            );

        }


        return result;

    }

    catch (
        error
    ) {

        throw new Error(
            `Could not parse template: ${error.message}`
        );

    }

}


// ============================================================
// CHECK EMPTY RECORD
// ============================================================

function isEmptyRecord(
    record
) {

    if (
        !record ||
        typeof record !== 'object'
    ) {

        return true;

    }


    const values =
        Object.values(
            record
        );


    if (
        values.length === 0
    ) {

        return true;

    }


    return values.every(
        value =>
            value === null ||
            value === undefined ||
            String(value).trim() === ''
    );

}


// ============================================================
// NORMALIZE VALUE
// ============================================================

function normalizeValue(
    value
) {

    if (
        value === undefined
    ) {

        return null;

    }


    if (
        typeof value === 'string'
    ) {

        const trimmed =
            value.trim();


        if (
            trimmed === ''
        ) {

            return null;

        }


        return trimmed;

    }


    return value;

}


// ============================================================
// INSERT RECORDS
// ============================================================

function insertRecords(
    tableName,
    records
) {

    const columns =
        getTableColumns(
            tableName
        );


    if (
        columns.length === 0
    ) {

        throw new Error(
            `No columns found for table "${tableName}".`
        );

    }


    
const validRecords = records.filter(
    record => !isEmptyRecord(record)
);

const requiredFields = REQUIRED_FIELDS[tableName] || [];

for (let i = 0; i < validRecords.length; i++) {
    const record = validRecords[i];

    for (const field of requiredFields) {
        const value = record[field];

        if (
            typeof value !== 'string' ||
            value.trim() === ''
        ) {
            throw new Error(
                `Record ${i + 1}: required field "${field}" ` +
                `is missing or empty. Received: ${JSON.stringify(value)}. ` +
                `Available fields: ${Object.keys(record).join(', ')}`
            );
        }
    }
}



    if (
        validRecords.length === 0
    ) {

        return 0;

    }


    const insertableRecords = [];


    for (
        const record
        of validRecords
    ) {

        const recordColumns =
            Object.keys(
                record
            )
            .filter(
                column =>
                    column !== 'id'
            );


        const unknownColumns =
            recordColumns.filter(
                column =>
                    !columns.includes(
                        column
                    )
            );


        if (
            unknownColumns.length > 0
        ) {

            throw new Error(
                `Table "${tableName}" contains unknown field(s): ${unknownColumns.join(', ')}`
            );

        }


        const usableColumns =
            columns.filter(
                column =>
                    Object.prototype.hasOwnProperty.call(
                        record,
                        column
                    )
            );


        if (
            usableColumns.length === 0
        ) {

            continue;

        }


        insertableRecords.push({
            record,
            columns: usableColumns
        });

    }


    if (
        insertableRecords.length === 0
    ) {

        return 0;

    }


    let inserted =
        0;


    const transaction =
        db.transaction(
            () => {

                for (
                    const item
                    of insertableRecords
                ) {

                    const columnSql =
                        item.columns
                            .map(
                                column =>
                                    `"${column.replace(/"/g, '""')}"`
                            )
                            .join(', ');


                    const placeholders =
                        item.columns
                            .map(
                                () =>
                                    '?'
                            )
                            .join(', ');


                    const sql =
                        `
                            INSERT INTO "${tableName}"
                            (${columnSql})
                            VALUES
                            (${placeholders})
                        `;


                    const values =
                        item.columns.map(
                            column =>
                                normalizeValue(
                                    item.record[
                                        column
                                    ]
                                )
                        );


                    db
                        .prepare(
                            sql
                        )
                        .run(
                            ...values
                        );


                    inserted++;

                }

            }
        );


    transaction();


    return inserted;

}


// ============================================================
// FIND TEMPLATE FILES
// ============================================================

function getTemplateFiles() {

    if (
        !fs.existsSync(
            TEMPLATE_DIR
        )
    ) {

        fs.mkdirSync(
            TEMPLATE_DIR,
            {
                recursive: true
            }
        );

    }


    return fs
        .readdirSync(
            TEMPLATE_DIR
        )
        .filter(
            file =>
                file.toLowerCase().endsWith(
                    '.txt'
                )
        )
        .sort();

}


// ============================================================
// MAIN
// ============================================================

function main() {

    console.log(
        '\n============================================================'
    );

    console.log(
        'SRK DATABASE IMPORT'
    );

    console.log(
        '============================================================\n'
    );


    console.log(
        'Database:',
        DB_PATH
    );

    console.log(
        'Templates:',
        TEMPLATE_DIR
    );


    // --------------------------------------------------------
    // Ensure every known template exists
    // --------------------------------------------------------

    for (
        const tableName
        of TABLES
    ) {

        const filePath =
            path.join(
                TEMPLATE_DIR,
                `${tableName}.txt`
            );


        if (
            !fs.existsSync(
                filePath
            )
        ) {

            console.log(
                `📝 Creating missing template: ${tableName}.txt`
            );


            resetTemplate(
                filePath,
                tableName
            );

        }

    }


    const templateFiles =
        getTemplateFiles();


    console.log(
        `\nTemplate files found: ${templateFiles.length}\n`
    );


    let totalInserted = 0;


    // --------------------------------------------------------
    // Process every template
    // --------------------------------------------------------

    for (
        const fileName
        of templateFiles
    ) {

        const tableName =
            path.basename(
                fileName,
                '.txt'
            );


        const filePath =
            path.join(
                TEMPLATE_DIR,
                fileName
            );


        // ----------------------------------------------------
        // Safety check
        // ----------------------------------------------------

        if (
            !TABLES.includes(
                tableName
            )
        ) {

            console.log(
                `⚠️ Skipping unknown template: ${fileName}`
            );

            continue;

        }


        console.log(
            `\n📥 Processing: ${fileName}`
        );


        try {

            const records =
                readTemplate(
                    filePath
                );


            const inserted =
                insertRecords(
                    tableName,
                    records
                );


            totalInserted +=
                inserted;


            console.log(
                `   Records found: ${records.length}`
            );

            console.log(
                `   Records inserted: ${inserted}`
            );


            // ------------------------------------------------
            // IMPORTANT:
            // Reset template after successful processing.
            // ------------------------------------------------

            resetTemplate(
                filePath,
                tableName
            );


            console.log(
                '   ✅ Template reset.'
            );

        }

        catch (
            error
        ) {

            console.error(
                `   ❌ Failed: ${error.message}`
            );


            console.error(
                '   ⚠️ Template was NOT reset.'
            );


            console.error(
                '   Your data is still present in the template.'
            );

        }

    }


    console.log(
        '\n============================================================'
    );

    console.log(
        '✅ DATABASE IMPORT FINISHED'
    );

    console.log(
        '============================================================'
    );

    console.log(
        `Total records inserted: ${totalInserted}`
    );

    console.log(
        '============================================================\n'
    );

}


try {

    main();

}

catch (
    error
) {

    console.error(
        '\n❌ Database import failed:'
    );

    console.error(
        error?.message ||
        error
    );

    process.exit(
        1
    );

}

finally {

    db.close();

}