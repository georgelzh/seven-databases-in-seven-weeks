"""
Find

https://docs.mongodb.com/manual/reference/mongo-shell/

1. Find a shortcut for admin commands.
db.adminCommand( { <command> } )

db command in general reference: 
https://docs.mongodb.com/manual/reference/command/#database-commands

use of commands eg: 
db.runCommand("usersInfo")

admin command:
https://docs.mongodb.com/manual/reference/command/nav-administration/

use of commands eg: 
shutdown the a mongod
db.adminCommand({ "shutdown" : 1 })

2. Find the online documentation for queries and cursors.

query doc:
https://docs.mongodb.com/manual/tutorial/query-documents/


cursors:
https://docs.mongodb.com/manual/reference/method/js-cursor/index.html
cursor.isClosed() eg:
db.phones.find().isClosed() # false

cursor.pretty() eg:
db.phones.find().pretty()

{
        "_id" : 88005550019,
        "components" : {
                "country" : 8,
                "area" : 800,
                "prefix" : 555,
                "number" : 5550019
        },
        "display" : "+8 800-5550019"
}

3. Find the MongoDB documentation for mapreduce.

https://docs.mongodb.com/manual/core/map-reduce/


4. Through the JavaScript interface, investigate the code for three 
collections functions: help(), findOne(), and stats().
db.help
db.collectionName.findOne
db.phones.stats
"""

"""
###########------DO------##############
# 1. Implement a finalize method to output the count as the total.

# lets try to find all distinct country code map them to something like 
# { countryCode: [{phone_info}, {phone_info}, {phone_info}... ] }, then
# reduce these to sum the number the country code appears.
# then use finalize to return the count*10

reference for pymongo mapreduce:
https://pymongo.readthedocs.io/en/3.10.0/
https://pymongo.readthedocs.io/en/3.10.0/api/pymongo/collection.html#pymongo.collection.Collection.map_reduce

"""

import pymongo

db = pymongo.MongoClient()
test = db.test
phones = test.phones

# map function, map all the data with the same country code
map = """
function() {
    var country_code = this.components.country;
    emit({
        country_code: country_code
    }, {
        count: 1
    });
}
"""

# reduce function, count it
reduce = """
function(key, values) {
    var total = 0;
    for (var i = 0; i < values.length; i++) {
        total += values[i].count;
    }
    return { count: total };
}
"""
# test what we got for now

test.phones.inline_map_reduce(map, reduce)

"""
{
        "results" : [
                {
                        "_id" : {
                                "country_code" : 1
                        },
                        "value" : {
                                "count" : 12464
                        }
                },
                {
                        "_id" : {
                                "country_code" : 2
                        },
                        "value" : {
                                "count" : 12467
                        }
                }
                        ...
}
"""

# define finalize function that return total count multiplies 10
# reference https://docs.mongodb.com/manual/tutorial/map-reduce-examples/

finalize_func = """
function(key, reducedVal) {
    sum = 0;
    sum += reducedVal.count;
    return { totalCount_multi_10: sum * 10};
}
"""

# implement mapReduce with finalize method output the count as the total
# test what we got for now


# map = map function defined previously such as """function content""" 
# reduce function 
test.phones.inline_map_reduce(map, reduce, finalize=finalize_func)

"""
{
        "results" : [
                {
                        "_id" : {
                                "country_code" : 1
                        },
                        "value" : {
                                "totalCount_multi_10" : 124640
                        }
                },
                {
                        "_id" : {
                                "country_code" : 2
                        },
                        "value" : {
                                "totalCount_multi_10" : 124670
                        }
                }       ...
}
"""
