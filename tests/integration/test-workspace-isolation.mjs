import {projectRoot,appRoot} from '../helpers/paths.mjs';
process.chdir(projectRoot);
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const JSZip=createRequire(import.meta.url)('../../app/assets/vendor/jszip.min.js');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'attendance-isolation-'));
fs.cpSync(appRoot,root,{recursive:true});
fs.mkdirSync(path.join(root,'storage'),{recursive:true});
fs.writeFileSync(path.join(root,'storage','.htaccess'),'Require all denied');
const probe=net.createServer();
await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
let log='',cookie='';
function startServer(){const child=spawn(process.env.PHP_BINARY||'php',['-d','upload_max_filesize=30M','-d','post_max_size=32M','-S',`127.0.0.1:${port}`,'-t',root],{windowsHide:true,stdio:['ignore','pipe','pipe']});child.stderr.on('data',b=>log+=b);return child;}
let server=startServer();
const base=`http://127.0.0.1:${port}/`;
async function request(route, options={}){
 const response=await fetch(base+route,{redirect:'manual',...options,headers:{Cookie:cookie,...options.headers}});
 const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
 const text=await response.text();return {status:response.status,headers:response.headers,text,json:()=>JSON.parse(text)};
}
const api=(section,action='list',values={})=>request(`file-library.php?workspace=${section}&action=${action}&${new URLSearchParams(values)}`);
const post=(section,token,action,values={})=>request(`file-library.php?workspace=${section}`,{method:'POST',headers:{'X-CSRF-Token':token},body:new URLSearchParams({action,...values})});
const formPost=(section,token,action,id='')=>request(`file-action.php?workspace=${section}`,{method:'POST',body:new URLSearchParams({workspace:section,csrf:token,action,id})});
async function fixture(person){
 const zip=new JSZip(),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
 zip.file('xl/workbook.xml',`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Attendance" sheetId="1" r:id="rId1"/></sheets></workbook>`);
 zip.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
 const rows=[['Date','Name','Scheduled Work Count','Actual Work Count','Actual Off Count','Actual Planned Count','Actual Unplanned Count','Actual (Manual Update)','Reporting Ref'],['2026-11-01',person,1,1,0,0,0,'08:00','Worked']];
 zip.file('xl/worksheets/sheet1.xml',`<worksheet xmlns="${ns}"><sheetData>${rows.map((row,n)=>`<row r="${n+1}">${row.map((v,i)=>`<c r="${String.fromCharCode(65+i)}${n+1}"${typeof v==='number'?'':' t="inlineStr"'}>${typeof v==='number'?`<v>${v}</v>`:`<is><t>${v}</t></is>`}</c>`).join('')}</row>`).join('')}</sheetData></worksheet>`);
 return zip.generateAsync({type:'nodebuffer'});
}
async function upload(section,token,person,mode='save',endpoint='files.php'){
 const body=new FormData();body.set('workspace',section);body.set('csrf',token);body.set('mode',mode);body.set('workbook',new Blob([await fixture(person)]),'same-name.xlsx');
 return request(`${endpoint}?workspace=${section}`,{method:'POST',headers:{Accept:'application/json'},body});
}
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await request('index.php')).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,log);
 const home=await request('index.php');assert.match(home.text,/Choose your workspace/);assert.match(home.text,/overview.php\?workspace=food/);assert.match(home.text,/overview.php\?workspace=marketplace/);
 const checkedAssets=new Set();
 for(const route of ['people.php','files.php','archive.php','upload-workbook.php','overview.php']){const r=await request(route);assert.equal(r.status,303,route);assert.equal(r.headers.get('location'),'index.php');}
 for(const route of ['file-library.php','file-library.php?workspace=other','file-library.php?workspace[]=food','file-library.php?workspace=..%2Ffood'])assert.equal((await request(route)).status,400,route);
 const food=(await api('food')).json(),market=(await api('marketplace')).json();assert.deepEqual(food.files,[]);assert.deepEqual(market.files,[]);assert.notEqual(food.token,market.token);
 assert.equal((await post('food',market.token,'archive',{id:'a'.repeat(32)})).status,403);
 const foodUpload=await upload('food',food.token,'Food Agent','open','upload-workbook.php');assert.equal(foodUpload.status,201,foodUpload.text);const fid=foodUpload.json().file.id;assert.equal(foodUpload.json().redirect,'overview.php?workspace=food');
 const marketEmpty=await request('people.php?workspace=marketplace');assert.match(marketEmpty.text,/window.SFSN_WORKBOOK=null/);assert.ok(!marketEmpty.text.includes('Food Agent'));
 const marketUpload=await upload('marketplace',market.token,'Marketplace Agent','open');assert.equal(marketUpload.status,201,marketUpload.text);const mid=marketUpload.json().file.id;assert.notEqual(fid,mid);
 for(const [section,own,other,token,person] of [['food',fid,mid,food.token,'Food Agent'],['marketplace',mid,fid,market.token,'Marketplace Agent']]){
  const list=(await api(section)).json();assert.deepEqual(list.files.map(f=>f.id),[own]);
  for(const action of ['download','workbook'])assert.equal((await api(section,action,{id:other})).status,404,`${section} ${action}`);
  for(const action of ['rename','archive','restore','delete','select'])assert.equal((await post(section,token,action,{id:other,name:'no.xlsx'})).status,404,`${section} ${action}`);
  assert.equal((await formPost(section,token,'use',other)).status,404);
  assert.equal((await request(`edit-workbook.php?workspace=${section}&id=${other}`)).status,404);
  const dash=await request(`people.php?workspace=${section}`);assert.equal(dash.status,200);assert.ok(dash.text.includes(person));assert.ok(!dash.text.includes(section==='food'?'Marketplace Agent':'Food Agent'));assert.match(dash.text,new RegExp(`window.SFSN_WORKSPACE="${section}"`));
  for(const page of ['files.php','archive.php','overview.php','people.php']){
   const r=await request(`${page}?workspace=${section}`);assert.equal(r.status,200,`${section}/${page}`);
   for(const [,asset] of r.text.matchAll(/(?:href|src)="(assets\/[^"#]+)"/g)){
    if(checkedAssets.has(asset))continue;checkedAssets.add(asset);
    const resource=await request(asset);assert.equal(resource.status,200,asset);
    assert.match(resource.headers.get('content-type'),asset.endsWith('.css')?/text\/css/:/javascript/,asset);
   }
   for(const [,link] of r.text.matchAll(/(?:href|action)="([^"#]+\.php[^"#]*)"/g))if(link!=='index.php')assert.ok(link.includes(`workspace=${section}`),`${page}: unscoped ${link}`);
  }
  const combined=await request(`files.php?workspace=${section}`);
  assert.match(combined.text,/id="workbook-upload-form"/);assert.match(combined.text,/id="upload-workbook"/);assert.match(combined.text,new RegExp(`action="files.php\\?workspace=${section}"`));
  const nav=combined.text.match(/<nav aria-label="Main navigation">([\s\S]*?)<\/nav>/)[1];assert.ok(!nav.includes('Upload workbook'),'Upload must not have a separate navigation item');
  const oldUpload=await request(`upload-workbook.php?workspace=${section}`);assert.equal(oldUpload.status,303);assert.equal(oldUpload.headers.get('location'),`files.php?workspace=${section}#upload-workbook`);
  const noFile=await request(`files.php?workspace=${section}`,{method:'POST',headers:{Accept:'application/json'},body:new URLSearchParams({workspace:section,csrf:token})});assert.equal(noFile.status,400);assert.match(noFile.json().error,/Choose an .xlsx file/);
  const invalidToken=await request(`files.php?workspace=${section}`,{method:'POST',headers:{Accept:'application/json'},body:new URLSearchParams({workspace:section,csrf:'invalid'})});assert.equal(invalidToken.status,403);
  assert.equal((await api(section,'download',{id:own})).status,200);
 }
 const mismatch=await request('file-action.php?workspace=food',{method:'POST',body:new URLSearchParams({workspace:'marketplace',csrf:market.token,action:'unload'})});assert.equal(mismatch.status,400);
 assert.equal((await post('food',food.token,'rename',{id:fid,name:'food-renamed.xlsx'})).status,200);assert.equal((await api('marketplace')).json().files[0].name,'same-name.xlsx');
 assert.equal((await post('food',food.token,'archive',{id:fid})).status,200);assert.equal((await api('food','workbook',{id:fid})).status,409);assert.ok((await request('archive.php?workspace=food')).text.includes('food-renamed.xlsx'));assert.ok(!(await request('archive.php?workspace=marketplace')).text.includes('food-renamed.xlsx'));
 assert.match((await request('people.php?workspace=food')).text,/window.SFSN_WORKBOOK=null/);assert.ok((await request('people.php?workspace=marketplace')).text.includes('Marketplace Agent'));
 assert.equal((await post('food',food.token,'restore',{id:fid})).status,200);assert.equal((await formPost('food',food.token,'use',fid)).status,303);
 assert.equal((await formPost('food',food.token,'unload')).status,303);assert.ok((await request('people.php?workspace=marketplace')).text.includes('Marketplace Agent'));
 assert.equal((await post('food',food.token,'delete',{id:fid})).status,409);assert.equal((await post('food',food.token,'archive',{id:fid})).status,200);assert.equal((await post('food',food.token,'delete',{id:fid})).status,200);assert.deepEqual((await api('food')).json().files,[]);assert.equal((await api('marketplace')).json().files.length,1);
 assert.equal((await request('upload.php',{method:'POST'})).status,400);assert.equal((await request('upload.php?workspace=food',{method:'POST'})).status,410);
 assert.ok(fs.existsSync(path.join(root,'storage','marketplace',mid+'.xlsx')));assert.ok(!fs.existsSync(path.join(root,'storage','food',mid+'.xlsx')));
 // A fresh browser session sees the saved selection, including an explicit clear.
 cookie='';
 assert.ok((await request('people.php?workspace=marketplace')).text.includes('Marketplace Agent'));
 assert.match((await request('people.php?workspace=food')).text,/window.SFSN_WORKBOOK=null/);
 let freshFood=(await api('food')).json();
 const first=await upload('food',freshFood.token,'Persistent Food Agent','open');assert.equal(first.status,201,first.text);const firstId=first.json().file.id;
 const second=await upload('food',freshFood.token,'Replacement Food Agent','save');assert.equal(second.status,201,second.text);const secondId=second.json().file.id;
 assert.equal((await api('food','selection')).json().selected,firstId,'Saving another file must not change selection');
 assert.equal((await formPost('food',freshFood.token,'use',secondId)).status,303);
 assert.equal(JSON.parse(fs.readFileSync(path.join(root,'storage','food','selected-workbook.json'))).id,secondId);
 // Restart PHP and discard the session cookie; the selected workbook must survive both.
 server.kill();await new Promise(r=>server.exitCode!==null?r():server.once('exit',r));server=startServer();cookie='';
 let restarted=false;for(let i=0;i<60;i++){try{if((await request('index.php')).status===200){restarted=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(restarted,log);
 assert.equal((await api('food','selection')).json().selected,secondId);
 assert.ok((await request('people.php?workspace=food')).text.includes('Replacement Food Agent'));
 assert.ok((await request('people.php?workspace=marketplace')).text.includes('Marketplace Agent'));
 freshFood=(await api('food')).json();assert.equal((await formPost('food',freshFood.token,'unload')).status,303);cookie='';
 assert.equal((await api('food','selection')).json().selected,null,'Explicit clear must persist');
 assert.equal((await api('marketplace','selection')).json().selected,mid);
 // Upgrade an older session once, then never let that session override an explicit clear.
 fs.writeFileSync(path.join(root,'seed-legacy-session.php'),`<?php require __DIR__ . '/includes/core/library-store.php'; workspaceRequire(true); libraryOpenSession(); $_SESSION['workspaces'][workspaceRequire()]['active_workbook'] = '${firstId}'; session_write_close(); http_response_code(204);`);
 fs.unlinkSync(path.join(root,'storage','food','selected-workbook.json'));
 assert.equal((await request('seed-legacy-session.php?workspace=food')).status,204);
 assert.equal((await api('food','selection')).json().selected,firstId);
 freshFood=(await api('food')).json();assert.equal((await formPost('food',freshFood.token,'unload')).status,303);
 assert.equal((await api('food','selection')).json().selected,null,'Old session must not override a saved clear');
 assert.ok(!/Fatal error|Warning:|Parse error/.test(log),log);
 console.log('PASS: persistent selections across new sessions and PHP restart, workbook replacement, explicit clear, legacy-session migration, separate storage, uploads, navigation, download, rename, archive, restore, delete, CSRF and cross-section requests.');
}finally{server.kill();await new Promise(r=>server.exitCode!==null?r():server.once('exit',r));fs.rmSync(root,{recursive:true,force:true});}
