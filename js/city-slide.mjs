import {bindVisibility,clamp,createLoop,fitCanvas,prefersReducedMotion,safeBest} from './arcade-runtime.mjs';

const VIEW_W=960,VIEW_H=600,WORLD_W=4800,WORLD_H=3600,CHUNK=600,STEP=1/120,BEST_KEY='tamzidCitySlideBest';
const PALETTE={land:'#eadfc4',landAlt:'#e3d5b8',water:'#57cbd0',bank:'#82bd78',park:'#78ae6e',path:'#d9c99f',road:'#61737c',roadDark:'#435761',highway:'#435863',line:'#f4dda0',building:'#d5d1c6',buildingAlt:'#bdc8c8',roof:'#aebbbc',sport:'#8ab77d'};
const VEHICLE={label:'Car',radius:18,accel:350,brake:520,reverse:205,maxSpeed:405,maxReverse:145,steer:2.05,grip:6.8,driftGrip:1.15};
const CAR_SPRITE=new Image();CAR_SPRITE.src=new URL('../images/travel-car-topview.svg?v=1',import.meta.url).href;
const river=[{x:4590,y:-120},{x:4430,y:340},{x:4090,y:650},{x:3760,y:900},{x:3470,y:1180},{x:3150,y:1410},{x:2780,y:1640},{x:2460,y:1940},{x:2140,y:2260},{x:1760,y:2480},{x:1420,y:2760},{x:1000,y:3020},{x:610,y:3320},{x:280,y:3720}];
const roads=[
  {type:'highway',width:178,points:[{x:-100,y:530},{x:520,y:480},{x:1100,y:540},{x:1640,y:680},{x:2200,y:720},{x:2780,y:610},{x:3400,y:410},{x:4040,y:270},{x:4900,y:250}]},
  {type:'highway',width:160,points:[{x:300,y:3600},{x:470,y:3040},{x:520,y:2450},{x:460,y:1840},{x:560,y:1240},{x:800,y:690}]},
  {type:'main',width:118,bridge:true,points:[{x:0,y:1380},{x:850,y:1350},{x:1650,y:1390},{x:2450,y:1430},{x:3250,y:1370},{x:4050,y:1280},{x:4800,y:1240}]},
  {type:'main',width:112,bridge:true,points:[{x:180,y:2720},{x:980,y:2700},{x:1680,y:2620},{x:2450,y:2520},{x:3230,y:2440},{x:4050,y:2360},{x:4780,y:2390}]},
  {type:'main',width:110,bridge:true,points:[{x:1350,y:80},{x:1390,y:780},{x:1510,y:1450},{x:1680,y:2110},{x:1870,y:2780},{x:1940,y:3560}]},
  {type:'main',width:116,points:[{x:3300,y:60},{x:3280,y:620},{x:3350,y:1260},{x:3520,y:1880},{x:3650,y:2500},{x:3740,y:3540}]},
  {type:'main',width:104,bridge:true,points:[{x:300,y:2020},{x:1050,y:1990},{x:1800,y:2020},{x:2550,y:2070},{x:3300,y:2000},{x:4100,y:1910},{x:4750,y:1840}]},
  {type:'local',width:76,points:[{x:1860,y:820},{x:1860,y:2460}]},{type:'local',width:76,points:[{x:2160,y:790},{x:2160,y:2500}]},{type:'local',width:76,points:[{x:2470,y:760},{x:2470,y:2480}]},{type:'local',width:76,bridge:true,points:[{x:2780,y:710},{x:2780,y:2440}]},{type:'local',width:76,bridge:true,points:[{x:3070,y:650},{x:3070,y:2400}]},
  {type:'local',width:72,points:[{x:1540,y:980},{x:3310,y:980}]},{type:'local',width:72,bridge:true,points:[{x:1500,y:1700},{x:3500,y:1660}]},{type:'local',width:72,points:[{x:1700,y:2290},{x:3640,y:2250}]},
  {type:'local',width:68,points:[{x:80,y:3160},{x:430,y:2940},{x:820,y:2870},{x:1110,y:2990},{x:1220,y:3280},{x:1060,y:3520}]},
  {type:'local',width:66,points:[{x:110,y:2380},{x:420,y:2200},{x:760,y:2240},{x:940,y:2460},{x:820,y:2640}]},
  {type:'local',width:70,points:[{x:3860,y:650},{x:4200,y:560},{x:4580,y:690},{x:4680,y:980},{x:4470,y:1160},{x:4080,y:1100}]},
  {type:'local',width:70,points:[{x:3910,y:2820},{x:4270,y:2720},{x:4630,y:2850},{x:4690,y:3200},{x:4450,y:3440},{x:4050,y:3370}]}
];
const parks=[{x:720,y:770,w:460,h:420,kind:'park'},{x:720,y:1500,w:520,h:380,kind:'sport'},{x:2050,y:2850,w:650,h:510,kind:'park'},{x:3870,y:1430,w:600,h:330,kind:'sport'},{x:2800,y:2640,w:520,h:420,kind:'campus'}];
const walkPaths=[
  [{x:760,y:820},{x:1130,y:820},{x:1130,y:1140},{x:760,y:1140},{x:760,y:820}],
  [{x:2080,y:2910},{x:2620,y:2910},{x:2620,y:3280},{x:2080,y:3280},{x:2080,y:2910}],
  [{x:3920,y:1480},{x:4400,y:1480},{x:4400,y:1700},{x:3920,y:1700},{x:3920,y:1480}]
];

export function mount(panel){
  const canvas=panel.querySelector('.city-stage>canvas'),ctx=fitCanvas(canvas,VIEW_W,VIEW_H,1.5);
  const scoreEl=panel.querySelector('[data-score]'),hudScore=panel.querySelector('[data-hud-score]'),bestEl=panel.querySelector('[data-best]'),comboEl=panel.querySelector('[data-combo]'),districtEl=panel.querySelector('[data-district]'),statusEl=panel.querySelector('[data-status]'),pauseBtn=panel.querySelector('[data-pause]'),overlay=panel.querySelector('.arcade-overlay'),overlayTitle=overlay.querySelector('h3'),overlayCopy=overlay.querySelector('p'),overlayAction=overlay.querySelector('[data-overlay-action]');
  const controls={left:false,right:false,up:false,down:false,brake:false},keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'brake'};
  const reduced=prefersReducedMotion(),mobile=matchMedia('(max-width:700px),(pointer:coarse)').matches,pedBudget=mobile?32:52;
  let state='ready',best=safeBest(BEST_KEY),score=0,combo=1,grace=0,driftTime=0,car,camera={x:0,y:0},lastSkid=0,lastEngine=0,lastImpact=0,marks=[],particles=[],popups=[],replenishClock=0;
  const buildings=[],navNodes=[],navEdges=[],peds=[],chunkCache=new Map();
  function seeded(seed){let s=seed>>>0;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)}const random=seeded(920731);
  const editable=target=>target?.matches?.('input,textarea,select,[contenteditable="true"]');

  function segmentDistance(px,py,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((px-a.x)*dx+(py-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-(a.x+dx*t),py-(a.y+dy*t));}
  function nearPolyline(x,y,path,width){for(let i=1;i<path.length;i++)if(segmentDistance(x,y,path[i-1],path[i])<width)return true;return false;}
  function nearRiver(x,y,padding=0){return nearPolyline(x,y,river,142+padding);}
  function nearRoad(x,y,padding=0){return roads.some(r=>nearPolyline(x,y,r.points,r.width*.5+padding));}
  function buildScenery(){
    const zones=[{x:80,y:820,w:1180,h:1020,step:190},{x:1560,y:780,w:1700,h:1650,step:170},{x:3520,y:420,w:1120,h:1700,step:185},{x:120,y:2860,w:1360,h:610,step:185},{x:2860,y:2700,w:1760,h:700,step:190}];
    for(const z of zones)for(let y=z.y;y<z.y+z.h;y+=z.step)for(let x=z.x;x<z.x+z.w;x+=z.step){const w=105+random()*48,h=82+random()*55,cx=x+w/2,cy=y+h/2;if(nearRiver(cx,cy,Math.max(w,h)*.55)||nearRoad(cx,cy,Math.max(w,h)*.55)||parks.some(p=>cx>p.x-30&&cx<p.x+p.w+30&&cy>p.y-30&&cy<p.y+p.h+30))continue;buildings.push({x,y,w,h,tone:Math.floor(random()*3),complex:x>2700&&y>2500});}
  }
  function addNode(x,y){const id=navNodes.length;navNodes.push({x:clamp(x,20,WORLD_W-20),y:clamp(y,20,WORLD_H-20)});navEdges.push([]);return id;}
  function link(a,b){if(a===b)return;if(!navEdges[a].includes(b))navEdges[a].push(b);if(!navEdges[b].includes(a))navEdges[b].push(a);}
  function addNavPolyline(points,offset=0){let previous=-1;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),nx=-dy/(len||1),ny=dx/(len||1),steps=Math.max(1,Math.ceil(len/145));for(let s=0;s<=steps;s++){if(i>1&&s===0)continue;const t=s/steps,id=addNode(a.x+dx*t+nx*offset,a.y+dy*t+ny*offset);if(previous>=0)link(previous,id);previous=id;}}}
  function buildNavigation(){for(const road of roads){const side=road.width*.5+12;addNavPolyline(road.points,side);addNavPolyline(road.points,-side);}for(const path of walkPaths)addNavPolyline(path,0);for(let i=0;i<navNodes.length;i++)for(let j=i+1;j<navNodes.length;j++){const dx=navNodes[i].x-navNodes[j].x,dy=navNodes[i].y-navNodes[j].y;if(dx*dx+dy*dy<86*86)link(i,j);}}
  buildScenery();buildNavigation();

  function resetCar(){car={x:2050,y:1390,px:2050,py:1390,heading:0,vx:0,vy:0,r:VEHICLE.radius};camera.x=car.x-VIEW_W/2;camera.y=car.y-VIEW_H/2;clearControls();statusEl.textContent='Car reset near the central grid.';}
  function clearControls(){Object.keys(controls).forEach(k=>controls[k]=false);panel.querySelectorAll('[data-drive]').forEach(b=>b.classList.remove('is-active'));}
  function screenOutside(x,y,margin=160){return x<camera.x-margin||x>camera.x+VIEW_W+margin||y<camera.y-margin||y>camera.y+VIEW_H+margin;}
  function chooseSpawnNode(initial=false){let choices=[];for(let i=0;i<navNodes.length;i++){const n=navNodes[i],d=Math.hypot(n.x-car.x,n.y-car.y);if(initial?d>150&&d<1200:d>560&&d<1300&&screenOutside(n.x,n.y,130))choices.push(i)}if(!choices.length)for(let i=0;i<navNodes.length;i++)if(Math.hypot(navNodes[i].x-car.x,navNodes[i].y-car.y)>420)choices.push(i);return choices[Math.floor(random()*choices.length)]??0}
  function chooseNext(p){const options=navEdges[p.node].filter(id=>id!==p.previous);const pool=options.length?options:navEdges[p.node];if(!pool.length)return p.node;let bestId=pool[0],bestScore=Infinity;for(const id of pool){let crowd=0;for(const other of peds)if(other!==p&&other.target===id)crowd++;const n=navNodes[id],distance=Math.hypot(n.x-p.x,n.y-p.y),score=crowd*3+random()*2-distance*.002;if(score<bestScore){bestScore=score;bestId=id;}}return bestId;}
  function respawnPed(p,initial=false){const node=chooseSpawnNode(initial),next=navEdges[node][Math.floor(random()*Math.max(1,navEdges[node].length))]??node,a=navNodes[node],b=navNodes[next],progress=initial?random()*.9:0;p.x=a.x+(b.x-a.x)*progress;p.y=a.y+(b.y-a.y)*progress;p.px=p.x;p.py=p.y;p.node=node;p.previous=-1;p.target=next;p.speed=27+random()*24;p.phase=random()*6;p.color=`hsl(${Math.floor(random()*320)},58%,56%)`;p.state='walk';p.hit=false;p.life=0;p.z=0;p.vz=0;p.vx=0;p.vy=0;p.pause=initial&&random()<.16?random()*1.2:0;}
  function resetWorld(){score=0;combo=1;grace=0;driftTime=0;marks=[];particles=[];popups=[];resetCar();while(peds.length<pedBudget)peds.push({});for(const p of peds)respawnPed(p,true);updateUI();}
  function updateUI(){const value=Math.floor(score);best=Math.max(best,value);scoreEl.textContent=value.toLocaleString();hudScore.textContent=value.toLocaleString();bestEl.textContent=best.toLocaleString();comboEl.textContent=`x${combo.toFixed(1)}`;districtEl.textContent='Car · Free drive';}
  function collision(){let hit=false;if(car.x<car.r){car.x=car.r;car.vx=Math.abs(car.vx)*.3;hit=true}else if(car.x>WORLD_W-car.r){car.x=WORLD_W-car.r;car.vx=-Math.abs(car.vx)*.3;hit=true}if(car.y<car.r){car.y=car.r;car.vy=Math.abs(car.vy)*.3;hit=true}else if(car.y>WORLD_H-car.r){car.y=WORLD_H-car.r;car.vy=-Math.abs(car.vy)*.3;hit=true}if(hit){combo=1;grace=0;const now=performance.now();if(now-lastImpact>240){lastImpact=now;window.GameAudio?.play('city','impact');}}}
  function popup(x,y,text){popups.push({x,y,text,life:1});if(popups.length>12)popups.shift();}
  function hitPed(p,speed,drifting){if(p.hit)return;p.hit=true;p.state='hit';const dx=p.x-car.x,dy=p.y-car.y,d=Math.max(1,Math.hypot(dx,dy)),impulse=clamp(speed*1.15,90,360);p.vx=dx/d*impulse+car.vx*.35;p.vy=dy/d*impulse+car.vy*.35;p.vz=clamp(speed*.65,70,230);p.z=0;p.rot=0;p.spin=(random()-.5)*5;p.life=2.2;const hitPoints=Math.floor(clamp(speed*.22,12,75)*combo);score+=hitPoints;if(!reduced)for(let i=0;i<6;i++)particles.push({x:p.x,y:p.y,vx:(random()-.5)*90,vy:(random()-.5)*90,life:1});if(particles.length>30)particles.splice(0,particles.length-30);if(drifting){const bonus=Math.floor(60*combo);score+=bonus;popup(p.x,p.y-24,`SLIDE HIT +${hitPoints+bonus}`);window.GameAudio?.play('city','combo')}else{popup(p.x,p.y-20,`HIT +${hitPoints}`);window.GameAudio?.play('city','pedestrian')}combo=clamp(combo+.35,1,5);grace=1.2;best=safeBest(BEST_KEY,score);}
  function updatePeds(dt,drifting,speed){replenishClock+=dt;for(let index=0;index<peds.length;index++){const p=peds[index];p.px=p.x;p.py=p.y;if(p.state==='hit'){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vz-=430*dt;if(p.z<0){p.z=0;p.vz=0;p.vx*=Math.exp(-4*dt);p.vy*=Math.exp(-4*dt)}p.rot+=p.spin*dt;p.life-=dt;if(p.life<=0&&replenishClock>.08){replenishClock=0;respawnPed(p)}continue}if(Math.hypot(p.x-car.x,p.y-car.y)>1550&&screenOutside(p.x,p.y,260)&&replenishClock>.06){replenishClock=0;respawnPed(p,true);continue}if(p.pause>0){p.pause-=dt;continue}const target=navNodes[p.target],dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy);if(d<8){p.previous=p.node;p.node=p.target;p.target=chooseNext(p);if(random()<.11)p.pause=.35+random()*1.2;continue}let ux=dx/(d||1),uy=dy/(d||1);const carD=Math.hypot(p.x-car.x,p.y-car.y);if(carD<85&&speed>70){ux+=(p.x-car.x)/Math.max(1,carD)*1.6;uy+=(p.y-car.y)/Math.max(1,carD)*1.6}let sx=0,sy=0;for(let j=0;j<peds.length;j++){const other=peds[j];if(other===p||other.state==='hit')continue;const ox=p.x-other.x,oy=p.y-other.y,od2=ox*ox+oy*oy;if(od2>0&&od2<20*20){sx+=ox/od2;sy+=oy/od2}}const l=Math.hypot(ux+sx*28,uy+sy*28)||1;ux=(ux+sx*28)/l;uy=(uy+sy*28)/l;p.x+=ux*p.speed*dt;p.y+=uy*p.speed*dt;p.phase+=dt*p.speed*.18;if(carD<car.r+9){if(speed>55)hitPed(p,speed,drifting);else{p.x+=ux*18*dt;p.y+=uy*18*dt}}}}
  function update(dt){if(state!=='playing')return;const vehicle=VEHICLE;car.px=car.x;car.py=car.y;const fx=Math.cos(car.heading),fy=Math.sin(car.heading),rx=-fy,ry=fx;let forward=car.vx*fx+car.vy*fy,lateral=car.vx*rx+car.vy*ry;if(controls.up)forward+=vehicle.accel*dt;if(controls.down)forward+=forward>22?-vehicle.brake*dt:-vehicle.reverse*dt;const steer=(controls.right?1:0)-(controls.left?1:0),sf=clamp(Math.abs(forward)/90,0,1.2);if(Math.abs(forward)>4)car.heading+=steer*vehicle.steer*sf*Math.sign(forward)*dt*(controls.brake?1.18:1);lateral*=Math.exp(-(controls.brake?vehicle.driftGrip:vehicle.grip)*dt);forward*=Math.exp(-(controls.up ? .34 : .72)*dt);forward=clamp(forward,-vehicle.maxReverse,vehicle.maxSpeed);car.vx=fx*forward+rx*lateral;car.vy=fy*forward+ry*lateral;car.x+=car.vx*dt;car.y+=car.vy*dt;collision();
    const speed=Math.abs(forward),slip=Math.atan2(Math.abs(lateral),Math.max(18,speed)),drifting=speed>85&&slip>.17&&slip<1.02;if(drifting){driftTime+=dt;grace=1;combo=clamp(1+driftTime/2.7,1,5);score+=dt*(24+speed*.1)*(1+slip)*combo;if(!reduced&&Math.floor(driftTime*16)!==Math.floor((driftTime-dt)*16)){marks.push({x:car.x-fx*17+rx*10,y:car.y-fy*17+ry*10,life:1});marks.push({x:car.x-fx*17-rx*10,y:car.y-fy*17-ry*10,life:1});if(marks.length>160)marks.splice(0,2)}const now=performance.now();if(now-lastSkid>280){lastSkid=now;window.GameAudio?.play('city','skid')}}else{grace-=dt;if(grace<=0){combo=1;driftTime=0}}
    const now=performance.now();if(speed>35&&now-lastEngine>520){lastEngine=now;window.GameAudio?.play('city','engine',{speed})}updatePeds(dt,drifting,speed);for(const m of marks)m.life-=dt*.08;while(marks.length&&marks[0].life<=0)marks.shift();for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt*2}particles=particles.filter(p=>p.life>0);for(const p of popups){p.y-=24*dt;p.life-=dt}popups=popups.filter(p=>p.life>0);const look=clamp(speed*.35,0,95),tx=clamp(car.x+fx*look-VIEW_W/2,0,WORLD_W-VIEW_W),ty=clamp(car.y+fy*look-VIEW_H/2,0,WORLD_H-VIEW_H);camera.x+=(tx-camera.x)*Math.min(1,dt*4.5);camera.y+=(ty-camera.y)*Math.min(1,dt*4.5);updateUI();}

  function path(target,points){target.beginPath();target.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++){const p=points[i],prev=points[i-1];if(i<points.length-1){const next=points[i+1],mx=(p.x+next.x)/2,my=(p.y+next.y)/2;target.quadraticCurveTo(p.x,p.y,mx,my)}else target.lineTo(p.x,p.y)}}
  function drawRoad(target,road,overview=false){target.lineCap='round';target.lineJoin='round';path(target,road.points);target.strokeStyle=road.bridge?'#98a4a2':road.type==='highway'?PALETTE.roadDark:'#a9b0aa';target.lineWidth=road.width+(road.bridge?18:12);target.stroke();path(target,road.points);target.strokeStyle=road.type==='highway'?PALETTE.highway:PALETTE.road;target.lineWidth=road.width;target.stroke();if(!overview){path(target,road.points);target.strokeStyle=PALETTE.line;target.lineWidth=road.type==='highway'?5:3;target.setLineDash(road.type==='local'?[10,17]:[24,21]);target.stroke();target.setLineDash([])}}
  function drawGeometry(target,overview=false){target.fillStyle=PALETTE.land;target.fillRect(0,0,WORLD_W,WORLD_H);for(const park of parks){target.fillStyle=park.kind==='sport'?PALETTE.sport:park.kind==='campus'?PALETTE.landAlt:PALETTE.park;target.fillRect(park.x,park.y,park.w,park.h);if(!overview&&park.kind==='sport'){target.strokeStyle='rgba(255,255,255,.72)';target.lineWidth=5;target.strokeRect(park.x+35,park.y+32,park.w-70,park.h-64)}}path(target,river);target.strokeStyle=PALETTE.bank;target.lineWidth=330;target.stroke();path(target,river);target.strokeStyle=PALETTE.water;target.lineWidth=270;target.stroke();for(const b of buildings){target.fillStyle='rgba(59,70,72,.14)';target.fillRect(b.x+7,b.y+8,b.w,b.h);target.fillStyle=b.tone===0?PALETTE.building:b.tone===1?PALETTE.buildingAlt:PALETTE.roof;target.fillRect(b.x,b.y,b.w,b.h);if(!overview){target.strokeStyle='rgba(75,88,90,.22)';target.lineWidth=3;target.strokeRect(b.x,b.y,b.w,b.h);target.fillStyle='rgba(255,255,255,.35)';for(let x=b.x+15;x<b.x+b.w-8;x+=27)target.fillRect(x,b.y+11,11,6)}}for(const road of roads)drawRoad(target,road,overview);if(!overview)for(const p of walkPaths){path(target,p);target.strokeStyle=PALETTE.path;target.lineWidth=12;target.setLineDash([6,8]);target.stroke();target.setLineDash([])}}
  function chunk(gx,gy){const key=`${gx},${gy}`;if(chunkCache.has(key)){const value=chunkCache.get(key);chunkCache.delete(key);chunkCache.set(key,value);return value}const c=document.createElement('canvas');c.width=CHUNK;c.height=CHUNK;const cctx=c.getContext('2d');cctx.save();cctx.translate(-gx*CHUNK,-gy*CHUNK);drawGeometry(cctx);cctx.restore();chunkCache.set(key,c);while(chunkCache.size>24)chunkCache.delete(chunkCache.keys().next().value);return c}
  function drawCar(){
    ctx.save();ctx.translate(car.x-camera.x,car.y-camera.y);ctx.rotate(car.heading);ctx.fillStyle='rgba(5,20,26,.22)';ctx.beginPath();ctx.ellipse(0,2,38,18,0,0,Math.PI*2);ctx.fill();
    if(CAR_SPRITE.complete&&CAR_SPRITE.naturalWidth)ctx.drawImage(CAR_SPRITE,-38,-18,76,36);
    ctx.restore();
  }
  function drawBackgroundTexture(){
    ctx.fillStyle='#fbfcfd';ctx.fillRect(0,0,VIEW_W,VIEW_H);
    const size=88,ox=-(camera.x%size),oy=-(camera.y%size);
    ctx.strokeStyle='rgba(47,91,108,.035)';ctx.lineWidth=1;ctx.beginPath();
    for(let x=ox;x<=VIEW_W;x+=size){ctx.moveTo(x,0);ctx.lineTo(x,VIEW_H)}
    for(let y=oy;y<=VIEW_H;y+=size){ctx.moveTo(0,y);ctx.lineTo(VIEW_W,y)}
    ctx.stroke();ctx.fillStyle='rgba(47,91,108,.045)';
    for(let x=ox;x<=VIEW_W;x+=size)for(let y=oy;y<=VIEW_H;y+=size){ctx.beginPath();ctx.arc(x,y,1.2,0,Math.PI*2);ctx.fill()}
  }
  function render(){
    ctx.setTransform(canvas.width/VIEW_W,0,0,canvas.height/VIEW_H,0,0);drawBackgroundTexture();
    for(const m of marks){ctx.globalAlpha=m.life*.42;ctx.fillStyle='#172124';ctx.beginPath();ctx.arc(m.x-camera.x,m.y-camera.y,2.2,0,Math.PI*2);ctx.fill()}
    ctx.globalAlpha=1;
    for(const p of peds){
      const sx=p.x-camera.x,sy=p.y-camera.y-p.z;if(sx<-30||sx>VIEW_W+30||sy<-40||sy>VIEW_H+40)continue;
      ctx.save();ctx.translate(sx,sy);ctx.rotate(p.state==='hit'?p.rot:0);const bob=p.state==='walk'?Math.sin(p.phase)*1.5:0;
      ctx.fillStyle='rgba(9,25,28,.2)';ctx.beginPath();ctx.ellipse(0,p.z+7,7,3,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.color;ctx.fillRect(-4,-6+bob,8,13);
      ctx.fillStyle='#f1bf93';ctx.beginPath();ctx.arc(0,-9+bob,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#263b43';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-2,7);ctx.lineTo(-4,12+Math.sin(p.phase)*3);ctx.moveTo(2,7);ctx.lineTo(4,12-Math.sin(p.phase)*3);ctx.stroke();ctx.restore();
    }
    for(const p of particles){ctx.globalAlpha=p.life*.75;ctx.fillStyle='#d9a42b';ctx.fillRect(p.x-camera.x,p.y-camera.y,4,4)}
    ctx.globalAlpha=1;drawCar();
    for(const p of popups){ctx.globalAlpha=p.life;ctx.fillStyle='#152b36';ctx.font='800 15px system-ui';ctx.textAlign='center';ctx.fillText(p.text,p.x-camera.x,p.y-camera.y)}
    ctx.globalAlpha=1;ctx.textAlign='start';
  }
  const redrawCarSprite=()=>render();if(!CAR_SPRITE.complete)CAR_SPRITE.addEventListener('load',redrawCarSprite,{once:true});
  const loop=createLoop({step:STEP,update,render});
  function start(){resetWorld();state='playing';overlay.classList.add('is-hidden');pauseBtn.disabled=false;pauseBtn.textContent='Pause';window.GameAudio?.startGame('city');loop.start();canvas.focus()}
  function pause(hidden=false){if(state!=='playing')return;state='paused';loop.stop();clearControls();best=safeBest(BEST_KEY,score);pauseBtn.textContent='Resume';overlayTitle.textContent='Paused';overlayCopy.textContent=hidden?'The tab was hidden. Resume when you are ready.':'Your position and score are preserved.';overlayAction.textContent='Resume';overlay.classList.remove('is-hidden');window.GameAudio?.pauseGame('city');render()}
  function resume(){if(state!=='paused')return;state='playing';overlay.classList.add('is-hidden');pauseBtn.textContent='Pause';window.GameAudio?.resumeGame('city');loop.start();canvas.focus()}
  const keyDown=e=>{if(editable(e.target))return;if(e.code==='Escape'&&state==='playing'){e.preventDefault();pause();return}const key=keyMap[e.code];if(!key||state!=='playing')return;e.preventDefault();controls[key]=true},keyUp=e=>{const key=keyMap[e.code];if(!key)return;e.preventDefault();controls[key]=false};window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);
  const buttons=[...panel.querySelectorAll('[data-drive]')],touchStart=e=>{if(state!=='playing')return;e.preventDefault();controls[e.currentTarget.dataset.drive]=true;e.currentTarget.classList.add('is-active');try{e.currentTarget.setPointerCapture(e.pointerId)}catch(_){}},touchEnd=e=>{e.preventDefault();controls[e.currentTarget.dataset.drive]=false;e.currentTarget.classList.remove('is-active')};buttons.forEach(b=>{b.addEventListener('pointerdown',touchStart);b.addEventListener('pointerup',touchEnd);b.addEventListener('pointercancel',touchEnd);b.addEventListener('lostpointercapture',touchEnd)});
  overlayAction.addEventListener('click',()=>state==='paused'?resume():start());pauseBtn.addEventListener('click',()=>state==='paused'?resume():pause());panel.querySelector('[data-reset-car]').addEventListener('click',()=>{resetCar();render()});
  const stopVisibility=bindVisibility(pause),resize=()=>{fitCanvas(canvas,VIEW_W,VIEW_H,1.5);render()};window.addEventListener('resize',resize);resetWorld();render();
  return{pause,close(){if(state==='playing')pause();chunkCache.clear();window.GameAudio?.cancel('city')},destroy(){loop.stop();clearControls();stopVisibility();chunkCache.clear();CAR_SPRITE.removeEventListener('load',redrawCarSprite);window.GameAudio?.cancel('city');window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('resize',resize);buttons.forEach(b=>{b.removeEventListener('pointerdown',touchStart);b.removeEventListener('pointerup',touchEnd);b.removeEventListener('pointercancel',touchEnd);b.removeEventListener('lostpointercapture',touchEnd)})}};
}
