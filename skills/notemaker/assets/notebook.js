/* Editable cells; reading HTML and code never executes user code. */
window.NotemakerCells=(()=>{
  let sanitize,escape,onDirty,afterRender,item,key,editing;
  const id=()=>('cell-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)));
  function fromHTML(html){
    const template=document.createElement('template');template.innerHTML=sanitize(html||'');
    return [...template.content.childNodes].filter(node=>node.nodeType===1||node.textContent.trim()).map(node=>({id:id(),type:'html',source:node.nodeType===1?node.outerHTML:'<p>'+escape(node.textContent)+'</p>'}));
  }
  function fromText(text){return String(text||'').split(/\n\s*\n/).filter(s=>s.trim()).map(s=>({id:id(),type:'html',source:'<p>'+escape(s.trim()).replaceAll('\n','<br>')+'</p>'}));}
  function ensure(target,kind){
    const name=kind==='body'?'cells':kind+'Cells';
    if(!Array.isArray(target[name]))target[name]=kind==='body'?fromHTML(target.body):fromText(target[kind]);
    target[name].forEach(cell=>{cell.id=cell.id||id();if(cell.type!=='code')cell.source=sanitize(cell.source);});
    if(kind==='body')delete target.body;
    return name;
  }
  function text(cells){return cells.map(cell=>{if(cell.type==='code')return cell.source;const div=document.createElement('div');div.innerHTML=sanitize(cell.source);return div.textContent.trim();}).join('\n\n');}
  function collect(){
    if(!item||!editing)return;
    for(const root of document.querySelectorAll('.note-cell[data-cell-id]')){
      const cell=item[key].find(c=>c.id===root.dataset.cellId);if(!cell)continue;
      const source=root.querySelector('.cell-source');
      if(source)cell.source=cell.type==='code'?source.value:sanitize(source.value);
      else{const content=root.querySelector('.cell-content');if(content)cell.source=sanitize(content.innerHTML);}
    }
    if(key!=='cells')item[key==='introCells'?'intro':'summary']=text(item[key]);
  }
  function markup(){
    const cells=item[key];
    return cells.map((cell,index)=>`<section class="note-cell" data-cell-id="${escape(cell.id)}">${editing?`<div class="cell-toolbar"><span class="cell-index">${String(index+1).padStart(2,'0')}</span><select class="cell-type" aria-label="单元格类型"><option value="html" ${cell.type==='html'?'selected':''}>文字 / 图表</option><option value="code" ${cell.type==='code'?'selected':''}>代码（不执行）</option></select><button data-cell-action="above">上方插入</button><button data-cell-action="below">下方插入</button><button data-cell-action="up" ${index===0?'disabled':''} aria-label="上移单元格">↑</button><button data-cell-action="down" ${index===cells.length-1?'disabled':''} aria-label="下移单元格">↓</button><button data-cell-action="duplicate">复制</button>${cell.type==='html'?'<button data-cell-action="source">HTML 源码</button>':''}<button data-cell-action="delete">删除</button></div>`:''}${cell.type==='code'?(editing?`<textarea class="cell-source code-editor" aria-label="代码单元格" spellcheck="false">${escape(cell.source)}</textarea>`:`<pre><code>${escape(cell.source)}</code></pre>`):`<div class="cell-content" ${editing?'contenteditable="true" spellcheck="false"':''}>${sanitize(cell.source)}</div>`}</section>`).join('')+(editing?'<div class="cell-add-row"><button data-cell-add="html">＋ 文字 / 图表单元格</button><button data-cell-add="code">＋ 代码单元格</button><span>图片可通过“插入本地图片”添加；Ctrl/Cmd+S 保存。</span></div>':'');
  }
  function redraw(){const root=document.getElementById('notebook-cells');if(root){root.innerHTML=markup();afterRender?.(root);}}
  function add(type='html',at=item[key].length,source){collect();item[key].splice(at,0,{id:id(),type,source:source??(type==='code'?'':'<p>在这里写下你的内容。</p>')});onDirty();redraw();}
  function bind(root){
    root.addEventListener('input',event=>{if(event.target.closest('#notebook-cells'))onDirty();});
    root.addEventListener('change',event=>{
      if(!event.target.matches('.cell-type'))return;
      collect();const cell=item[key].find(c=>c.id===event.target.closest('.note-cell').dataset.cellId),type=event.target.value;
      const raw=cell.type==='html'?text([cell]):cell.source;cell.type=type;cell.source=type==='code'?raw:'<p>'+escape(raw).replaceAll('\n','<br>')+'</p>';onDirty();redraw();
    });
    root.addEventListener('click',event=>{
      const addButton=event.target.closest('[data-cell-add]');if(addButton){add(addButton.dataset.cellAdd);return;}
      const button=event.target.closest('[data-cell-action]');if(!button||!editing)return;
      collect();const cellRoot=button.closest('.note-cell'),index=item[key].findIndex(c=>c.id===cellRoot.dataset.cellId),cell=item[key][index],action=button.dataset.cellAction;
      if(action==='above'||action==='below'){add('html',index+(action==='below'?1:0));return;}
      if(action==='source'){
        const content=cellRoot.querySelector('.cell-content');
        if(content){const textarea=document.createElement('textarea');textarea.className='cell-source html-editor';textarea.setAttribute('aria-label','HTML 单元格源码');textarea.value=cell.source;content.replaceWith(textarea);button.textContent='返回可视编辑';}
        else redraw();
        return;
      }
      if(action==='delete')item[key].splice(index,1);
      if(action==='duplicate')item[key].splice(index+1,0,{...cell,id:id()});
      if(action==='up'&&index>0)[item[key][index-1],item[key][index]]=[item[key][index],item[key][index-1]];
      if(action==='down'&&index<item[key].length-1)[item[key][index],item[key][index+1]]=[item[key][index+1],item[key][index]];
      onDirty();redraw();
    });
  }
  return {
    configure(options){sanitize=options.sanitize;escape=options.escape;onDirty=options.onDirty;afterRender=options.afterRender;},
    upgrade(model){for(const target of [model,...model.sections]){ensure(target,'intro');ensure(target,'summary');}for(const topic of model.topics)ensure(topic,'body');model.version=2;},
    mount(target,kind,editable){item=target;key=ensure(target,kind);editing=editable;return '<div id="notebook-cells" class="notebook-cells">'+markup()+'</div>';},
    collect,bind,text,appendHTML(source){add('html',item[key].length,source);},
    freeze(value){for(const el of document.querySelectorAll('.cell-content[contenteditable]'))el.setAttribute('contenteditable',String(!value&&editing));},
    searchText(target){return text(target.cells||[]);}
  };
})();
