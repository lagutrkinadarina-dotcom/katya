import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetaineeConversation,detaineeNodes} from '../src/detainee-dialog.js';
const finish=c=>{let guard=0;while(!c.view.finished){assert.ok(guard++<20);assert.equal(c.advance(),true);}};

test('all dialogue branches are reachable, have distinct responses, and return or end',()=>{
  const visited=new Set();
  function walk(path=[]){
    const c=createDetaineeConversation();finish(c);
    for(const index of path){assert.equal(c.choose(index),true);finish(c);}
    if(visited.has(c.view.node))return;visited.add(c.view.node);
    assert.ok(c.view.line.text.length>0);
    if(c.view.end){assert.equal(c.view.options.length,0);assert.equal(c.choose(0),false);return;}
    assert.ok(c.view.options.length>0);
    for(let i=0;i<c.view.options.length;i++)walk([...path,i]);
  }
  walk();assert.deepEqual([...visited].sort(),Object.keys(detaineeNodes).sort());
});

test('protocol unlocks the fight question only after the response and persists across visits',()=>{
  const c=createDetaineeConversation();finish(c);
  assert.ok(!c.view.options.some(o=>o.next==='fight'));
  c.choose(1);finish(c);c.choose(0);
  assert.deepEqual(c.snapshot,[]);finish(c);
  assert.deepEqual(c.snapshot,['fight']);
  assert.equal(c.view.options.at(-1).text,'Кто начал драку?');
  const next=createDetaineeConversation(c.snapshot);finish(next);
  assert.equal(next.view.options.at(-1).next,'fight');
});

test('selected player reply is followed by all authored lines in order; goodbye includes callout',()=>{
  const c=createDetaineeConversation();finish(c);c.choose(3);
  assert.equal(c.view.line.speaker,'Игрок');assert.equal(c.view.line.text,'Ладно, не буду мешать.');
  c.advance();assert.match(c.view.line.text,/так занята/);c.choose(1);
  assert.equal(c.view.line.text,'Всего доброго.');finish(c);
  assert.equal(c.view.end,true);assert.equal(c.view.after,'Хотя какую нахуй дверь…');
});


test('NPC subtitles consistently use Alice, without changing player speakers',()=>{
  for(const node of Object.values(detaineeNodes))
    for(const line of node.lines)assert.ok(['Игрок','Алиса'].includes(line.speaker));
  const c=createDetaineeConversation();c.advance();assert.equal(c.view.line.speaker,'Алиса');
});
