import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {projectRoot,appRoot} from '../tests/helpers/paths.mjs';

const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);
function run(command,args,label,quiet=false){
    const result=spawnSync(command,args,{cwd:projectRoot,windowsHide:true,encoding:'utf8',stdio:quiet?'pipe':'inherit'});
    if(result.error||result.status!==0){if(quiet)process.stderr.write((result.stdout||'')+(result.stderr||''));throw Error(label+': '+(result.error?.message||'failed'));}
}
const integrationOnly=process.argv.includes('--integration');
try{
    if(!integrationOnly){
        const files=walk(appRoot);
        for(const file of files.filter(file=>/\.(mjs|js)$/.test(file)&&!file.includes(path.sep+'vendor'+path.sep)))run(process.execPath,['--check',file],file,true);
        for(const file of files.filter(file=>file.endsWith('.mjs'))){
            const source=fs.readFileSync(file,'utf8');
            for(const match of source.matchAll(/(?:from\s+|import\s*\()(['"])(\.[^'"]+)\1/g)){
                const target=path.resolve(path.dirname(file),match[2].split(/[?#]/)[0]);
                if(!fs.existsSync(target))throw Error('Missing module import: '+path.relative(projectRoot,file)+' -> '+match[2]);
            }
        }
        for(const file of files.filter(file=>file.endsWith('.php')))run(process.env.PHP_BINARY||'php',['-l',file],file,true);
        console.log('PASS: application JavaScript/PHP syntax and local module imports.');
        for(const file of walk(path.join(projectRoot,'tests','unit')).filter(file=>file.endsWith('.mjs')).sort())run(process.execPath,[file],path.basename(file));
    }
    if(integrationOnly||process.argv.includes('--all')){
        run(process.execPath,[path.join(projectRoot,'tests','integration','test-workspace-isolation.mjs')],'PHP integration tests');
    }
    console.log('All requested checks passed.');
}catch(error){console.error(error.message);process.exitCode=1;}
