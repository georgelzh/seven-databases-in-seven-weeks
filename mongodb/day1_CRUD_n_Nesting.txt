// create a database called book
mongo book

show dbs

use dbname

db.help()

db.collectionName.help()

show collections

typeof db

db.collectionName.functionName # for checking the function code

db.collectionName.find()	# return all data for the collection

db.collectionName.find({ _id : ObjectId("id") }) # return the specific object

// copy paste functions to the mongodb terminal, you will be able to call it
function insertCity(
name, population, lastCensus,
famousFor, mayorInfo
) {
db.towns.insert({
name: name,
population: population,
lastCensus: ISODate(lastCensus),
famousFor: famousFor,
mayor : mayorInfo
});
}


/*
The find() function also accepts an optional second parameter: a fields object
we can use to filter which fields are retrieved. If we want only the town name
(along with _id), pass in name with a value resolving to 1 (or true).
*/

db.collectionName.find( { _id : ObjectId("id")}, {name : 1}) # return only name

// return everything else except for name
db.collectionName.find( { _id : ObjectId("id")}, {name : 0}) 

/*
As in PostgreSQL, in Mongo you can construct ad hoc queries on the basis of field
values, ranges, or a combination of criteria. To find all towns that begin with the
letter P and have a population less than 10,000, you can use a Perl-compatible
regular expression (PCRE)2 and a range operator. This query should return the
JSON object for Punxsutawney, but including only the name and population fields:
*/

db.towns.find(
	{ name : /^P/, population : {$lt : 10000}},
	{ _id: 0, name: 1, population : 1}
)
// returns {"/name" : "Punxsutawney", "population" : 6200 }


/*
The good news about the querying language being JavaScript is that you can
construct operations as you would objects. Here, we build criteria where the
population must be between 10,000 and 1 million people.
*/

var population_range = {
	$lt: 1000000,
	$gt: 10000
}

db.towns.find(
	{ name: /^P/, population: population_range },
	{ name: 1 }
)

// { "_id" : ObjectId("5e098089c8435cf060041a45"), "name" : "Portland" }


db.towns.find(
	{ lastCensus: { $gte: ISODate('2016-06-01') } },
	{ _id: 0, name: 1}
)


// {"name" : "New York" }
// { "name" : "Portland" }



///////////////// Digging Deep
//Mongo loves nested array data. You can query by matching exact values:

db.towns.find(
	{ famoursFor: 'Food' },
	{ _id: 0, name: 1, famousFor: 1 } 
)_

db.towns.find(
	{ name: "New York" }
)

db.towns.find(
	{ famousFor : 'food' },
	{ _id : 0, name : 1, FamousFor : 1 }
)

// matching partial values:

db.towns.find(
	{ famousFor : /moma/i },
	{ _id : 0, name : 1, famousFor : 1 }
)

// query by all matching values:

db.towns.find(
	{ famousFor : { $all : ['food', 'beer'] } },
	{ _id : 0, name : 1, famousFor : 1}
)

// or lack or matching values:

db.towns.find(
	{ famousFor : { $nin : ['food', 'beer'] } },
	{ _id : 0, name : 1, famousFor :  1 }
)


/*
But the true power of Mongo stems from its ability to dig down into a document
and return the results of deeply nested subdocuments. To query a subdocument,
your field name is a string separating nested layers with a dot. For
instance, you can find towns with mayors from the Democratic Party:
*/

db.towns.find(
	{ 'mayor.party' : 'D' },
	{ _id : 0, name : 1, mayer: 1 }
)

// or those with mayers who don't have a party

db.towns.find(
	{ 'mayor.party' : { $exists : false } },
	{ _id : 0, name : 1, mayor: 1}
)

/*
The previous queries are great if you want to find documents with a single
matching field, but what if you need to match several fields of a subdocument?

elemMatch

We’ll round out our dig with the $elemMatch directive. Let’s create another collection
that stores countries. This time we’ll override each _id to be a string
of our choosing rather than an auto-generated identifier.
*/

db.countries.insert({
	_id : "ca",
	name : "Canada",
	exports : {
		foods : [
		   	{ name: 'bacon', tasty : false },
		   	{ name : 'syrup', tasty: true }
		]
	}
})


// checkout how many countries are created
db.countries.count()

// find a country not only exports bacon but exports tasty bacon

db.countries.find(
	{ 'exports.foods.name' : 'bacon', 'exports.foods.tasty' : true },
	{ _id : 0, name : 1}
)

// this would return usa and canada, but canada is returned only bc its syrup
// is tasty. so we are supposed to use $elemMatch

db.countries.find(
	{
		'exports.foods' : {
			$elemMatch : {
				name : 'bacon',
				tasty : true
			}
		}
	},
	{ _id : 0, name : 1}
)

/*
$elemMatch criteria can utilize advanced operators, too. You can find any
country that exports a tasty food that also has a condiment label:
*/

db.countries.find(
	{
		'exports.foods' : {
			$elemMatch: {
				tasty: true,
				condiment : { $exists : true}
			}
		}
	},
	{ _id : 0, name : 1}
)

// Boolean Ops

/*
So far, all of our criteria are implicitly and operations. If you try to find a
country with the name United States and an _id of mx, Mongo will yield no
results.

> db.countries.find(
	{ _id : "mx", name : "United States" },
	{ _id : 1 }
)
However, searching for one or the other with $or will return two results. Think
of this layout like prefix notation: OR A B.
*/

db.countries.find(
	{
		$or : [
			{_id: "mx"},
			{ name : "United States"}
		]
	},
	{ _id : 1}
)

{ "_id" : "us" }
{ "_id" : "mx" }



// some commands list below, but not all.
// get a cheatsheet from mongo website or visits mongoDB online doc

/*
Command Description
Match by any PCRE-compliant regular expression string (or
just use the // delimiters as shown earlier)
$regex
$ne Not equal to
$lt Less than
$lte Less than or equal to
$gt Greater than
$gte Greater than or equal to
$exists Check for the existence of a field
$all Match all elements in an array
$in Match any elements in an array
$nin Does not match any elements in an array
$elemMatch Match all fields in an array of nested documents
$or or
$nor Not or
$size Match array of given size
$mod Modulus
$type Match if field is a given datatype
$not Negate the given operator check
*/


// Updating, update some states to the the towns
// update function takes two parameters, the first one is what you pass to find
// the second parameter is either an object that will replace the matched doc
// or a modifier operation. the modifier is "$set"

db.towns.update(
	{ _id : ObjectId("5e098089c8435cf060041a45") },
	{ $set : {"state" : "OR" } }
)

// to replace the whole object, this has no $set
db.towns.update(
	{ _id : ObjectId("5e098089c8435cf060041a45") },
	{ {"state" : "OR" } }
)
/*
{
	"_id" : ObjectId("5e098089c8435cf060041a45"),
	"name" : "Portland",
	"population" : 582000,
	"lastCensus" : ISODate("2016-09-20T00:00:00Z"),
	"famousFor" : [
		"beer",
		"food",
		"Portlandia"
	],
	"mayor" : {
		"name" : "Ted Wheeler",
		"party" : "D"
	},
	"state" : "OR"
}
*/


// You can do more than $set a value. $inc (increment a number) is a pretty useful
// one. Let’s increment Portland’s population by 1,000.

db.towns.update(
	{ _id : ObjectId("5e098089c8435cf060041a45")},
	{ $inc : { population: 1000 }}
)

// 	"population" : 583000,
db.towns.findOne({ _id : ObjectId("5e098089c8435cf060041a45") })

/*
Command Description
$set Sets the given field with the given value
$unset Removes the field
$inc Adds the given field by the given number
$pop Removes the last (or first) element from an array
$push Adds the value to an array
$pushAll Adds all values to an array
$addToSet Similar to push, but won’t duplicate values
$pull Removes matching values from an array
$pullAll Removes all matching values from an array
*/

/* 
References
As we mentioned previously, Mongo isn’t built to perform joins. Because of
its distributed nature, joins in Mongo would be pretty inefficient operations.
Still, it’s sometimes useful for documents to reference each other. In these
cases, the Mongo community suggests that you use a construct like { $ref :
"collection_name", $id : "reference_id" }. For example, we can update the towns collection
to contain a reference to a document in countries.
*/

db.towns.update(
	{ _id : ObjectId("5e09777cc8435cf060041a43")},
	{ $set : { country: { $ref: "countries", $id: "us" } } }
)

// dereference --------how to read the country data of the new york city

// get newyork city data
var newyork = db.towns.findOne( { _id : ObjectId("5e09777cc8435cf060041a43") } )
 
//"country" : DBRef("countries", "us")

// retrieve newyork city country data -- dereference
var newyorkCountryRef = newyork.country.$ref

// retrieve the country data for newYork city
db[newyorkCountryRef].findOne({ _id : newyork.country.$id })

/*
> newyork.country.$ref
countries
> db[newyork.country.$ref].findOne({ _id : newyork.country.$id})
*/


///////////////////Delete
/*
Removing documents from a collection is simple. Just replace the find() function
with a call to remove(), and all documents that match given the criteria will be
removed. It’s important to note that the entire matching document will be
removed, not just a matching element or a matching subdocument.
We recommend running find() to verify your criteria before running remove().
Mongo won’t think twice before running your operation. Let’s remove all
countries that export bacon that isn’t tasty.
*/

var badBacon = {
	'exports.foods' : {
		$elemMatch: {
			name : 'bacon',
			tasty : false
		}
	}
}

// check the search result
db.countries.find(badBacon)

// looks good, now remove
db.countries.remove(badBacon)
db.countries.count() //2


// Reading with Code
/*
Let’s close out this day with one more interesting query option: code. You can
request that MongoDB run a decision function across your documents. We
placed this last because it should always be a last resort. These queries run
quite slowly, you can’t index them, and Mongo can’t optimize them. But
sometimes it’s hard to beat the power of custom code.

Let’s say that we’re looking for a city with a population between 6,000 and
600,000 people.
*/

db.towns.find( function() {
	return this.population > 6000 && this.population < 600000;
} )

// Mongo even has a shortcut for simple decision functions.
// You can run custom code with other criteria using the $where clause. In this
// example, the query also filters for towns famous for groundhogs named Phil.

db.towns.find({
	$where : "this.population > 6000 && this.population < 600000",
	famousFor : /Phil/
})

/*
A word of warning: Mongo will blindly run this function against each document
despite there being no guarantee that the given field exists in every document.
For example, if you assume a population field exists and population is missing
in even a single document, the entire query will fail because the JavaScript
cannot properly execute. Be careful when you write custom JavaScript
functions, be comfortable using JavaScript before attempting custom code,
and in general avoid these sorts of operations in production.


Today we took a peek at our first document database, MongoDB. We saw how
we can store nested structured data as JSON objects and query that data to
any depth. You learned that a document can be envisioned as a schemaless
row in the relational model, keyed by a generated _id. A set of documents is
called a collection in Mongo, similar to a table in PostgreSQL but also quite
different.
Unlike the previous styles we’ve encountered, with collections of sets of simple
datatypes, Mongo stores complex, denormalized documents, stored and
retrieved as collections of arbitrary JSON structures. Mongo tops off this
flexible storage strategy with a powerful query mechanism unconstrained by
any predefined schema.
Its denormalized nature makes a document database a superb choice for
storing data with unknown qualities, while other styles (such as relational or
columnar) prefer, or sometimes even demand, that you know your data
models in advance and require schema migrations to add or edit fields.
*/








