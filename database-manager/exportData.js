import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';


// ============================================================
// PATHS
// ============================================================

const DB_PATH =
    path.resolve(
        'data',
        'srk.db'
    );

const EXPORT_DIR =
    path.resolve(
        'database-manager',
        'exports'
    );


// ============================================================
// DATABASE
// ============================================================

const db =
    new Database(
        DB_PATH,
        {
            readonly: true
        }
    );


// ============================================================
// CREATE EXPORT DIRECTORY
// ============================================================

fs.mkdirSync(
    EXPORT_DIR,
    {
        recursive: true
    }
);


// ============================================================
// GET TABLES
// ============================================================

function getTables() {

    return db
        .prepare(`
            SELECT
                name

            FROM sqlite_master

            WHERE
                type = 'table'

                AND name NOT LIKE 'sqlite_%'

            ORDER BY
                name
        `)
        .all();

}


// ============================================================
// GET TABLE STRUCTURE
// ============================================================

function getTableStructure(
    tableName
) {

    return db
        .prepare(
            `PRAGMA table_info("${tableName.replace(/"/g, '""')}")`
        )
        .all();

}


// ============================================================
// GET FOREIGN KEYS
// ============================================================

function getForeignKeys(
    tableName
) {

    return db
        .prepare(
            `PRAGMA foreign_key_list("${tableName.replace(/"/g, '""')}")`
        )
        .all();

}


// ============================================================
// CSV ESCAPE
// ============================================================

function escapeCsvValue(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return '';

    }


    const stringValue =
        String(value);


    if (
        stringValue.includes('"') ||
        stringValue.includes(',') ||
        stringValue.includes('\n') ||
        stringValue.includes('\r')
    ) {

        return `"${stringValue.replace(
            /"/g,
            '""'
        )}"`;

    }


    return stringValue;

}


// ============================================================
// EXPORT TABLE TO CSV
// ============================================================

function exportTable(
    tableName
) {

    const safeTableName =
        tableName.replace(
            /"/g,
            '""'
        );


    const rows =
        db
            .prepare(
                `SELECT * FROM "${safeTableName}"`
            )
            .all();


    const structure =
        getTableStructure(
            tableName
        );


    const columns =
        structure.map(
            column =>
                column.name
        );


    const csvLines = [];


    // --------------------------------------------------------
    // HEADER
    // --------------------------------------------------------

    csvLines.push(
        columns
            .map(
                escapeCsvValue
            )
            .join(',')
    );


    // --------------------------------------------------------
    // DATA
    // --------------------------------------------------------

    for (
        const row of rows
    ) {

        csvLines.push(
            columns
                .map(
                    column =>
                        escapeCsvValue(
                            row[column]
                        )
                )
                .join(',')
        );

    }


    const filePath =
        path.join(
            EXPORT_DIR,
            `${tableName}.csv`
        );


    fs.writeFileSync(
        filePath,
        csvLines.join('\n'),
        'utf8'
    );


    console.log(
        `📄 ${tableName}.csv → ${rows.length} records`
    );

}


// ============================================================
// CREATE STRUCTURE.TXT
// ============================================================

function createStructureFile(
    tables
) {

    const lines = [];


    lines.push(
        '============================================================'
    );

    lines.push(
        'SRK DATABASE STRUCTURE'
    );

    lines.push(
        '============================================================'
    );

    lines.push(
        ''
    );


    for (
        const table
        of tables
    ) {

        const tableName =
            table.name;


        const columns =
            getTableStructure(
                tableName
            );


        const foreignKeys =
            getForeignKeys(
                tableName
            );


        lines.push(
            `Table name: ${tableName}`
        );

        lines.push(
            'Fields:'
        );


        for (
            const column
            of columns
        ) {

            let fieldLine =
                `  ${column.name}`;


            if (
                column.type
            ) {

                fieldLine +=
                    ` (${column.type})`;

            }


            if (
                column.pk
            ) {

                fieldLine +=
                    ' [PRIMARY KEY]';

            }


            if (
                column.notnull
            ) {

                fieldLine +=
                    ' [NOT NULL]';

            }


            lines.push(
                fieldLine
            );

        }


        if (
            foreignKeys.length > 0
        ) {

            lines.push(
                'Relations:'
            );


            for (
                const foreignKey
                of foreignKeys
            ) {

                lines.push(
                    `  ${foreignKey.from} → ${foreignKey.table}.${foreignKey.to}`
                );

            }

        }


        lines.push(
            ''
        );

        lines.push(
            '------------------------------------------------------------'
        );

        lines.push(
            ''
        );

    }


    const filePath =
        path.join(
            EXPORT_DIR,
            'structure.txt'
        );


    fs.writeFileSync(
        filePath,
        lines.join('\n'),
        'utf8'
    );


    console.log(
        '📋 structure.txt → database schema'
    );

}


// ============================================================
// MAIN
// ============================================================

function main() {

    console.log(
        '\n============================================================'
    );

    console.log(
        'SRK DATABASE EXPORT'
    );

    console.log(
        '============================================================\n'
    );


    console.log(
        'Database:',
        DB_PATH
    );


    const tables =
        getTables();


    if (
        tables.length === 0
    ) {

        console.log(
            '⚠️ No database tables found.'
        );

        return;

    }


    console.log(
        `Tables found: ${tables.length}\n`
    );


    // --------------------------------------------------------
    // EXPORT EVERY TABLE
    // --------------------------------------------------------

    for (
        const table
        of tables
    ) {

        exportTable(
            table.name
        );

    }


    // --------------------------------------------------------
    // EXPORT STRUCTURE
    // --------------------------------------------------------

    createStructureFile(
        tables
    );


    console.log(
        '\n============================================================'
    );

    console.log(
        '✅ DATABASE EXPORT COMPLETED'
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
        '\n❌ Database export failed:'
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