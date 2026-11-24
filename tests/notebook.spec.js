const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');const path=require('node:path');const os=require('node:os');
const {spawn}=require('node:child_process');const {pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..');let bound;
async function launch(source){
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'notemaker-test-'));
  const note=path.join(directory,'bound-note.html');await fs.copyFile(source,note);
  const process=spawn('python',['-u','skills/notemaker/scripts/serve_note.py',note,'--no-browser'],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
  const info=await new Promise((resolve,reject)=>{let data='';const timer=setTimeout(()=>reject(new Error('Server startup timed out')),10000);process.on('error',reject);process.stdout.on('data',chunk=>{data+=chunk;const line=data.split('\n').find(s=>s.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});process.on('exit',code=>{if(code)reject(new Error('Server exited '+code));});});
  return {directory,note,process,...info};
}
async function navigate(page,id){await page.locator('#navigation a[href="#'+id+'"]').first().click();await expect.poll(()=>page.locator('#navigation [aria-current=page]').first().getAttribute('href')).toBe('#'+id);}
async function edit(page,id='course-example'){await navigate(page,id);await page.locator('#edit').click();}
async function save(page){await page.locator('#save').click();await expect(page.locator('#status')).toContainText('已保存到当前源文件');}
async function dataFromFile(file){const html=await fs.readFile(file,'utf8');return JSON.parse(html.match(/<script id="notemaker-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);}
test.beforeEach(async({page})=>{bound=await launch(path.join(ROOT,'examples/general-note.html'));await page.goto(bound.url);});
test.afterEach(async()=>{bound?.process.kill();});

test('section introduction precedes details and summary is its final subsection',async({page})=>{
  for(const id of ['course','meeting','reading']){
    await navigate(page,id);await expect(page.locator('.overview-summary')).toHaveCount(0);await expect(page.locator('#notebook-cells')).toBeVisible();
    const model=await page.evaluate(()=>Notemaker.getModel());const last=model.topics.filter(t=>t.section===id).at(-1);
    await navigate(page,last.id);await expect(page.locator('.page-nav a').last()).toHaveAttribute('href','#summary:'+id);
    await navigate(page,'summary:'+id);await expect(page.locator('.overview-summary')).toBeVisible();
  }
  await navigate(page,'home');await page.screenshot({path:path.join(ROOT,'docs/demo-preview.png'),fullPage:true});
});

test('Edit enables cell add, code editing, duplication, movement and deletion; Save writes same source',async({page})=>{
  await expect(page.locator('.cell-toolbar')).toHaveCount(0);const original=await fs.readFile(bound.note,'utf8');
  let downloads=0;page.on('download',()=>downloads++);await page.evaluate(()=>{window.showSaveFilePicker=()=>{throw Error('A picker must never be called');};});
  await edit(page);await page.locator('[data-cell-add=code]').click();
  const code=page.locator('.note-cell').last();await code.locator('.cell-source').fill('print("saved in the original file")');
  await code.locator('[data-cell-action=duplicate]').click();await page.locator('.note-cell').last().locator('[data-cell-action=up]').click();
  await page.locator('.note-cell').last().locator('[data-cell-action=delete]').click();
  await save(page);expect(downloads).toBe(0);expect(await fs.readFile(bound.note,'utf8')).not.toBe(original);
  expect((await dataFromFile(bound.note)).topics.find(t=>t.id==='course-example').cells.at(-1).source).toContain('saved in the original file');
  const backupDir=path.join(bound.directory,'.notemaker-backups','bound-note');expect((await fs.readdir(backupDir)).length).toBe(1);
  await page.reload();await expect(page.locator('#notebook-cells code').last()).toContainText('saved in the original file');await expect(page.locator('.cell-toolbar')).toHaveCount(0);
});

test('Cancel restores a deleted cell and leaves disk unchanged',async({page})=>{
  const original=await fs.readFile(bound.note,'utf8');await edit(page);const count=await page.locator('.note-cell').count();
  await page.locator('.note-cell').first().locator('[data-cell-action=delete]').click();await expect(page.locator('.note-cell')).toHaveCount(count-1);
  await page.locator('#cancel').click();await expect(page.locator('.note-cell')).toHaveCount(count);expect(await fs.readFile(bound.note,'utf8')).toBe(original);
});

test('introductions and closing summaries are editable cells and persist through a real save',async({page})=>{
  for(const id of ['course','summary:course','home','summary:home']){
    await edit(page,id);await page.locator('.cell-content').first().fill('A substantial edited paragraph at '+id);
    await save(page);await page.reload();await expect(page.locator('#notebook-cells')).toContainText('A substantial edited paragraph at '+id);
  }
});

test('all cells can be removed and a new cell inserted without forcing a save location',async({page})=>{
  await edit(page);while(await page.locator('.note-cell').count())await page.locator('.note-cell').first().locator('[data-cell-action=delete]').click();
  await save(page);await page.reload();await expect(page.locator('.note-cell')).toHaveCount(0);
  await page.locator('#edit').click();await page.locator('[data-cell-add=html]').click();await page.locator('.cell-content').fill('Start again');await save(page);
});

test('failed server response preserves the draft and retry succeeds',async({page})=>{
  await edit(page);await page.locator('.cell-content').first().fill('Do not lose this draft');
  await page.route('**/api/save',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Test write failure'})}));
  await page.locator('#save').click();await expect(page.locator('#status')).toContainText('没有保存成功');await expect(page.locator('#dirty-indicator')).toBeVisible();
  await expect(page.locator('.cell-content').first()).toContainText('Do not lose this draft');await page.unroute('**/api/save');await save(page);
});

test('two windows cannot silently overwrite a newer source version',async({page,browser})=>{
  const second=await browser.newPage();await second.goto(bound.url);await edit(page);await edit(second);
  await page.locator('.cell-content').first().fill('Revision A');await save(page);const first=await fs.readFile(bound.note,'utf8');
  await second.locator('.cell-content').first().fill('Revision B');await second.locator('#save').click();
  await expect(second.locator('#status')).toContainText('源文件已被其他窗口');await expect(second.locator('#dirty-indicator')).toBeVisible();expect(await fs.readFile(bound.note,'utf8')).toBe(first);await second.close();
});

test('external source changes cause a conflict rather than an overwrite',async({page})=>{
  await edit(page);await page.locator('.cell-content').first().fill('Draft');const external=(await fs.readFile(bound.note,'utf8'))+'\n<!-- external change -->';await fs.writeFile(bound.note,external);
  await page.locator('#save').click();await expect(page.locator('#status')).toContainText('源文件已被其他窗口');expect(await fs.readFile(bound.note,'utf8')).toBe(external);
});

test('explicit export produces a standalone file with no local-session secret',async({page,browser})=>{
  await edit(page);await page.locator('[data-cell-add=code]').click();await page.locator('.cell-source').last().fill('persisted_code = True');
  const pending=page.waitForEvent('download');await page.locator('#export').click();const file=path.join(bound.directory,'export.html');await (await pending).saveAs(file);
  const text=await fs.readFile(file,'utf8');expect(text).not.toContain(new URL(bound.url).pathname.split('/')[1]);
  const reopened=await browser.newPage();await reopened.goto(pathToFileURL(file).href+'#course-example');await expect(reopened.locator('#notebook-cells')).toContainText('persisted_code = True');
  await reopened.locator('#edit').click();await reopened.locator('#save').click();await expect(reopened.locator('#status')).toContainText('配套');await reopened.close();
});

test('inserted image and customized appearance survive writing and reopening the original file',async({page})=>{
  await edit(page);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=','base64');
  await page.locator('#image-input').setInputFiles({name:'test.png',mimeType:'image/png',buffer:png});await expect(page.locator('#editable-body img')).toHaveCount(1);
  await page.locator('.edit-settings > summary').click();await page.locator('#theme').selectOption('dark');await page.locator('#accent').selectOption('blue');await save(page);await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-theme','dark');expect(await page.locator('#editable-body img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
});

test('new topics remain before summaries and sections/topics can be reordered',async({page})=>{
  await edit(page,'course');await page.locator('#add-topic').click();await expect(page.locator('#editable-body')).toBeVisible();
  await expect(page.locator('.page-nav a').last()).toHaveAttribute('href','#summary:course');
  await page.locator('#move-page-up').click();await save(page);const model=await dataFromFile(bound.note);expect(model.topics.filter(t=>t.section==='course').at(-2).title).toBe('新的小节');
});

test('local server rejects missing tokens, foreign origins and unbound paths',async({page})=>{
  const session=await page.evaluate(()=>JSON.parse(document.getElementById('notemaker-session').textContent));const model=await page.evaluate(()=>Notemaker.getModel());const source=await fs.readFile(bound.note,'utf8');
  const post=async(headers,endpoint=session.endpoint)=>page.request.post(new URL(endpoint,bound.url).href,{headers,data:{model,revision:session.revision}});
  expect((await post({'Origin':new URL(bound.url).origin})).status()).toBe(403);
  expect((await post({'Origin':'https://example.org','X-Notemaker-Token':session.token})).status()).toBe(403);
  expect((await post({'Origin':new URL(bound.url).origin,'X-Notemaker-Token':session.token,'Host':'example.org'})).status()).toBe(403);
  expect((await post({'Origin':new URL(bound.url).origin,'X-Notemaker-Token':session.token},'/not-bound/api/save')).status()).toBe(404);
  expect(await fs.readFile(bound.note,'utf8')).toBe(source);
});

test('unsafe HTML in a cell cannot execute or load a tracking image',async({page})=>{
  await edit(page);await page.locator('.note-cell').first().locator('[data-cell-action=source]').click();
  await page.locator('.html-editor').fill('<p>Safe text</p><script>window.bad=true</script><img src="https://example.org/tracker" onerror="window.bad=true"><a href="javascript:alert(1)">Unsafe link</a>');
  await save(page);await page.reload();expect(await page.evaluate(()=>window.bad)).toBeUndefined();await expect(page.locator('#editable-body script,#editable-body img')).toHaveCount(0);await expect(page.getByText('Unsafe link')).not.toHaveAttribute('href',/javascript/);
});

test('mobile reading and editing fit the viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.locator('#menu').click();await navigate(page,'course');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await page.locator('#edit').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('revised-skill source cases retain mapped details and save real cell edits to their bound files',async({page})=>{
  const manifest=path.join(ROOT,'private-preview/skill-evaluation-manifest.json');let cases;
  try{cases=JSON.parse(await fs.readFile(manifest,'utf8'));}catch{test.skip(true,'External source cases are not redistributed with the public test suite.');return;}
  for(const entry of cases){
    const live=await launch(entry.html);
    try{
      await page.goto(live.url);const model=await page.evaluate(()=>Notemaker.getModel());
      expect(entry.old_note_unchanged).toBe(true);expect(entry.audit.coverage_errors).toEqual([]);
      const coverage=JSON.parse(await fs.readFile(entry.coverage,'utf8'));
      for(const unit of coverage.units){if(unit.status==='covered')for(const id of unit.topics)expect(model.topics.some(t=>t.id===id)).toBe(true);else expect(unit.reason).toBeTruthy();}
      for(const section of model.sections){await navigate(page,section.id);await expect(page.locator('.note-cell')).not.toHaveCount(0);const last=model.topics.filter(t=>t.section===section.id).at(-1);await navigate(page,last.id);await expect(page.locator('.page-nav a').last()).toHaveAttribute('href','#summary:'+section.id);await navigate(page,'summary:'+section.id);await expect(page.locator('.overview-summary')).toBeVisible();}
      for(const query of entry.reviewQueries){await navigate(page,query.topic);for(const detail of query.contains)await expect(page.locator('#notebook-cells')).toContainText(detail);}
      await navigate(page,entry.reviewQueries[0].topic);await page.screenshot({path:path.join(ROOT,'private-preview/'+entry.name+'-body-preview.png'),fullPage:true});
      await page.locator('#edit').click();await page.locator('[data-cell-add=code]').click();await page.locator('.cell-source').last().fill('# Persisted test for '+entry.name);await save(page);await page.reload();await expect(page.locator('#notebook-cells')).toContainText('Persisted test for '+entry.name);
    }finally{live.process.kill();}
  }
});

test('technical source notes render original visuals and retain math and solved examples after Save',async({page})=>{
  let entries;try{entries=JSON.parse(await fs.readFile(path.join(ROOT,'private-preview/technical-evaluation-manifest.json'),'utf8'));}catch{test.skip(true,'Local technical source cases are not redistributed.');return;}
  for(const entry of entries){
    const live=await launch(entry.html);
    try{
      await page.goto(live.url);const original=await page.evaluate(()=>Notemaker.getModel());
      expect(entry.coverage_errors).toEqual([]);let images=0;
      for(const topic of original.topics){await navigate(page,topic.id);images+=await page.locator('#editable-body img').count();await page.waitForFunction(()=>[...document.querySelectorAll('#editable-body img')].every(img=>img.complete&&img.naturalWidth>0));}
      expect(images).toBeGreaterThanOrEqual(entry.visuals.length);
      for(const query of entry.reviewQueries){await navigate(page,query.topic);for(const detail of query.contains)await expect(page.locator('#notebook-cells')).toContainText(detail);}
      await navigate(page,entry.reviewQueries[0].topic);
      await page.screenshot({path:path.join(ROOT,'private-preview/'+entry.name+'-body.png'),fullPage:true});
      await page.locator('#edit').click();await page.locator('[data-cell-add=html]').click();await page.locator('.cell-content').last().fill('A reader annotation after the original explanation');await save(page);await page.reload();
      await expect(page.locator('#notebook-cells')).toContainText('A reader annotation');
      const persisted=await dataFromFile(live.note);
      const imageCount=m=>JSON.stringify(m).split('data:image/').length-1;
      expect(imageCount(persisted)).toBe(imageCount(original));
      await navigate(page,'summary:'+original.sections[0].id);await expect(page.locator('.overview-summary')).toBeVisible();
    }finally{live.process.kill();}
  }
});

test('enriched user note retains all figures and supports real in-place cell editing',async({page})=>{
  let report;try{report=JSON.parse(await fs.readFile(path.join(ROOT,'private-preview/timeseries-enrichment-report.json'),'utf8'));}catch{test.skip(true,'Private user note is not distributed.');return;}
  const live=await launch(report.html);
  try{
    await page.goto(live.url);const model=await page.evaluate(()=>Notemaker.getModel());let images=0;
    expect(model.sections.length).toBe(6);expect(model.topics.length).toBe(26);
    for(const section of model.sections){expect(section.intro.length).toBeGreaterThan(400);expect(section.summary.length).toBeGreaterThan(550);}
    for(const topic of model.topics){await navigate(page,topic.id);images+=await page.locator('#editable-body img').count();await page.waitForFunction(()=>[...document.querySelectorAll('#editable-body img')].every(img=>img.complete&&img.naturalWidth>0));}
    expect(images).toBe(16);await navigate(page,'day02');await page.screenshot({path:path.join(ROOT,'private-preview/intro-v2.png'),fullPage:true});
    await page.locator('#edit').click();await page.locator('[data-cell-add=code]').click();await page.locator('.cell-source').last().fill('# A real saved cell');
    await page.screenshot({path:path.join(ROOT,'private-preview/editor-v2.png'),fullPage:false});await save(page);await page.reload();await expect(page.locator('#notebook-cells')).toContainText('A real saved cell');
    await navigate(page,'summary:day02');await page.screenshot({path:path.join(ROOT,'private-preview/summary-v2.png'),fullPage:true});
  }finally{live.process.kill();}
});
