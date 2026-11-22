import {projectRoot,appRoot} from '../helpers/paths.mjs';
process.chdir(projectRoot);
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const key='summitnext:theme:/attendance_php/';
for (const scenario of ['animated','reduced','unsupported','blocked-storage','skipped']) {
    const saved=new Map([[key,'dark']]);let effect,transitions=0,block=scenario==='blocked-storage';
    const button={attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},addEventListener(k,v){this.events[k]=v;},getBoundingClientRect(){return {left:1100,top:20,width:40,height:40};}};
    const root={dataset:{},animate(frames,options){effect={frames,options};return {finished:Promise.resolve()};}};
    const doc={documentElement:root,querySelectorAll:()=>[button]};
    if(scenario!=='unsupported')doc.startViewTransition=update=>{transitions++;update();return {ready:scenario==='skipped'?Promise.reject(Error('Skipped')):Promise.resolve(),finished:Promise.resolve(),skipTransition(){}};};
    const context={URL,Math,Promise,location:{href:'http://localhost/attendance_php/files.php?workspace=food'},document:doc,innerWidth:1200,innerHeight:800,matchMedia:()=>({matches:scenario==='reduced'}),localStorage:{getItem(k){if(block)throw Error('Denied');return saved.get(k);},setItem(k,v){if(block)throw Error('Denied');saved.set(k,v);}},window:{addEventListener(){}}};
    vm.runInNewContext(fs.readFileSync('app/assets/js/theme/theme-init.js','utf8'),context);
    assert.equal(root.dataset.theme,block?'light':'dark');
    vm.runInNewContext(fs.readFileSync('app/assets/js/theme/theme.mjs','utf8'),context);
    const initial=root.dataset.theme;
    button.events.click();await new Promise(r=>setImmediate(r));
    assert.equal(root.dataset.theme,initial==='dark'?'light':'dark',scenario);
    assert.equal(button.attrs['aria-pressed'],String(root.dataset.theme==='dark'));
    assert.equal(button.attrs['aria-busy'],undefined);
    if(!block)assert.equal(saved.get(key),root.dataset.theme);
    if(scenario==='animated'){
        assert.equal(effect.frames.clipPath[0],'circle(0px at 1120px 40px)');
        assert.equal(effect.frames.clipPath[1],`circle(${Math.hypot(1120,760)}px at 1120px 40px)`);
        assert.equal(effect.options.pseudoElement,'::view-transition-new(root)');assert.equal(effect.options.duration,650);
    }
    if(['reduced','unsupported'].includes(scenario)){assert.equal(transitions,0);assert.equal(effect,undefined);}
    button.events.click();await new Promise(r=>setImmediate(r));assert.equal(root.dataset.theme,initial);
}
console.log('PASS: circular reveal originates at the toggle and covers the viewport; both directions, saved preference, reduced motion, unsupported browsers, blocked storage and skipped transitions work.');
