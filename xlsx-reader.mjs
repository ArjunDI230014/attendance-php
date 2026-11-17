const xml=s=>new DOMParser().parseFromString(s,'application/xml');
const nodes=(n,t)=>Array.from(n.getElementsByTagNameNS('*',t));
const content=(n,t)=>nodes(n,t)[0]?.textContent??'';
const col=s=>{let n=0;for(const c of s.match(/^[A-Z]+/)[0])n=n*26+c.charCodeAt(0)-64;return n-1;};
export async function readWorkbook(file){
 if(file.size>30*1024*1024)throw Error('The file is over 30 MB. Use a smaller master workbook.');
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 async function read(p){const f=zip.file(p);if(!f)throw Error('Workbook part missing: '+p);return xml(await f.async('string'));}
 const wb=await read('xl/workbook.xml'),rels=await read('xl/_rels/workbook.xml.rels');
 const targets=new Map(nodes(rels,'Relationship').map(n=>[n.getAttribute('Id'),n.getAttribute('Target')]));
 let strings=[];if(zip.file('xl/sharedStrings.xml'))strings=nodes(await read('xl/sharedStrings.xml'),'si').map(n=>nodes(n,'t').map(t=>t.textContent).join(''));
 let att=null,master={};
 for(const s of nodes(wb,'sheet')){const name=s.getAttribute('name');if(/pivot|^ref$|IR IH/i.test(name))continue;let target=targets.get(s.getAttribute('r:id'));if(!target)continue;target=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
 const doc=await read(target),rows=nodes(doc,'row').map(n=>{const a=[];for(const c of nodes(n,'c')){const t=c.getAttribute('t'),v=content(c,'v');let value=t==='s'?strings[+v]:t==='inlineStr'?nodes(c,'t').map(t=>t.textContent).join(''):t==='e'?v:t==='str'?v:v===''?null:Number(v);a[col(c.getAttribute('r'))]=value;}return a;});
 const hi=rows.slice(0,20).findIndex(a=>a.some(v=>String(v).trim().toLowerCase()==='date')&&a.some(v=>String(v).trim().toLowerCase()==='name')&&a.some(v=>String(v).toLowerCase().includes('reporting ref')));
 if(hi>=0&&(!att||rows.length>att.rows.length))att={headers:rows[hi],rows:rows.slice(hi+1),rowNumbers:nodes(doc,'row').slice(hi+1).map(n=>+n.getAttribute('r')),sheet:name};
 const mi=rows.slice(0,20).findIndex(a=>a.includes('Employee Name')&&a.includes('Joined Date'));
 if(mi>=0){const h=rows[mi],ni=h.indexOf('Employee Name'),ji=h.indexOf('Joined Date'),id=h.indexOf('Dummy ID');for(const a of rows.slice(mi+1)){if(a[ni])master[String(a[ni]).trim().toLowerCase().replace(/\s+/g,' ')]={id:String(a[id]??''),joined:a[ji]};}}
 }
 if(!att)throw Error('No attendance table found. Expected Date, Name and Reporting Ref columns.');
 return {...att,master,source:file.name};
}
