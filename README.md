# Upload File Chunk
Simple utility class for uploading chunks of files. It can handle both file chunking and file uploading and works flawlessly with small and large files. It also handles getting file md5 hashes. Written in TypeScript, completely compatible on any front-end frameworks (React.js, Vue.js, Angular, Svelt, etc).

This library is intended to work with [drf-chunked-upload](https://github.com/jkeifer/drf-chunked-upload) python library. But you can fork this library and modify it on your own terms.

## Installation
```
npm install --save upload-file-chunk

yarn add upload-chunk-file
```
## Basic Usage
```
import * as UploadFileChunk from 'upload-file-chunk

const HomePage = (): JSX.Element => {
  ...
  ...
  
  const handleUploadFiles = (newFile: File): void => {
    UploadFileChunk.upload({
      file: newFile,
      endpoint: 'https://yourownapi.com/api/v1/upload-chunk',
      chunkSizeKb: 5 * 1024 * 1024 // 5MB
      setProgress: (newProgress: number): void => {
        setProgress(newProgress)
        ...
      },
      onSuccess: (postUrl: string, md5Checksum: string): void => {
        ...
      },
      setProgress: ({code}: UploadFileChunk.IUploadChunkError): void => {
        ...
      },
	})
  }
}
```
