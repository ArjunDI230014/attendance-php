import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {normalize} from '../model.mjs';

const base = process.env.DASHBOARD_URL || 'http://localhost/attendance_php/';
const php = process.env.PHP_BINARY || 'C:\\xampp\\php\\php.exe';
const temporary = mkdtempSync(join(tmpdir(), 'attendance-pages-test-'));
const fixture = join(temporary, 'attendance.xlsx');
const generic = join(temporary, 'generic.xlsx');
const testName = `Native form test ${Date.now()}.xlsx`;
const additionalIds = new Set();
let cookie = '', csrf = '', id = null, checks = 0;

async function request(path, {form, status = 200, method = form ? 'POST' : 'GET', headers = {}} = {}) {
    const response = await fetch(new URL(path, base), {method, body:form, headers:{Cookie:cookie, ...headers}, redirect:'manual'});
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await response.text();
    assert.equal(response.status, status, `${path}: ${text.slice(0, 600)}`);
    checks++;
    return {text, location:response.headers.get('location')};
}
function fields(values) {
    const form = new FormData();
    for (const [key, value] of Object.entries(values)) form.set(key, value);
    return form;
}
async function action(name, extra = {}, status = 303) {
    return request('file-action.php', {form:fields({action:name, id, csrf, ...extra}), status});
}
function bootstrap(html) {
    const match = html.match(/window\.SFSN_WORKBOOK=(.*?);window\.SFSN_LOAD_ERROR=/);
    assert.ok(match, 'Dashboard workbook bootstrap missing');
    return JSON.parse(match[1]);
}

try {
    execFileSync(php, [fileURLToPath(new URL('./create-workbook.php', import.meta.url)), fixture]);
    execFileSync(php, [fileURLToPath(new URL('./create-workbook.php', import.meta.url)), generic, 'generic']);
    const upload = await request('upload-workbook.php');
    csrf = upload.text.match(/name="csrf" value="([a-f0-9]{64})"/)?.[1];
    assert.ok(csrf, 'Native form CSRF token missing');
    assert.match(upload.text, /method="post" action="upload-workbook.php" enctype="multipart\/form-data"/);
    assert.match(upload.text, /type="file" id="workbook" name="workbook"/);
    assert.match(upload.text, /src="upload-form.mjs"/);
    assert.match(upload.text, /upload starts automatically/);
    const empty = await request('index.php');
    assert.equal(bootstrap(empty.text), null);
    assert.match(empty.text, /href="people.php"/);
    assert.match(empty.text, /href="files.php"/);
    const legacy = await request('data.js', {status:403});
    assert.ok(legacy);
    await request('upload-workbook.php', {form:fields({csrf,workbook:new File(['bad'], 'invalid.xlsx')}), status:422});
    await request('upload-workbook.php', {form:fields({csrf:'wrong',workbook:new File([readFileSync(fixture)], testName)}), status:403});
    const saved = await request('upload-workbook.php', {form:fields({csrf,workbook:new File([readFileSync(fixture)], testName)}), status:303});
    assert.equal(saved.location, 'index.php');
    const listed = JSON.parse((await request('file-library.php')).text);
    const file = listed.files.find(file => file.name === testName);
    assert.ok(file, 'Native form did not save workbook');
    id = file.id;
    assert.equal(normalize(bootstrap((await request('index.php')).text)).rows.length, 2, 'Uploaded attendance data must load without a second selection');
    const files = await request('files.php');
    assert.ok(files.text.includes(testName));
    assert.doesNotMatch(files.text, /<script/);
    const jsonHeaders = {Accept:'application/json'};
    const automatic = JSON.parse((await request('upload-workbook.php', {form:fields({csrf,workbook:new File([readFileSync(fixture)], `Automatic ${testName}`)}), headers:jsonHeaders, status:201})).text);
    additionalIds.add(automatic.file.id);
    assert.equal(automatic.redirect, 'index.php');
    assert.equal(bootstrap((await request('index.php')).text).source, `Automatic ${testName}`);
    const stored = JSON.parse((await request('upload-workbook.php', {form:fields({csrf,mode:'save',workbook:new File([readFileSync(generic)], `Stored ${testName}`)}), headers:jsonHeaders, status:201})).text);
    additionalIds.add(stored.file.id);
    assert.equal(stored.redirect, 'files.php');
    assert.equal(bootstrap((await request('index.php')).text).source, `Automatic ${testName}`, 'Save-only uploads must preserve the current dashboard');
    const incompatible = JSON.parse((await request('upload-workbook.php', {form:fields({csrf,workbook:new File([readFileSync(generic)], `Incompatible ${testName}`)}), headers:jsonHeaders, status:201})).text);
    additionalIds.add(incompatible.file.id);
    assert.equal(incompatible.redirect, 'files.php');
    assert.match((await request('files.php')).text, /The file was saved, but could not be loaded/);
    assert.equal(bootstrap((await request('index.php')).text).source, `Automatic ${testName}`);
    const invalid = JSON.parse((await request('upload-workbook.php', {form:fields({csrf,workbook:new File(['bad'], 'invalid.xlsx')}), headers:jsonHeaders, status:422})).text);
    assert.ok(invalid.error);
    await action('use', {csrf:'wrong'}, 403);
    assert.equal((await action('use')).location, 'index.php');
    assert.equal(normalize(bootstrap((await request('index.php')).text)).rows.length, 2);
    const staff = await request('people.php');
    assert.match(staff.text, /window.SFSN_PAGE="people"/);
    assert.equal(normalize(bootstrap(staff.text)).rows.length, 2);
    assert.equal(normalize(bootstrap((await request('index.php')).text)).rows.length, 2);
    await action('unload');
    assert.equal(bootstrap((await request('index.php')).text), null);
    await action('use');
    await request(`edit-workbook.php?id=${id}&action=rename`);
    await action('rename', {name:'../invalid.xlsx'}, 422);
    const renamed = `Renamed ${testName}`;
    await action('rename', {name:renamed});
    assert.equal(bootstrap((await request('people.php')).text).source, renamed);
    const searched = await request(`files.php?q=${encodeURIComponent(renamed)}&sort=name`);
    assert.ok(searched.text.includes(renamed));
    await request(`edit-workbook.php?id=${id}&action=delete`, {status:409});
    await action('delete', {}, 409);
    await action('archive');
    assert.equal(bootstrap((await request('index.php')).text), null);
    const archive = await request('archive.php');
    assert.ok(archive.text.includes(renamed));
    assert.match(archive.text, /Restore/);
    await action('use', {}, 409);
    const confirm = await request(`edit-workbook.php?id=${id}&action=delete`);
    assert.match(confirm.text, /This cannot be undone/);
    assert.match(confirm.text, /Delete permanently/);
    await action('restore', {return:'archive'});
    await action('use');
    assert.equal(normalize(bootstrap((await request('index.php')).text)).rows.length, 2);
    await action('archive');
    await action('delete', {return:'archive'});
    const deletedId = id;
    id = null;
    await request(`file-library.php?action=download&id=${deletedId}`, {status:404});
    await request('file-action.php', {status:405});
    console.log(`Passed ${checks} native-page checks: multipart upload, redirects, validation, persistent selection, rename, archive/restore, confirmation, and deletion without JavaScript.`);
} finally {
    if (id) {
        await action('archive');
        await action('delete');
    }
    for (const extra of additionalIds) {
        await action('archive', {id:extra});
        await action('delete', {id:extra});
    }
    rmSync(temporary, {recursive:true, force:true});
}
