
import {
    searchStructuredDataForAI
} from './database.js';


// ============================================================
// TABLE TOOL DEFINITIONS
// ============================================================

const TABLES = [
    {
        name: 'movies',
        tool: 'search_srk_movies',
        description: `
Search the structured SRK movie database.

IMPORTANT:
- Search by concise values, not by rewriting the full question.
- If the movie title is known, use where ["title"] and contains with ONLY the title.
- A single search returns the complete movie record, including release_date,
SRK character, lead actors, lead actress, cast, villain, storyline,
director, producer, writer, plot summary, visual clues, notes,
and associated character/song names.
- If the question asks about a particular field, still retrieve the whole
  matching movie record. Read the requested answer from the result.
- You can search any movie field, including director, release_date,
plot_summary, storyline, visual_clues, lead_actress, cast, genre,
and notes.
- For identification clues, search relevant fields with separate clues.
- For questions such as the first movie with a director, retrieve all matching
  movies using the director field and compare their release dates.
- Do not search the release-date field merely because the question asks for
  a release date. Search the title if the movie is already known.
        `
    },
    {
        name: 'characters',
        tool: 'search_srk_characters',
        description: `
Search character records using specific fields and clues.
Results include related movie details where available.
Use character_name for a known character, character_real_name for an actor,
or movie_title for a known movie. Return the complete matching records.
        `
    },
    {
        name: 'songs',
        tool: 'search_srk_songs',
        description: `
Search SRK song records by title, singer, lyrics, screen performers,
release date, notes, or related movie title.
Results include associated movie context. Use concise names or lyric clues,
not the entire quiz question.
        `
    },
    {
        name: 'awards',
        tool: 'search_srk_awards',
        description: `
Search awards by title, company, category, receiving_date, or movie_title.
Use the relevant field and concise search value. Results include movie
context when available.
        `
    },
    {
        name: 'srk_bio',
        tool: 'search_srk_bio',
        description: `
Search SRK biography key-value records. Use key for a fact category
such as spouse, children, birth date, or father_name. Use pair when
searching for a particular person, date, or fact value.
        `
    },
    {
        name: 'television',
        tool: 'search_srk_television',
        description: `
Search television records by title, release_date, SRK character, cast,
storyline, episodes, genre, director, producer, plot_summary, visual_clues,
or notes. Return the full matching records.
        `
    },
    {
        name: 'dialogues',
        tool: 'search_srk_dialogues',
        description: `
Search exact or partial dialogue text. Results include linked movie or
television details. Search the dialogue field using a short memorable phrase.
        `
    },
    {
        name: 'qna',
        tool: 'search_srk_qna',
        description: `
Search previously recorded quiz questions and answers. Use a short,
distinctive part of the current question, or the whole question if it is
already concise. Check whether the stored question actually matches.
        `
    },
    {
        name: 'hidden_facts',
        tool: 'search_srk_hidden_facts',
        description: `
Search behind-the-scenes facts, incidents, memories, anecdotes, and
production information. Search fact_details for distinctive clue words,
or movie_title when the movie is known. Results include movie context.
        `
    }
];


// ============================================================
// OPENAI FUNCTION TOOLS
// ============================================================

export const DATABASE_TOOLS = TABLES.map(table => ({
    type: 'function',
    name: table.tool,
    description: table.description.trim(),
    strict: true,
    parameters: {
        type: 'object',
        properties: {
            where: {
                type: 'array',
                items: {
                    type: 'string'
                },
                description:
                    'Exact database field names to search. Use only fields belonging to this table or explicitly listed contextual fields.'
            },
            contains: {
                type: 'array',
                items: {
                    type: 'string'
                },
                description:
                    'One or more concise search values or clue phrases. Do not include the full natural-language question unless searching qna.'
            },
            match_mode: {
                type: 'string',
                enum: ['any', 'all'],
                description:
                    '"any" finds records matching at least one clue; "all" requires every clue to match.'
            }
        },
        required: [
            'where',
            'contains',
            'match_mode'
        ],
        additionalProperties: false
    }
}));


// ============================================================
// TOOL NAME → DATABASE TABLE
// ============================================================

const TOOL_TABLES = Object.fromEntries(
    TABLES.map(table => [
        table.tool,
        table.name
    ])
);


// ============================================================
// EXECUTE DATABASE TOOL
// ============================================================

export function executeDatabaseTool(name, argumentsObject) {
    const tableName = TOOL_TABLES[name];

    if (!tableName) {
        throw new Error(`Unknown database tool: ${name}`);
    }

    return searchStructuredDataForAI(
        tableName,
        argumentsObject.where,
        argumentsObject.contains,
        argumentsObject.match_mode
    );
}
