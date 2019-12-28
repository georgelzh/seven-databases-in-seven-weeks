DAY 1 Homework:

PROBLEM 1:Find the country name for 'Fight Club'Event
SOLUTION:
select country_name 
from (select country_code from events e JOIN venues v 
ON e.venue_id = v.venue_id where e.title = 'Fight Club') t JOIN countries c 
ON t.country_code = c.country_code;


PROBLEM 2: ALTER TABLE venues and ADD a column with type bool, set default value true.
ALTER TABLE venues ADD COLUMN active bool DEFAULT true;


about MATCH 
https:--dba.stackexchange.com-questions-58894-differences-between-match-full-match-simple-and-match-partial
