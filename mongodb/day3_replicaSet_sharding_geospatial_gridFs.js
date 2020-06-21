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


// keep going