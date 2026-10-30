import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {selectExampleAudio} from '../scripts/example-audio.mjs';
test('Audio imports require an explicit reusable license, named author and a source attribution URL',()=>{
 const examples=Array.from({length:6},(_,i)=>({seq:i+1,zh_id:i+1}));
 const rows=[['1','11','reader','','https://tatoeba.org/en/audio/of/reader'],['2','12','reader','CC BY-NC 4.0','https://tatoeba.org/en/audio/of/reader'],['3','13','reader','CC BY 4.0','https://tatoeba.org/en/audio/of/reader'],['4','14','reader','CC0 1.0','https://evil.test'],['5','15','\\N','CC BY 4.0','https://tatoeba.org/en/audio/of/reader'],['6','16','reader','CC0 1.0','https://tatoeba.org/en/audio/of/reader']];
 assert.deepEqual(selectExampleAudio(rows,examples).map(r=>r.audio_id),[13,16]);
 assert.deepEqual(selectExampleAudio(rows,examples,1).map(r=>r.audio_id),[13]);
});
test('The 50-pair editorial pilot keeps attribution, drafts and the measured audio rights gap',async()=>{
 const pilot=JSON.parse(await readFile('data/tatoeba-pilot.json','utf8'));
 assert.equal(pilot.reviewStatus,'draft');assert.equal(pilot.examples.length,50);assert.equal(new Set(pilot.examples.map(r=>r.zh_id)).size,50);
 for(const row of pilot.examples){assert.ok(row.zh_author&&row.vi_author&&row.zh&&row.vi);assert.ok(row.seq>0&&row.zh_id>0&&row.vi_id>0);}
 assert.match(pilot.source.sha256,/^[a-f0-9]{64}$/);assert.equal(pilot.audio.length,pilot.audioAudit.eligibleForPilot);
 assert.equal(pilot.audioAudit.linkedRecordings,39);assert.equal(pilot.audioAudit.missingLicense,37);assert.equal(pilot.audioAudit.noncommercialOnly,2);assert.equal(pilot.audio.length,0);
});
