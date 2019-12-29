Day 3 Homework
Find
1. Find the online documentation listing all contributed packages bundled into Postgres. Read up on two that you could imagine yourself using in one of your projects.

https://www.postgresql.org/docs/10/contrib.html
https://www.postgresql.org/docs/10/btree-gin.html
https://www.postgresql.org/docs/10/btree-gist.html

For finding similar movies or music, or any other things. To measure distance of two values(vectors and so on).



2. Find the online POSIX regex documentation (it will also come in handy in future chapters).
https://www.boost.org/doc/libs/1_38_0/libs/regex/doc/html/boost_regex/syntax/basic_extended.html
https://www.postgresql.org/docs/current/functions-matching.html#FUNCTIONS-POSIX-REGEXP

https://www.regextester.com/99203

https://www.regular-expressions.info/posixbrackets.html

Do
1. Create a stored procedure that enables you to input a movie title or an actor¡¯s name and then receive the top five suggestions based on either movies the actor has starred in or films with similar genres.

--how to multiple rows in stored procedure language 
https://stackoverflow.com/questions/17244256/how-to-return-multiple-rows-from-pl-pgsql-function

https://dba.stackexchange.com/questions/40214/postgresql-stored-procedure-to-return-rows-or-empty-set

PL/postgre syntax
https://carto.com/help/working-with-data/sql-stored-procedures/#dynamic-plpgsql-functions

--Final solution--
CREATE OR REPLACE FUNCTION recommend_similar_movies(
input text)
RETURNS SETOF text AS $$
DECLARE
input_is_actor text;
input_is_movie text;
BEGIN
SELECT name INTO input_is_actor
FROM actors 
WHERE name % input;

SELECT title INTO input_is_movie
FROM movies 
WHERE title % input;

IF input_is_movie IS NOT NULL THEN
RETURN QUERY
SELECT m.title
FROM movies m, (SELECT genre, title FROM movies WHERE title % input) s
WHERE cube_enlarge(s.genre, 5, 18) @> m.genre AND s.title <> m.title
ORDER BY cube_distance(m.genre, s.genre)
LIMIT 5;

ELSIF input_is_actor IS NOT NULL THEN
RETURN QUERY
select title from movies natural join movies_actors 
natural join actors where name % input 
ORDER BY movie_id
LIMIT 5;
END IF;

END;
$$ LANGUAGE plpgsql;





--Components that are helpful for writing the final query.
/*
CREATE OR REPLACE FUNCTION recommend_similar_movies(
input_title text)
RETURNS SETOF text AS $$
DECLARE
BEGIN
IF input_title IS NOT NULL THEN
RETURN QUERY
SELECT m.title
FROM movies m, (SELECT genre, title FROM movies WHERE title % input_title) s
WHERE cube_enlarge(s.genre, 5, 18) @> m.genre AND s.title <> m.title
ORDER BY cube_distance(m.genre, s.genre)
LIMIT 5;
END IF;
END;
$$ LANGUAGE plpgsql;

select 'true' from actors where name ILIKE 'Will Smith';

select movie_id, actor_id, title, name from movies natural join movies_actors natural join actors where name % input order by movie_id limit 5;


SELECT m.movie_id, m.title
FROM movies m, (SELECT genre, title FROM movies WHERE title = 'will smith') s
WHERE cube_enlarge(s.genre, 5, 18) @> m.genre AND s.title <> m.title
ORDER BY cube_distance(m.genre, s.genre)
LIMIT 5;


SELECT m.movie_id, m.title
FROM movies m, (SELECT genre, title FROM movies WHERE title % 'Will Smith') s
WHERE cube_enlarge(s.genre, 5, 18) @> m.genre AND s.title <> m.title
ORDER BY cube_distance(m.genre, s.genre)
LIMIT 5;


--query to find movie title by entering actors¡¯ name
select title 
from movies natural join movies_actors 
natural join actors 
where name % 'will smith'
ORDER BY movie_id
LIMIT 5;
*/


2. Expand the movies database to track user comments and extract keywords (minus English stopwords). Cross-reference these keywords with actors¡¯ last names and try to find the most talked-about actors.

https://www.postgresql.org/docs/8.1/sql-keywords-appendix.html

--eventually, I looked into solution and used them for this task from the link --below.
https://github.com/peferron/7dbs-in-7wks/blob/master/postgres/homework.md

--to create different tables
create table users(user_id serial primary key, user_name text);
create table users_comments (comment_id serial primary key, user_id integer references users NOT NULL, comment text);

--create index
create index users_comments_user_id on users_comments (user_id);
create index users_comments_comment_id on users_comments (comment_id);

--insert into users
insert into users(user_name) values('Toby');

--insert into users_comments
insert into users_comments(user_id, comment) values(1, 'I love arnold schwarzenegger, he''s the best!!');

--to be able to take off the stop words, we will use to_tsvector()
--Find actor name according to the comment;
select name from actors where name @@ 'I love arnold schwarzenegger, he

--check if actors name is in the keywords extracted from comment.
select name from actors where (Select comment from users_comments c join users u on c.user_id = u.user_id limit 1) @@ name;

--insert some more values
INSERT INTO users_comments (user_id, comment) VALUES
    (1, 'I love Bruce Willis!'),
    (1, 'Anthony Hopkins is the best'),
    (1, 'Meh, don''t like Bruce Willis');
/*
JOIN actors a and users_comment u on c.comment @@ a.name 
it maps each comment to one specific actor and return the table. Then we return only actor.name, count(*) and group by and order by DESC to return the name that appears the most
*/

SELECT a.name, count(*)
FROM actors a JOIN users_comments c 
ON c.comment @@ a.name 
GROUP BY a.name 
ORDER BY count DESC
LIMIT 5;
