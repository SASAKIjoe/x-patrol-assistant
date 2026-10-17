// Touch dragging is limited to the handle so ordinary row gestures still scroll.
export function setupReorder({root,onCommit,onDragChange=()=>{},onError=()=>{}}){
  const tablet=matchMedia('(min-width:600px)');
  let gesture=null,pending=false,frame=0,suppressClickUntil=0;
  const rows=()=>[...root.children].filter(row=>row.dataset.personId);
  const ids=()=>rows().map(row=>row.dataset.personId);
  const same=(a,b)=>a.length===b.length&&a.every((id,i)=>id===b[i]);
  function focusHandle(id){const row=rows().find(row=>row.dataset.personId===id);row?.querySelector('.reorder-handle')?.focus({preventScroll:true});}
  function finish({rollback=false}={}){
    const current=gesture;if(!current)return null;gesture=null;
    cancelAnimationFrame(frame);frame=0;
    if(rollback&&current.nodes.every(node=>node.parentElement===root))root.append(...current.nodes);
    current.row.classList.remove('is-drag-source');current.handle.removeAttribute('aria-pressed');
    current.ghost?.remove();root.classList.remove('is-reordering');
    try{if(root.hasPointerCapture(current.pointerId))root.releasePointerCapture(current.pointerId);}catch{}
    if(current.started){suppressClickUntil=performance.now()+800;onDragChange(false);}
    return current;
  }
  function cancel(){finish({rollback:true});}
  async function commit(originalIds,orderedIds,sourceId){
    if(same(originalIds,orderedIds))return;
    pending=true;root.setAttribute('aria-busy','true');
    try{const restoreFocus=await onCommit(originalIds,orderedIds,sourceId);if(restoreFocus!==false)focusHandle(sourceId);}
    catch(error){if(onError(error)!==false)focusHandle(sourceId);}
    finally{pending=false;root.removeAttribute('aria-busy');}
  }
  function placeAt(y){
    const current=gesture;if(!current?.started)return;
    const others=rows().filter(row=>row!==current.row),next=others.find(row=>{const box=row.getBoundingClientRect();return y<box.top+box.height/2;});
    if(next)root.insertBefore(current.row,next);else root.append(current.row);
  }
  function paint(){
    const current=gesture;if(!current?.started)return;
    current.ghost.style.top=(current.y-current.grabY)+'px';
    const listBox=root.getBoundingClientRect(),top=Math.max(0,document.querySelector('.tabs')?.getBoundingClientRect().bottom||0),edge=72;
    let speed=0;
    if(current.y<top+edge&&listBox.top<top)speed=-Math.ceil(Math.min(1,(top+edge-current.y)/edge)*16);
    else if(current.y>innerHeight-edge&&listBox.bottom>innerHeight)speed=Math.ceil(Math.min(1,(current.y-innerHeight+edge)/edge)*16);
    if(speed)window.scrollBy(0,speed);
    placeAt(current.y);frame=requestAnimationFrame(paint);
  }
  function start(current){
    current.started=true;suppressClickUntil=performance.now()+800;onDragChange(true);
    const box=current.row.getBoundingClientRect(),ghost=document.createElement('div');
    ghost.className='reorder-ghost';ghost.setAttribute('aria-hidden','true');
    const summary=current.row.querySelector('summary').cloneNode(true);summary.removeAttribute('aria-label');ghost.append(summary);
    ghost.style.width=box.width+'px';ghost.style.left=box.left+'px';ghost.style.top=box.top+'px';document.body.append(ghost);
    current.ghost=ghost;current.grabY=Math.min(Math.max(0,current.startY-box.top),56);
    current.row.classList.add('is-drag-source');current.handle.setAttribute('aria-pressed','true');root.classList.add('is-reordering');paint();
  }
  root.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('.reorder-handle');
    if(!handle||!root.contains(handle)||!tablet.matches||pending||!event.isPrimary||event.button!==0)return;
    cancel();const row=handle.closest('[data-person-id]');if(!row||rows().length<2)return;
    event.preventDefault();handle.focus({preventScroll:true});
    gesture={row,handle,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,y:event.clientY,nodes:[...root.children],originalIds:ids(),started:false};
    try{root.setPointerCapture(event.pointerId);}catch{}
  });
  document.addEventListener('pointermove',event=>{
    const current=gesture;if(!current||current.pointerId!==event.pointerId)return;
    if(!tablet.matches){cancel();return;}
    event.preventDefault();current.y=event.clientY;
    if(!current.started&&Math.hypot(event.clientX-current.startX,event.clientY-current.startY)>=8)start(current);
    if(current.started)placeAt(current.y);
  },{passive:false});
  document.addEventListener('pointerup',event=>{
    const current=gesture;if(!current||current.pointerId!==event.pointerId)return;
    const bounds=root.getBoundingClientRect();
    if(current.started&&(event.clientX<bounds.left||event.clientX>bounds.right)){event.preventDefault();finish({rollback:true});return;}
    if(current.started){event.preventDefault();suppressClickUntil=performance.now()+800;placeAt(event.clientY);}
    const orderedIds=ids(),done=finish();
    if(done.started)void commit(done.originalIds,orderedIds,done.row.dataset.personId);
  });
  document.addEventListener('pointercancel',event=>{if(gesture?.pointerId===event.pointerId)cancel();});
  root.addEventListener('lostpointercapture',event=>{if(gesture?.pointerId===event.pointerId)cancel();});
  document.addEventListener('pointerdown',event=>{if(gesture&&gesture.pointerId!==event.pointerId)cancel();},true);
  root.addEventListener('click',event=>{
    if(event.target.closest('.reorder-handle')){event.preventDefault();event.stopPropagation();}
    else if(performance.now()<suppressClickUntil){event.preventDefault();event.stopPropagation();}
  },true);
  root.addEventListener('keydown',event=>{
    if(event.key==='Escape'){cancel();return;}
    const handle=event.target.closest('.reorder-handle');
    if(!handle||!tablet.matches||pending||!event.altKey||!['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();cancel();const originalIds=ids(),sourceId=handle.closest('[data-person-id]').dataset.personId,index=originalIds.indexOf(sourceId),destination=index+(event.key==='ArrowUp'?-1:1);
    if(destination<0||destination>=originalIds.length)return;
    const orderedIds=[...originalIds];[orderedIds[index],orderedIds[destination]]=[orderedIds[destination],orderedIds[index]];
    void commit(originalIds,orderedIds,sourceId);
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape')cancel();});
  window.addEventListener('pagehide',cancel);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')cancel();});
  tablet.addEventListener('change',cancel);
  return {cancel,get active(){return !!gesture?.started;}};
}
