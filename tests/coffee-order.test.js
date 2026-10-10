import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CoffeeOrder, drinks, durations, COFFEE_COOLDOWN_MS} from '../src/coffee-order.js';

function finishDrink(order){
  order.update(durations.paying+durations.brewing);assert.equal(order.phase,'ready');
  assert.equal(order.take(),true);order.update(durations.taking);
  assert.equal(order.drinkNow(),true);order.update(durations.drinking);assert.equal(order.phase,'idle');
}

test('buy a selected drink, prevent duplicate orders, and allow the next purchase at exactly three minutes',()=>{
  let now=1000;const order=new CoffeeOrder(undefined,()=>now);
  assert.equal(order.cooldownRemaining,0);assert.equal(new Set(drinks.map(d=>d.name)).size,12);
  assert.equal(order.take(),false);assert.equal(order.drinkNow(),false);assert.equal(order.pay('unknown'),false);
  assert.equal(order.pay('latte'),true);assert.equal(order.cooldownRemaining,180);
  assert.equal(order.pay('tea'),false);assert.equal(order.drink.name,'Латте');
  finishDrink(order);assert.equal(order.pay('espresso'),false);
  now+=COFFEE_COOLDOWN_MS-1;assert.equal(order.cooldownRemaining,1);assert.equal(order.pay('espresso'),false);
  now+=1;assert.equal(order.cooldownRemaining,0);assert.equal(order.pay('espresso'),true);
  assert.equal(order.cooldownRemaining,180);
});

test('cooldown continues while paused or in another room, but cannot replace an uncollected cup',()=>{
  let now=5000;const order=new CoffeeOrder(undefined,()=>now);order.pay('cocoa');
  const phase=order.phase;now+=COFFEE_COOLDOWN_MS;
  assert.equal(order.phase,phase);assert.equal(order.cooldownRemaining,0);assert.equal(order.pay('tea'),false);
  order.update(60);assert.equal(order.phase,'ready');assert.equal(order.fill,1);assert.equal(order.pay('tea'),false);
  order.take();order.update(durations.taking);assert.equal(order.phase,'holding');assert.equal(order.pay('tea'),false);
  order.drinkNow();order.update(durations.drinking);assert.equal(order.pay('tea'),true);
});

test('save and reload preserve the order and deadline without restarting cooldown',()=>{
  let now=1000;const order=new CoffeeOrder(undefined,()=>now);order.pay('cappuccino');
  for(const step of [.5,1.6,4.5,.3,.7,1.6,3]){
    if(order.phase==='ready')order.take();if(order.phase==='holding')order.drinkNow();order.update(step);
    const restored=new CoffeeOrder(JSON.parse(JSON.stringify(order.snapshot())),()=>now);
    assert.deepEqual(restored.snapshot(),order.snapshot());assert.equal(restored.fill,order.fill);
  }
  const saved=order.snapshot();now+=60000;
  const restored=new CoffeeOrder(saved,()=>now);assert.equal(restored.cooldownRemaining,120);
  now+=120000;assert.equal(restored.cooldownRemaining,0);
  restored.restore();assert.equal(restored.phase,'idle');assert.equal(restored.cooldownRemaining,0);
});

test('migrate old wallet saves and recover invalid data without locking the machine',()=>{
  for(const saved of [undefined,null,{}, {phase:'ready',drinkId:'invalid',elapsed:0},
    {phase:'drinking',drinkId:'tea',elapsed:Infinity},{phase:'brewing',drinkId:'tea',elapsed:100}]){
    const order=new CoffeeOrder(saved,()=>1000);assert.equal(order.phase,'idle');assert.equal(order.cooldownRemaining,0);
  }
  const old=new CoffeeOrder({balance:0,phase:'idle',drinkId:'latte',elapsed:0},()=>1000);
  assert.equal(old.pay('tea'),true);assert.equal('balance' in old.snapshot(),false);
  const brewing=new CoffeeOrder({balance:0,phase:'brewing',drinkId:'tea',elapsed:2},()=>1000);
  assert.equal(brewing.phase,'brewing');assert.ok(brewing.fill>0);
  const broken=new CoffeeOrder({phase:'idle',elapsed:0,cooldownUntil:Infinity},()=>1000);
  assert.equal(broken.pay('latte'),true);
});
