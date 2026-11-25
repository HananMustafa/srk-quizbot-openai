import {
    addMovie,
    closeDatabase
} from './ai/database.js';


const movies = [

    {
        title:
            'Dilwale Dulhania Le Jayenge',

        release_year:
            1995,

        director:
            'Aditya Chopra',

        producer:
            'Yash Chopra',

        character:
            'Raj Malhotra',

        genre:
            'Romance',

        plot_summary:
            'Raj meets Simran during a trip through Europe and later travels to India to win her family over.',

        visual_clues:
            'Europe, Switzerland, trains, European countryside, Raj leather jacket, Simran traditional clothing, mustard fields'

    },


    {
        title:
            'Devdas',

        release_year:
            2002,

        director:
            'Sanjay Leela Bhansali',

        producer:
            'Bharat Shah',

        character:
            'Devdas Mukherjee',

        genre:
            'Romance Drama',

        plot_summary:
            'Devdas returns from London and struggles with his love for Paro and his destructive relationship with alcohol.',

        visual_clues:
            'large Indian mansion interiors, period costumes, ornate sets, chandeliers, traditional Bengali setting'

    },


    {
        title:
            'Chak De India',

        release_year:
            2007,

        director:
            'Shimit Amin',

        producer:
            'Aditya Chopra',

        character:
            'Kabir Khan',

        genre:
            'Sports Drama',

        plot_summary:
            'Kabir Khan coaches the Indian womens national hockey team.',

        visual_clues:
            'hockey field, Indian womens hockey team, blue sports uniforms, stadiums, training grounds'

    },


    {
        title:
            'Swades',

        release_year:
            2004,

        director:
            'Ashutosh Gowariker',

        producer:
            'Ashutosh Gowariker',

        character:
            'Mohan Bhargava',

        genre:
            'Drama',

        plot_summary:
            'An Indian NASA project manager returns to India and becomes involved with the development of a rural village.',

        visual_clues:
            'Indian village, rural roads, traditional homes, NASA references, simple clothing, village community'

    }

];


for (
    const movie of movies
) {

    addMovie(
        movie
    );

}


console.log(
    `✅ Added/updated ${movies.length} test movies.`
);


closeDatabase();