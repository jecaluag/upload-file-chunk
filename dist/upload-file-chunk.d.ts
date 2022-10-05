declare type ProgressFn = (progress: number) => void;
declare type SuccessFn = (endpoint: string, md5: string, chunkId: string) => void;
declare type ErrorFn = (error: IUploadChunkError) => void;
interface IOptions {
    file: File;
    endpoint: string;
    /** Size per chunk Kilobyte (KB), must be divisible by 256 */
    chunkSizeKb: number;
    retries?: number;
    setProgress: ProgressFn;
    onSuccess: SuccessFn;
    onError: ErrorFn;
}
export interface IUploadChunkError {
    code: ErrorCode;
    message: string;
    attemptLeft?: number;
    chunkNumber?: number;
}
export declare enum ErrorCode {
    UPLOAD_CHUNK_FAILED = 0,
    UPLOAD_CHUNK_ALL_RETRIES_FAILED = 1,
    VALIDATION_FAILED = 2,
    FAILED_HASH_MD5 = 3
}
export default class UploadChunk {
    private _file;
    private _retries;
    private _retryCount;
    private _chunkSize;
    private _endpoint;
    private _chunk;
    private _totalChunk;
    private _chunkIndex;
    private _paused;
    private _success;
    private _setProgress;
    private _setSuccess;
    private _setError;
    private _saveMd5;
    private _reader;
    constructor(options: IOptions);
    private _getChunks;
    private setMd5;
    private _uploadChunk;
    private _handleUploadChunks;
    private _handleRetry;
    private _handleChunkProgress;
    abort(): void;
    pause(): void;
    resume(): void;
    private toMd5;
}
export declare const upload: (options: IOptions) => UploadChunk;
export {};
