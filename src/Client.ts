import * as _DocumentDB from "./_DocumentDB";
import { curryPromise, sleepAsync } from "./Util";
import { Database } from "./Database";

/** List of opened/opening clients for specific endpoint/key combinations */
var _openClients = new Map<string, Client>();

/** Next UID */
var _uid = 1;

/** Represents a DocumentDB endpoint */
export class Client {
    constructor(url?: string, masterKey = "<no_key>") {
        this.url = url || "";
        this.authenticationOptions = { masterKey };
    }

    /** Global concurrency limit for all server requests */
    public static concurrencyLimit = 25;

    /** Set to true to log all requests to the console */
    public enableConsoleLog = false;

    /** Timeout (ms) used for all requests (defaults to 40s) */
    public timeout = 40000;

    /** The endpoint URL to connect to */
    public url: string;

    /** The authentication object used to connect to this endpoint */
    public authenticationOptions: _DocumentDB.AuthenticationOptions;

    /** The connection policy used for the connection to this endpoint, if specified; note that the retry policy here is implemented at a lower level than the maxRetries parameter that can be specified when calling some of this module's methods */
    public connectionPolicy: _DocumentDB.ConnectionPolicy | undefined;

    /** The consistency level (string: "Strong" | "BoundedStaleness" | "Session" | "Eventual") used for the connection to this endpoint, if specified */
    public consistencyLevel: _DocumentDB.ConsistencyLevel | undefined;

    /** The native DocumentClient instance; throws an error if this client is currently not connected (check using .isOpen, or await .openAsync() first) */
    public get documentClient(): _DocumentDB.DocumentClient {
        if (this._closed) throw new Error("Client already closed");
        if (!this._client) throw new Error("Document DB client is not connected");
        return this._client;
    }

    /** Returns true if this client is currently connected through a native DocumentClient instance */
    public get isOpen() { return !!this._client && !this._closed }

    /** Connect to the endpoint represented by this client and validate the connection, unless already connected */
    public openAsync(maxRetries = 3): PromiseLike<any> {
        if (this._closed) throw new Error("Client already closed");
        if (this._open) return this._open;

        // check if another instance is already connected/-ing
        var key = this.url + ":" +
            JSON.stringify(this.authenticationOptions) + ":" +
            JSON.stringify(this.connectionPolicy) + ":" +
            this.consistencyLevel;
        if (_openClients.has(key)) {
            var other = _openClients.get(key)!;
            this._client = other._client;
            this._databaseResources = other._databaseResources;
            return this._open = other._open!;
        }
        _openClients.set(key, this);

        // create a new DocumentClient instance
        this._client = new _DocumentDB.DocumentClient(this.url,
            this.authenticationOptions, this.connectionPolicy,
            this.consistencyLevel);

        // return a promise that resolves when databases are read
        return this._open = new Promise(resolve => {
            let tryConnect = (callback: (err: any, result: any) => void) =>
                this.log("Connecting to " + this.url) &&
                this._client!.readDatabases({ maxItemCount: 1000 })
                    .toArray(callback);
            resolve(curryPromise(tryConnect, this.timeout, maxRetries)()
                .then(dbs => { this._resolve_databases!(dbs) }));
        });
    }

    /** Get a (cached) list of Database instances for all databases in this account */
    public async listDatabasesAsync(forceReload?: boolean, maxRetries?: number) {
        if (!this._open) await this.openAsync(maxRetries);
        if (forceReload) {
            // create new promise for list of DB resources
            this._databaseResources =
                new Promise<_DocumentDB.Resource[]>(resolve => {
                    this._resolve_databases = resolve;
                });

            // read all databases again and resolve promise
            let tryReadDBs = (callback: (err: any, result: any) => void) =>
                this.log("Reading list of databases") &&
                this._client!.readDatabases({ maxItemCount: 1000 })
                    .toArray(callback);
            this._resolve_databases!(
                await curryPromise(tryReadDBs, this.timeout, maxRetries)());
        }
        var databaseResources = await this._databaseResources;
        return databaseResources.map(r =>
            new Database(r.id, this, r._self));
    }

    /** @internal Create a database (and add it to the list returned by listDatabasesAsync) */
    public async createDatabaseAsync(id: string, maxRetries?: number,
        options?: _DocumentDB.RequestOptions) {
        await this.openAsync();
        let tryCreateDB = (callback: (err: any, result: any) => void) =>
            this.log("Creating database: " + id) &&
            this._client!.createDatabase({ id }, options, callback);
        await curryPromise(tryCreateDB, this.timeout, maxRetries)();

        // reload all database resources until the created DB appears
        // (this is to allow for consistency less than session consistency)
        var times = Math.ceil(this.timeout / 100);
        while (times-- > 0) {
            var dbs = await this.listDatabasesAsync(true);
            if (dbs.some(db => db.id === id)) return;
            await sleepAsync(100);
        }
        throw new Error("Timeout");
    }

    /** Get account information */
    public async getAccountInfoAsync() {
        let tryGetInfo = (callback: (err: any, result: any) => void) =>
            this.log("Getting account info") &&
            this._client!.getDatabaseAccount(callback);
        return <_DocumentDB.DatabaseAccount>await curryPromise(
            tryGetInfo, this.timeout)();
    }

    /** Remove the current connection; an attempt to open the same endpoint again in another instance will open and validate the connection again, but the current instance cannot be re-opened */
    public close() {
        this._closed = true;
        _openClients.forEach((client, key) => {
            if (client === this) _openClients.delete(key);
        });
    }

    /** @internal Log a message; always returns true */
    public log(message: string): true {
        if (this.enableConsoleLog)
            console.log(`[${process.pid}]{${this._uid}} ${Date.now()} ${message}`);
        return true;
    }

    /** @internal List of databases found in the account, resolved if and when opened */
    private _databaseResources = new Promise<_DocumentDB.DatabaseResource[]>(resolve => {
        this._resolve_databases = resolve;
    });

    /** @internal */
    private _resolve_databases?: (data: any) => void;

    /** @internal */
    private _open?: PromiseLike<any>;

    /** @internal */
    private _client?: _DocumentDB.DocumentClient;

    /** @internal */
    private _closed?: boolean;

    /** @internal */
    private _uid = _uid++;
}
