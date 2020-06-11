"""
for pymongo driver
https://www.youtube.com/watch?v=rE_bJl2GAY8
https://www.youtube.com/watch?v=NOY6j3dEbEk
https://www.w3schools.com/python/python_mongodb_create_db.asp

pymongo connection && pymongo regex
https://kb.objectrocket.com/mongo-db/how-to-query-mongodb-documents-with-regex-in-python-362
"""
import pymongo
import re

# task 1: print a JSON document containing { "hello": "world" }

helloWorld = { "hello": "world" }
print(helloWorld)


# task 2: Select a town via a case-insensitive regular expression containing the
# word new.

# connect to the db 
client = pymongo.MongoClient()

# retrieve the db called book
book = client.book

# retrieve the "towns" collection from db book
towns = book["towns"]

# finish task two
new = towns.find({"name" : { "$regex" : '/New/' }});

print(new)



















