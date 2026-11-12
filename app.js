(()=>{
const root=document.getElementById('app');
const PROGRAM_CHOICE='sporttracker-active-program-v1';
const PROGRAM_ID=localStorage.getItem(PROGRAM_CHOICE)==='gym'?'gym':'116';
const IS_GYM=PROGRAM_ID==='gym';
const PROGRAM=IS_GYM?window.PROGRAM_GYM:window.PROGRAM_116;
if(!PROGRAM) throw new Error('Workout program is missing: '+PROGRAM_ID);
const P=PROGRAM.routines;


// --- Audio overlay mode v1.6 ---
// On supporting iOS/WebKit builds, "transient" lets a short app sound mix with
// music from another app instead of taking over the phone's playback session.
const restAudio = new Audio('rest-whistle-user-20261111.mp3');
restAudio.preload = 'auto';

let previousAudioSessionType = null;

function enterTransientAudioSession() {
  try {
    if ('audioSession' in navigator && navigator.audioSession) {
      previousAudioSessionType = navigator.audioSession.type || 'auto';
      navigator.audioSession.type = 'transient';
    }
  } catch (e) {}
}

function leaveTransientAudioSession() {
  try {
    if ('audioSession' in navigator && navigator.audioSession) {
      navigator.audioSession.type = previousAudioSessionType || 'auto';
    }
  } catch (e) {}
  previousAudioSessionType = null;
}

async function playRestSignal(){
  if (!soundEnabled) return;
  try{
    enterTransientAudioSession();
    restAudio.currentTime = 0;
    await restAudio.play();
  }catch(e){
    leaveTransientAudioSession();
  }
}

restAudio.addEventListener('ended', leaveTransientAudioSession);
restAudio.addEventListener('pause', () => {
  if (restAudio.currentTime === 0 || restAudio.ended) leaveTransientAudioSession();
});

// Разминка не является упражнением и не участвует в статистике.
const ORIGINAL_WARMUP_PLANS = {
  A: {
    duration:'10–12 мин',dynamicTime:'4 мин',
    dynamic:[
      'Круги руками — 15 вперёд + 15 назад',
      'Повороты грудного отдела — 8 на сторону',
      'Лопаточные отжимания — 10',
      'Лопаточные подтягивания — 6–8'
    ],
    ramps:[
      ['Жим штанги лёжа','20 кг × 10 → 40 кг × 6 → 60 кг × 3 → 72,5 кг × 1–2'],
      ['Перед рабочими подтягиваниями','1 лёгкий подход × 2–3']
    ]
  },
  B: {
    duration:'10–12 мин',dynamicTime:'4–5 мин',
    dynamic:[
      'Приседания без веса — 12',
      'Выпады назад — 6 на каждую ногу',
      'Наклоны с отведением таза назад (hip hinge) — 10',
      'Колено к стене (голеностоп) — 8 на каждую ногу'
    ],
    ramps:[
      ['Приседания со штангой','20 кг × 10 → 40 кг × 6 → 55 кг × 3 → 65 кг × 1–2'],
      ['Перед болгарскими выпадами','5 повторений без гантели на каждую ногу'],
      ['Перед румынской тягой','20 кг × 8 → 40 кг × 4–5']
    ]
  },
  C: {
    duration:'9–11 мин',dynamicTime:'4 мин',
    dynamic:[
      'Скольжения руками по стене (wall slides) — 10',
      'Перекрёстные махи руками — 20',
      'Лопаточные отжимания — 10',
      'Лопаточные подтягивания — 6–8'
    ],
    ramps:[
      ['Наклонный жим штанги ≈30°','20 кг × 10 → 35 кг × 6 → 50 кг × 3 → 57,5 кг × 1–2'],
      ['Перед подтягиваниями','2–3 лёгких повторения'],
      ['Перед отжиманиями на брусьях','3–5 лёгких повторений в комфортной амплитуде']
    ]
  }
};
// The original warmups and their exercise ramp weights remain unchanged.
const GYM_WARMUP_PLANS = {
  A: {duration:'10–12 мин',dynamicTime:'4 мин',dynamic:[
    'Круги плечами — 12 в обе стороны',
    'Повороты грудного отдела — 8 на сторону',
    'Лопаточные отжимания — 10',
    'Лёгкая активация лопаток — 8'
  ],ramps:[
    ['Жим штанги лёжа','20 кг × 10 → 40 кг × 6 → 60 кг × 3 → 70 кг × 1–2 (без отказа)'],
    ['Рычажная тяга и тренажёры','1–2 лёгких подводящих подхода; подобрать кг по маркировке конкретного тренажёра']
  ]},
  B: {duration:'10–12 мин',dynamicTime:'4–5 мин',dynamic:[
    'Приседания без веса — 10',
    'Тазобедренный шарнир без веса — 10',
    'Динамическая мобилизация голеностопа — 8 на ногу',
    'Подъёмы на носки без веса — 10'
  ],ramps:[
    ['Жим ногами 45°','2–3 подводящих подхода с постепенным увеличением веса в кг, без отказа'],
    ['Румынская тяга','20 кг × 8 → 40 кг × 5 → 50 кг × 2']
  ]},
  C: {duration:'9–11 мин',dynamicTime:'4 мин',dynamic:[
    'Круги руками — 15',
    'Скольжения руками по стене — 10',
    'Лопаточные отжимания — 10',
    'Контроль подвижности плеч — 8'
  ],ramps:[
    ['Брусья','1 лёгкий подводящий подход в комфортной амплитуде'],
    ['Тренажёры для спины и груди','1–2 лёгких подхода без отказа, массу подобрать в кг']
  ]}
};
const WARMUP_PLANS=IS_GYM?GYM_WARMUP_PLANS:ORIGINAL_WARMUP_PLANS;
// Separate storage namespaces. The legacy 116-day keys are exactly unchanged.
const WARMUP_STORAGE=IS_GYM?'tracker-gym-warmup-session-v1':'tracker116-warmup-session-v1';

const STORAGE=IS_GYM?'tracker-gym-state-v1':'tracker116-state-v1';
const HISTORY=IS_GYM?'tracker-gym-history-v1':'tracker116-history-v1';
const PENDING=IS_GYM?'tracker-gym-pending-finish-v1':'tracker116-pending-finish-v1';
const SOUND_PREF='tracker116-sound-v1'; // Shared device preference; unchanged.
const STORE_NAMES={
  '116':{state:'tracker116-state-v1',history:'tracker116-history-v1',pending:'tracker116-pending-finish-v1',warmup:'tracker116-warmup-session-v1',rest:'tracker116-rest-after-c-v1',overrides:'tracker116-plan-overrides-v1-'+window.PROGRAM_116.version},
  gym:{state:'tracker-gym-state-v1',history:'tracker-gym-history-v1',pending:'tracker-gym-pending-finish-v1',warmup:'tracker-gym-warmup-session-v1',rest:'tracker-gym-rest-after-c-v1',overrides:'tracker-gym-plan-overrides-v1-'+window.PROGRAM_GYM.version}
};
function mk(k){return{ex:0,set:0,edit:false,items:P[k].map(x=>({rir:'',tech:'',note:'',sets:Array.from({length:x.sets},(_,i)=>({weight:(x.w||''),reps:String(x.t[i]??''),done:false}))}))}}
function fresh(){return{S:{A:mk('A'),B:mk('B'),C:mk('C')},R:(PROGRAM.nextRoutine||'A'),started:null,finished:null,restEnd:null,programVersion:PROGRAM.version}}
function load(){try{const x=JSON.parse(localStorage.getItem(STORAGE));if(!x)return fresh();if(x.programVersion!==PROGRAM.version){if(x.started&&!x.finished){try{localStorage.setItem((IS_GYM?'tracker-gym-session-backup-':'tracker116-session-backup-')+String(x.programVersion||'unknown'),JSON.stringify(x))}catch(e){}}return fresh()}return x}catch(e){return fresh()}}
// Load local exercise targets before building a fresh session; completed sets are never rewritten.
// Local plans are scoped to a central program version. The previous version's overrides remain untouched and exportable.
const LEGACY_PLAN_OVERRIDES='tracker116-plan-overrides-v1';
const PLAN_OVERRIDES=STORE_NAMES[PROGRAM_ID].overrides;
applyOverrideToProgram();
let state=load(),S=state.S,R=state.R,started=state.started,finished=state.finished,restEnd=state.restEnd;
// Отметки A/B/C относятся только к текущей сессии (started — её идентификатор).
function readWarmupSession(sessionStarted){
  if(!sessionStarted)return {A:false,B:false,C:false};
  try{
    const x=JSON.parse(localStorage.getItem(WARMUP_STORAGE)||'null');
    if(x && x.started===sessionStarted && x.done && typeof x.done==='object'){
      return {A:!!x.done.A,B:!!x.done.B,C:!!x.done.C};
    }
  }catch(e){}
  return {A:false,B:false,C:false};
}
let warmupDone=readWarmupSession(started);
function saveWarmupSession(){
  if(started && !finished){
    try{localStorage.setItem(WARMUP_STORAGE,JSON.stringify({started,done:warmupDone}))}catch(e){}
  }else{
    try{localStorage.removeItem(WARMUP_STORAGE)}catch(e){}
  }
}
function clearWarmupSession(){
  warmupDone={A:false,B:false,C:false};
  try{localStorage.removeItem(WARMUP_STORAGE)}catch(e){}
}
function renderWarmup(){
  const p=WARMUP_PLANS[R];
  $('#warmupTitle').textContent='Разминка · '+p.duration;
  $('#warmupDynamicTime').textContent=p.dynamicTime;
  const dynamics=$('#warmupDynamic');
  dynamics.replaceChildren(...p.dynamic.map(s=>{
    const li=document.createElement('li');li.textContent=s;return li;
  }));
  const ramps=$('#warmupRamps');
  ramps.replaceChildren(...p.ramps.map(([title,steps])=>{
    const item=document.createElement('div');
    const heading=document.createElement('div');heading.className='warmup-ramp-title';heading.textContent=title;
    const content=document.createElement('div');content.className='warmup-ramp-steps';content.textContent=steps;
    item.append(heading,content);return item;
  }));
  const isDone=!!warmupDone[R];
  $('#warmupDone').checked=isDone;
  $('#warmupDone').disabled=!(started&&!finished);
  $('#warmupState').classList.toggle('hidden',!isDone);
  $('#warmupHint').textContent=(started&&!finished)
    ? 'Разминочные веса — ориентиры, без отказа; при изменении рабочих весов их следует пересмотреть.'
    : 'Начни тренировку, чтобы отметить разминку. Разминочные веса — ориентиры, без отказа; при изменении рабочих весов их следует пересмотреть.';
}
document.getElementById('warmupDone').addEventListener('change',e=>{
  if(!started||finished){e.target.checked=false;return;}
  warmupDone[R]=e.target.checked;
  saveWarmupSession();
  if(e.target.checked){
    const details=document.getElementById('warmupDetails');
    if(details) details.open=false;
  }
  renderWarmup();
});

let pendingFinish=null;
try{pendingFinish=JSON.parse(localStorage.getItem(PENDING))||null}catch(e){pendingFinish=null}
if(pendingFinish && pendingFinish.programVersion!==PROGRAM.version){
  try{localStorage.setItem((IS_GYM?'tracker-gym-prior-pending-backup-':'tracker116-prior-pending-backup-')+String(pendingFinish.programVersion||'unknown'),JSON.stringify(pendingFinish))}catch(e){}
  pendingFinish=null; // The earlier pending workout must not be relabelled with the new program.
}
let timer=null,restSec=120,restRun=!!(restEnd&&restEnd>Date.now()),signaled=false;
let soundEnabled=localStorage.getItem(SOUND_PREF)!=='off';
let soundUnlocked=false;
const $=s=>root.querySelector(s),soundBtn=$('#soundBtn'),startWorkoutBtn=$('#startWorkout'),weightLabel=$('#weightLabel'),clock=$('#clock'),rclock=$('#restClock'),rlabel=$('#restLabel'),meta=$('#meta'),name=$('#name'),plan=$('#plan'),warm=$('#warm'),tabs=$('#tabs'),weight=$('#weight'),reps=$('#reps'),repLabel=$('#repLabel'),rir=$('#rir'),tech=$('#tech'),note=$('#note'),done=$('#done'),finalPanel=$('#finalPanel'),summaryPanel=$('#summaryPanel'),summary=$('#summary'),status=$('#status'),historyPanel=$('#historyPanel'),historyList=$('#historyList'),restControls=$('#restControls'),settingsModal=$('#settingsModal'),settingsBtn=$('#settingsBtn');
$('#version').textContent='Программа '+PROGRAM.version;
const programSelector=document.getElementById('programSelector');
if(programSelector){
  programSelector.value=PROGRAM_ID;
  programSelector.addEventListener('change',()=>{
    const next=programSelector.value;
    if(next===PROGRAM_ID)return;
    if((started&&!finished)||pendingFinish){
      if(!confirm('У этой программы есть незавершённая тренировка или сводка. Она сохранится отдельно. Переключить программу?')){
        programSelector.value=PROGRAM_ID;
        return;
      }
    }
    saveFields();
    saveWarmupSession();
    localStorage.setItem(PROGRAM_CHOICE,next);
    location.reload();
  });
}

function openSettings(){
  syncCycleStatus();
  if(settingsModal) settingsModal.classList.remove('hidden');
}
function closeSettings(){
  if(settingsModal) settingsModal.classList.add('hidden');
}

function updateSoundButton(){
  if(!soundBtn)return;
  soundBtn.textContent=soundEnabled?'🔊 Звук':'🔇 Звук';
  soundBtn.setAttribute('aria-pressed',soundEnabled?'true':'false');
}
function unlockSound(){
  if(soundUnlocked||!soundEnabled)return;
  try{
    enterTransientAudioSession();
    const oldVol=restAudio.volume;
    restAudio.volume=0;
    restAudio.currentTime=0;
    const p=restAudio.play();
    if(p&&typeof p.then==='function')p.then(()=>{
      restAudio.pause();restAudio.currentTime=0;restAudio.volume=oldVol;
      soundUnlocked=true;leaveTransientAudioSession();
    }).catch(()=>{
      restAudio.volume=oldVol;leaveTransientAudioSession();
    });
    else{
      restAudio.pause();restAudio.currentTime=0;restAudio.volume=oldVol;
      soundUnlocked=true;leaveTransientAudioSession();
    }
  }catch(e){leaveTransientAudioSession();}
}
function playRestSound(){playRestSignal();}

function persist(){try{localStorage.setItem(STORAGE,JSON.stringify({S,R,started,finished,restEnd,programVersion:PROGRAM.version}))}catch(e){}}
function clearTimerLoop(){if(timer){clearInterval(timer);timer=null}}
function syncLifecycleUI(){
  const active=!!(started&&!finished);
  if(startWorkoutBtn) startWorkoutBtn.style.display=active?'none':'inline-flex';
  const finishBtn=$('#finish');
  if(finishBtn){
    finishBtn.disabled=!active;
    finishBtn.classList.toggle('disabled',!active);
    finishBtn.setAttribute('aria-disabled',active?'false':'true');
  }
  if(restControls) restControls.style.display=restRun?'flex':'none';
  if(!restRun){
    if(restSec===0){
      rclock.textContent='00:00';
      rlabel.textContent='Отдых закончен';
    }else{
      rclock.textContent='02:00';
      rlabel.textContent='Отдых 2:00';
    }
  }
}

function resetLiveWorkout(preserveRoutine=true){
  const keepR=preserveRoutine?R:'C';
  S={A:mk('A'),B:mk('B'),C:mk('C')};
  R=keepR;
  started=null;finished=null;restEnd=null;restSec=120;restRun=false;signaled=false;
  clearWarmupSession();
  clearTimerLoop();
  clock.textContent='00:00:00';
  rclock.textContent='02:00';
  rlabel.textContent='Отдых 2:00';
  $('#difficulty').value='';$('#hardest').value='';$('#pain').value='';
  finalPanel.classList.add('hidden');
  persist();
  syncLifecycleUI();
}
function beginWorkout(){
  if(started&&!finished){
    if(!confirm('Текущая тренировка уже идёт. Сбросить её и начать заново?'))return;
    resetLiveWorkout(true);
  }else if(finished){
    resetLiveWorkout(true);
  }
  started=Date.now();
  finished=null;
  clearWarmupSession();
  restRun=false;restEnd=null;restSec=120;signaled=false;
  clearTimerLoop();
  timer=setInterval(tick,250);
  persist();
  syncLifecycleUI();
  status.textContent=`Тренировка ${R} начата`;
  tick();
  render();
}

function fmt(s){s=Math.max(0,Math.floor(s||0));return[Math.floor(s/3600),Math.floor((s%3600)/60),s%60].map(v=>String(v).padStart(2,'0')).join(':')}
function fmtR(s){s=Math.max(0,Math.ceil(s||0));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function cur(){const r=S[R],p=P[R][r.ex],item=r.items[r.ex];return{r,p,item,set:item.sets[r.set]}}
// Carry the most recently entered working weight and repetitions into every
// upcoming unfinished set of this exercise. Never alter completed results.
function carryForwardSetValues(item, index, nextWeight, nextReps, nextUnit){
  for(let i=index+1;i<item.sets.length;i++){
    const upcoming=item.sets[i];
    if(upcoming.done)continue;
    if(nextUnit==='kg'){
      if(upcoming.weightUnit!=='kg' && upcoming.weight!=='')upcoming.legacyWeight=upcoming.weight;
      upcoming.weightUnit='kg';
    }
    upcoming.weight=nextWeight;
    upcoming.reps=nextReps;
  }
}
function saveFields(){
  const c=cur(),enteredWeight=weight.value.trim().replace(',','.'),newReps=reps.value.trim();
  // A legacy division value is *not* a kilogram value. Leave it untouched until
  // the user explicitly enters kilograms or completes the new set with no mass.
  const legacyUnconverted=!IS_GYM&&c.p.unit==='divisions'&&c.set.weightUnit!=='kg';
  const newWeight=legacyUnconverted&&enteredWeight===''?c.set.weight:enteredWeight;
  const changed=c.set.weight!==newWeight||c.set.reps!==newReps;
  if(legacyUnconverted&&enteredWeight!==''){
    if(c.set.weight!=='')c.set.legacyWeight=c.set.weight;
    c.set.weightUnit='kg';
  }
  c.set.weight=newWeight;c.set.reps=newReps;
  c.item.rir=rir.value;c.item.tech=tech.value;c.item.note=note.value.trim();
  if(changed)carryForwardSetValues(c.item,c.r.set,newWeight,newReps,c.set.weightUnit);
  persist();
}
function startClock(){if(started&&!finished)return;started=Date.now();finished=null;if(!timer)timer=setInterval(tick,250);persist()}
function tick(){if(started)clock.textContent=fmt(((finished||Date.now())-started)/1000);if(restRun&&restEnd){const left=Math.max(0,(restEnd-Date.now())/1000);restSec=Math.ceil(left);rclock.textContent=fmtR(restSec);rlabel.textContent='Отдых '+fmtR(restSec).replace(/^00:/,'');if(left<=0){restRun=false;restEnd=null;restSec=0;rclock.textContent='00:00';rlabel.textContent='Отдых закончен';if(restControls)restControls.style.display='none';if(!signaled){signaled=true;status.textContent='Отдых закончен';playRestSound()}persist()}}}
function startRest(){restSec=120;restEnd=Date.now()+120000;
  scheduleRestPush(Math.max(1,Math.round((restEnd-Date.now())/1000)));restRun=true;signaled=false;if(restControls)restControls.style.display='flex';if(!timer)timer=setInterval(tick,250);tick();persist()}
function adjust(d){if(!restRun||!restEnd)return;restEnd=Math.max(Date.now(),restEnd+d*1000);tick();persist()}
function skip(){if(!restRun)return;restRun=false;restEnd=null;restSec=0;rclock.textContent='00:00';rlabel.textContent='Отдых закончен';if(restControls)restControls.style.display='none';persist()}
function render(){const r=S[R],p=P[R][r.ex],item=r.items[r.ex],s=item.sets[r.set];root.querySelectorAll('[data-routine]').forEach(b=>b.classList.toggle('active',b.dataset.routine===R));meta.textContent=`${r.ex+1}/${P[R].length} · подход ${r.set+1}/${p.sets}`;name.textContent=p.name;plan.textContent=p.plan;warm.textContent=p.warm||'';warm.style.display=p.warm?'block':'none';const tipDetails=$('#tipDetails');if(tipDetails)tipDetails.hidden=!p.warm;repLabel.textContent=p.label||'Повторы';weightLabel.textContent=IS_GYM&&p.bodyweight?'Доп. вес, кг':'Вес, кг';tabs.innerHTML='';item.sets.forEach((st,i)=>{const b=document.createElement('button');b.type='button';b.className='setbtn'+(i===r.set?' active':'');b.textContent=(st.done?'✓':'')+(i+1);b.addEventListener('click',()=>{saveFields();r.set=i;r.edit=st.done;persist();render()});tabs.appendChild(b)});weight.value=(!IS_GYM&&p.unit==='divisions'&&s.weightUnit!=='kg')?'':(s.weight||'');weight.placeholder=(!IS_GYM&&p.unit==='divisions'&&s.weightUnit!=='kg')?'Введите кг':'—';reps.value=s.reps||'';rir.value=item.rir||'';tech.value=item.tech||'';note.value=item.note||'';done.textContent=r.edit?'Сохранить':'✓ Готово';$('#prev').disabled=r.ex===0;$('#next').disabled=r.ex===P[R].length-1;$('#prev').classList.toggle('disabled',r.ex===0);$('#next').classList.toggle('disabled',r.ex===P[R].length-1);tick();syncLifecycleUI();syncEditedBadge();renderWarmup();}
$('#setForm').addEventListener('submit',e=>{e.preventDefault();unlockSound();const r=S[R],c=cur(),w=weight.value.trim().replace(',','.'),rp=reps.value.trim();if(w&&(!Number.isFinite(Number(w))||Number(w)<0)){status.textContent='Проверь вес';weight.focus();return}if(rp&&(!Number.isFinite(Number(rp))||Number(rp)<0)){status.textContent='Проверь значение';reps.focus();return}const keepLegacyCompleted=r.edit&&!IS_GYM&&c.p.unit==='divisions'&&c.set.weightUnit!=='kg'&&w==='';if(keepLegacyCompleted){c.set.weightUnit='divisions';}else{if(!IS_GYM&&c.p.unit==='divisions'){if(c.set.weightUnit!=='kg'&&c.set.weight!=='')c.set.legacyWeight=c.set.weight;c.set.weightUnit='kg';}c.set.weight=w;}c.set.reps=rp;c.item.rir=rir.value;c.item.tech=tech.value;c.item.note=note.value.trim();if(r.edit){c.set.done=true;r.edit=false;status.textContent='Подход сохранён';persist();render();return}if(!started||finished){status.textContent='Сначала нажми «Начать тренировку»';return}c.set.done=true;carryForwardSetValues(c.item,r.set,w,rp,c.set.weightUnit);startRest();if(r.set+1<c.item.sets.length){r.set++}status.textContent='Подход выполнен';persist();render()});
root.querySelectorAll('[data-routine]').forEach(b=>b.addEventListener('click',()=>{
  const nextR=b.dataset.routine;
  if(nextR===R)return;
  if(started&&!finished){
    const ok=confirm(`Сейчас идёт тренировка ${R}. Переключиться на ${nextR}? Текущая тренировка останется незавершённой.`);
    if(!ok)return;
  }
  saveFields();R=nextR;summaryPanel.classList.add('hidden');finalPanel.classList.add('hidden');historyPanel.classList.add('hidden');persist();render();
}));
$('#minus').addEventListener('click',()=>adjust(-30));$('#plus').addEventListener('click',()=>adjust(30));$('#skip').addEventListener('click',skip);
$('#prev').addEventListener('click',()=>{saveFields();const r=S[R];if(r.ex>0){r.ex--;r.set=0;r.edit=false;persist();render()}});
$('#next').addEventListener('click',()=>{saveFields();const r=S[R];if(r.ex<P[R].length-1){r.ex++;r.set=0;r.edit=false;persist();render()}});
$('#finish').addEventListener('click',()=>{
  if(!started||finished){
    status.textContent='Сначала начни тренировку';
    syncLifecycleUI();
    return;
  }
  if(!confirm(`Завершить тренировку ${R}?`))return;
  saveFields();
  const ended=Date.now();
  const effectiveStart=started||ended;
  pendingFinish={S:JSON.parse(JSON.stringify(S)),R,started:effectiveStart,finished:ended,programVersion:PROGRAM.version};
  try{localStorage.setItem(PENDING,JSON.stringify(pendingFinish))}catch(e){}
  restRun=false;restEnd=null;restSec=120;signaled=false;clearTimerLoop();
  resetLiveWorkout(true);
  clock.textContent='00:00:00';rclock.textContent='02:00';rlabel.textContent='Отдых 2:00';
  finalPanel.classList.remove('hidden');
  summaryPanel.classList.add('hidden');
  status.textContent='Тренировка завершена · таймер и рабочие поля сброшены';
  syncLifecycleUI();
  render();
});
function makeSummary(){
  const snap=pendingFinish||{S,R,started,finished,programVersion:PROGRAM.version};
  const rr=snap.R,r=snap.S[rr],date=new Date(snap.finished||Date.now()).toLocaleDateString('ru-RU');
  const elapsed=snap.started?((snap.finished||Date.now())-snap.started)/1000:0;
  let total=0,out=[`ТРЕНИРОВКА ${rr} — ${date}`,`Время: ${fmt(elapsed)}`,''];
  P[rr].forEach((p,ei)=>{
    const item=r.items[ei],d=item.sets.map((s,i)=>({s,i})).filter(x=>x.s.done);
    if(!d.length)return;
    out.push(p.name);
    out.push(d.map(({s,i})=>{total++;if(IS_GYM&&p.bodyweight)return`${i+1}) свой вес${s.weight!==''?' + '+s.weight+' кг':''} × ${s.reps||'—'}`;if(s.weight!==''&&s.reps!=='')return`${i+1}) ${s.weight} ${(s.weightUnit==='divisions'||(p.unit==='divisions'&&s.weightUnit!=='kg'))?'делений':'кг'} × ${s.reps}`;return`${i+1}) ${s.reps||'—'}`}).join(' · '));
    const details=[];
    if(item.rir)details.push(`RIR последнего: ${item.rir}`);
    if(item.tech)details.push(`техника: ${item.tech}`);
    if(item.note)details.push(`комментарий: ${item.note}`);
    if(details.length)out.push(details.join(' · '));
    out.push('');
  });
  out.push(`Всего рабочих подходов: ${total}`);
  const diff=$('#difficulty').value.trim(),hard=$('#hardest').value.trim(),pain=$('#pain').value.trim();
  if(diff)out.push(`Общая тяжесть: ${diff}/10`);
  if(hard)out.push(`Самое тяжёлое упражнение: ${hard}`);
  if(pain)out.push(`Боль/дискомфорт: ${pain}`);
  out.push('');
  out.push(IS_GYM?'Проанализируй тренировку программы «Фитнес-зал»: сравни с предыдущими результатами этой программы, оцени прогрессию и безопасность техники.':'Проанализируй эту тренировку в контексте программы «116 дней»: сравни с предыдущими результатами, оцени прогрессию и скажи, что менять в следующей тренировке.');
  return out.join('\n');
}
function history(){try{return JSON.parse(localStorage.getItem(HISTORY))||[]}catch(e){return[]}}
// Four-day cycle is a recommendation, not a new training routine or a history exercise.
// A -> B -> C -> rest -> A. Rest acknowledgment is stored separately from workout data.
const REST_MARKER=STORE_NAMES[PROGRAM_ID].rest;
function syncCycleStatus(){
  const info=document.getElementById('cycleInfo');
  const complete=document.getElementById('cycleRestComplete');
  if(!info||!complete)return;
  const latest=history()[0];
  const next=latest?.routine==='A'?'B':latest?.routine==='B'?'C':latest?.routine==='C'?'Отдых':'A';
  const isRest=next==='Отдых' && String(localStorage.getItem(REST_MARKER)||'')!==String(latest.id);
  info.textContent='Цикл A → B → C → отдых · Следующий день: '+(isRest?'отдых':next==='Отдых'?'A':next);
  complete.classList.toggle('hidden',!isRest);
}
const cycleRestCompleteBtn=document.getElementById('cycleRestComplete');
if(cycleRestCompleteBtn)cycleRestCompleteBtn.addEventListener('click',()=>{
  const latest=history()[0];
  if(latest?.routine==='C'){
    localStorage.setItem(REST_MARKER,String(latest.id));
    syncCycleStatus();
  }
});
function exportLegacyPlanData(){
  const old=localStorage.getItem(LEGACY_PLAN_OVERRIDES);
  const saved=localStorage.getItem('tracker116-session-backup-12-10-2026');
  const pending=localStorage.getItem('tracker116-prior-pending-backup-12-10-2026');
  if(!old&&!saved&&!pending)return;
  const payload={type:'tracker116-previous-data-backup',exportedAt:new Date().toISOString(),programVersion:'12-10-2026',legacyPlanOverrides:old?JSON.parse(old):null,unfinishedSession:saved?JSON.parse(saved):null,unfinishedSummary:pending?JSON.parse(pending):null};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='SportTracker-backup-before-22-10-2026.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const exportPriorBtn=document.getElementById('exportPriorPlan');
if(exportPriorBtn){
  exportPriorBtn.addEventListener('click',exportLegacyPlanData);
  exportPriorBtn.classList.toggle('hidden',!localStorage.getItem(LEGACY_PLAN_OVERRIDES)&&!localStorage.getItem('tracker116-session-backup-12-10-2026')&&!localStorage.getItem('tracker116-prior-pending-backup-12-10-2026'));
}

function storeHistory(text){
  const h=history(),snap=pendingFinish||{S,R,started,finished:Date.now(),programVersion:PROGRAM.version};
  const raw={
    routine:snap.R,
    started:snap.started||null,
    finished:snap.finished||Date.now(),
    programVersion:snap.programVersion||PROGRAM.version,
    exercises:P[snap.R].map((p,ei)=>{
      const item=snap.S[snap.R].items[ei];
      return {
        name:p.name,
        plan:p.plan||'',
        rir:item.rir||'',
        technique:item.tech||'',
        note:item.note||'',
        sets:item.sets.map((s,i)=>IS_GYM?({set:i+1,weight:s.weight,reps:s.reps,done:!!s.done,unit:'kg',bodyweight:!!p.bodyweight}):({set:i+1,weight:s.weight,reps:s.reps,done:!!s.done,...(s.weightUnit?{unit:s.weightUnit}:{}),...(s.legacyWeight?{legacyWeight:s.legacyWeight}:{})}))
      };
    })
  };
  h.unshift({id:Date.now(),routine:snap.R,date:new Date(snap.finished||Date.now()).toISOString(),programVersion:snap.programVersion||PROGRAM.version,text,data:raw,...(IS_GYM?{programId:'gym'}:{})});
  localStorage.setItem(HISTORY,JSON.stringify(h.slice(0,100)));
  syncCycleStatus();
}
function deleteHistoryItem(id){
  const h=history().filter(x=>x.id!==id);
  localStorage.setItem(HISTORY,JSON.stringify(h));
  renderHistory();
  syncCycleStatus();
  status.textContent='Запись удалена из истории';
}
function renderHistory(){
  const h=history();historyList.innerHTML='';
  if(!h.length){historyList.textContent='Пока нет завершённых тренировок.';return}
  h.forEach(x=>{
    const d=document.createElement('div');d.className='history-item';
    const title=document.createElement('div');
    title.innerHTML=`<b>Тренировка ${x.routine}</b><div class="history-meta">${new Date(x.date).toLocaleString('ru-RU')} · программа ${x.programVersion}</div>`;
    const actions=document.createElement('div');actions.className='history-actions';
    const openBtn=document.createElement('button');openBtn.type='button';openBtn.textContent='Открыть сводку';
    openBtn.addEventListener('click',()=>{summary.value=x.text;summaryPanel.classList.remove('hidden');historyPanel.classList.add('hidden')});
    const delBtn=document.createElement('button');delBtn.type='button';delBtn.className='history-delete';delBtn.textContent='Удалить';
    delBtn.addEventListener('click',()=>{if(confirm(`Удалить тренировку ${x.routine} от ${new Date(x.date).toLocaleString('ru-RU')}?`))deleteHistoryItem(x.id)});
    actions.append(openBtn,delBtn);d.append(title,actions);historyList.appendChild(d);
  });
}

function exportHistory(){
  try{
    const payload={
      exportedAt:new Date().toISOString(),
      app:IS_GYM?'Фитнес-зал':'116 дней',
      appVersion:'2.3.0',
      programVersion:PROGRAM.version,
      history:history(),
      // Additional independent histories; legacy top-level history stays compatible.
      programHistories:{days116:readStoredJson(STORE_NAMES['116'].history,[]),gym:readStoredJson(STORE_NAMES.gym.history,[])}
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`tracker-116-history-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='История экспортирована';
  }catch(e){
    status.textContent='Не удалось экспортировать историю';
  }
}

$('#makeSummary').addEventListener('click',()=>{
  const text=makeSummary();
  summary.value=text;summaryPanel.classList.remove('hidden');storeHistory(text);
  pendingFinish=null;try{localStorage.removeItem(PENDING)}catch(e){}
  finalPanel.classList.add('hidden');
  $('#difficulty').value='';$('#hardest').value='';$('#pain').value='';
  status.textContent='Сводка сохранена в истории · трекер готов к новой тренировке';
});
$('#selectText').addEventListener('click',()=>{summary.focus();summary.select();summary.setSelectionRange(0,summary.value.length)});
soundBtn.addEventListener('click',()=>{soundEnabled=!soundEnabled;localStorage.setItem(SOUND_PREF,soundEnabled?'on':'off');updateSoundButton();if(soundEnabled){soundUnlocked=false;unlockSound();status.textContent='Звук отдыха включён'}else{restAudio.pause();restAudio.currentTime=0;leaveTransientAudioSession();status.textContent='Звук отдыха выключен'}});
$('#historyBtn').addEventListener('click',()=>{renderHistory();historyPanel.classList.remove('hidden');summaryPanel.classList.add('hidden');finalPanel.classList.add('hidden');closeSettings();historyPanel.scrollIntoView({behavior:'smooth',block:'start'})});
$('#closeHistory').addEventListener('click',()=>historyPanel.classList.add('hidden'));
if(settingsBtn) settingsBtn.addEventListener('click',openSettings);
$('#closeSettings')?.addEventListener('click',closeSettings);
document.addEventListener('click',e=>{
  if(e.target===settingsModal) closeSettings();
});
$('#exportHistoryBtn').addEventListener('click',exportHistory);
startWorkoutBtn.addEventListener('click',beginWorkout);
window.addEventListener('pagehide',saveFields);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveFields()});
if(started&&!finished&&!timer)timer=setInterval(tick,250);
if(restRun&&!timer)timer=setInterval(tick,250);
if(pendingFinish){finalPanel.classList.remove('hidden');clock.textContent='00:00:00';rclock.textContent='02:00';rlabel.textContent='Отдых 2:00'}
updateSoundButton();syncLifecycleUI();render();

// --- v1.8 local plan editor ---
let editorRoutine=null, editorExercise=null;

function getOverrides(){
  try{return JSON.parse(localStorage.getItem(PLAN_OVERRIDES)||'{}')||{}}
  catch(e){return{}}
}
function setOverrides(v){localStorage.setItem(PLAN_OVERRIDES,JSON.stringify(v))}
function overrideFor(r,ei){
  const o=getOverrides();
  return o?.[r]?.[ei]||null;
}
function effectiveExercise(r,ei){
  const base=P[r][ei];
  const ov=overrideFor(r,ei);
  return ov ? {...base,...ov} : base;
}
function applyOverrideToProgram(){
  const o=getOverrides();
  ['A','B','C'].forEach(r=>{
    if(!o[r])return;
    Object.keys(o[r]).forEach(k=>{
      const i=Number(k);
      if(P[r] && P[r][i]) P[r][i]={...P[r][i],...o[r][k]};
    });
  });
}

function openPlanEditor(r,ei){
  editorRoutine=r; editorExercise=ei;
  const p=effectiveExercise(r,ei);
  document.getElementById('planEditorName').textContent=`${r}: ${p.name}`;
  document.getElementById('editExerciseName').value=p.name||'';
  document.getElementById('editPlanText').value=p.plan||'';
  document.getElementById('editWeight').value=(!IS_GYM&&p.unit==='divisions')?'':(p.w??'');
  document.getElementById('editSetsCount').value=p.sets||((p.t||[]).length||1);
  document.getElementById('editTargets').value=(p.t||[]).join(',');
  document.getElementById('editWarmText').value=p.warm||'';
  document.getElementById('planEditorModal').classList.remove('hidden');
}
function closePlanEditor(){document.getElementById('planEditorModal').classList.add('hidden')}
$('#settingsPlanBtn').addEventListener('click',()=>{closeSettings();openPlanEditor(R,S[R].ex);$('#planDataDetails').open=true;});
function syncEditedBadge(){
  const badge=$('#editedBadge');
  if(!badge)return;
  const edited=!!overrideFor(R,S[R].ex);
  badge.classList.toggle('hidden',!edited);
}







function readStoredJson(key,fallback){
  try{const value=JSON.parse(localStorage.getItem(key));return value==null?fallback:value}catch(e){return fallback}
}
function snapshotProgram(id){
  const keys=STORE_NAMES[id];
  return {
    overrides:readStoredJson(keys.overrides,{}),
    history:readStoredJson(keys.history,[]),
    state:readStoredJson(keys.state,null),
    pending:readStoredJson(keys.pending,null),
    warmup:readStoredJson(keys.warmup,null),
    restMarker:localStorage.getItem(keys.rest)
  };
}
function mergeHistories(current, incoming){
  if(!Array.isArray(current)||!Array.isArray(incoming))throw new Error('Некорректная история в файле.');
  const result=[...current];
  const keys=new Set(current.map(x=>JSON.stringify([x.id,x.routine,x.date,x.programVersion])));
  for(const item of incoming){
    if(!item || typeof item!=='object'||Array.isArray(item))throw new Error('Некорректная запись истории.');
    const key=JSON.stringify([item.id,item.routine,item.date,item.programVersion]);
    if(!keys.has(key)){result.push(item);keys.add(key)}
  }
  result.sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
  return result; // Do not truncate history on backup import.
}
function importDualPlanBackup(data){
  const dual=data.sporttrackerDual;
  if(!dual || dual.schemaVersion!==1 || !dual.programs || typeof dual.programs!=='object')throw new Error('Неверный формат двух программ.');
  const verified={};
  for(const [id,field] of [['116','days116'],['gym','gym']]){
    const entry=dual.programs[field];
    if(!entry || typeof entry!=='object'||Array.isArray(entry))throw new Error('Отсутствует программа '+field);
    const base= id==='gym'?window.PROGRAM_GYM:window.PROGRAM_116;
    verified[id]={
      overrides:validatePlanOverridePayload({type:'tracker116-local-plan-overrides',schemaVersion:1,overrides:entry.overrides||{}},base.routines),
      history:entry.history||[],
      state:entry.state??null,
      pending:entry.pending??null,
      warmup:entry.warmup??null,
      restMarker:entry.restMarker??null
    };
    if(!Array.isArray(verified[id].history))throw new Error('История программы '+field+' повреждена');
    if(verified[id].state!==null && (typeof verified[id].state!=='object'||Array.isArray(verified[id].state)))throw new Error('Некорректное состояние '+field);
    if(verified[id].pending!==null && (typeof verified[id].pending!=='object'||Array.isArray(verified[id].pending)))throw new Error('Некорректная сводка '+field);
  }
  // Do not replace plan targets while a session or an unfinalized summary is pending.
  for(const id of ['116','gym']){
    const keys=STORE_NAMES[id],current=readStoredJson(keys.state,null),pending=readStoredJson(keys.pending,null);
    if((current?.started&&!current.finished)||pending){
      throw new Error('Заверши тренировку и сохрани сводку в обеих программах перед импортом общего архива. Данные не изменены.');
    }
  }
  if(!confirm('Импортировать обе программы? Истории будут объединены, а настройки упражнений восстановлены.'))return false;
  // Backup both current namespaces, without replacing or deleting anything else.
  saveFields();
  const backup={exportedAt:new Date().toISOString(),programs:{days116:snapshotProgram('116'),gym:snapshotProgram('gym')}};
  localStorage.setItem('sporttracker-before-dual-import-'+Date.now(),JSON.stringify(backup));
  for(const id of ['116','gym']){
    const keys=STORE_NAMES[id],v=verified[id];
    localStorage.setItem(keys.overrides,JSON.stringify(v.overrides));
    localStorage.setItem(keys.history,JSON.stringify(mergeHistories(readStoredJson(keys.history,[]),v.history)));
    // Keep any running workout intact; otherwise rebuild idle fields from imported targets.
    const currentSession=readStoredJson(keys.state,null);
    if(!currentSession?.started || currentSession.finished){
      if(v.state?.started && !v.state.finished)localStorage.setItem(keys.state,JSON.stringify(v.state));
      else localStorage.removeItem(keys.state);
    }
    if(!localStorage.getItem(keys.pending) && v.pending)localStorage.setItem(keys.pending,JSON.stringify(v.pending));
    if(!localStorage.getItem(keys.warmup) && v.warmup)localStorage.setItem(keys.warmup,JSON.stringify(v.warmup));
    if(!localStorage.getItem(keys.rest) && v.restMarker!==null)localStorage.setItem(keys.rest,String(v.restMarker));
  }
  location.reload();
  return true;
}
function exportPlanOverridesFile(){
  saveFields(); // Include the latest unsaved inputs of the active workout.
  // Preserve the existing schema-1 top-level fields for old 116-day importers.
  // The optional extension contains independent settings, history and sessions.
  const payload={
    type:'tracker116-local-plan-overrides',
    schemaVersion:1,
    exportedAt:new Date().toISOString(),
    baseProgramVersion:window.PROGRAM_116.version||null,
    overrides:readStoredJson(STORE_NAMES['116'].overrides,{}),
    sporttrackerDual:{schemaVersion:1,programs:{
      days116:snapshotProgram('116'),
      gym:snapshotProgram('gym')
    }}
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const stamp=new Date().toISOString().slice(0,10);
  a.href=url;
  a.download=`SportTracker-two-programs-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function validatePlanOverridePayload(data,catalogue=window.PROGRAM_116.routines){
  if(!data || typeof data!=='object') throw new Error('Файл не содержит JSON-объект.');
  if(data.type!=='tracker116-local-plan-overrides') throw new Error('Это не файл локальных изменений трекера 116.');
  if(data.schemaVersion!==1) throw new Error('Неподдерживаемая версия файла.');
  if(!data.overrides || typeof data.overrides!=='object' || Array.isArray(data.overrides)) throw new Error('В файле нет корректного блока overrides.');
  const clean={};
  for(const r of ['A','B','C']){
    if(!data.overrides[r]) continue;
    if(typeof data.overrides[r]!=='object' || Array.isArray(data.overrides[r])) throw new Error(`Некорректный раздел ${r}.`);
    clean[r]={};
    for(const [k,v] of Object.entries(data.overrides[r])){
      const i=Number(k);
      if(!Number.isInteger(i) || i<0 || !catalogue[r] || !catalogue[r][i]) throw new Error(`Некорректный индекс упражнения в ${r}: ${k}`);
      if(!v || typeof v!=='object' || Array.isArray(v)) throw new Error(`Некорректные данные упражнения ${r}/${k}.`);
      const allowed={};
      if('name' in v){
        if(typeof v.name!=='string' || !v.name.trim() || v.name.length>160) throw new Error(`Некорректное название упражнения в ${r}/${k}.`);
        allowed.name=v.name.trim();
      }
      if('plan' in v) allowed.plan=String(v.plan ?? '');
      if('sets' in v){
        const sets=Number(v.sets);
        if(!Number.isInteger(sets) || sets<1 || sets>12) throw new Error(`Некорректное количество подходов в ${r}/${k}.`);
        allowed.sets=sets;
      }
      if('t' in v){
        if(!Array.isArray(v.t) || v.t.length<1 || v.t.length>12 || v.t.some(x=>!Number.isFinite(Number(x)))) throw new Error(`Некорректные повторы/секунды в ${r}/${k}.`);
        allowed.t=v.t.map(Number);
      }
      if('w' in v) allowed.w=String(v.w ?? '');
      if('unit' in v){if(v.unit!=='kg')throw new Error('Допустима только единица кг.');allowed.unit='kg';}
      if('warm' in v) allowed.warm=String(v.warm ?? '');
      clean[r][i]=allowed;
    }
    if(!Object.keys(clean[r]).length) delete clean[r];
  }
  return clean;
}

function applyImportedOverrides(clean){
  setOverrides(clean);
  for(const r of ['A','B','C']){
    if(!clean[r]) continue;
    for(const [k,ov] of Object.entries(clean[r])){
      const i=Number(k);
      const wasLegacyDivisions=!IS_GYM&&P[r][i].unit==='divisions';
      P[r][i]={...P[r][i],...ov};
      const item=S[r]?.items?.[i];
      if(item){
        const sets=ov.sets || P[r][i].sets || ov.t?.length || item.sets.length || 1;
        const targets=ov.t || P[r][i].t || [];
        const oldSets=Array.isArray(item.sets)?item.sets:[];
        const rebuilt=[];
        for(let si=0;si<sets;si++){
          const old=oldSets[si];
          if(old && old.done){
            rebuilt.push({...old,...(wasLegacyDivisions && ov.unit==='kg' && !old.weightUnit ? {weightUnit:'divisions'} : {})});
          }else{
            rebuilt.push({
              weight: ('w' in ov) ? ov.w : (old?.weight ?? P[r][i].w ?? ''),
              ...(wasLegacyDivisions && ov.unit==='kg'?{weightUnit:'kg',legacyWeight:old?.weight||''}:{}),
              reps: targets[si] ?? old?.reps ?? 0,
              done:false
            });
          }
        }
        item.sets=rebuilt;
        if(item.set>=sets)item.set=Math.max(0,sets-1);
      }
    }
  }
  persist();
  render();
}

async function importPlanOverridesFile(file){
  if(!file) return;
  const text=await file.text();
  const data=JSON.parse(text);
  if(data.sporttrackerDual){importDualPlanBackup(data);return;}
  const clean=validatePlanOverridePayload(data,window.PROGRAM_116.routines);
  if(IS_GYM){
    // Imported legacy files are *always* for 116 days, never fitness-gym exercises.
    localStorage.setItem(STORE_NAMES['116'].overrides,JSON.stringify(clean));
    status.textContent='Локальный план «116 дней» импортирован отдельно от «Фитнес-зала»';
  }else{
    applyImportedOverrides(clean);
    status.textContent='Локальные изменения плана импортированы';
  }
}

window.importPlanOverridesFile = importPlanOverridesFile;

document.addEventListener('click',function(e){
  const edit=e.target.closest('#editPlanBtn');
  if(edit){
    e.preventDefault();
    e.stopPropagation();
    openPlanEditor(R,S[R].ex);
    return;
  }
  if(e.target.closest('#closePlanEditor')){
    e.preventDefault(); closePlanEditor(); return;
  }
  if(e.target===document.getElementById('planEditorModal')){
    closePlanEditor(); return;
  }
  if(e.target.closest('#savePlanEdit')){
    e.preventDefault();
    if(editorRoutine==null||editorExercise==null)return;
    const q=id=>document.getElementById(id);
    const sets=Math.max(1,Math.min(12,Number(q('editSetsCount').value)||1));
    let targets=q('editTargets').value.split(',').map(x=>x.trim()).filter(Boolean).map(Number).filter(Number.isFinite);
    if(!targets.length) targets=Array.from({length:sets},()=>0);
    if(targets.length<sets) targets=targets.concat(Array.from({length:sets-targets.length},()=>targets[targets.length-1]||0));
    if(targets.length>sets) targets=targets.slice(0,sets);
    const hadLegacyDivisions=!IS_GYM&&P[editorRoutine][editorExercise].unit==='divisions';
    const editedName=q('editExerciseName').value.trim();
    if(!editedName){status.textContent='Название упражнения не может быть пустым';q('editExerciseName').focus();return;}
    const prior=overrideFor(editorRoutine,editorExercise)||{};
    const ov={...prior,name:editedName,plan:q('editPlanText').value.trim(),sets,t:targets,warm:q('editWarmText').value.trim()};
    const weight=q('editWeight').value.trim();
    if(IS_GYM || weight!=='')ov.w=weight;
    if(hadLegacyDivisions && weight!=='')ov.unit='kg';
    const all=getOverrides();
    all[editorRoutine]=all[editorRoutine]||{};
    all[editorRoutine][editorExercise]=ov;
    setOverrides(all);
    P[editorRoutine][editorExercise]={...P[editorRoutine][editorExercise],...ov};
    {
      const item=S[editorRoutine].items[editorExercise];
      const oldSets=Array.isArray(item.sets)?item.sets:[];
      const rebuilt=[];
      for(let i=0;i<sets;i++){
        const old=oldSets[i];
        // Уже выполненные подходы сохраняем как факт тренировки.
        if(old && old.done){
          rebuilt.push({...old,...(hadLegacyDivisions && ov.unit==='kg' && !old.weightUnit ? {weightUnit:'divisions'} : {})});
        }else{
          rebuilt.push({
            weight: (IS_GYM || weight!=='') ? weight : (old?.weight ?? ''),
            ...(ov.unit==='kg'?{weightUnit:'kg',legacyWeight:old?.weight||''}:{}),
            reps: targets[i] ?? (old?.reps ?? 0),
            done:false
          });
        }
      }
      item.sets=rebuilt;
      // Если текущий индекс оказался за пределами после уменьшения числа подходов —
      // переносим его на последний доступный подход.
      if(item.set>=sets)item.set=Math.max(0,sets-1);
    }
    persist(); closePlanEditor(); render();
    status.textContent='План упражнения обновлён локально';
    return;
  }
  if(e.target.closest('#exportPlanOverrides')){
    e.preventDefault();
    exportPlanOverridesFile();
    status.textContent='Файл локальных изменений подготовлен';
    return;
  }
  if(e.target.closest('#importPlanOverrides')){
    e.preventDefault();
    const input=document.getElementById('importPlanFile');
    if(input){ input.value=''; input.click(); }
    return;
  }
  if(e.target.closest('#resetAllPlanOverrides')){
    e.preventDefault();
    if(confirm('Сбросить все локальные изменения плана A/B/C? Каноническая программа program.js останется без изменений.')){
      localStorage.removeItem(PLAN_OVERRIDES);
      location.reload();
    }
    return;
  }
  if(e.target.closest('#resetPlanEdit')){
    e.preventDefault();
    if(editorRoutine==null||editorExercise==null)return;
    const all=getOverrides();
    if(all[editorRoutine])delete all[editorRoutine][editorExercise];
    if(all[editorRoutine]&&!Object.keys(all[editorRoutine]).length)delete all[editorRoutine];
    setOverrides(all);
    location.reload();
  }
},true);

})();



// --- Web Push v2.1: safe on/off and iOS re-subscription ---
const PUSH_PREF='tracker116-push-enabled-v1';
let currentRestPushJobId=null;
let pushRegistration=null;
let pushSubscription=null;
let pushToggleInFlight=false;

function pushConfig(){
  return window.TRACKER_PUSH_CONFIG || {BACKEND_URL:'',VAPID_PUBLIC_KEY:''};
}
function base64UrlToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData=atob(base64);
  return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
}
// Cache the existing SW registration before the user taps the push button.
// On iOS, the call to pushManager.subscribe() should start during a user gesture.
if('serviceWorker' in navigator){
  navigator.serviceWorker.ready.then(async reg=>{
    pushRegistration=reg;
    try{pushSubscription=await reg.pushManager.getSubscription();}catch(e){console.warn('push preflight',e);}
  }).catch(e=>console.warn('push registration unavailable',e));
}
async function getPushSubscription(){
  if(!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Web Push не поддерживается этим браузером.');
  const reg=pushRegistration||await navigator.serviceWorker.ready;
  pushRegistration=reg;
  pushSubscription=await reg.pushManager.getSubscription();
  return pushSubscription;
}
async function registerPushOnServer(sub){
  const cfg=pushConfig();
  let r;
  try{
    r=await fetch(cfg.BACKEND_URL.replace(/\/$/,'')+'/api/subscribe',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subscription:sub})
    });
  }catch(e){
    throw new Error('Не удалось связаться с сервером уведомлений. Проверь подключение к интернету и попробуй ещё раз.');
  }
  if(!r.ok) throw new Error('Сервер уведомлений отклонил подписку (HTTP '+r.status+').');
  localStorage.setItem(PUSH_PREF,'1');
  return sub;
}
async function ensurePushSubscription(prestartedSubscription){
  const cfg=pushConfig();
  if(!cfg.BACKEND_URL || !cfg.VAPID_PUBLIC_KEY) throw new Error('Не задан сервер уведомлений или ключ VAPID.');
  let sub=prestartedSubscription?await prestartedSubscription:await getPushSubscription();
  if(!sub){
    const reg=pushRegistration||await navigator.serviceWorker.ready;
    pushRegistration=reg;
    sub=await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:base64UrlToUint8Array(cfg.VAPID_PUBLIC_KEY)
    });
  }
  pushSubscription=sub;
  return registerPushOnServer(sub);
}
async function disablePush(){
  // Pausing notifications must NOT destroy the browser's push subscription.
  // Otherwise, re-enabling on iOS requires a new permission-sensitive subscribe().
  localStorage.removeItem(PUSH_PREF);
  await cancelRestPush();
  syncNotifyButton();
}
async function enablePushFromClick(){
  if(!('Notification' in window)) throw new Error('Уведомления не поддерживаются. Открой установленный SportTracker с экрана «Домой».');
  if(!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Web Push недоступен. Открой приложение с домашнего экрана iPhone.');
  const cfg=pushConfig();
  if(!cfg.BACKEND_URL || !cfg.VAPID_PUBLIC_KEY) throw new Error('Не задан сервер уведомлений или ключ VAPID.');
  if(Notification.permission==='denied') throw new Error('Уведомления заблокированы в iOS. Разреши их в Настройки → Уведомления → SportTracker.');

  // Start a needed new subscription synchronously from the tap, before any await.
  // This repairs subscriptions that the previous version removed with unsubscribe().
  let startedSub=null;
  if(Notification.permission==='granted' && pushRegistration && !pushSubscription){
    startedSub=pushRegistration.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:base64UrlToUint8Array(cfg.VAPID_PUBLIC_KEY)
    });
  }
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  if(permission!=='granted') throw new Error('Разрешение на уведомления не получено. Проверь настройки уведомлений iOS.');
  // If the permission prompt was needed, normal registration can continue now.
  await ensurePushSubscription(startedSub);
  syncNotifyButton();
}
function syncNotifyButton(){
  const b=document.getElementById('notifyBtn');
  if(!b)return;
  const enabled=localStorage.getItem(PUSH_PREF)==='1' && ('Notification' in window) && Notification.permission==='granted';
  b.setAttribute('aria-pressed',enabled?'true':'false');
  b.textContent=enabled?'🔔 Уведомления ✓':'🔔 Уведомления';
}
async function scheduleRestPush(seconds){
  if(localStorage.getItem(PUSH_PREF)!=='1') return;
  if(!('Notification' in window)||Notification.permission!=='granted') return;
  const cfg=pushConfig();
  if(!cfg.BACKEND_URL || !cfg.VAPID_PUBLIC_KEY) return;
  try{
    const sub=await ensurePushSubscription();
    await cancelRestPush();
    const sendAt=new Date(Date.now()+Math.max(1,seconds)*1000).toISOString();
    const r=await fetch(cfg.BACKEND_URL.replace(/\/$/,'')+'/api/schedule',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        subscription:sub,
        sendAt,
        title:'Отдых закончен',
        body:'Пора начинать следующий подход.',
        tag:'tracker116-rest'
      })
    });
    if(!r.ok) throw new Error('Не удалось назначить push.');
    const data=await r.json();
    currentRestPushJobId=data.jobId||null;
  }catch(e){
    console.warn('scheduleRestPush failed',e);
  }
}
async function cancelRestPush(){
  if(!currentRestPushJobId) return;
  const cfg=pushConfig();
  if(!cfg.BACKEND_URL){currentRestPushJobId=null;return;}
  try{
    await fetch(cfg.BACKEND_URL.replace(/\/$/,'')+'/api/cancel/'+encodeURIComponent(currentRestPushJobId),{method:'POST'});
  }catch(e){}
  currentRestPushJobId=null;
}

window.addEventListener('DOMContentLoaded',()=>{
  const b=document.getElementById('notifyBtn');
  if(b){
    b.addEventListener('click',async()=>{
      if(pushToggleInFlight)return;
      pushToggleInFlight=true;
      b.disabled=true;
      try{
        const enabled=localStorage.getItem(PUSH_PREF)==='1' && ('Notification' in window) && Notification.permission==='granted';
        if(enabled){
          if(confirm('Отключить уведомления об окончании отдыха?')) await disablePush();
        }else{
          await enablePushFromClick();
          status.textContent='Уведомления включены';
        }
      }catch(e){
        alert(e?.message||String(e));
      }finally{
        pushToggleInFlight=false;
        b.disabled=false;
        syncNotifyButton();
      }
    });
  }
  syncNotifyButton();
});

// --- PWA update controls v1.3 ---
const TRACKER_APP_VERSION = '2.3.2';

async function forceTrackerUpdate() {
  const btn = document.getElementById('trackerUpdateBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Проверяю…'; }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
      }
    }
    // Reload from the server; SW v1.3 uses network-first for navigation/assets.
    window.location.reload();
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Обновить';
    }
    alert('Не удалось проверить обновление. Проверь интернет и попробуй ещё раз.');
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!sessionStorage.getItem('tracker116-reloaded-v22')) {
      sessionStorage.setItem('tracker116-reloaded-v22', '1');
      window.location.reload();
    }
  });
}



window.addEventListener('DOMContentLoaded',()=>{
  const input=document.getElementById('importPlanFile');
  if(input){
    input.addEventListener('change',async()=>{
      try{
        await importPlanOverridesFile(input.files?.[0]);
        document.getElementById('planDataDetails')?.removeAttribute('open');
      }catch(err){
        alert('Не удалось импортировать файл: '+(err?.message||err));
      }finally{
        input.value='';
      }
    });
  }
});

window.addEventListener('DOMContentLoaded',()=>{
  const v=document.getElementById('appVersionLabel');
  if(v)v.textContent='v'+TRACKER_APP_VERSION;
  const b=document.getElementById('trackerUpdateBtn');
  if(b)b.addEventListener('click',forceTrackerUpdate);
});
