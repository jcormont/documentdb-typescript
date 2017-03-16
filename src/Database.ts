import * as _DocumentDB from "./_DocumentDB";
import { Client } from "./Client";
import { curryPromise, sleepAsync } from "./Util";
import { Collection } from "./Collection";

/** Represents a DocumentDB database */
export class Database {
    /** Refer to a database by name, using given client */
    constructor(id: string, client: Client);
    /** @internal Refer to a database by name, using given client and self link */
    constructor(id: string, client: Client, selfLink: string);
    /** Refer to a database by name, using given URL and master key (implicitly creates a new client instance) */
    constructor(id: string, url?: string, masterKey?: string);
    constructor(id: string, ...info: any[]) {
        if (!id) throw new Error("Databases must have a name");
        this.id = id;
        if (info[0] instanceof Client) {
            // store client reference and optional self link (given by client)
            this.client = info[0];
            this._self = info[1];
        }
        else {
            // create client using given auth data
            this.client = new Client(info[0], info[1]);
        }
    }

    /** The name of the database that this instance refers to */
    public readonly id: string;

    /** The client used for all operations */
    public readonly client: Client;

    /** The partial resource URI for this database, i.e. `"/dbs/..."` */
    public get path() {
        return this._self || "dbs/" + encodeURIComponent(this.id) + "/";
    }

    /** Open and validate the connection, check that this database exists */
    public async openAsync(maxRetries?: number) {
        if (this._self) return this;
        await this.client.openAsync(maxRetries);

        // find this database's self link from client's list of databases
        var dbs = await this.client.listDatabasesAsync(false, maxRetries);
        dbs.some(r => (r.id === this.id ? !!(this._self = r._self) : false));

        if (!this._self) throw new Error("Database does not exist: " + this.id);
        return this;
    }

    /** Open and validate connection, find or create database resource */
    public async openOrCreateAsync(maxRetries = 3) {
        if (this._self) return this;
        await this.client.openAsync(maxRetries);

        // find this database's self link from client's list of databases
        var forceReload = false;
        while (true) {
            var dbs = await this.client.listDatabasesAsync(forceReload);
            dbs.some(db => (db.id === this.id ? !!(this._self = db._self) : false));
            if (!this._self) {
                try {
                    // create the database now
                    await this.client.createDatabaseAsync(this.id);
                    return this;
                }
                catch (err) {
                    if (err.code <= 404 || maxRetries-- <= 0) throw err;
                    // otherwise, continue and maybe pick up the created DB
                    // in the next iteration
                    await sleepAsync(100);
                    forceReload = true;
                }
            }
            return this;
        }
    }

    /** Get a list of Collection instances for this database */
    public async listCollectionsAsync(maxRetries?: number, options?: _DocumentDB.FeedOptions) {
        await this.openAsync(maxRetries);

        // get all collections using readCollections
        let tryListAll = (callback: (err: any, result: any) => void) =>
            this.client.log("Reading collections in " + this.id) &&
            this.client.documentClient.readCollections(this._self!, options)
                .toArray(callback);
        var resources = await curryPromise(tryListAll, this.client.timeout, maxRetries)();

        // map resources to Collection instances
        return (<any[]>resources).map(r => new Collection(r.id, this, r._self));
    }

    /** Delete this database */
    public async deleteAsync(maxRetries?: number, options?: _DocumentDB.RequestOptions) {
        await this.openAsync(maxRetries);

        // use deleteDatabase to delete the database (duh...)
        let tryDelete = (callback: (err: any, result: any) => void) =>
            this.client.log("Deleting database: " + this.id) &&
            this.client.documentClient.deleteDatabase(this._self!, options, callback);
        await curryPromise(tryDelete, this.client.timeout)();
        delete this._self;
    }

    /** @internal Self link */
    private _self?: string;
}
