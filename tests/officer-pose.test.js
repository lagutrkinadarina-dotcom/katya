import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {solveTwoBone} from '../src/officer-pose.js';

test('seated arms reach keys with fixed segment lengths and bend toward the elbow hint',()=>{
  const start=new Vector3(.239,1.23,0),target=new Vector3(.10,1.10,.43);
  const pose=solveTwoBone(start,target,.267,.25,new Vector3(.2,-1,0));
  assert.ok(pose.end.distanceTo(target)<1e-8);
  assert.ok(Math.abs(pose.joint.distanceTo(start)-.267)<1e-8);
  assert.ok(Math.abs(pose.end.distanceTo(pose.joint)-.25)<1e-8);
  assert.ok(pose.joint.y<start.y);
});

test('moving the desk beyond reach or onto the shoulder never stretches or invalidates the rig',()=>{
  const start=new Vector3(.239,1.23,0);
  for(const target of [new Vector3(4,1.1,3),start.clone(),start.clone().add(new Vector3(0,-.003,0))]){
    const pose=solveTwoBone(start,target,.267,.25,new Vector3(0,-1,0));
    assert.ok(pose.joint.toArray().every(Number.isFinite));
    assert.ok(pose.end.toArray().every(Number.isFinite));
    assert.ok(Math.abs(pose.joint.distanceTo(start)-.267)<1e-8);
    assert.ok(Math.abs(pose.end.distanceTo(pose.joint)-.25)<1e-8);
  }
});
