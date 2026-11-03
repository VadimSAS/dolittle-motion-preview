/* Source module; rebuild_site.py embeds it before site/site.js. Intake defaults off. */
(function(root){
  'use strict';
  const KEY='dd_pending_lead_v1';
  const POLICY='demo-2026-09-27';
  function endpoint(location, configured){
    const local=['localhost','127.0.0.1'].includes(location.hostname);
    const preview=location.origin==='https://dolittle24.ru'&&
      /^\/dr-dolittle-preview\/(?:[^?#]*)$/.test(location.pathname||'');
    if(!local&&!preview)return null;
    // A query parameter never activates hosted intake. Only an explicit release configuration can.
    if(preview&&configured!=='https://hooks.dolittle24.ru/api/leads')return null;
    if(!configured&&!new URLSearchParams(location.search).has('buffer_demo'))return null;
    let url;
    try{url=new URL(configured||'/api/leads',location.origin);}catch{return null;}
    if((local&&url.origin!==location.origin)||url.pathname!=='/api/leads'||url.search||url.hash)return null;
    return url.href;
  }
  function touch(raw,now,path){
    const bounded=(value,max)=>typeof value==='string'&&value.length?Array.from(value).slice(0,max).join(''):null;
    const safePath=value=>typeof value==='string'&&/^\/(?!\/)[^?#\s\\]*$/.test(value)?bounded(value,512):path;
    return {source:bounded(raw?.utm_source,256)||'unknown',medium:bounded(raw?.utm_medium,256),
      campaign:bounded(raw?.utm_campaign,256),content:bounded(raw?.utm_content,256),term:bounded(raw?.utm_term,256),
      landing_path:safePath(raw?.landing_page),referrer_host:bounded(raw?.referrer_host,253),
      ym_client_id:null,captured_at:raw?.captured_at||now};
  }
  function payload(fields,attribution,context,path,crypto,now){
    if(!crypto?.randomUUID)throw new Error('secure_context_required');
    return {lead_id:crypto.randomUUID(),created_at:now,consent_at:now,consent:true,privacy_policy_version:POLICY,
      ...fields,context,page:path,first_touch:touch(attribution.first_touch,now,path),last_touch:touch(attribution.last_touch,now,path)};
  }
  function client({storage,fetch,endpoint,setTimer=setTimeout,clearTimer=clearTimeout}){
    let pending=null,ack=null,busy=false,retryAt=0;
    try{const saved=storage.getItem(KEY);if(saved){pending=JSON.parse(saved);if(!pending?.lead_id)pending=null;}}catch{}
    return {
      pending:()=>pending,
      async submit(candidate){
        if(busy)return {state:'busy'};
        if(Date.now()<retryAt)return {state:'limited'};
        const request=pending||candidate;
        if(ack&&ack.lead_id===request.lead_id)return {state:'accepted',lead:ack};
        // Persist exact request BEFORE sending. Never send if retry state cannot be saved.
        try{storage.setItem(KEY,JSON.stringify(request));}catch{return {state:'storage_unavailable'};}
        pending=request;busy=true;
        const controller=new AbortController();
        const timeout=setTimer(()=>controller.abort(),10000);
        try{
          const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify(request),credentials:'omit',signal:controller.signal,redirect:'error'});
          if(response.status===200||response.status===202){
            const body=await response.json();
            if(!['accepted','duplicate'].includes(body.status)||!(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i).test(body.buffer_id||''))throw new Error('invalid_ack');
            ack=request;pending=null;
            try{storage.removeItem(KEY);}catch{}
            return {state:'accepted',lead:request};
          }
          if(response.status===429){
            const seconds=Number(response.headers.get('Retry-After'));
            retryAt=Date.now()+Math.min(3600,Math.max(1,Number.isFinite(seconds)&&seconds>0?seconds:600))*1000;
            return {state:'limited'};
          }
          if([400,409,413,415,422].includes(response.status)){
            pending=null;try{storage.removeItem(KEY);}catch{}
            return {state:response.status===409?'conflict':'invalid'};
          }
          return {state:'unavailable'};
        }catch{return {state:'unavailable'};}
        finally{clearTimer(timeout);busy=false;}
      }
    };
  }
  const api={endpoint,touch,payload,client,KEY,POLICY};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.DDLeadBuffer=api;
})(typeof window==='undefined'?globalThis:window);

const METRIKA_ID=113015299;
const ATTRIBUTION_KEYS=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid'];
const safeStorage={
  get(key){try{return window.localStorage.getItem(key)}catch{return null}},
  set(key,value){try{window.localStorage.setItem(key,value)}catch{}},
};

function readTouch(key){
  try{return JSON.parse(safeStorage.get(key)||'null')}catch{return null}
}

function currentTouch(){
  const query=new URLSearchParams(location.search);
  const referrerHost=(()=>{try{return document.referrer?new URL(document.referrer).hostname:''}catch{return ''}})();
  const touch={
    captured_at:new Date().toISOString(),
    landing_page:location.pathname,
    referrer_host:referrerHost,
  };
  ATTRIBUTION_KEYS.forEach(key=>{const value=query.get(key);if(value)touch[key]=value});
  return touch;
}

const touch=currentTouch();
const hasCampaign=ATTRIBUTION_KEYS.some(key=>touch[key]);
const isExternalReferrer=Boolean(touch.referrer_host&&touch.referrer_host!==location.hostname);
if(!readTouch('dd_first_touch'))safeStorage.set('dd_first_touch',JSON.stringify(touch));
if(hasCampaign||isExternalReferrer||!readTouch('dd_last_touch'))safeStorage.set('dd_last_touch',JSON.stringify(touch));

function attributionSnapshot(){
  return {first_touch:readTouch('dd_first_touch'),last_touch:readTouch('dd_last_touch')};
}

function elementLocation(element){
  if(element.closest('.topbar'))return 'header';
  if(element.closest('.footer'))return 'footer';
  if(element.closest('.booking-modal'))return 'booking_modal';
  if(element.closest('.package-card'))return 'package_card';
  if(element.closest('.doctor-card,.doctor-feature'))return 'doctor_card';
  return location.pathname;
}

window.dataLayer=window.dataLayer||[];
window.ddTrack=(goal,params={})=>{
  const payload={event:goal,page_path:location.pathname,...params};
  window.dataLayer.push(payload);
  if(window.DD_ANALYTICS_ENABLED&&typeof window.ym==='function'){
    window.ym(METRIKA_ID,'reachGoal',goal,payload);
  }
};

const modal=document.querySelector('#booking-modal');
const bookingForm=modal?.querySelector('.modal-shell');
const closeModal=()=>modal?.close();
let bookingContext='';

document.querySelectorAll('.js-book').forEach(button=>button.addEventListener('click',()=>{
  if(!modal)return;
  const context=button.dataset.context||'';
  bookingContext=context;
  if(button.closest('.package-card'))window.ddTrack('package_booking',{context,location:elementLocation(button)});
  if(context.startsWith('Запись к врачу:')||button.closest('.doctor-card,.doctor-feature'))window.ddTrack('doctor_booking',{context,location:elementLocation(button)});
  if(context&&!leadClient?.pending()){
    const select=modal.querySelector('[name="service"]');
    const direct=[...select.options].find(option=>option.value===context);
    if(direct){select.value=context}else{modal.querySelector('[name="message"]').value=`Интересует: ${context}`}
  }
  modal.showModal();
  modal.querySelector('.modal-close')?.focus({preventScroll:true});
}));

modal?.querySelector('.modal-close')?.addEventListener('click',closeModal);
modal?.addEventListener('click',event=>{
  if(event.target===modal)closeModal();
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&modal?.open)closeModal();
});

const leadEndpoint=window.DDLeadBuffer.endpoint(location,window.DD_LEAD_ENDPOINT);
const leadClient=leadEndpoint?window.DDLeadBuffer.client({storage:{
  getItem:key=>window.sessionStorage.getItem(key),
  setItem:(key,value)=>window.sessionStorage.setItem(key,value),
  removeItem:key=>window.sessionStorage.removeItem(key),
},fetch:window.fetch.bind(window),endpoint:leadEndpoint}):null;
let lastLead=null,lastFields=null,leadBusy=false;
const formNote=bookingForm?.querySelector('.form-note');
if(formNote){formNote.setAttribute('role','status');formNote.setAttribute('aria-live','polite');}
function lockLeadFields(locked){
  bookingForm?.querySelectorAll('input,select,textarea').forEach(field=>{field.disabled=locked});
}
function restorePendingLead(){
  const saved=leadClient?.pending();
  if(!saved||!bookingForm)return;
  for(const key of ['name','phone','pet','message'])bookingForm.elements[key].value=saved[key]||'';
  const option=[...bookingForm.elements.service.options].find(item=>item.dataset.code===saved.service);
  if(option)bookingForm.elements.service.value=option.value;
  bookingForm.elements.consent.checked=true;
  lockLeadFields(true);
  formNote.textContent='Ответ по предыдущей заявке не получен. Повторите отправку: номер обращения сохранён. WhatsApp доступен.';
}
restorePendingLead();
bookingForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(leadBusy||!bookingForm.reportValidity())return;
  const fields={name:bookingForm.elements.name.value.trim(),phone:bookingForm.elements.phone.value.trim(),
    pet:bookingForm.elements.pet.value.trim(),message:bookingForm.elements.message.value.trim(),
    service:bookingForm.elements.service.selectedOptions[0]?.dataset.code||'unknown'};
  const signature=JSON.stringify(fields);
  let lead=leadClient?.pending()||(signature===lastFields?lastLead:null);
  if(!lead){
    try{lead=window.DDLeadBuffer.payload(fields,attributionSnapshot(),'booking_modal',location.pathname,window.crypto,new Date().toISOString());}
    catch{formNote.textContent='Для отправки формы откройте сайт по HTTPS. Можно связаться через WhatsApp или по телефону.';return;}
  }
  lastFields=signature;lastLead=lead;
  const serviceName=[...bookingForm.elements.service.options].find(item=>item.dataset.code===lead.service)?.value||'Не знаю — нужна помощь';
  const lines=['Здравствуйте! Хочу записать питомца в Dr Dolittle.',`Номер обращения: ${lead.lead_id}`,
    `Имя: ${lead.name}`,`Телефон: ${lead.phone}`,`Питомец: ${lead.pet||'не указано'}`,
    `Направление: ${serviceName}`,`Комментарий: ${lead.message||'нет'}`];
  // Open synchronously from the user's gesture; never wait for the buffer or send the message automatically.
  window.open(`https://wa.me/79932501818?text=${encodeURIComponent(lines.join('\n'))}`,'_blank','noopener');
  window.ddTrack('lead_submit',{service:lead.service,context:lead.context,page_path:location.pathname});
  if(!leadClient)return;
  leadBusy=true;lockLeadFields(true);
  bookingForm.querySelector('[type="submit"]').disabled=true;
  formNote.textContent='Сохраняем заявку. Отправку сообщения в WhatsApp вы подтверждаете самостоятельно.';
  const result=await leadClient.submit(lead);
  const notes={accepted:'Заявка сохранена. Запись на приём подтвердит администратор. Сообщение в WhatsApp отправляете вы.',
    limited:'Слишком много запросов. Повторите позже: номер обращения сохранён. WhatsApp доступен.',
    unavailable:'Подтверждение не получено. Повторите отправку: номер обращения сохранён. WhatsApp доступен.',
    invalid:'Заявка не принята. Проверьте телефон и поля формы. Можно связаться через WhatsApp.',
    conflict:'Этот номер обращения уже использован для других данных. Заявка не изменена. Свяжитесь через WhatsApp.',
    storage_unavailable:'Браузер не позволил сохранить запрос для повтора. Заявка не отправлена; используйте WhatsApp.'};
  formNote.textContent=notes[result.state]||notes.unavailable;
  lockLeadFields(Boolean(leadClient.pending()));
  if(['invalid','conflict','storage_unavailable'].includes(result.state)){lastLead=null;lastFields=null;}
  bookingForm.querySelector('[type="submit"]').disabled=false;leadBusy=false;
});

document.querySelectorAll('[data-max-info]').forEach(button=>button.addEventListener('click',()=>{
  window.ddTrack('max_click',{location:elementLocation(button)});
  const toast=document.querySelector('#max-toast');
  toast?.classList.add('show');
  window.clearTimeout(window.maxToastTimer);
  window.maxToastTimer=window.setTimeout(()=>toast?.classList.remove('show'),4200);
}));

document.querySelectorAll('a[href^="tel:"]').forEach(link=>link.addEventListener('click',()=>{
  window.ddTrack('phone_click',{location:elementLocation(link)});
}));
document.querySelectorAll('a[href^="https://wa.me/"]').forEach(link=>link.addEventListener('click',()=>{
  window.ddTrack('whatsapp_click',{location:elementLocation(link)});
}));
document.querySelectorAll('a[href^="https://t.me/"]').forEach(link=>link.addEventListener('click',()=>{
  window.ddTrack('telegram_click',{location:elementLocation(link)});
}));
document.querySelectorAll('a[href*="yandex.ru/maps"]').forEach(link=>link.addEventListener('click',()=>{
  if(/маршрут/i.test(link.textContent||''))window.ddTrack('route_click',{location:elementLocation(link)});
}));

const menuButton=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav');
menuButton?.addEventListener('click',()=>{
  const open=nav?.classList.toggle('open');
  menuButton.setAttribute('aria-expanded',String(Boolean(open)));
});
nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>nav.classList.remove('open')));

const packageStage=document.querySelector('.package-stage');
const packageCards=packageStage?[...packageStage.querySelectorAll('.package-card')]:[];
let activePackage=0;

function syncPackageStageHeight(){
  if(!packageStage)return;
  if(!window.matchMedia('(max-width:760px)').matches){
    packageStage.style.height=document.body.classList.contains('final-preview')
      ? `${Math.max(560,...packageCards.filter(card=>Math.abs(Number(card.dataset.offset))<=1).map(card=>card.scrollHeight+48))}px` : '';
    return;
  }
  const activeCard=packageCards[activePackage];
  if(activeCard)packageStage.style.height=`${Math.ceil(activeCard.scrollHeight+24)}px`;
}

function renderPackageCarousel(){
  if(!packageCards.length)return;
  const total=packageCards.length;
  packageCards.forEach((card,index)=>{
    let offset=(index-activePackage+total)%total;
    if(offset>total/2)offset-=total;
    card.dataset.offset=String(offset);
    card.classList.toggle('is-active',offset===0);
    card.classList.toggle('is-prev',offset===-1);
    card.classList.toggle('is-next',offset===1);
    card.classList.toggle('is-prev-2',offset===-2);
    card.classList.toggle('is-next-2',offset===2);
    const visibleSlots=document.body.classList.contains('final-preview')?1:2;
    const outside=Math.abs(offset)>visibleSlots;
    card.setAttribute('aria-hidden',String(outside));
    card.inert=outside;
  });
  window.requestAnimationFrame(syncPackageStageHeight);
}

function movePackage(direction){
  if(!packageCards.length)return;
  activePackage=(activePackage+direction+packageCards.length)%packageCards.length;
  renderPackageCarousel();
}

document.querySelector('[data-prev]')?.addEventListener('click',()=>movePackage(-1));
document.querySelector('[data-next]')?.addEventListener('click',()=>movePackage(1));

let packagePointerStart=null;
let suppressPackageClick=false;

packageStage?.addEventListener('pointerdown',event=>{
  if(event.target.closest('button,a'))return;
  packagePointerStart={x:event.clientX,y:event.clientY};
});

packageStage?.addEventListener('pointerup',event=>{
  if(!packagePointerStart||event.target.closest('button,a'))return;
  const dx=event.clientX-packagePointerStart.x;
  const dy=event.clientY-packagePointerStart.y;
  packagePointerStart=null;
  if(Math.abs(dx)>34&&Math.abs(dx)>Math.abs(dy)){
    suppressPackageClick=true;
    movePackage(dx<0?1:-1);
  }
});

packageStage?.addEventListener('pointercancel',()=>{packagePointerStart=null});
packageStage?.addEventListener('click',event=>{
  if(event.target.closest('button,a'))return;
  if(suppressPackageClick){suppressPackageClick=false;return;}
  const card=event.target.closest('.package-card');
  if(card&&!card.classList.contains('is-active')){
    activePackage=packageCards.indexOf(card);
    renderPackageCarousel();
    return;
  }
  const rect=packageStage.getBoundingClientRect();
  const stageX=event.clientX-rect.left;
  if(stageX<rect.width*.22)movePackage(-1);
  if(stageX>rect.width*.78)movePackage(1);
});
renderPackageCarousel();
window.addEventListener('resize',syncPackageStageHeight,{passive:true});

const storyModal=document.querySelector('#story-modal');
const storyModalContent=storyModal?.querySelector('.story-modal-content');
const closeStory=()=>storyModal?.close();

function openStory(card){
  const full=card.querySelector('.story-full');
  if(!storyModal||!storyModalContent||!full)return;
  storyModalContent.innerHTML=full.innerHTML;
  storyModal.showModal();
  const copy=storyModalContent.querySelector('.story-modal-copy');
  if(copy)copy.scrollTop=0;
  storyModal.querySelector('.story-modal-close')?.focus();
}

document.querySelectorAll('[data-story-open]').forEach(card=>{
  card.addEventListener('click',()=>openStory(card));
  card.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();openStory(card);}
  });
});
storyModal?.querySelector('.story-modal-close')?.addEventListener('click',closeStory);
storyModal?.addEventListener('click',event=>{if(event.target===storyModal)closeStory();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&storyModal?.open)closeStory();});

// Final layouts are assembled in rebuild_site.py; no runtime demo replacement.
const doctorTabs=[...document.querySelectorAll('[data-doctor-tab]')];
function selectDoctor(index,focus=false){
  doctorTabs.forEach((tab,i)=>{
    const selected=i===index;
    tab.setAttribute('aria-selected',String(selected));
    tab.tabIndex=selected?0:-1;
    const panel=document.getElementById(tab.getAttribute('aria-controls'));
    if(panel)panel.hidden=!selected;
    if(selected&&focus)tab.focus();
  });
}
doctorTabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectDoctor(index));
  tab.addEventListener('keydown',event=>{
    let next=index;
    if(event.key==='ArrowRight')next=(index+1)%doctorTabs.length;
    else if(event.key==='ArrowLeft')next=(index+doctorTabs.length-1)%doctorTabs.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=doctorTabs.length-1;
    else return;
    event.preventDefault();selectDoctor(next,true);
  });
});
const finalReviews=[...document.querySelectorAll('[data-final-review]')];
let reviewPage=0;
function renderFinalReviews(){
  const first=Math.min(reviewPage*7,Math.max(0,finalReviews.length-7));
  finalReviews.forEach((review,index)=>{
    review.hidden=index<first||index>=first+7;
    review.classList.toggle('is-featured',index===first+2||first+2>=finalReviews.length&&index===first);
  });
  const range=document.querySelector('[data-review-range]');
  if(range)range.textContent=`${first+1}–${Math.min(first+7,finalReviews.length)} из ${finalReviews.length}`;
}
document.querySelector('[data-review-prev]')?.addEventListener('click',()=>{
  reviewPage=(reviewPage+Math.ceil(finalReviews.length/7)-1)%Math.ceil(finalReviews.length/7);renderFinalReviews();
});
document.querySelector('[data-review-next]')?.addEventListener('click',()=>{
  reviewPage=(reviewPage+1)%Math.ceil(finalReviews.length/7);renderFinalReviews();
});
if(finalReviews.length)renderFinalReviews();

const clinicGallery=document.querySelector('.clinic-gallery-grid');
function scrollClinicGallery(direction){
  if(!clinicGallery)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  clinicGallery.scrollBy({left:direction*clinicGallery.clientWidth*.75,behavior:reduced?'instant':'smooth'});
}
document.querySelector('[data-gallery-prev]')?.addEventListener('click',()=>scrollClinicGallery(-1));
document.querySelector('[data-gallery-next]')?.addEventListener('click',()=>scrollClinicGallery(1));
clinicGallery?.addEventListener('keydown',event=>{
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
    event.preventDefault();scrollClinicGallery(event.key==='ArrowRight'?1:-1);
  }
});
