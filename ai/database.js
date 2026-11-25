import Database from 'better-sqlite3';


// ============================================================
// DATABASE
// ============================================================

const DB_PATH =
    './data/srk.db';


const db =
    new Database(
        DB_PATH
    );


// ============================================================
// DATABASE SETTINGS
// ============================================================

db.pragma(
    'journal_mode = WAL'
);

db.pragma(
    'foreign_keys = ON'
);

db.pragma(
    'synchronous = NORMAL'
);


// ============================================================
// CREATE DATABASE SCHEMA
// ============================================================

db.exec(`

    -- ========================================================
    -- MOVIES
    -- ========================================================

    CREATE TABLE IF NOT EXISTS movies (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        title TEXT NOT NULL,

        release_date TEXT,

        Srk_character_name TEXT,

        lead_actor TEXT,

        lead_actress TEXT,

        cast TEXT,

        villain TEXT,

        storyline TEXT,

        lead_actor_characteristics TEXT,

        genre TEXT,

        director TEXT,

        producer TEXT,

        writer TEXT,

        plot_summary TEXT,

        visual_clues TEXT,

        notes TEXT

    );


    -- ========================================================
    -- CHARACTERS
    -- ========================================================

    CREATE TABLE IF NOT EXISTS characters (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        movie_id INTEGER,

        character_name TEXT NOT NULL,

        character_real_name TEXT,

        character_relationship_with_lead_actor TEXT,

        characteristics TEXT,

        role_in_movie TEXT,

        notes TEXT,

        FOREIGN KEY (
            movie_id
        )
        REFERENCES movies(id)
        ON DELETE SET NULL

    );


    -- ========================================================
    -- SONGS
    -- ========================================================

    CREATE TABLE IF NOT EXISTS songs (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        movie_id INTEGER,

        title TEXT NOT NULL,

        singer TEXT,

        screen_female TEXT,

        screen_male TEXT,

        views_on_youtube INTEGER,

        likes_on_youtube INTEGER,

        release_date TEXT,

        complete_lyrics TEXT,

        notes TEXT,

        FOREIGN KEY (
            movie_id
        )
        REFERENCES movies(id)
        ON DELETE SET NULL

    );


    -- ========================================================
    -- AWARDS
    -- ========================================================

    CREATE TABLE IF NOT EXISTS awards (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        title TEXT NOT NULL,

        company TEXT,

        category TEXT,

        receiving_date TEXT,

        movie_id INTEGER,

        FOREIGN KEY (
            movie_id
        )
        REFERENCES movies(id)
        ON DELETE SET NULL

    );


    -- ========================================================
    -- SRK BIO
    -- ========================================================

    CREATE TABLE IF NOT EXISTS srk_bio (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        key TEXT NOT NULL,

        pair TEXT

    );


    -- ========================================================
    -- TELEVISION
    -- ========================================================

    CREATE TABLE IF NOT EXISTS television (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        title TEXT NOT NULL,

        release_date TEXT,

        srk_character_name TEXT,

        lead_actor TEXT,

        lead_actress TEXT,

        storyline TEXT,

        episodes INTEGER,

        genre TEXT,

        director TEXT,

        producer TEXT,

        plot_summary TEXT,

        visual_clues TEXT,

        notes TEXT

    );


    -- ========================================================
    -- DIALOGUES
    -- ========================================================

    CREATE TABLE IF NOT EXISTS dialogues (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        dialogue TEXT NOT NULL,

        movie_id INTEGER,

        television_id INTEGER,

        FOREIGN KEY (
            movie_id
        )
        REFERENCES movies(id)
        ON DELETE SET NULL,

        FOREIGN KEY (
            television_id
        )
        REFERENCES television(id)
        ON DELETE SET NULL

    );


    -- ========================================================
    -- QNA
    -- ========================================================

    CREATE TABLE IF NOT EXISTS qna (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        question TEXT NOT NULL,

        correct_answer TEXT NOT NULL

    );


    -- ========================================================
    -- HIDDEN FACTS
    -- ========================================================

    CREATE TABLE IF NOT EXISTS hidden_facts (

        id INTEGER PRIMARY KEY AUTOINCREMENT,

        movie_id INTEGER,

        fact_details TEXT NOT NULL,

        FOREIGN KEY (
            movie_id
        )
        REFERENCES movies(id)
        ON DELETE SET NULL

    );


    -- ========================================================
    -- INDEXES
    -- ========================================================

    CREATE INDEX IF NOT EXISTS idx_movies_title
        ON movies(title);


    CREATE INDEX IF NOT EXISTS idx_movies_character
        ON movies(Srk_character_name);


    CREATE INDEX IF NOT EXISTS idx_movies_director
        ON movies(director);


    CREATE INDEX IF NOT EXISTS idx_movies_genre
        ON movies(genre);


    CREATE INDEX IF NOT EXISTS idx_characters_movie
        ON characters(movie_id);


    CREATE INDEX IF NOT EXISTS idx_characters_name
        ON characters(character_name);


    CREATE INDEX IF NOT EXISTS idx_songs_movie
        ON songs(movie_id);


    CREATE INDEX IF NOT EXISTS idx_songs_title
        ON songs(title);


    CREATE INDEX IF NOT EXISTS idx_awards_movie
        ON awards(movie_id);


    CREATE INDEX IF NOT EXISTS idx_awards_title
        ON awards(title);


    CREATE INDEX IF NOT EXISTS idx_bio_key
        ON srk_bio(key);


    CREATE INDEX IF NOT EXISTS idx_television_title
        ON television(title);


    CREATE INDEX IF NOT EXISTS idx_dialogues_movie
        ON dialogues(movie_id);


    CREATE INDEX IF NOT EXISTS idx_dialogues_television
        ON dialogues(television_id);


    CREATE INDEX IF NOT EXISTS idx_qna_question
        ON qna(question);


    CREATE INDEX IF NOT EXISTS idx_hidden_facts_movie
        ON hidden_facts(movie_id);

`);


// ============================================================
// HELPER
// ============================================================

function createSearchPattern(
    query
) {

    if (
        !query ||
        typeof query !== 'string'
    ) {

        return null;

    }


    const cleaned =
        query
            .trim()
            .replace(
                /\s+/g,
                ' '
            );


    if (
        !cleaned
    ) {

        return null;

    }


    return `%${cleaned}%`;

}


// ============================================================
// TOKENIZE SEARCH QUERY
// ============================================================

function tokenize(
    query
) {

    if (
        !query ||
        typeof query !== 'string'
    ) {

        return [];

    }


    return [
        ...new Set(

            query
                .toLowerCase()
                .replace(
                    /[^a-z0-9\s]/gi,
                    ' '
                )
                .split(/\s+/)
                .map(
                    term =>
                        term.trim()
                )
                .filter(
                    term =>
                        term.length >= 2
                )

        )
    ];

}



/* ============================================================
   STRUCTURED FIELD-BASED SEARCH
   ============================================================ */

const STRUCTURED_SEARCH_CONFIG = {
    movies: {
        alias: 'm',
        from: `
            movies m
            LEFT JOIN (
                SELECT movie_id,
                       GROUP_CONCAT(DISTINCT character_name) AS database_characters
                FROM characters
                GROUP BY movie_id
            ) dc ON dc.movie_id = m.id
            LEFT JOIN (
                SELECT movie_id,
                       GROUP_CONCAT(DISTINCT title) AS database_songs
                FROM songs
                GROUP BY movie_id
            ) ds ON ds.movie_id = m.id
        `,
        select: 'm.*, dc.database_characters, ds.database_songs',
        fields: {
            id: ['m.id', 'id'],
            title: ['m.title', 'title'],
            release_date: ['m.release_date', 'release_date'],
            Srk_character_name: ['m.Srk_character_name', 'Srk_character_name'],
            lead_actor: ['m.lead_actor', 'lead_actor'],
            lead_actress: ['m.lead_actress', 'lead_actress'],
            cast: ['m.cast', 'cast'],
            villain: ['m.villain', 'villain'],
            storyline: ['m.storyline', 'storyline'],
            lead_actor_characteristics: ['m.lead_actor_characteristics', 'lead_actor_characteristics'],
            genre: ['m.genre', 'genre'],
            director: ['m.director', 'director'],
            producer: ['m.producer', 'producer'],
            writer: ['m.writer', 'writer'],
            plot_summary: ['m.plot_summary', 'plot_summary'],
            visual_clues: ['m.visual_clues', 'visual_clues'],
            notes: ['m.notes', 'notes'],
            database_characters: ['dc.database_characters', 'database_characters'],
            database_songs: ['ds.database_songs', 'database_songs']
        }
    },

    characters: {
        from: 'characters c LEFT JOIN movies m ON m.id = c.movie_id',
        select: `
            c.*,
            m.title AS movie_title,
            m.release_date AS movie_release_date,
            m.Srk_character_name AS movie_srk_character,
            m.lead_actor AS movie_lead_actor,
            m.lead_actress AS movie_lead_actress,
            m.genre AS movie_genre,
            m.director AS movie_director,
            m.producer AS movie_producer,
            m.plot_summary AS movie_plot_summary,
            m.visual_clues AS movie_visual_clues
        `,
        fields: {
            id: ['c.id', 'id'],
            movie_id: ['c.movie_id', 'movie_id'],
            character_name: ['c.character_name', 'character_name'],
            character_real_name: ['c.character_real_name', 'character_real_name'],
            character_relationship_with_lead_actor: ['c.character_relationship_with_lead_actor', 'character_relationship_with_lead_actor'],
            characteristics: ['c.characteristics', 'characteristics'],
            role_in_movie: ['c.role_in_movie', 'role_in_movie'],
            notes: ['c.notes', 'notes'],
            movie_title: ['m.title', 'movie_title'],
            movie_release_date: ['m.release_date', 'movie_release_date'],
            movie_director: ['m.director', 'movie_director'],
            movie_plot_summary: ['m.plot_summary', 'movie_plot_summary']
        }
    },

    songs: {
        from: 'songs s LEFT JOIN movies m ON m.id = s.movie_id',
        select: `
            s.*,
            m.title AS movie_title,
            m.release_date AS movie_release_date,
            m.Srk_character_name AS movie_srk_character,
            m.lead_actor AS movie_lead_actor,
            m.lead_actress AS movie_lead_actress,
            m.director AS movie_director,
            m.producer AS movie_producer,
            m.genre AS movie_genre,
            m.plot_summary AS movie_plot_summary,
            m.visual_clues AS movie_visual_clues
        `,
        fields: {
            id: ['s.id', 'id'],
            movie_id: ['s.movie_id', 'movie_id'],
            title: ['s.title', 'title'],
            singer: ['s.singer', 'singer'],
            screen_female: ['s.screen_female', 'screen_female'],
            screen_male: ['s.screen_male', 'screen_male'],
            views_on_youtube: ['s.views_on_youtube', 'views_on_youtube'],
            likes_on_youtube: ['s.likes_on_youtube', 'likes_on_youtube'],
            release_date: ['s.release_date', 'release_date'],
            complete_lyrics: ['s.complete_lyrics', 'complete_lyrics'],
            notes: ['s.notes', 'notes'],
            movie_title: ['m.title', 'movie_title'],
            movie_director: ['m.director', 'movie_director'],
            movie_plot_summary: ['m.plot_summary', 'movie_plot_summary']
        }
    },

    awards: {
        from: 'awards a LEFT JOIN movies m ON m.id = a.movie_id',
        select: `
            a.*,
            m.title AS movie_title,
            m.release_date AS movie_release_date,
            m.Srk_character_name AS movie_srk_character,
            m.director AS movie_director,
            m.producer AS movie_producer
        `,
        fields: {
            id: ['a.id', 'id'],
            title: ['a.title', 'title'],
            company: ['a.company', 'company'],
            category: ['a.category', 'category'],
            receiving_date: ['a.receiving_date', 'receiving_date'],
            movie_id: ['a.movie_id', 'movie_id'],
            movie_title: ['m.title', 'movie_title'],
            movie_director: ['m.director', 'movie_director']
        }
    },

    srk_bio: {
        from: 'srk_bio b',
        select: 'b.*',
        fields: {
            id: ['b.id', 'id'],
            key: ['b.key', 'key'],
            pair: ['b.pair', 'pair']
        }
    },

    television: {
        from: 'television t',
        select: 't.*',
        fields: {
            id: ['t.id', 'id'],
            title: ['t.title', 'title'],
            release_date: ['t.release_date', 'release_date'],
            srk_character_name: ['t.srk_character_name', 'srk_character_name'],
            lead_actor: ['t.lead_actor', 'lead_actor'],
            lead_actress: ['t.lead_actress', 'lead_actress'],
            storyline: ['t.storyline', 'storyline'],
            episodes: ['t.episodes', 'episodes'],
            genre: ['t.genre', 'genre'],
            director: ['t.director', 'director'],
            producer: ['t.producer', 'producer'],
            plot_summary: ['t.plot_summary', 'plot_summary'],
            visual_clues: ['t.visual_clues', 'visual_clues'],
            notes: ['t.notes', 'notes']
        }
    },

    dialogues: {
        from: `
            dialogues d
            LEFT JOIN movies m ON m.id = d.movie_id
            LEFT JOIN television t ON t.id = d.television_id
        `,
        select: `
            d.*,
            m.title AS movie_title,
            m.release_date AS movie_release_date,
            m.Srk_character_name AS movie_srk_character,
            m.director AS movie_director,
            m.plot_summary AS movie_plot_summary,
            t.title AS television_title,
            t.release_date AS television_release_date,
            t.srk_character_name AS television_srk_character,
            t.director AS television_director
        `,
        fields: {
            id: ['d.id', 'id'],
            dialogue: ['d.dialogue', 'dialogue'],
            movie_id: ['d.movie_id', 'movie_id'],
            television_id: ['d.television_id', 'television_id'],
            movie_title: ['m.title', 'movie_title'],
            television_title: ['t.title', 'television_title'],
            movie_director: ['m.director', 'movie_director'],
            television_director: ['t.director', 'television_director']
        }
    },

    qna: {
        from: 'qna q',
        select: 'q.*',
        fields: {
            id: ['q.id', 'id'],
            question: ['q.question', 'question'],
            correct_answer: ['q.correct_answer', 'correct_answer']
        }
    },

    hidden_facts: {
        from: 'hidden_facts hf LEFT JOIN movies m ON m.id = hf.movie_id',
        select: `
            hf.*,
            m.title AS movie_title,
            m.release_date AS movie_release_date,
            m.Srk_character_name AS movie_srk_character,
            m.director AS movie_director,
            m.producer AS movie_producer,
            m.genre AS movie_genre,
            m.plot_summary AS movie_plot_summary,
            m.visual_clues AS movie_visual_clues
        `,
        fields: {
            id: ['hf.id', 'id'],
            movie_id: ['hf.movie_id', 'movie_id'],
            fact_details: ['hf.fact_details', 'fact_details'],
            movie_title: ['m.title', 'movie_title'],
            movie_release_date: ['m.release_date', 'movie_release_date'],
            movie_srk_character: ['m.Srk_character_name', 'movie_srk_character'],
            movie_director: ['m.director', 'movie_director'],
            movie_plot_summary: ['m.plot_summary', 'movie_plot_summary'],
            movie_visual_clues: ['m.visual_clues', 'movie_visual_clues']
        }
    }
};


/**
 * Search one table using explicit fields and multiple clues.
 *
 * where:
 *   Fields to search, e.g. ['director']
 *
 * contains:
 *   Search clues, e.g. ['Yash Chopra']
 *
 * matchMode:
 *   'any' = a record may match any clue
 *   'all' = a record must match every clue
 */
export function searchStructuredDataForAI(
    tableName,
    where,
    contains,
    matchMode = 'any'
) {
    const config = STRUCTURED_SEARCH_CONFIG[tableName];

    if (!config) {
        throw new Error(`Unsupported search table: ${tableName}`);
    }

    if (!Array.isArray(where) || !Array.isArray(contains)) {
        throw new Error('"where" and "contains" must be arrays.');
    }

    const selectedFields = [...new Set(where)]
        .filter(field => Object.hasOwn(config.fields, field));

    if (selectedFields.length === 0) {
        throw new Error(
            `No valid searchable fields supplied for ${tableName}.`
        );
    }

    const clues = [...new Set(
        contains
            .filter(value => typeof value === 'string')
            .map(value => value.trim())
            .filter(Boolean)
    )];

    if (clues.length === 0) {
        return [];
    }

    const normalizedMode = matchMode === 'all' ? 'all' : 'any';

    const fieldDefinitions = selectedFields.map(
        field => ({
            name: field,
            sql: config.fields[field][0],
            result: config.fields[field][1]
        })
    );

    const whereGroups = [];
    const sqlParams = [];

    for (const clue of clues) {
        const terms = tokenize(clue);
        const alternatives = [];

        for (const field of fieldDefinitions) {
            alternatives.push(`${field.sql} LIKE ?`);
            sqlParams.push(`%${clue}%`);

            for (const term of terms) {
                alternatives.push(`${field.sql} LIKE ?`);
                sqlParams.push(`%${term}%`);
            }
        }

        whereGroups.push(`(${alternatives.join(' OR ')})`);
    }

    const combinedWhere = normalizedMode === 'all'
        ? whereGroups.join(' AND ')
        : whereGroups.join(' OR ');

    // Fetch all candidate records matching the selected fields.
    const candidates = db.prepare(`
        SELECT ${config.select}
        FROM ${config.from}
        WHERE ${combinedWhere}
    `).all(...sqlParams);

    const results = candidates.map(record => {
        const searchableValues = fieldDefinitions.map(
            field => String(record[field.result] ?? '').toLowerCase()
        );

        const searchableText = searchableValues.join(' ');

        let score = 0;
        const matchedClues = [];

        for (const clue of clues) {
            const normalizedClue = clue.toLowerCase();
            const terms = tokenize(clue);

            const exactPhraseMatch = searchableValues.some(
                value => value.includes(normalizedClue)
            );

            const matchedTerms = terms.filter(
                term => searchableText.includes(term)
            );

            if (exactPhraseMatch || matchedTerms.length > 0) {
                matchedClues.push(clue);

                // Exact phrase matches are more valuable than partial matches.
                score += exactPhraseMatch ? 10 : 0;
                score += matchedTerms.length;
            }
        }

        return {
            ...record,
            match_score: score,
            matched_clues: matchedClues
        };
    }).filter(record => {
        if (normalizedMode === 'all') {
            return record.matched_clues.length === clues.length;
        }

        return record.matched_clues.length > 0;
    });

    results.sort((a, b) => b.match_score - a.match_score);

    // Keep enough results for GPT to compare records, e.g. release dates.
    return results.slice(0, 50);
}







// ============================================================
// MOVIES
// ============================================================

export function searchMoviesForAI(
    query
) {

    const terms =
        tokenize(
            query
        );


    if (
        terms.length === 0
    ) {

        return [];

    }


    const movies =
        db
            .prepare(`
                SELECT
                    m.*,

                    (
                        SELECT
                            GROUP_CONCAT(
                                DISTINCT
                                c.character_name
                            )
                        FROM characters c
                        WHERE
                            c.movie_id = m.id
                    ) AS database_characters,

                    (
                        SELECT
                            GROUP_CONCAT(
                                DISTINCT
                                s.title
                            )
                        FROM songs s
                        WHERE
                            s.movie_id = m.id
                    ) AS database_songs

                FROM movies m
            `)
            .all();


    const results =
        movies
            .map(
                movie => {

                    const searchableText =
                        [
                            movie.title,
                            movie.release_date,
                            movie.Srk_character_name,
                            movie.lead_actor,
                            movie.lead_actress,
                            movie.villain,
                            movie.storyline,
                            movie.lead_actor_characteristics,
                            movie.genre,
                            movie.director,
                            movie.producer,
                            movie.writer,
                            movie.plot_summary,
                            movie.visual_clues,
                            movie.notes,
                            movie.database_characters,
                            movie.database_songs,
                            movie.cast
                        ]
                            .filter(Boolean)
                            .join(' ')
                            .toLowerCase();


                    let score = 0;

                    const matchedTerms = [];


                    for (
                        const term
                        of terms
                    ) {

                        if (
                            searchableText.includes(
                                term
                            )
                        ) {

                            score++;

                            matchedTerms.push(
                                term
                            );

                        }

                    }


                    return {

                        ...movie,

                        match_score:
                            score,

                        matched_terms:
                            matchedTerms

                    };

                }
            )
            .filter(
                movie =>
                    movie.match_score > 0
            )
            .sort(
                (a, b) =>
                    b.match_score -
                    a.match_score
            )
            .slice(
                0,
                10
            );


    return results;

}


// ============================================================
// GET ONE MOVIE
// ============================================================

export function getMovieForAI(
    title
) {

    const pattern =
        createSearchPattern(
            title
        );


    if (!pattern) {

        return null;

    }


    const movie =
        db
            .prepare(`
                SELECT
                    m.*,

                    (
                        SELECT
                            GROUP_CONCAT(
                                DISTINCT
                                c.character_name
                            )
                        FROM characters c
                        WHERE
                            c.movie_id = m.id
                    ) AS database_characters,

                    (
                        SELECT
                            GROUP_CONCAT(
                                DISTINCT
                                s.title
                            )
                        FROM songs s
                        WHERE
                            s.movie_id = m.id
                    ) AS database_songs

                FROM movies m

                WHERE
                    m.title LIKE ?

                LIMIT 1
            `)
            .get(
                pattern
            );


    if (!movie) {

        return null;

    }


    return movie;

}


// ============================================================
// CHARACTERS
// ============================================================

export function searchCharactersForAI(
    query
) {

    const pattern =
        createSearchPattern(
            query
        );


    if (!pattern) {

        return [];

    }


    return db
        .prepare(`
            SELECT

                c.*,

                m.title
                    AS movie_title,

                m.release_date
                    AS movie_release_date,

                m.Srk_character_name
                    AS movie_srk_character,

                m.lead_actor
                    AS movie_lead_actor,

                m.lead_actress
                    AS movie_lead_actress,

                m.genre
                    AS movie_genre,

                m.director
                    AS movie_director,

                m.producer
                    AS movie_producer,

                m.plot_summary
                    AS movie_plot_summary,

                m.visual_clues
                    AS movie_visual_clues

            FROM characters c

            LEFT JOIN movies m
                ON m.id = c.movie_id

            WHERE

                c.character_name LIKE ?

                OR c.character_real_name LIKE ?

                OR c.character_relationship_with_lead_actor LIKE ?

                OR c.characteristics LIKE ?

                OR c.role_in_movie LIKE ?

                OR c.notes LIKE ?

                OR m.title LIKE ?

            LIMIT 20
        `)
        .all(
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern
        );

}


// ============================================================
// SONGS
// ============================================================

export function searchSongsForAI(
    query
) {

    const pattern =
        createSearchPattern(
            query
        );


    if (!pattern) {

        return [];

    }


    return db
        .prepare(`
            SELECT

                s.*,

                m.title
                    AS movie_title,

                m.release_date
                    AS movie_release_date,

                m.Srk_character_name
                    AS movie_srk_character,

                m.lead_actor
                    AS movie_lead_actor,

                m.lead_actress
                    AS movie_lead_actress,

                m.director
                    AS movie_director,

                m.producer
                    AS movie_producer,

                m.genre
                    AS movie_genre,

                m.plot_summary
                    AS movie_plot_summary,

                m.visual_clues
                    AS movie_visual_clues

            FROM songs s

            LEFT JOIN movies m
                ON m.id = s.movie_id

            WHERE

                s.title LIKE ?

                OR s.singer LIKE ?

                OR s.screen_female LIKE ?

                OR s.screen_male LIKE ?

                OR s.complete_lyrics LIKE ?

                OR s.notes LIKE ?

                OR m.title LIKE ?

            LIMIT 20
        `)
        .all(
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern
        );

}


// ============================================================
// AWARDS
// ============================================================

export function searchAwardsForAI(
    query
) {

    const pattern =
        createSearchPattern(
            query
        );


    if (!pattern) {

        return [];

    }


    return db
        .prepare(`
            SELECT

                a.*,

                m.title
                    AS movie_title,

                m.release_date
                    AS movie_release_date,

                m.Srk_character_name
                    AS movie_srk_character,

                m.director
                    AS movie_director,

                m.producer
                    AS movie_producer

            FROM awards a

            LEFT JOIN movies m
                ON m.id = a.movie_id

            WHERE

                a.title LIKE ?

                OR a.company LIKE ?

                OR a.category LIKE ?

                OR a.receiving_date LIKE ?

                OR m.title LIKE ?

            LIMIT 20
        `)
        .all(
            pattern,
            pattern,
            pattern,
            pattern,
            pattern
        );

}


// ============================================================
// SRK BIO
// ============================================================

export function searchBioForAI(
    query
) {

    const pattern =
        createSearchPattern(
            query
        );


    if (!pattern) {

        return [];

    }


    return db
        .prepare(`
            SELECT
                id,
                key,
                pair

            FROM srk_bio

            WHERE

                key LIKE ?

                OR pair LIKE ?

            LIMIT 50
        `)
        .all(
            pattern,
            pattern
        );

}


// ============================================================
// TELEVISION
// ============================================================

export function searchTelevisionForAI(
    query
) {

    const pattern =
        createSearchPattern(
            query
        );


    if (!pattern) {

        return [];

    }


    return db
        .prepare(`
            SELECT

                t.*

            FROM television t

            WHERE

                t.title LIKE ?

                OR t.release_date LIKE ?

                OR t.srk_character_name LIKE ?

                OR t.lead_actor LIKE ?

                OR t.lead_actress LIKE ?

                OR t.storyline LIKE ?

                OR t.genre LIKE ?

                OR t.director LIKE ?

                OR t.producer LIKE ?

                OR t.plot_summary LIKE ?

                OR t.visual_clues LIKE ?

                OR t.notes LIKE ?

            LIMIT 20
        `)
        .all(
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern,
            pattern
        );

}


// ============================================================
// DIALOGUES
// ============================================================

export function searchDialoguesForAI(
    query
) {

    const pattern =
        createSearchPattern(
            query
        );


    if (!pattern) {

        return [];

    }


    return db
        .prepare(`
            SELECT

                d.*,

                m.title
                    AS movie_title,

                m.release_date
                    AS movie_release_date,

                m.Srk_character_name
                    AS movie_srk_character,

                m.lead_actor
                    AS movie_lead_actor,

                m.lead_actress
                    AS movie_lead_actress,

                m.genre
                    AS movie_genre,

                m.director
                    AS movie_director,

                m.producer
                    AS movie_producer,

                m.plot_summary
                    AS movie_plot_summary,

                m.visual_clues
                    AS movie_visual_clues,

                t.title
                    AS television_title,

                t.release_date
                    AS television_release_date,

                t.srk_character_name
                    AS television_srk_character,

                t.genre
                    AS television_genre,

                t.director
                    AS television_director,

                t.producer
                    AS television_producer

            FROM dialogues d

            LEFT JOIN movies m
                ON m.id = d.movie_id

            LEFT JOIN television t
                ON t.id = d.television_id

            WHERE

                d.dialogue LIKE ?

            LIMIT 20
        `)
        .all(
            pattern
        );

}


// ============================================================
// QNA
// ============================================================

export function searchQnaForAI(
    query
) {

    const pattern =
        createSearchPattern(
            query
        );


    if (!pattern) {

        return [];

    }


    return db
        .prepare(`
            SELECT

                id,
                question,
                correct_answer

            FROM qna

            WHERE

                question LIKE ?

                OR correct_answer LIKE ?

            LIMIT 20
        `)
        .all(
            pattern,
            pattern
        );

}


// ============================================================
// HIDDEN FACTS
// ============================================================

export function searchHiddenFactsForAI(
    query
) {

    const pattern =
        createSearchPattern(
            query
        );


    if (!pattern) {

        return [];

    }


    return db
        .prepare(`
            SELECT

                hf.*,

                m.title
                    AS movie_title,

                m.release_date
                    AS movie_release_date,

                m.Srk_character_name
                    AS movie_srk_character,

                m.director
                    AS movie_director,

                m.producer
                    AS movie_producer,

                m.genre
                    AS movie_genre,

                m.plot_summary
                    AS movie_plot_summary,

                m.visual_clues
                    AS movie_visual_clues

            FROM hidden_facts hf

            LEFT JOIN movies m
                ON m.id = hf.movie_id

            WHERE

                hf.fact_details LIKE ?

                OR m.title LIKE ?

                OR m.Srk_character_name LIKE ?

                OR m.plot_summary LIKE ?

                OR m.visual_clues LIKE ?

            LIMIT 20
        `)
        .all(
            pattern,
            pattern,
            pattern,
            pattern,
            pattern
        );

}


// ============================================================
// GET DATABASE TABLES
// ============================================================

export function getDatabaseTables() {

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
// CLOSE DATABASE
// ============================================================

export function closeDatabase() {

    db.close();

}


// ============================================================
// EXPORT DATABASE INSTANCE
// ============================================================

export {
    db
};