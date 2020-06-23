/*

Day 3: Replica Sets, Sharding, GeoSpatial, and GridFS

What makes document databases unique is their ability to efficiently handle 
arbitrarily nested, schemaless data documents. Thus far, we’ve run Mongo as 
a single server. But if you were to run Mongo in production, you’d want to 
run it as a cluster of machines, which would provide for much higher 
availability and enable you to replicate data across servers, shard 
collections into many pieces, and perform queries in parallel.


//////////////////////-------- Replica Set --------///////////////

Mongo was meant to scale out not to standalone mode
Mongo was meant to scale out, not to run in standalone mode. It was built
for data consistency and partition tolerance, but sharding data has a cost: If
one part of a collection is lost, the whole thing is compromised.

Mongo deals with this implicit sharding weakness in a simple manner: duplication. 
You should rarely run a single Mongo instance in production and instead replicate 
the stored data across multiple services.

we’ll start from scratch and spawn a few new servers. Mongo’s default port is 27017, 
so we’ll start up each server on other ports. Remember that you must create the data
directories first, so create three of them:


make directory for new mongodb server
// $ mkdir ./mongo1 ./mongo2 ./mongo3

Next, we’ll fire up the Mongo servers. This time we’ll add the replSet flag with
the name book and specify the ports.
*/

mongod --replSet book --dbpath ./mongo1 --port 27011

/*
Open another terminal window and run the next command, which launches
another server, pointing to a different directory, available on another port.
Then open a third terminal to start the third server.
*/

mongod --replSet book --dbpath ./mongo2 --port 27012
mongod --replSet book --dbpath ./mongo3 --port 27013


/*
Notice that you get lots of this noise on the output, with error messages like this:
[initandlisten] Did not find local voted for document at startup
That’s a good thing because we haven’t yet initialized our replica set and
Mongo is letting us know that. Fire up a mongo shell to one of the servers, and
execute the rs.initiate() function.
*/

$ mongo localhost:27011

rs.initiate({
    _id: "book",
    members:[
        {_id: 1, host: 'localhost:27011'},
        {_id: 2, host: 'localhost:27012'},
        {_id: 3, host: 'localhost:27013'}
    ]
})


// rs.status().ok
// 1

/*
Notice we’re using a new object called rs (replica set) instead of db (database).
Like other objects, it has a help() method you can call. Running the status()
command will let us know when our replica set is running, so just keep
checking the status for completion before continuing. If you watch the three
server outputs, you should see that one server outputs this line:
Member ... is now in state PRIMARY

PRIMARY will be the master server. Chances are, this will be the server on port
27011 (because it started first); however, if it’s not, go ahead and fire up a
console to the primary. Just insert any old thing on the command line, and
we’ll try an experiment.
*/

db.echo.insert({ say : 'HELLO!' })

/*
now quit console, and kill the primary mongod, after this, a new primary will
be elected, find that new primary. it shows in the mongod server log. 

open a console into that primary mongod.
*/
db.echo.find({}) //returns the value we just inserted


/*
We’ll play one more round of our console-shuffle game. Open a console into
the remaining SECONDARY server by running mongo localhost:27013 . Just to be sure,
run the isMaster() function. Ours looked like this:

> db.isMaster().ismaster
false
> db.isMaster().primary
localhost:27012

In this shell, let’s attempt to insert another value on the secondary server
*/

db.echo.insert({say: "is this thing on?"})
/*
book:SECONDARY> db.echo.insert({say: "is this thing on?"})
WriteCommandError({
	"operationTime" : Timestamp(1592713833, 1),
	"ok" : 0,
	"errmsg" : "not master",
	"code" : 10107,
	"codeName" : "NotMaster",
	"$clusterTime" : {
		"clusterTime" : Timestamp(1592713833, 1),
		"signature" : {
			"hash" : BinData(0,"AAAAAAAAAAAAAAAAAAAAAAAAAAA="),
			"keyId" : NumberLong(0)
		}
	}
})

book:SECONDARY> db.echo.find({})
Error: error: {
	"operationTime" : Timestamp(1592713980, 1),
	"ok" : 0,
	"errmsg" : "not master and slaveOk=false",
	"code" : 13435,
	"codeName" : "NotMasterNoSlaveOk",
	"$clusterTime" : {
		"clusterTime" : Timestamp(1592713980, 1),
		"signature" : {
			"hash" : BinData(0,"AAAAAAAAAAAAAAAAAAAAAAAAAAA="),
			"keyId" : NumberLong(0)
		}
	}
}

This message is letting us know that we can neither write to a secondary node
nor read directly from it. There is only one master per replica set, and you
must interact with it. It is the gatekeeper to the set.
Replicating data has its own issues not found in single-source databases. In
the Mongo setup, one problem is deciding who gets promoted when a master
node goes down. Mongo deals with this by giving each mongod service a vote,
and the one with the freshest data is elected the new master. Right now, you
should still have two mongod services running. Go ahead and shut down the
current master (aka primary node). Remember, when we did this with three
nodes, one of the others just got promoted to be the new master. Now the last
remaining node is implicitly the master.
Go ahead and relaunch the other servers and watch the logs. When the nodes
are brought back up, they go into a recovery state and attempt to resync their
data with the new master node. “Wait a minute!?” we hear you cry. “So, what
if the original master had data that did not yet propagate?” Those operations
are dropped. A write in a Mongo replica set isn’t considered successful until
most nodes have a copy of the data.


///////////The Problem with Even Nodes
MongoDB expects an odd number of total nodes in the replica set. Consider
a five-node network, for example. If connection issues split it into a three-
node fragment and a two-node fragment, the larger fragment has a clear
majority and can elect a master and continue servicing requests. With no
clear majority, a quorum couldn’t be reached

To see why an odd number of nodes is preferred, consider what might happen
to a four-node replica set. Say a network partition causes two of the servers
to lose connectivity from the other two. One set will have the original master,
but because it can’t see a clear majority of the network, the master steps
down. The other set will similarly be unable to elect a master because it, too,
can’t communicate with a clear majority of nodes. Both sets are now unable
to process requests and the system is effectively down. Having an odd number
of total nodes would have made this particular scenario—a fragmented network
where each fragment has less than a clear majority—less likely to occur.

Because it’s a CP system, Mongo always knows the most recent value; the
client needn’t decide. Mongo’s concern is strong consistency on writes, and
preventing a multimaster scenario is not a bad method for achieving it.

//Solution:
Voting and Arbiters
You may not always want to have an odd number of servers replicating data. In that
case, you can either launch an arbiter (generally recommended) or increase voting
rights on your servers (generally not recommended). 

You launch it just like any other server but on configuration set a flag, like 
this: {_id: 3, host: 'localhost:27013', arbiterOnly : true}. Arbiters are useful 
for breaking ties, like the U.S. Vice President in the Senate. By default, 
each mongod instance has a single vote.

For more detail you can google.


///////////////////////----------Sharding-----------///////////////
One of the core goals of Mongo is to provide safe and quick handling of very
large datasets. The clearest method of achieving this is through horizontal
sharding by value ranges—or just sharding for brevity. Rather than a single
server hosting all values in a collection, some range of values is split, or
sharded, onto other servers.
For example, in our phone numbers collection,
we may put all phone numbers less than 1-500-000-0000 onto Mongo server
A and put numbers greater than or equal to 1-500-000-0001 onto server B.
Mongo makes this easier by autosharding, managing this division for you.

Let’s launch a couple of (nonreplicating) mongod servers. Like replica sets,
there’s a special parameter necessary to be considered a shard server (which
just means this server is capable of sharding).
*/
mkdir ./mongo4 ./mongo5
mongod --shardsvr --dbpath ./mongo4 --port 27014
mongod --shardsvr --dbpath ./mongo5 --port 27015

/*
Now you need a server to actually keep track of your keys. Imagine you created
a table to store city names alphabetically. You need some way to know that,
for example, cities starting with A through N go to server mongo4 and O
through Z go to server mongo5. In Mongo, you create a config server (which
is just a regular mongod ) that keeps track of which server (mongo4 or mongo5)
owns what values. You’ll need to create and initialize a second replica set for
the cluster’s configuration (let’s call it configSet ).
*/

mkdir ./mongoconfig
mongod --configsvr --replSet configSet --dbpath ./mongoconfig --port 27016


/*
Now enter the Mongo shell for the config server by running mongo localhost:27016
and initiate the config server cluster (with just one member for this example):
*/

rs.initiate({
	_id: 'configSet',
	configsvr: true,
	members: [
	{
	_id: 0,
	host: 'localhost:27016'
	}
	]
})

rs.status().ok // 1

/*
Finally, you need to run yet another server called mongos , which is the single
point of entry for our clients. The mongos server will connect to the mongoconfig
config server to keep track of the sharding information stored there. You point
mongos to the replSet/server:port with the --configdb flag.
*/

mongos --configdb configSet/localhost:27016 --port 27020

/*
A neat thing about mongos is that it is a lightweight clone of a full mongod
server. Nearly any command you can throw at a mongod you can throw at a
mongos , which makes it the perfect go-between for clients to connect to multiple
sharded servers. The following picture of our server setup may help.

Clients -> mongos
mongos -> [config(mongod), shard1(mongod), shard2(mongod)]
config(mongod) -> [shard1(mongod), shard2(mongod]
shard1(mongod) -> config(mongod)
shard2(mongod) -> config(mongod)
*/


/*
Now let’s jump into the mongos server console in the admin database by running
mongo localhost:27020/admin . We’re going to configure some sharding.
*/
sh.addShard('localhost:27014') // {"shardAdded" : "shard0000", "ok" : 1 }
sh.addShard('localhost:27015') // {"shardAdded" : "shard0001", "ok" : 1 }


/*
With that setup, now we have to give it the database and collection to shard
and the field to shard by (in our case, the city name).
*/
db.runCommand({ enablesharding : "test" }) //ok:1

db.runCommand({ shardcollection : "test.cities", key : {name : 1} }) // ok:1

/*
//////////mongos vs. mongoconfig
You may wonder why Mongo separates the config server and the mongos point of entry
into two different servers. In production environments, they will generally live on
different physical servers. The config server (which can itself be replicated across
multiple servers) manages the sharded information for other sharded servers, while
mongos will likely live on your local application server where clients can easily connect
(without needing to manage which shards to connect to).


With all that setup out of the way, let’s load some data. If you download the
book code, you’ll find a 12 MB data file named mongoCities100000.json that con-
tains data for every city in the world with a population of more than 1,000
people. Download that file, and run the following import script that imports
the data into your mongos server:
*/

// run this in Linux terminal rather than running it inside of mongo Client
mongoimport --host=localhost:27020 --db=test --collection=cities --type=json --file=mongoCities100000.json

/*
mongoimport \
--host localhost:27020 \
--db test \
--collection cities \
--type json \
mongoCities100000.json
*/

/*
If the import is successful, you should see imported 99838 documents in the output
(not quite 100,000 cities as the filename would suggest, but pretty close).


///////////////////-----GeoSpatial Queries------/////////////
mongo can quickly perform geospatial queries. The core of the geospatial secret lies in
indexing. It's a special form of indexing geographic data called "geohash" that not only
finds values of a specific value or range quickly but finds nearby values quickly in
ad hoc queries. 
To query the geo data we imported previously. we need to 1. index the data on the
location field. the 2d index must be set on any two value fields, in our case a hash
{for example, {longitude: 1.48453, 42.57205}}, but it could easily have been an array
(for example[1.48453, 42.57205])
*/

//first connect to the mongos sharded server open terminal run
mongo localhost:27020

//index the geo data, 
db.cities.createIndex({ location: "2d" })

/*
now we can aggregate pipeline to assemble a list of all cities close to portland,
OR sorted in descending order by population (displaying the name of the city, the
population, and the distance from the 45.52/-122.67

*/

db.cities.aggregate([
	{
		$geoNear: {
			near:  [45.52, -122.67],
			key: "location",
			distanceField: "dist.calculated"
		}
	},
	{
		$project: {
			_id: 0,
			name: 1,
			population: 1,
			dist: 1
		}
	},
	{ $limit: 10 }
])


// check indexes on a collection
db.cities.getIndexes()


//drop a specific index on a collection, here I drop "locarion_2d"
db.cities.dropIndex("location_2d")

/*
As you can see, Mongo’s aggregation API provides a very nice interface for working
with schemaless geospatial data. We’ve only scratched the surface here (no pun
intended), but if you’re interested in exploring the full potential of MongoDB, we
strongly encourage you to dig more deeply


//////////------------GridFS------------///////////////
One downside of a distributed system can be the lack of a single coherent filesystem.
Say you operate a website where users can upload images of themselves. If you
run several web servers on several different nodes, you must manually replicate
the uploaded image to each web server’s disk or create some alternative central
system. Mongo handles this scenario using a distributed filesystem called GridFS.

Mongo comes bundled with a command-line tool for interacting with GridFS. The
great thing is that you don’t have to set up anything special to use it. If you list
the files in the mongos managed shards using the command mongofiles , you get an
empty list.
*/

// create a file in terminal
echo "some gibberish, bubbly bubble admin da taco, wabbly \
shuffle da trembling Hubble. Do you know the riddle?" -> just-some-data.txt


// update the file to mongos in terminal
mongofiles -h localhost:27020 put just-some-data.txt //	added file: just-some-data.txt


// check file list in mongos in terminal
mongofiles -h localhost:27020 list // just-some-data.txt

// Back in your mongo console, you can see the collections Mongo stores the data in.
mongo localhost:27020

show collections //cities; fs.chunks; fs.files

// Because they’re just plain old collections, they can be replicated or queried
// like any other. Here we’ll look up the filename of the text file we imported.

db.fs.files.find()

/*
/////////////////------------Day 3 Wrap-Up--------//////////
his wraps up our investigation of MongoDB. Today we focused on how Mongo
enhances data durability with replica sets and supports horizontal scaling with
sharding. We looked at good server configurations and how Mongo provides the
mongos server to act as a relay for handling autosharding between multiple nodes.
Finally, we toyed with some of Mongo’s built-in tools, such as geospatial queries
and GridFS.

Day 3 Homework
Find
1. Read the full replica set configuration options in the online docs.
2. Find out how to create a spherical geo index.
Do
1. Mongo has support for bounding shapes (namely, squares and circles).
Find all cities within a 50-mile radius around the center of London. 5
2. Run six servers: three servers in a replica set, and each replica set is one
of two shards. Run a config server and mongos . Run GridFS across them
(this is the final exam).

*/

/*
install mongodb on ubuntu and how to run and stop it: 
https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/

deletion:
https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne/#db.collection.deleteOne

mongoimport: 
https://www.youtube.com/watch?v=sK0MP1i1pbc
https://docs.mongodb.com/manual/reference/program/mongoimport/#cmdoption-mongoimport-host
possible json format https://docs.mongodb.com/manual/reference/mongodb-extended-json/



geospatial query
https://docs.mongodb.com/manual/geospatial-queries/

mongo geospatial $geoNear
https://docs.mongodb.com/manual/reference/operator/aggregation/geoNear/#pipe._S_geoNear
https://www.docs4dev.com/docs/en/mongodb/v3.6/reference/reference-operator-aggregation-geoNear.html



*/