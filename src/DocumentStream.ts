import * as _DocumentDB from "./_DocumentDB";
import { Collection } from "./Collection";
import { curryPromise } from "./Util";

// polyfill Symbol.asyncIterator
if (!(<any>Symbol).asyncIterator) {
    (<any>Symbol).asyncIterator = Symbol("Symbol.asyncIterator");
}

/** Represents asynchronously loaded query result sets as a stream; the type parameter represents the query result type, i.e. a full document resource type for `SELECT * FROM` queries, an object with only projected properties for `SELECT x, y, ... FROM` queries, or even a scalar value for `SELECT VALUE ... FROM` queries */
export class DocumentStream<T> implements AsyncIterable<T> {
    /** @internal create a document stream from a query iterator promise */
    public static create<T>(_collection: Collection, _uid: number,
        _qiP: Promise<_DocumentDB.QueryIterator<T>>) {
        return new DocumentStream(_collection, _uid, _qiP);
    }

    /** Private constructor */
    private constructor(private _collection: Collection, private _uid: number,
        private _qiP: Promise<_DocumentDB.QueryIterator<T>>) {
        // nothing here
    }

    /** Timeout (ms) used for all operations; set to the Client timeout initially, set this to a large number if reading a large result set using `toArray` */
    public timeout = this._collection.database.client.timeout;

    /** Get the next result (asynchronously), if any; promise resolves to the result, or to `null` if there are no results left in the set, or is rejected if an error occurred; subsequent calls to this function will return promises for results after the current result (i.e. requests are queued) */
    public async read(): Promise<T | null> {
        var nextResult = await this.next();
        return nextResult.done ? null : nextResult.value!;
    }

    /** This property makes the entire instance usable as an async iterator */
    [Symbol.asyncIterator] = () => this;

    /** Get the next result (asynchronously), if any; promise resolves to a `{ value, done }` pair, or is rejected if an error occurred; subsequent calls to this function will return promises for results after the current result (i.e. requests are queued) */
    public async next(): Promise<IteratorResult<T>> {
        var qi = this._qi || (this._qi = await this._qiP);
        var readNextAsync = curryPromise<T>(qi.nextItem.bind(qi), this.timeout, 0, 100);
        var next: T = await (this._nextP = this._nextP.then(() =>
            this._collection.database.client.log(
                `[>>${this._uid}] Reading from stream...`) &&
            readNextAsync()));
        return next !== undefined ?
            { value: next, done: false } :
            { value: <any>undefined, done: true };
    }

    /** Call a function for each result, until all results have been processed or the callback returns `false` or throws an error; returned promise resolves to true if all results have been processed, or false otherwise, or is rejected if an error occurred */
    public forEach(f: (doc: T) => any) {
        let next = (): PromiseLike<boolean> => {
            return this.next().then(n => {
                if (n.done) return true;
                if (f(n.value) === false) return false;
                return next();
            });
        };
        return next();
    }

    /** Call a function for each result; returns a promise for an array with all return values, which is resolved only when all results have been processed, or is rejected if the callback throws an error */
    public async mapAsync(f: (doc: T) => void) {
        var result = [];
        while (true) {
            var n = await this.next();
            if (n.done) return result;
            result.push(f(n.value));
        }
    }

    /** Reset the stream to the beginning of the set (synchronously); returns the stream itself */
    public reset(): this {
        this._qi && this._qi.reset();
        return this;
    }

    /** Reset the stream to the beginning of the set (asynchronously, i.e. after all queued operations have completed) */
    public resetAsync() {
        this._nextP.then(() => {
            this._qi && this._qi.reset();
        });
    }

    /** Load all results into an array */
    public async toArray(): Promise<T[]> {
        var qi = this._qi || (this._qi = await this._qiP);
        var readArrayAsync = curryPromise<T[]>(qi.toArray.bind(qi), this.timeout, 0);
        return await (this._nextP = this._nextP.then(() =>
            this._collection.database.client.log(
                `[>>${this._uid}] Reading into array from stream...`) &&
            readArrayAsync()));
    }

    /** @internal The resolved query iterator, if any */
    private _qi?: _DocumentDB.QueryIterator<T>;

    /** @internal Promise for the last operation's result */
    private _nextP: PromiseLike<any> = Promise.resolve(true);
}
