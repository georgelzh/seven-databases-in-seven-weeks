Postgre & JSON & JSONB
Postgres offers two different formats for this: JSON and JSONB. The difference is that the json type stores JSON as text while jsonb stores JSON using a decomposed binary format; json is optimized for faster data input while jsonb is optimized for faster processing.
With Postgres, you can perform operations like this:

CREATE TABLE users (
username TEXT,
data JSON
);
INSERT INTO users VALUES ('wadeboggs107', '{ "AVG": 0.328, "HR": 118, "H": 3010 }');
SELECT data->>'AVG' AS lifetime_batting_average FROM users;

lifetime_batting_average
--------------------------
0.328


If your use case requires a mixture of structured and unstructured (or less structured) datatypes¡ªor even requires only unstructured datatypes¡ªthen Postgres may provide a solution.




Partitioning is not one of the strengths of relational databases such as PostgreSQL.

For scale up, relational database management system (RDMS) is a good fit. 

When: 
1. scale out is required
2. Overhead of a full database is not required (maybe Redis)
3. High-volumn reads and writes as key values required
4. Need to only store large 


Parting Thoughts
A relational database is an excellent choice for query flexibility. While PostgreSQL requires you to design your data up front, it makes no assumptions about how you use that data. As long as your schema is designed in a fairly normalized way, without duplication or storage of computable values, you should generally be all set for any queries you might need to create. And if you include the correct modules, tune your engine, and index well, it will perform amazingly well for multiple terabytes of data with very small resource consumption. Finally, to those for whom data safety is paramount, PostgreSQL¡¯s ACID-compliant transactions ensure your commits are completely atomic, consistent, isolated, and durable.
