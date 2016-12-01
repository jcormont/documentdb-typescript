# DocumentDB TypeScript API

This Node module provides the 'missing' TypeScript 2 API for Microsoft's awesome SQL-queried schema-free Cloud NoSQL database, DocumentDB.

**No TypeScript required** &mdash; you can use this module with plain JavaScript too, and enjoy enhanced Intellisense in an editor that supports TypeScript 2 definition files, such as VS Code.

**NOTE:** The author of this module is not affiliated with Microsoft.

### Goals
This module was written with the following goals in mind:

- Streamline common DocumentDB use cases;
- Enable a better developer experience with accurate Intellisense;
- Reduce clutter by adding classes and combining methods;
- Use idiomatic TypeScript 2 (es6 for Node JS) internally and externally;
- Enable asynchronous programming with `async/await` and/or Promises (native Node JS).

### Project Status
I just needed something quick, so at this point parts of the DocumentDB feature set are still missing. If your app needs stored procedures, or users and permissions, for example, then please add to this code (preferably as new classes). Pull requests are greatly appreciated!

Tests are sorely needed as well. Perhaps some of the tests can be ported over from DocumentDB itself.

## Installation
Use `npm` to install this module (TypeScript optional):

```
npm install documentdb-typescript
```

Then import this module into your JavaScript or TypeScript code:

```javascript
const DB = require("documentdb-typescript");
const client = new DB.Client(/*...*/);

// OR: ...
import * as DB from "documentdb-typescript";
const client = new DB.Client(/*...*/);

// OR: ...
import { Client /*,...*/} from "documentdb-typescript";
const client = new Client(/*...*/);
```

## Usage

This module exports only the following symbols:
- `Client` class: contains methods for dealing with the connection to DocumentDB account.
- `Database` class: represents a database.
- `Collection` class: represents a collection, and contains methods for dealing with documents.
- `DocumentStream` class: contains methods for reading query results (used as a return type only).
- `StoreMode` enum: lists different modes of storing documents in a collection.

*Where is Document?* &mdash;
There is no 'Document' class because documents are really just plain JavaScript objects (of type `any`), which may or may not have some extra properties (such as `_self`) depending on where they come from, and are very hard to pin down as such. Also, the results of a query may or may not be full documents, which makes it impossible to predict exact return types. Adding another abstraction layer (à la the .NET API with its set- / getPropertyValue methods) doesn't seem like the right thing to do in JavaScript code.

## `Client`
Start here if you need to work with multiple databases, or set advanced connection options.

```typescript
// Example: open a connection and find all databases
async function main(url, masterKey) {
    var client = new Client(url, masterKey);

    // enable logging of all operations to the console
    client.enableConsoleLog = true;

    // dump the account information
    console.log(await client.getAccountInfoAsync());

    // open the connection and print a list of IDs
    await client.openAsync();
    var dbs = await client.listDatabasesAsync();
    console.log(dbs.map(db => db.id));

    // unnecessary unless you expect new clients
    // to reopen the connection:
    client.close();
}
```

The original DocumentClient from the `documentdb` module is kept in the `documentClient` property, after the `openAsync` method is called:

A static property `Client.concurrencyLimit` (number) controls how many requests may be outstanding *globally* at any time; this defaults to 25. Further requests are held internally (without timing out) until a pending request completes. You may want to increase this number if you are performing a high volume of low-cost operations such as deletions.

## `Database`
Start here if you need to list all collections in a database, or delete it from the account. Nothing else here.

```typescript
// Example: get a list of collections
async function main(url, masterKey) {
    var client = new Client(url, masterKey);
    var db = new Database("sample", client);

    // ... or this, which creates a new client
    // but reuses the connection:
    var db2 = new Database("sample", url, masterKey);

    // create the database if necessary
    await db.openOrCreateAsync();

    // ... or not at all (fails if not found)
    await db.openAsync();

    // print a list of collection IDs
    var colls = await db.listCollectionsAsync();
    console.log(colls.map(c => c.id));

    // delete the database
    await db.deleteAsync();
}
```

## `Collection`
This is where most of the functionality lives. Finding and/or creating a collection, optionally along with the database is easy:

```typescript
// Example: create and delete a collection
async function main(url, masterKey) {
    var client = new Client(url, masterKey);
    var db = new Database("sample", client);

    // these are all the same:
    var coll = new Collection("test", db);
    var coll2 = new Collection("test", "sample", client);
    var coll3 = new Collection("test", "sample", url, masterKey);
    
    // create everything if necessary
    await coll.openOrCreateDatabaseAsync();

    // ... or just the collection
    await coll.openOrCreateAsync();

    // ... or nothing (fails if not found)
    await coll.openAsync();

    // delete the collection
    await coll.deleteAsync();
}
```

The `Collection` instance has methods for setting and getting provisioned throughput levels:

```typescript
// Example: set and get throughput information 
async function main(url, masterKey) {
    var client = new Client(url, masterKey);
    var coll = new Collection("test", "sample", client);
    await coll.openOrCreateDatabaseAsync();

    // set the offer throughput
    await coll.setOfferInfoAsync(500);
    
    // dump the new offer information
    console.log(await coll.getOfferInfoAsync());
}
```

## Storing documents
This module abstracts away most of the work involved in creating, updating, and upserting documents in a collection.

```typescript
// Example: store and delete a document
async function main(url, masterKey) {
    var client = new Client(url, masterKey);
    client.enableConsoleLog = true;
    var coll = new Collection("test", "sample", client);
    await coll.openOrCreateDatabaseAsync();

    // create a document (fails if ID exists),
    // returns document with meta properties
    var doc: any = { id: "abc", foo: "bar" };
    doc = await coll.storeDocumentAsync(doc, StoreMode.CreateOnly);

    // update a document (fails if not found),
    // using _self property which must exist
    doc.foo = "baz";
    doc = await coll.storeDocumentAsync(doc, StoreMode.UpdateOnly);

    // update a document if not changed in DB,
    // using _etag property which must exist
    doc.foo = "bla";
    doc = await coll.storeDocumentAsync(doc, StoreMode.UpdateOnlyIfNoChange);
    
    // upsert a document (twice, without errors)
    var doc2: any = { id: "abc", foo: "bar" };
    var doc3: any = { id: "abc", foo: "baz" };
    await Promise.all([
        coll.storeDocumentAsync(doc, StoreMode.Upsert),
        coll.storeDocumentAsync(doc)  // same
    ]);

    // delete the document, using _self property
    await coll.deleteDocumentAsync(doc);
}
```

## Finding documents
There are a number of ways to find a document or a set of documents in a collection.

```typescript
// Example: find document(s)
async function main(url, masterKey) {
    var coll = await new Collection("test", "sample", url, masterKey)
        .openOrCreateDatabaseAsync();

    // find a document by ID (fails if not found)
    var doc = await coll.findDocumentAsync("abc");

    // find a document with given properties
    // (exact match, fails if not found, takes
    // newest if multiple documents match)
    try {
        var user = await coll.findDocumentAsync({
            isAccount: true,
            isInactive: false,
            email: "foo@example.com"
        });
        console.log("Found " + user._self);
    }
    catch (err) {
        console.log("User not found");
    }

    // find a set of documents (see below)
    var stream = coll.queryDocuments();  // <= all
    var stream2 = coll.queryDocuments("select * from c");  // same
    var stream3 = coll.queryDocuments({
        query: "select * from c where c.foo = @foo",
        parameters: [
            { name: "@foo", value: "bar" }
        ]
    });
}
```

## Iterating over query results
The `queryDocuments` method on the `Collection` class is one of the few methods that does *not* return a Promise. Instead, it returns a `DocumentStream` instance which can be used to iterate over the results or load them all in one go.

```typescript
// Example: iterate over query results
async function main(url, masterKey) {
    var coll = await new Collection("test", "sample", url, masterKey)
        .openOrCreateDatabaseAsync();

    // load all documents into an array
    var q = coll.queryDocuments();
    var allDocs = await q.toArray();

    // process all documents asynchronously
    var q2 = await coll.queryDocuments("select * from c");
    q2.forEach(doc => {
        console.log(doc._self);
    });
    
    // ... and the same, in a loop
    q.reset();
    while (true) {
        var rdoc = await q.read();
        if (!rdoc) break;
        console.log(rdoc._self);
    }
    
    // map all documents asynchronously
    var ids = await coll.queryDocuments("select * from c")
        .mapAsync(doc => doc.id);
    
    // get only the newest time stamp
    var newest = await coll.queryDocuments(
        "select top 1 c._ts from c order by c._ts desc")
        .read();
    if (!newest)
        console.log("No documents");
    else
        console.log("Last change " +
            (Date.now() / 1000 - newest._ts) +
            "s ago");
}
```
