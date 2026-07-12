
(function initSettings() {
  // Immediate execution to prevent theme flash
  const useLightTheme = localStorage.getItem('pbq_theme') === 'light';

  if (useLightTheme) document.body.classList.add('light-theme');

  // Sync toggles and sidebar once DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('themeToggle').checked = useLightTheme;

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
      } else {
        const savedCollapsed = localStorage.getItem('pbq_sidebar_collapsed');
        if (savedCollapsed === 'true') {
          sidebar.classList.add('collapsed');
        } else if (savedCollapsed === 'false') {
          sidebar.classList.remove('collapsed');
        }
      }
    }
  });
})();

function toggleSettingsModal() {
  const overlay = document.getElementById('settingsOverlay');
  const fab = document.getElementById('settingsFab');
  const isOpen = overlay.classList.contains('open');

  if (!isOpen) {
    overlay.classList.add('open');
    fab.classList.add('active');
  } else {
    overlay.classList.remove('open');
    // Reset rotation for next click
    setTimeout(() => fab.classList.remove('active'), 500);
  }
}

function updateTheme(isLight) {
  if (isLight) {
    document.body.classList.add('light-theme');
    localStorage.setItem('pbq_theme', 'light');
  } else {
    document.body.classList.remove('light-theme');
    localStorage.setItem('pbq_theme', 'dark');
  }
}

/* ============================================================
   HISTORY & PERSISTENCE MANAGER
   ============================================================ */
function loadHistory() {
  try {
    let hist = localStorage.getItem('pbq_sim_history');
    if (hist) return JSON.parse(hist);
  } catch(e) { console.warn("LocalStorage unavailable."); }
  return { attempts: [], variants: {} };
}

function saveHistory(data) {
  try { localStorage.setItem('pbq_sim_history', JSON.stringify(data)); }
  catch(e) {}
}

function applyVariantHistory() {
  let hist = loadHistory();
  LABS.forEach(l => {
    let labHist = hist.variants[l.id] || {};
    ['A', 'B'].forEach(v => {
      let btn = document.getElementById('vt' + l.id + v);
      if (!btn) return;
      let score = labHist[v];
      if (score === 100) {
        btn.innerHTML = `Variant ${v} ✅`;
        btn.classList.add('v-pass');
      } else if (score !== undefined) {
        btn.innerHTML = `Variant ${v} ➖`;
        btn.classList.add('v-attempt');
      }
    });
  });
}

/* ============================================================
   BACKEND DATA MODEL
   ============================================================ */
const STATE = {
  locked:false,
  variant:{1:'A',2:'A',3:'A',4:'A',5:'A',6:'A',7:'A',8:'A',9:'A',10:'A'},
  vlocked:{1:false,2:false,3:false,4:false,5:false,6:false,7:false,8:false,9:false,10:false},
  term:{'1A':[],'1B':[],'1A_fail':false,'1B_fail':false,'10B':[],'10B_fail':false},
  chatLog:{'4A':[],'4B':[]},
  chatStep:{'4A':0,'4B':0},
  apply9A:false,
  apply9B:false
};

const LABS = [
 {id:1,title:"WinRE Boot Recovery"},
 {id:2,title:"Group Policy Sync"},
 {id:3,title:"Unattended Deployment"},
 {id:4,title:"Live Helpdesk Chat"},
 {id:5,title:"Triage & Containment"},
 {id:6,title:"BYOD Wireless & Mail"},
 {id:7,title:"Disk Management"},
 {id:8,title:"Power Allocation"},
 {id:9,title:"SOHO Router & Security"},
 {id:10,title:"Enterprise Malware Response"}
];

/* ============================================================
   RENDER: SIDEBAR TABS + LAB SHELLS
   ============================================================ */
const nav=document.getElementById('tabs'), labsBox=document.getElementById('labs');
LABS.forEach((l,i)=>{
  const b=document.createElement('button');
  b.innerHTML=`<span class="lnum">${l.id}</span><span class="lname">Lab ${l.id}: ${l.title}</span>`;
  b.title=`Lab ${l.id}: ${l.title}`;
  b.onclick=()=>showLab(l.id);
  if(i===0)b.classList.add('active');
  b.id='tab'+l.id; nav.appendChild(b);
});

function showLab(id){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab'+id).classList.add('active');
  document.querySelectorAll('.lab').forEach(l=>l.classList.remove('active'));
  document.getElementById('lab'+id).classList.add('active');

  if (!STATE.locked && !STATE.vlocked[id]) {
    let hist = loadHistory();
    let labHist = hist.variants[id] || {};
    if (labHist['A'] === 100) {
      setVariant(id, 'B');
    } else {
      setVariant(id, 'A');
    }
  }

  if(id===4){scrollChat('4A');scrollChat('4B');}
}

function scrollChat(key){const w=document.getElementById('win'+key);if(w)w.scrollTop=w.scrollHeight;}
function toggleSidebar(){
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('pbq_sidebar_collapsed', sidebar.classList.contains('collapsed') ? 'true' : 'false');
  }
}
function setVariant(lab,v){
  if(STATE.locked||STATE.vlocked[lab])return;
  STATE.variant[lab]=v;
  document.getElementById('lab'+lab+'A').style.display=(v==='A')?'flex':'none';
  document.getElementById('lab'+lab+'B').style.display=(v==='B')?'flex':'none';
  document.getElementById('vt'+lab+'A').classList.toggle('on',v==='A');
  document.getElementById('vt'+lab+'B').classList.toggle('on',v==='B');
  if(lab===4){scrollChat('4A');scrollChat('4B');}
}
function lockVariant(lab){
  if(STATE.vlocked[lab])return;
  STATE.vlocked[lab]=true;
  const other=STATE.variant[lab]==='A'?'B':'A';
  const btn=document.getElementById('vt'+lab+other);
  btn.disabled=true;
  btn.title='Locked — you committed to Variant '+STATE.variant[lab]+' by answering. Reset the test to switch.';
  const note=document.getElementById('vnote'+lab);
  if(note)note.textContent='Committed to Variant '+STATE.variant[lab];
}
function labShell(id,innerA,innerB){
  const chatCls=id===4?' chat-lab':'';
  return `<section class="lab${chatCls}${id===1?' active':''}" id="lab${id}">
  <div class="variant-toggle">
    <button id="vt${id}A" class="v-btn on" onclick="setVariant(${id},'A')">Variant A</button>
    <button id="vt${id}B" class="v-btn" onclick="setVariant(${id},'B')">Variant B</button>
    <span class="vlock-note" id="vnote${id}"></span>
  </div>
  <div id="lab${id}A" class="vwrap" style="display:flex">${innerA}</div>
  <div id="lab${id}B" class="vwrap" style="display:none">${innerB}</div>
  </section>`;
}

/* ============================================================
   LAB 1 — WinRE CLI TERMINALS
   ============================================================ */
const lab1A=`<div class="card" style="flex-shrink: 0;"><h2>WinRE Command Line — Legacy MBR Recovery</h2>
<p class="scenario">A legacy BIOS workstation crashes on boot with the <b>BOOTMGR is missing</b> error. You have been dropped into the Windows Recovery Environment (WinRE) command prompt. Restore boot capability using the correct command sequence, then exit and restart.</p></div>
<div class="card flex-card">
<div class="terminal" id="term1A" style="flex: 1; min-height: 100px; max-height: none;">Microsoft Windows [Version 10.0.19045]
(c) Microsoft Corporation. All rights reserved.

ERROR CONTEXT: BOOTMGR is missing. Legacy BIOS / MBR disk detected.
</div>
<div class="term-input" style="align-items: center; flex-wrap: wrap; flex-shrink: 0;">
  <span style="padding-top: 0;">X:\\Sources&gt;</span>
  <input type="hidden" id="in1A">
  <select id="cli1A_1" onchange="updateCli(1, '1A')"></select>
  <select id="cli1A_2" onchange="updateCli(2, '1A')" disabled></select>
  <select id="cli1A_3" disabled></select>
  <button class="hbtn" style="padding: 6px 12px; font-size: clamp(12px, 1vw, 13.5px);" onclick="execCli('1A')">Execute</button>
</div>
<p class="note" style="flex-shrink: 0;">Select command components and click Execute. Command order matters. UEFI-only diskpart operations on this MBR system will fail the scenario.</p>
</div>`;

const lab1B=`<div class="card flex-card">
<div style="flex-shrink: 0;">
  <h2>Archetype 1: WinRE Command Line Boot Recovery - Variant B (Modern UEFI/EFI)</h2>
  <p class="scenario">A modern UEFI system fails to boot. When the student attempts standard recovery commands, the terminal throws an <b>Access is Denied</b> error explicitly during the <b>bootrec /fixboot</b> execution phase.</p>
  <div class="terminal" id="term1B" style="height: 140px; min-height: 100px; max-height: none; flex-shrink: 0;">Microsoft Windows [Version 10.0.19045.2965]
(c) Microsoft Corporation. All rights reserved.

X:\\Sources&gt;bootrec /fixboot
<span class="err">Access is Denied.</span>
</div>
  <div class="term-input" style="align-items: center; flex-wrap: wrap; flex-shrink: 0;">
    <span style="padding-top: 0;">X:\\Sources&gt;</span>
    <input type="hidden" id="in1B">
    <select id="cli1B_1" onchange="updateCli(1, '1B')"></select>
    <select id="cli1B_2" onchange="updateCli(2, '1B')" disabled></select>
    <select id="cli1B_3" disabled></select>
    <button class="hbtn" style="padding: 6px 12px; font-size: clamp(12px, 1vw, 13.5px);" onclick="execCli('1B')">Execute</button>
  </div>
  <p class="note" style="flex-shrink: 0;"><b>Deceptive Traps:</b> Endless loops of running fixboot, or the student uses diskpart to format the primary C:\\Windows NTFS partition instead of the hidden FAT32 EFI System Partition (ESP), resulting in catastrophic data loss and immediate PBQ failure.</p>
</div>
<div class="steps-container" style="overflow-y: auto; flex: 1; min-height: 0; padding-right: 8px; margin-top: 10px;">
  <h3 style="margin-top: 4px;">Multi-Step Resolution Sequence</h3>
  <ol style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 4px 16px; margin-left: 22px; font-size: clamp(12px, 1vw, 13.5px); color: #adbac7; line-height: 1.4;">
    <li>Execute <b>diskpart</b> to enter the disk partition utility.</li>
    <li>Execute <b>sel disk 0</b> to select the primary physical drive.</li>
    <li>Execute <b>list vol</b> to display all partitions. <br><span style="color:#8b949e; font-size:clamp(11px, 0.9vw, 12px);">(Target String readout to identify: <code style="font-family:monospace;">Volume 2    System      FAT32   Partition     100 MB  Hidden</code>)</span></li>
    <li>Locate the 100 MB FAT32 Hidden partition (typically Volume 2) and execute <b>sel vol 2</b>.</li>
    <li>Execute <b>assign letter=v:</b> to mount the EFI partition with a recognizable drive letter.</li>
    <li>Execute <b>exit</b> to leave the diskpart utility.</li>
    <li>Execute <b>format v: /FS:FAT32</b> to wipe the corrupted EFI boot store.</li>
    <li>Execute <b>bcdboot C:\\Windows /s v: /f UEFI</b> to write a clean UEFI boot configuration data store from the Windows directory to the newly formatted V: partition.</li>
  </ol>
  <h3 style="margin-top: 12px;">Edge Cases</h3>
  <ul style="margin-left: 22px; font-size: clamp(12px, 1vw, 13.5px); color: #adbac7; line-height: 1.4;">
    <li><b>File System Corruption:</b> If the WinRE log explicitly reads "The file system is corrupt" or indicates bad sectors on the primary drive, the sequence must begin with <b>chkdsk c: /f /r</b> (fixes logical file system errors and recovers readable information from physical bad sectors).</li>
    <li><b>System File Integrity Violation:</b> If the log reads "Resource Protection could not perform the requested operation" or mentions missing core .dll files, the student must bypass bootrec and run <b>sfc /scannow /offbootdir=C:\\ /offwindir=C:\\Windows</b> to repair offline Windows images.</li>
  </ul>
</div>
</div>`;

function norm(s){return s.trim().toLowerCase().replace(/\s+/g,' ');}
function termExec(key){
  if(STATE.locked)return;
  const inp=document.getElementById('in'+key), term=document.getElementById('term'+key);
  const raw=inp.value; if(!raw.trim())return;
  const c=norm(raw);
  STATE.term[key].push(c);
  lockVariant(1);
  let out='';
  if(key==='1A'){
    if(c==='bootrec /fixmbr')out='<span class="ok">The operation completed successfully.</span>';
    else if(c==='bootrec /fixboot')out='<span class="ok">The operation completed successfully.</span>';
    else if(c==='bootrec /rebuildbcd')out='Scanning all disks for Windows installations.\nTotal identified Windows installations: 1\n[1] C:\\Windows\nAdd installation to boot list? Yes(Y)/No(N)/All(A): Y\n<span class="ok">The operation completed successfully.</span>';
    else if(c==='exit')out='<span class="ok">Exiting WinRE... Restarting workstation.</span>';
    else if(c.startsWith('diskpart')||c.includes('/f uefi')||c.startsWith('bcdboot')){STATE.term['1A_fail']=true;out='<span class="err">FATAL: UEFI operations attempted on legacy MBR system. Scenario integrity compromised.</span>';}
    else out=`'${raw.trim()}' is not recognized as a valid recovery command in this context.`;
  } else if (key === '1B') {
    if(c==='diskpart')out='Microsoft DiskPart version 10.0\nDISKPART&gt;';
    else if(c==='sel disk 0'||c==='select disk 0')out='Disk 0 is now the selected disk.';
    else if(c==='list vol'||c==='list volume')out='  Volume ###  Ltr  Label       Fs      Type          Size     Status    Info\n  ----------  ---  ----------  ------  ------------  -------  --------  ------\n  Volume 0     C   Windows     NTFS    Partition      475 GB  Healthy\n  Volume 1         Recovery    NTFS    Partition      500 MB  Healthy   Hidden\n  Volume 2         System      FAT32   Partition      100 MB  Healthy   Hidden';
    else if(c==='sel vol 2'||c==='select vol 2'||c==='select volume 2')out='Volume 2 is the selected volume.';
    else if(c==='assign letter=v:'||c==='assign letter=v')out='<span class="ok">DiskPart successfully assigned the drive letter or mount point.</span>';
    else if(c==='exit')out='Leaving DiskPart...';
    else if(c==='format v: /fs:fat32')out='<span class="ok">Format complete. 100 MB total disk space.</span>';
    else if(c==='bcdboot c:\\windows /s v: /f uefi')out='<span class="ok">Boot files successfully created.</span>';
    else if(c.startsWith('format c')||c.includes('format c:')){STATE.term['1B_fail']=true;out='<span class="err">CATASTROPHIC: Primary NTFS OS partition formatted. All client data destroyed. PBQ FAILURE.</span>';}
    else if(c==='bootrec /fixboot')out='<span class="err">Access is Denied.</span>';
    else out=`'${raw.trim()}' is not recognized in this context.`;
  } else if (key === '10B') {
    if (c === 'ipconfig /release') {
      out = 'Windows IP Configuration\nEthernet adapter Ethernet:\n  Connection-specific DNS Suffix  . : \n  IPv4 Address. . . . . . . . . . . : \n  Subnet Mask . . . . . . . . . . . : \n  Default Gateway . . . . . . . . . : \n<span class="ok">Network connection successfully dropped. Quarantine complete.</span>';
    } else if (c === 'ipconfig /renew') {
      STATE.term['10B_fail'] = true;
      out = '<span class="err">WARNING: IP address renewed. Ransomware is spreading across the network.</span>';
    } else if (c === 'ping 8.8.8.8') {
      out = 'Pinging 8.8.8.8 with 32 bytes of data:\nReply from 8.8.8.8: bytes=32 time=14ms TTL=117';
    } else {
      out = `'${raw.trim()}' is not recognized as an internal or external command.`;
    }
  }

  const prompt = key === '10B' ? 'C:\\&gt;' : 'X:\\Sources&gt;';
  term.innerHTML+=`\n${prompt}${raw.trim()}\n${out}\n`;
  term.scrollTop=term.scrollHeight;
  inp.value='';
}

const CLI_MENU = {
  '1A': { 'bootrec': { '/fixmbr': ['[Execute]'], '/fixboot': ['[Execute]'], '/rebuildbcd': ['[Execute]'] }, 'exit': { '[None]': ['[Execute]'] }, 'diskpart': { '[None]': ['[Execute]'] }, 'bcdboot': { 'C:\\Windows': ['/s v: /f UEFI'] } },
  '1B': { 'diskpart': { '[None]': ['[Execute]'] }, 'sel': { 'disk': ['0'], 'vol': ['2'] }, 'list': { 'vol': ['[Execute]'] }, 'assign': { 'letter=v:': ['[Execute]'] }, 'exit': { '[None]': ['[Execute]'] }, 'format': { 'v:': ['/FS:FAT32'], 'c:': ['[Execute]'] }, 'bcdboot': { 'C:\\Windows': ['/s v: /f UEFI'] } },
  '10B': { 'ipconfig': { '/release': ['[Execute]'], '/renew': ['[Execute]'] }, 'ping': { '8.8.8.8': ['[Execute]'] } }
};

function initCli(key) {
  const s1 = document.getElementById('cli' + key + '_1');
  if (!s1) return;
  s1.innerHTML = '<option value="">-- Command --</option>';
  for (let cmd in CLI_MENU[key]) { s1.innerHTML += `<option value="${cmd}">${cmd}</option>`; }
  const s2 = document.getElementById('cli' + key + '_2');
  const s3 = document.getElementById('cli' + key + '_3');
  s2.innerHTML = '<option value="">-- Flag/Param --</option>';
  s3.innerHTML = '<option value="">-- Target/Exec --</option>';
  s2.disabled = true; s3.disabled = true;
}

function updateCli(level, key) {
  const s1 = document.getElementById('cli' + key + '_1');
  const s2 = document.getElementById('cli' + key + '_2');
  const s3 = document.getElementById('cli' + key + '_3');
  if (level === 1) {
    s2.innerHTML = '<option value="">-- Flag/Param --</option>'; s3.innerHTML = '<option value="">-- Target/Exec --</option>'; s3.disabled = true;
    if (s1.value && CLI_MENU[key][s1.value]) { s2.disabled = false; for (let flag in CLI_MENU[key][s1.value]) { s2.innerHTML += `<option value="${flag}">${flag}</option>`; } } else { s2.disabled = true; }
  } else if (level === 2) {
    s3.innerHTML = '<option value="">-- Target/Exec --</option>';
    if (s2.value && CLI_MENU[key][s1.value][s2.value]) { s3.disabled = false; CLI_MENU[key][s1.value][s2.value].forEach(target => { s3.innerHTML += `<option value="${target}">${target}</option>`; }); } else { s3.disabled = true; }
  }
  if (typeof fitSelect === 'function') { fitSelect(s1); fitSelect(s2); fitSelect(s3); }
}

function execCli(key) {
  const s1 = document.getElementById('cli' + key + '_1');
  const s2 = document.getElementById('cli' + key + '_2');
  const s3 = document.getElementById('cli' + key + '_3');
  if (!s1.value || !s2.value || !s3.value) return;
  let cmdStr = s1.value;
  if (s2.value !== '[None]') cmdStr += ' ' + s2.value;
  if (s3.value !== '[Execute]') cmdStr += ' ' + s3.value;
  document.getElementById('in' + key).value = cmdStr;
  termExec(key);
  s1.value = ''; updateCli(1, key);
}

/* ============================================================
   LAB 2 — GROUP POLICY
   ============================================================ */
const gpoOptsA=['-- Select Action --','Open Local Security Policy (secpol.msc)','Execute gpresult /r','Execute gpupdate /force','Reboot machine immediately','Instruct user to Log Off and Log Back In','Edit registry HKLM policy keys manually'];
const gpoOptsB=['-- Select Action --','Execute ipconfig /release','Execute ipconfig /flushdns','Execute ipconfig /registerdns','Execute gpupdate /force','Edit registry HKLM policy keys manually','Assume GPO is broken; rebuild GPO from scratch'];
function selRow(id,n,opts){return `<div class="step-row"><span class="num">${n}</span><select id="${id}">${opts.map((o,i)=>`<option value="${i}">${o}</option>`).join('')}</select></div>`;}
const lab2A=`<div class="card"><h2>OU Relocation — Missing Drive Mappings</h2><p class="scenario">An employee profile has been moved from the "Sales" Organizational Unit (OU) to "Management" in Active Directory, but the user lacks their new Management network drive mappings. From an elevated command prompt, select the correct ordered sequence of actions.</p><h3>Ordered Resolution Steps</h3>${selRow('gpo2A1',1,gpoOptsA)}${selRow('gpo2A2',2,gpoOptsA)}${selRow('gpo2A3',3,gpoOptsA)}</div>`;
const lab2B=`<div class="card"><h2>Blocked Policy — Stale DNS to Decommissioned DC</h2><p class="scenario">A machine refuses to pull new security compliance templates. The local DNS cache is pointing to a decommissioned Domain Controller. Select the correct ordered sequence of actions to restore policy synchronization.</p><h3>Ordered Resolution Steps</h3>${selRow('gpo2B1',1,gpoOptsB)}${selRow('gpo2B2',2,gpoOptsB)}${selRow('gpo2B3',3,gpoOptsB)}</div>`;

/* ============================================================
   LAB 3 — UNATTENDED DEPLOYMENT
   ============================================================ */
const lab3A=`<div class="card"><h2>Automated Answer File Image Rollout</h2><p class="scenario">Configure an automated corporate image rollout requiring zero human interaction during installation (OOBE bypass, timezone setting, partition creation) on a prepared reference machine.</p><label>1. Tool used to generate the answer file:</label><select id="d3A1"><option value="0">-- Select --</option><option value="1">Notepad (.txt configuration)</option><option value="2">Windows System Image Manager (WSIM)</option><option value="3">Registry Editor (regedit)</option></select><label>2. Correct answer file format/name:</label><select id="d3A2"><option value="0">-- Select --</option><option value="1">unattend.ini</option><option value="2">deploy.txt</option><option value="3">unattend.xml</option></select><label>3. Command to strip the machine's unique SID and automate OOBE:</label><select id="d3A3"><option value="0">-- Select --</option><option value="1">sysprep.exe /generalize /oobe /unattend:unattend.xml</option><option value="2">sysprep.exe /audit /reboot</option><option value="3">dism /online /cleanup-image /restorehealth</option></select></div>`;
const lab3B=`<div class="card"><h2>Command Line Silent Patch Deployment</h2><p class="scenario">Deploy an executable security patch to hundreds of endpoint nodes without prompting end-users or interrupting their workflow. A midday mass reboot is an instant failure.</p><label>1. Correct silent install command for an .msi package:</label><select id="d3B1"><option value="0">-- Select --</option><option value="1">msiexec /i package.msi /qn /norestart</option><option value="2">msiexec /i package.msi /interactive /forcerestart</option><option value="3">package.msi /silent /rebootnow</option></select><label>2. Correct silent switch chain for a wrapped .exe installer:</label><select id="d3B2"><option value="0">-- Select --</option><option value="1">setup.exe /verbose /promptall</option><option value="2">setup.exe /S /v"/qn"</option><option value="3">setup.exe /uninstall /f</option></select><label>3. Which switch prevents the mass midday reboot event?</label><select id="d3B3"><option value="0">-- Select --</option><option value="1">/forcerestart</option><option value="2">/qb</option><option value="3">/norestart</option></select></div>`;

/* ============================================================
   LAB 4 — LIVE CHAT
   ============================================================ */
const CHAT={'4A':{intro:[{who:'them',t:"THIS IS UNACCEPTABLE. I am the VP of Global Sales and I am LOCKED OUT before a board call in 10 minutes. Bypass this lock NOW or I'm calling your director."}],steps:[{them:"Well?? I don't have time for scripts. UNLOCK IT.",choices:[{t:'"Sir, you need to calm down before I can assist you."',ok:false},{t:'"I understand how critical this is for you."',ok:true},{t:'"Okay, given your position I\'ll bypass the lock immediately."',ok:false}]},{them:"Fine. So you're fixing it right now, yes?",choices:[{t:'"I can certainly help you get this resolved right away."',ok:true},{t:'"Policy is policy — there is nothing I can do quickly."',ok:false},{t:'"I\'ve already unlocked it, no verification needed for executives."',ok:false}]},{them:"Great. Just unlock it. What else do you possibly need?",choices:[{t:'"Nothing else — you\'re unlocked. Have a great board call!"',ok:false},{t:'"For security purposes, could you please verify your Employee ID or PIN?"',ok:true},{t:'"Can you email me from your personal Gmail to confirm identity?"',ok:false}]}]},'4B':{intro:[{who:'them',t:"Hi — I'm locked out of the finance database and I need an administrative override immediately. My chat name checks out, just push the reset through."}],steps:[{them:"Come on, you can see my profile name right there. Just reset it.",choices:[{t:'"Your chat profile is sufficient — resetting the password now."',ok:false},{t:'"I\'m unable to perform an immediate override, but I can absolutely help you through the secure process."',ok:true},{t:'"Overrides aren\'t my department. Goodbye."',ok:false}]},{them:"Ugh. Fine. Call me at 555-0199, that's my cell, and verify me there.",choices:[{t:'"Sure, calling the number you just gave me now."',ok:false},{t:'"I\'ll initiate a callback to your registered desk phone listed in the internal directory."',ok:true},{t:'"No calls needed — just tell me your mother\'s maiden name here in chat."',ok:false}]},{them:"Okay okay. What else do you need to grant the database access?",choices:[{t:'"Nothing — access granted after the callback."',ok:false},{t:'"Sensitive database access requires manager approval in the ticketing system plus MFA token verification."',ok:true},{t:'"I\'ll grant temporary admin rights to skip the paperwork."',ok:false}]}]}};
function chatHTML(key,title,scen){const c=CHAT[key];let w=c.intro.map(m=>`<div class="msg them">${m.t}</div>`).join('');return `<div class="chat-card"><h2>${title}</h2><p class="scenario">${scen}</p><div class="chat-window" id="win${key}"><div class="spacer"></div>${w}<div class="msg them">${c.steps[0].them}</div></div><div class="choices" id="ch${key}"></div></div>`;}
function addMsg(key,cls,text){const win=document.getElementById('win'+key);const d=document.createElement('div');d.className='msg '+cls;d.textContent=text;win.appendChild(d);win.scrollTop=win.scrollHeight;}
function renderChoices(key){const c=CHAT[key],step=STATE.chatStep[key],box=document.getElementById('ch'+key);if(step>=c.steps.length){box.innerHTML='<p class="note">Chat resolution complete. Responses recorded.</p>';return;}box.innerHTML='';c.steps[step].choices.forEach((ch,i)=>{const b=document.createElement('button');b.textContent=ch.t;b.onclick=()=>{if(STATE.locked)return;STATE.chatLog[key].push(ch.ok);lockVariant(4);addMsg(key,'you',ch.t);STATE.chatStep[key]++;if(STATE.chatStep[key]<c.steps.length)addMsg(key,'them',c.steps[STATE.chatStep[key]].them);else addMsg(key,'them','...alright. Proceeding through your process.');renderChoices(key);};box.appendChild(b);});}
const lab4A=chatHTML('4A','Abrasive Executive — Locked Account','A frantic corporate executive demands an immediate bypass for a locked account via live chat, using abrasive, high-urgency language. Respond professionally at each turn.');
const lab4B=chatHTML('4B','Social Engineering Counter-Measures','A user claims they are locked out of a critical database and requests an immediate administrative override. Verify without falling for the social engineering payload.');

/* ============================================================
   LAB 5 — TRIAGE QUEUES
   ============================================================ */
const t5Aopts=['-- Select Action --','Reboot the machine to clear the lock screen','IMMEDIATELY disconnect machine from network (Unplug Ethernet / Disable NIC)','Run a full Antivirus scan while connected to the network','Leave the machine powered ON to preserve RAM state','Escalate the ticket to the Security/IR department','Pay the ransom from petty cash'];
const t5Bopts=['-- Select Action --','Run malware scans in normal boot mode immediately','Disconnect from the network (Quarantine)','Disable System Restore','Reboot the machine into Safe Mode','Update anti-malware signatures (isolated) and run a full system scan','Re-enable System Restore and create a clean restore point'];
const lab5A=`<div class="card"><h2>Ticket #4471 — Ransomware Lock Screen (Active Encryption)</h2><p class="scenario">A ticket contains a screenshot of a user's machine displaying a lock screen while their local network shares are rapidly encrypting. Order the first three response actions. Rebooting destroys volatile RAM evidence; scanning while networked lets ransomware jump subnets.</p>${selRow('t5A1',1,t5Aopts)}${selRow('t5A2',2,t5Aopts)}${selRow('t5A3',3,t5Aopts)}</div>`;
const lab5B=`<div class="card"><h2>Ticket #4472 — Rogue Antivirus / Browser Hijack</h2><p class="scenario">User reports rapid browser hijacking, endless fake security alerts, and system sluggishness. Order all five remediation actions per malware-removal best practice.</p>${selRow('t5B1',1,t5Bopts)}${selRow('t5B2',2,t5Bopts)}${selRow('t5B3',3,t5Bopts)}${selRow('t5B4',4,t5Bopts)}${selRow('t5B5',5,t5Bopts)}</div>`;

/* ============================================================
   LAB 6 — BYOD WIRELESS & MAIL
   ============================================================ */
const lab6A=`<div class="card"><h2>Wireless Spectrum Optimization — BYOD Onboarding</h2><p class="scenario">A BYOD device fails to connect due to massive interference and channel saturation on the 2.4GHz band. Configure the device profile — do not alter the router's global broadcast channel and disrupt the office.</p><label>1. First action on the device WLAN settings:</label><select id="d6A1"><option value="0">-- Select --</option><option value="1">Change router global channel to 11</option><option value="2">Forget the saturated 2.4GHz SSID</option><option value="3">Toggle Airplane Mode repeatedly</option></select><label>2. Target band / SSID profile to add:</label><select id="d6A2"><option value="0">-- Select --</option><option value="1">Corporate 5GHz SSID (802.11ac/ax)</option><option value="2">Same 2.4GHz SSID with static IP</option><option value="3">Open guest hotspot</option></select><label>3. Security type:</label><select id="d6A3"><option value="0">-- Select --</option><option value="1">WEP</option><option value="2">WPA2/WPA3-Enterprise</option><option value="3">WPA2-Personal (pre-shared key)</option></select><label>4. Authentication method:</label><select id="d6A4"><option value="0">-- Select --</option><option value="1">Pre-shared key taped to the breakroom wall</option><option value="2">MAC address exemption only</option><option value="3">Domain credentials via 802.1X / RADIUS server authentication</option></select></div>`;
const lab6B=`<div class="card compact"><h2>Secure Enterprise Mail Configuration</h2><p class="scenario">Manually configure a mobile device for secure corporate email routing using encrypted ports. Selecting unencrypted ports (143, 110, 25) instantly fails the secure compliance objective.</p><div class="field-grid"><div><label>1. Mail Server FQDN:</label><input type="text" id="d6B0" placeholder="e.g., mail.company.com"></div><div><label>2. Incoming (IMAP) port:</label><select id="d6B1"><option value="0">-- Select --</option><option value="1">143</option><option value="2">993</option><option value="3">80</option></select></div><div><label>3. Incoming (IMAP) encryption:</label><select id="d6B2"><option value="0">-- Select --</option><option value="1">None</option><option value="2">SSL/TLS</option><option value="3">ROT13</option></select></div><div><label>4. Outgoing (SMTP) port:</label><select id="d6B3"><option value="0">-- Select --</option><option value="1">25</option><option value="2">110</option><option value="3">587</option><option value="4">465</option></select></div><div><label>5. Outgoing (SMTP) encryption:</label><select id="d6B4"><option value="0">-- Select --</option><option value="1">None</option><option value="2">STARTTLS or SSL/TLS</option><option value="3">WEP</option></select></div><div><label>6. Outgoing server requires authentication:</label><select id="d6B5"><option value="0">-- Select --</option><option value="1">Unchecked</option><option value="2">Checked</option></select></div></div></div>`;

/* ============================================================
   LAB 7 — DISK MANAGEMENT
   ============================================================ */
const lab7A=`<div class="card"><h2>diskmgmt.msc — Foreign Dynamic Disk</h2><p class="scenario">A dynamic storage drive harvested from a decommissioned Windows workstation is plugged into a new system. In diskmgmt.msc it shows a yellow warning icon labeled "Foreign." Preserve the client's data array.</p><table><tr><th>Disk</th><th>Status</th><th>Type</th></tr><tr><td>Disk 1</td><td>Foreign (Warning)</td><td>Dynamic</td></tr></table><label>Right-click action on the Foreign disk's left-hand pane:</label><select id="d7A1"><option value="0">-- Select --</option><option value="1">Initialize Disk</option><option value="2">Convert to Basic Disk</option><option value="3">Import Foreign Disks</option><option value="4">Delete Volume</option></select><label>After the wizard shows the volume layout:</label><select id="d7A2"><option value="0">-- Select --</option><option value="1">Cancel and reformat</option><option value="2">Verify layout and click OK to mount without wiping</option><option value="3">Convert to GPT immediately</option></select></div>`;
const lab7B=`<div class="card"><h2>Initializing a New 4TB Drive</h2><p class="scenario">Initialize a brand-new 4TB hard drive as a single continuous block of storage. MBR carries a strict 2TB limit — any space beyond 2TB becomes permanently unallocated.</p><label>1. Partition style in the initialization wizard:</label><select id="d7B1"><option value="0">-- Select --</option><option value="1">MBR (Master Boot Record)</option><option value="2">GPT (GUID Partition Table)</option></select><label>2. Action on the unallocated space:</label><select id="d7B2"><option value="0">-- Select --</option><option value="1">New Simple Volume</option><option value="2">Shrink Volume</option><option value="3">Mark Partition as Active</option></select><label>3. File system schema:</label><select id="d7B3"><option value="0">-- Select --</option><option value="1">FAT32</option><option value="2">exFAT</option><option value="3">NTFS</option></select></div>`;

/* ============================================================
   LAB 8 — POWER ALLOCATION
   ============================================================ */
const devs8A=[['Laser Printer','S'],['Core Switch','U'],['Space Heater','S'],['NAS Array','U'],['Paper Shredder','S'],['Router','U'],['Primary Workstation','U'],['Vacuum','S']];
const lab8A=`<div class="card compact"><h2>Hardware Allocation — Surge Protector vs UPS</h2><p class="scenario">Route power for each IT device to either a standard Surge Protector or a UPS Battery Backup. A laser printer's fuser draws &gt;1000W instantaneous startup current — placing it on the UPS trips the inverter and drops the servers (zero score).</p><div class="drop-grid" style="margin-top:10px;">${devs8A.map((d,i)=>`<div class="dev">${d[0]}</div><select id="p8A${i}"><option value="0">-- Route To --</option><option value="S">Surge Protector Only</option><option value="U">UPS Battery Backup</option></select>`).join('')}</div></div>`;
const lab8B=`<div class="card"><h2>Power Overload Calculations — VA vs Watts</h2><p class="scenario">A rack must be balanced across UPS units rated in Volt-Amps (VA). Do NOT treat VA and Watts as 1:1 — usable Wattage is roughly VA multiplied by the Power Factor (0.8 for this simulation), and no UPS should exceed 80% of that calculated Wattage capacity.</p><label>1. A 1000VA UPS has an estimated maximum Wattage capacity of:</label><select id="d8B1"><option value="0">-- Select --</option><option value="1">1000W</option><option value="2">~800W (VA x 0.8 Power Factor)</option><option value="3">1250W</option></select><label>2. Safe continuous loading target per UPS:</label><select id="d8B2"><option value="0">-- Select --</option><option value="1">100% of calculated Wattage</option><option value="2">No more than 80% of calculated Wattage capacity</option><option value="3">120% — UPS units have headroom</option></select><label>3. Rack contains: Server A (400W), Server B (350W), Core Switch (150W). UPS-1 is 1000VA (~800W usable). Correct mapping:</label><select id="d8B3"><option value="0">-- Select --</option><option value="1">All three devices on UPS-1 (900W total)</option><option value="2">Server A + Server B on UPS-1; provision secondary UPS for the Core Switch spillover</option><option value="3">Daisy-chain UPS-1 into a surge protector for extra capacity</option></select></div>`;

/* ============================================================
   LAB 9 — SOHO ROUTER & SECURITY
   ============================================================ */
function apply9A() { if (STATE.locked) return; lockVariant(9); STATE.apply9A = true; const b = document.getElementById('btnApply9A'); b.textContent = 'Changes Applied ✓'; b.classList.add('v-pass'); }
const lab9A=`<div class="card compact"><h2>Home Office Device Placement & Port Forwarding</h2><p class="scenario">A remote worker needs to access their office Windows PC via RDP, and their child needs their Xbox console to have an Open NAT type for multiplayer gaming.</p>
<div class="field-grid" style="margin-top:10px;">
  <div><label>1. Internet Location:</label><select id="d9A1"><option value="0">-- Select --</option><option value="1">Outside (Internet) Zone</option><option value="2">Screened Subnet / DMZ</option><option value="3">Internal LAN</option></select></div>
  <div><label>2. Firewall/Router Placement:</label><select id="d9A2"><option value="0">-- Select --</option><option value="1">Directly behind Internet</option><option value="2">Inside DMZ only</option><option value="3">Inside Internal LAN</option></select></div>
  <div><label>3. Wireless Access Point (WAP) Placement:</label><select id="d9A3"><option value="0">-- Select --</option><option value="1">Outside Zone</option><option value="2">Screened Subnet / DMZ</option><option value="3">Inside Internal LAN</option></select></div>
  <div><label>4. Xbox Console Placement:</label><select id="d9A4"><option value="0">-- Select --</option><option value="1">Connected to WAP in LAN</option><option value="2">Directly behind Internet</option><option value="3">DMZ</option></select></div>
  <div><label>5. Windows PC Placement:</label><select id="d9A5"><option value="0">-- Select --</option><option value="1">Connected to Firewall Internal Zone</option><option value="2">DMZ</option><option value="3">Outside Zone</option></select></div>
  <div><label>6. Port Forwarding Rule (RDP to PC):</label><select id="d9A6"><option value="0">-- Select --</option><option value="1">Forward TCP 443 to PC</option><option value="2">Forward TCP 3389 to PC Static IP</option><option value="3">Forward UDP 3389 to Xbox</option></select></div>
  <div><label>7. Xbox NAT Configuration:</label><select id="d9A7"><option value="0">-- Select --</option><option value="1">Enable UPnP</option><option value="2">Disable UPnP</option><option value="3">Block Xbox MAC address</option></select></div>
  <div style="grid-column: 1 / -1; margin-top: 8px;"><button id="btnApply9A" class="hbtn" style="width: 100%;" onclick="apply9A()">Save / Apply Changes</button></div>
</div></div>`;

function apply9B() { if (STATE.locked) return; lockVariant(9); STATE.apply9B = true; const b = document.getElementById('btnApply9B'); b.textContent = 'Changes Applied ✓'; b.classList.add('v-pass'); }
const lab9B=`<div class="card compact"><h2>Secure Small Business Wi-Fi & MAC Filtering</h2><p class="scenario">A retail shop needs a secure POS Wi-Fi. Prevent random customers from seeing the network and restrict unauthorized websites. The known POS MACs are: <code>AA:BB:CC:11:22:33</code>, <code>AA:BB:CC:44:55:66</code>, <code>AA:BB:CC:77:88:99</code>.</p>
<div class="field-grid" style="margin-top:10px;">
  <div><label>1. SSID Broadcast (Stealth Requirement):</label><select id="d9B1"><option value="0">-- Select --</option><option value="1">ON (Visible)</option><option value="2">OFF (Hidden)</option></select></div>
  <div><label>2. Security Mode:</label><select id="d9B2"><option value="0">-- Select --</option><option value="1">WEP</option><option value="2">WPA3-Personal</option><option value="3">WPA2-Enterprise</option></select></div>
  <div><label>3. MAC Filtering Mode:</label><select id="d9B3"><option value="0">-- Select --</option><option value="1">Allow Only (Whitelist)</option><option value="2">Deny Only (Blacklist)</option><option value="3">Disabled</option></select></div>
  <div style="grid-column: 1 / -1;"><label>4. Permitted MAC Addresses (Comma separated):</label><input type="text" id="d9B4" placeholder="Enter MAC addresses..." style="width: 100%;"></div>
  <div style="grid-column: 1 / -1;"><label>5. Content Filtering (Block keywords, e.g. Social Media, Streaming):</label><input type="text" id="d9B5" placeholder="Enter categories/keywords to block..." style="width: 100%;"></div>
  <div style="grid-column: 1 / -1; margin-top: 8px;"><button id="btnApply9B" class="hbtn" style="width: 100%;" onclick="apply9B()">Save / Apply Changes</button></div>
</div></div>`;

/* ============================================================
   LAB 10 — ENTERPRISE MALWARE RESPONSE
   ============================================================ */
const lab10A=`<div class="card compact"><h2>Setting Reversion & Network Quarantine</h2><p class="scenario">Several workstations are redirecting users to malicious search engines. Investigate the 5 nodes, fix altered settings, and quarantine the two biggest threats. Logs indicate PC-02 blocked a threat successfully, PC-03 AV service terminated, and the File Server shows multiple malicious .exe pulls.</p>
<div class="field-grid" style="margin-top:10px;">
  <div><label>1. PC-01 Action:</label><select id="d10A1"><option value="0">-- Select --</option><option value="1">No Action Required</option><option value="2">Clear Proxy & Reset DNS</option><option value="3">Quarantine Node</option></select></div>
  <div><label>2. PC-02 Action (AV Log: Threat Blocked):</label><select id="d10A2"><option value="0">-- Select --</option><option value="1">No Action Required</option><option value="2">Clear Proxy & Reset DNS</option><option value="3">Quarantine Node</option></select></div>
  <div><label>3. PC-03 Action (AV Log: Service Terminated):</label><select id="d10A3"><option value="0">-- Select --</option><option value="1">No Action Required</option><option value="2">Clear Proxy & Reset DNS</option><option value="3">Quarantine Node</option></select></div>
  <div><label>4. PC-04 Action:</label><select id="d10A4"><option value="0">-- Select --</option><option value="1">No Action Required</option><option value="2">Clear Proxy & Reset DNS</option><option value="3">Quarantine Node</option></select></div>
  <div style="grid-column: 1 / -1;"><label>5. File Server Action (Patient Zero):</label><select id="d10A5"><option value="0">-- Select --</option><option value="1">No Action Required</option><option value="2">Clear Proxy & Reset DNS</option><option value="3">Quarantine Node</option></select></div>
</div></div>`;

const rem10Bopts=['-- Select Step --','Identify the malware','Quarantine the infected systems','Disable System Restore','Remediate (Update signatures & scan)','Schedule scans & run updates','Enable System Restore & create point','Educate the end user'];
const lab10B=`<div class="card flex-card">
<div style="flex-shrink: 0;">
  <h2>Phishing Remediation & E-mail Security Header Analysis</h2>
  <p class="scenario">A corporate executive clicked a link in a suspicious email. Accounting computers are showing ransomware warning screens. Identify the malicious email, isolate the node via CLI, and arrange the 7-step remediation process.</p>
  <label>1. Identify Phishing Email (Header Analysis):</label><select id="d10B1" style="width: 100%; margin-bottom: 8px;"><option value="0">-- Select Suspicious Email --</option><option value="1">From: hr@microsoft.com, Reply-To: hr@microsoft.com</option><option value="2">From: admin@micros0ft.com, Reply-To: attacker@gmail.com</option><option value="3">From: support@company.com, Reply-To: support@company.com</option></select>
  <div class="terminal" id="term10B" style="height: 120px; min-height: 80px; max-height: none; flex-shrink: 0;">C:\\Users\\Executive&gt;
</div>
  <div class="term-input" style="align-items: center; flex-wrap: wrap; flex-shrink: 0;">
    <span style="padding-top: 0;">C:\\&gt;</span>
    <input type="hidden" id="in10B">
    <select id="cli10B_1" onchange="updateCli(1, '10B')"></select>
    <select id="cli10B_2" onchange="updateCli(2, '10B')" disabled></select>
    <select id="cli10B_3" disabled></select>
    <button class="hbtn" style="padding: 6px 12px; font-size: clamp(12px, 1vw, 13.5px);" onclick="execCli('10B')">Execute</button>
  </div>
</div>
<div class="steps-container" style="overflow-y: auto; flex: 1; min-height: 0; padding-right: 8px; margin-top: 10px;">
  <h3 style="margin-top: 4px;">7-Step Malware Remediation Process</h3>
  <div class="field-grid" style="grid-template-columns: 1fr;">
    ${[1,2,3,4,5,6,7].map(i => `<div class="step-row"><span class="num">${i}</span><select id="d10B_step${i}" style="flex:1;">${rem10Bopts.map((o,idx)=>`<option value="${idx}">${o}</option>`).join('')}</select></div>`).join('')}
  </div>
</div>
</div>`;

/* ============================================================
   MOUNT ALL LABS & APPLY HISTORY
   ============================================================ */
labsBox.innerHTML=labShell(1,lab1A,lab1B)+labShell(2,lab2A,lab2B)+labShell(3,lab3A,lab3B)+labShell(4,lab4A,lab4B)+labShell(5,lab5A,lab5B)+labShell(6,lab6A,lab6B)+labShell(7,lab7A,lab7B)+labShell(8,lab8A,lab8B)+labShell(9,lab9A,lab9B)+labShell(10,lab10A,lab10B);
renderChoices('4A');renderChoices('4B');
initCli('1A'); initCli('1B'); initCli('10B');
applyVariantHistory();
showLab(1);

const measurer=document.getElementById('measure');
function fitSelect(s){const opt=s.options[s.selectedIndex];measurer.textContent=opt?opt.text:'';s.style.width=Math.min(measurer.offsetWidth+44,s.parentElement.clientWidth||600)+'px';}
function labIdOf(el){const sec=el.closest('.lab');return sec?parseInt(sec.id.replace('lab',''),10):null;}
function initInputs(){document.querySelectorAll('main select').forEach(s=>{fitSelect(s);s.addEventListener('change',()=>{fitSelect(s);if(s.value!=='0'&&s.value!==''){const id=labIdOf(s);if(id)lockVariant(id);}});});const fqdn=document.getElementById('d6B0');fqdn.addEventListener('input',()=>{if(fqdn.value.trim()!=='')lockVariant(6);});}
initInputs();
window.addEventListener('resize',()=>document.querySelectorAll('main select').forEach(fitSelect));

/* ============================================================
   TIMER & LEGAL MODAL LOGIC
   ============================================================ */
let secs = 90 * 60; let tInt;
function startExamTimer() { tInt = setInterval(() => { secs--; if (secs <= 0) { clearInterval(tInt); submitExam(); return; } document.getElementById('timer').textContent = String(Math.floor(secs / 60)).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0'); }, 1000); }
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('reset') === '1') { document.getElementById('legalOverlay').style.display = 'none'; document.getElementById('shake-wrap').classList.remove('blur-bg'); startExamTimer(); window.history.replaceState({}, document.title, window.location.pathname); } else { document.getElementById('acceptLegalBtn').addEventListener('click', () => { document.getElementById('legalOverlay').style.display = 'none'; document.getElementById('shake-wrap').classList.remove('blur-bg'); startExamTimer(); }); }

/* ============================================================
   GRADING ENGINE & SVG GRAPH GENERATOR
   ============================================================ */
function val(id){const e=document.getElementById(id);return e?e.value:'0';}
function seqIndexCheck(cmds,target){ let pos=-1,results=[];target.forEach(t=>{const idx=cmds.findIndex((c,i)=>i>pos&&c===t);if(idx>pos&&idx!==-1){results.push(true);pos=idx;}else results.push(false);});return results;}
const REMEDIATION={1:"<b>WinRE Recovery Theory:</b> On legacy BIOS/MBR systems the canonical repair chain is <b>bootrec /fixmbr → bootrec /fixboot → bootrec /rebuildbcd → exit</b>. Running /rebuildbcd first fails on heavy MBR corruption. On UEFI systems, an 'Access is Denied' from /fixboot signals a corrupted EFI System Partition (ESP): use diskpart to select disk 0, list volumes, select the ~100MB Hidden FAT32 System volume, assign it a letter (v:), exit, <b>format v: /FS:FAT32</b>, then rebuild the store with <b>bcdboot C:\\Windows /s v: /f UEFI</b>.",2:"<b>Group Policy Theory:</b> After an OU relocation, verify applied GPOs with <b>gpresult /r</b>, force a DC poll with <b>gpupdate /force</b>, then have the user <b>Log Off and Log Back In</b> — mandatory for drive mappings. secpol.msc governs LOCAL policy only. For stale DNS: <b>ipconfig /flushdns → ipconfig /registerdns → gpupdate /force</b>.",3:"<b>Deployment Theory:</b> Zero-touch imaging uses <b>Windows System Image Manager (WSIM)</b> to author <b>unattend.xml</b>, then <b>sysprep.exe /generalize /oobe /unattend:unattend.xml</b>. Silent installs: <b>msiexec /i package.msi /qn /norestart</b> for MSI; <b>setup.exe /S /v\"/qn\"</b> for wrapped EXEs. Omitting <b>/norestart</b> causes a mass midday reboot.",4:"<b>Soft Skills Theory:</b> With abrasive executives: (1) validate frustration empathetically, (2) state clear intent, (3) pivot to verification (Employee ID/PIN) WITHOUT exception. Against social engineering: politely deny overrides, initiate a <b>callback to the registered desk phone</b>, and require <b>Manager Approval + MFA Token</b>.",5:"<b>Containment Theory:</b> Ransomware: IMMEDIATELY unplug Ethernet/disable NIC, leave the machine <b>powered ON</b> to preserve RAM state, escalate to Security/IR. Rogue AV/spyware: Quarantine → <b>Disable System Restore</b> → Safe Mode → update signatures and full scan → re-enable System Restore.",6:"<b>BYOD/Mail Theory:</b> For 2.4GHz saturation: forget the saturated SSID, join the corporate <b>5GHz (802.11ac/ax)</b> SSID with <b>WPA2/WPA3-Enterprise</b> using domain credentials over <b>802.1X/RADIUS</b>. Secure mail: IMAP <b>993</b> (SSL/TLS), POP3 <b>995</b> (SSL/TLS), SMTP <b>587</b> (STARTTLS) or <b>465</b> (SSL/TLS).",7:"<b>Disk Management Theory:</b> A dynamic disk showing 'Foreign' must be right-clicked → <b>Import Foreign Disks</b>. Drives >2TB must be initialized as <b>GPT</b> (MBR caps at 2TB), followed by New Simple Volume and <b>NTFS</b> formatting.",8:"<b>Power Theory:</b> High instantaneous-draw heating/motor devices (Printers, Heaters, Shredders) go on <b>Surge Protectors ONLY</b>. VA is not Watts: usable Wattage is roughly VA x 0.8 Power Factor, and load each UPS to no more than 80%.",9:"<b>SOHO Security Theory:</b> Devices needing public exposure (Xbox/gaming) should use <b>UPnP</b> or be placed in the <b>DMZ</b> (outside the internal firewall but behind the router). Internal PCs remain on the <b>Internal LAN</b> behind the firewall, with specific ports (like <b>TCP 3389</b> for RDP) forwarded to a <b>static IP</b>. For secure Wi-Fi: use <b>WPA3-Personal</b> (or WPA2), <b>Disable SSID Broadcast</b> (stealth), and implement <b>MAC Filtering (Allow Only/Whitelist)</b>.",10:"<b>Incident Response Theory:</b> When remediating, active threats require immediate <b>Quarantine</b>. Altered system settings (like rogue DNS or proxy servers) must be reset. Phishing emails often spoof domains (e.g., <i>micros0ft.com</i>) and use mismatched <i>Reply-To</i> headers. The official 7-step process: 1. <b>Identify</b>, 2. <b>Quarantine</b>, 3. <b>Disable System Restore</b>, 4. <b>Remediate</b> (update/scan), 5. <b>Schedule Scans</b>, 6. <b>Enable System Restore</b>, 7. <b>Educate User</b>."};

function gradeLab(id) {
  const variant = STATE.variant[id];
  let criteria = [];

  switch (id) {
    case 1: {
      if (variant === 'A') {
        const r = seqIndexCheck(STATE.term['1A'], ['bootrec /fixmbr', 'bootrec /fixboot', 'bootrec /rebuildbcd', 'exit']);
        criteria = [
          ['Executed bootrec /fixmbr first (new MBR written)', r[0]],
          ['Executed bootrec /fixboot second (new boot sector)', r[1]],
          ['Executed bootrec /rebuildbcd third (BCD store rebuilt)', r[2]],
          ['Executed exit to restart workstation', r[3]],
          ['No UEFI diskpart commands attempted on MBR system', !STATE.term['1A_fail']]
        ];
      } else {
        const r = seqIndexCheck(
          STATE.term['1B'].map(c => c.replace('select ', 'sel ').replace('sel volume', 'sel vol').replace('list volume', 'list vol')),
          ['diskpart', 'sel disk 0', 'list vol', 'sel vol 2', 'assign letter=v:', 'exit', 'format v: /fs:fat32', 'bcdboot c:\\windows /s v: /f uefi']
        );
        criteria = [
          ['Entered diskpart utility', r[0]],
          ['Selected disk 0', r[1]],
          ['Listed volumes to identify 100MB Hidden FAT32 ESP', r[2]],
          ['Selected Volume 2 (EFI System Partition)', r[3]],
          ['Assigned drive letter v:', r[4]],
          ['Exited diskpart before formatting', r[5]],
          ['Formatted v: as FAT32 (wiped corrupt EFI store)', r[6]],
          ['Executed bcdboot C:\\Windows /s v: /f UEFI', r[7]],
          ['Did NOT format the C:\\Windows NTFS partition', !STATE.term['1B_fail']]
        ];
      }
      break;
    }
    case 2: {
      if (variant === 'A') {
        criteria = [
          ['Step 1: gpresult /r to verify applied GPOs', val('gpo2A1') === '2'],
          ['Step 2: gpupdate /force to poll the DC', val('gpo2A2') === '3'],
          ['Step 3: Log Off / Log Back In (mandatory for drive maps)', val('gpo2A3') === '5']
        ];
      } else {
        criteria = [
          ['Step 1: ipconfig /flushdns (clear stale DC pointer)', val('gpo2B1') === '2'],
          ['Step 2: ipconfig /registerdns (re-register DNS names)', val('gpo2B2') === '3'],
          ['Step 3: gpupdate /force (pull templates from active DC)', val('gpo2B3') === '4']
        ];
      }
      break;
    }
    case 3: {
      if (variant === 'A') {
        criteria = [
          ['Used Windows System Image Manager (WSIM)', val('d3A1') === '2'],
          ['Selected strict .xml schema (unattend.xml)', val('d3A2') === '3'],
          ['sysprep /generalize /oobe /unattend:unattend.xml (SID stripped)', val('d3A3') === '1']
        ];
      } else {
        criteria = [
          ['MSI: msiexec /i package.msi /qn /norestart', val('d3B1') === '1'],
          ['EXE: setup.exe /S /v"/qn"', val('d3B2') === '2'],
          ['Reboot suppression via /norestart', val('d3B3') === '3']
        ];
      }
      break;
    }
    case 4: {
      const log = STATE.chatLog[variant === 'A' ? '4A' : '4B'];
      const labels = variant === 'A'
        ? ['Validated frustration empathetically', 'Stated clear intent to resolve quickly', 'Pivoted to Employee ID/PIN verification without exception']
        : ['Politely denied the immediate override', 'Callback to registered desk phone (NOT the chat-provided number)', 'Required Manager Approval + MFA token for database access'];
      criteria = labels.map((l, i) => [l, log[i] === true]);
      break;
    }
    case 5: {
      if (variant === 'A') {
        criteria = [
          ['Step 1: IMMEDIATELY disconnect from network', val('t5A1') === '2'],
          ['Step 2: Leave machine powered ON (preserve RAM for IR)', val('t5A2') === '4'],
          ['Step 3: Escalate to Security/IR department', val('t5A3') === '5']
        ];
      } else {
        criteria = [
          ['Step 1: Quarantine (disconnect network)', val('t5B1') === '2'],
          ['Step 2: Disable System Restore', val('t5B2') === '3'],
          ['Step 3: Reboot into Safe Mode', val('t5B3') === '4'],
          ['Step 4: Update signatures (isolated) + full scan', val('t5B4') === '5'],
          ['Step 5: Re-enable System Restore, clean point', val('t5B5') === '6']
        ];
      }
      break;
    }
    case 6: {
      if (variant === 'A') {
        criteria = [
          ['Forgot the saturated 2.4GHz SSID', val('d6A1') === '2'],
          ['Added corporate 5GHz SSID (802.11ac/ax)', val('d6A2') === '1'],
          ['Security: WPA2/WPA3-Enterprise', val('d6A3') === '2'],
          ['Auth: domain credentials via 802.1X/RADIUS', val('d6A4') === '3']
        ];
      } else {
        const fq = (document.getElementById('d6B0').value || '').trim().toLowerCase();
        criteria = [
          ['Entered Mail Server FQDN (mail.company.com)', fq === 'mail.company.com'],
          ['IMAP incoming Port 993', val('d6B1') === '2'],
          ['IMAP encryption SSL/TLS', val('d6B2') === '2'],
          ['SMTP outgoing Port 587 or 465', val('d6B3') === '3' || val('d6B3') === '4'],
          ['SMTP encryption STARTTLS / SSL-TLS', val('d6B4') === '2'],
          ['Outgoing server authentication checked', val('d6B5') === '2']
        ];
      }
      break;
    }
    case 7: {
      if (variant === 'A') {
        criteria = [
          ['Selected "Import Foreign Disks" (not Initialize/Convert)', val('d7A1') === '3'],
          ['Verified volume layout in wizard, mounted without wiping', val('d7A2') === '2']
        ];
      } else {
        criteria = [
          ['Selected GPT to support >2TB volumes', val('d7B1') === '2'],
          ['Created New Simple Volume on unallocated space', val('d7B2') === '1'],
          ['Formatted with NTFS file system schema', val('d7B3') === '3']
        ];
      }
      break;
    }
    case 8: {
      if (variant === 'A') {
        criteria = devs8A.map((d, i) => [
          d[0] + ' routed to ' + (d[1] === 'S' ? 'Surge Protector Only' : 'UPS Battery Backup'),
          val('p8A' + i) === d[1]
        ]);
      } else {
        criteria = [
          ['1000VA is ~800W via 0.8 Power Factor', val('d8B1') === '2'],
          ['Loaded UPS to no more than 80% of calculated Wattage', val('d8B2') === '2'],
          ['Provisioned secondary UPS for spillover hardware', val('d8B3') === '2']
        ];
      }
      break;
    }
    case 9: {
      if (variant === 'A') {
        criteria = [
          ['Internet in Outside Zone', val('d9A1') === '1'],
          ['Firewall placed directly behind Internet', val('d9A2') === '1'],
          ['WAP placed inside Internal LAN', val('d9A3') === '3'],
          ['Xbox connected to WAP in LAN', val('d9A4') === '1'],
          ['PC placed behind Firewall Internal Zone', val('d9A5') === '1'],
          ['Forwarded TCP 3389 to PC Static IP', val('d9A6') === '2'],
          ['Enabled UPnP for Xbox NAT', val('d9A7') === '1'],
          ['"Save / Apply Changes" button clicked', STATE.apply9A === true]
        ];
      } else {
        const mac = (document.getElementById('d9B4').value || '').trim();
        const cf = (document.getElementById('d9B5').value || '').trim();
        const hasMacs = mac.includes('AA:BB:CC:11:22:33') && mac.includes('AA:BB:CC:44:55:66') && mac.includes('AA:BB:CC:77:88:99');
        const hasCf = cf.length > 3;
        criteria = [
          ['SSID Broadcast turned OFF (Hidden)', val('d9B1') === '2'],
          ['Security Mode set to WPA3-Personal', val('d9B2') === '2'],
          ['MAC Filtering set to Allow Only (Whitelist)', val('d9B3') === '1'],
          ['All 3 authorized POS MAC addresses entered', hasMacs],
          ['Content Filtering keywords configured', hasCf],
          ['"Save / Apply Changes" button clicked', STATE.apply9B === true]
        ];
      }
      break;
    }
    case 10: {
      if (variant === 'A') {
        criteria = [
          ['PC-01: Clear Proxy & Reset DNS', val('d10A1') === '2'],
          ['PC-02: No Action Required (Threat Blocked)', val('d10A2') === '1'],
          ['PC-03: Quarantine Node (AV Terminated)', val('d10A3') === '3'],
          ['PC-04: Clear Proxy & Reset DNS', val('d10A4') === '2'],
          ['File Server: Quarantine Node (Patient Zero)', val('d10A5') === '3']
        ];
      } else {
        criteria = [
          ['Identified malicious email (micros0ft.com spoof)', val('d10B1') === '2'],
          ['Executed ipconfig /release in terminal (Quarantine)', STATE.term['10B'].includes('ipconfig /release') && !STATE.term['10B_fail']],
          ['Step 1: Identify the malware', val('d10B_step1') === '1'],
          ['Step 2: Quarantine the infected systems', val('d10B_step2') === '2'],
          ['Step 3: Disable System Restore', val('d10B_step3') === '3'],
          ['Step 4: Remediate (Update signatures & scan)', val('d10B_step4') === '4'],
          ['Step 5: Schedule scans & run updates', val('d10B_step5') === '5'],
          ['Step 6: Enable System Restore & create point', val('d10B_step6') === '6'],
          ['Step 7: Educate the end user', val('d10B_step7') === '7']
        ];
      }
      break;
    }
  }

  const passed = criteria.filter(c => c[1]).length;
  const score = Math.round((passed / criteria.length) * 100);
  return { score, crit: criteria, variant };
}

/* ============================================================
   ADAPTIVE GRAPH SVG GENERATOR
   ============================================================ */
function generateGraphHTML(attempts) {
  if (attempts.length === 0) return '';
  const w = 800, h = 220, padX = 45, padY = 20;
  const getY = (pct) => h - padY - (pct / 100) * (h - 2 * padY);

  let pts = attempts.map((a, i) => {
    let x = padX + (attempts.length > 1 ? i * ((w - 2 * padX) / (attempts.length - 1)) : (w - 2 * padX) / 2);
    return { x, y: getY(a.score), score: a.score, num: i + 1 };
  });

  let polylinePoints = pts.map(p => `${p.x},${p.y}`).join(' ');
  let gridlines = [20, 40, 60, 80].map(p => `<line x1="${padX}" y1="${getY(p)}" x2="${w - padX}" y2="${getY(p)}" stroke="var(--border-primary)" stroke-dasharray="4" />`).join('');
  let circles = pts.map(p => `
    <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--graph-node-fill)" stroke="var(--text-primary)" stroke-width="2"/>
    <text x="${p.x}" y="${p.y - 12}" fill="var(--text-primary)" font-size="12" font-weight="bold" text-anchor="middle">${p.score}%</text>
    <text x="${p.x}" y="${h - 4}" fill="var(--text-secondary)" font-size="10" text-anchor="middle">Att ${p.num}</text>
  `);

  return `
  <div class="graph-wrap" style="overflow: hidden; padding: 12px;">
    <h3 style="text-align:center; margin-bottom: 8px; font-size:clamp(13px, 1.2vw, 14.5px);">Results Over Time</h3>
    <svg viewBox="0 0 ${w} ${h}" style="width: 100%; height: auto; max-width: 100%; font-family:'Segoe UI',sans-serif; display:block; margin:0 auto;">
      <!-- CompTIA Score Zones -->
      <rect x="${padX}" y="${getY(100)}" width="${w - 2*padX}" height="${getY(90) - getY(100)}" fill="var(--graph-zone-good)" />
      <rect x="${padX}" y="${getY(90)}" width="${w - 2*padX}" height="${getY(80) - getY(90)}" fill="var(--graph-zone-warn)" />
      <rect x="${padX}" y="${getY(80)}" width="${w - 2*padX}" height="${getY(0) - getY(80)}" fill="var(--graph-zone-fail)" />
      ${gridlines}

      <!-- Zone Labels -->
      <text x="${w - padX - 8}" y="${getY(95)}" fill="var(--accent-good)" font-size="11" font-weight="bold" text-anchor="end" dominant-baseline="middle">Probably Ready</text>
      <text x="${w - padX - 8}" y="${getY(85)}" fill="var(--accent-warn)" font-size="11" font-weight="bold" text-anchor="end" dominant-baseline="middle">Almost Ready</text>
      <text x="${w - padX - 8}" y="${getY(40)}" fill="var(--accent-bad)" font-size="11" font-weight="bold" text-anchor="end" dominant-baseline="middle">Not Ready</text>

      <!-- Axis Percentages -->
      <text x="${padX - 8}" y="${getY(100)}" fill="var(--text-secondary)" font-size="11" text-anchor="end" dominant-baseline="middle">100%</text>
      <text x="${padX - 8}" y="${getY(80)}" fill="var(--text-secondary)" font-size="11" text-anchor="end" dominant-baseline="middle">80%</text>
      <text x="${padX - 8}" y="${getY(60)}" fill="var(--text-secondary)" font-size="11" text-anchor="end" dominant-baseline="middle">60%</text>
      <text x="${padX - 8}" y="${getY(0)}" fill="var(--text-secondary)" font-size="11" text-anchor="end" dominant-baseline="middle">0%</text>

      <!-- Progression Line & Nodes -->
      <polyline points="${polylinePoints}" fill="none" stroke="var(--text-primary)" stroke-width="2" />
      ${circles.join('')}
    </svg>
  </div>`;
}

/* ============================================================
   SCORE REPORT + MODAL CONTROLS + RESET
   ============================================================ */
function openReport(){const m=document.getElementById('modal');m.classList.remove('open');void m.offsetWidth;m.classList.add('open');}
function closeReport(){document.getElementById('modal').classList.remove('open');}
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeReport();closeResetModal();}});

function submitOrView(){if(STATE.locked){openReport();return;}submitExam();}
function askReset(){closeReport();const m=document.getElementById('resetModal');m.classList.remove('open');void m.offsetWidth;m.classList.add('open');}
function closeResetModal(){document.getElementById('resetModal').classList.remove('open');}
function doReset(){closeResetModal();const w=document.getElementById('shake-wrap');w.classList.remove('animate-jiggle');void w.offsetWidth;w.classList.add('animate-jiggle');setTimeout(()=>{window.location.href=window.location.pathname+'?reset=1';},620);}

function submitExam(){
  if(STATE.locked)return;
  STATE.locked=true; clearInterval(tInt);
  const sb=document.getElementById('submitExam'); sb.textContent='View Score Report';
  document.getElementById('resetExam').style.display='inline-block';
  document.querySelectorAll('main select,main input,main .choices button,.variant-toggle button').forEach(e=>e.disabled=true);
  document.querySelectorAll('.term-input input, .term-input button').forEach(e=>e.disabled=true);

  let total=0, blocks=''; let hist = loadHistory();
  LABS.forEach(l=>{
    const g=gradeLab(l.id); total+=g.score;
    if (!hist.variants[l.id]) hist.variants[l.id] = {};
    let prevBest = hist.variants[l.id][g.variant] || 0;
    hist.variants[l.id][g.variant] = Math.max(prevBest, g.score);
    const badge=g.score===100?'<span class="badge pass">COMPLIANT</span>':'<span class="badge fail">ACTION REQUIRED</span>';
    blocks+=`<div class="lab-report"><h4>Lab ${l.id}: ${l.title} — Variant ${g.variant} &nbsp; <span>${g.score}/100 ${badge}</span></h4><strong style="font-size:12px;color:var(--text-secondary);">GRADING CRITERIA CHECKED:</strong><ul>${g.crit.map(c=>`<li class="${c[1]?'ok':'no'}"><span class="mark">${c[1]?'✅':'❌'}</span>${c[0]}</li>`).join('')}</ul><div class="textbook">${REMEDIATION[l.id]}</div></div>`;
  });

  const overallPercent = Math.round((total / 1000) * 100);
  const scaled = Math.round(100+(total/1000)*800);
  const pass = scaled>=700;
  hist.attempts.push({ date: new Date().toLocaleDateString(), score: overallPercent, scaled: scaled });
  saveHistory(hist);
  const graphHTML = generateGraphHTML(hist.attempts);

  document.getElementById('reportBody').innerHTML=`
    <button id="xClose" onclick="closeReport()" title="Close Report">&times;</button>
    <h2>Official Score Report</h2>
    <p class="sub">Core 2 Performance-Based Question Simulation<br>Candidate Session Locked · ${new Date().toLocaleString()}</p>
    <div class="score-big ${pass?'pass':'fail'}">${scaled}</div>
    <div class="verdict" style="color:${pass?'var(--accent-good)':'var(--accent-bad)'}">${pass?'PASS':'FAIL'} — Scale 100–900 · Passing Score: 700</div>
    ${graphHTML}
    ${blocks}
    <p style="text-align:center;font-size:11px;color:var(--text-secondary);font-family:monospace;margin-top:16px;">© 2026 jibbles. All Rights Reserved // Prepared for personal testing purposes only // Built with claude-fable-5, gemini-3.1-pro & gemini-3.1-pro-preview</p>
    <button id="closeModal" onclick="closeReport()">Close Report (Exam Remains Locked)</button>`;
  openReport();
}
