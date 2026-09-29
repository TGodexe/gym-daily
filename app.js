const DB_NAME = 'formProgressDB';
const DB_VERSION = 1;
const STORE = 'entries';

let db;
let draftImages = { front: null, side: null, back: null };
let currentPose = 'front';
let allEntries = [];

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if(!d.objectStoreNames.contains(STORE)){
        d.createObjectStore(STORE,{keyPath:'date'});
      }
    };
    req.onsuccess = () => { db=req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}
function txStore(mode='readonly'){ return db.transaction(STORE,mode).objectStore(STORE); }
function getAllEntries(){
  return new Promise((resolve,reject)=>{
    const req = txStore().getAll();
    req.onsuccess=()=>resolve(req.result.sort((a,b)=>b.date.localeCompare(a.date)));
    req.onerror=()=>reject(req.error);
  });
}
function saveEntry(entry){
  return new Promise((resolve,reject)=>{
    const req=txStore('readwrite').put(entry);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}
function deleteEntry(date){
  return new Promise((resolve,reject)=>{
    const req=txStore('readwrite').delete(date);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}
function clearEntries(){
  return new Promise((resolve,reject)=>{
    const req=txStore('readwrite').clear();
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}
function blobToDataURL(blob){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
    r.readAsDataURL(blob);
  });
}
async function dataURLToBlob(dataURL){
  const res=await fetch(dataURL);
  return await res.blob();
}
function imageURL(blob){ return blob ? URL.createObjectURL(blob) : ''; }
function formatDate(dateStr){
  const d=new Date(dateStr+'T00:00:00');
  return new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric'}).format(d);
}
function shortDate(dateStr){
  const d=new Date(dateStr+'T00:00:00');
  return new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(d).toUpperCase();
}
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg;el.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>el.classList.remove('show'),2400);
}
function route(){
  const id=(location.hash||'#home').slice(1);
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===id));
  document.getElementById('nav').classList.remove('open');
  if(id==='compare') renderCompare();
  if(id==='timeline') renderTimeline();
  if(id==='home') renderHome();
}
function calculateStreak(entries){
  if(!entries.length) return 0;
  const dates=[...new Set(entries.map(e=>e.date))].sort((a,b)=>b.localeCompare(a));
  let streak=1;
  for(let i=1;i<dates.length;i++){
    const prev=new Date(dates[i-1]+'T00:00:00');
    const cur=new Date(dates[i]+'T00:00:00');
    const diff=(prev-cur)/(1000*60*60*24);
    if(diff===1) streak++; else break;
  }
  return streak;
}
function primaryPhoto(entry,pose='front'){
  return entry?.images?.[pose] || entry?.images?.front || entry?.images?.side || entry?.images?.back || null;
}
async function refresh(){
  allEntries=await getAllEntries();
  renderHome();
  populateCompareSelects();
}
function renderHome(){
  const latest=allEntries[0];
  document.getElementById('statEntries').textContent=allEntries.length;
  document.getElementById('statWeight').textContent=latest?.weight ? `${latest.weight} KG` : '—';
  document.getElementById('statWaist').textContent=latest?.waist ? `${latest.waist} CM` : '—';
  document.getElementById('statStreak').textContent=`${calculateStreak(allEntries)} DAYS`;
  const grid=document.getElementById('recentGrid');
  if(!allEntries.length){
    grid.className='photo-grid empty-wrap';
    grid.innerHTML=`<div class="empty-state"><div class="empty-icon">＋</div><h3>ยังไม่มี Progress Photo</h3><p>เริ่มจากเพิ่มรูปของวันนี้ก่อน</p><a class="btn primary" href="#add">ADD FIRST ENTRY</a></div>`;
    return;
  }
  grid.className='photo-grid';
  grid.innerHTML='';
  allEntries.slice(0,3).forEach(entry=>{
    const photo=primaryPhoto(entry);
    const card=document.createElement('article');
    card.className='photo-card';
    const url=imageURL(photo);
    card.innerHTML=`<div class="photo-card-media">${url?`<img src="${url}" alt="Progress ${entry.date}">`:''}</div>
      <div class="photo-card-body">
        <div class="photo-card-date">${shortDate(entry.date)}</div>
        <div class="photo-card-meta">${entry.weight?entry.weight+' kg':'No weight'} ${entry.waist?' · '+entry.waist+' cm waist':''}</div>
      </div>`;
    grid.appendChild(card);
  });
}
function setupUploads(){
  document.querySelectorAll('.upload-trigger').forEach(btn=>{
    btn.addEventListener('click',()=>document.getElementById(btn.dataset.input).click());
  });
  ['front','side','back'].forEach(pose=>{
    const input=document.getElementById(pose+'Input');
    const preview=document.getElementById(pose+'Preview');
    const remove=document.querySelector(`[data-remove="${pose}"]`);
    const trigger=input.parentElement.querySelector('.upload-trigger');
    input.addEventListener('change',()=>{
      const file=input.files?.[0];
      if(!file)return;
      draftImages[pose]=file;
      preview.src=URL.createObjectURL(file);
      preview.hidden=false;remove.hidden=false;trigger.style.visibility='hidden';
    });
    remove.addEventListener('click',()=>{
      draftImages[pose]=null;input.value='';preview.src='';preview.hidden=true;remove.hidden=true;trigger.style.visibility='visible';
    });
  });
}
function resetForm(){
  document.getElementById('weight').value='';
  document.getElementById('waist').value='';
  document.getElementById('bodyfat').value='';
  document.getElementById('note').value='';
  ['front','side','back'].forEach(pose=>{
    draftImages[pose]=null;
    const input=document.getElementById(pose+'Input');
    const preview=document.getElementById(pose+'Preview');
    const remove=document.querySelector(`[data-remove="${pose}"]`);
    const trigger=input.parentElement.querySelector('.upload-trigger');
    input.value='';preview.src='';preview.hidden=true;remove.hidden=true;trigger.style.visibility='visible';
  });
}
function populateCompareSelects(){
  const before=document.getElementById('beforeSelect');
  const after=document.getElementById('afterSelect');
  const prevB=before.value, prevA=after.value;
  before.innerHTML='';after.innerHTML='';
  allEntries.forEach(e=>{
    const o1=new Option(shortDate(e.date),e.date);
    const o2=new Option(shortDate(e.date),e.date);
    before.add(o1);after.add(o2);
  });
  if(allEntries.length){
    before.value = prevB && allEntries.some(e=>e.date===prevB) ? prevB : allEntries[Math.min(allEntries.length-1,1)].date;
    after.value = prevA && allEntries.some(e=>e.date===prevA) ? prevA : allEntries[0].date;
  }
}
function updateClip(value){
  const stage=document.getElementById('compareStage');
  const width=stage.clientWidth;
  stage.style.setProperty('--stage-width',width+'px');
  document.getElementById('beforeClip').style.right=(100-value)+'%';
  document.getElementById('compareHandle').style.left=value+'%';
}
function renderCompare(){
  const empty=document.getElementById('compareEmpty');
  const area=document.getElementById('compareArea');
  if(allEntries.length<2){
    empty.hidden=false;area.hidden=true;return;
  }
  empty.hidden=true;area.hidden=false;
  const b=allEntries.find(e=>e.date===document.getElementById('beforeSelect').value) || allEntries[1];
  const a=allEntries.find(e=>e.date===document.getElementById('afterSelect').value) || allEntries[0];
  const bImg=primaryPhoto(b,currentPose), aImg=primaryPhoto(a,currentPose);
  if(!bImg || !aImg){
    empty.hidden=false;area.hidden=true;
    empty.querySelector('h3').textContent=`ไม่มีรูป ${currentPose.toUpperCase()} ครบทั้ง 2 วันที่`;
    empty.querySelector('p').textContent='ลองเปลี่ยน Pose หรือเลือกวันที่อื่น';
    return;
  }
  empty.querySelector('h3').textContent='ต้องมีอย่างน้อย 2 วันที่มีรูป';
  empty.querySelector('p').textContent='เพิ่ม Progress Photo ก่อน แล้วกลับมาเปรียบเทียบได้ทันที';
  document.getElementById('beforeImage').src=imageURL(bImg);
  document.getElementById('afterImage').src=imageURL(aImg);
  document.getElementById('beforeDateLabel').textContent=shortDate(b.date);
  document.getElementById('afterDateLabel').textContent=shortDate(a.date);
  document.getElementById('beforeWeightLabel').textContent=b.weight?`${b.weight} KG`:'—';
  document.getElementById('afterWeightLabel').textContent=a.weight?`${a.weight} KG`:'—';
  document.getElementById('beforeWaistLabel').textContent=b.waist?`Waist ${b.waist} cm`:'Waist —';
  document.getElementById('afterWaistLabel').textContent=a.waist?`Waist ${a.waist} cm`:'Waist —';
  const wd=(Number(a.weight)||0)-(Number(b.weight)||0);
  const waistd=(Number(a.waist)||0)-(Number(b.waist)||0);
  document.getElementById('weightDelta').textContent=(a.weight&&b.weight)?`${wd>0?'+':''}${wd.toFixed(1)} KG`:'—';
  document.getElementById('waistDelta').textContent=(a.waist&&b.waist)?`Waist ${waistd>0?'+':''}${waistd.toFixed(1)} cm`:'Waist —';
  requestAnimationFrame(()=>updateClip(document.getElementById('compareRange').value));
}
function renderTimeline(){
  const list=document.getElementById('timelineList');
  const pose=document.getElementById('timelinePose').value;
  if(!allEntries.length){
    list.innerHTML=`<div class="empty-state"><h3>ยังไม่มีข้อมูล</h3><p>เพิ่ม Progress Photo เพื่อเริ่ม Timeline</p><a class="btn primary" href="#add">ADD ENTRY</a></div>`;
    return;
  }
  list.innerHTML='';
  allEntries.forEach(entry=>{
    const photo=primaryPhoto(entry,pose);
    const url=imageURL(photo);
    const row=document.createElement('article');
    row.className='timeline-item';
    row.innerHTML=`
      <div class="timeline-date"><strong>${shortDate(entry.date)}</strong><span>${formatDate(entry.date)}</span></div>
      <div class="timeline-thumb">${url?`<img src="${url}" alt="${pose} ${entry.date}">`:''}</div>
      <div class="timeline-data">
        <div><span>WEIGHT</span><strong>${entry.weight?entry.weight+' kg':'—'}</strong></div>
        <div><span>WAIST</span><strong>${entry.waist?entry.waist+' cm':'—'}</strong></div>
        <div><span>BODY FAT</span><strong>${entry.bodyfat?entry.bodyfat+'%':'—'}</strong></div>
      </div>
      <button class="delete-entry" data-date="${entry.date}">DELETE</button>
      ${entry.note?`<div class="timeline-note">${escapeHTML(entry.note)}</div>`:''}`;
    list.appendChild(row);
  });
  list.querySelectorAll('.delete-entry').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      if(!confirm(`ลบข้อมูลวันที่ ${btn.dataset.date} ?`))return;
      await deleteEntry(btn.dataset.date);
      await refresh();renderTimeline();toast('ลบข้อมูลแล้ว');
    });
  });
}
function escapeHTML(s=''){
  return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
async function exportBackup(){
  if(!allEntries.length){toast('ยังไม่มีข้อมูลสำหรับ Backup');return;}
  const serial=[];
  for(const e of allEntries){
    const images={};
    for(const pose of ['front','side','back']) images[pose]=e.images?.[pose]?await blobToDataURL(e.images[pose]):null;
    serial.push({...e,images});
  }
  const payload={app:'FORM Progress Tracker',version:1,exportedAt:new Date().toISOString(),entries:serial};
  const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`form-progress-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  toast('Export Backup แล้ว');
}
async function importBackup(file){
  const text=await file.text();
  const data=JSON.parse(text);
  if(!Array.isArray(data.entries)) throw new Error('Invalid backup');
  for(const raw of data.entries){
    const images={};
    for(const pose of ['front','side','back']){
      images[pose]=raw.images?.[pose]?await dataURLToBlob(raw.images[pose]):null;
    }
    await saveEntry({...raw,images});
  }
  await refresh();
  toast(`Import ${data.entries.length} entries แล้ว`);
}
document.addEventListener('DOMContentLoaded',async()=>{
  await openDB();
  const today=new Date();
  const local=new Date(today.getTime()-today.getTimezoneOffset()*60000).toISOString().slice(0,10);
  document.getElementById('entryDate').value=local;
  setupUploads();
  await refresh();
  route();

  window.addEventListener('hashchange',route);
  window.addEventListener('resize',()=>updateClip(document.getElementById('compareRange').value));
  document.getElementById('menuBtn').addEventListener('click',()=>document.getElementById('nav').classList.toggle('open'));

  document.getElementById('entryForm').addEventListener('submit',async(e)=>{
    e.preventDefault();
    const date=document.getElementById('entryDate').value;
    if(!date)return;
    if(!draftImages.front && !draftImages.side && !draftImages.back){
      document.getElementById('formMessage').textContent='กรุณาเพิ่มอย่างน้อย 1 รูป';
      return;
    }
    const existing=allEntries.find(x=>x.date===date);
    const images={
      front:draftImages.front || existing?.images?.front || null,
      side:draftImages.side || existing?.images?.side || null,
      back:draftImages.back || existing?.images?.back || null
    };
    const entry={
      date,
      weight:document.getElementById('weight').value,
      waist:document.getElementById('waist').value,
      bodyfat:document.getElementById('bodyfat').value,
      note:document.getElementById('note').value.trim(),
      images,
      updatedAt:new Date().toISOString()
    };
    await saveEntry(entry);
    document.getElementById('formMessage').textContent='บันทึกสำเร็จ';
    resetForm();
    await refresh();
    toast('บันทึก Progress แล้ว');
    setTimeout(()=>location.hash='#home',450);
  });

  document.getElementById('beforeSelect').addEventListener('change',renderCompare);
  document.getElementById('afterSelect').addEventListener('change',renderCompare);
  document.querySelectorAll('.pose-tab').forEach(btn=>btn.addEventListener('click',()=>{
    currentPose=btn.dataset.pose;
    document.querySelectorAll('.pose-tab').forEach(x=>x.classList.toggle('active',x===btn));
    renderCompare();
  }));
  document.getElementById('compareRange').addEventListener('input',e=>updateClip(e.target.value));
  document.getElementById('timelinePose').addEventListener('change',renderTimeline);

  document.getElementById('clearAllBtn').addEventListener('click',async()=>{
    if(!allEntries.length)return;
    if(!confirm('ลบข้อมูลและรูปทั้งหมดในอุปกรณ์นี้? การกระทำนี้ย้อนกลับไม่ได้'))return;
    await clearEntries();await refresh();renderTimeline();toast('ลบข้อมูลทั้งหมดแล้ว');
  });

  document.getElementById('exportBtn').addEventListener('click',exportBackup);
  document.getElementById('importBtn').addEventListener('click',()=>document.getElementById('importInput').click());
  document.getElementById('importInput').addEventListener('change',async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    try{await importBackup(file)}catch(err){console.error(err);toast('ไฟล์ Backup ไม่ถูกต้อง')}
    e.target.value='';
  });

  if('serviceWorker' in navigator && location.protocol.startsWith('http')){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }
});
