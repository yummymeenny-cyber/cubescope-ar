const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const screens={start:$('#start'),game:$('#game'),result:$('#result')};
// Each matrix stores stack heights. Projections are derived from the actual cubes.
const cases=[
 [[0,0,1,0],[0,1,1,1],[1,1,0,0]],
 [[0,1,0],[1,3,1],[0,1,0]],
 [[0,0,0],[0,3,2],[0,0,0]],
 [[0,3,0],[1,2,1],[0,1,0]],
 [[2,1,1,3],[0,1,0,1],[0,1,0,0]]
];
const viewNames={top:'ด้านบน',front:'ด้านหน้า',side:'ด้านข้าง'};
let state={case:0,score:0,streak:0,best:0,correct:0,angle:-.72,answered:false,ar:false,hints:0};
let ctx=$('#scene').getContext('2d'), dragX=null, raf;
function show(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active')}
function trim(m){let rows=m.map(r=>r.slice());while(rows.length&&rows[0].every(x=>!x))rows.shift();while(rows.length&&rows.at(-1).every(x=>!x))rows.pop();if(!rows.length)return [[0]];while(rows.every(r=>!r[0]))rows.forEach(r=>r.shift());while(rows.every(r=>!r.at(-1)))rows.forEach(r=>r.pop());return rows}
function projections(m){
 const top=trim(m.map(r=>r.map(v=>v?1:0)));
 const w=Math.max(...m.map(r=>r.length)), maxH=Math.max(...m.flat());
 const frontHeights=Array.from({length:w},(_,x)=>Math.max(...m.map(r=>r[x]||0)));
 const sideHeights=m.map(r=>Math.max(...r));
 const silhouette=hs=>Array.from({length:maxH},(_,row)=>hs.map(h=>h>=maxH-row?1:0));
 return {top,front:trim(silhouette(frontHeights)),side:trim(silhouette(sideHeights))};
}
function variants(correct,seed){
 const out=[correct.map(r=>r.slice())], h=correct.length,w=correct[0].length;
 const flip=correct.map(r=>r.slice().reverse()); if(JSON.stringify(flip)!==JSON.stringify(correct))out.push(flip);
 const mirror=[...correct].reverse().map(r=>r.slice()); if(!out.some(x=>JSON.stringify(x)===JSON.stringify(mirror)))out.push(mirror);
 let k=0;while(out.length<4&&k<20){let v=correct.map(r=>r.slice());let y=(seed+k*2)%h,x=(seed*3+k)%w;v[y][x]=v[y][x]?0:1;if(v.flat().some(Boolean)&&!out.some(a=>JSON.stringify(a)===JSON.stringify(v)))out.push(v);k++}
 return out.slice(0,4);
}
function seededShuffle(a,seed){a=a.slice();for(let i=a.length-1;i;i--){const j=(seed*17+i*13)% (i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function renderGrid(m){const el=document.createElement('div');el.className='projection';el.style.gridTemplateColumns=`repeat(${m[0].length},1fr)`;m.flat().forEach(v=>{const c=document.createElement('i');c.className='cell'+(v?' fill':'');el.append(c)});return el}
function loadCase(){state.answered=false;const i=state.case,m=cases[i],types=['top','front','side','top','side'],type=types[i];$('#caseNo').textContent=`${i+1}/${cases.length}`;$('#difficulty').textContent=i<2?'คดีระดับง่าย':i<4?'คดีระดับกลาง':'คดีระดับท้าทาย';$('#prompt').textContent=`ภาพ${viewNames[type]}ของวัตถุนี้คือข้อใด?`;$('#clueText').textContent='นึกภาพเมื่อมองตรงจากทิศที่กำหนด';$('#feedback').textContent='';$('#feedback').className='feedback';let correct=projections(m)[type],opts=seededShuffle(variants(correct,i+4),i+2),correctKey=JSON.stringify(correct),wrap=$('#options');wrap.innerHTML='';opts.forEach((grid,n)=>{const b=document.createElement('button');b.className='option';b.dataset.correct=JSON.stringify(grid)===correctKey;b.innerHTML=`<span class="option-label">${'ABCD'[n]}</span>`;b.append(renderGrid(grid));b.onclick=()=>answer(b);wrap.append(b)});draw()}
function answer(btn){if(state.answered)return;state.answered=true;const ok=btn.dataset.correct==='true';if(ok){state.correct++;state.streak++;state.best=Math.max(state.best,state.streak);state.score+=100+Math.min(40,(state.streak-1)*10)-state.hints*10;btn.classList.add('correct');$('#feedback').textContent='✓ หลักฐานตรงกัน! ภาพฉายถูกต้อง';$('#feedback').className='feedback good'}else{state.streak=0;btn.classList.add('wrong');$('.option[data-correct="true"]').classList.add('correct');$('#feedback').textContent='✕ ยังไม่ตรง ลองสังเกตจำนวนช่องในแต่ละแนว';$('#feedback').className='feedback bad'}updateHud();setTimeout(()=>{state.case++;state.hints=0;if(state.case<cases.length)loadCase();else finish()},1250)}
function updateHud(){$('#score').textContent=state.score;$('#streak').textContent=state.streak}
function finish(){show('result');const pct=Math.round(state.correct/cases.length*100);$('#finalScore').textContent=state.score;$('#correctCount').textContent=`${state.correct}/${cases.length}`;$('#accuracy').textContent=pct+'%';$('#bestStreak').textContent=state.best;const name=$('#player').value.trim()||'สายลับนิรนาม';$('#resultName').textContent=name;$('#medal').textContent=pct>=80?'🏆':pct>=60?'🥈':'🔎';$('#rankText').textContent=pct>=80?'ระดับ: ยอดนักสืบมิติสัมพันธ์ — วิเคราะห์ภาพฉายได้แม่นยำมาก':pct>=60?'ระดับ: นักสืบฝึกหัด — ใกล้ไขคดีครบแล้ว':'ระดับ: ผู้ช่วยนักสืบ — ฝึกหมุนวัตถุและนับความสูงอีกครั้ง'}
function cubePoints(x,y,z,s,ang,cx,cy){const ca=Math.cos(ang),sa=Math.sin(ang),rx=x*ca-y*sa,ry=x*sa+y*ca;return {x:cx+rx*s,y:cy+ry*s*.48-z*s}}
function poly(points,fill,stroke='#071426'){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1.4;ctx.stroke()}
function draw(){const c=$('#scene'),r=c.getBoundingClientRect(),d=devicePixelRatio||1;c.width=r.width*d;c.height=r.height*d;ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);const m=cases[state.case]||cases[0],s=Math.min(66,r.width/8,r.height/6),cx=r.width/2,cy=r.height*.72,cubes=[];m.forEach((row,y)=>row.forEach((h,x)=>{for(let z=0;z<h;z++)cubes.push({x,y,z,depth:(x+y)*Math.sin(state.angle)+z*.01})}));cubes.sort((a,b)=>a.depth-b.depth||a.z-b.z);cubes.forEach(q=>{const p=cubePoints(q.x-m[0].length/2,q.y-m.length/2,q.z,s,state.angle,cx,cy),u=cubePoints(q.x-m[0].length/2,q.y-m.length/2,q.z+1,s,state.angle,cx,cy),px=cubePoints(q.x+1-m[0].length/2,q.y-m.length/2,q.z,s,state.angle,cx,cy),py=cubePoints(q.x-m[0].length/2,q.y+1-m.length/2,q.z,s,state.angle,cx,cy),ux={x:px.x,y:px.y-s},uy={x:py.x,y:py.y-s};poly([u,ux,{x:px.x+py.x-p.x,y:px.y+py.y-p.y-s},uy],'#58e9ff');poly([p,px,ux,u],'#ff4f9a');poly([p,py,uy,u],'#805bf1')});raf=requestAnimationFrame(draw)}
async function toggleAR(){if(state.ar){stopAR();return}try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});$('#camera').srcObject=stream;await $('#camera').play();$('#camera').style.display='block';$('#stars').style.opacity='.08';state.ar=true;$('#cameraToggle').textContent='📷 ปิด AR'}catch(e){alert('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง หรือเล่นในโหมด 3 มิติแทน') }}
function stopAR(){const v=$('#camera');v.srcObject?.getTracks().forEach(t=>t.stop());v.srcObject=null;v.style.display='none';$('#stars').style.opacity='.35';state.ar=false;$('#cameraToggle').textContent='📷 AR'}
function reset(){state={case:0,score:0,streak:0,best:0,correct:0,angle:-.72,answered:false,ar:state.ar,hints:0};updateHud();show('game');loadCase()}
$('#startBtn').onclick=reset;$('#arBtn').onclick=async()=>{await toggleAR();reset()};$('#cameraToggle').onclick=toggleAR;$('#againBtn').onclick=reset;$('#hintBtn').onclick=()=>{if(state.answered)return;state.hints++;const type=['top','front','side','top','side'][state.case];$('#clueText').textContent=type==='top'?'มองจากด้านบน: สนใจตำแหน่งที่มีลูกบาศก์ ไม่สนใจความสูง':type==='front'?'มองตามลูกศรด้านหน้า: แต่ละแนวสูงที่สุดกี่ก้อน?':'มองจากด้านข้าง: ก้อนที่ซ้อนกันจะบังกัน เหลือเส้นขอบความสูง';};$$('.rotate').forEach(b=>b.onclick=()=>state.angle+=Number(b.dataset.dir)*Math.PI/2);const vp=$('#viewport');vp.onpointerdown=e=>{dragX=e.clientX;vp.setPointerCapture(e.pointerId)};vp.onpointermove=e=>{if(dragX!==null){state.angle+=(e.clientX-dragX)*.012;dragX=e.clientX}};vp.onpointerup=()=>dragX=null;window.onkeydown=e=>{if(e.key==='ArrowLeft')state.angle-=.18;if(e.key==='ArrowRight')state.angle+=.18;if(/^[1-4a-d]$/i.test(e.key)){const n='1234abcd'.indexOf(e.key.toLowerCase())%4;$$('.option')[n]?.click()}};window.addEventListener('resize',draw);document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.ar)stopAR()});draw();
