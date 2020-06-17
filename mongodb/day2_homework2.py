# 2. Install a Mongo driver for a language of your choice, and connect to 
# the database. Populate a collection through it, and index one of the fields.

# python driver pymongo
import pymongo


# connect to the db
db = pymongo.MongoClient()

for database in [db.list_database_names()]:
    print(database)


"""
create a new database called users

collection and populate it with data
call this collection 'user_responses'
It stores a few questions:
name,
gender,
age,
city,
estimate annual income
"""

users = db['users']

user_responses = users["user_responses"]

# populate user_responses with fake data
user_responses.insert_one({
    "user_id": 1,
    "name": "george",
    "age": 98,
    "city": "Boston",
    "estimate_annual_income": 50000
})

user_responses.insert_one({
    "user_id": 2,
    "name": "bob",
    "age": 20,
    "city": "Boston",
    "estimate_annual_income": 30000
})
user_responses.insert_one({
    "user_id": 3,
    "name": "Tony",
    "age": 45,
    "city": "Boston",
    "estimate_annual_income": 70000
})
user_responses.insert_one({
    "user_id": 4,
    "name": "toby",
    "age": 35,
    "city": "Boston",
    "estimate_annual_income": 70000
})

user_responses.insert_one({
    "user_id": 5,
    "name": "Sam",
    "age": 40,
    "city": "Boston",
    "estimate_annual_income": 35000
})
user_responses.insert_one({
    "user_id": 6,
    "name": "Ben",
    "age": 27,
    "city": "Boston",
    "estimate_annual_income": 50000
})

user_responses.insert_one({
    "user_id": 7,
    "name": "Helen",
    "age": 25,
    "city": "Boston",
    "estimate_annual_income": 40000
})

user_responses.insert_one({
    "user_id": 8,
    "name": "Susan",
    "age": 22,
    "city": "Boston",
    "estimate_annual_income": 32000
})

user_responses.insert_one({
    "user_id": 9,
    "name": "John",
    "age": 34,
    "city": "Boston",
    "estimate_annual_income": 40000
})


# before creating index, check execution time before creating index
z = user_responses.find({"estimate_annual_income": { "$gt": 40000}}).explain()["executionStats"]
print(z) # we get about 130ms


# create index on estimate_annual_income, we don't need annual income to be unique, 
# we don't need to to remove dups either. we just want to index annual income that's it.

result = user_responses.create_index([('estimate_annual_income', pymongo.ASCENDING)])
result  # 'estimate_annual_income_1'

# make sure its created
print(list(user_responses.index_information()))    # ['_id_', 'estimate_annual_income_1']

# before creating index, check execution time before creating index
z = user_responses.find({"estimate_annual_income": { "$gt": 40000}}).explain()["executionStats"]
print(z) # we get about 0ms now

# finished ;)


"""
reference:
pymongo insert: https://api.mongodb.com/python/current/tutorial.html#inserting-a-document
pymongo index: https://api.mongodb.com/python/current/tutorial.html#indexing
mongodb index doc for more function and details such as unique and Remove dups: https://docs.mongodb.com/manual/core/index-single/
"""