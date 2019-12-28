Day 1:

Create 7dbs	-- create a schema called 7dbs
Psql 7dbs	--Connect to 7dbs schema 
\h	--lists information about SQL commands
\?	--helps with psql-specific commands, namely those that begin with a backslash.
Eg: 7dbs=# \h CREATE INDEX 

--Create Table , Primary Key
CREATE TABLE countries (
country_code char(2) PRIMARY KEY,
country_name text UNIQUE
);

--Insert rows into table
INSERT INTO countries (country_code, country_name)
VALUES ('us','United States'), ('mx','Mexico'), ('au','Australia'),
('gb','United Kingdom'), ('de','Germany'), ('ll','Loompaland');

--show all the rows
SELECT *
FROM countries;

--where
DELETE FROM countries
WHERE country_code = 'll';

--reference keyword to maintain referential integrity
--Foreign key - country_code
CREATE TABLE cities (
name text NOT NULL,
postal_code varchar(9) CHECK (postal_code <> ''),
country_code char(2) REFERENCES countries,
PRIMARY KEY (country_code, postal_code)
);

--insert successfully
INSERT INTO cities
VALUES ('Portland','87200','us');

--update
UPDATE cities
SET postal_code = '97206'
WHERE name = 'Portland';

--JOIN
SELECT cities.*, country_name
FROM cities INNER JOIN countries -- or just FROM cities JOIN countries
ON cities.country_code = countries.country_code;


--Match Full and 
CREATE TABLE venues (
venue_id SERIAL PRIMARY KEY,
name varchar(255),
street_address text,
type char(7) CHECK ( type in ('public','private') ) DEFAULT 'public',
postal_code varchar(9),
country_code char(2),
FOREIGN KEY (country_code, postal_code)
REFERENCES cities (country_code, postal_code) MATCH FULL
);

--insert 
INSERT INTO venues (name, postal_code, country_code)
VALUES ('Crystal Ballroom', '97206', 'us');

--Inner JOIN
SELECT v.venue_id, v.name, c.name
FROM venues v INNER JOIN cities c
ON v.postal_code=c.postal_code AND v.country_code=c.country_code;

--Return Statement
INSERT INTO venues (name, postal_code, country_code)
VALUES ('Voodoo Doughnut', '97206', 'us') RETURNING venue_id;

--Left Join
SELECT e.title, v.name
FROM events e LEFT JOIN venues v
ON e.venue_id = v.venue_id;

--add hash index using create index command where each column must be unique
CREATE INDEX events_title
ON events USING hash (title);

--Consider a query to find all events that are on or after April 1.
SELECT *
FROM events
WHERE starts >= '2018-04-01';


--For this, a tree is the perfect data structure. To index the starts column with
--a B-tree, use this:
CREATE INDEX events_starts
ON events USING btree (starts);


/*FOREIGN KEY
It¡¯s worth noting that when you set a
constraint, PostgreSQL will
not automatically create an index on the targeted column(s). You¡¯ll need to
create an index on the targeted column(s) yourself.*-
