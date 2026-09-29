(async function(){
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
if(!window.QM||!window.Solar){document.querySelector('.wrap').insertAdjacentHTML('beforeend','<div class="card">历法库没有加载成功，请检查网络后刷新页面。</div>');return;}

// ---------- 释义 ----------
let D;
try{D=Object.fromEntries(await Promise.all(['symbols','kb','ganke','bamen','cases'].map(async n=>{const r=await fetch(n+'.json',{cache:'no-cache'});if(!r.ok)throw new Error(n+'.json '+r.status);return [n,await r.json()];})));}
catch(err){document.querySelector('.wrap').insertAdjacentHTML('beforeend','<div class="card">资料文件没有加载成功（'+String(err.message||err)+'），请检查网络后刷新页面。</div>');return;}
const {INFO,GUA_INFO}=D.symbols;const KB_CATS=D.kb.cats,KB=D.kb.articles,GANKE=D.ganke,BAMEN_DD=D.bamen.dd,BAMEN_DG=D.bamen.dg,CASES=D.cases;
const levelChip=l=>`<span class="chip ${l==='吉'||l==='大吉'?'ji':l==='凶'?'xiong':''}">${esc(l)}</span>`;
const NUMCN='一二三四五六七八九';

let state={dt:null,method:'chaibu',res:null,sel:null,birth:null,tst:false,city:'101.69,8',lon:101.69,tz:-new Date().getTimezoneOffset()/60};
try{const m=localStorage.getItem('qm-method');if(m==='zhirun'||m==='chaibu')state.method=m;
  const s=JSON.parse(localStorage.getItem('qm-solar')||'null');if(s){state.tst=!!s.tst;state.city=s.city;state.lon=+s.lon;state.tz=+s.tz;}}catch(e){}
try{const b=+localStorage.getItem('qm-birth');if(b>=1900&&b<=2100)state.birth=b;}catch(e){}
function saveSolar(){try{localStorage.setItem('qm-solar',JSON.stringify({tst:state.tst,city:state.city,lon:state.lon,tz:state.tz}))}catch(e){}}
const fmtMin=x=>{const s=x<0?'−':'+';x=Math.abs(x);const m=Math.floor(x),sec=Math.round((x-m)*60);return `${s}${m}分${sec?sec+'秒':''}`;};

function pad(n){return String(n).padStart(2,'0');}
function setInput(d){$('#dt').value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
function readInput(){const v=$('#dt').value;if(!v)return null;const [a,b]=v.split('T');const [y,m,d]=a.split('-').map(Number);const [h,mi]=b.split(':').map(Number);return new Date(y,m-1,d,h,mi);}

function compute(){
  const d=readInput();if(!d)return;
  const Y=d.getFullYear(),M=d.getMonth()+1,D=d.getDate(),H=d.getHours(),MI=d.getMinutes();
  $('.solar-row').dataset.off=state.tst?'0':'1';
  if(state.tst&&isFinite(state.lon)&&isFinite(state.tz)){
    const s=QM.trueSolar(Y,M,D,H,MI,state.lon,state.tz);
    const hm=s.solar.toYmdHms().slice(0,16);
    const note=`真太阳时：钟表 ${pad(H)}:${pad(MI)}（UTC+${state.tz}）经度差 ${fmtMin(s.lonMin)}、均时差 ${fmtMin(s.eot)}，得 ${hm}；四柱时日按真太阳时，节气与年月柱按实际交节时刻。`;
    $('#solarOut').innerHTML=`→ 真太阳时 <b>${hm.slice(11)}</b>${hm.slice(0,10)!==`${Y}-${pad(M)}-${pad(D)}`?'（'+hm.slice(5,10)+'）':''} · 经度差 ${fmtMin(s.lonMin)} · 均时差 ${fmtMin(s.eot)}`;
    state.res=QM.paiPan(s.solar,{method:state.method,jqSolar:s.jqSolar,timeNote:note});
  } else {
    $('#solarOut').textContent=state.tst?'请填写经度和时区。':'未校正，按钟表时间起局。';
    state.res=QM.fromDate(Y,M,D,H,MI,{method:state.method});
  }
  render();
  if(window.renderLP&&!$('#view-lp').hidden)renderLP();
}

function tok(kind,key,cls,label,extra=''){
  const sel=state.sel&&state.sel.kind===kind&&state.sel.key===key&&(state.sel.p==null||String(state.sel.p)===String(extra))?' sel':'';
  return `<button class="tok ${cls}${sel}" data-kind="${kind}" data-key="${esc(key)}" data-p="${extra}">${esc(label)}</button>`;
}

function render(){
  const r=state.res;
  const gz=r.gz;
  $('#pillars').innerHTML=[['年',gz.year],['月',gz.month],['日',gz.day],['时',gz.hour]].map(([k,v])=>`<div class="pillar"><b>${v}</b><span>${k}柱</span></div>`).join('');
  $('#juline').innerHTML=`${r.yang?'阳':'阴'}遁${NUMCN[r.J-1]}局<small>${r.ju.jieqi}${r.ju.run?'（闰）':''} · ${['上元','中元','下元'][r.ju.yuan]} · ${r.ju.method}</small>`;
  $('#meta').innerHTML=[
    `<span class="chip brass">值符 ${r.zhiFu}</span>`,
    `<span class="chip acc">值使 ${r.zhiShi}</span>`,
    `<span class="chip">旬首 ${r.xun}${r.xunYi}</span>`,
    `<span class="chip">空亡 ${r.kong.join('')}</span>`,
    `<span class="chip">马星 ${r.ma}</span>`,
    '甲乙丙丁戊'.includes(gz.hour[0])?'<span class="chip" title="五阳时：利客，宜先动">五阳时 · 利客</span>':'<span class="chip" title="五阴时：利主，宜后动">五阴时 · 利主</span>'
  ].join('');
  // 年月日时干与年命干的天盘落宫
  const marks={};const addMark=(gan,lab)=>{for(const q of [1,2,3,4,6,7,8,9]){const g=r.palaces[q];if(g.tian===gan||g.tianExtra===gan){(marks[q]=marks[q]||[]).push(lab);}}};
  addMark(QM.ganOf(gz.year),'年');addMark(QM.ganOf(gz.month),'月');addMark(QM.ganOf(gz.day),'日');addMark(QM.ganOf(gz.hour),'时');
  if(state.birth){const bgz=QM.GZ[((state.birth-4)%60+60)%60];addMark(QM.ganOf(bgz),'命');
    const bp=Object.keys(marks).find(q=>marks[q].includes('命'));
    $('#birthOut').innerHTML=`年命 <b>${bgz}</b>（${bgz[0]==='甲'?'甲遁于'+QM.ganOf(bgz)+'，':''}天盘${QM.ganOf(bgz)}）落 ${bp?r.palaces[bp].gua+NUMCN[bp-1]+'宫':'—'}。立春前出生的请填前一年。`;}
  r.marks=marks;
  const order=[4,9,2,3,5,7,8,1,6];
  $('#grid9').innerHTML=order.map(p=>{
    const g=r.palaces[p];
    const wm=`<span class="wm">${g.gua}</span>`;
    if(p===5){
      return `<div class="gong center" data-p="5">${wm}<button class="tok gname" data-kind="gong" data-key="5">中五宫</button>${tok('gan',g.di,'gan di',g.di,5)}<span class="note">地盘干寄坤二<br>天禽随天芮</span></div>`;
    }
    const badges=(r.marks[p]||[]).map(x=>`<span class="b ${x==='命'?'ming':'yong'}">${x}</span>`).join('')+(g.kong?'<span class="b kong">空</span>':'')+(g.ma?'<span class="b ma">马</span>':'');
    const cls=['gong'];if(state.sel&&state.sel.kind==='full'&&+state.sel.p===p)cls.push('picked');if(r.zhiFuPal===p)cls.push('fu');if(r.zhiShiPal===p)cls.push('shi');
    return `<div class="${cls.join(' ')}" data-p="${p}">${wm}
      <div class="top">${tok('god',g.god,'god',g.god,p)}<span class="badges">${badges}<button class="tok gname" data-kind="gong" data-key="${p}">${g.gua}${NUMCN[p-1]}</button></span></div>
      <div class="l">${tok('star',g.star,'star',g.star,p)}${g.qin?tok('star','天禽','qin','禽',p):''}</div>
      <div class="r">${g.tianExtra?tok('gan',g.tianExtra,'gan x',g.tianExtra,p):''}${tok('gan',g.tian,'gan',g.tian,p)}</div>
      <div class="l">${tok('door',g.door,'door',g.door,p)}</div>
      <div class="r">${tok('gan',g.di,'gan di',g.di,p)}</div>
    </div>`;
  }).join('');
  $('#grid9').classList.toggle('full',!!state.full);
  $('#steps').innerHTML=r.steps.map(s=>`<li><div><b>${esc(s.t.replace(/^\d+\.\s*/,''))}</b><span>${esc(s.d)}</span></div></li>`).join('');
  const pf=state.patf||'all';const useP=Object.keys(r.marks||{}).map(Number);
  const pOK=x=>{if(pf==='all')return true;if(pf==='ji')return /吉/.test(x.level)&&!/凶/.test(x.level);if(pf==='xiong')return /凶/.test(x.level)&&!/吉/.test(x.level);
    const m=x.where.match(/(\d)宫/);return m?useP.includes(+m[1]):false;};
  const pats=r.patterns.map((x,i)=>[x,i]).filter(([x])=>pOK(x));
  $('#patcount').textContent=r.patterns.length?(pf==='all'?`${r.patterns.length} 项`:`${pats.length} / ${r.patterns.length} 项`):'';
  document.querySelectorAll('#patf button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.f===pf));
  $('#pats').innerHTML=pats.length?pats.map(([x,i])=>`<li><button data-i="${i}">${levelChip(x.level)}<span><span class="nm">${esc(x.name)}</span> <span class="chip">${esc(x.where)}</span></span><span class="ds">${esc(x.desc)}</span></button></li>`).join(''):`<li class="empty">${r.patterns.length?(pf==='use'?'用神（年月日时干、年命）所在宫没有格局。':'没有这一类格局。'):'这一盘没有命中常见格局。'}</li>`;
  renderExplain();
  renderJuTable();
}

function palaceLine(p){
  const g=state.res.palaces[p];
  return `${g.gua}${NUMCN[p-1]}宫（${g.dir}，${g.wx}）`;
}
const ZWX={子:'水',亥:'水',寅:'木',卯:'木',巳:'火',午:'火',申:'金',酉:'金',辰:'土',戌:'土',丑:'土',未:'土'};
const WS={木:'火',火:'土',土:'金',金:'水',水:'木'},WK={木:'土',土:'水',水:'火',火:'金',金:'木'};
const starWS=(e,m)=>e===m?'相':WS[e]===m?'旺':WK[e]===m?'休':WK[m]===e?'囚':'废';
const doorWS=(e,m)=>e===m?'旺':WS[m]===e?'相':WS[e]===m?'休':WK[e]===m?'囚':'死';
function rel(a,b,an,bn){if(a===b)return `${an}与${bn}比和（同属${a}）`;if(WS[a]===b)return `${an}（${a}）生${bn}（${b}）`;if(WS[b]===a)return `${bn}（${b}）生${an}（${a}）`;
  if(WK[a]===b)return `${an}（${a}）克${bn}（${b}）`;return `${bn}（${b}）克${an}（${a}）`;}
const wsChip=v=>`<span class="chip ${/旺|相/.test(v)?'ji':/囚|死/.test(v)?'xiong':''}">${v}</span>`;
function renderFull(k){
  const r=state.res,g=r.palaces[k],gi=GUA_INFO[k],mz=r.gz.month[1],mw=ZWX[mz];
  const si=INFO.star[g.star],di=INFO.door[g.door],god=INFO.god[g.god];
  const sws=starWS(si[1],mw),dws=doorWS(di[1],mw);
  const dst=QM.doorState(g.door,k);
  const marks=(r.marks[k]||[]);
  const tians=[g.tian,g.tianExtra].filter(Boolean);
  const pats=r.patterns.filter(x=>x.where.startsWith(g.gua));
  const glob=r.patterns.filter(x=>x.where==='全盘');
  const sec=(t,b)=>`<div class="fx-sec"><h4>${t}</h4>${b}</div>`;
  const tags=[];
  if(r.zhiFuPal===k)tags.push('<span class="chip brass">值符落此</span>');if(r.zhiShiPal===k)tags.push('<span class="chip acc">值使落此</span>');
  marks.forEach(x=>tags.push(`<span class="chip acc">${x==='命'?'年命':x+'干'}</span>`));
  if(g.kong)tags.push('<span class="chip xiong">空亡</span>');if(g.ma)tags.push('<span class="chip">驿马</span>');
  let h=`<div class="ex-title"><b>${g.gua}${NUMCN[k-1]}宫 · 整宫释义</b><span class="chip">${g.dir}</span><span class="chip">五行 ${g.wx}</span>${tags.join('')}</div>`;
  // 一句话概览
  const sum=[];
  sum.push(`神：<b>${g.god}</b>；星：<b>${g.star}</b>${g.qin?'（带天禽）':''}，${sws}；门：<b>${g.door}</b>，${dws}${dst.length?'，'+dst.join('、'):''}；干：天盘<b>${tians.join('、')}</b>加地盘<b>${g.di}</b>。`);
  if(marks.length)sum.push(`用神：${marks.map(x=>x==='命'?'年命干':x+'干').join('、')}落在这一宫，这一宫就是在看“${marks.map(x=>({年:'长辈、上级、大环境',月:'兄弟、同事、中期',日:'求测者本人',时:'所问之事',命:'求测者本命'})[x]).join('；')}”。`);
  if(pats.length)sum.push(`本宫格局：${pats.map(x=>`${x.name}（${x.level}）`).join('、')}。`);
  if(g.kong)sum.push('本宫空亡：好坏都打折扣，事情多虚而不实，待出空（填实）时才应。');
  h+=`<div class="fx-sum"><ul>${sum.map(x=>`<li>${x}</li>`).join('')}</ul></div>`;
  h+=sec(`① 宫：${gi[0]}${NUMCN[k-1]}宫 <span class="chip">${gi[1]} ${gi[2]}</span>`,`<p>${gi[4]}</p>`);
  h+=sec(`② 八神：${g.god}`,`<p>${god[0]}</p>`);
  h+=sec(`③ 九星：${g.star} ${levelChip(si[2])}${wsChip(sws)}`,`<p>${si[3]}</p><p>${si[4]}</p>
    <p><b>旺衰</b>：${g.star}属${si[1]}，月令${mz}属${mw}，为「${sws}」。${/旺|相/.test(sws)?'星有力，吉星更吉、凶星更凶。':'星力弱，吉星吉减、凶星凶减。'}</p>
    <p><b>星与宫</b>：${rel(si[1],g.wx,'星','宫')}。</p>
    ${g.qin?`<p><b>天禽</b>：${INFO.star['天禽'][3]} 转盘中天禽随天芮同行。</p>`:''}`);
  const home={1:'休',2:'死',3:'伤',4:'杜',6:'开',7:'惊',8:'生',9:'景'}[k];const d1=g.door[0];
  const ky=[[`${d1}加${home}（落本宫门的宫位）`,BAMEN_DD[d1+home]]];tians.forEach(x=>ky.push([`${d1}加天盘${x}`,BAMEN_DG[d1+x]]));ky.push([`${d1}加地盘${g.di}`,BAMEN_DG[d1+g.di]]);
  h+=sec(`④ 八门：${g.door} ${levelChip(di[2])}${wsChip(dws)}${dst.map(x=>`<span class="chip ${/迫|墓|制|反吟/.test(x)?'xiong':/义|和/.test(x)?'ji':''}">${x}</span>`).join('')}`,`<p>${di[3]}</p><p>${di[4]}</p>
    <p><b>旺衰</b>：${g.door}属${di[1]}，月令${mz}属${mw}，为「${dws}」。</p>
    <p><b>门与宫</b>：${rel(di[1],g.wx,'门','宫')}。${dst.includes('门迫')?'门克宫为<b>门迫</b>：吉门被迫吉事难成，凶门被迫凶上加凶。':''}${dst.includes('受制')?'宫克门为<b>受制</b>：门的作用被压住。':''}${dst.includes('入墓')?'门落墓宫为<b>入墓</b>：门力受困。':''}${dst.some(x=>/义/.test(x))?'宫生门为<b>义</b>，门得助。':''}${dst.some(x=>/^和/.test(x))?'门生宫为<b>和</b>，吉门更顺。':''}</p>
    <div class="ky"><div class="note-s" style="margin-bottom:4px">八门克应</div>${ky.filter(x=>x[1]).map(([a,b])=>`<div><b>${a}</b>：${b}</div>`).join('')}</div>`);
  const ganP=x=>{const i=INFO.gan[x];return `<p><b>${x}</b>（${i[0]}，${i[1]}）：${i[2]}</p>`;};
  h+=sec(`⑤ 天盘干：${tians.join('、')}`,tians.map(ganP).join('')+(g.tianExtra?`<p>这一宫有两个天盘干：天禽随天芮落到这里，把中五宫的干（${g.tianExtra}）也带来了。</p>`:''));
  h+=sec(`⑥ 地盘干：${g.di}`,ganP(g.di)+'<p>地盘干是“本来就在这里”的，代表静、代表主方；天盘干是“转过来的”，代表动、代表客方。</p>');
  const gk=tians.map(x=>{const v=GANKE[x+g.di];return v?`<div><b>${x}+${g.di} ${v[0]}</b> ${levelChip(v[1])} ${v[2]}</div>`:''}).join('');
  h+=sec('⑦ 十干克应（天盘干＋地盘干）',`<div class="ky">${gk||'—'}</div><p>${tians.map(x=>rel(QM.GAN_WX?QM.GAN_WX[x]:INFO.gan[x][1],INFO.gan[g.di][1],'天盘'+x,'地盘'+g.di)).join('；')}。天盘克地盘利客，地盘克天盘利主。</p>`);
  h+=sec(`⑧ 本宫格局（${pats.length}）`,pats.length?pats.map(x=>`<div style="margin:4px 0">${levelChip(x.level)} <b>${esc(x.name)}</b>：${esc(x.desc)}</div>`).join(''):'<p>这一宫没有命中常见格局。</p>'+(glob.length?`<p class="note-s">全盘格局：${glob.map(x=>x.name).join('、')}（影响整盘）。</p>`:''));
  if(g.kong||g.ma)h+=sec('⑨ 空亡与驿马',`${g.kong?`<p><b>空亡</b>：本宫地支落在旬空（${r.kong.join('')}）。空则虚、则不实；吉事难成，凶事也减轻。出空、冲空之时应事。</p>`:''}${g.ma?`<p><b>驿马</b>（${r.ma}）：主动、变动、出行、快速。用神临马，事情动得快。</p>`:''}`);
  h+=`<p style="margin:10px 0 0"><button class="kblink" data-kb="断盘步骤">在知识库看「断盘步骤」→</button></p>`;
  return h;
}
function renderExplain(){
  const r=state.res, s=state.sel, el=$('#explain');
  if(s&&s.kind==='full'){el.innerHTML=`<h2>释义 <button class="btn" id="exclear" style="padding:2px 10px;font-size:12px">返回概览</button></h2>${renderFull(+s.p)}`;return;}
  if(!s){
    el.innerHTML=`<h2>释义 <span class="sub">${state.full?'点九宫格任一格':'点盘上任一符号'}</span></h2>
      <div class="ex-body"><p>本盘值符<b>${r.zhiFu}</b>落${palaceLine(r.zhiFuPal)}，值使<b>${r.zhiShi}</b>落${palaceLine(r.zhiShiPal)}。</p>
      <p>每宫分三层：<b>天盘</b>（九星 + 天盘干，右上大字）、<b>人盘</b>（八门）、<b>地盘</b>（右下地盘干），最上面是<b>神盘</b>（八神）。</p>
      <p>读盘先找用神：求财看生门与戊，考试看景门与丁，出行看开门与驿马，求医看天心与乙。</p></div>`;
    return;
  }
  const p=s.p?+s.p:null;
  const where=p&&p!==5?`<p>本盘落在 ${palaceLine(p)}。</p>`:'';
  let h='';
  if(s.kind==='star'){const i=INFO.star[s.key];
    h=`<div class="ex-title"><b>${s.key}</b><span class="chip">本位 ${i[0]}</span><span class="chip">五行 ${i[1]}</span>${levelChip(i[2])}${r.zhiFu===s.key?'<span class="chip brass">本盘值符</span>':''}</div>
      <div class="ex-body"><p>${i[3]}</p><p>${i[4]}</p>${s.key==='天禽'?`<p>本盘天禽随天芮落${palaceLine(Object.values(r.palaces).find(g=>g.qin).p)}。</p>`:where}</div>`;}
  else if(s.kind==='door'){const i=INFO.door[s.key];
    const g=p&&r.palaces[p];const po=g&&({木:'土',土:'水',水:'火',火:'金',金:'木'})[i[1]]===g.wx;
    h=`<div class="ex-title"><b>${s.key}</b><span class="chip">本位 ${i[0]}</span><span class="chip">五行 ${i[1]}</span>${levelChip(i[2])}${r.zhiShi===s.key?'<span class="chip acc">本盘值使</span>':''}</div>
      <div class="ex-body"><p>${i[3]}</p><p>${i[4]}</p>${where}</div>`;
    if(g&&p!==5){
      const st=QM.doorState(s.key,p);const d1=s.key[0];
      const home={1:'休',2:'死',3:'伤',4:'杜',6:'开',7:'惊',8:'生',9:'景'}[p];
      const rows=[[`${d1}加${home}（落${g.gua}宫）`,BAMEN_DD[d1+home]]];
      for(const x of [g.tian,g.tianExtra].filter(Boolean))rows.push([`${d1}加天盘${x}`,BAMEN_DG[d1+x]]);
      rows.push([`${d1}加地盘${g.di}`,BAMEN_DG[d1+g.di]]);
      h+=`<div class="meta" style="margin-top:8px">${st.map(x=>`<span class="chip ${/迫|墓|制|反吟/.test(x)?'xiong':/义|和/.test(x)?'ji':''}">${x}</span>`).join('')}</div>
      <div class="ky"><div class="note-s" style="margin-bottom:4px">八门克应（门加门、门加奇仪）</div>${rows.filter(x=>x[1]).map(([k,v])=>`<div><b>${k}</b>：${v}</div>`).join('')}</div>`;
    }}
  else if(s.kind==='god'){const i=INFO.god[s.key];
    h=`<div class="ex-title"><b>${s.key}</b><span class="chip">八神</span></div><div class="ex-body"><p>${i[0]}</p>${where}<p>${r.yang?'阳遁顺时针':'阴遁逆时针'}排八神，起点是大值符所落之宫。</p></div>`;}
  else if(s.kind==='gan'){const i=INFO.gan[s.key];const g=p&&r.palaces[p];
    let pos='';
    if(g&&p!==5){
      const isTian=g.tian===s.key||g.tianExtra===s.key;
      const pair=isTian?`天盘${s.key}加地盘${g.di}`:`天盘${g.tian}${g.tianExtra?'、'+g.tianExtra:''}加地盘${g.di}`;
      pos=`<p>${palaceLine(p)}：${pair}。</p>`;
    } else if(p===5) pos='<p>中五宫地盘干，转盘时随坤二宫一起走（天禽带着它）。</p>';
    h=`<div class="ex-title"><b>${s.key}</b><span class="chip">${i[0]}</span><span class="chip">五行 ${i[1]}</span></div><div class="ex-body"><p>${i[2]}</p>${pos}<p>甲不上盘，藏于六仪之下：甲子戊、甲戌己、甲申庚、甲午辛、甲辰壬、甲寅癸。这就是“遁甲”。</p></div>`;}
  else if(s.kind==='gong'){const k=+s.key;const i=GUA_INFO[k];const g=r.palaces[k];
    h=`<div class="ex-title"><b>${i[0]}${NUMCN[k-1]}宫</b>${i[1]?`<span class="chip">${i[1]}</span>`:''}<span class="chip">${g.dir}</span><span class="chip">五行 ${i[3]}</span></div>
      <div class="ex-body"><p>${i[4]}</p>${k!==5?`<dl class="kv"><dt>八神</dt><dd>${g.god}</dd><dt>九星</dt><dd>${g.star}${g.qin?'（带天禽）':''}</dd><dt>八门</dt><dd>${g.door}</dd><dt>天盘干</dt><dd>${g.tian}${g.tianExtra?'、'+g.tianExtra:''}</dd><dt>地盘干</dt><dd>${g.di}</dd>${(r.marks[k]||[]).length?`<dt>用神</dt><dd>${r.marks[k].map(x=>x==='命'?'年命干':x+'干').join('、')}落此宫</dd>`:''}${g.kong?'<dt>空亡</dt><dd>本宫落空，事多虚而不实</dd>':''}${g.ma?'<dt>驿马</dt><dd>主动、变迁、出行</dd>':''}</dl>`:`<dl class="kv"><dt>地盘干</dt><dd>${g.di}</dd></dl>`}</div>`;}
  if(s.kind!=='gong'&&s.kind!=='god'&&p&&p!==5||s.kind==='gong'&&+s.key!==5){
    const g=r.palaces[p||+s.key];
    const ky=[g.tian,g.tianExtra].filter(Boolean).map(x=>{const v=GANKE[x+g.di];return v?`<div><b>${x}+${g.di} ${v[0]}</b> ${levelChip(v[1])} ${v[2]}</div>`:''}).join('');
    if(ky)h+=`<div class="ky"><div class="note-s" style="margin-bottom:4px">本宫十干克应（天盘+地盘）</div>${ky}</div>`;
  }
  const KBT={star:'九星',door:'八门',god:'八神',gan:'三奇六仪与遁甲',gong:'九宫详解'}[s.kind];
  if(KBT)h+=`<p style="margin:10px 0 0"><button class="kblink" data-kb="${KBT}">在知识库看「${KBT}」详解 →</button></p>`;
  el.innerHTML=`<h2>释义 <button class="btn" id="exclear" style="padding:2px 10px;font-size:12px">返回概览</button></h2>${h}`;
}

document.addEventListener('click',e=>{
  if(state.full){const gg=e.target.closest('#grid9 .gong');if(gg&&gg.dataset.p!=='5'){state.sel={kind:'full',p:gg.dataset.p};render();
    if(window.innerWidth<=900)$('#explain').scrollIntoView({behavior:'smooth',block:'start'});return;}}
  const t=e.target.closest('.tok');
  if(t){state.sel={kind:t.dataset.kind,key:t.dataset.key,p:t.dataset.p||(t.dataset.kind==='gong'?t.dataset.key:null)};render();
    if(window.innerWidth<=900)$('#explain').scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(e.target.id==='exclear'){state.sel=null;render();return;}
  const kl=e.target.closest('[data-kb]');if(kl){kbGo(kl.dataset.kb);return;}
  const cs=e.target.closest('[data-case]');if(cs){const c=CASES.find(x=>x.id===cs.dataset.case);if(!c)return;const [a,b]=c.time.split('T');const [y,m,d]=a.split('-').map(Number);const [h,mi]=b.split(':').map(Number);
    state.tst=false;syncSolar();saveSolar();state.method=c.method==='zhirun'?'zhirun':'chaibu';syncMethod();try{localStorage.setItem('qm-method',state.method)}catch(err){}
    state.sel=null;setInput(new Date(y,m-1,d,h,mi));compute();showTab('pan');window.scrollTo({top:0,behavior:'smooth'});
    toast(`已打开实例「${c.title}」（${c.method==='zhirun'?'置闰':'拆补'}，未做真太阳时校正）`);return;}
  const op=e.target.closest('[data-open]');if(op){const [a,b]=op.dataset.open.split('T');const [y,m,d]=a.split('-').map(Number);const [h,mi]=b.split(':').map(Number);
    state.tst=false;syncSolar();saveSolar();state.method='chaibu';syncMethod();state.sel=null;setInput(new Date(y,m-1,d,h,mi));compute();showTab('pan');window.scrollTo({top:0,behavior:'smooth'});return;}
  const gk=e.target.closest('.gk-cell');if(gk){document.querySelectorAll('.gk-cell.sel').forEach(x=>x.classList.remove('sel'));gk.classList.add('sel');
    const det=gk.closest('td').closest('.kbt-wrap').nextElementSibling;const kk=gk.dataset.k;
    if(gk.dataset.bm==='dd'){det.innerHTML=`<b>${kk[0]}门加${kk[1]}门</b>（${kk[0]}门落${kk[1]}门本宫）：${BAMEN_DD[kk]}`;return;}
    if(gk.dataset.bm==='dg'){det.innerHTML=`<b>${kk[0]}门加${kk[1]}</b>：${BAMEN_DG[kk]}`;return;}
    const v=GANKE[kk];det.innerHTML=`<b>天盘${kk[0]} + 地盘${kk[1]}：${v[0]}</b> ${levelChip(v[1])}<br>${v[2]}`;return;}
  const kc=e.target.closest('.kb-cat>button');if(kc){kbState.cat=kc.dataset.c;kbState.q='';$('#kbq').value='';renderKB();window.scrollTo({top:0});return;}
  const ka=e.target.closest('.kb-toc a');if(ka){e.preventDefault();const el=document.getElementById(ka.dataset.id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});return;}
  const pb=e.target.closest('#pats button');
  if(pb){const x=state.res.patterns[+pb.dataset.i];const m=x.where.match(/(\d)宫/);
    if(m){const cell=document.querySelector(`.gong[data-p="${m[1]}"]`);cell.classList.remove('flash');void cell.offsetWidth;cell.classList.add('flash');}
  }
});

$('#dt').addEventListener('change',compute);
$('#now').addEventListener('click',()=>{setInput(new Date());compute();});
function shiftH(n){const d=readInput();d.setHours(d.getHours()+2*n);setInput(d);compute();}
$('#prevH').addEventListener('click',()=>shiftH(-1));
$('#nextH').addEventListener('click',()=>shiftH(1));
try{state.full=localStorage.getItem('qm-full')==='1';}catch(e){}
$('#fullMode').checked=!!state.full;
$('#fullMode').addEventListener('change',e=>{state.full=e.target.checked;try{localStorage.setItem('qm-full',state.full?'1':'0')}catch(err){}
  if(!state.full&&state.sel&&state.sel.kind==='full')state.sel=null;render();});
$('#patf').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.patf=b.dataset.f;try{localStorage.setItem('qm-patf',state.patf)}catch(err){}render();});
try{const f=localStorage.getItem('qm-patf');if(['all','ji','xiong','use'].includes(f))state.patf=f;}catch(e){}
$('#method').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.method=b.dataset.m;
  try{localStorage.setItem('qm-method',state.method)}catch(err){}
  syncMethod();compute();if(!$('#view-cal').hidden)renderCal();});
function syncMethod(){document.querySelectorAll('#method button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===state.method));}

// tabs
const views={pan:'#view-pan',lp:'#view-lp',cal:'#view-cal',quiz:'#view-quiz',kb:'#view-kb',guide:'#view-guide'};
function showTab(k){for(const v in views){$(views[v]).hidden=v!==k;$('#tab-'+v).setAttribute('aria-selected',v===k);}
  if(k==='quiz'&&!quiz.cur)newQ();if(k==='kb'&&!kbState.done)renderKB();if(k==='cal')renderCal();if(k==='lp')renderLP();}
for(const k in views)$('#tab-'+k).addEventListener('click',()=>showTab(k));

// ---------- 罗盘 ----------
const LP_ORDER=[1,8,3,4,9,2,7,6];
const DIR8=['北','东北','东','东南','南','西南','西','西北'];
const lp={heading:0,shown:0,live:false,sel:null,raw:null,so:0,mode:'auto',off:0,src:''};
try{const c=JSON.parse(localStorage.getItem('qm-lpcal')||'null');if(c){lp.mode=c.mode==='auto'?'auto':+c.mode;lp.off=+c.off||0;}}catch(e){}
function lpSaveCal(){try{localStorage.setItem('qm-lpcal',JSON.stringify({mode:lp.mode,off:lp.off}))}catch(e){}}
// iOS 的 webkitCompassHeading 已按屏幕方向修正（实测），其他设备的 alpha 需要加上屏幕旋转角
function lpMode(){return lp.mode==='auto'?(lp.src==='ios'?0:1):lp.mode;}
function lpCalc(){if(lp.raw===null)return;lp.heading=((lp.raw+lpMode()*lp.so+lp.off)%360+360)%360;}
function lpCalUI(){document.querySelectorAll('#lpMode button').forEach(b=>b.setAttribute('aria-pressed',String(lp.mode)===b.dataset.v));
  $('#lpOffTxt').textContent=`当前偏移 ${lp.off>0?'+':''}${lp.off}°`;
  $('#lpRaw').textContent=lp.raw===null?'原始读数：未启用指南针':`原始读数 ${Math.round(lp.raw)}° · 屏幕旋转 ${lp.so}° · 修正后 ${Math.round(lp.heading)}°`;}
function lpLevel(g){if(['开门','休门','生门'].includes(g.door))return 'ji';if(['伤门','惊门','死门'].includes(g.door))return 'xiong';return 'ping';}
function renderLP(){
  const r=state.res;if(!r)return;
  $('#lpJu').innerHTML=`${r.yang?'阳':'阴'}遁${NUMCN[r.J-1]}局<small>${r.gz.day}日 ${r.gz.hour}时 · 值符${r.zhiFu} · 值使${r.zhiShi}</small>`;
  $('#lpTime').textContent=`${$('#dt').value.replace('T',' ')}${state.tst?'（真太阳时）':''} · 换时间请到排盘页`;
  const R0=62,R1=182,R2=204;
  const pt=(a,rad)=>[rad*Math.sin(a*Math.PI/180),-rad*Math.cos(a*Math.PI/180)];
  let s=`<g id="lpDisk">`;
  s+=`<circle r="${R2}" class="sv-ring"/>`;
  LP_ORDER.forEach((p,i)=>{
    const g=r.palaces[p];const c=i*45,a0=c-22.5,a1=c+22.5;
    const [x0,y0]=pt(a0,R0),[x1,y1]=pt(a0,R1),[x2,y2]=pt(a1,R1),[x3,y3]=pt(a1,R0);
    s+=`<path class="lp-sec sv-${lpLevel(g)}" data-p="${p}" d="M${x0},${y0} L${x1},${y1} A${R1},${R1} 0 0 1 ${x2},${y2} L${x3},${y3} A${R0},${R0} 0 0 0 ${x0},${y0}Z"/>`;
    s+=`<path class="sv-line" d="M${x0},${y0} L${pt(a0,R2)[0]},${pt(a0,R2)[1]}"/>`;
  });
  s+=`<circle r="${R1}" class="sv-line"/>`;
  s+=`<path id="lpSelArc" class="sv-sel" d=""/>`;
  LP_ORDER.forEach((p,i)=>{
    const g=r.palaces[p];const c=i*45;
    const [ox,oy]=pt(c,R1+11);
    s+=`<g class="lp-lab" data-x="${ox}" data-y="${oy}" transform="translate(${ox},${oy})"><text text-anchor="middle" dominant-baseline="central" font-size="13" class="${i===0?'sv-n':'sv-t'}" font-weight="700">${DIR8[i]}</text></g>`;
    const [mx,my]=pt(c,(R0+R1)/2+4);
    const badges=(g.kong?'空':'')+(g.ma?'马':'');
    s+=`<g class="lp-lab" data-x="${mx}" data-y="${my}" transform="translate(${mx},${my})" pointer-events="none">
      <text text-anchor="middle" y="-34" font-size="11" class="sv-t3">${g.gua}${NUMCN[p-1]}${badges?' · '+badges:''}</text>
      <text text-anchor="middle" y="-12" font-size="19" font-weight="900" class="sv-t">${g.door}</text>
      <text text-anchor="middle" y="9" font-size="13" class="sv-t2">${g.star}${g.qin?'·禽':''}</text>
      <text text-anchor="middle" y="27" font-size="12" class="sv-t2">${g.god}</text>
      <text text-anchor="middle" y="45" font-size="13" font-weight="700" class="sv-t">${g.tian}${g.tianExtra||''}/${g.di}</text>
    </g>`;
  });
  s+=`<circle r="${R0}" class="sv-center"/><g class="lp-lab" data-x="0" data-y="0" transform="translate(0,0)" pointer-events="none"><text text-anchor="middle" y="-8" font-size="12" class="sv-t3">中五</text><text text-anchor="middle" y="14" font-size="18" font-weight="900" class="sv-t">${r.palaces[5].di}</text></g>`;
  s+=`</g>`;
  $('#lpSvg').innerHTML=s;
  lpApply(true);
}
function lpFacing(){return LP_ORDER[Math.round((((lp.heading%360)+360)%360)/45)%8];}
function lpApply(force){
  // 取最短路径，避免 359→0 转一大圈
  let d=((lp.heading-lp.shown)%360+540)%360-180;lp.shown+=d;
  const disk=$('#lpDisk');if(!disk)return;
  disk.style.transform=`rotate(${-lp.shown}deg)`;
  document.querySelectorAll('.lp-lab').forEach(el=>el.setAttribute('transform',`translate(${el.dataset.x},${el.dataset.y}) rotate(${lp.shown})`));
  const h=Math.round(((lp.heading%360)+360)%360);
  $('#lpDeg').textContent=h+'°';
  const fp=lpFacing();const fi=LP_ORDER.indexOf(fp);
  $('#lpDir').textContent=`面向 ${DIR8[fi]}（${state.res.palaces[fp].gua}宫）`;
  if(document.activeElement!==$('#lpSlider'))$('#lpSlider').value=h;
  const show=lp.sel||fp;
  const i=LP_ORDER.indexOf(show),c=i*45,R0=62,R1=182;
  const pt=(a,rad)=>[rad*Math.sin(a*Math.PI/180),-rad*Math.cos(a*Math.PI/180)];
  const [x0,y0]=pt(c-22.5,R0),[x1,y1]=pt(c-22.5,R1),[x2,y2]=pt(c+22.5,R1),[x3,y3]=pt(c+22.5,R0);
  const arc=$('#lpSelArc');if(arc)arc.setAttribute('d',`M${x0},${y0} L${x1},${y1} A${R1},${R1} 0 0 1 ${x2},${y2} L${x3},${y3} A${R0},${R0} 0 0 0 ${x0},${y0}Z`);
  if(force||lp.lastShow!==show){lp.lastShow=show;lpDetail(show,show===fp);}
}
function lpDetail(p,facing){
  const r=state.res,g=r.palaces[p];const i=LP_ORDER.indexOf(p);
  const pats=r.patterns.filter(x=>x.where.startsWith(g.gua));
  const ky=[g.tian,g.tianExtra].filter(Boolean).map(x=>{const v=GANKE[x+g.di];return v?`<div><b>${x}+${g.di} ${v[0]}</b> ${levelChip(v[1])} ${v[2]}</div>`:''}).join('');
  const lv=lpLevel(g);
  const dInfo=INFO.door[g.door],sInfo=INFO.star[g.star],gInfo=INFO.god[g.god];
  $('#lpDetail').innerHTML=`<h2>${facing?'正对':'查看'} · ${DIR8[i]}方 <span class="sub">${g.gua}${NUMCN[p-1]}宫 · ${g.wx}${lp.sel?' · <button class="kblink" id="lpBack">回到正对方向</button>':''}</span></h2>
    <div class="meta"><span class="chip ${lv==='ji'?'ji':lv==='xiong'?'xiong':''}">${g.door} ${dInfo[2]}</span><span class="chip ${sInfo[2].includes('吉')?'ji':sInfo[2]==='凶'?'xiong':''}">${g.star} ${sInfo[2]}</span><span class="chip">${g.god}</span>${g.kong?'<span class="chip">空亡</span>':''}${g.ma?'<span class="chip brass">驿马</span>':''}</div>
    <div class="ex-body"><p><b>${g.door}</b>：${dInfo[3]}${dInfo[4]}</p><p><b>${g.star}</b>：${sInfo[3]}</p><p><b>${g.god}</b>：${gInfo[0]}</p></div>
    ${ky?`<div class="ky"><div class="note-s" style="margin-bottom:4px">十干克应（天盘+地盘）</div>${ky}</div>`:''}
    ${pats.length?`<ul class="pats" style="margin-top:10px">${pats.map(x=>`<li><button type="button">${levelChip(x.level)}<span class="nm">${esc(x.name)}</span><span class="ds">${esc(x.desc)}</span></button></li>`).join('')}</ul>`:'<p class="note-s" style="margin:10px 0 0">此方位没有命中常见格局。</p>'}`;
}
// 设备方向
let lpRaf=0;
function lpOnOrient(e){
  let h=null;
  if(typeof e.webkitCompassHeading==='number'&&!isNaN(e.webkitCompassHeading)){h=e.webkitCompassHeading;lp.src='ios';}
  else if(e.absolute&&typeof e.alpha==='number'){h=360-e.alpha;lp.src='abs';}
  if(h===null)return;
  lp.so=(screen.orientation&&typeof screen.orientation.angle==='number')?screen.orientation.angle:(window.orientation||0);
  lp.raw=h;lpCalc();
  if(!lp.live){lp.live=true;$('#lpStatus').textContent='指南针已启用。设备平放，顶端对着的方向就是箭头所指。';$('#lpStart').textContent='指南针运行中';}
  if(!lpRaf)lpRaf=requestAnimationFrame(()=>{lpRaf=0;if(!$('#view-lp').hidden){lpApply();if($('#lpCalBox').open)lpCalUI();}});
}
async function lpStart(){
  try{
    if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){
      const res=await DeviceOrientationEvent.requestPermission();
      if(res!=='granted'){$('#lpStatus').textContent='没有取得方向感应权限，可以用下面的滑杆或拖动转盘手动转向。';return;}
    }
    if(typeof DeviceOrientationEvent==='undefined'){$('#lpStatus').textContent='这个环境没有方向感应，请手动转向。';return;}
    window.addEventListener('deviceorientationabsolute',lpOnOrient,true);
    window.addEventListener('deviceorientation',lpOnOrient,true);
    $('#lpStatus').textContent='正在等待指南针数据……如果几秒后仍不转动，说明当前环境读不到指南针（常见原因：不是 HTTPS 网址，或 App 未开放方向权限），请手动转向。';
  }catch(err){$('#lpStatus').textContent='无法启用指南针（'+(err&&err.message||err)+'），请手动转向。';}
}
$('#lpStart').addEventListener('click',lpStart);
$('#lpCalBox').addEventListener('toggle',lpCalUI);
$('#lpMode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;lp.mode=b.dataset.v==='auto'?'auto':+b.dataset.v;lpSaveCal();lpCalc();lpCalUI();lpApply();});
$('#lpCalBox').addEventListener('click',e=>{const b=e.target.closest('[data-off]');if(!b)return;const v=b.dataset.off;lp.off=v==='reset'?0:((lp.off+ +v+540)%360)-180;if(v==='reset'){lp.mode='auto';}lpSaveCal();lpCalc();lpCalUI();lpApply();});
$('#lpRefGo').addEventListener('click',()=>{const ref=parseFloat($('#lpRef').value);if(isNaN(ref)){return;}
  if(lp.raw===null){$('#lpRaw').textContent='请先点「启用指南针」，再校正。';return;}
  const base=lp.raw+lpMode()*lp.so;lp.off=Math.round((((ref-base)%360)+540)%360-180);lpSaveCal();lpCalc();lpCalUI();lpApply();});
$('#lpSlider').addEventListener('input',e=>{lp.heading=+e.target.value;lp.sel=null;lpApply();});
// 拖动转盘
(function(){let drag=null;const st=$('#lpStage');
  const ang=e=>{const b=st.getBoundingClientRect();return Math.atan2(e.clientX-(b.left+b.width/2),-(e.clientY-(b.top+b.height/2)))*180/Math.PI;};
  st.addEventListener('pointerdown',e=>{drag={a:ang(e),h:lp.heading,moved:false,t:e.target};st.setPointerCapture(e.pointerId);});
  st.addEventListener('pointermove',e=>{if(!drag)return;const d=ang(e)-drag.a;if(Math.abs(d)>2)drag.moved=true;if(drag.moved&&!lp.live){lp.heading=((drag.h-d)%360+360)%360;lp.sel=null;lpApply();}});
  st.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const sec=drag.t.closest&&drag.t.closest('.lp-sec');if(sec){lp.sel=+sec.dataset.p;lpApply(true);}}drag=null;});
})();
$('#lpDetail').addEventListener('click',e=>{if(e.target.id==='lpBack'){lp.sel=null;lpApply(true);}});
window.renderLP=renderLP;

// ---------- 万年历 ----------
const calState={y:0,m:0,sel:null};
(function(){const d=new Date();calState.y=d.getFullYear();calState.m=d.getMonth()+1;calState.sel=[calState.y,calState.m,d.getDate()];})();
const WD='日一二三四五六';
const JU_CN=r=>`${r.yang?'阳':'阴'}${NUMCN[r.J-1]}`;
function dayLabel(s,l){
  const jq=l.getJieQi();if(jq)return ['jq',jq];
  const lf=l.getFestivals();if(lf.length)return ['fe',lf[0]];
  const sf=s.getFestivals();if(sf.length)return ['fe',sf[0]];
  if(l.getDay()===1)return ['',(l.getMonth()<0?'闰':'')+l.getMonthInChinese()+'月'];
  return ['',l.getDayInChinese()];
}
function renderCal(){
  const {y,m}=calState;
  const first=Solar.fromYmd(y,m,1);const days=SolarUtil.getDaysOfMonth(y,m);
  const lead=first.getWeek();
  const now=new Date();const tk=[now.getFullYear(),now.getMonth()+1,now.getDate()].join('-');
  const l1=first.getLunar(),l2=Solar.fromYmd(y,m,days).getLunar();
  $('#calTitle').textContent=`${y}年${m}月`;
  const mStr=x=>(x.getMonth()<0?'闰':'')+x.getMonthInChinese()+'月';
  $('#calSub').textContent=`${l1.getYearInGanZhi()}年（${l1.getYearShengXiao()}）${mStr(l1)}${mStr(l1)!==mStr(l2)?'–'+mStr(l2):''}`;
  let html=WD.split('').map((w,i)=>`<div class="cal-wd${i===0||i===6?' we':''}">${w}</div>`).join('');
  const start=first.next(-lead);
  const total=Math.ceil((lead+days)/7)*7;
  for(let i=0;i<total;i++){
    const s=start.next(i),l=s.getLunar();const [cls,lab]=dayLabel(s,l);
    const r=QM.fromDate(s.getYear(),s.getMonth(),s.getDay(),12,0,{method:state.method});
    const gz=l.getDayInGanZhi();const ft='甲己'.includes(gz[0]);
    const key=[s.getYear(),s.getMonth(),s.getDay()];
    const sel=calState.sel&&calState.sel.join('-')===key.join('-');
    const wk=s.getWeek();
    html+=`<button class="cd${s.getMonth()!==m?' out':''}${wk===0||wk===6?' we':''}${key.join('-')===tk?' today':''}${sel?' sel':''}" data-d="${key.join('-')}" aria-label="${s.toYmd()}">
      ${ft?'<span class="dot" title="符头日"></span>':''}<span class="n">${s.getDay()}</span><span class="lu ${cls}">${esc(lab)}</span><span class="gz">${gz}</span><span class="ju">${JU_CN(r)}·${'上中下'[r.ju.yuan]}${r.ju.run?'·闰':''}</span></button>`;
  }
  $('#calGrid').innerHTML=html;
  $('#calJump').value=`${y}-${pad(m)}-01`;
  renderCalDetail();
}
function renderCalDetail(){
  if(!calState.sel){$('#calDetail').innerHTML='';return;}
  const [y,m,d]=calState.sel;const s=Solar.fromYmd(y,m,d),l=s.getLunar();
  const r=QM.fromDate(y,m,d,12,0,{method:state.method});
  const prev=l.getPrevJieQi(true),next=l.getNextJieQi(true);
  const fest=[...l.getFestivals(),...s.getFestivals()];
  const now=new Date();const isToday=now.getFullYear()===y&&now.getMonth()+1===m&&now.getDate()===d;
  const times=l.getTimes();
  const rows=times.map((t,i)=>{
    const h=i===0?0:(i===12?23:2*i-1);const mi=30;
    const rr=QM.fromDate(y,m,d,h,mi,{method:state.method});
    const range=i===0?'00:00–00:59':i===12?'23:00–23:59':`${pad(2*i-1)}:00–${pad(2*i)}:59`;
    const nm=(i===0?'早':i===12?'晚':'')+t.getZhi()+'时';
    const cur=isToday&&((i===0&&now.getHours()===0)||(i===12&&now.getHours()===23)||(i>0&&i<12&&Math.floor((now.getHours()+1)/2)===i));
    const bad=rr.patterns.some(p=>p.name==='五不遇时');
    return `<tr class="${cur?'now':''}"><td>${nm}</td><td>${range}</td><td class="gzc">${t.getGanZhi()}</td><td>${t.getTianShenLuck()==='吉'?'<span class="chip ji">吉</span>':'<span class="chip xiong">凶</span>'}</td><td>${JU_CN(rr)}局</td><td>${rr.zhiFu}·${rr.zhiShi.replace('门','')}${bad?' <span class="chip xiong">五不遇</span>':''}</td><td><button data-openh="${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(mi)}">排盘</button></td></tr>`;
  }).join('');
  const list=a=>a.length?a.join('、'):'—';
  $('#calDetail').innerHTML=`
  <div class="card">
    <div class="cal-big"><span class="d">${d}</span><div class="t"><b>${y}年${m}月${d}日 星期${WD[s.getWeek()]}</b><span>农历${l.getYearInGanZhi()}年 ${(l.getMonth()<0?'闰':'')+l.getMonthInChinese()}月${l.getDayInChinese()} · 属${l.getYearShengXiao()}</span></div></div>
    ${fest.length?`<div class="meta" style="margin-top:8px">${fest.map(f=>`<span class="chip xiong">${esc(f)}</span>`).join('')}</div>`:''}
    <div class="pillars" style="margin-top:12px">${[['年',l.getYearInGanZhiExact()],['月',l.getMonthInGanZhiExact()],['日',l.getDayInGanZhi()]].map(([k,v])=>`<div class="pillar"><b>${v}</b><span>${k}柱</span></div>`).join('')}</div>
    <dl class="kv" style="margin-top:12px">
      <dt>节气</dt><dd>${prev.getName()} ${prev.getSolar().toYmdHms().slice(5,16)} → 下一个 ${next.getName()} ${next.getSolar().toYmdHms().slice(5,16)}</dd>
      <dt>纳音</dt><dd>${l.getDayNaYin()}</dd>
      <dt>旬空</dt><dd>${l.getDayXunKong()}（日空）</dd>
      <dt>冲煞</dt><dd>冲${l.getDayChongDesc()}，煞${l.getDaySha()}</dd>
      <dt>建除</dt><dd>${l.getZhiXing()}日 · 二十八宿 ${l.getXiu()}宿（${l.getXiuLuck()}）</dd>
      <dt>方位</dt><dd>喜神${l.getDayPositionXiDesc()}，财神${l.getDayPositionCaiDesc()}，福神${l.getDayPositionFuDesc()}</dd>
      <dt>彭祖</dt><dd>${l.getPengZuGan()}；${l.getPengZuZhi()}</dd>
    </dl>
    <div class="yj"><span class="tag y">宜</span><div>${list(l.getDayYi())}</div><span class="tag j">忌</span><div>${list(l.getDayJi())}</div></div>
    <p class="note-s" style="margin:8px 0 0">吉神：${list(l.getDayJiShen())}；凶煞：${list(l.getDayXiongSha())}</p>
  </div>
  <div class="card">
    <h2>奇门 <span class="sub">${r.ju.method}</span></h2>
    <div class="juline">${r.yang?'阳':'阴'}遁${NUMCN[r.J-1]}局 <small>${r.ju.jieqi}${r.ju.run?'（闰）':''} · ${['上元','中元','下元'][r.ju.yuan]} · 符头 ${r.ju.fuTou.gz}</small></div>
    <p class="note-s" style="margin:6px 0 10px">${esc(r.ju.note)}${r.ju.method==='拆补法'&&next.getSolar().toYmd()===s.toYmd()?' 今天交节，交节时刻之后换局，下表逐时辰计算。':''}</p>
    <div class="tbl-wrap"><table class="hours"><thead><tr><th>时辰</th><th>钟表时间</th><th>时柱</th><th>黄黑道</th><th>局</th><th>值符·值使</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="note-s" style="margin:8px 0 0">此表按标准时辰（钟表时间）列出。点「排盘」会关闭真太阳时校正，打开该时辰的盘。</p>
  </div>`;
}
$('#calGrid').addEventListener('click',e=>{const b=e.target.closest('.cd');if(!b)return;const [y,m,d]=b.dataset.d.split('-').map(Number);calState.sel=[y,m,d];
  if(m!==calState.m){calState.y=y;calState.m=m;}renderCal();if(window.innerWidth<=980)$('#calDetail').scrollIntoView({behavior:'smooth',block:'start'});});
function calShift(n){let {y,m}=calState;m+=n;if(m<1){m=12;y--;}if(m>12){m=1;y++;}if(y<1901||y>2099)return;calState.y=y;calState.m=m;renderCal();}
$('#calPrev').addEventListener('click',()=>calShift(-1));
$('#calNext').addEventListener('click',()=>calShift(1));
$('#calToday').addEventListener('click',()=>{const d=new Date();calState.y=d.getFullYear();calState.m=d.getMonth()+1;calState.sel=[calState.y,calState.m,d.getDate()];renderCal();});
$('#calJump').addEventListener('change',e=>{const v=e.target.value;if(!v)return;const [y,m,d]=v.split('-').map(Number);if(y<1901||y>2099)return;calState.y=y;calState.m=m;calState.sel=[y,m,d];renderCal();});
$('#calDetail').addEventListener('click',e=>{const b=e.target.closest('[data-openh]');if(!b)return;const [a,c]=b.dataset.openh.split('T');const [y,m,d]=a.split('-').map(Number);const [h,mi]=c.split(':').map(Number);
  state.tst=false;syncSolar();saveSolar();state.sel=null;setInput(new Date(y,m-1,d,h,mi));compute();showTab('pan');window.scrollTo({top:0,behavior:'smooth'});});

function toast(msg){let t=document.getElementById('toast');if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.remove('on'),3200);}
// ---------- 知识库 ----------
const kbState={cat:'intro',q:'',done:false};
try{const c=localStorage.getItem('qm-kbcat');if(KB_CATS.some(x=>x.id===c))kbState.cat=c;}catch(e){}
const strip=h=>h.replace(/<[^>]+>/g,'');
const artId=a=>'kb-'+KB.indexOf(a);
const WXS='木火土金水';const SHENG={木:'火',火:'土',土:'金',金:'水',水:'木'};const KE={木:'土',土:'水',水:'火',火:'金',金:'木'};
const SEASONS=[['春','木'],['夏','火'],['四季末','土'],['秋','金'],['冬','水']];
const GEN={
  jiazi(){const Z=QM.ZHI;let rows='';for(let x=0;x<6;x++){const cells=[];for(let i=0;i<10;i++)cells.push(`<td>${QM.GZ[x*10+i]}</td>`);const sz=(12-2*x)%12;
    rows+=`<tr><th>${QM.GZ[x*10]}旬</th>${cells.join('')}<td class="hl">${Z[(sz+10)%12]}${Z[(sz+11)%12]}</td><td>${'戊己庚辛壬癸'[x]}</td></tr>`;}
    return `<div class="kbt-wrap"><table class="kbt center"><thead><tr><th>旬</th>${[...Array(10)].map((_,i)=>`<th>${i+1}</th>`).join('')}<th>旬空</th><th>遁于</th></tr></thead><tbody>${rows}</tbody></table></div>`;},
  changsheng(){const ST='长生 沐浴 冠带 临官 帝旺 衰 病 死 墓 绝 胎 养'.split(' ');const start={甲:11,丙:2,戊:2,庚:5,壬:8,乙:6,丁:9,己:9,辛:0,癸:3};
    const rows='甲乙丙丁戊己庚辛壬癸'.split('').map((g,gi)=>{const yang=gi%2===0;return `<tr><th>${g}</th>${ST.map((s,k)=>{const z=QM.ZHI[((start[g]+(yang?k:-k))%12+12)%12];return `<td class="${s==='墓'||s==='临官'?'hl':''}">${z}</td>`}).join('')}</tr>`}).join('');
    return `<div class="kbt-wrap"><table class="kbt center"><thead><tr><th>干</th>${ST.map(s=>`<th>${s}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;},
  jutable(){return `<div class="kbt-wrap"><table class="kbt center"><thead><tr><th>遁</th><th>节气</th><th>上元</th><th>中元</th><th>下元</th><th>遁</th><th>节气</th><th>上元</th><th>中元</th><th>下元</th></tr></thead><tbody>${
    QM.JQ_ORDER.slice(0,12).map((j,i)=>{const k=QM.JQ_ORDER[i+12];return `<tr><td>阳</td><th>${j}</th><td>${QM.JU_TABLE[j].join('</td><td>')}</td><td>阴</td><th>${k}</th><td>${QM.JU_TABLE[k].join('</td><td>')}</td></tr>`}).join('')}</tbody></table></div>`;},
  starstate(){const S=[['天蓬','水'],['天芮','土'],['天冲','木'],['天辅','木'],['天禽','土'],['天心','金'],['天柱','金'],['天任','土'],['天英','火']];
    const f=(e,m)=>e===m?'相':SHENG[e]===m?'旺':KE[e]===m?'休':KE[m]===e?'囚':'废';
    return `<div class="kbt-wrap"><table class="kbt center"><thead><tr><th>星</th><th>五行</th>${SEASONS.map(s=>`<th>${s[0]}（${s[1]}）</th>`).join('')}</tr></thead><tbody>${S.map(([n,e])=>`<tr><th>${n}</th><td>${e}</td>${SEASONS.map(s=>{const v=f(e,s[1]);return `<td class="st-${v}">${v}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;},
  doorstate(){const D=[['休门','水'],['生门','土'],['伤门','木'],['杜门','木'],['景门','火'],['死门','土'],['惊门','金'],['开门','金']];
    const f=(e,m)=>e===m?'旺':SHENG[m]===e?'相':SHENG[e]===m?'休':KE[e]===m?'囚':'死';
    return `<div class="kbt-wrap"><table class="kbt center"><thead><tr><th>门</th><th>五行</th>${SEASONS.map(s=>`<th>${s[0]}（${s[1]}）</th>`).join('')}</tr></thead><tbody>${D.map(([n,e])=>`<tr><th>${n}</th><td>${e}</td>${SEASONS.map(s=>{const v=f(e,s[1]);return `<td class="st-${v}">${v}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;},
  bamen_dd(){const D='开休生伤杜景死惊'.split('');
    return `<div class="kbt-wrap"><table class="kbt center"><thead><tr><th>门＼加</th>${D.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${D.map(a=>`<tr><th>${a}门</th>${D.map(b=>{const v=BAMEN_DD[a+b];return `<td style="padding:2px"><button class="gk-cell bm" data-bm="dd" data-k="${a+b}">${a}加${b}</button></td>`}).join('')}</tr>`).join('')}</tbody></table></div><div class="gk-detail">点击上表任一格。</div>`;},
  bamen_dg(){const D='开休生伤杜景死惊'.split(''),G='戊己庚辛壬癸丁丙乙'.split('');
    return `<div class="kbt-wrap"><table class="kbt center"><thead><tr><th>门＼加</th>${G.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${D.map(a=>`<tr><th>${a}门</th>${G.map(b=>{const v=BAMEN_DG[a+b];return `<td style="padding:2px"><button class="gk-cell bm" data-bm="dg" data-k="${a+b}">${a}${b}</button></td>`}).join('')}</tr>`).join('')}</tbody></table></div><div class="gk-detail">点击上表任一格。</div>`;},
  doorstate_tbl(){const D=['开门','休门','生门','伤门','杜门','景门','死门','惊门'],P=[1,8,3,4,9,2,7,6];
    return `<div class="kbt-wrap"><table class="kbt center"><thead><tr><th>门＼宫</th>${P.map(p=>`<th>${QM.GONG[p]}${p}</th>`).join('')}</tr></thead><tbody>${D.map(d=>`<tr><th>${d}</th>${P.map(p=>{const st=QM.doorState(d,p);const bad=st.some(x=>/迫|墓|制|反吟/.test(x));return `<td class="${bad?'st-囚':st.some(x=>/义|和/.test(x))?'st-相':''}">${st.join('<br>')}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`;},
  cases(cat){const L=CASES.filter(c=>c.cat===cat);if(!L.length)return '';
    return `<h4>实例（${L.length}）</h4><div class="case-list">${L.map(c=>{const [d,t]=c.time.split('T');
      return `<details class="case"><summary><b>${esc(c.title)}</b><span>${d} ${t} · ${c.method==='zhirun'?'置闰':'拆补'} · ${esc(c.ju)}</span></summary>
      <div class="case-body"><p><b>问：</b>${esc(c.q)}</p><p><b>主要依据：</b></p><ol>${c.points.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
      <p><b>结果：</b>${esc(c.result)}</p><p class="case-foot"><button class="kblink" data-case="${c.id}">打开这一盘 →</button><span class="muted">${esc(c.page||'')}</span></p></div></details>`}).join('')}</div>`;},
  ganke(){const O='戊己庚辛壬癸丁丙乙'.split('');
    return `<div class="kbt-wrap"><table class="kbt center"><thead><tr><th>天＼地</th>${O.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${O.map(a=>`<tr><th>${a}</th>${O.map(b=>{const v=GANKE[a+b];return `<td style="padding:2px"><button class="gk-cell ${v[1]}" data-k="${a+b}">${v[0].replace(/（.*）/,'')}</button></td>`}).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="gk-detail">点击上表任一格。绿色为吉，红色为凶，灰色为吉凶看门。</div>`;}
};
function renderArt(a,showCat){
  let h=a.h.replace(/<table class="kbt([^"]*)">/g,'<div class="kbt-wrap"><table class="kbt$1">').replace(/<\/table>/g,'</table></div>');
  h=h.replace(/<div data-gen="(\w+)"(?: data-arg="([^"]*)")?><\/div>/g,(m,k,arg)=>GEN[k]?GEN[k](arg):'');
  const cat=KB_CATS.find(c=>c.id===a.c);
  return `<article class="kb-art" id="${artId(a)}"><h3>${esc(a.t)}${showCat?`<small>${cat.name}</small>`:''}</h3>${h}</article>`;
}
function renderKB(){
  kbState.done=true;
  try{localStorage.setItem('qm-kbcat',kbState.cat)}catch(e){}
  const q=kbState.q.trim();
  $('#kbnav').innerHTML=KB_CATS.map(c=>{const arts=KB.filter(a=>a.c===c.id);const on=!q&&c.id===kbState.cat;
    return `<div class="kb-cat${on?' on':''}"><button data-c="${c.id}">${c.name}<span>${arts.length}</span></button>${on?`<div class="kb-toc">${arts.map(a=>`<a href="#" data-id="${artId(a)}">${esc(a.t)}</a>`).join('')}</div>`:''}</div>`}).join('');
  if(q){
    const hits=KB.filter(a=>(a.t+strip(a.h)).includes(q)||(()=>{const m=a.h.match(/data-gen="cases" data-arg="([^"]*)"/);return m&&CASES.some(c=>c.cat===m[1]&&(c.title+c.q+c.points.join('')+c.result).includes(q));})()||(a.h.includes('data-gen="ganke"')&&Object.entries(GANKE).some(([k,v])=>(k+v.join('')).includes(q)))||(a.h.includes('data-gen="bamen_dd"')&&Object.values(BAMEN_DD).concat(Object.values(BAMEN_DG)).some(v=>v.includes(q))));
    $('#kbmain').innerHTML=`<div class="kb-head"><h2>搜索「${esc(q)}」</h2><p>${hits.length?`找到 ${hits.length} 篇`:'没有找到，换个关键词试试，比如“空亡”“生门”“局数”。'}</p></div>`+hits.map(a=>renderArt(a,true)).join('');
  } else {
    const c=KB_CATS.find(x=>x.id===kbState.cat);
    $('#kbmain').innerHTML=`<div class="kb-head"><h2>${c.name}</h2><p>${c.desc}</p></div>`+KB.filter(a=>a.c===c.id).map(a=>renderArt(a,false)).join('');
  }
}
function kbGo(title){const a=KB.find(x=>x.t===title);if(!a)return;kbState.cat=a.c;kbState.q='';$('#kbq').value='';showTab('kb');renderKB();
  requestAnimationFrame(()=>{const el=document.getElementById(artId(a));if(el)el.scrollIntoView({behavior:'smooth',block:'start'});});}
let kbT;$('#kbq').addEventListener('input',e=>{clearTimeout(kbT);kbT=setTimeout(()=>{kbState.q=e.target.value;renderKB();},200);});

// 局数表
function renderJuTable(){
  const cur=state.res&&state.res.ju.jieqi;
  const rows=QM.JQ_ORDER.map((j,i)=>`<tr class="${j===cur?'cur':''}"><td>${i<12?'阳':'阴'}</td><td>${j}</td><td>${QM.JU_TABLE[j].join('</td><td>')}</td></tr>`).join('');
  $('#jutable').innerHTML=`<thead><tr><th>遁</th><th>节气</th><th>上</th><th>中</th><th>下</th></tr></thead><tbody>${rows}</tbody>`;
}

// ---------- 练习 ----------
const quiz={level:'1',cur:null,right:0,total:0};
const rnd=n=>Math.floor(Math.random()*n);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
function pickOpts(correct,pool){const s=new Set([correct]);const p=shuffle(pool.filter(x=>x!==correct));while(s.size<4&&p.length)s.add(p.pop());return shuffle([...s]);}
function newQ(){
  const y=1990+rnd(46),m=1+rnd(12),d=1+rnd(28),h=rnd(24),mi=rnd(60);
  const r=QM.fromDate(y,m,d,h,mi,{method:state.method});
  let lv=quiz.level==='0'?String(1+rnd(3)):quiz.level;
  const juName=x=>`${x.yang?'阳':'阴'}遁${NUMCN[x.J-1]}局`;
  const allJu=[];for(const yy of ['阳','阴'])for(let k=0;k<9;k++)allJu.push(`${yy}遁${NUMCN[k]}局`);
  const stars=Object.keys(INFO.star),doors=Object.keys(INFO.door);
  let q;
  const ftTxt=`符头 ${r.ju.fuTou.gz}`;
  if(lv==='1'){
    q=rnd(2)?{text:'这一时辰是几局？',ans:juName(r),opts:null,pool:allJu,given:['节气','日柱'],why:r.steps[1].d}
             :{text:'这一日属于哪一元？',ans:['上元','中元','下元'][r.ju.yuan],opts:['上元','中元','下元'],given:['节气','日柱'],why:r.ju.note};
  } else if(lv==='2'){
    const t=rnd(3);
    if(t===0)q={text:'值符是哪颗星？',ans:r.zhiFu,pool:stars,given:['局','时柱'],why:r.steps[3].d};
    else if(t===1)q={text:'值使是哪个门？',ans:r.zhiShi,pool:doors,given:['局','时柱'],why:r.steps[3].d};
    else q={text:'时柱的旬首遁于哪个仪？',ans:r.xunYi,pool:'戊己庚辛壬癸'.split(''),given:['时柱'],why:r.steps[3].d};
  } else {
    const t=rnd(3);const pals=[1,2,3,4,6,7,8,9];const p=pals[rnd(8)];const g=r.palaces[p];
    const gname=`${g.gua}${NUMCN[p-1]}宫`;
    if(t===0)q={text:`值使门落在哪一宫？`,ans:`${r.palaces[r.zhiShiPal].gua}${NUMCN[r.zhiShiPal-1]}宫`,pool:pals.map(k=>`${r.palaces[k].gua}${NUMCN[k-1]}宫`),given:['局','时柱'],why:r.steps[5].d};
    else if(t===1)q={text:`${gname}的九星是？`,ans:g.star,pool:stars.filter(x=>x!=='天禽'),given:['局','时柱'],why:r.steps[4].d};
    else q={text:`${gname}的天盘干是？`,ans:g.tian,pool:QM.QIYI,given:['局','时柱'],why:r.steps[4].d};
  }
  q.opts=q.opts||pickOpts(q.ans,q.pool);
  q.r=r;q.done=false;quiz.cur=q;
  const lines=[`<div><b>${y}年${m}月${d}日 ${pad(h)}:${pad(mi)}</b> · ${r.ju.method}</div>`,
    `<div>四柱：${r.gz.year} ${r.gz.month} ${r.gz.day} ${r.gz.hour}</div>`];
  if(q.given.includes('节气'))lines.push(`<div>节气：${r.ju.jieqi}（交节 ${r.ju.jieqiTime.slice(0,16)}）</div>`);
  if(q.given.includes('局'))lines.push(`<div>局：${juName(r)}</div>`);
  if(lv!=='1')lines.push(`<details><summary>需要提示</summary><div class="note-s">${lv==='2'?'先找时柱所在旬的旬首和它遁于哪个仪，再看这个仪在地盘哪一宫。':'值符星随时干，值使门随时支；先布地盘，再按旋转规则推。'}</div></details>`);
  $('#qgiven').innerHTML=lines.join('');
  $('#qtext').textContent=q.text;
  $('#qopts').innerHTML=q.opts.map(o=>`<button data-o="${esc(o)}">${esc(o)}</button>`).join('');
  $('#qfb').innerHTML='';$('#qshow').hidden=true;
}
$('#qopts').addEventListener('click',e=>{const b=e.target.closest('button');const q=quiz.cur;if(!b||q.done)return;q.done=true;quiz.total++;
  const ok=b.dataset.o===q.ans;if(ok)quiz.right++;
  document.querySelectorAll('#qopts button').forEach(x=>{x.disabled=true;if(x.dataset.o===q.ans)x.classList.add('right');else if(x===b)x.classList.add('wrong');});
  $('#score').textContent=`${quiz.right} / ${quiz.total}`;
  $('#qfb').innerHTML=`<b>${ok?'答对了。':'答案是 '+esc(q.ans)+'。'}</b> ${esc(q.why)}`;$('#qshow').hidden=false;});
$('#qnext').addEventListener('click',newQ);
$('#qshow').addEventListener('click',()=>{state.tst=false;syncSolar();const r=quiz.cur.r;const [a,b]=r.solar.split(' ');const [y,m,d]=a.split('-').map(Number);const [h,mi]=b.split(':').map(Number);setInput(new Date(y,m-1,d,h,mi));state.sel=null;compute();showTab('pan');window.scrollTo({top:0,behavior:'smooth'});});
$('#qlevel').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;quiz.level=b.dataset.l;document.querySelectorAll('#qlevel button').forEach(x=>x.setAttribute('aria-pressed',x===b));newQ();});

function syncSolar(){$('#tst').checked=state.tst;$('#lon').value=state.lon;$('#tz').value=state.tz;
  const has=[...$('#city').options].some(o=>o.value===state.city);$('#city').value=has?state.city:'custom';}
$('#tst').addEventListener('change',e=>{state.tst=e.target.checked;saveSolar();compute();});
$('#city').addEventListener('change',e=>{state.city=e.target.value;if(state.city!=='custom'){const [lo,z]=state.city.split(',').map(Number);state.lon=lo;state.tz=z;state.tst=true;}
  syncSolar();saveSolar();compute();if(state.city==='custom')$('#lon').focus();});
$('#lon').addEventListener('input',e=>{state.lon=parseFloat(e.target.value);state.city='custom';$('#city').value='custom';saveSolar();compute();});
$('#tz').addEventListener('input',e=>{state.tz=parseFloat(e.target.value);state.city='custom';$('#city').value='custom';saveSolar();compute();});
$('#birth').value=state.birth||'';
$('#birth').addEventListener('input',e=>{const v=+e.target.value;state.birth=(v>=1900&&v<=2100)?v:null;try{localStorage.setItem('qm-birth',state.birth||'')}catch(err){}
  if(!state.birth)$('#birthOut').textContent='填写后，盘上会标出年命干落宫（「命」）。立春前出生的请填前一年。';render();});
syncSolar();
syncMethod();
setInput(new Date());
compute();
})();
