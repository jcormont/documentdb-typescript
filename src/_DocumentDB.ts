// import DocumentDB module
const documentdb = require("documentdb");

/** Constructor for the DocumentClient instance */
export const DocumentClient: {
    new (urlConnection: string, auth: AuthenticationOptions, connectionPolicy?: ConnectionPolicy, consistencyLevel?: ConsistencyLevel): DocumentClient;
} = documentdb.DocumentClient;

/** A DocumentClient instance */
export interface DocumentClient {
    createCollection(dbLink: string, body: Partial<CollectionResource> & Identifiable, options: RequestOptions | undefined, callback: Callback<CollectionResource>): void;
    createDatabase(body: Partial<DatabaseResource> & Identifiable, options: RequestOptions | undefined, callback: Callback<DatabaseResource>): void;
    createDocument(collectionLink: string, body: Partial<DocumentResource>, options: RequestOptions | undefined, callback: Callback<DocumentResource>): void;
    createPermission(userLink: string, body: Partial<PermissionResource>, options: RequestOptions | undefined, callback: Callback<PermissionResource>): void;
    createStoredProcedure(collectionLink: string, sproc: WriteSprocResource & Identifiable, options: RequestOptions | undefined, callback: Callback<SprocResource>): void;
    createUser(dbLink: string, body: Partial<UserResource> & Identifiable, options: RequestOptions | undefined, callback: Callback<UserResource>): void;
    deleteCollection(collectionLink: string, options: RequestOptions | undefined, callback: Callback<any>): void;
    deleteDatabase(dbLink: string, options: RequestOptions | undefined, callback: Callback<any>): void;
    deleteDocument(documentLink: string, options: RequestOptions | undefined, callback: Callback<any>): void;
    deletePermission(permissionLink: string, options: RequestOptions | undefined, callback: Callback<any>): void;
    deleteStoredProcedure(sprocLink: string, options: RequestOptions | undefined, callback: Callback<any>): void;
    deleteUser(userLink: string, options: RequestOptions | undefined, callback: Callback<any>): void;
    executeStoredProcedure(sprocLink: string, params: any[], options: RequestOptions | undefined, callback: Callback<any>): void;
    getDatabaseAccount(callback: (error: ClientError, databaseAccount: DatabaseAccount) => void): void;
    getReadEndpoint(callback: (url: string) => void): void;
    getWriteEndpoint(callback: (url: string) => void): void;
    queryCollections(dbLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<CollectionResource>;
    queryConflicts(collectionLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<Resource>;
    queryDatabases(query: SqlQuery, options?: FeedOptions): QueryIterator<Resource>;
    queryDocuments(collectionLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<any>;
    queryOffers(query: SqlQuery, options?: FeedOptions): QueryIterator<OfferResource>;
    queryPermissions(userLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<PermissionResource>;
    queryStoredProcedures(collectionLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<SprocResource>;
    queryUsers(dbLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<UserResource>;
    readCollection(collectionLink: string, options: RequestOptions | undefined, callback: Callback<CollectionResource>): void;
    readCollections(dbLink: string, options?: FeedOptions): QueryIterator<CollectionResource>;
    readConflict(conflictLink: string, options: RequestOptions | undefined, callback: Callback<Resource>): void;
    readConflicts(collectionLink: string, options?: FeedOptions): QueryIterator<Resource>;
    readDatabase(dbLink: string, options: RequestOptions | undefined, callback: Callback<DatabaseResource>): void;
    readDatabases(options?: FeedOptions): QueryIterator<DatabaseResource>;
    readDocument(documentLink: string, options: RequestOptions | undefined, callback: Callback<DocumentResource>): void;
    readDocuments(collectionLink: string, options?: FeedOptions): QueryIterator<DocumentResource>;
    readOffer(offerLink: string, callback: Callback<OfferResource>): void;
    readOffers(options?: FeedOptions): QueryIterator<OfferResource>;
    readPermission(permissionLink: string, options: RequestOptions | undefined, callback: Callback<PermissionResource>): void;
    readPermissions(userLink: string, options?: FeedOptions): QueryIterator<PermissionResource>;
    readStoredProcedure(sprocLink: string, options: RequestOptions | undefined, callback: Callback<SprocResource>): void;
    readStoredProcedures(collectionLink: string, options?: FeedOptions): QueryIterator<SprocResource>;
    readUser(userLink: string, options: RequestOptions | undefined, callback: Callback<UserResource>): void;
    readUsers(dbLink: string, options?: FeedOptions): QueryIterator<UserResource>;
    replaceDocument(documentLink: string, document: Partial<DocumentResource> & Identifiable, options: RequestOptions | undefined, callback: Callback<DocumentResource>): void;
    replaceOffer(offerLink: string, offer: OfferResource, callback: Callback<OfferResource>): void;
    replacePermission(permissionLink: string, permission: PermissionResource, options: RequestOptions | undefined, callback: Callback<PermissionResource>): void;
    replaceStoredProcedure(sprocLink: string, sproc: SprocResource, options: RequestOptions | undefined, callback: Callback<SprocResource>): void;
    replaceUser(userLink: string, user: UserResource, options: RequestOptions | undefined, callback: Callback<UserResource>): void;
    upsertDocument(collectionLink: string, body: Partial<DocumentResource>, options: RequestOptions | undefined, callback: Callback<DocumentResource>): void;
    upsertPermission(userLink: string, body: Partial<PermissionResource> & Identifiable, options: RequestOptions | undefined, callback: Callback<PermissionResource>): void;
    upsertStoredProcedure(collectionLink: string, sproc: Partial<SprocResource> & Identifiable, options: RequestOptions | undefined, callback: Callback<SprocResource>): void;
    upsertUser(dbLink: string, body: Partial<UserResource> & Identifiable, options: RequestOptions | undefined, callback: Callback<UserResource>): void;

    // TODO: add typings for these methods:
    createAttachment: any;
    createAttachmentAndUploadMedia: any;
    createTrigger: any;
    createUserDefinedFunction: any;
    deleteAttachment: any;
    deleteConflict: any;
    deleteTrigger: any;
    deleteUserDefinedFunction: any;
    queryAttachments: any;
    queryTriggers: any;
    queryUserDefinedFunctions: any;
    readAttachment: any;
    readAttachments: any;
    readMedia: any;
    readTrigger: any;
    readTriggers: any;
    readUserDefinedFunction: any;
    readUserDefinedFunctions: any;
    replaceAttachment: any;
    replaceCollection: any;
    replaceTrigger: any;
    replaceUserDefinedFunction: any;
    updateMedia: any;
    upsertAttachment: any;
    upsertAttachmentAndUploadMedia: any;
    upsertTrigger: any;
    upsertUserDefinedFunction: any;
}

/** Callback as used by DocumentClient */
export type Callback<T extends Resource> =
    (error: ClientError, resource: T, responseHeaders: {}) => void;

/** Object with an ID string */
export interface Identifiable { id: string };

/** Error returned by documentdb methods */
export interface ClientError {
    /** HTTP status code (e.g. 400 for malformed requests, 401 and 403 for auth errors, 404 for resource not found, 408 for when an internal operation timed out, 409 for resource conflicts, 412 for etag mismatches, 413 for entity too large, 429 for request rate too large, 449 for generic write errors that can be retried, and 500+ for server errors) */
    code: number;
    /** Error body, usually another object encoded as JSON */
    body: string;
}

/** Resoure object */
export interface Resource extends Object {
    /** Unique resource ID, less than 255 characters */
    id: string;
    /** System generated resource ID for this resource */
    _rid: string;
    /** System generated unique addressable URI for this resource */
    _self: string;
    /** System generated entity tag for this resource in its current version, for optimistic concurrency control */
    _etag: string;
    /** System generated last updated timestamp for this resource (in seconds since UNIX epoch) */
    _ts: number;
    /** System generated addressable path for the attachments resource */
    _attachments: string;
}

/** User resource (no special properties) */
export interface UserResource extends Resource {
    /** System generated addressable path for the feed of permissions resource */
    _permissions: string;
}

/** Document resource */
export interface DocumentResource extends Resource {
    ttl?: number;
}

/** Database resource */
export interface DatabaseResource extends Resource {
    /** System generated addressable path for the collections resource */
    _colls: string;
    /** System generated addressable path for the users resource */
    _users: string;
};

/** Collection resource */
export interface CollectionResource extends Resource {
    /** Indexing policy for this collection, if any */
    indexingPolicy?: IndexingPolicy;
    /** Partition key for this collection, if any */
    partitionKey?: PartitionKeyDefinition;
    /** Default TTL value for document resources, if any (in seconds, OR -1 for no expiry by default) */
    defaultTtl?: number;
    /** System generated addressable path for the documents resource */
    _docs: string;
    /** System generated addressable path for the stored procedures resource */
    _sprocs: string;
    /** System generated addressable path for the triggers resource */
    _triggers: string;
    /** System generated addressable path for the UDFs resource */
    _udfs: string;
    /** System generated addressable path for the conflicts resource */
    _conflicts: string;
};

/** Permission resource */
export interface PermissionResource extends Resource {
    /** Access mode on the resource for the user: All or Read */
    permissionMode: "Read" | "All";
    /** Full addressable path of the resource associated with the permission */
    resource: string;
};

/** Stored procedure resource */
export interface SprocResource extends Resource {
    /** The unique name of this stored procedure */
    id: string;
    /** The stored procedure function as a string */
    body: string;
}

/** Stored procedure resource, with script as a JavaScript function */
export type WriteSprocResource = Partial<SprocResource> & {
    /** The unique name of this stored procedure */
    id: string;
    /** The stored procedure function as a JavaScript Function instance */
    serverScript: Function;
} | Partial<SprocResource> & {
    /** The unique name of this stored procedure */
    id: string;
    /** The stored procedure function as a string */
    body: string;
};

/** Offer (throughput provisioning) information resource */
export interface OfferResource extends Resource {
    offerVersion: "V2";
    offerType: "Invalid";
    content: {
        /** Throughput for the associated collection, must be in a multiple of 100 */
        offerThroughput: number;
    };
    offerResourceId: string;
    resource: string;
}

/** Consistency level constants */
export type ConsistencyLevel = "Strong" | "BoundedStaleness" | "Session" | "Eventual";

/** Query type: either a plain string or a structure with parameters */
export type SqlQuery = string | {
    /** The SQL query expressed as a string */
    query: string;
    /** SQL query parameters as a list of name-value pairs */
    parameters: Array<{ name: string; value: any }>;
};

/** Authentication options used by the DocumentClient constructor */
export interface AuthenticationOptions {
    masterKey: string;
    resourceTokens?: {
        [resourceId: string]: string
    };
    permissionFeed?: any[];
}

/** DocumentClient connection policy interface */
export interface ConnectionPolicy {
    MediaReadMode?: "Buffered" | "Streamed";
    MediaRequestTimeout?: number;
    RequestTimeout?: number;
    EnableEndpointDiscovery?: boolean;
    PreferredLocations?: string[];
    RetryOptions: {
        MaxRetryAttemptCount?: number;
        FixedRetryIntervalInMilliseconds?: number;
        MaxWaitTimeInSeconds?: number;
    }
}

/** DocumentClient indexing policy interface */
export interface IndexingPolicy {
    automatic?: boolean;
    indexingMode?: "Consistent" | "Lazy";
    includedPaths: {
        Path: string;
        Indexes: {
            Kind: "Hash" | "Range" | "Spatial";
            DataType: string;
            Precision: number;
        }[];
    }[];
    excludedPaths: {
        Path: string;
    }[];
}

/** DocumentClient partition key definition interface */
export interface PartitionKeyDefinition {
    paths: string[];
    kind: "Hash"
}

/** DocumentClient request options interface */
export interface RequestOptions {
    preTriggerInclude?: string;
    postTriggerInclude?: string;
    accessCondition?: {
        type: "IfMatch" | "IfNoneMatch", condition: string;
    };
    indexingDirective?: string;
    consistencyLevel?: ConsistencyLevel;
    sessionToken?: string;
    resourceTokenExpirySeconds?: number;
    offerType?: string;
    offerThroughput?: number;
    partitionKey?: {};
    disableAutomaticIdGeneration?: boolean;
    enableScriptLogging?: boolean;
}

/** Account information */
export interface DatabaseAccount {
    DatabasesLink: string;
    MediaLink: string;
    MaxMediaStorageUsageInMB: string | number;
    CurrentMediaStorageUsageInMB: string | number;
    ConsumedDocumentStorageInMB: number;
    ReservedDocumentStorageInMB: number;
    ProvisionedDocumentStorageInMB: number;
    ConsistencyPolicy: {
        defaultConsistencyLevel: ConsistencyLevel;
        maxStalenessPrefix: number;
        maxStalenessIntervalInSeconds: number;
    };
    WritableLocations: string[];
    ReadableLocations: string[];
}

/** DocumentClient feed options interface */
export interface FeedOptions {
    maxItemCount?: number;
    continuation?: string;
    sessionToken?: string;
    partitionKey?: {};
    enableScanInQuery?: boolean;
    enableCrossPartitionQuery?: boolean;
}

/** DocumentClient query iterator for iterating over a (future) result set */
export interface QueryIterator<T> {
    current(callback: (error: ClientError, element: T) => void): void;
    executeNext(callback: (error: ClientError, list: T[]) => void): void;
    forEach(callback: (error: ClientError, element: T | undefined) => void): void;
    nextItem(callback: (error: ClientError, element: T) => void): void;
    reset(): void;
    toArray(callback: (error: ClientError, list: T[]) => void): void;
}
