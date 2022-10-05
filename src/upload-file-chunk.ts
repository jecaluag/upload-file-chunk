import SparkMD5 from 'spark-md5';

type ProgressFn = (progress: number) => void;

type SuccessFn = (endpoint: string, md5: string, chunkId: string) => void;

type ErrorFn = (error: IUploadChunkError) => void;

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

export enum ErrorCode {
  UPLOAD_CHUNK_FAILED,
  UPLOAD_CHUNK_ALL_RETRIES_FAILED,
  VALIDATION_FAILED,
  FAILED_HASH_MD5,
}

export default class UploadChunk {
  private _file: File;
  private _retries: number;
  private _retryCount: number;
  private _chunkSize: number;
  private _endpoint: string;
  private _chunk!: Blob;
  private _totalChunk: number;
  private _chunkIndex: number;
  private _paused: boolean;
  private _success: boolean;
  private _setProgress: ProgressFn;
  private _setSuccess: SuccessFn;
  private _setError: ErrorFn;
  private _saveMd5: string;

  private _reader: FileReader;

  constructor(options: IOptions) {
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

  private _getChunks(): Promise<void> {
    return new Promise((resolve, _) => {
      const length = this._totalChunk === 1 ? this._file!.size : this._chunkSize;
      const from = length * this._chunkIndex;
      const to = from + length;

      this._reader.onload = () => {
        if (this._reader.result !== null) {
          this._chunk = new Blob([this._reader.result as ArrayBuffer], {
            type: 'application/octet-stream',
          });
        }
        resolve();
      };
      this._reader.readAsArrayBuffer(this._file.slice(from, to));
    });
  }

  private async setMd5(): Promise<void> {
    try {
      this._saveMd5 = await this.toMd5();
    } catch (error) {
      this._setError({
        code: ErrorCode.FAILED_HASH_MD5,
        message: error.message,
      });
    }
  }

  private async _uploadChunk(): Promise<any> {
    const rangeStart = this._chunkIndex * this._chunkSize;
    const rangeEnd = rangeStart + this._chunk.size - 1;
    const headers = {
      Accept: '*/*',
      'Content-Range': `bytes ${rangeStart}-${rangeEnd}/${this._file!.size}`,
    };
    const formdata = new FormData();
    formdata.append('filename', this._file.name);
    formdata.append('file', this._chunk);

    const requestOptions = {
      headers,
      method: 'PUT',
      body: formdata,
    };

    return fetch(this._endpoint, requestOptions).then((response) => response.json());
  }

  private async _handleUploadChunks(): Promise<void> {
    if (this._paused || this._success) return;

    try {
      await this._getChunks();
      this._retryCount += 1;
      const response = await this._uploadChunk();
      // Set new endpoint base on the response
      this._endpoint = response.data.url;

      this._retryCount = 0;
      this._chunkIndex += 1;
      if (this._chunkIndex < this._totalChunk) {
        this._handleUploadChunks();
      } else {
        this._setSuccess(this._endpoint, this._saveMd5, response);
      }

      this._handleChunkProgress();
    } catch (error) {
      if (this._paused || this._success) return;

      this._handleRetry(error);
    }
  }

  private _handleRetry(error: any): void {
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

  private _handleChunkProgress(): void {
    const chunkFraction = this._chunkIndex / this._totalChunk;
    const uploadedBytes = chunkFraction * this._file.size;
    const percentProgress = (100 * uploadedBytes) / this._file.size;
    this._setProgress(percentProgress);
  }

  public abort(): void {
    this.pause();
  }

  public pause(): void {
    this._paused = true;
  }

  public resume(): void {
    if (!this._paused) return;
    this._paused = false;
    if (this._retries === this._retryCount) this._retryCount = 0;
    this._handleUploadChunks();
  }

  private async toMd5(): Promise<string> {
    return new Promise((resolve, reject) => {
      const fd = new FileReader();
      fd.onload = (e): void => {
        const arrBuffer = e.target?.result;
        const md5Hash = SparkMD5.ArrayBuffer.hash(arrBuffer as ArrayBuffer);
        resolve(md5Hash);
      };
      fd.readAsArrayBuffer(this._file);
    });
  }
}

export const upload = (options: IOptions): UploadChunk => new UploadChunk(options);
