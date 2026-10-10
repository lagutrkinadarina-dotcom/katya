import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CoffeeOrder, drinks, durations} from '../src/coffee-order.js';

test('50 ₽ pays for one selected drink, with no repeated or premature transactions',()=>{
  const order=new CoffeeOrder();
  assert.equal(order.balance,50);assert.equal(new Set(drinks.map(drink=>drink.name)).size,12);
  assert.equal(order.take(),false);assert.equal(order.drinkNow(),false);assert.equal(order.pay('unknown'),false);
  assert.equal(order.pay('latte'),true);assert.equal(order.balance,0);assert.equal(order.drink.name,'Латте');
  assert.equal(order.pay('tea'),false);assert.equal(order.phase,'paying');
  order.update(durations.paying);assert.equal(order.phase,'brewing');assert.equal(order.fill,0);
  order.update(2);assert.ok(order.fill>0&&order.fill<1);assert.equal(order.take(),false);
  order.update(durations.brewing-2);assert.equal(order.phase,'ready');assert.equal(order.fill,1);
  assert.equal(order.take(),true);assert.equal(order.take(),false);assert.equal(order.drinkNow(),false);
  order.update(durations.taking);assert.equal(order.phase,'holding');assert.equal(order.drinkNow(),true);
  assert.equal(order.drinkNow(),false);order.update(2);assert.ok(order.fill>0&&order.fill<1);
  order.update(durations.drinking-2);assert.equal(order.phase,'idle');assert.equal(order.fill,0);assert.equal(order.balance,0);
  assert.equal(order.pay('espresso'),false);
});

test('save and reload preserve the paid order through every animation and after drinking',()=>{
  const order=new CoffeeOrder();order.pay('cappuccino');
  for(const step of [.5,1.6,4.5,.3,.7,1.6,3]){
    if(order.phase==='ready')order.take();
    if(order.phase==='holding')order.drinkNow();
    order.update(step);
    const restored=new CoffeeOrder(JSON.parse(JSON.stringify(order.snapshot())));
    assert.deepEqual(restored.snapshot(),order.snapshot());assert.equal(restored.fill,order.fill);
  }
  const restored=new CoffeeOrder(order.snapshot());assert.equal(restored.balance,0);
  restored.restore();assert.equal(restored.balance,50);assert.equal(restored.phase,'idle');
});

test('old saves start with 50 ₽; invalid coffee data cannot create an unpaid cup or break the save',()=>{
  for(const saved of [undefined,null,{}, {balance:50,phase:'ready',drinkId:'latte',elapsed:0},
    {balance:0,phase:'brewing',drinkId:'invalid',elapsed:0},
    {balance:0,phase:'drinking',drinkId:'tea',elapsed:Infinity},
    {balance:0,phase:'brewing',drinkId:'tea',elapsed:100}]){
    const order=new CoffeeOrder(saved);assert.equal(order.balance,50);assert.equal(order.phase,'idle');
  }
});

test('orders do not skip or advance while paused and tolerate long frames',()=>{
  const order=new CoffeeOrder();order.pay('espresso');
  const initial=order.snapshot();for(const dt of [0,-1,NaN,Infinity])order.update(dt);
  assert.deepEqual(order.snapshot(),initial);order.update(60);
  assert.equal(order.phase,'ready');assert.equal(order.fill,1);assert.equal(order.balance,0);
});
