export namespace _DocumentDB {
    /** A native DocumentClient instance */
    export interface DocumentClient {
        createAttachment;
        createAttachmentAndUploadMedia;
        createCollection(dbLink: string, body: CollectionResource, options: RequestOptions, callback: Callback);
        createDatabase(body: Resource, options: RequestOptions, callback: Callback);
        createDocument(collectionLink: string, body: DocumentResource, options: RequestOptions, callback: Callback);
        createPermission(userLink: string, body: PermissionResource, options: RequestOptions, callback: Callback);
        createStoredProcedure(collectionLink: string, sproc: SprocResource, options: RequestOptions, callback: Callback);
        createTrigger;
        createUser(dbLink: string, body: UserResource, options: RequestOptions, callback: Callback);
        createUserDefinedFunction;
        deleteAttachment;
        deleteCollection(collectionLink: string, options: RequestOptions, callback: Callback);
        deleteConflict;
        deleteDatabase(dbLink: string, options: RequestOptions, callback: Callback);
        deleteDocument(documentLink: string, options: RequestOptions, callback: Callback);
        deletePermission(permissionLink: string, options: RequestOptions, callback: Callback);
        deleteStoredProcedure(sprocLink: string, options: RequestOptions, callback: Callback);
        deleteTrigger;
        deleteUser(userLink: string, options: RequestOptions, callback: Callback);
        deleteUserDefinedFunction;
        executeStoredProcedure(sprocLink: string, params: any[], options: RequestOptions, callback: Callback);
        getDatabaseAccount(callback: (error: ClientError, databaseAccount: DatabaseAccount) => void);
        getReadEndpoint(callback: (string) => void);
        getWriteEndpoint(callback: (string) => void);
        queryAttachments;
        queryCollections(dbLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<CollectionResource>;
        queryConflicts(collectionLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<Resource>;
        queryDatabases(query: SqlQuery, options?: FeedOptions): QueryIterator<Resource>;
        queryDocuments(collectionLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<DocumentResource>;
        queryOffers(query: SqlQuery, options?: FeedOptions): QueryIterator<OfferResource>;
        queryPermissions(userLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<PermissionResource>;
        queryStoredProcedures(collectionLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<SprocResource>;
        queryTriggers;
        queryUserDefinedFunctions;
        queryUsers(dbLink: string, query: SqlQuery, options?: FeedOptions): QueryIterator<UserResource>;
        readAttachment;
        readAttachments;
        readCollection(collectionLink: string, options: RequestOptions, callback: Callback);
        readCollections(dbLink: string, options?: FeedOptions): QueryIterator<CollectionResource>;
        readConflict(conflictLink: string, options: RequestOptions, callback: Callback);
        readConflicts(collectionLink: string, options?: FeedOptions): QueryIterator<Resource>;
        readDatabase(dbLink: string, options: RequestOptions, callback: Callback);
        readDatabases(options?: FeedOptions): QueryIterator<Resource>;
        readDocument(documentLink: string, options: RequestOptions, callback: Callback);
        readDocuments(collectionLink: string, options?: FeedOptions): QueryIterator<DocumentResource>;
        readMedia;
        readOffer(offerLink: string, callback: Callback);
        readOffers(options?: FeedOptions): QueryIterator<OfferResource>;
        readPermission(permissionLink: string, options: RequestOptions, callback: Callback);
        readPermissions(userLink: string, options?: FeedOptions): QueryIterator<PermissionResource>;
        readStoredProcedure(sprocLink: string, options: RequestOptions, callback: Callback);
        readStoredProcedures(collectionLink: string, options?: FeedOptions): QueryIterator<SprocResource>;
        readTrigger;
        readTriggers;
        readUser(userLink: string, options: RequestOptions, callback: Callback);
        readUsers(dbLink: string, options?: FeedOptions): QueryIterator<UserResource>;
        readUserDefinedFunction;
        readUserDefinedFunctions;
        replaceAttachment;
        replaceCollection;
        replaceDocument(documentLink: string, document: DocumentResource, options: RequestOptions, callback: Callback);
        replaceOffer(offerLink: string, offer: OfferResource, callback: Callback);
        replacePermission(permissionLink: string, permission: PermissionResource, options: RequestOptions, callback: Callback);
        replaceStoredProcedure(sprocLink: string, sproc: SprocResource, options: RequestOptions, callback: Callback);
        replaceTrigger;
        replaceUser(userLink: string, user: UserResource, options: RequestOptions, callback: Callback);
        replaceUserDefinedFunction;
        updateMedia;
        upsertAttachment;
        upsertAttachmentAndUploadMedia;
        upsertDocument(collectionLink: string, body: DocumentResource, options: RequestOptions, callback: Callback);
        upsertPermission(userLink: string, body: PermissionResource, options: RequestOptions, callback: Callback);
        upsertStoredProcedure(collectionLink: string, sproc: SprocResource, options: RequestOptions, callback: Callback);
        upsertTrigger;
        upsertUser(dbLink: string, body: UserResource, options: RequestOptions, callback: Callback);
        upsertUserDefinedFunction;
    }

    /** Constructor for the native DocumentClient instance */
    export interface DocumentClient_Ctor {
        new (urlConnection: string, auth: AuthenticationOptions, connectionPolicy?: ConnectionPolicy, consistencyLevel?: ConsistencyLevel): DocumentClient;
    }

    /** Callback as used by the native DocumentClient */
    export type Callback = (error: ClientError, resource: {}, responseHeaders: {}) => void;

    /** Error returned by documentdb methods */
    export interface ClientError {
        code: number;
        body: string;
    }

    /** Resoure object */
    export interface Resource extends Object {
        id: string;
        _rid?: string;
        _self?: string;
        _etag?: string;
        _ts?: number;
        _attachments?: string;
    }

    /** User resource (no special properties) */
    export interface UserResource extends Resource { }

    /** Document resource */
    export interface DocumentResource extends Resource {
        ttl?: number;
    }

    /** Document resource with all properties */
    export interface ReadDocumentResource extends DocumentResource {
        id: string;
        _rid: string;
        _self: string;
        _etag: string;
        _ts: number;
        _attachments?: string;
        ttl?: number;
    }

    /** Collection resource */
    export interface CollectionResource extends Resource {
        indexingPolicy?: IndexingPolicy;
        defaultTtl?: number;
    };

    /** Permission resource */
    export interface PermissionResource extends Resource {
        permissionMode: "none" | "read" | "all";
        resource: string;
    };

    /** Stored procedure resource */
    export interface SprocResource extends Resource {
        serverScript: Function | string;
    }

    /** Offer (throughput provisioning) information resource */
    export interface OfferResource extends Resource {
        offerVersion: string;
        offerType: string;
        content: {
            offerThroughput: number;
        };
        offerResourceId: string;
        resource: string;
    }

    /** Consistency level constants */
    export type ConsistencyLevel = "Strong" | "BoundedStaleness" | "Session" | "Eventual";

    /** Query type: either a plain string or a structure with parameters */
    export type SqlQuery = string | {
        query: string;
        parameters: { name: string; value: any }[];
    };

    /** Authentication options used by the DocumentClient constructor */
    export interface AuthenticationOptions {
        masterKey: string;
        resourceTokens?: {
            [resourceId: string]: string
        };
        permissionFeed?: any[];
    }

    /** Native connection policy interface */
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

    /** Native indexing policy interface */
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

    /** Native request options interface */
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

    /** Native feed options interface */
    export interface FeedOptions {
        maxItemCount?: number;
        continuation?: string;
        sessionToken?: string;
        partitionKey?: {};
    }

    /** Native query iterator for iterating over a (future) response */
    export interface QueryIterator<ResourceT extends Resource> {
        current(callback: (error: ClientError, element: ResourceT) => void);
        executeNext(callback: (error: ClientError, list: ResourceT[]) => void);
        forEach(callback: (error: ClientError, element: ResourceT | undefined) => void);
        nextItem(callback: (error: ClientError, element: ResourceT) => void);
        reset();
        toArray(callback: (error: ClientError, list: ResourceT[]) => void);
    }
}