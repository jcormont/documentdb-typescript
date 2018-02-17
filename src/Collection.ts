import * as _DocumentDB from "./_DocumentDB";
import { Database } from "./Database";
import { Client } from "./Client";
import { DocumentStream } from "./DocumentStream";
import { curryPromise, sleepAsync } from "./Util";

/** Global query ID, used to tag reads in the log */
var _queryUID = 0;

/** Modes that can be used for storing resources in a collection */
export enum StoreMode { Upsert, CreateOnly, UpdateOnly, UpdateOnlyIfNoChange };

/** Combined option objects for operations that may invoke multiple network calls */
export type AllOptions = _DocumentDB.FeedOptions & _DocumentDB.RequestOptions;

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

    /** The partial resource URI for this database, i.e. `"/dbs/.../colls/..."` */
    public get path() {
        return this._self ||
            "dbs/" + this.database.id + "/colls/" + encodeURIComponent(this.id);
    }

    /** Open and validate the connection, check that this collection exists */
    public async openAsync(maxRetries?: number, options?: AllOptions) {
        if (this._self) return this;
        await this.database.openAsync(maxRetries);
        let tryGetCollection = (callback: (err: any, result: any) => void) =>
            this.database.client.log("Reading collection " + this.path) &&
            this.database.client.documentClient.readCollection(
                this.path, options, callback);
        var resource = await curryPromise<_DocumentDB.CollectionResource>(
            tryGetCollection,
            this.database.client.timeout, maxRetries)();
        this._self = resource["_self"];
        return this;
    }

    /** Open and validate the connection, find or create collection resource (does not create the database) */
    public async openOrCreateAsync(createThroughput?: number,
        indexingPolicy?: _DocumentDB.IndexingPolicy,
        defaultTtl?: number, maxRetries?: number, options?: AllOptions) {
        if (this._self) return this;
        await this.database.openAsync(maxRetries);
        var resource: _DocumentDB.CollectionResource;
        try {
            let tryGetCollection = (callback: (err: any, result: any) => void) =>
                this.database.client.log("Reading collection " + this.id) &&
                this.database.client.documentClient.readCollection(
                    this.path, options, callback);
            resource = await curryPromise<_DocumentDB.CollectionResource>(
                tryGetCollection,
                this.database.client.timeout, maxRetries)();
        }
        catch (err) {
            if (err.code == 404 /* not found */) {
                // create the collection now
                var data: any = { id: this.id };
                if (indexingPolicy) data.indexingPolicy = indexingPolicy;
                if (defaultTtl !== undefined) data.defaultTtl = defaultTtl;
                try {
                    let tryCreateCollection = (callback: (err: any, result: any) => void) =>
                        this.database.client.log("Creating collection " + this.id) &&
                        this.database.client.documentClient.createCollection(
                            this.database.path, data,
                            { offerThroughput: createThroughput },
                            callback);
                    resource = await curryPromise<_DocumentDB.CollectionResource>(
                        tryCreateCollection,
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
    public async getOfferInfoAsync(maxRetries?: number, options?: AllOptions) {
        await this.openAsync();
        let tryGetOffer = (callback: (err: any, result: any) => void) =>
            this.database.client.log("Getting offer info for " + this.id) &&
            this.database.client.documentClient.queryOffers({
                query: "select * from root r where r.resource = @selflink",
                parameters: [{ name: "@selflink", value: this._self }]
            }, options).toArray(callback);
        var offers: any[] = await curryPromise<any>(
            tryGetOffer, this.database.client.timeout, maxRetries)();
        if (!offers.length) throw new Error("Offer not found");
        this._offer = offers[0];
        return <_DocumentDB.OfferResource>JSON.parse(JSON.stringify(offers[0]));
    }

    /** Set provisioned throughput */
    public async setOfferInfoAsync(throughput: number) {
        await this.openAsync();
        if (!this._offer) await this.getOfferInfoAsync();
        var offer = this._offer!;
        if (!offer.content || !offer.content.offerThroughput)
            throw new Error("Unknown offer type");
        offer.content.offerThroughput = throughput;
        let trySetOffer = (callback: (err: any, result: any) => void) =>
            this.database.client.log("Setting offer info for " + this.id) &&
            this.database.client.documentClient.replaceOffer(
                offer._self, offer, callback);
        this._offer = await curryPromise<any>(trySetOffer,
            this.database.client.timeout)();
    }

    /** Delete this collection */
    public async deleteAsync(maxRetries?: number, options?: AllOptions) {
        await this.openAsync();
        let tryDelete = (callback: (err: any, result: any) => void) =>
            this.database.client.log("Deleting collection: " + this.id) &&
            this.database.client.documentClient.deleteCollection(this._self!,
                options, callback);
        await curryPromise(tryDelete, this.database.client.timeout,
            maxRetries, 500, true)();
        delete this._self;
    }

    /** Create or update the document with given data (must include an `.id` or `._self` property if store mode is `UpdateOnly`, and must also include an `_etag` property if store mode is `UpdateOnlyIfNoChange`); returns the stored data as a plain object, including meta properties such as `._etag` and `._self` */
    public async storeDocumentAsync<T extends Partial<_DocumentDB.DocumentResource>>(
        data: T & object,
        mode?: StoreMode, maxRetries?: number, options?: AllOptions):
        Promise<T & _DocumentDB.DocumentResource> {
        await this.openAsync();
        if (!(<any>data instanceof Object)) throw new TypeError();
        var tryStore: (callback: (err: any, result: any) => void) => any;
        switch (mode) {
            case StoreMode.UpdateOnlyIfNoChange:
                if (!data._etag) throw new Error("Document _etag missing");
                options = Object.assign({
                    accessCondition: {
                        type: "IfMatch",
                        condition: data._etag
                    }
                }, options);
            // continue with update...
            case StoreMode.UpdateOnly:
                if (data.id === undefined) throw new Error("Document ID missing");
                tryStore = (callback) =>
                    this.database.client.log("Replacing document: " + data.id) &&
                    this.database.client.documentClient.replaceDocument(
                        this._getDocURI(data),
                        <any>data, options, callback);
                break;
            case StoreMode.CreateOnly:
                tryStore = (callback) =>
                    this.database.client.log("Creating document: " +
                        (data.id !== undefined && data.id !== "" ? data.id :
                            "(auto generated ID)")) &&
                    this.database.client.documentClient.createDocument(this._self!,
                        data, options, callback);
                break;
            default:
                tryStore = (callback) =>
                    this.database.client.log("Upserting document: " +
                        (data.id !== undefined && data.id !== "" ? data.id :
                            "(auto generated ID)")) &&
                    this.database.client.documentClient.upsertDocument(this._self!,
                        data, options, callback);
        }
        return await curryPromise<T & _DocumentDB.DocumentResource>(
            tryStore, this.database.client.timeout, maxRetries)();
    }

    /** Find the document with given ID */
    public async findDocumentAsync<ResultT extends {}>(id: string,
        maxRetries?: number, options?: AllOptions):
        Promise<ResultT & _DocumentDB.DocumentResource>;
    /** Reload given document from the database using its `._self` property */
    public async findDocumentAsync<ResultT extends {}>(doc: { _self: string },
        maxRetries?: number, options?: AllOptions):
        Promise<ResultT & _DocumentDB.DocumentResource>;
    /** Find the document with exactly the same values for all properties (i.e. where _all_ own properties of the given object match exactly) */
    public async findDocumentAsync<ResultT extends {}>(obj: Partial<ResultT> & object,
        maxRetries?: number, options?: AllOptions):
        Promise<ResultT & _DocumentDB.DocumentResource>;
    public async findDocumentAsync(
        obj: string | { id?: string, _self?: string, [p: string]: any },
        maxRetries?: number, options?: any) {
        await this.openAsync();

        // read using readDocument if possible
        if (typeof obj === "string" ||
            obj && (typeof obj._self === "string" ||
                (typeof obj.id === "string"))) {
            var docURI: string | undefined;
            try { docURI = this._getDocURI(obj) } catch (all) { }
            if (docURI) {
                // if got a well-formed URI, go ahead (and retry on 404, for
                // lower consistency modes)
                let tryReadDoc = (callback: (err: any, result: any) => void) =>
                    this.database.client.log("Reading document " + docURI) &&
                    this.database.client.documentClient.readDocument(
                        docURI!, options, callback);
                let result = await curryPromise<any>(tryReadDoc,
                    this.database.client.timeout, maxRetries, undefined, true)();
                if (typeof obj !== "string" && !obj._self) {
                    // check that other properties match, too
                    for (var prop in <{}>obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                            if (obj[prop] !== result[prop])
                                throw new Error("Resource not found");
                        }
                    }
                }
                return result;
            }
            else if (typeof obj === "string") {
                // select by ID property (e.g. when contains spaces)
                obj = { id: obj };
            }
        }

        // use queryDocuments with given query/properties
        var q: _DocumentDB.SqlQuery = {
            query: "select top 1 * from c where",
            parameters: []
        };
        if (obj instanceof Object) {
            var i = 0;
            for (var prop in <{}>obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    // add an exact match for this property
                    if (q.parameters.length) q.query += " and";
                    q.query += ` c[${JSON.stringify(prop)}] = @_value_${++i}`;
                    q.parameters.push({
                        name: "@_value_" + i,
                        value: obj[prop]
                    });
                }
            }
        }
        if (!q.parameters.length) q.query += " true";

        // sort by time stamp to get latest document first
        q.query += " order by c._ts desc";

        // return a single resource
        let tryQuery = (callback: (err: any, result: any) => void) =>
            this.database.client.log("Querying collection " + this.id + ": " +
                JSON.stringify(q)) &&
            this.database.client.documentClient.queryDocuments(
                this._self!, q, options).toArray(callback);
        var results = await curryPromise<any[]>(tryQuery,
            this.database.client.timeout, maxRetries)();
        if (!results || !results.length)
            throw new Error("Resource not found");
        return results[0];
    }

    /** Check if a document with given ID exists (without reading the document) */
    public async existsAsync(id: string,
        maxRetries?: number, options?: AllOptions): Promise<boolean>;
    /** Check if a document with given properties exists (i.e. where _all_ own properties of the given object match exactly) */
    public async existsAsync(obj: {},
        maxRetries?: number, options?: AllOptions): Promise<boolean>;
    public async existsAsync(
        obj: string | { id?: string, _self?: string, [p: string]: any },
        maxRetries?: number, options?: any) {
        await this.openAsync();

        // use queryDocuments with given ID or properties
        var q: _DocumentDB.SqlQuery = {
            query: "select value count(1) from c where",
            parameters: []
        };
        if (typeof obj === "string") {
            q.query += " c.id = @id";
            q.parameters.push({ name: "@id", value: obj });
        }
        else if (obj instanceof Object) {
            var i = 0;
            for (var prop in <{}>obj) {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) {
                    // add an exact match for this property
                    if (q.parameters.length) q.query += " and";
                    q.query += ` c[${JSON.stringify(prop)}] = @_value_${++i}`;
                    q.parameters.push({
                        name: "@_value_" + i,
                        value: obj[prop]
                    });
                }
            }
        }
        if (!q.parameters.length) q.query += " true";

        // run the query and return true only if count >= 1
        let tryQuery = (callback: (err: any, result: any) => void) =>
            this.database.client.log("Querying collection " + this.id + ": " +
                JSON.stringify(q)) &&
            this.database.client.documentClient
                .queryDocuments(this._self!, q, options)
                .toArray(callback);
        var results = await curryPromise<any[]>(tryQuery,
            this.database.client.timeout, maxRetries)();
        return !!results && results[0] >= 1;
    }

    /** Query documents in this collection using a SQL query string, or SQL query object (i.e. `{ query: "...", parameters: [{ name: "@...", value: ... }, ...] }`) */
    public queryDocuments<ResultT>(query: _DocumentDB.SqlQuery, batchSize?: number):
        DocumentStream<ResultT>;
    /** Query documents in this collection using a SQL query string, or SQL query object (i.e. `{ query: "...", parameters: [{ name: "@...", value: ... }, ...] }`) */
    public queryDocuments<ResultT>(query: _DocumentDB.SqlQuery, options?: AllOptions):
        DocumentStream<ResultT>;
    /** Query all documents in this collection */
    public queryDocuments<ResultT extends {}>(query?: undefined, batchSize?: number):
        DocumentStream<ResultT & _DocumentDB.DocumentResource>;
    /** Query all documents in this collection */
    public queryDocuments<ResultT extends {}>(query?: undefined, options?: AllOptions):
        DocumentStream<ResultT & _DocumentDB.DocumentResource>;
    public queryDocuments(query?: _DocumentDB.SqlQuery, options?: number | AllOptions) {
        if (typeof options === "number") options = { maxItemCount: options };
        var uid = ++_queryUID;
        if (query === undefined) {
            // use readDocuments to get all documents
            return DocumentStream.create<any>(this, uid, this.openAsync().then(() =>
                this.database.client.log(
                    `[${uid}>>] Reading all documents from ${this.id}`) &&
                this.database.client.documentClient.readDocuments(
                    this._self!, <any>options)));
        }
        else {
            // submit given query
            return DocumentStream.create<any>(this, uid, this.openAsync().then(() =>
                this.database.client.log(
                    `[${uid}>>] Querying collection ${this.id}: ` +
                    JSON.stringify(query)) &&
                this.database.client.documentClient.queryDocuments(
                    this._self!, query, <any>options)));
        }
    }

    /** Delete the document with given ID */
    public async deleteDocumentAsync(id: string,
        maxRetries?: number, options?: AllOptions): Promise<void>;
    /** Delete the given document (must have a `_self` property, e.g. the result of `storeDocumentAsync` or `findDocumentAsync`, OR a valid `id` property, note that other properties are NOT matched against the document to be deleted) */
    public async deleteDocumentAsync(doc: { _self: string } | { id: string },
        maxRetries?: number, options?: AllOptions): Promise<void>;
    public async deleteDocumentAsync(v: string | { id?: string, _self?: string },
        maxRetries?: number, options?: AllOptions) {
        await this.openAsync();
        var id = typeof v === "string" ? v : v.id;
        var docURI: string | undefined;
        try { docURI = this._getDocURI(v) } catch (all) { }
        if (!docURI) {
            // ID may contain invalid characters, find _self instead
            var obj = await this.queryDocuments<{ _self: string }>({
                query: "select c._self from c where c.id = @id",
                parameters: [{ name: "@id", value: id }]
            }, options).read();
            if (!obj) throw new Error("Resource not found");
            docURI = obj._self;
        }

        // use deleteDocument to delete by URI (retry on 404 a few times)
        let tryDelete = (callback: (err: any, result: any) => void) =>
            this.database.client.log("Deleting: " + (id || "<no ID>")) &&
            this.database.client.documentClient.deleteDocument(
                docURI!, options, callback);
        await curryPromise(tryDelete, this.database.client.timeout,
            maxRetries, 500, true)();
    }

    /** @internal Helper function that returns a document URI for given ID or object */
    private _getDocURI(v: string | { id?: string, _self?: string }): string {
        if (typeof v !== "string") {
            if (v._self) return v._self;
            v = String(v.id || "");
        }
        var chars = /[\/\\\?#]/;
        if (!v || chars.test(<string>v) || chars.test(this.id))
            throw new Error("Invalid resource ID: " + JSON.stringify(v));
        return "dbs/" + this.database.id +
            "/colls/" + this.id +
            "/docs/" + <string>v;
    }

    /** @internal Self link */
    private _self?: string;

    /** @internal Offer link, if known */
    private _offer?: _DocumentDB.OfferResource;
}
