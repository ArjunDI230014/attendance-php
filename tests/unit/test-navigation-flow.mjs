import {projectRoot,appRoot} from '../helpers/paths.mjs';
process.chdir(projectRoot);
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
class Element {
    constructor(){this.attrs=new Map();this.attributes=[];this.childNodes=[];this.style={};}
    setAttribute(k,v){this.attrs.set(k,v);this.attributes=[...this.attrs].map(([name,value])=>({name,value}));}
    getAttribute(k){return this.attrs.get(k)??null;}hasAttribute(k){return this.attrs.has(k);}
    removeAttribute(k){this.attrs.delete(k);this.attributes=[...this.attrs].map(([name,value])=>({name,value}));}
    append(){} prepend(n){this.notice=n;}replaceChildren(...nodes){this.childNodes=nodes;}focus(){}
}
const handlers={},windowHandlers={},requests=[],pending=new Map();let starts=0,stops=0;
const body=new Element();body.childNodes=[{page:'initial'}];const heading=new Element(),main=new Element();
const location=new URL('http://localhost/attendance_php/files.php?workspace=food');
const history={state:null,entries:[],replaceState(state,_,url){this.state=state;location.href=new URL(url,location).href;},pushState(state,_,url){this.state=state;location.href=new URL(url,location).href;this.entries.push(location.href);}};
const document={body,head:new Element(),title:'Initial',querySelector:s=>s==='main'?main:heading,querySelectorAll:()=>[],getElementById:()=>null,createElement:()=>new Element(),importNode:n=>n,addEventListener(t,h){handlers[t]=h;}};
class Parser {parseFromString(text){const result={title:text,body:new Element(),querySelector:()=>main,getElementById:()=>null,querySelectorAll:()=>[]};result.body.childNodes=[{page:text}];return result;}}
const context={URL,URLSearchParams,AbortController,DOMException,DOMParser:Parser,document,history,location,scrollX:0,scrollY:0,matchMedia:()=>({matches:true}),setTimeout,clearTimeout,FormData:class extends Map{constructor(form){super(form.fields||[]);}},window:{scrollTo(){},addEventListener(t,h){windowHandlers[t]=h;}},fetch:async(url,options)=>{requests.push({url,options});if(url.includes('failure'))throw Error('Network unavailable');if(url.includes('slow'))return new Promise(resolve=>pending.set(url,resolve));return response(url);}};
function response(url,final=url){return {url:final,headers:{get:()=> 'text/html'},text:async()=>final};}
vm.runInNewContext(fs.readFileSync('app/assets/js/navigation/navigation.mjs','utf8').replace('export function','function'),context);
context.installNavigation({start(){starts++;},stop(){stops++;}});
const nav=context.SummitNextLoading;
for(const page of ['overview','people','files','archive','overview','people','files','archive'])assert.equal(await nav.navigate(page+'.php?workspace=food'),true);
assert.equal(body.childNodes[0].page,'http://localhost/attendance_php/archive.php?workspace=food');
const slowUrl='http://localhost/attendance_php/overview.php?workspace=food&slow=1';const slow=nav.navigate(slowUrl);await new Promise(r=>setImmediate(r));assert.equal(body.childNodes[0].page,'http://localhost/attendance_php/archive.php?workspace=food','Keep old view while waiting');
await nav.navigate('people.php?workspace=marketplace');pending.get(slowUrl)(response(slowUrl));assert.equal(await slow,false);assert.ok(body.childNodes[0].page.includes('workspace=marketplace'),'Late old requests must not overwrite the latest workspace');assert.equal(requests.find(r=>r.url===slowUrl).options.signal.aborted,true);
const form=new Element();form.fields=[['workspace','food'],['q','demo'],['sort','newest']];form.setAttribute('action','files.php?workspace=food');form.setAttribute('method','get');let prevented=false;handlers.submit({target:form,preventDefault(){prevented=true;}});await new Promise(r=>setImmediate(r));assert.equal(prevented,true);assert.ok(location.search.includes('q=demo'));assert.ok(location.search.includes('workspace=food'));
const before=body.childNodes[0].page;assert.equal(await nav.navigate('files.php?workspace=food&failure=1'),false);assert.equal(body.childNodes[0].page,before);assert.equal(main.notice.getAttribute('role'),'alert');
const count=requests.length;const download=new Element();download.href='http://localhost/attendance_php/file-library.php?action=download&workspace=food';handlers.click({button:0,target:{closest:()=>download}});assert.equal(requests.length,count);
const popup=new Element();popup.href='http://localhost/attendance_php/edit-workbook.php?workspace=food';popup.setAttribute('data-workbook-dialog','rename');handlers.click({button:0,target:{closest:()=>popup}});assert.equal(requests.length,count);
location.href='http://localhost/attendance_php/people.php?workspace=food';windowHandlers.popstate({state:{scroll:[0,250]}});await new Promise(r=>setImmediate(r));assert.ok(body.childNodes[0].page.includes('people.php?workspace=food'));assert.ok(stops>=starts);
console.log('PASS: repeated routing, slow loads, cancelled stale requests, workspace changes, search, history and network errors preserve a usable page; downloads and popups stay native.');
