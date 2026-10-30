import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
test('The offline stroke pilot contains 50 immutable character snapshots with a separate Arphic license',async()=>{
  const manifest=JSON.parse(await readFile('data/strokes/manifest.json','utf8'));
  assert.equal(manifest.package,'hanzi-writer-data@2.0.1');assert.equal(Object.keys(manifest.characters).length,50);
  for(const [ch,entry]of Object.entries(manifest.characters)){
    assert.equal(entry.file,ch.codePointAt(0).toString(16)+'.json');
    const bytes=await readFile('data/strokes/'+entry.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);
    const data=JSON.parse(bytes);assert.equal(data.strokes.length,entry.strokes);assert.equal(data.medians.length,entry.strokes);
  }
  assert.match(await readFile('data/strokes/ARPHICPL.TXT','utf8'),/ARPHIC PUBLIC LICENSE/i);
  for(const coverage of manifest.coverage)assert.equal(coverage.available+coverage.missing.length,coverage.characters);
});
