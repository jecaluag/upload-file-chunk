"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = exports.ErrorCode = void 0;
const spark_md5_1 = require("spark-md5");
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["UPLOAD_CHUNK_FAILED"] = 0] = "UPLOAD_CHUNK_FAILED";
    ErrorCode[ErrorCode["UPLOAD_CHUNK_ALL_RETRIES_FAILED"] = 1] = "UPLOAD_CHUNK_ALL_RETRIES_FAILED";
    ErrorCode[ErrorCode["VALIDATION_FAILED"] = 2] = "VALIDATION_FAILED";
    ErrorCode[ErrorCode["FAILED_HASH_MD5"] = 3] = "FAILED_HASH_MD5";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
class UploadChunk {
    constructor(options) {
        this._file = options.file;
        this._endpoint = options.endpoint;
        this._retries = options.retries || 5;
        this._retryCount = 0;
        this._chunkSize = options.chunkSizeKb;
        this._totalChunk = Math.ceil(this._file.size / this._chunkSize);
        this._chunkIndex = 0;
        this._saveMd5 = '';
        this._setProgress = options.setProgress;
        this._setSuccess = options.onSuccess;
        this._setError = options.onError;
        this._paused = false;
        this._success = false;
        this._reader = new FileReader();
        this.setMd5();
        this._handleUploadChunks();
    }
    _getChunks() {
        return new Promise((resolve, _) => {
            const length = this._totalChunk === 1 ? this._file.size : this._chunkSize;
            const from = length * this._chunkIndex;
            const to = from + length;
            this._reader.onload = () => {
                if (this._reader.result !== null) {
                    this._chunk = new Blob([this._reader.result], {
                        type: 'application/octet-stream',
                    });
                }
                resolve();
            };
            this._reader.readAsArrayBuffer(this._file.slice(from, to));
        });
    }
    setMd5() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._saveMd5 = yield this.toMd5();
            }
            catch (error) {
                this._setError({
                    code: ErrorCode.FAILED_HASH_MD5,
                    message: error.message,
                });
            }
        });
    }
    _uploadChunk() {
        return __awaiter(this, void 0, void 0, function* () {
            const rangeStart = this._chunkIndex * this._chunkSize;
            const rangeEnd = rangeStart + this._chunk.size - 1;
            const headers = {
                Accept: '*/*',
                'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${this._file.size}`,
            };
            const formdata = new FormData();
            formdata.append('filename', this._file.name);
            formdata.append('file', this._chunk);
            const requestOptions = {
                headers,
                method: 'PUT',
                body: formdata
            };
            return fetch(this._endpoint, requestOptions)
                .then(response => response.json());
        });
    }
    _handleUploadChunks() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._paused || this._success)
                return;
            try {
                yield this._getChunks();
                this._retryCount += 1;
                const response = yield this._uploadChunk();
                // Set new endpoint base on the response
                this._endpoint = response.data.url;
                this._retryCount = 0;
                this._chunkIndex += 1;
                if (this._chunkIndex < this._totalChunk) {
                    this._handleUploadChunks();
                }
                else {
                    this._setSuccess(this._endpoint, this._saveMd5, response);
                }
                this._handleChunkProgress();
            }
            catch (error) {
                if (this._paused || this._success)
                    return;
                this._handleRetry(error);
            }
        });
    }
    _handleRetry(error) {
        if (this._retryCount < this._retries) {
            this._handleUploadChunks();
            this._setError({
                code: ErrorCode.UPLOAD_CHUNK_FAILED,
                message: error.message,
                attemptLeft: this._retries - this._retryCount,
                chunkNumber: this._chunkIndex + 1,
            });
            return;
        }
        this._paused = true;
        this._setError({
            code: ErrorCode.UPLOAD_CHUNK_ALL_RETRIES_FAILED,
            message: error.message,
            attemptLeft: this._retries - this._retryCount,
            chunkNumber: this._chunkIndex + 1,
        });
    }
    _handleChunkProgress() {
        const chunkFraction = this._chunkIndex / this._totalChunk;
        const uploadedBytes = chunkFraction * this._file.size;
        const percentProgress = (100 * uploadedBytes) / this._file.size;
        this._setProgress(percentProgress);
    }
    abort() {
        this.pause();
    }
    pause() {
        this._paused = true;
    }
    resume() {
        if (!this._paused)
            return;
        this._paused = false;
        if (this._retries === this._retryCount)
            this._retryCount = 0;
        this._handleUploadChunks();
    }
    toMd5() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const fd = new FileReader();
                fd.onload = (e) => {
                    var _a;
                    const arrBuffer = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
                    const md5Hash = spark_md5_1.default.ArrayBuffer.hash(arrBuffer);
                    resolve(md5Hash);
                };
                fd.readAsArrayBuffer(this._file);
            });
        });
    }
}
exports.default = UploadChunk;
const upload = (options) => new UploadChunk(options);
exports.upload = upload;
