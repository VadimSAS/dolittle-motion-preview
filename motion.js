(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const ease = 'cubic-bezier(.22,1,.36,1)';
  const progress = document.createElement('div');
  progress.className = 'motion-progress'; document.body.append(progress);
  const hero = $('.motion-hero');
  if (!hero) return;
  // Pointer-driven layers follow the reference's spring, stiffness 60 / damping 18.
  let targetX = 0, targetY = 0, mx = 0, my = 0, vx = 0, vy = 0, frame = 0;
  const layers = $$('[data-depth]', hero);
  const pointerFine = matchMedia('(pointer:fine)').matches;
  const spring = () => {
    vx += (targetX - mx) * .028; vy += (targetY - my) * .028;
    vx *= .76; vy *= .76; mx += vx; my += vy;
    layers.forEach(el => { const d = Number(el.dataset.depth); el.style.transform = `translate3d(${mx*d}px,${my*d}px,0)`; });
    if (Math.abs(targetX-mx)+Math.abs(targetY-my)+Math.abs(vx)+Math.abs(vy) > .0005) frame = requestAnimationFrame(spring);
    else frame = 0;
  };
  if (!reduce && pointerFine) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      targetX = clamp((e.clientX-r.left)/r.width,0,1)*2-1;
      targetY = clamp((e.clientY-r.top)/r.height,0,1)*2-1;
      if (!frame) frame=requestAnimationFrame(spring);
    });
    hero.addEventListener('pointerleave',()=>{targetX=targetY=0;if(!frame)frame=requestAnimationFrame(spring);});
  }
  let boops = 0;
  $('.mh-dog').addEventListener('click', e => {
    $('.mh-boop').textContent = `Уже ${++boops} ${boops===1?'поглаживание':boops<5?'поглаживания':'поглаживаний'}! ♡`;
    if (reduce) return;
    const r=$('.mh-dog').getBoundingClientRect();
    const x=e.detail?e.clientX-r.left:r.width/2, y=e.detail?e.clientY-r.top:r.height*.4;
    for(let i=0;i<7;i++){
      const h=document.createElement('span');h.className='mh-heart';h.textContent='♥';h.style.left=`${x}px`;h.style.top=`${y}px`;$('.mh-hearts').append(h);
      const dx=(Math.random()-.5)*150,dy=-180-Math.random()*80;
      const a=h.animate([{opacity:1,transform:'translate(-50%,-50%) scale(0)'},{opacity:1,offset:.2,transform:'translate(-50%,-70%) scale(1)'},{opacity:0,transform:`translate(calc(-50% + ${dx}px),${dy}px) scale(1.3) rotate(${dx/6}deg)`}],{duration:1500,easing:ease});
      a.onfinish=()=>h.remove();
    }
  });

  // Finder reads the same package registry as the clinic's existing carousel.
  const finder=$('.motion-finder'), result=$('#mf-result');
  const packages=JSON.parse($('#motion-packages').textContent);
  let age='young',need=null,pet='dog',cardio=false;
  let routes={};
  fetch('motion-routing.json').then(r=>{if(!r.ok)throw Error('routing');return r.json();}).then(data=>routes=data).catch(()=>{});
  const txt=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  let lastRender=0;
  const render = async () => {
    if(!need)return;
    const serial=++lastRender;
    if(!reduce){await result.animate([{opacity:1,transform:'translateY(0) rotate(0)'},{opacity:0,transform:'translateY(-20px) rotate(-1deg)'}],{duration:150,easing:ease}).finished.catch(()=>{});}
    if(serial!==lastRender)return;
    const key=routes[`${age}:${need}:${cardio}`] || (need==='routine'?(age+(cardio?'_cardio':'')):need);
    if(key==='urgent'){
      result.innerHTML='<div class="mf-urgent"><small>ПОМОЩЬ КРУГЛОСУТОЧНО</small><h3>Нужна помощь сейчас?</h3><p>Позвоните в клинику и опишите состояние питомца. Для срочной помощи не ждите ответа на онлайн-заявку.</p><a href="tel:+79932501818">Позвонить 24/7 · +7 (993) 250-18-18</a><p>Красногорск, Авангардная улица, 3</p></div>';
    }else{
      const p=packages[key];if(!p)return;
      const name=p.name.replaceAll('Check-up','Проверка здоровья').replaceAll('check-up','проверка здоровья');
      const saving=/^\d/.test(p.saving)?`<span>Выгода ${txt(p.saving)}</span>`:'';
      result.innerHTML=`<article class="mf-offer"><div class="mf-offer-photo"><img src="assets/motion/${pet==='cat'?'hero-cat':'hero-dog'}.jpg" alt="${pet==='cat'?'Кошка':'Собака'}"><span>${txt(p.tag)}</span></div><div class="mf-offer-copy"><h3>${txt(name)}</h3><ul>${p.items.map(item=>`<li>${txt(item)}</li>`).join('')}</ul><div class="mf-price"><strong>${txt(p.price)}</strong>${saving}</div><button class="mh-btn" type="button" data-finder-book="${txt(p.name)}">Записаться на комплекс <span>↗</span></button><small>${txt(p.extra)} Не включено: ${txt(p.not)}</small></div></article>`;
      $('[data-finder-book]',result).addEventListener('click',e=>{
        // Keep the site's established booking handler and its package context.
        const original=$$('.package-card .js-book').find(b=>b.dataset.context===p.name);
        if(original)original.click();else $('.header .js-book, .mh-actions .js-book')?.click();
      });
    }
    if(!reduce)result.animate([{opacity:0,transform:'translateY(30px) rotate(1.5deg)'},{opacity:1,transform:'translateY(-3px) rotate(-.15deg)',offset:.75},{opacity:1,transform:'translateY(0) rotate(0)'}],{duration:500,easing:ease});
  };
  finder.addEventListener('click',e=>{
    const button=e.target.closest('.mf-pills button');if(!button)return;
    const group=button.parentElement;
    $$('button',group).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    button.classList.remove('pill-pop');void button.offsetWidth;button.classList.add('pill-pop');
    if(button.dataset.age)age=button.dataset.age;
    if(button.dataset.pet)pet=button.dataset.pet;
    if(button.dataset.need)need=button.dataset.need;
    render();
  });
  $('#mf-cardio').addEventListener('change',e=>{cardio=e.target.checked;render();});

  // One-shot reveal, same direction and stagger as the reference.
  const reveals=$$('.section-head,.service-card,.diagnostic-panel,.story-card,.package-stage,.review-stage,.clinic-gallery');
  if(!reduce){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.12,rootMargin:'0px 0px -35px 0px'});
    reveals.forEach((el,i)=>{el.classList.add('motion-reveal');el.style.setProperty('--reveal-delay',`${el.classList.contains('service-card')?(i%4)*65:0}ms`);observer.observe(el);});
  }
  const family=$('.motion-family'),journey=$('.motion-journey'),track=$('.mj-track');
  let prevY=scrollY,ticking=false;
  const nav=$('.topbar');
  const onScroll=()=>{
    ticking=false;
    const y=scrollY,vh=innerHeight;
    progress.style.width=`${clamp(y/(document.documentElement.scrollHeight-vh))*100}%`;
    if(nav && y>600 && Math.abs(y-prevY)>4)nav.classList.toggle('motion-nav-hidden',y>prevY);
    if(y<50)nav?.classList.remove('motion-nav-hidden');prevY=y;
    if(reduce)return;
    const f=clamp(-family.getBoundingClientRect().top/(family.offsetHeight-vh));
    const crop=22*(1-clamp(f/.55));
    $('.family-photo').style.clipPath=`inset(${crop}% round ${48*(1-clamp(f/.55))}px)`;
    $('.family-photo img').style.scale=1.35-.35*clamp(f/.7);
    $('.family-photo>div').style.opacity=f<.5?.32-.07*f/.5:.25+.3*clamp((f-.5)/.3);
    const title=$('#family-title');title.style.opacity=1-clamp((f-.45)/.17);
    $('span',title).style.transform=`translateX(${-18*clamp(f/.6)}%)`;
    $('em',title).style.transform=`translateX(${18*clamp(f/.6)}%)`;
    const final=$('.family-final');final.style.opacity=clamp((f-.62)/.16);final.style.translate=`0 ${40*(1-clamp((f-.62)/.18))}px`;
    const jp=clamp(-journey.getBoundingClientRect().top/(journey.offsetHeight-vh));
    const normalized=clamp((jp-.04)/.92),distance=track.scrollWidth-innerWidth;
    track.style.transform=`translate3d(${-distance*normalized}px,0,0)`;
    const active=Math.round(normalized*5);$('.mj-count').textContent=`0${active+1} / 06`;
    $$('.mj-card').forEach((card,i)=>card.classList.toggle('is-active',i===active));
    $('.mj-progress i').style.width=`${normalized*100}%`;
    const colors=['#fff0d3','#eadfe8','#dceee3','#ffe0cf','#e5def1','#f8e9bd'];
    journey.style.backgroundColor=colors[active];journey.style.transition='background-color .7s';
    const statement=$('.ma-statement');
    if(statement){const r=statement.getBoundingClientRect(),p=clamp((vh*.85-r.top)/(r.height+vh*.4));const words=$$('.motion-about-word',statement);words.forEach((word,i)=>word.style.opacity=.2+.8*clamp((p-i/words.length)*words.length));}
    const photos=$('.ma-photos');
    if(photos){const p=clamp((vh-photos.getBoundingClientRect().top)/(vh+photos.offsetHeight));$$('img',photos).forEach((img,i)=>img.style.transform=`translateY(${[60,140,20][i]+([-120,-240,-160][i])*p}px)`);}
  };
  addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(onScroll);}},{passive:true});
  addEventListener('resize',onScroll);onScroll();

  // Existing clinic gallery: tactile cards, dragging and a keyboard-accessible lightbox.
  const gallery=$('[aria-label="Галерея клиники с горизонтальной прокруткой"]');
  if(gallery){
    gallery.classList.add('motion-gallery-wall');
    const images=$$('img',gallery);
    const lightbox=document.createElement('dialog');lightbox.className='motion-lightbox';lightbox.setAttribute('aria-label','Фотографии клиники');
    lightbox.innerHTML='<img alt=""><button type="button" aria-label="Закрыть фотографию">×</button><button class="ml-prev" type="button" aria-label="Предыдущее фото">‹</button><button class="ml-next" type="button" aria-label="Следующее фото">›</button>';
    document.body.append(lightbox);let index=0,opener=null;
    const show=i=>{index=(i+images.length)%images.length;$('img',lightbox).src=images[index].src;$('img',lightbox).alt=images[index].alt;if(!reduce)$('img',lightbox).animate([{opacity:0,transform:'scale(.96)'},{opacity:1,transform:'scale(1)'}],{duration:350,easing:ease});};
    $('button',lightbox).onclick=()=>lightbox.close();$('.ml-prev',lightbox).onclick=()=>show(index-1);$('.ml-next',lightbox).onclick=()=>show(index+1);
    lightbox.addEventListener('click',e=>{if(e.target===lightbox)lightbox.close();});
    lightbox.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')show(index-1);if(e.key==='ArrowRight')show(index+1);});
    lightbox.addEventListener('close',()=>opener?.focus());
    images.forEach((image,i)=>{
      image.classList.add('motion-gallery-item');image.tabIndex=0;image.setAttribute('role','button');image.setAttribute('aria-label',`Открыть фото ${i+1}`);
      let start=null,dx=0,dy=0,dragged=false;
      image.draggable=false;
      image.addEventListener('pointerdown',e=>{if(!pointerFine)return;start={x:e.clientX,y:e.clientY};dx=dy=0;dragged=false;image.setPointerCapture(e.pointerId);});
      image.addEventListener('pointermove',e=>{if(!start)return;dx=clamp(e.clientX-start.x,-100,100);dy=clamp(e.clientY-start.y,-80,80);if(Math.abs(dx)+Math.abs(dy)>8)dragged=true;if(dragged)image.style.transform=`translate(${dx}px,${dy}px) rotate(0)`;});
      image.addEventListener('pointerup',()=>{start=null;if(dragged){if(!reduce)image.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:600,easing:'cubic-bezier(.34,1.56,.64,1)'});image.style.transform='';}});
      image.addEventListener('click',e=>{if(dragged){dragged=false;e.preventDefault();return;}opener=image;show(i);lightbox.showModal();});
      image.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();image.click();}});
    });
  }
  // Expanding portrait strip drives the existing detailed profile and booking.
  const doctors=$('#doctors');
  if(doctors){
    const tabs=$$('[role=tab]',doctors),strip=document.createElement('div');strip.className='motion-team-strip';strip.setAttribute('aria-label','Выберите специалиста');
    tabs.forEach((tab,i)=>{
      const button=document.createElement('button');button.type='button';button.className='motion-team-person';button.setAttribute('aria-expanded',String(i===0));button.setAttribute('aria-controls',tab.getAttribute('aria-controls'));
      button.innerHTML=`<img src="${$('img',tab).getAttribute('src')}" alt=""><span>${$('strong',tab).innerHTML}<small>${$('small',tab).textContent}</small></span>`;
      button.addEventListener('click',()=>{tabs[i].click();$$('button',strip).forEach((b,j)=>b.setAttribute('aria-expanded',String(i===j)));});strip.append(button);
    });
    $('.doctor-index',doctors).before(strip);doctors.classList.add('motion-team-ready');
    doctors.addEventListener('click',e=>{if(!e.target.closest('[role=tab]')||reduce)return;requestAnimationFrame(()=>{const profile=$('[role=tabpanel]:not([hidden])',doctors);if(profile)profile.animate([{opacity:0,transform:'translateY(30px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,easing:ease,delay:250});});});
  }
  // Six animated steps use the original form and its established submission handler.
  const modal=$('#booking-modal'),form=$('form',modal);
  if(form){
    const heading=$('h2',form),grid=$('.form-grid',form),channels=$('.channel-grid',form),or=$('.or',form),consent=$('.consent',form),submit=$('[type=submit]',form),note=$('.form-note',form);
    const petField=$('[name=pet]',form),service=$('[name=service]',form),message=$('[name=message]',form);
    const petLabel=petField.closest('label'),serviceLabel=service.closest('label');
    const titles=['Кто ваш питомец?','Какая помощь нужна?','К кому хотите записаться?','Когда вам удобно?','Как с вами связаться?','Проверьте заявку'];
    const stage=document.createElement('div');stage.className='motion-wizard-stage';
    const label=document.createElement('p');label.className='motion-wizard-label';label.textContent='ШАГ 01 / 06';
    const bar=document.createElement('div');bar.className='motion-wizard-progress';bar.innerHTML='<i></i><span aria-hidden="true">🐾</span>';
    heading.after(label,bar,stage);
    const panels=Array.from({length:6},(_,i)=>{const p=document.createElement('div');p.className='motion-wizard-panel';p.hidden=i!==0;stage.append(p);return p;});
    panels[0].innerHTML='<p>Расскажите, для кого готовим приём.</p><div class="motion-wizard-pet"><button type="button" data-wizard-pet="Собака" aria-pressed="false">🐕<br>Собака</button><button type="button" data-wizard-pet="Кошка" aria-pressed="false">🐈<br>Кошка</button><button type="button" data-wizard-pet="Другой питомец" aria-pressed="false">🐾<br>Другой питомец</button></div>';
    panels[0].append(petLabel);petLabel.hidden=true;
    panels[1].append(serviceLabel);
    panels[1].insertAdjacentHTML('beforeend','<p>Если состояние острое, позвоните в клинику. Онлайн-заявка предназначена для планового обращения.</p>');
    panels[2].innerHTML='<label>Специалист<select id="motion-wizard-doctor"><option>Любой подходящий специалист</option>'+$$('[role=tab] strong',doctors).map(el=>`<option>${txt(el.innerHTML.replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,''))}</option>`).join('')+'</select></label><p>Администратор уточнит возможность записи к выбранному врачу.</p>';
    const today=new Date().toLocaleDateString('en-CA');
    panels[3].innerHTML=`<label>Желаемая дата<input type="date" id="motion-wizard-date" min="${today}"></label><label>Удобное время<select id="motion-wizard-time"><option>Уточнить по телефону</option><option>Утро</option><option>День</option><option>Вечер</option></select></label><p>Это пожелание к записи. Дату и время подтвердит администратор.</p>`;
    panels[4].append(grid,consent);
    panels[5].innerHTML='<div class="motion-wizard-summary"></div>';
    if(submit)panels[5].append(submit);if(note)panels[5].append(note);
    if(channels){channels.classList.add('motion-wizard-step');channels.hidden=true;panels[4].prepend(channels);channels.hidden=false;}if(or)or.remove();
    const nav=document.createElement('div');nav.className='motion-wizard-nav';nav.innerHTML='<button type="button">← Назад</button><button type="button">Далее →</button>';stage.after(nav);
    const back=$('button',nav),next=$$('button',nav)[1];let step=0;let injectedSummary='';
    const draw=direction=>{
      panels.forEach((panel,i)=>panel.hidden=i!==step);heading.textContent=titles[step];label.textContent=`ШАГ 0${step+1} / 06`;
      $('i',bar).style.width=`${(step+1)/6*100}%`;$('span',bar).style.left=`${(step+1)/6*100}%`;$('span',bar).style.rotate=`${step*25}deg`;
      back.style.visibility=step?'visible':'hidden';next.hidden=step===5;
      if(step===5){const values=[petField.value,service.value,$('#motion-wizard-doctor').value,$('#motion-wizard-date').value||'Дата по согласованию',$('#motion-wizard-time').value];$('.motion-wizard-summary').innerHTML=values.map(v=>`<div>${txt(v)}</div>`).join('');}
      if(!reduce)panels[step].animate([{opacity:0,filter:'blur(4px)',transform:`translateX(${60*direction}px)`},{opacity:1,filter:'blur(0px)',transform:'translateX(0)'}],{duration:400,easing:ease});
      heading.tabIndex=-1;heading.focus({preventScroll:true});modal.scrollTop=0;
    };
    panels[0].addEventListener('click',e=>{const b=e.target.closest('[data-wizard-pet]');if(!b)return;petField.value=b.dataset.wizardPet;$$('button',panels[0]).forEach(el=>el.setAttribute('aria-pressed',String(el===b)));step=1;draw(1);});
    back.onclick=()=>{step=Math.max(0,step-1);draw(-1);};
    next.onclick=()=>{
      if(step===0&&!petField.value){panels[0].animate([{transform:'translateX(-5px)'},{transform:'translateX(5px)'},{transform:'translateX(0)'}],{duration:200});return;}
      if(step===4){for(const input of $$('input[required]',panels[4])){if(!input.reportValidity())return;}}
      step=Math.min(5,step+1);draw(1);
    };
    form.addEventListener('submit',e=>{
      if(step!==5){e.preventDefault();e.stopImmediatePropagation();next.click();return;}
      if(injectedSummary)message.value=message.value.replace(injectedSummary,'');
      injectedSummary=`\nПожелания к записи: ${$('#motion-wizard-doctor').value}; ${$('#motion-wizard-date').value||'дата по согласованию'}; ${$('#motion-wizard-time').value}.`;
      message.value+=injectedSummary;
    },true);
    modal.addEventListener('close',()=>{step=0;panels.forEach((p,i)=>p.hidden=i!==0);heading.textContent=titles[0];label.textContent='ШАГ 01 / 06';$('i',bar).style.width='16.66%';$('span',bar).style.left='16.66%';back.style.visibility='hidden';next.hidden=false;});
    heading.textContent=titles[0];back.style.visibility='hidden';
  }
  // Service cards retain their full page route and add an animated quick view.
  const serviceData=JSON.parse($('#motion-services').textContent);
  const serviceDialog=document.createElement('dialog');serviceDialog.className='motion-service-dialog';serviceDialog.setAttribute('aria-label','Подробнее об услуге');document.body.append(serviceDialog);
  $$('.service-card').forEach(card=>card.addEventListener('click',e=>{
    if(e.ctrlKey||e.metaKey||e.shiftKey)return;
    const file=(card.getAttribute('href')||'').split('/').pop();
    const entry=Object.values(serviceData).find(s=>s.file===file);if(!entry)return;
    e.preventDefault();
    serviceDialog.innerHTML=`<button type="button" class="ms-close" aria-label="Закрыть описание услуги">×</button><p class="motion-kicker">${txt(entry.eyebrow)}</p><h2>${txt(entry.name)}</h2><p>${txt(entry.lead)}</p><ul>${entry.route.map(s=>`<li>${txt(s)}</li>`).join('')}</ul><div class="ms-prices">${entry.prices.map(([label,price])=>`<div><span>${txt(label)}</span><b>${txt(price)}</b></div>`).join('')}</div><div class="mh-actions"><button type="button" class="mh-btn ms-book">Записаться на приём <span>↗</span></button><a class="mh-btn mh-secondary" href="${txt(entry.file)}">Подробнее об услуге <span>↗</span></a></div>`;
    $('.ms-close',serviceDialog).onclick=()=>serviceDialog.close();
    $('.ms-book',serviceDialog).onclick=()=>{serviceDialog.close();$('.mh-actions .js-book').click();const select=$('[name=service]',form);const option=[...select.options].find(o=>o.text===entry.name);if(option)select.value=option.value;};
    serviceDialog.showModal();if(!reduce)serviceDialog.animate([{opacity:0,transform:'translateY(30px) scale(.96)',filter:'blur(4px)'},{opacity:1,transform:'translateY(0) scale(1)',filter:'blur(0)'}],{duration:400,easing:ease});
    serviceDialog.onclose=()=>card.focus();
  }));
  serviceDialog.addEventListener('click',e=>{if(e.target===serviceDialog)serviceDialog.close();});
  // The reference uses contextual cursor sizes 14 / 54 / 84 px.
  if(pointerFine&&!reduce){
    const cursor=document.createElement('div');cursor.className='motion-cursor';cursor.setAttribute('aria-hidden','true');document.body.append(cursor);
    let cx=-100,cy=-100,tx=-100,ty=-100,cvx=0,cvy=0,cursorFrame=0;
    const cursorTick=()=>{cvx=(cvx+(tx-cx)*.22)*.52;cvy=(cvy+(ty-cy)*.22)*.52;cx+=cvx;cy+=cvy;cursor.style.left=`${cx}px`;cursor.style.top=`${cy}px`;if(Math.abs(tx-cx)+Math.abs(ty-cy)+Math.abs(cvx)+Math.abs(cvy)>.1)cursorFrame=requestAnimationFrame(cursorTick);else cursorFrame=0;};
    addEventListener('pointermove',e=>{tx=e.clientX;ty=e.clientY;if(!cursorFrame)cursorFrame=requestAnimationFrame(cursorTick);const target=e.target.closest('.motion-gallery-item,.motion-team-person,.service-card,a,button,input,textarea,select,label');const state=target?.matches('.motion-gallery-item')?'drag':target?.matches('.motion-team-person,.service-card')?'image':target&&!target.matches('input,textarea,select')?'button':'default';cursor.dataset.state=state;cursor.textContent=state==='drag'?'Тяните':state==='image'?'Смотреть':'';},{passive:true});
    addEventListener('pointerdown',()=>cursor.classList.add('is-down'));addEventListener('pointerup',()=>cursor.classList.remove('is-down'));
    document.addEventListener('mouseleave',()=>cursor.style.opacity='0');document.addEventListener('mouseenter',()=>cursor.style.opacity='1');
  }
  const visitHeading=$('.clinic-ribbon h2');if(visitHeading)visitHeading.insertAdjacentHTML('beforeend',' <span class="motion-visit-pin" aria-hidden="true">⌖</span>');
})();
