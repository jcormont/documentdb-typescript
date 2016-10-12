import { _DocumentDB } from "./_DocumentDB";
import { Collection } from "./Collection";
import { curryPromise } from "./Util";

/** Represents asynchronously loaded document sets as a stream */
export class DocumentStream {
    /** @internal constructor */
    constructor(private _collection: Collection,
        private _qi: _DocumentDB.QueryIterator<_DocumentDB.DocumentResource>) {
        // nothing here
    }

    /** Timeout (ms) used for all operations; set to the Client timeout initially, set this to a large number if reading a large result set using `toArray` */
    public timeout = this._collection.database.client.timeout;

    /** Get the next document (asynchronously), if any; promise resolves to null if there are no documents left in the set */
    public async read() {
        this._collection.database.client.log("Reading from stream...");
        var next: _DocumentDB.DocumentResource = <any>
            await curryPromise(this._qi.nextItem.bind(this._qi),
                this.timeout, 0)();
        return next || null;
    }

    /** Call a function for each document, until all documents have been processed or the callback returns `false` or throws an error */
    public forEach(f: (doc: _DocumentDB.DocumentResource) => any) {
        let next = () => this.read().then(doc => {
            if (!doc) return;
            if (f(doc) !== false) next();
        });
        next();
    }

    /** Call a function for each document; returns a promise for an array with all return values, which is resolved only when all documents have been processed, or is rejected if the callback throws an error */
    public async mapAsync(f: (doc: _DocumentDB.DocumentResource) => void) {
        var result = [];
        while (true) {
            var doc = await this.read();
            if (!doc) return result;
            result.push(f(doc));
        }
    }

    /** Reset the stream to the beginning of the set */
    public reset() {
        this._qi.reset();
    }

    /** Load all documents into an array */
    public async toArray() {
        return <_DocumentDB.DocumentResource[]>await curryPromise(
            this._qi.toArray.bind(this._qi), this.timeout, 0)();
    }
}