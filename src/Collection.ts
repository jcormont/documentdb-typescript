import { _DocumentDB } from "./_DocumentDB";
import { Database } from "./Database";
import { Client } from "./Client";
import { DocumentStream } from "./DocumentStream";
import { curryPromise, sleepAsync } from "./Util";

/** Represents a DocumentDB collection */
export class Collection {
    /** Refer to a collection by name, from given database */
    constructor(id: string, database: Database);
    /** @internal Refer to a collection by name, from given database and with given link */
    constructor(id: string, database: Database, selfLink: string);
    /** Refer to a collection by name, from given database (by name), connected through given client */
    constructor(id: string, dbName: string, client: Client);
    /** Refer to a collection by name, from given database (by name), using given URL and master key (implicitly creates a new client instance) */
    constructor(id: string, dbName: string, url?: string, masterKey?: string);
    constructor(id: string, ...info: any[]) {
        if (!id) throw new Error("Collections must have a name");
        this.id = id;
        if (info[0] instanceof Database) {
            // use given database and possibly self link passed by database
            this.database = info[0];
            this._self = info[1];
        }
        else {
            // construct database with given data
            this.database = new Database(info[0], info[1], info[2]);
        }
    }

    /** The name of the collection that this instance refers to */
    public readonly id: string;

    /** The database used for all operations */
    public readonly database: Database;

    /** Open and validate the connection, check that this collection exists */
    public async openAsync(maxRetries?: number) {
        if (this._self) return this;
        await this.database.openAsync(maxRetries);
        let tryGetCollection = (callback) =>
            this.database.client.log("Reading collection " + this.id) &&
            this.database.client.documentClient.readCollection(
                "dbs/" + this.database.id + "/colls/" + this.id,
                undefined, callback);
        var resource = await curryPromise(tryGetCollection,
            this.database.client.timeout, maxRetries)();
        this._self = resource["_self"];
        return this;
    }

    /** Open and validate the connection, find or create collection resource (does not create the database) */
    public async openOrCreateAsync(createThroughput?: number,
        indexingPolicy?: _DocumentDB.IndexingPolicy,
        defaultTtl?: number, maxRetries?: number) {
        if (this._self) return this;
        await this.database.openAsync(maxRetries);
        var resource: {};
        try {
            let tryGetCollection = (callback) =>
                this.database.client.log("Reading collection " + this.id) &&
                this.database.client.documentClient.readCollection(
                    "dbs/" + this.database.id + "/colls/" + this.id,
                    undefined, callback);
            resource = await curryPromise(tryGetCollection,
                this.database.client.timeout, maxRetries)();
        }
        catch (err) {
            if (err.code == 404 /* not found */) {
                // create the collection now
                var data: _DocumentDB.CollectionResource = { id: this.id };
                if (indexingPolicy) data.indexingPolicy = indexingPolicy;
                if (defaultTtl !== undefined) data.defaultTtl = defaultTtl;
                try {
                    let tryCreateCollection = (callback) =>
                        this.database.client.log("Creating collection " + this.id) &&
                        this.database.client.documentClient.createCollection(
                            "dbs/" + this.database.id, data,
                            { offerThroughput: createThroughput },
                            callback);
                    resource = await curryPromise(tryCreateCollection,
                        this.database.client.timeout)();
                }
                catch (err) {
                    if (err.code == 409 /* conflict */) {
                        this.database.client.log("Collection conflict, retrying...");
                        await sleepAsync(1000);
                        return await this.openAsync();
                    }
                    throw err;
                }
            }
            else throw err;
        }
        this._self = resource["_self"];
        return this;
    }

    /** Open and validate the connection, find or create collection resource (also creates the database if needed) */
    public async openOrCreateDatabaseAsync(createThroughput?: number,
        indexingPolicy?: _DocumentDB.IndexingPolicy,
        defaultTtl?: number, maxRetries?: number) {
        if (this._self) return this;
        await this.database.openOrCreateAsync(maxRetries);
        await this.openOrCreateAsync(createThroughput, indexingPolicy,
            defaultTtl, maxRetries);
        return this;
    }

    /** Get offer (throughput provisioning) information */
    public async getOfferInfoAsync() {
        await this.openAsync();
        let tryGetOffer = (callback) =>
            this.database.client.log("Getting offer info for " + this.id) &&
            this.database.client.documentClient.queryOffers({
                query: "select * from root r where r.resource = @selflink",
                parameters: [{ name: "@selflink", value: this._self }]
            }).toArray(callback);
        var offers: _DocumentDB.OfferResource[] = <any>
            await curryPromise(tryGetOffer, this.database.client.timeout)();
        if (!offers.length) throw new Error("Offer not found");
        this._offer = offers[0];
        return JSON.parse(JSON.stringify(offers[0]));
    }

    /** Set provisioned throughput */
    public async setOfferInfoAsync(throughput: number) {
        await this.openAsync();
        if (!this._offer) await this.getOfferInfoAsync();
        if (!this._offer.content || !this._offer.content.offerThroughput)
            throw new Error("Unknown offer type");
        this._offer.content.offerThroughput = throughput;
        let trySetOffer = (callback) =>
            this.database.client.log("Setting offer info for " + this.id) &&
            this.database.client.documentClient.replaceOffer(this._offer._self,
                this._offer, callback);
        this._offer = <any>await curryPromise(trySetOffer, this.database.client.timeout)();
    }

    /** Delete this collection */
    public async deleteAsync() {
        await this.openAsync();
        let tryDelete = (callback) =>
            this.database.client.log("Deleting collection: " + this.id) &&
            this.database.client.documentClient.deleteCollection(this._self,
                undefined, callback);
        await curryPromise(tryDelete, this.database.client.timeout)();
        delete this._self;
    }

    /** Create or update the document with given data; returns the stored data as a plain object, including meta properties such as `_etag` and `_self` */
    public async storeDocumentAsync(data: _DocumentDB.DocumentResource,
        mode?: StoreMode, maxRetries?: number):
        Promise<_DocumentDB.ReadDocumentResource> {
        await this.openAsync();
        if (!data) throw new TypeError();
        var tryStore: (callback) => any, options: _DocumentDB.RequestOptions;
        switch (mode) {
            case StoreMode.UpdateOnlyIfNoChange:
                if (!data._etag) throw new Error("Document _etag missing");
                options = {
                    accessCondition: {
                        type: "IfMatch",
                        condition: data._etag
                    }
                };
            // continue with update...
            case StoreMode.UpdateOnly:
                if (!data._self) throw new Error("Document _self missing");
                tryStore = (callback) =>
                    this.database.client.log("Replacing document: " + data.id) &&
                    this.database.client.documentClient.replaceDocument(data._self,
                        data, options, callback);
                break;
            case StoreMode.CreateOnly:
                tryStore = (callback) =>
                    this.database.client.log("Creating document: " + data.id) &&
                    this.database.client.documentClient.createDocument(this._self,
                        data, undefined, callback);
                break;
            default:
                tryStore = (callback) =>
                    this.database.client.log("Upserting document: " + data.id) &&
                    this.database.client.documentClient.upsertDocument(this._self,
                        data, undefined, callback);
        }
        return <_DocumentDB.ReadDocumentResource>
            await curryPromise(tryStore, this.database.client.timeout, maxRetries)();
    }

    /** Find the document with given ID */
    public async findDocumentAsync(id: string, maxRetries?: number):
        Promise<_DocumentDB.ReadDocumentResource>;
    /** Find the document with the same `id` property, or the first document with exactly the given properties if `id` is not set */
    public async findDocumentAsync(properties: {}, maxRetries?: number): Promise<_DocumentDB.ReadDocumentResource>;
    public async findDocumentAsync(obj: string | {}, maxRetries?: number) {
        var q: _DocumentDB.SqlQuery = {
            query: "select top 1 * from c where",
            parameters: []
        };
        if (typeof obj === "string") {
            // match single ID
            q.query += " c.id = @id";
            q.parameters.push({ name: "@id", value: obj });
        }
        else if (obj["id"]) {
            // match single ID from object (discard other properties)
            q.query += " c.id = @id";
            q.parameters.push({ name: "@id", value: obj["id"] });
        }
        else {
            if (obj instanceof Object) {
                for (var prop in <{}>obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                        // add an exact match for this property
                        if (q.parameters.length) q.query += " and";
                        q.query += ` c.${prop} = @_${prop}_value`;
                        q.parameters.push({
                            name: "@_" + prop + "_value",
                            value: obj[prop]
                        });
                    }
                }
            }
            if (!q.parameters.length) q.query += " true";
            q.query += " order by c._ts desc";
        }

        // return a single resource
        await this.openAsync();
        let tryQuery = (callback) =>
            this.database.client.log("Querying collection " + this.id + ": " +
                JSON.stringify(q)) &&
            this.database.client.documentClient.queryDocuments(this._self, q)
                .toArray(callback);
        var results: _DocumentDB.DocumentResource[] = <any>
            await curryPromise(tryQuery, this.database.client.timeout, maxRetries)();
        if (!results || !results.length)
            throw new Error("Resource not found");
        return results[0];
    }

    /** Query documents in this collection using a SQL query string, or SQL query object (in the form `{ query: "...", parameters: [{ name: "@...", value: ... }, ...] }`), defaults to "select * from c"; returns an encapsulation of the query results that can be used to asynchronously load all results or process them one by one */
    public queryDocuments(query: _DocumentDB.SqlQuery = "select * from c",
        batchSize?: number) {
        if (!this._self) throw new Error("Collection is not open yet");
        var options: _DocumentDB.FeedOptions;
        if (batchSize) options = { maxItemCount: batchSize };
        return new DocumentStream(this,
            this.database.client.documentClient.queryDocuments(this._self,
                query, options));
    }

    /** Delete the given document (must have a _self property, e.g. an object passed to `storeDocumentAsync`, or the result of `findDocumentAsync`) */
    public async deleteDocumentAsync(data: { id?: string, _self: string }, maxRetries?: number) {
        await this.openAsync();
        let tryDelete = (callback) =>
            this.database.client.log("Deleting: " + (data.id || data._self)) &&
            this.database.client.documentClient.deleteDocument(data._self,
                undefined, callback);
        await curryPromise(tryDelete, this.database.client.timeout, maxRetries)();
    }

    /** @internal Self link */
    private _self: string;

    /** @internal Offer link, if known */
    private _offer: _DocumentDB.OfferResource;
}

/** Modes that can be used for storing resources in a collection */
export enum StoreMode { Upsert, CreateOnly, UpdateOnly, UpdateOnlyIfNoChange };
