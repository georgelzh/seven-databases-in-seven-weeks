/*
Day 3 Homework
Find
1. Read the full replica set configuration options in the online docs.
https://docs.mongodb.com/manual/reference/replica-configuration/

2. Find out how to create a spherical geo index.
https://docs.mongodb.com/manual/core/2dsphere/




Do
1. Mongo has support for bounding shapes (namely, squares and circles).
Find all cities within a 50-mile radius around the center of London.

2. Run six servers: three servers in a replica set, and each replica set is one
of two shards. Run a config server and mongos . Run GridFS across them
(this is the final exam).

*/

//find the city location first
// mongodb shell command, 
db.cities.find({"name" : "London", country: "GB"}, {_id: 0, location:1})
// { "location" : { "longitude" : -0.12574, "latitude" : 51.50853 } }


// find all cities within a 50-mile radius around the center of london

db.cities.find({
    "location": 
    { $geoWithin:  
        { $centerSphere: [[-0.12574, 51.50853], 50 / 3963.2]}
    }})




/*
reference:
points within a circle defined on a sphere:
https://docs.mongodb.com/manual/tutorial/query-a-2d-index/#points-within-a-circle-defined-on-a-sphere

how to calculate distance using spherical geometry:
https://docs.mongodb.com/manual/tutorial/calculate-distances-using-spherical-geometry-with-2d-geospatial-indexes/ 

*/