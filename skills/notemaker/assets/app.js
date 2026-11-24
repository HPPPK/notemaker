(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
  let model=JSON.parse($('notemaker-data').textContent), snapshot=clone(model);
  let active='home', editing=false, dirty=false, saving=false, fileHandle=null;
  const accents={olive:['#526146','#b8ce9d'],blue:['#365f8d','#9bc5f5'],plum:['#77547e','#d4afe0'],terracotta:['#94543d','#efb49b']};
  const tags=new Set('p div span br hr h2 h3 h4 h5 strong b em i u s del ul ol li table thead tbody tfoot tr th td caption pre code figure figcaption img a blockquote aside details summary button label input select option output svg g line polyline rect circle text'.split(' '));
  const removeWithContent=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','TEMPLATE','LINK','META','BASE','NOSCRIPT']);
  const allowedAttrs=new Set('class id title alt src href target rel colspan rowspan scope width height viewbox x y x1 x2 y1 y2 cx cy r rx points fill stroke stroke-width stroke-opacity text-anchor font-family font-size role aria-label aria-hidden type min max step value selected data-source data-lab data-lag-range data-lag-table data-freq-range data-amp-range data-freq-value data-amp-value data-wave-svg data-spectrum-svg data-freq-explain data-overlap-select data-overlap-explain'.split(' '));
  function safeLink(value){return /^(https?:\/\/|mailto:|#)/i.test(value.trim());}
  function safeImage(value){return /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value);}
  function safeBody(source){
    const template=document.createElement('template');template.innerHTML=String(source);
    function clean(parent){
      for(const node of [...parent.childNodes]){
        if(node.nodeType===Node.COMMENT_NODE){node.remove();continue;}
        if(node.nodeType!==Node.ELEMENT_NODE)continue;
        if(removeWithContent.has(node.tagName)){node.remove();continue;}
        clean(node);
        if(!tags.has(node.localName)){node.replaceWith(...node.childNodes);continue;}
        for(const attr of [...node.attributes]){
          const key=attr.name.toLowerCase();
          if(!allowedAttrs.has(key)||key.startsWith('on'))node.removeAttribute(attr.name);
        }
        if(node.hasAttribute('id'))node.id='body-'+node.id.replace(/^body-/,'').replace(/[^a-zA-Z0-9_-]/g,'');
        if(node.localName==='a'){
          if(!safeLink(node.getAttribute('href')||''))node.removeAttribute('href');
          node.setAttribute('rel','noopener noreferrer');
        }
        if(node.localName==='img'&&!safeImage(node.getAttribute('src')||'')){node.replaceWith(document.createTextNode('[图片未内嵌，已阻止外部资源]'));}
        if(node.localName==='input'&&node.getAttribute('type')!=='range')node.remove();
        if(node.localName==='button')node.setAttribute('type','button');
      }
    }
    clean(template.content);return template.innerHTML;
  }
  // Re-sanitize on every render and export; JSON remains the canonical content.
  model.topics.forEach(t=>{t.body=safeBody(t.body);});snapshot=clone(model);
  function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
  function markDirty(){if(editing){dirty=true;$('dirty-indicator').hidden=false;}}
  function appearance(){
    const settings=model.settings||{};document.body.dataset.theme=settings.theme||'light';
    const pair=accents[settings.accent]||accents.olive;
    document.documentElement.style.setProperty('--accent',pair[settings.theme==='dark'?1:0]);
    document.documentElement.style.setProperty('--size',Math.min(1.35,Math.max(.85,Number(settings.fontScale)||1)));
    document.title=model.title+' · Notemaker';
  }
  function summaryFor(id=active){return id==='summary:home'?model:model.sections.find(s=>id==='summary:'+s.id);}
  function isSummary(){return !!summaryFor();}
  function current(){return summaryFor()||model.topics.find(x=>x.id===active)||model.sections.find(x=>x.id===active)||model;}
  function isTopic(){return model.topics.some(x=>x.id===active);}
  function readingOrder(){return ['home',...model.sections.flatMap(s=>[s.id,...model.topics.filter(t=>t.section===s.id).map(t=>t.id),'summary:'+s.id]),'summary:home'];}
  function routeTitle(id){if(id==='home')return '笔记介绍';if(id==='summary:home')return '整份笔记总结';const section=summaryFor(id);return section?section.title+' · 总结':model.topics.find(t=>t.id===id)?.title||model.sections.find(s=>s.id===id)?.title||'';}
  function pageNavigation(){
    const order=readingOrder(),index=order.indexOf(active),previous=order[index-1],next=order[index+1];
    return `<nav class="page-nav">${previous?`<a href="#${esc(previous)}">← 上一节：${esc(routeTitle(previous))}</a>`:'<span></span>'}${next?`<a href="#${esc(next)}">下一节：${esc(routeTitle(next))} →</a>`:'<a href="#home">回到笔记介绍 →</a>'}</nav>`;
  }
  function collect(){
    if(!editing)return;
    model.title=$('document-title').value.trim()||model.title;model.subtitle=$('document-subtitle').value;
    model.settings={theme:$('theme').value,accent:$('accent').value,fontScale:Number($('font-scale').value)};
    const item=current();if(item!==model&&!isSummary())item.title=$('page-title').value.trim()||item.title;
    if(!isSummary())item.intro=$('page-intro').value.trim()||item.intro;
    if(isSummary())item.summary=$('page-summary').value.trim()||item.summary;
    if(isTopic()&&$('editable-body')){
      for(const code of $('editable-body').querySelectorAll('code[data-source]')){
        const copy=code.cloneNode(true);copy.querySelectorAll('.line-no').forEach(x=>x.remove());
        const lines=copy.querySelectorAll('.code-line');code.dataset.source=lines.length?[...lines].map(x=>x.textContent).join('\n'):copy.textContent;
      }
      item.body=safeBody($('editable-body').innerHTML);
    }
  }
  function fields(){
    $('editor-panel').hidden=!editing;$('edit').hidden=editing;
    for(const id of ['cancel','save','save-as','export'])$(id).hidden=!editing;
    $('dirty-indicator').hidden=!dirty;
    if(!editing)return;
    $('document-title').value=model.title;$('document-subtitle').value=model.subtitle||'';
    $('theme').value=model.settings?.theme||'light';$('accent').value=model.settings?.accent||'olive';
    const scale=String(model.settings?.fontScale||1);if(![...$('font-scale').options].some(option=>option.value===scale))$('font-scale').add(new Option(scale+'×',scale));$('font-scale').value=scale;
    const item=current();$('page-title').value=item.title;$('page-title-label').hidden=active==='home'||isSummary();
    $('page-intro').value=item.intro||'';$('page-summary').value=item.summary||'';
    $('page-intro-label').hidden=isSummary();$('summary-label').hidden=!isSummary();$('delete-topic').hidden=!isTopic();$('image-label').hidden=!isTopic();
  }
  function nav(){
    const q=$('search').value.trim().toLocaleLowerCase();
    let html=`<a href="#home" ${active==='home'?'aria-current="page"':''}>主题总览 · Introduction</a>`;
    for(const section of model.sections){
      const topics=model.topics.filter(t=>t.section===section.id&&(!q||(t.title+' '+t.intro+' '+t.body.replace(/<[^>]+>/g,' ')).toLocaleLowerCase().includes(q)));
      if(q&&!topics.length&&!(section.title+' '+section.intro+' '+section.summary).toLocaleLowerCase().includes(q))continue;
      const summaryId='summary:'+section.id;
      html+=`<div class="nav-section"><a href="#${esc(section.id)}">${esc(section.title)}</a><div class="nav-children"><a class="nav-intro" href="#${esc(section.id)}" ${active===section.id?'aria-current="page"':''}>介绍 · Introduction</a>${topics.map(t=>`<a class="nav-topic" href="#${esc(t.id)}" ${active===t.id?'aria-current="page"':''}>${esc(t.title)}</a>`).join('')}<a class="nav-summary" href="#${esc(summaryId)}" ${active===summaryId?'aria-current="page"':''}>总结 · Summary</a></div></div>`;
    }
    html+=`<a class="nav-document-summary" href="#summary:home" ${active==='summary:home'?'aria-current="page"':''}>整份笔记总结</a>`;
    $('navigation').innerHTML=html;
  }
  function sourceList(ids){
    const sources=(model.sources||[]).filter(s=>!ids||ids.includes(s.id));
    if(!sources.length)return '';
    return `<aside class="sources"><strong>来源与依据 / Sources</strong><ul>${sources.map(s=>`<li>${safeLink(s.url||'')?`<a href="${esc(s.url)}" target="_blank">${esc(s.label)}</a>`:esc(s.label)}${s.kind?' · '+esc(s.kind):''}</li>`).join('')}</ul></aside>`;
  }
  function row(item,index){return `<a class="map-row" href="#${esc(item.id)}"><span class="map-number">${String(index+1).padStart(2,'0')}</span><span><span class="map-title">${esc(item.title)}</span><span class="map-description">${esc(item.intro)}</span></span><span>↗</span></a>`;}
  function render(){
    appearance();nav();fields();const item=current();
    if(active==='home'){
      $('breadcrumb').textContent='主题总览 / Introduction';
      $('content').innerHTML=`<p class="eyebrow">THE BIG PICTURE / 笔记介绍</p><h1>${esc(model.title)}</h1><p class="subtitle">${esc(model.subtitle||'')}</p><p class="lead">${esc(model.intro)}</p><div class="count-line"><span>${model.sections.length} 个大章节</span><span>${model.topics.length} 个专题</span><span>介绍 → 内容小节 → 板块总结</span></div><h2>内容地图</h2><p>每个板块先介绍背景和范围，再展开小节，最后用专门的小节总结。</p><div class="content-map">${model.sections.map(row).join('')}${row({id:'summary:home',title:'整份笔记总结',intro:'读完各板块后，回看整份笔记的联系、结论与待确认问题。'},model.sections.length)}</div>${sourceList()}${pageNavigation()}`;
    }else if(isSummary()){
      const whole=item===model;const title=whole?'整份笔记总结':item.title+' · 总结';
      $('breadcrumb').textContent=title;
      $('content').innerHTML=`<p class="eyebrow">${whole?'NOTE SUMMARY / 整份笔记总结':'SECTION SUMMARY / 板块最后一节'}</p><h1>${esc(title)}</h1><section class="overview-summary"><h2>${whole?'整份笔记的联系与结论':'这一板块的总结'}</h2><p>${esc(item.summary)}</p></section>${pageNavigation()}`;
    }else if(isTopic()){
      const section=model.sections.find(s=>s.id===item.section);$('breadcrumb').textContent=section.title+' / '+item.title;
      $('content').innerHTML=`<p class="eyebrow">${esc(section.title)}</p><h1>${esc(item.title)}</h1><p class="lead">${esc(item.intro)}</p><div id="editable-body" class="note-body" ${editing?'contenteditable="true" spellcheck="false"':''}>${safeBody(item.body)}</div>${sourceList(item.sources||[])}${pageNavigation()}`;
      window.NotemakerWidgets?.init($('content'));
      if(editing)$('editable-body').addEventListener('input',markDirty);
    }else{
      $('breadcrumb').textContent=item.title+' / 大主题概览';
      const topics=model.topics.filter(t=>t.section===item.id);
      $('content').innerHTML=`<p class="eyebrow">SECTION OVERVIEW / 板块介绍</p><h1>${esc(item.title)}</h1><p class="lead">${esc(item.intro)}</p><h2>这一板块如何展开</h2><div class="content-map">${topics.map(row).join('')}${row({id:'summary:'+item.id,title:'总结',intro:'在内容小节之后，梳理这一板块的联系、结论与待确认事项。'},topics.length)}</div>${pageNavigation()}`;
    }
  }
  function route(){
    if(saving)return;
    collect();let id;try{id=decodeURIComponent(location.hash.slice(1))||'home';}catch{id='home';}
    active=model.topics.some(t=>t.id===id)||model.sections.some(s=>s.id===id)||summaryFor(id)?id:'home';
    render();$('sidebar').classList.remove('open');$('shade').hidden=true;$('menu').setAttribute('aria-expanded','false');
    window.scrollTo(0,0);
  }
  function filename(){return model.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').slice(0,90)+'.html';}
  function serialized(candidate){
    const copy=document.documentElement.cloneNode(true);
    copy.querySelector('#notemaker-data').textContent=JSON.stringify(candidate).replaceAll('<','\\u003c');
    for(const id of ['content','navigation'])copy.querySelector('#'+id).replaceChildren();
    copy.querySelector('#editor-panel').hidden=true;copy.querySelector('#image-dialog').removeAttribute('open');copy.querySelector('#large-image').removeAttribute('src');
    copy.querySelector('#large-caption').textContent='';copy.querySelector('#sidebar').classList.remove('open');copy.querySelector('#shade').hidden=true;
    for(const input of copy.querySelectorAll('#editor-panel input,#editor-panel textarea')){input.removeAttribute('value');input.textContent='';}
    for(const field of copy.querySelectorAll('[disabled]'))field.removeAttribute('disabled');
    return '<!doctype html>\n'+copy.outerHTML;
  }
  function freeze(value){
    saving=value;for(const el of document.querySelectorAll('button,input,select,textarea'))el.disabled=value;
    if($('editable-body'))$('editable-body').setAttribute('contenteditable',String(!value&&editing));
  }
  function candidate(){collect();const result=clone(model);result.meta={...(result.meta||{}),exportedAt:new Date().toISOString(),generator:'notemaker/1.1'};return result;}
  async function nativeSave(saveAs=false){
    if(saving)return;
    if(typeof window.showSaveFilePicker!=='function'||!window.isSecureContext){download();return;}
    const value=candidate();const text=serialized(value);freeze(true);let stream;
    try{
      const target=(!saveAs&&fileHandle)||await window.showSaveFilePicker({suggestedName:filename(),types:[{description:'Notemaker HTML',accept:{'text/html':['.html']}}]});
      stream=await target.createWritable();await stream.write(text);await stream.close();stream=null;
      fileHandle=target;model=value;snapshot=clone(model);dirty=false;editing=false;
      status('已写入本地文件：'+target.name+'。写入已完成，可重新打开核对。');render();
    }catch(error){
      if(stream){try{await stream.abort();}catch{}}
      status(error.name==='AbortError'?'保存已取消；修改仍在当前页面，尚未保存。':'没有保存成功：'+(error.message||error.name)+'。修改仍在；可重试或下载 HTML 副本。',true);
    }finally{freeze(false);}
  }
  function download(){
    if(saving)return;
    const value=candidate(),text=serialized(value),url=URL.createObjectURL(new Blob([text],{type:'text/html;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download=filename();anchor.hidden=true;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    status('已请求下载完整 HTML；请重新打开下载的文件核对。当前页面无法确认下载完成，也没有覆盖原文件。');
    // A download cannot prove disk completion; preserve the current unsaved flag.
  }
  $('edit').addEventListener('click',()=>{snapshot=clone(model);editing=true;dirty=false;render();status('编辑模式：修改正文或上方设置，完成后点击 Save；刷新前请保存。');});
  $('cancel').addEventListener('click',()=>{model=clone(snapshot);editing=false;dirty=false;render();status('已放弃本轮修改；本地文件未改动。');});
  $('apply').addEventListener('click',()=>{collect();render();status('预览已更新，尚未保存到文件。');});
  $('save').addEventListener('click',()=>nativeSave(false));$('save-as').addEventListener('click',()=>nativeSave(true));$('export').addEventListener('click',download);
  $('editor-panel').addEventListener('input',event=>{if(event.target.id!=='image-input')markDirty();});
  $('theme').addEventListener('change',()=>{collect();appearance();});$('accent').addEventListener('change',()=>{collect();appearance();});$('font-scale').addEventListener('change',()=>{collect();appearance();});
  $('add-section').addEventListener('click',()=>{
    collect();const id='section-'+Date.now().toString(36);model.sections.push({id,title:'新的大主题',intro:'请介绍这一主题的背景、范围和读者要回答的问题。',summary:'请总结这一主题的重要结论与尚不明确之处。'});markDirty();location.hash=id;
  });
  $('add-topic').addEventListener('click',()=>{
    collect();const section=isTopic()?current().section:current()===model?model.sections[0].id:current().id;
    const id='topic-'+Date.now().toString(36);model.topics.push({id,section,title:'新的小节',intro:'这一节要回答什么问题？',body:'<h2>先说清楚</h2><p>点击这里开始写下你的解释、记录或观察。</p>',sources:[]});markDirty();location.hash=id;
  });
  $('delete-topic').addEventListener('click',()=>{
    if(!isTopic()||model.topics.length<=1){status('至少保留一个小节。',true);return;}
    if(!confirm('删除当前小节？点击 Save 前仍可通过取消恢复。'))return;
    const section=current().section;model.topics=model.topics.filter(t=>t.id!==active);markDirty();active='home';render();location.hash=section;
  });
  $('image-input').addEventListener('change',async event=>{
    const file=event.target.files?.[0],target=active;if(!file||!editing||!isTopic())return;
    if(file.size>10*1024*1024){status('图片大于 10 MiB，请先压缩。',true);return;}
    const bytes=new Uint8Array(await file.arrayBuffer());
    const mime=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':String.fromCharCode(...bytes.slice(0,6)).match(/^GIF8[79]a$/)?'image/gif':String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'?'image/webp':null;
    if(!mime){status('这不是支持的 PNG/JPEG/GIF/WebP 图片。',true);return;}
    if(!editing||saving||target!==active){status('页面已切换，请在目标小节重新选择图片。');return;}
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.slice(i,i+8192));
    const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');
    img.src='data:'+mime+';base64,'+btoa(binary);img.alt=file.name;caption.textContent='图片：'+file.name+'（点击编辑图注与来源）';figure.append(img,caption);$('editable-body').append(figure);markDirty();event.target.value='';
  });
  $('content').addEventListener('paste',event=>{
    if(!editing||!event.target.closest('[contenteditable=true]'))return;
    event.preventDefault();const text=event.clipboardData.getData('text/plain'),selection=window.getSelection();
    if(selection.rangeCount){const range=selection.getRangeAt(0);range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);markDirty();}
  });
  $('content').addEventListener('click',async event=>{
    const img=event.target.closest('img');
    if(img&&!editing){$('large-image').src=img.src;$('large-image').alt=img.alt;$('large-caption').textContent=img.closest('figure')?.querySelector('figcaption')?.textContent||img.alt;$('image-dialog').showModal();}
    const button=event.target.closest('.copy-code');
    if(button){const code=button.closest('.codebox')?.querySelector('code'),text=code?.dataset.source||code?.textContent||'';try{await navigator.clipboard.writeText(text);status('代码已复制。');}catch{status('浏览器未允许复制，请选中代码手动复制。',true);}}
  });
  $('close-image').addEventListener('click',()=>$('image-dialog').close());
  $('image-dialog').addEventListener('close',()=>$('large-image').removeAttribute('src'));
  $('search').addEventListener('input',nav);$('print').addEventListener('click',()=>{collect();window.print();});
  $('menu').addEventListener('click',()=>{const open=$('sidebar').classList.toggle('open');$('shade').hidden=!open;$('menu').setAttribute('aria-expanded',String(open));});
  $('shade').addEventListener('click',()=>{$('sidebar').classList.remove('open');$('shade').hidden=true;$('menu').setAttribute('aria-expanded','false');});
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();if(editing)nativeSave(event.shiftKey);}if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('search').focus();}});
  document.addEventListener('click',event=>{if(saving&&event.target.closest('a'))event.preventDefault();});
  window.addEventListener('beforeunload',event=>{if(dirty||saving){event.preventDefault();event.returnValue='';}});
  window.addEventListener('hashchange',route);
  window.Notemaker=Object.freeze({getModel:()=>{collect();return clone(model);},exportHTML:()=>serialized(candidate())});
  route();
})();
