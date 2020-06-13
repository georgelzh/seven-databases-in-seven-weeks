/*
Day 2: Indexing, Aggregating, Mapreduce
Increasing MongoDB’s query performance is the first item on today’s docket,
followed by some more powerful and complex grouped queries. Finally, we’ll
round out the day with some data analysis using mapreduce.
*/

//Indexing: When Fast isn't Fast Enough
// mongodb has several good data structures for indexing

populatePhones(800, 5550000, 5650000) // This could take a minute
db.phones.find().limit(2)

/*
{ "_id" : 18005550000, "components" : { "country" : 1, "area" : 800,
"prefix" : 555, "number" : 5550000 }, "display" : "+1 800-5550000" }
{ "_id" : 88005550001, "components" : { "country" : 8, "area" : 800,
"prefix" : 555, "number" : 5550001 }, "display" : "+8 800-5550001" }


Whenever a new collection is created, Mongo automatically creates an index
by the _id. These indexes can be found in the system.indexes collection. The following
query shows all indexes in the database:
*/
db.getCollectionNames().forEach(function(collection) {
print("Indexes for the " + collection + " collection:");
printjson(db[collection].getIndexes());
});

/*
most queries will include more fields than just the _id, so we need to make
indexes on those fields.
gonna make a B-tree index on the display field. First, let's verify the index
will improve speed. first check a query without an index, the explain() method
is used to output details of a given operation.
*/

db.phones.find({display: "+1 800-565001"}).
	explain("executionStats").executionStats

// "executionTimeMillisEstimate" : 40

/*
create an index by calling ensureIndex(fields, options) on the collection.
The fields parameter is an object containing the fields to be indexed against.
he options parameter describes the type of index to make. In this case,
we’re building a unique index on display that should just drop duplicate entries
*/

db.phones.ensureIndex(
	{ display: 1 },
	{ unique: true, dropDups: true }
)

//check the query time again. we get "executionTimeMillisEstimate" : 0
db.phones.find({display: "+1 800-565001"}).
	explain("executionStats").executionStats

/*
The executionTimeMillisEstimate changed from 52 to 0—an infinite improvement
(52 / 0)! Just kidding, but the query is now orders of magnitude faster.
Mongo is no longer doing a full collection scan but instead walking the tree
to retrieve the value. Importantly, scanned objects dropped from 109999 to
1—since it has become a single unique lookup.

explain() is useful function but it's only for testing specific query calls.
for normal test or production environment, you'll need system profiler.
*/

/////////////system profiler.
/*
set the profiling level to 2 (level 2 stores all queries; profiling level 1
stores only slower queries greater than 100 milliseconds) and then run find()
as normal.
*/

db.setProfilingLevel(2)
db.phones.find({ display: "+1 800-5650001"})

/*
This will create a new object in the system.profile collection, which you can read
as any other table to get information about the query, such as a timestamp
for when it took place and performance information (such as executionTimeMillis-
Estimate as shown). You can fetch documents from that collection like any
other:
*/

db.system.profile.find()
/*
This will return a list of objects representing past queries. This query, for
example, would return stats about execution times from the first query in
the list:
*/

db.system.profile.find()[0].execStats

/*
Like yesterday’s nested queries, Mongo can build your index on nested values.
If you wanted to index on all area codes, use the dot-notated field representation:
components.area. In production, you should always build indexes in the
background using the { background : 1 } option.
*/

db.phones.ensureIndex( {"components.area" : 1}, { background : 1})

/*
If we find() all of the system indexes for our phones collection, the new one should
appear last. The first index is always automatically created to quickly look
up by _id, and the other two we added ourselves.
*/
db.phones.getIndexes()

/*
[
{
"v" : 2,
"key" : {
"_id" : 1
},
"name" : "_id_",
"ns" : "book.phones"
},
{
"v" : 2,
"unique" : true,
"key" : {
"display" : 1
},
"name" : "display_1",
"ns" : "book.phones"
},
{
"v" : 2,
"key" : {
"components.area" : 1
},
"name" : "components.area_1",
"ns" : "book.phones",
"background" : 1
}
]

///////Trick and tips for creating indexes:
We should close this section by noting that creating an index on a large collection
can be slow and resource-intensive. Indexes simply “cost” more in
Mongo than in a relational database like Postgres due to Mongo’s schemaless
nature. You should always consider these impacts when building an index
by creating indexes at off-peak times, running index creation in the background,
and running them manually rather than using automated index
creation. There are plenty more indexing tricks and tips online, but these are
the basics that may come in handy the most often.

/////////////////Question related statement above:
what does "indexes simply cost more in mongo than in a relational
database like postgres mean?" what is the cost? does it mean the moment it's
creating the indexes, it costs computer resources? or does it mean the query
gets slow when the collection is huge even if we have indexes created?



////////////////////////Mongo’s Many Useful CLI Tools////////////////
Before we move on to aggregation in Mongo, we want to briefly tell you about the
other shell goodies that Mongo provides out-of-the-box in addition to mongod and
mongo. We won’t cover them in this book but we do strongly recommend checking
them out, as they together make up one of the most amply equipped CLI toolbelts in
the NoSQL universe.

mongodump: Exports data from Mongo into .bson files. That can mean entire
collections or databases, filtered results based on a supplied query, and more

mongofiles: Manipulates large GridFS data files (GridFS is a specification for BSON
files exceeding 16 MB).

mongooplog: Polls operation logs from MongoDB replication operations

mongostore: Restores MongoDB databases and collections from backups created
using mongodump.

mongostat: Displays basic MongoDB server stats.

mongoexport: Exports data from Mongo into CSV (comma-separated value) and JSON
files. As with mongodump, that can mean entire databases and collections
or just some data chosen on the basis of query parameters.

mongoimport: Imports data into Mongo from JSON, CSV, or TSV (term-separated value)
files. We’ll use this tool on Day 3.

mongoperf: Performs user-defined performance tests against a MongoDB server.

mongos: Short for “MongoDB shard,” this tool provides a service for properly
routing data into a sharded MongoDB cluster (which we will not cover
in this chapter).

mongotop: Displays usage stats for each collection stored in a Mongo database.

bsondump: Converts BSON files into other formats, such as JSON.

for more info check out here: https://docs.mongodb.com/manual/reference/program
*/


//////////////////Aggregated Queries//////////
/*
MongoDB includes a handful of single-purpose aggregators: count() provides
the number of documents included in a result set (which we saw earlier), distinct()
collects the result set into an array of unique results, and aggregate()
returns documents according to a logic that you provide.
*/

//count the phone numbers greater than 5599999
db.phones.count({ "components.number" : { $gt : 5599999} })

/*
The distinct() method returns each matching value (not a full document) where
one or more exists. We can get the distinct component numbers that are less
than 5,550,005 in this way
*/

db.phones.distinct("components.number", 
{"components.number" : { $lt : 5550005} })
// [ 5550000, 5550001, 5550002, 5550003, 5550004 ]

/*
The aggregate() method is more complex but also much more powerful. It enables
you to specify a pipeline-style logic consisting of stages such as: $match filters
that return specific sets of documents; $group functions that group based on
some attribute; a $sort() logic that orders the documents by a sort key; and
many others.

You can chain together as many stages as you’d like, mixing and matching
at will. Think of aggregate() as a combination of WHERE, GROUP BY, and ORDER BY
clauses in SQL. The analogy isn’t perfect, but the aggregation API does a lot
of the same things.
*/

db.cities.count()
//99838

db.cities.find().limit(1)
db.cities.findOne()
/*
{
"_id" : ObjectId("5913ec4c059c950f9b799895"),
"name" : "Sant Julià de Lòria",
"country" : "AD",
"timezone" : "Europe/Andorra",
"population" : 8022,
"location" : {
	"longitude" : 42.46372,
	"latitude" : 1.49129
	}
}
*/

// return all unique europe area 
db.cities.distinct("timezone", { "timezone": /europe/i})


/*
We could use aggregate() to, for example, find the average population for all
cities in the Europe/London timezone. To do so, we could $match all documents
where timezone equals Europe/London, and then add a $group stage that produces
one document with an _id field with a value of averagePopulation and an
avgPop field that displays the average value across all population values in the
collection:
*/
db.cities.aggregate([
	{
		$match: {
			"timezone": {
				$eq: 'Europe/London'
			}
		}
	},
	{
		$group: {
			_id: 'averagePopulation', 
			avgPop: {
				$avg: '$population'
			}
		}
	}
])
// { "_id" : "averagePopulation", "avgPop" : 23226.22149712092 }

/*
We could also match all documents in that same timezone, sort them in
descending order by population, and then $project documents that only contain
the population field:
*/

db.cities.aggregate([
	{
		$match: {
			"timezone": {
				$eq: "Europe/London"
			}
		}
	},
	{
		$sort: {
			population: -1
		}
	},
	{
		$project: {
			_id: 0,
			name: 1,
			population: 1
		}
	}
])

/*
{ "name" : "City of London", "population" : 7556900 }
{ "name" : "London", "population" : 7556900 }
{ "name" : "Birmingham", "population" : 984333 }
// many others
*/

// find a city in china
db.cities.findOne({country:"CN"})

//return all unique country code
db.cities.distinct("country")

// return number of unique country code
db.cities.distinct("country").length

// return all cities name and population in china
db.cities.aggregate([
	{ $match: { country: "CN"} },
	{ $project: { _id: 0, name:1, populatation: 1}}
])


// return max population of the city in china
db.cities.aggregate([
	{ $match: { country: "CN"} },
	{ $group: {
		_id: 'max_population',
		population: {
			$max: '$population'
		}
	}}
])

// { "_id" : "max_population", "population" : 14608512 }
// reference: https://www.javamadesoeasy.com/2017/03/max-operator-in-mongodb-find-maximum.html#3


// drop the collection
db.cities.drop()

/*
conclusion:
there are endless possible combinations for aggregation. go explore other stage
types. Be aware that aggregations can be quite slow if you add a lot of
stages and/or perform them on very large collections. There are limits to how
well Mongo, as a schemaless database, can optimize these sorts of operations.
But if you’re careful to keep your collections reasonably sized and, even better,
structure your data to not require bold transformations to get the outputs
you want, then aggregate() can be a powerful and even speedy tool.
*/

////////Server-Side Commands///////////
/*
In addition to evaluating JavaScript functions, there are several pre-built
commands in Mongo, most of which are executed on the server, although
some require executing only under the admin database (which you can access
by entering use admin). The top command, for example, will output access details
about all collections on the server
*/

use admin
db.runCommand("top")

/*
You can also list all commands that are currently available
(let’s switch back to the book database first because the admin 
database provides a different set of commands):

When you run listCommands(), you may notice a lot of commands we’ve used
already. In fact, you can execute many common commands through the run-
Command() method, such as counting the number of phones. However, you
may notice a slightly different output.
*/

use book
db.listCommands()

db.runCommand( { "find" : "someCollection"} )
/*
{
	"cursor" : {
		"id" : NumberLong(0),
		"ns" : "book.someCollection",
		"firstBatch" : [ ]
	},
	"ok" : 1
}
*/

/*
Here, we see that this function returns an object containing a cursor and an
ok field. That’s because db.phones.find() is a wrapper function created for our
convenience by the shell’s JavaScript interface, whereas runCommand() is an
operation executed on the server. Remember that we can play detective on
how a function such as find() works by leaving off the calling parentheses.
*/

db.phones.find

//So what about the DBQuery object? How much more can we find out about it?

DBQuery

//function DBQuery() {
//    [native code]
//}


/*
//////////////////////Diversion////////////
1. most of the execution in the mongo console is executed on the server,
not the client, which just provides some convenient wrapper functions

2. we can leverage the concept of executing server-side code for our own 
purposes to create something in MongoDB that’s similar to the stored 
procedures we saw in PostgreSQL.

Any JavaScript function can be stored in a special collection named system.js. This is
just a normal collection; you save the function by setting the name as the _id and a
function object as the value.

*/

db.system.js.save({
	_id: 'getLast',
	value: function(collection) {
		return collection.find({}).sort({'_id':1}).limit(1)[0];
	}
})


// now you can use that function by loading it into the current namespaces
db.loadServerScripts()
getLast(db.phones).display

//+1 800-5550002

///////////////Mapreduce (and Finalize)//////////
// https://docs.mongodb.com/manual/core/map-reduce/

/*
In MongoDB, the map step involves creating a mapper function that calls an
emit() function. The benefit of this approach is you can emit more than once per
document. The reduce() function accepts a single key and a list of values that
were emitted to that key. Finally, Mongo provides an optional third step called
finalize(), which is executed only once per mapped value after the reducers are
run. This allows you to perform any final calculations or cleanup you may need.

Because we already know the basics of mapreduce, we’ll skip the intro wadingpool
example and go right to the high-dive. Let’s generate a report that counts
all phone numbers that contain the same digits for each country. First, we’ll
store a helper function that extracts an array of all distinct numbers (understanding
how this helper works is not imperative to understanding the overall
mapreduce).

distinctDigits = function(phone){
var number = phone.components.number + '',
seen = [],
result = [],
i = number.length;
while(i--) {
seen[+number[i]] = 1;
}
for (var i = 0; i < 10; i++) {
if (seen[i]) {
result[result.length] = i;
}
}
return result;
}
db.system.js.save({_id: 'distinctDigits', value: distinctDigits})
*/

// load distinct Digits.js in mongo
load('C:\\Users\\George\\Desktop\\Seven-Databases-in-Seven-Weeks\\mongodb\\distinctDigits.js')

/*
Now we can get to work on the mapper. As with any mapreduce function,
deciding what fields to map by is a crucial decision because it dictates the
aggregated values that you return. Because our report is finding distinct
numbers, the array of distinct values is one field. But because we also need
to query by country, that is another field. We add both values as a compound
key: {digits : X, country : Y}.
Our goal is to simply count these values, so we emit the value 1 (each document
represents one item to count). The reducer’s job is to sum all those 1s
together.
*/

map = function() {
	var digits = distinctDigits(this);
	emit({
		digits: digits,
		country: this.components.country
	},{
		count : 1
	})
}

reduce = function(key, values) {
	var total = 0; 
	for (var i = 0; i < values.length; i++) {
		total += values[i].count;
	}
	return { count: total };
}


/*
Because we set the collection name via the out parameter (out: 'phones.report'),
you can query the results like any other. It’s a materialized view that you can
see in the show tables list.
*/

results = db.runCommand({
	mapReduce: 'phones',
	map: map,
	reduce: reduce,
	out: 'phones.report'
})

/*
Type it to continue iterating through the results. Note that the unique emitted
keys are under the field _ids, and all of the data returned from the reducers
is under the field value.

If you prefer that the mapreducer just output the results, rather than outputting
to a collection, you can set the out value to { inline : 1 }, but bear in
mind that there is a limit to the size of a result you can output. As of Mongo
2.0, that limit is 16 MB.

Reducers can have either mapped (emitted) results or other reducer results
as inputs.
*/

reduce = function(key, values) {
	var total = 0;
	for (var i = 0; i < values.lengthl;  i++) {
		var data = values[i];
		if('total' in data) {
			total += data.total;
		} else {
			total += data.count;
		}
	}
	return { total: total };
}

/*
However, Mongo predicted that you might need to perform some final changes,
such as renaming a field or some other calculations. If you really need the
output field to be total, you can implement a finalize() function, which works
the same way as the finalize function under group().
*/
