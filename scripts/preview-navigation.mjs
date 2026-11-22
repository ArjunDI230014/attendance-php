import {projectRoot,appRoot} from '../tests/helpers/paths.mjs';
process.chdir(projectRoot);
// Disposable local UI fixture; no staff workbooks or production storage are used.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const JSZip=createRequire(import.meta.url)('../app/assets/vendor/jszip.min.js');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'attendance-navigation-'));
fs.cpSync(appRoot,root,{recursive:true});
fs.mkdirSync(path.join(root,'storage'),{recursive:true});fs.writeFileSync(path.join(root,'storage','.htaccess'),'Require all denied');
for(const [workspace,id,person] of [['food','a'.repeat(32),'Food Demo Agent'],['marketplace','b'.repeat(32),'Marketplace Demo Agent']]){
 const zip=new JSZip(),ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 zip.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
 zip.file('xl/workbook.xml',`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Attendance" sheetId="1" r:id="rId1"/></sheets></workbook>`);
 zip.file('xl/_rels/workbook.xml.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>');
 const rows=[['Date','Name','Scheduled Work Count','Actual Work Count','Actual Off Count','Actual Planned Count','Actual Unplanned Count','Actual (Manual Update)','Reporting Ref'],['2026-11-01',person,1,1,0,0,0,'08:00','Worked'],['2026-11-02',person,1,0,0,0,1,'AL','AL']];
 zip.file('xl/worksheets/sheet1.xml',`<worksheet xmlns="${ns}"><sheetData>${rows.map((row,n)=>`<row r="${n+1}">${row.map((v,i)=>`<c r="${String.fromCharCode(65+i)}${n+1}"${typeof v==='number'?'':' t="inlineStr"'}>${typeof v==='number'?`<v>${v}</v>`:`<is><t>${v}</t></is>`}</c>`).join('')}</row>`).join('')}</sheetData></worksheet>`);
 const directory=path.join(root,'storage',workspace);fs.mkdirSync(directory);
 const bytes=await zip.generateAsync({type:'nodebuffer'});fs.writeFileSync(path.join(directory,id+'.xlsx'),bytes);
 fs.writeFileSync(path.join(directory,'library.json'),JSON.stringify([{id,name:workspace+'-demo.xlsx',size:bytes.length,uploadedAt:new Date().toISOString(),archivedAt:null,sheets:['Attendance']}]));
 fs.writeFileSync(path.join(directory,'selected-workbook.json'),JSON.stringify({id}));
}
const server=spawn(process.env.PHP_BINARY||'php',['-S','127.0.0.1:4186','-t',root],{windowsHide:true,stdio:['ignore','ignore','ignore']});
console.log('Navigation UI preview: http://127.0.0.1:4186/');
let closing=false;function close(){if(closing)return;closing=true;server.kill();setTimeout(()=>{fs.rmSync(root,{recursive:true,force:true});process.exit(0);},200);}
process.on('SIGINT',close);process.on('SIGTERM',close);server.on('exit',close);
await new Promise(()=>{});
