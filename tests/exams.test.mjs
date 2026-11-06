import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupExams, filterExams } from '../lib/exams.mjs';
const item=(id,year,session,page,file_type)=>({id,year,session,source_page_url:page,file_type,title:id,public_url:`https://example.org/${id}.pdf`,file_size_bytes:10});
const data=[item('task',2026,'czerwiec','https://arkusze.pl/a/','arkusz'),item('key',2026,'czerwiec','https://arkusze.pl/a/','klucz'),item('zip',2026,'czerwiec','https://arkusze.pl/a/','materialy_pomocnicze'),item('jan',2026,'styczeń','https://arkusze.pl/b/','arkusz'),item('other',2026,'czerwiec','https://arkusze.pl/other/','arkusz'),item('old',2025,'styczeń','https://arkusze.pl/c/','arkusz')];
test('one source exam groups related files but not a different source page',()=>{const groups=groupExams(data);assert.equal(groups.length,4);assert.deepEqual(groups[0].files.map(x=>x.id),['task','key','zip']);assert.equal(groups[1].source_page_url,'https://arkusze.pl/other/');assert.equal(groups[2].session,'styczeń')});
test('type filter finds exams with a file but retains the entire exam',()=>{const found=filterExams(groupExams(data),'2026','klucz');assert.equal(found.length,1);assert.deepEqual(found[0].files.map(x=>x.id),['task','key','zip'])});
test('missing types remain missing and years filter correctly',()=>{const found=filterExams(groupExams(data),'2025','');assert.equal(found.length,1);assert.equal(found[0].files.length,1);assert.equal(filterExams(groupExams(data),'2025','klucz').length,0)});
test('all files of the same type survive grouping',()=>{const more=[...data,item('task2',2026,'czerwiec','https://arkusze.pl/a/','arkusz')];assert.equal(groupExams(more)[0].files.filter(x=>x.file_type==='arkusz').length,2)});
