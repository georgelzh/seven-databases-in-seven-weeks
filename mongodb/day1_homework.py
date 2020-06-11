"""
for pymongo driver
https://www.youtube.com/watch?v=rE_bJl2GAY8
https://www.youtube.com/watch?v=NOY6j3dEbEk
https://www.w3schools.com/python/python_mongodb_create_db.asp

pymongo connection && pymongo regex
https://kb.objectrocket.com/mongo-db/how-to-query-mongodb-documents-with-regex-in-python-362
"""
import pymongo

# task 1: print a JSON document containing { "hello": "world" }

helloWorld = { "hello": "world" }
print(helloWorld)


# task 2: Select a town via a case-insensitive regular expression containing the
# word new.

# connect to the db 
client = pymongo.MongoClient("mongodb://localhost:27017/")

# retrieve the db called book
book = client.book

# retrieve the "towns" collection from db book
towns = book["towns"]

# finish task two
# reference: https://www.softwaretestinghelp.com/mongodb/regular-expression-in-mongodb/

query = {"name" : {"$regex" : "new", "$options" : "$i" } }
new = towns.find_one(query)
print(new)

# Task 3: Find all cities whose names contain an e and are famous for food or beer.
# becareful about the brackets bellow, it's easy to make mistakes
# reference for $and, $not, $or: https://www.youtube.com/watch?v=GxRx0_BPiMs
# https://docs.mongodb.com/manual/reference/operator/query/or/
query = {"$and": [{"name" : {"$regex" : "e"}}, 
{ "$or": [ { "famousFor" : "food" }, {"famousFor" : "beer" } ] } ] }


e_food_or_beer = towns.find(query)
for t in e_food_or_beer:
	print(t)

"""
# task 4 : Create a new database named blogger with a collection named articles.
# Insert a new article with an author name and email, creation date, and text.
# create db reference: https://www.w3schools.com/python/python_mongodb_create_db.asp
# create collection reference: 
# https://www.w3schools.com/pythonpython_mongodb_create_collection.asp
"""

from datetime import datetime

# check if newdb is created, create it if not:
dblist = client.list_database_names()

# notice: new db will not be created until there is data being inserted to it.
if "blogger" not in dblist:
	blogger = client["blogger"]
else:
	blogger = client["blogger"]

# check what dbs we have now
for db in dblist:
	print("db: ", db)	# here newdb won't be printed if its just created

# create new collection called "articles"

articles = blogger["articles"]

# check if collection exists, "articles" won't show up below because
# mongodb wont create it until there is data being inserted

collection_names = blogger.list_collection_names()	# list of all collection
print(collection_names)

# now insert a new article in to the collection "articles"
datetime_now = datetime.now()
new_article = {"author_name": "Bill", "email": "bill@gmail.com", 
"date": datetime_now, "text" : "hiiiiiiiiii, this is my first article, bye."}
articles.insert_one(new_article)

















