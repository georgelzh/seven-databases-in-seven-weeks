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































