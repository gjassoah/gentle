import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';

// Scan prose everywhere, not only a hand-maintained list of UI functions. Source
// comments are not interface text. The exclamation check inspects HTML text and
// quoted prose, avoiding JavaScript negation and TeX negative thin spaces.
const words=/\b(?:your|make it|simply|just|easily|powerful|seamless|no account|intact|preserved)\b/i;
const withoutComments=source=>source.replace(/^\s*\/\/.*$/gm,'').replace(/\/\*[\s\S]*?\*\//g,'');
const proseExclamation=source=>source.replace(/<!doctype[^>]*>/gi,'').replace(/\\!/g,'').match(/(?:[A-Za-z][A-Za-z ,.:;−–-]{2,})!(?=[\s<"'`]|$)/i);
test('interface, exports and approved Help use factual wording',async()=>{
  const files=['index.html','docs/cards/HELP.md',...(await readdir('src')).filter(name=>name.endsWith('.js')).map(name=>'src/'+name)];
  for(const file of files){
    const source=withoutComments(await readFile(file,'utf8'));
    assert.doesNotMatch(source,words,file);
    assert.equal(proseExclamation(source),null,`${file}: exclamation in prose`);
  }
});
test('the wording guard recognizes every prohibited word and exclamation',()=>{
  for(const word of ['your','make it','simply','just','easily','powerful','seamless','no account','intact','preserved'])assert.match(`Some ${word} text`,words);
  assert.ok(proseExclamation('<p>Done!</p>'));
  assert.equal(proseExclamation('if(!valid) return; x!==y; \\!'),null);
});
