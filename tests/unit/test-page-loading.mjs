import {projectRoot,appRoot} from '../helpers/paths.mjs';
process.chdir(projectRoot);
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
class Element {
    constructor(){this.attrs=new Map();this.dataset={};this.textContent='';}
    getAttribute(k){return this.attrs.get(k)??null;}
    setAttribute(k,v){this.attrs.set(k,v);}
    removeAttribute(k){this.attrs.delete(k);}
    hasAttribute(k){return this.attrs.has(k);}
    append(){}
}
const root=new Element(),main=new Element(),body=new Element(),handlers={},windowHandlers={},microtasks=[],timers=new Map();let timerId=0;
const context={URL,document:{documentElement:root,body,querySelector:()=>main,createElement:()=>new Element(),addEventListener(t,h){handlers[t]=h;}},location:new URL('http://localhost/attendance_php/files.php?workspace=food'),window:{addEventListener(t,h){windowHandlers[t]=h;}},queueMicrotask:fn=>microtasks.push(fn),setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
context.installNavigation=(loading)=>{context.SummitNextLoading=loading;};
vm.runInNewContext(fs.readFileSync('app/assets/js/navigation/page-loading.mjs','utf8').replace(/^import[^\n]+\n/,''),context);

context.SummitNextLoading.start();assert.equal(root.dataset.pageLoading,'pending');assert.equal(main.getAttribute('aria-busy'),'true');context.SummitNextLoading.stop();assert.equal(root.dataset.pageLoading,undefined);assert.equal(timers.size,0);
context.SummitNextLoading.start();let delayed=[...timers.entries()].find(([,t])=>t.ms===240);timers.delete(delayed[0]);delayed[1].fn();assert.equal(root.dataset.pageLoading,'true');windowHandlers.pageshow({persisted:true});assert.equal(root.dataset.pageLoading,undefined);assert.equal(main.getAttribute('aria-busy'),null);
main.setAttribute('aria-busy','false');context.SummitNextLoading.start();context.SummitNextLoading.start();assert.equal(timers.size,2);[...timers.values()].find(t=>t.ms===30000).fn();assert.equal(root.dataset.pageLoading,undefined);assert.equal(main.getAttribute('aria-busy'),'false');
console.log('PASS: delayed loading avoids quick flashes, restores accessibility state, and resets after history restores and timeouts.');
