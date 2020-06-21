//////////////////////------DO------////////////////////////////
// 1. Implement a finalize method to output the count as the total.

// lets try to find all distinct country code map them to something like 
// { countryCode: [{phone_info}, {phone_info}, {phone_info}... ] }, then
// reduce these to sum the number the country code appears.
// then use finalize to return the count*10


// map function, map all the data with the same country code

mapCountry = function() {
    var country_code = this.components.country;
    emit({
        country_code: country_code
    }, {
        count: 1
    });
}

// reduce function, count it

reduceCountry = function(key, values) {
    var total = 0;
    for (var i = 0; i < values.length; i++) {
        total += values[i].count;
    }
    return { count: total };
}

// test what we got for now

results = db.runCommand({
    mapReduce: 'phones', 
    map: mapCountry, 
    reduce: reduceCountry, 
    out: { inline: 1}
    })


/*
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
*/

// define finalize function that return total count multiplies 10
// reference https://docs.mongodb.com/manual/tutorial/map-reduce-examples/


finalize_func = function(key, reducedVal) {
    sum = 0;
    sum += reducedVal.count;
    return { totalCount_multi_10: sum * 10};
}


// implement mapReduce with finalize method output the count as the total
// test what we got for now

results = db.runCommand({
    mapReduce: 'phones', 
    map: mapCountry, 
    reduce: reduceCountry, 
    finalize: finalize_func,
    out: { inline: 1}
    })

/*
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

*/