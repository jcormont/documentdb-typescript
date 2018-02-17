import { Client } from "./Client";

/** Current number of pending requests */
var _pending = 0;

/** Return a curried version of given function that appends a callback as a last parameter, which rejects or resolves a promise; the promise is returned immediately; also handles DocumentDB errors when possible */
export function curryPromise<T>(f: Function, timeout = 60000,
    maxRetries = 0, retryTimer?: number, retryOn404?: boolean) {
    return (...args: any[]): Promise<T> => {
        // return Promise for result or error
        var started = false, done: any;
        var retries = maxRetries, timeoutTimer: any;
        return new Promise<T>(function exec(resolve, reject) {
            if (done) return;
            if (!started) {
                if (_pending >= Client.concurrencyLimit) {
                    setTimeout(exec, retryTimer || 100, resolve, reject);
                    return;
                }
                _pending++;
                started = true;
            }

            // set timeout timer, reject when reached
            function setTimeoutTimer() {
                let t = timeoutTimer = setTimeout(() => {
                    if (t === timeoutTimer) {
                        if (retries-- > 0)
                            retry();
                        else
                            reject(done = new Error("Timeout"));
                    }
                }, timeout);
            }
            function clearTimeoutTimer() {
                clearTimeout(timeoutTimer);
                timeoutTimer = undefined;
            }
            var retried = false;
            function retry(err?: any, headers?: any) {
                if (retried) return;
                retried = true;
                clearTimeoutTimer();
                var t = retryTimer || 100;
                if (err && err.code === 429 &&
                    headers && headers["x-ms-retry-after-ms"])
                    t = parseFloat(headers["x-ms-retry-after-ms"]);
                setTimeout(exec, t, resolve, reject);
            }
            setTimeoutTimer();

            // append own callback
            args.push((err: any, result: any, headers?: any) => {
                if (err) {
                    // retry or reject
                    if (err.code !== 400 && err.code !== 401 &&
                        err.code !== 403 && (retryOn404 || err.code !== 404) &&
                        err.code !== 409 && err.code !== 412 &&
                        err.code !== 413 && retries-- > 0) {
                        retry(err, headers);
                    }
                    else {
                        var error: Error | undefined, body: any;
                        try { body = JSON.parse(err.body) } catch (all) { }
                        if (body) {
                            error = new Error(body.message || "Database error");
                            (<any>error).code = err.code;
                            error.name = body.code;
                        }
                        reject(error || err);
                        done = true;
                        clearTimeoutTimer();
                    }
                }
                else {
                    // resolve the promise
                    resolve(result);
                    done = true;
                    clearTimeoutTimer();
                }
            });
            try {
                f.apply(undefined, args);
            }
            catch (err) {
                reject(err);
            }
        }).then(
            result => {
                if (started) _pending--;
                return result;
            },
            err => {
                if (started) _pending--;
                throw err;
            });
    };
}

/** Return a promise that resolves after a given timeout */
export function sleepAsync(ms: number, value: any = undefined) {
    return new Promise(resolve => {
        setTimeout(() => resolve(value), ms);
    });
}