import {projectRoot,appRoot} from '../helpers/paths.mjs';
process.chdir(projectRoot);
import assert from 'node:assert/strict';
const saved=new Map();let elements,downloads=[];
class Element{
 constructor(id){this.id=id;this.value='';this.innerHTML='';this.textContent='';this.options=[];this.dataset={};this.files=[];this.listeners={};this.classList={toggle(){}};}
 addEventListener(type,fn){this.listeners[type]=fn;}add(option){this.options.push(option);}prepend(){}setAttribute(){}close(){}showModal(){}click(){if(this.download)downloads.push(this.download);}
}
globalThis.localStorage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
globalThis.Option=class{constructor(text,value){this.text=text;this.value=value;}};
globalThis.location={href:'http://localhost/attendance_php/people.php',hash:'',assign(url){this.last=url;},replace(url){this.last=url;}};
const action={id:'test-action',title:'Food follow-up',description:'Food only',owner:'Food lead',due:'2026-12-01',status:'Open'};
async function open(workspace){
 elements=new Map();globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);},createElement:id=>new Element(id),querySelectorAll:()=>[],addEventListener(){},body:{dataset:{}}};
 globalThis.window={SFSN_WORKSPACE:workspace,SFSN_PAGE:'people',addEventListener(){},scrollTo(){}};
 const el=id=>document.getElementById(id);el('basis').value='work';el('productive').value='100';
 const {initializeDashboard}=await import(`../../app/assets/js/dashboard/app.mjs?workspace=${workspace}&run=${Math.random()}`);initializeDashboard();
 return el;
}
let el=await open('food');
el('threshold').value='17';el('shrink-target').value='20';el('settings-form').onsubmit({preventDefault(){}});
el('restore').files=[new File([JSON.stringify({version:2,workspace:'food',actions:[action]})],'food.json')];await el('restore').onchange({target:el('restore')});assert.match(el('actions').innerHTML,/Food follow-up/);
const foodActions=saved.get('sfsn:/attendance_php/:food:sfsn-actions-v1');assert.equal(JSON.parse(foodActions).length,1);
el('backup').onclick();assert.equal(downloads.at(-1),'food-SFSN-attendance-actions.json');
el=await open('marketplace');assert.ok(!el('actions').innerHTML.includes('Food follow-up'));el('settings').onclick();assert.equal(el('threshold').value,8);
el('restore').files=[new File([JSON.stringify({version:2,workspace:'food',actions:[action]})],'food.json')];await el('restore').onchange({target:el('restore')});assert.match(el('message').textContent,/exported from this workspace/);assert.ok(!el('actions').innerHTML.includes('Food follow-up'));
assert.equal(saved.get('sfsn:/attendance_php/:food:sfsn-actions-v1'),foodActions);assert.deepEqual(JSON.parse(saved.get('sfsn:/attendance_php/:marketplace:sfsn-actions-v1')),[]);
el('backup').onclick();assert.equal(downloads.at(-1),'marketplace-SFSN-attendance-actions.json');
el=await open('food');assert.match(el('actions').innerHTML,/Food follow-up/);el('settings').onclick();assert.equal(el('threshold').value,17);
console.log('PASS: browser actions, settings, action backups and export names remain separate across workspaces.');
