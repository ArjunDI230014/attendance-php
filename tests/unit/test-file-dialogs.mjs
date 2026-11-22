import {projectRoot,appRoot} from '../helpers/paths.mjs';
process.chdir(projectRoot);
import assert from 'node:assert/strict';
class Element {
    constructor(id) { this.id=id;this.value='';this.textContent='';this.dataset={};this.handlers={};this.classList={toggle(){}}; }
    addEventListener(type,handler){this.handlers[type]=handler;}
    showModal(){this.open=true;}
    close(){this.open=false;this.handlers.close?.();}
    focus(){this.focused=true;}
    setSelectionRange(start,end){this.selection=[start,end];}
    setAttribute(){} removeAttribute(){} reportValidity(){return true;}
}
for(const workspace of ['food','marketplace']) {
    const elements=new Map(),handlers={};let reloads=0,requests=0,fail=false;
    const element=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
    globalThis.document={getElementById:element,addEventListener(type,handler){handlers[type]=handler;}};
    globalThis.location={reload(){reloads++;}};
    globalThis.FormData=class extends Map {
        constructor(){super([['action',element('workbook-dialog-action').value],['id',element('workbook-dialog-id').value],['name',element('library-name').value],['workspace',workspace],['csrf','section-token']]);}
    };
    element('workbook-dialog-form').dataset.apiUrl='file-library.php?workspace='+workspace;
    globalThis.fetch=async(url,options)=>{
        requests++;assert.equal(url,'file-library.php?workspace='+workspace);assert.equal(options.method,'POST');assert.equal(options.headers['X-CSRF-Token'],'section-token');assert.equal(options.body.get('workspace'),workspace);assert.equal(options.body.get('id'),'a'.repeat(32));
        return {ok:!fail,json:async()=>fail?{error:'Keep the .xlsx extension.'}:{file:{name:options.body.get('name')},deleted:options.body.get('id')}};
    };
    const {initializeFileDialogs}=await import(`../../app/assets/js/files/file-dialogs.mjs?workspace=${workspace}`);initializeFileDialogs();
    const link=new Element('trigger');link.dataset={workbookDialog:'rename',id:'a'.repeat(32),name:'Attendance.xlsx'};
    const click=()=>handlers.click({button:0,target:{closest:()=>link},preventDefault(){}});
    click();assert.equal(element('library-dialog').open,true);assert.equal(element('library-name').value,'Attendance.xlsx');assert.deepEqual(element('library-name').selection,[0,10]);assert.equal(requests,0);assert.equal(reloads,0);
    fail=true;await element('workbook-dialog-form').handlers.submit({preventDefault(){}});
    assert.equal(element('library-dialog').open,true);assert.equal(reloads,0);assert.equal(element('workbook-dialog-error').textContent,'Keep the .xlsx extension.');assert.equal(element('workbook-dialog-submit').disabled,false);
    fail=false;element('library-name').value='Updated.xlsx';await element('workbook-dialog-form').handlers.submit({preventDefault(){}});assert.equal(reloads,1);
    link.dataset.workbookDialog='delete';click();assert.equal(element('library-dialog-title').textContent,'Delete archived workbook?');assert.equal(element('library-name-label').hidden,true);assert.equal(element('library-name').required,false);assert.equal(element('workbook-dialog-cancel').focused,true);
    const before=requests;element('workbook-dialog-cancel').handlers.click();assert.equal(element('library-dialog').open,false);assert.equal(requests,before);assert.equal(link.focused,true);
    click();await element('workbook-dialog-form').handlers.submit({preventDefault(){}});assert.equal(element('workbook-dialog-action').value,'delete');assert.equal(requests,before+1);assert.equal(reloads,2);
}
console.log('PASS: Rename and Delete open dialogs, errors remain in the popup, Cancel makes no request, and confirmed actions refresh the same section.');
