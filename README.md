# Upload File Chunk
Simple utility class for uploading chunks of files. It can handle both file chunking and file uploading and works flawlessly with small and large files. It also handles getting file md5 hashes. Written in TypeScript, completely compatible on any front-end frameworks (React.js, Vue.js, Angular, Svelt, etc).

This library is intended to work with [drf-chunked-upload](https://github.com/jkeifer/drf-chunked-upload) python library. But you can fork this library and modify it base on your own needs.

## Installation
```
npm install upload-file-chunk

yarn add upload-file-chunk
```
## Basic Usage
```js
import * as UploadFileChunk from "upload-file-chunk"

const HomePage = (): JSX.Element => {
  ...
  ...
  
  const handleUploadFile = (newFile: File): void => {
    const uploadInstance = UploadFileChunk.upload({
      file: newFile,
      endpoint: "https://yourownapi.com/api/v1/upload-chunk",
      chunkSizeKb: 5 * 1024 * 1024 // 5MB chunks
      setProgress: (newProgress: number): void => {
        setProgress(newProgress)
        ...
      },
      onSuccess: (postUrl: string, md5Checksum: string): void => {
        ...
      },
      onError: ({code}: UploadFileChunk.IUploadChunkError): void => {
        uploadInstance.abort()
        ...
      },
})
  }
}
```

## API
### `upload(config)`
This will start the chunking and uploading of the file. It returns an instance of UploadFileChunk.
#### Upload Config
```js
{
  // File | required
  // `file` is the file to be chunked and uploaded
  file: File,
  
  // string | required
  // `endpoint` is the URL endpoint that will be used for the request
  endpoint: "https://yourownapi.com/api/v1/upload-chunk",

  // number | required | default: 51200
  // `chunkSize` is the size in BYTES which will the file will be split into.
  // MUST be in multiples of 256.
  chunkSize: 51200,
  
  // number | optional | default: 5
  // `retries` is the number of attempts to upload a previously failed chunk upload.
  retries: 5,

  // function | required | 0 - 100
  // `setProgress` is a function that will be triggered on upload progress. 
  setProgress: (progressNumber: number): void,

  // function | required
  // `onSuccess` is a function that will be triggered when all the chunks is uploaded successfully. 
  // It returns an endpoint which you will post requests, the md5 checksum of the file and the response of the request of the last chunk
  onSuccess: (postEndpoint, md5: string, response: any),

  // function | required
  // `onError` is a function that will be triggered when an error is occured.
  // It returns an object that consist of error code, error message, number of retry attempth left and the current chunk number.
  // Error code: UPLOAD_CHUNK_FAILED,  UPLOAD_CHUNK_ALL_RETRIES_FAILED, VALIDATION_FAILED, FAILED_HASH_MD5,
  onError: ({ code, message, attemptLeft, chunkNumber }),
}
```
### Instance Methods
- `pause()`
  Pause the current uploading chunk
- `resume()`
  Resumes the upload of the paused chunk
- `abort()`
   Completely abort the current upload request.