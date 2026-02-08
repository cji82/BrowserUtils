// Node에서 Base64/JWT 테스트 시 브라우저 API 폴리필
import { Buffer } from 'node:buffer';
if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
  globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
}
