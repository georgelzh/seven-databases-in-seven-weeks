/*
2. Run six servers: three servers in a replica set, and each replica set is one
of two shards. Run a config server and mongos . Run GridFS across them
(this is the final exam).

3 servers in a replica set

replica set 1: {3 servers}
replica set 2: {3 servers}

shard 1: replica set 1
shard 2: replica set 2

config server
mongos server

run GridFs across them, try to upload a file there.
*/



///////////////////////-------------- set up 3 servers as a replica set, then make it a shard server
"replica set name cities"

mkdir mongo1 mongo2 mongo3 mongo4 mongo5 mongo6 mongos confsvr1 confsvr2 confsvr3


mongod --replSet cities --dbpath ./mongo1 --port 27011
mongod --replSet cities --dbpath ./mongo2 --port 27012
mongod --replSet cities --dbpath ./mongo3 --port 27013


// terminal 
mongo localhost:27011

// initialize the replica set
rs.initiate( {
    _id : "cities",
    members: [
        {_id: 0, host: 'localhost:27011'},
        {_id: 1, host: 'localhost:27012'},
        {_id: 2, host: 'localhost:27013'}
    ]
 })


//in primary mongo insert data
load('.../mongoCities100000.js')



////////////-----------Restart the Replica Set as a Shard¶

//rs.status() will give you who is secondary who is primary
//how make the two secondary servers a shardserver by restart them with command below. Do it one by one.
mongod --replSet cities --dbpath ./mongo2 --shardsvr --port 27012
mongod --replSet cities --dbpath ./mongo3 --shardsvr --port 27013

// Step down the primary. in mongo
rs.stepDown()

// Restart the primary with the --shardsvr option
mongod --replSet cities --dbpath ./mongo1 --shardsvr --port 27011



//////////////////--------------Deploy Config Server Replica Set and mongos

// start 3 config server replica set
mongod --configsvr --replSet configReplSet --dbpath ./confsvr1 --port 27016
mongod --configsvr --replSet configReplSet --dbpath ./confsvr2 --port 27017
mongod --configsvr --replSet configReplSet --dbpath ./confsvr3 --port 27018


// initialize the config servers
mongo localhost:27016
rs.initiate({
    _id: "configReplSet",
    configsvr: true,
    members: [
        {_id: 0, host: 'localhost:27016'},
        {_id: 1, host: 'localhost:27017'},
        {_id: 2, host: 'localhost:27018'}
    ]
})

rs.status().ok // 1

// Start a mongos instance.
mongos --configdb configReplSet/localhost:27016,localhost:27017,localhost:27018 --port 27030


// Add Initial Replica Set as a Shard¶

//Connect a mongo shell to the mongos.¶
mongo localhost:27030/admin


//Add the shard. for first replica set 
sh.addShard( "cities/localhost:27011,localhost:27012,localhost:27013" )



//////////////////////----------Add Second Shard¶
//Start each member of the replica set with the appropriate options.
mongod --replSet "cities2" --dbpath ./mongo4 --shardsvr --port 27021
mongod --replSet "cities2" --dbpath ./mongo5 --shardsvr --port 27022
mongod --replSet "cities2" --dbpath ./mongo6 --shardsvr --port 27023


//Connect a mongo shell to a replica set member.
//Connect a mongo shell to one member of the replica set (e.g. mongodb3.example.net)
mongo localhost:27021

//Initiate the replica set.¶
rs.initiate( {
    _id : "cities2",
    members: [
        {_id: 0, host: 'localhost:27021'},
        {_id: 1, host: 'localhost:27022'},
        {_id: 2, host: 'localhost:27023'}
    ]
 })

rs.status().ok // 1

//Connect a mongo shell to the mongos.¶
mongo localhost:27030/admin


//Add the shard.¶
// In a mongo shell connected to the mongos, add the shard to the cluster with 
//the sh.addShard() method:
sh.addShard( "cities2/localhost:27021,localhost:27022,localhost:27023" )


//////////////-------------------Shard a Collection¶
//Connect a mongo shell to the mongos.¶
mongo localhost:27030/admin


/*
***Enable sharding for a database.
Before you can shard a collection, you must first enable sharding for the 
collection’s database. Enabling sharding for a database does not redistribute 
data but makes it possible to shard the collections in that database.
*/

sh.enableSharding( "test" ) //{ "ok" : 1 }




/*
Determine the shard key.¶
For the collection to shard, determine the shard key. The shard key determines 
how MongoDB distributes the documents between shards. Good shard keys:

have values that are evenly distributed among all documents,
group documents that are often accessed at the same time into contiguous chunks, 
and allow for effective distribution of activity among shards. Once you shard a 
collection with the specified shard key, you cannot change the shard key. For 
more information on shard keys, see Shard Keys.

This procedure will use the location field as the shard key for test.cities.*/

use test // cities collection is inside of this db, get here


/* FAILED SHARDING 
db is in test
collection is called cities
it did not workout.  I wonder if there's sth wrong with my shard key?
So i Changed shard key next time. 

procedures I did:
// since cities already has data in it, I will need to create index for the 
// shard key "location"

db.cities.createIndex( { location: 1} ) // ok: 1


// shard the collection with the key location
sh.shardCollection( "test.cities", { "location" : 1 } ) // ok: 1
*/

/* FAILED SHARDING 
changed db to "shard"
added cities and sharded it with name:"hashed" as shard key, it did not work out. 
I wonder if there's sth wrong with my shard servers config? 

procedures I did:
// this time i decide to use harshed sharding on the filed "name"
db.cities.createIndex( { name: "hashed" } ) // ok: 1

// shard it
sh.shardCollection( "shard.cities", { "name" : "hashed" } ) // ok: 1
*/


/////////////////////////////* SUCCESSFUL SHARDING*/
mongo localhost:27030/admin
use shard
db.createCollection("movies")
sh.enableSharding( "shard" )
sh.shardCollection( "shard.movies", { "title" : "hashed" } ) 

// insert 50 entry data into shard.movies run on terminal
/*
for i in $(seq 1 50); do echo -e "use shard \n db.movies.insertOne\
({\"title\":\"spider man $i\", \"language\": \"english\"})"  | mongo localhost:27030; done


question: 
everything good, shard on this collection works well. That means my setting should be fine.
Then what's wrong with sharding on existing collection? is it bc of my shard key?
*/
////////////////////////////////////////////////////////





/* ///////////////////////FAILURE TRIAL FAILED to shard on an existing collection.
// try shard on a collection that has data already this time
use shard
db.createCollection("movies2")

// insert data. run this on terminal

for i in $(seq 1 50); do echo -e "use shard \n db.movies2.insertOne\
({\"title\":\"spider man $i\", \"language\": \"english\"})"  | mongo localhost:27030; done

//create index on title with "hashed"
use shard
db.movies2.createIndex( { title: "hashed" } ) // ok: 1

sh.shardCollection( "shard.movies2", { "title" : "hashed" } ) 


It did not work out here.
Question is why is this happening?  do i need to containerize all these servers?
*/




///////////-----------SUCCESS---------///////sharding on empty collection named city with shard Key: "name": "hashed"
// them import data, it worked

// create collection
use shard
db.createCollection("cities")


// select shard key as "name: hashed" and shard the collection with it. 
use admin
db.runCommand( { shardcollection : "shard.cities", key : {"name":"hashed" } })

// import the data
/*
mongoimport \
--host localhost:27030 \
--db shard \
--collection cities \
--type json \
/home/zhihongli/Desktop/Seven-Databases-in-Seven-Weeks/mongodb/mongoCities100000.json
*/
//////////////////////////////////////////////////////////////////////////////////////////



///////////////----------------/check if cities collection is sharded
use shard
db.cities2.getShardDistribution()

// check shard balance
use shard
db.stats()
db.printShardingStatus()

// check shard status
sh.status()
///////////////////////////////////////////////////////////////



/////////// Another failed trial ---------I used location:1 and location"2d" as shard key, it did not work out.
//let's try compound shard key { name: 1, country: 1}, FAILEDD in the end
//one thing i found is that even if you drop a collection, its indexes stil exists. so you have to drop its indexes
//after dropping the collection too. so that you start clean.

use shard
db.createCollection("cities2")

//then import city data like how we did it previously, this time collection is cities2

//terminal
mongoimport \
--host localhost:27030 \
--db shard \
--collection cities2 \
--type json \
/home/zhihongli/Desktop/Seven-Databases-in-Seven-Weeks/mongodb/mongoCities100000.json

//enter mongos
mongo localhost:27030/shard

//create compound indexes as shard key
db.cities2.createIndex({"name": 1, "country": 1})

//shard the collection with the key
use admin
db.runCommand( { shardcollection : "shard.cities2", key : {"name": 1, "country": 1 }})

//
///////////////////////////////////////////////////////////






////////////////////////////-----------------Set up Sharding using Docker Containers

//Config servers
//Start config servers (3 member replica set)

docker-compose -f config-server/docker-compose.yaml up -d

//Initiate replica set
mongo mongodb://10.10.240.102:40001

rs.initiate(
    {
      _id: "cfgrs",
      configsvr: true,
      members: [
        { _id : 0, host : "10.10.240.102:40001" },
        { _id : 1, host : "10.10.240.102:40002" },
        { _id : 2, host : "10.10.240.102:40003" }
      ]
    }
  )


rs.status()




/////Shard 1 servers
//Start shard 1 servers (3 member replicas set)
docker-compose -f shard1/docker-compose.yaml up -d

// Initiate replica set

mongo mongodb://10.10.240.102:50001

rs.initiate(
{
    _id: "shard1rs",
    members: [
    { _id : 0, host : "10.10.240.102:50001" },
    { _id : 1, host : "10.10.240.102:50002" },
    { _id : 2, host : "10.10.240.102:50003" }
    ]
}
)

rs.status()


////Mongos Router

// change the setting in the mongos/docker-compose.yaml
// set up mongos using docker
docker-compose -f mongos/docker-compose.yaml up -d

// start mongos
mongo mongodb://10.10.240.102:60000

// add shard
sh.addShard("shard1rs/10.10.240.102:50001,10.10.240.102:50002,10.10.240.102:50003")

// check
sh.status()



/////Adding another shard
docker-compose -f shard2/docker-compose.yaml up -d

// Initiate replica set
mongo mongodb://10.10.240.102:50004

rs.initiate(
    {
        _id: "shard2rs",
        members: [
        { _id : 0, host : "10.10.240.102:50004" },
        { _id : 1, host : "10.10.240.102:50005" },
        { _id : 2, host : "10.10.240.102:50006" }
        ]
    }
    )

rs.status()



mongo mongodb://10.10.240.102:60000
// add shard
sh.addShard("shard2rs/10.10.240.102:50004,10.10.240.102:50005,10.10.240.102:50006")

// check
sh.status()


//import data into the docker servers
mongoimport \
--host 10.10.240.102:60000 \
--db shard \
--collection cities2 \
--type json \
/home/zhihongli/Desktop/Seven-Databases-in-Seven-Weeks/mongodb/mongoCities100000.json


//shard it now
mongo mongodb://10.10.240.102:60000/admin
use admin
sh.enableSharding( "shard" )
use shard
db.cities2.createIndex({"name": "hashed"})

use admin
sh.shardCollection( "shard.cities2", { "name" : "hashed" } )



////////////////////////////////////////////////////
////////////////////////////////////////////////////

////////////////////////////////////////////////////
////////////////////////////////////////////////////

////////////////////////////////////////////////////
////////////////////////////////////////////////////
// -----------------------SHARD GRIDFS----------------------------
mongo mongodb://10.10.240.102:60000/admin
db.runCommand({ shardCollection: "shard.fs.chunks", key: {files_id: 1 } })

//upload just-some-data.txt to database called "shard" run it on terminal

mongofiles --host=10.10.240.102:60000 -d=shard put just-some-data.txt
mongofiles --host=10.10.240.102:60000 -d=shard put just-some-data-copy.txt


/*
reference:
convert-replica-set to replicated shard cluster tutorial
https://docs.mongodb.com/manual/tutorial/convert-replica-set-to-replicated-shard-cluster/

https://www.youtube.com/watch?v=Rwg26U0Zs1o&t=953s


compound index
https://docs.mongodb.com/manual/core/index-compound/

compound shard key for zone
https://docs.mongodb.com/manual/tutorial/sharding-segmenting-data-by-location/

// shard on an empty collection -> solving issue about sharding on collection cities
https://github.com/justmeandopensource/learn-mongodb/tree/master/sharding


shard docker containers set up tutorial
https://www.youtube.com/watch?v=7Lp6R4CmuKE&list=PL34sAs7_26wPvZJqUJhjyNtm7UedWR8Ps&index=7

https://github.com/justmeandopensource/learn-mongodb

about sharding on existing collection -> solution
https://dba.stackexchange.com/questions/207196/mongodb-sharding-an-collection-with-data-already-in-it



API manual
http://man.hubwiz.com/


shard GridFS
http://man.hubwiz.com/docset/MongoDB.docset/Contents/Resources/Documents/docs.mongodb.org/manual/tutorial/shard-gridfs-data/index.html

upload files GridFS
https://docs.mongodb.com/manual/reference/program/mongofiles/#bin.mongofiles

reference for gridFS
https://github.com/vichheann/seven-databases/tree/master/mongodb/day3

*/