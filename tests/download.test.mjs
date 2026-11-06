import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downloadUrl } from '../lib/download.mjs';
test('link requests an attachment with a meaningful PDF filename',()=>{const result=new URL(downloadUrl('https://example.supabase.co/storage/v1/object/public/bucket/hash.pdf','INF.03 – czerwiec 2026 – egzamin praktyczny'));assert.equal(result.searchParams.get('download'),'INF.03 – czerwiec 2026 – egzamin praktyczny.pdf');assert.equal(result.pathname,'/storage/v1/object/public/bucket/hash.pdf')});
test('preserves existing parameters and sanitizes archive name',()=>{const result=new URL(downloadUrl('https://example.supabase.co/storage/v1/object/public/bucket/file.zip?x=1','INF.03 / załączniki'));assert.equal(result.searchParams.get('x'),'1');assert.equal(result.searchParams.get('download'),'INF.03 - załączniki.zip')});
