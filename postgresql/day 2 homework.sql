Day 2: Homework
Find the list of aggregate functions in the PostgreSQL docs.
https://www.postgresql.org/docs/12/functions-aggregate.html

Find a GUI program to interact with PostgreSQL, such as pgAdmin,
Datagrip, or Navicat.
https://scalegrid.io/blog/which-is-the-best-postgresql-gui-2019-comparison/
pgAdmin,Dbeaver, Navicat, Datagrip, OminiDB


Do
1. Create a rule that captures DELETEs on venues and instead sets the active flag (created in the Day 1 homework) to FALSE.



Create rule delete_venues as on delete to venues do instead
	Update venues
	Set active = false
	Where venue_id = OLD.venue_id;




2. A temporary table was not the best way to implement our event calendar pivot table. The generate_series(a, b) function returns a set of records, from a to b. Replace the month_count table SELECT with this.

Select generate_series(1,12);


3. Build a pivot table that displays every day in a single month, where each week of the month is a row and each day name forms a column across the top (seven days, starting with Sunday and ending with Saturday) like a standard month calendar. Each day should contain a count of the number of events for that date or should remain blank if no event occurs.

Analysis:
Rowid is week in a month,
Category is the day in the month, 
Value is number of events within the day.

Select * from crosstab(
'SELECT
extract(week from starts) as week,
extract(day from starts) as day, count(*)
FROM events
GROUP BY week, day
ORDER BY week, day',
	'Select generate_series(1,7)')
AS (week int, sun int, mon int, tue int, wed int, thu int, fri int, sat int)  ORDER BY week;
