Day 3: Full text and Multidimensions

--Exercise: 
--build a movie suggestion system based on similar genres of movies we --already like.


--installing modules
https://www.postgresql.org/docs/current/contrib.html

Create extension dict_xsyn;
Create extension fuzzystrmatch;
Create extension pg_trgm;
Create extension cube;



--run the line to check contrib packages have been installed correctly
SELECT '1'::cube;


/*Let¡¯s first build the database. It¡¯s often good practice to create indexes on foreign keys to speed up reverse lookups (such as what movies this actor is involved in). You should also set a UNIQUE constraint on join tables like movies_actors to avoid duplicate join values.*/

--
postgres/create_movies.sql
CREATE TABLE genres (
name text UNIQUE,
position integer
);
CREATE TABLE movies (
movie_id SERIAL PRIMARY KEY,
title text,
genre cube
);
CREATE TABLE actors (
actor_id SERIAL PRIMARY KEY,
name text
);
CREATE TABLE movies_actors (
movie_id integer REFERENCES movies NOT NULL,
actor_id integer REFERENCES actors NOT NULL,
UNIQUE (movie_id, actor_id)
);

CREATE INDEX movies_actors_movie_id ON movies_actors (movie_id);
CREATE INDEX movies_actors_actor_id ON movies_actors (actor_id);
CREATE INDEX movies_genres_cube ON movies USING gist (genre);

--load movies_data.sql then continue the following.
--Fuzzy Searching
--SQL Standard String Matches:
--ILIKE is case-sensitive version if LIKE

SELECT title FROM movies WHERE title ILIKE 'stardust%';

--_ matches 1 character, % matches any number of character.
SELECT title FROM movies WHERE title ILIKE 'stardust_%';



--Regex
--Postgres conforms (mostly) to the POSIX style.
Starts with ~ for a regex.
! means not matching
* means case-insensitive

--to count all movies that do not start with ¡®the¡¯
SELECT COUNT(*) FROM movies WHERE title !~* '^the.*';





/*
You can index strings for pattern matching the previous queries by creating a text_pattern_ops operator class index, as long as the values are indexed in lowercase.
*/

CREATE INDEX movies_title_pattern ON movies (lower(title) text_pattern_ops);

/*
We used the text_pattern_ops because the title is of type text. If you need to index varchars, chars, or names, use the related ops: varchar_pattern_ops, bpchar_pattern_ ops, and name_pattern_ops.
*/


--Bride of Levenshtein returns the distance between two words
SELECT levenshtein('bat', 'fads');


SELECT levenshtein('bat', 'fad') fad,
levenshtein('bat', 'fat') fat,
levenshtein('bat', 'bat') bat;

--change in case cost 1 distance, so it¡¯s good to convert everything --to lowercase. 
SELECT movie_id, title FROM movies
WHERE levenshtein(lower(title), lower('a hard day nght')) <= 3;


/*
try a trigram
A trigram is a group of three consecutive characters taken from a string. The pg_trgm contrib module breaks a string into as many trigrams as it can. It takes the title where trigram matches the most.

Generalized Index Search Tree (GIST), a generic index API made
available by the PostgreSQL engine.
Trigrams are an excellent choice for accepting user input without weighing queries down with wildcard complexity.
*/


SELECT show_trgm('Avatar');

--create GIST index
CREATE INDEX movies_title_trigram ON movies
USING gist (title gist_trgm_ops);

--now query with a few misspellings and still get decent results
SELECT title
FROM movies
WHERE title % 'Avatre';


--FULL TEXT FUN
--TSVector & TSQuery
--The operator @@ converts the name field into a and converts tsquery. --the query into a tsquery.

SELECT title
FROM movies
WHERE title @@ 'night & day';

==

SELECT title
FROM movies
WHERE to_tsvector(title) @@ to_tsquery('english', 'night & day');


SELECT to_tsvector('A Hard Day''s Night'),
to_tsquery('english', 'night & day');

/*
The tokens on a tsvector are called lexemes and are coupled with their positions
in the given phrase.
*/

--stop words, are ignored bc it¡¯s not helpful.
SELECT *
FROM movies
WHERE title @@ to_tsquery('english', 'a');

--with simple, you retrieve any movie containing the lexeme a
SELECT to_tsvector('english', 'A Hard Day''s Night');
SELECT to_tsvector('simple', 'A Hard Day''s Night');

--view available languages configuration
\dF

--view available languages dictionary
\dFd

/*
You can test any dictionary outright by calling the ts_lexize() function. Here we find the English stem word of the string Day¡¯s.
*/
SELECT ts_lexize('english_stem', 'Day''s');

--the previous full-text commands work for other languages, too.
SELECT to_tsvector('german', 'was machst du gerade?');

/*
Indexing lexemes
full text search is powerful but slow without index. Use explain to check how the query is planned
*/

EXPLAIN
SELECT *
FROM movies
WHERE title @@ 'night & day';

QUERY PLAN
---------------------------------------------------------------------------
Seq Scan on movies (cost=0.00..815.86 rows=3 width=171)
Filter: (title @@ 'night & day'::text)

/*
Note the line Seq Scan on movies means a whole table scan is taking place; each row will be read. That usually means that you need to create an index.
*/

--use Generalized Inverted iNdex (GIN)¡ªlike GIST. it¡¯s a common data --structure to index full-text searches.
CREATE INDEX movies_title_searchable ON movies
USING gin(to_tsvector('english', title));

--try again. GIN uses english as configuration
EXPLAIN
SELECT *
FROM movies
WHERE title @@ 'night & day';

--now, it¡¯s working, by adding english as configuration.
EXPLAIN
SELECT *
FROM movies
WHERE to_tsvector('english',title) @@ 'night & day';

/*
Metaphones - use sound of the word to search
Exercise - find what movies Bruce Willis is in but we don¡¯t remember his name.
*/
--normal search
SELECT *
FROM actors
WHERE name = 'Broos Wils';

--trigram search
SELECT *
FROM actors
WHERE name % 'Broos Wils';

--metaphone search
SELECT title
FROM movies NATURAL JOIN movies_actors NATURAL JOIN actors
WHERE metaphone(name, 6) = metaphone('Broos Wils', 6);







/*
fuzzystrmatch contains dmetaphone() and dmetaphone_alt() function for alternative name pronunciations and soundex().
*/
SELECT name, dmetaphone(name), dmetaphone_alt(name),
metaphone(name, 8), soundex(name)
FROM actors;

/*
Combining String matches 
One of the most flexible aspects of metaphones is that their outputs are just strings. This allows you to mix and match with other string matchers. For example, we could use the trigram operator against metaphone() outputs and then order the results by the lowest Levenshtein distance. This means ¡°Get me names that sound the most like Robin Williams, in order.¡±
*/

SELECT * FROM actors
WHERE metaphone(name,8) % metaphone('Robin Williams',8)
ORDER BY levenshtein(lower('Robin Williams'), lower(name));

SELECT * FROM actors WHERE dmetaphone(name) % dmetaphone('Ron');

--The combination is vast, limited only by your experiments.
/*
Genres as a multidimensional Hypercube (cube package)
Use cube datatype to map a movie¡¯s genres as a multidimensional vector. Then use methods to query for the closest points within the boundary of a hypercube to give us a list of similar movies.
Eg: Star War has a genre vector of (0,7,0,0,0,0,0,0,0,7,0,0,0,0,10,0,0,0).

Let¡¯s decrypt its genre values by extracing the cube_ur_coord(vector, dimension) using each genres position. We filter out the genres with scores of 0.
*/
SELECT name,
cube_ur_coord('(0,7,0,0,0,0,0,0,0,7,0,0,0,0,10,0,0,0)', position) as score
FROM genres g
WHERE cube_ur_coord('(0,7,0,0,0,0,0,0,0,7,0,0,0,0,10,0,0,0)', position) > 0;


/*
the nearest matches to the genre vector can be discovered by the cube_distance(point1, point2). Here we find the distance of all movies to star wars genre vector nearest first
*/

SELECT *,
cube_distance(genre, '(0,7,0,0,0,0,0,0,0,7,0,0,0,0,10,0,0,0)') dist
FROM movies
ORDER BY dist;

/*
Even with created nivues_genres_cube cube index, the query is still slow. We don¡¯t have to measure the distance of every genre between the movie and the movies we¡¯ve liked. We can use Bounding Cube to reduces points we need to look at.

We use cube_enlarge(cube,radius,dimensions) to build an 18-dimensional cube that is some length (radius) wider than a point.
*/
SELECT cube_enlarge('(1,1)',1,2);

SELECT title,
cube_distance(genre, '(0,7,0,0,0,0,0,0,0,7,0,0,0,0,10,0,0,0)') dist
FROM movies
WHERE cube_enlarge('(0,7,0,0,0,0,0,0,0,7,0,0,0,0,10,0,0,0)'::cube, 5, 18)
@> genre --¡®@> means contains¡¯
ORDER BY dist;
/*
Using a subselect, we can get the genre by movie name and perform our calculations against that genre using a table alias.
*/

SELECT m.movie_id, m.title
FROM movies m, (SELECT genre, title FROM movies WHERE title = 'Mad Max') s
WHERE cube_enlarge(s.genre, 5, 18) @> m.genre AND s.title <> m.title
ORDER BY cube_distance(m.genre, s.genre)
LIMIT 10;
