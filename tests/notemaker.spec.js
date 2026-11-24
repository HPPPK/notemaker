const {test,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'..');
const URL='http://127.0.0.1:8873/examples/general-note.html';
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1ioAAAAASUVORK5CYII=','base64');
async function open(page){await page.goto(URL);await expect(page.locator('#content h1')).toBeVisible();}
async function topic(page){await page.goto(URL+'#course-example');await expect(page.locator('#editable-body')).toBeVisible();}
async function nativeMock(page,mode='ok'){
  await page.addInitScript(mode=>{
    window.__writes=[];window.__pickers=0;window.__closes=0;window.__mode=mode;
    window.showSaveFilePicker=async()=>{
      window.__pickers++;
      if(window.__mode==='cancel')throw new DOMException('cancelled','AbortError');
      if(window.__mode==='permission')throw new DOMException('denied','NotAllowedError');
      return {name:'verified-note.html',createWritable:async()=>({
        write:async text=>{if(window.__mode==='write')throw new Error('write failed');window.__writes.push(text);},
        close:async()=>{window.__closes++;if(window.__mode==='close')throw new Error('close failed');},
        abort:async()=>{}
      })};
    };
  },mode);
}

test('opens on substantive overview, then section introduction and summary',async({page})=>{
  await open(page);await expect(page.getByRole('heading',{name:'先把整件事说清楚'})).toBeVisible();
  await expect(page.locator('.overview-summary')).toContainText('共同问题');await expect(page.locator('#editable-body')).toHaveCount(0);
  await page.locator('#content a[href="#meeting"]').click();await expect(page.getByRole('heading',{name:'这一部分的总结'})).toBeVisible();
  await expect(page.locator('#content')).toContainText('想法不等于已通过的决定');
  await page.goto(URL);await page.screenshot({path:path.join(ROOT,'docs/demo-preview.png'),fullPage:true});
});

test('edit preview remains unsaved and cancel restores content and theme',async({page})=>{
  await open(page);const original=await page.locator('#content h1').textContent();await page.locator('#edit').click();
  await page.locator('#document-title').fill('Modified overview');await page.locator('#page-summary').fill('A new big-topic synthesis.');await page.locator('#theme').selectOption('dark');
  await page.locator('#apply').click();await expect(page.locator('#content h1')).toHaveText('Modified overview');await expect(page.locator('#dirty-indicator')).toBeVisible();
  await page.locator('#cancel').click();await expect(page.locator('#content h1')).toHaveText(original);await expect(page.locator('body')).toHaveAttribute('data-theme','light');
});

test('search finds body content and section pages are not bypassed',async({page})=>{
  await open(page);await page.locator('#search').fill('负责人');await expect(page.locator('#navigation')).toContainText('待办写清楚交付物');await expect(page.locator('#navigation')).not.toContainText('把还没懂的地方留下来');
});

test('unsaved changes request a close warning; cancel clears the warning',async({page})=>{
  await open(page);await page.locator('#edit').click();await page.locator('#document-title').fill('Unsaved title');
  const prevented=()=>{const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);return event.defaultPrevented;};
  expect(await page.evaluate(prevented)).toBe(true);await page.locator('#cancel').click();expect(await page.evaluate(prevented)).toBe(false);
});

test('real HTML download reopens with edited title, summary, code, image and settings',async({page,browser})=>{
  await page.addInitScript(()=>{window.showSaveFilePicker=undefined;});await topic(page);await page.locator('#edit').click();
  await page.locator('#navigation a[href="#home"]').click();await expect(page.locator('#content > .eyebrow')).toContainText('THE BIG PICTURE');await page.locator('#page-intro').fill('Persisted overall introduction');await page.locator('#page-summary').fill('Persisted overall synthesis');
  await page.locator('#navigation a[href="#course"]').click();await expect(page.locator('#content > .eyebrow')).toContainText('SECTION OVERVIEW');await page.locator('#page-intro').fill('Persisted section introduction');await page.locator('#page-summary').fill('Persisted section summary');
  await page.locator('#navigation a[href="#course-example"]').click();await expect(page.locator('#editable-body')).toBeVisible();
  await page.locator('#document-title').fill('Round trip saved note');await page.locator('#page-intro').fill('Updated topic introduction');
  await page.locator('#editable-body').evaluate(el=>{el.querySelector('p').textContent='Round-trip body text';el.querySelector('code').textContent='print("persisted code")';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#image-input').setInputFiles({name:'round-trip.png',mimeType:'image/png',buffer:PNG});await expect(page.locator('#editable-body img')).toHaveCount(1);
  await page.locator('#accent').selectOption('blue');await page.locator('#theme').selectOption('dark');await page.locator('#font-scale').selectOption('1.15');
  const downloadEvent=page.waitForEvent('download');await page.locator('#save').click();const download=await downloadEvent;
  const target=path.join(ROOT,'artifacts/round-trip.html');await download.saveAs(target);
  await expect(page.locator('#status')).toContainText('已请求下载');await expect(page.locator('#dirty-indicator')).toBeVisible();
  const bytes=await fs.readFile(target,'utf8');expect(bytes).toContain('Round trip saved note');expect(bytes).toContain('persisted code');expect(bytes).toContain('data:image/png;base64,');expect(bytes).not.toContain('localStorage');
  const reopened=await browser.newPage();await reopened.goto(pathToFileURL(target).href+'#course-example');
  await expect(reopened.locator('#editable-body')).toContainText('Round-trip body text');await expect(reopened.locator('code')).toContainText('persisted code');
  expect(await reopened.locator('#editable-body img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await expect(reopened.locator('body')).toHaveAttribute('data-theme','dark');await expect(reopened.locator('.lead')).toHaveText('Updated topic introduction');
  await reopened.locator('#edit').click();await expect(reopened.locator('#accent')).toHaveValue('blue');await expect(reopened.locator('#font-scale')).toHaveValue('1.15');
  await reopened.locator('#navigation a[href="#home"]').click();await expect(reopened.locator('.lead')).toHaveText('Persisted overall introduction');await expect(reopened.locator('.overview-summary')).toContainText('Persisted overall synthesis');
  await reopened.locator('#navigation a[href="#course"]').click();await expect(reopened.locator('.lead')).toHaveText('Persisted section introduction');await expect(reopened.locator('.overview-summary')).toContainText('Persisted section summary');
  await reopened.close();
});

test('native handle marks saved only after close and can save twice / save as',async({page})=>{
  await nativeMock(page);await topic(page);await page.locator('#edit').click();await page.locator('#page-title').fill('Native saved topic');await page.locator('#save').click();
  await expect(page.locator('#status')).toContainText('已写入本地文件');await expect(page.locator('#dirty-indicator')).toBeHidden();
  expect(await page.evaluate(()=>({writes:__writes.length,closes:__closes,pickers:__pickers}))).toEqual({writes:1,closes:1,pickers:1});
  await page.locator('#edit').click();await page.locator('#page-title').fill('Second revision');await page.locator('#save').click();
  expect(await page.evaluate(()=>({closes:__closes,pickers:__pickers}))).toEqual({closes:2,pickers:1});
  await page.locator('#edit').click();await page.locator('#save-as').click();expect(await page.evaluate(()=>__pickers)).toBe(2);
  expect(await page.evaluate(()=>__writes.at(-1))).toContain('Second revision');
});

for(const mode of ['cancel','permission','write','close'])test('preserves draft on native '+mode,async({page})=>{
  await nativeMock(page,mode);await topic(page);await page.locator('#edit').click();await page.locator('#page-title').fill('Do not lose this draft');await page.locator('#save').click();
  await expect(page.locator('#status')).toContainText(mode==='cancel'?'保存已取消':'没有保存成功');await expect(page.locator('#dirty-indicator')).toBeVisible();await expect(page.locator('#page-title')).toHaveValue('Do not lose this draft');
  await page.evaluate(()=>{window.__mode='ok';});await page.locator('#save').click();await expect(page.locator('#status')).toContainText('已写入本地文件');
});

test('editing is frozen until a pending close has actually completed',async({page})=>{
  await nativeMock(page);await topic(page);await page.evaluate(()=>{window.showSaveFilePicker=async()=>({name:'delayed.html',createWritable:async()=>({write:async()=>{},close:()=>new Promise(resolve=>{window.__completeClose=resolve;}),abort:async()=>{}})});});
  await page.locator('#edit').click();await page.locator('#page-title').fill('Pending revision');await page.locator('#save').click();
  await expect(page.locator('#save')).toBeDisabled();await expect(page.locator('#editable-body')).toHaveAttribute('contenteditable','false');await expect(page.locator('#status')).not.toContainText('已写入本地文件');
  await page.evaluate(()=>window.__completeClose());await expect(page.locator('#status')).toContainText('已写入本地文件');
});

test('new section/topic and deleting a topic preserve the overall introduction',async({page})=>{
  await open(page);const intro=await page.locator('.lead').textContent();await page.locator('#edit').click();await page.locator('#add-section').click();
  await expect(page.locator('#content h1')).toHaveText('新的大主题');await page.locator('#page-title').fill('Added section');await page.locator('#apply').click();await page.locator('#add-topic').click();
  await expect(page.locator('#editable-body')).toBeVisible();page.once('dialog',dialog=>dialog.accept());await page.locator('#delete-topic').click();
  await page.locator('#navigation a[href="#home"]').click();await expect(page.locator('.lead')).toHaveText(intro);
});

test('unsafe source HTML cannot execute or load remote media',async({page})=>{
  const file=await fs.readFile(path.join(ROOT,'examples/general-note.html'),'utf8');
  const match=file.match(/<script id="notemaker-data" type="application\/json">([\s\S]*?)<\/script>/),data=JSON.parse(match[1]);
  data.topics[0].body+='<script>window.__unsafe=true</script><img src="https://example.org/tracker.png" onerror="window.__unsafe=true"><a href="javascript:alert(1)">bad link</a><iframe srcdoc="x"></iframe>';
  const changed=file.replace(match[1],JSON.stringify(data).replaceAll('<','\\u003c'));
  const remote=[];page.on('request',request=>{if(!request.url().startsWith('http://127.0.0.1:8873'))remote.push(request.url());});
  await page.route('**/unsafe.html',route=>route.fulfill({contentType:'text/html',body:changed}));await page.goto('http://127.0.0.1:8873/unsafe.html#course-example');
  expect(await page.evaluate(()=>window.__unsafe)).toBeUndefined();await expect(page.locator('#editable-body script,#editable-body iframe')).toHaveCount(0);await expect(page.getByText('bad link')).not.toHaveAttribute('href',/javascript/);expect(remote).toEqual([]);
});

test('mobile directory works without horizontal page overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});await open(page);await page.locator('#menu').click();await expect(page.locator('#sidebar')).toHaveClass(/open/);
  await page.locator('#navigation a[href="#course"]').click();await expect(page.locator('#sidebar')).not.toHaveClass(/open/);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('private converted note retains every topic, embedded figure and classroom widget',async({page})=>{
  const name='时间序列学习笔记_Notemaker.html',target=path.join(ROOT,'private-preview',name);
  try{await fs.access(target);}catch{test.skip(true,'Private user note is intentionally not published.');return;}
  await page.goto('http://127.0.0.1:8873/private-preview/'+encodeURIComponent(name));
  await expect(page.locator('#content')).toContainText('整条路线是');await expect(page.locator('#navigation .nav-section')).toHaveCount(6);await expect(page.locator('.nav-children a')).toHaveCount(26);
  await page.screenshot({path:path.join(ROOT,'private-preview/overview.png'),fullPage:true});
  const topics=await page.evaluate(()=>Notemaker.getModel().topics.map(t=>t.id));let images=0;
  for(const id of topics){await page.locator('#navigation a[href="#'+id+'"]').click();await expect(page.locator('#editable-body')).toBeVisible();const imgs=page.locator('#editable-body img');images+=await imgs.count();for(const img of await imgs.all())expect(await img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);}
  expect(images).toBe(16);
  for(const [id,selector] of [['day04-lag','[data-lag-range]'],['day05-time-frequency','[data-freq-range]'],['day06-welch','[data-overlap-select]']]){
    await page.locator('#navigation a[href="#'+id+'"]').click();
    const widget=page.locator(selector);await expect(widget).toBeVisible();if(selector.includes('select')){await widget.selectOption('0.75');await expect(page.locator('[data-overlap-explain]')).toContainText('5.25');}else{await widget.fill('2');if(selector.includes('lag'))await expect(page.locator('[data-lag-table]')).toContainText('6 对');else await expect(page.locator('[data-freq-explain]')).toContainText('12.0');}
  }
  await page.locator('#navigation a[href="#day02"]').click();await page.screenshot({path:path.join(ROOT,'private-preview/day02-overview.png'),fullPage:true});
  await page.locator('#navigation a[href="#day02-rolling"]').click();await page.screenshot({path:path.join(ROOT,'private-preview/rolling.png'),fullPage:true});
});
