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

//$ mongo localhost:27011

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
*/





/*
install mongodb on ubuntu and how to run and stop it: 
https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/

deletion:
https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne/#db.collection.deleteOne


*/