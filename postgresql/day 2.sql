Day 2:

Here¡¯s a quick SQL tip: Rather than setting the venue_id explicitly, you can
sub-SELECT it using a more human-readable title. If Moby is playing at the
Crystal Ballroom, set the venue_id like this:
INSERT INTO events (title, starts, ends, venue_id)
VALUES ('Moby', '2018-02-06 21:00', '2018-02-06 23:00', (
SELECT venue_id
FROM venues
WHERE name = 'Crystal Ballroom'
));

Aggregate functions

--delete
DELETE FROM table
WHERE condition;


--count 
SELECT count(title)
FROM events
WHERE title LIKE '%Day%';

--to type Valentine¡¯s day in postgre two ¡®¡¯ ¡®¡¯
¡®Valentine¡¯¡¯s Day¡¯

--use min and max
select min(starts), max(ends) from events e INNER JOIN venues v ON e.venue_id = v.venue_id where name = 'Crystal Ballroom';

--Problem with this solution downbelow
Aggregate functions are useful but limited on their own. If we wanted to count
all events at each venue, we could write the following for each venue ID:
SELECT count(*) FROM events WHERE venue_id = 1;
SELECT count(*) FROM events WHERE venue_id = 2;
SELECT count(*) FROM events WHERE venue_id = 3;
SELECT count(*) FROM events WHERE venue_id IS NULL;

Grouping
GROUP BY is a shortcut for running the previous queries all at once. With GROUP
BY, you tell Postgres to place the rows into groups and then perform some
aggregate function (such as count()) on those groups.

SELECT venue_id, count(*)
FROM events
GROUP BY venue_id;

--having clause
SELECT venue_id
FROM events
GROUP BY venue_id
HAVING count(*) >= 2 AND venue_id IS NOT NULL;


Windows Function
--If we attempt to select the title column without grouping by it, we can expect an error.
SELECT title, venue_id, count(*)
FROM events
GROUP BY venue_id;

ERROR: column "events.title" must appear in the GROUP BY clause or \ be used in an aggregate function. We are counting rows by venue_id. Because two titles(¡®fight club¡¯ and ¡®wedding¡¯) have the same venue_id. Postgre does not know which one to display.

By using Windows Function, we can eliminate this problem


SELECT title, count(*) OVER (PARTITION BY venue_id) FROM events;


Transaction - ACID
PostgreSQL transactions follow ACID compliance, which stands for:
? Atomic (either all operations succeed or none do)
? Consistent (the data will always be in a good state and never in an inconsistent
state)
? Isolated (transactions don¡¯t interfere with one another)
? Durable (a committed transaction is safe, even after a server crash)

--We can wrap any transaction within a BEGIN TRANSACTION block. To verify
--atomicity, we¡¯ll kill the transaction with the ROLLBACK command.
BEGIN TRANSACTION;
DELETE FROM events;
ROLLBACK;
SELECT * FROM events;

--The events all remain. Transactions are useful when you¡¯re modifying two
--tables that you don¡¯t want out of sync. The classic example is a debit-credit
--system for a bank, where money is moved from one account to another:
BEGIN TRANSACTION;
UPDATE account SET total=total+5000.0 WHERE account_id=1337;
UPDATE account SET total=total-5000.0 WHERE account_id=45887;
END;

Stored Procedure 
postgres-add_event.sql

CREATE OR REPLACE FUNCTION add_event(
title text,
starts timestamp,
ends timestamp,
venue text,
postal varchar(9),
country char(2))
RETURNS boolean AS $$
DECLARE
did_insert boolean := false;
found_count integer;
the_venue_id integer;
BEGIN
SELECT venue_id INTO the_venue_id
FROM venues v
WHERE v.postal_code=postal AND v.country_code=country AND v.name ILIKE venue
LIMIT 1;
IF the_venue_id IS NULL THEN
INSERT INTO venues (name, postal_code, country_code)
VALUES (venue, postal, country)
RETURNING venue_id INTO the_venue_id;
did_insert := true;
END IF;
-- Note: this is a notice, not an error as in some programming languages
RAISE NOTICE 'Venue found %', the_venue_id;
INSERT INTO events (title, starts, ends, venue_id)
VALUES (title, starts, ends, the_venue_id);
RETURN did_insert;
END;
$$ LANGUAGE plpgsql;

--to import external file into current schema
7dbs=# \i add_event.sql

--This stored procedure is run as a SELECT statement.
SELECT add_event('House Party', '2018-05-03 23:00',
'2018-05-04 02:00', 'Run''s House', '97206', 'us');

The language used to write add_event.sql is called Procedural Language(PL)/PostgreSQL.
Postgre supports three more core languages for writing procedures: Tel (PL/Tel), Perl (PL/Perl), and Python (PL/Python). People have written extensions for a dozen more, including Ruby, Java, PHP, Scheme, and others listed in the public documentation. 


--list the languages installed in your database. The createlang command is also used to add --new languages, which you can find online
$ createlang 7dbs --list

--Pull the trigger. Triggers automatically fire stored procedures when some event happens, such --as an insert or update. They allow the database to enforce some required behavior in --response to changing data. 

--log table
CREATE TABLE logs (
event_id integer,
old_title varchar(255),
old_starts timestamp,
old_ends timestamp,
logged_at timestamp DEFAULT current_timestamp);


PostgreSQL - create a log_event log 
postgres/log_event.sql --set up sqlighte 

CREATE OR REPLACE FUNCTION log_event() RETURNS trigger AS $$
DECLARE
BEGIN
INSERT INTO logs (event_id, old_title, old_starts, old_ends)
VALUES (OLD.event_id, OLD.title, OLD.starts, OLD.ends);
RAISE NOTICE 'Someone just changed event #%', OLD.event_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;


--create our trigger to log changes after any row is updated.
CREATE TRIGGER log_events
AFTER UPDATE ON events
FOR EACH ROW EXECUTE PROCEDURE log_event();

--So, it turns out our party at Run¡¯s House has to end earlier than we hoped. Let¡¯s change the --event.
UPDATE events
SET ends='2018-05-04 01:00:00'
WHERE title='House Party';

--NOTICE: Someone just changed event #..
--And the old end time was logged.
SELECT event_id, old_title, old_ends, logged_at
FROM logs;

Viewing the world
--create view
Create view holidays AS
	Select event_id as holiday_id, title as name, starts as date
	From events
	Where title like ¡®%day%¡¯ and venue_id is null;

--read view
SELECT name, to_char(date, 'Month DD, YYYY') AS date
FROM holidays
WHERE date <= '2018-04-01';

--alter table
Alter table events
Add colors text array;

--update view query to contain the color array
Create or replace view holidays as
	Select event_id as holiday_id, title as name, starts as date, colors
	From events
	Where title like ¡®%day%¡¯ and venue_id is null;

--now is a matter of setting an array or color strings to the holiday of choice. We can¡¯t update a --view directly.
Update holidays set colors = ¡®{¡°red¡±, ¡°green¡±}¡¯ where name = ¡®Christmas Day¡¯;

--to yield performance gains, create materialized view
CREATE MATERIALIZED VIEW ...

RULES
--view is a rule, to see explanation of holidays check out the query below:
EXPLAIN VERBOSE
	Select * 
	From holidays;


--drop a rule
Drop rule ruleName on TableName;


--https://github.com/vichheann/seven-databases/blob/master/postgresql/day2_rules.sql

--check the planner of the sql
EXPLAIN VERBOSE
SELECT event_id AS holiday_id,
title AS name, starts AS date, colors
FROM events
WHERE title LIKE '%Day%' AND venue_id IS NULL;


--create_rule.sql
Create rule update_holidays as on update to holidays do instead
	Update events
	Set title = NEW.name,
		Starts = NEW.date,
		Colors = NEW.colors
	Where title = OLD.name;

--update holidays
UPDATE holidays SET colors = '{"red","green"}' where name = 'Christmas Day';

--insert_holiday.sql
Create rule insert_holidays as on insert to holidays do instead
	Insert into events (title, starts, colors) values (NEW.name, NEW.date, NEW.colors);

--insert into holiday
insert into holidays (name, date, colors) values ('World Peace Day', '2018-03-24 00:00:00', '{black}');

--delete_holiday.sql
create rule delete_holidays as on delete to holidays do instead delete from events where event_id = OLD.holiday_id;

--delete a row
delete from holidays where holiday_id =2;
