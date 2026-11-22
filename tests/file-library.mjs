import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalize} from '../model.mjs';

const base = process.env.DASHBOARD_URL || 'http://localhost/attendance_php/';
const endpoint = new URL('file-library.php', base);
const temporary = mkdtempSync(join(tmpdir(), 'attendance-library-test-'));
const php = process.env.PHP_BINARY || 'C:\\xampp\\php\\php.exe';
const fixture = join(temporary, 'attendance.xlsx');
const generic = join(temporary, 'general.xlsx');
const ownedIds = new Set();
let token = '', cookie = '', checks = 0;

async function request(action, fields = {}, {method = 'GET', status = 200, csrf = true} = {}) {
    const url = new URL(endpoint);
    const options = {method, headers: {Cookie:cookie}};
    if (method === 'POST') {
        if (csrf) options.headers['X-CSRF-Token'] = token;
        const form = new FormData();
        form.set('action', action);
        for (const [key, value] of Object.entries(fields)) form.set(key, value);
        options.body = form;
    } else url.search = new URLSearchParams({action, ...fields});
    const response = await fetch(url, options);
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const body = await response.json();
    assert.equal(response.status, status, JSON.stringify(body));
    checks++;
    return body;
}
function workbook(path, name) { return new File([readFileSync(path)], name, {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); }

try {
    execFileSync(php, [fileURLToPath(new URL('./create-workbook.php', import.meta.url)), fixture]);
    execFileSync(php, [fileURLToPath(new URL('./create-workbook.php', import.meta.url)), generic, 'generic']);
    token = (await request('list')).token;
    assert.match(token, /^[a-f0-9]{64}$/);
    await request('upload', {workbook:workbook(fixture, 'missing-csrf.xlsx')}, {method:'POST', status:403, csrf:false});
    await request('upload', {workbook:new File(['not Excel'], 'invalid.xlsx')}, {method:'POST', status:422});
    await request('upload', {workbook:workbook(fixture, 'wrong.xls')}, {method:'POST', status:422});
    const uploaded = await request('upload', {workbook:workbook(fixture, 'Synthetic attendance test.xlsx')}, {method:'POST', status:201});
    const id = uploaded.file.id;
    ownedIds.add(id);
    assert.deepEqual(uploaded.file.sheets, ['Attendance']);
    assert.equal(uploaded.file.archivedAt, null);
    assert.equal(uploaded.file.size, readFileSync(fixture).length);
    assert.ok((await request('list')).files.some(file => file.id === id));
    const raw = (await request('workbook', {id})).workbook;
    const normalized = normalize(raw);
    assert.equal(normalized.rows.length, 2);
    assert.equal(normalized.rows[1].u, 1);
    await request('rename', {id, name:'../escape.xlsx'}, {method:'POST', status:422});
    await request('rename', {id, name:'bad\\name.xlsx'}, {method:'POST', status:422});
    const renamed = await request('rename', {id, name:'Renamed 测试.xlsx'}, {method:'POST'});
    assert.equal(renamed.file.name, 'Renamed 测试.xlsx');
    const downloadUrl = new URL(endpoint);
    downloadUrl.search = new URLSearchParams({action:'download', id});
    const downloaded = await fetch(downloadUrl, {headers:{Cookie:cookie}});
    assert.equal(downloaded.status, 200);
    assert.ok(downloaded.headers.get('content-disposition').includes(encodeURIComponent('Renamed 测试.xlsx')));
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), readFileSync(fixture));
    checks++;
    for (const path of [`storage/${id}.xlsx`, 'storage/library.json']) {
        assert.equal((await fetch(new URL(path, base))).status, 403);
        checks++;
    }
    await request('delete', {id}, {method:'POST', status:409});
    assert.ok((await request('archive', {id}, {method:'POST'})).file.archivedAt);
    await request('workbook', {id}, {status:409});
    assert.ok((await request('list')).files.some(file => file.id === id && file.archivedAt));
    assert.equal((await request('restore', {id}, {method:'POST'})).file.archivedAt, null);
    assert.equal(normalize((await request('workbook', {id})).workbook).rows.length, 2);
    const general = await request('upload', {workbook:workbook(generic, 'Synthetic general test.xlsx')}, {method:'POST', status:201});
    ownedIds.add(general.file.id);
    await request('workbook', {id:general.file.id}, {status:422});
    await request('download', {id:'../index.php'}, {status:400});
    await request('archive', {id:'0'.repeat(32)}, {method:'POST', status:404});
    await request('unknown', {}, {status:400});
    console.log(`Passed ${checks} API checks, including persistent upload, Excel parsing, rename, download, archive/restore, private storage, and invalid requests.`);
} finally {
    for (const id of ownedIds) {
        await request('archive', {id}, {method:'POST'});
        await request('delete', {id}, {method:'POST'});
        await request('download', {id}, {status:404});
    }
    rmSync(temporary, {recursive:true, force:true});
}
