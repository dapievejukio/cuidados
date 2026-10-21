/* ORAQUI - apresentação ilustrativa das funcionalidades no canal do morador */
(function(){
'use strict';
const views=[
 ['Morador','SOLICITAÇÃO','O morador informa o problema','Seleciona a torre, o ponto e a categoria, descreve a ocorrência e pode anexar uma foto. O registro fica disponível para encaminhamento.',['Local exato da solicitação','Descrição e foto opcional','Protocolo do atendimento']],
 ['Equipe','EXECUÇÃO','Colaborador registra o serviço','No celular, a equipe consulta as tarefas, registra o serviço por local e envia fotografias de antes e depois quando exigidas.',['Atividades por local','Horários e situação da execução','Registros fotográficos']],
 ['Gestão','ACOMPANHAMENTO','Gestor acompanha a operação','A gestão consulta os registros do dia, verifica demandas e fotografias e confirma a resolução de ocorrências.',['Painel de atividades','Demandas e ocorrências','Confirmação e histórico']],
 ['Relatórios','CONTROLE','Relatórios de serviços por período','O gestor filtra data inicial e final, local e colaborador, confere atividades e fotografias e pode imprimir ou salvar o relatório em PDF.',['Torre, ponto e período','Histórico e fotos','Relatório imprimível']]
];
const root=document.createElement('div');
root.id='oraquiComoModal';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','oraquiComoTitulo');
root.innerHTML='<section class="od-box"><header class="od-head"><div><div class="od-brand"><img src="assets/gestor-3/simbolo.svg" alt=""><span>ORAQUI • RESERVA IGARA</span></div><h2 id="oraquiComoTitulo">Como o ORAQUI funciona no dia a dia</h2><p>Da solicitação do morador ao controle das atividades executadas.</p></div><button class="od-close" id="oraquiComoClose" aria-label="Fechar apresentação" type="button">×</button></header><div class="od-scroll"><nav class="od-tabs" id="oraquiComoTabs" role="tablist" aria-label="Etapas do aplicativo"></nav><div class="od-stage" id="oraquiComoStage" role="tabpanel"></div><div class="od-flow">📍 Morador → 📷 Equipe → ✓ Gestão → ▤ Relatórios</div></div><footer class="od-bottom"><span class="od-note">Telas ilustrativas baseadas nas funções reais do aplicativo. Não exibem fotos ou dados reais.</span><button class="od-next" id="oraquiComoNext" type="button">PRÓXIMA ETAPA →</button></footer></section>';
document.body.appendChild(root);
const nav=root.querySelector('#oraquiComoTabs'),area=root.querySelector('#oraquiComoStage'),next=root.querySelector('#oraquiComoNext'),close=root.querySelector('#oraquiComoClose'),scroll=root.querySelector('.od-scroll');
let step=0,focusBefore=null,overflowBefore='';
views.forEach((v,i)=>{const b=document.createElement('button');b.type='button';b.className='od-tab';b.id='oraquiDemoTab'+i;b.setAttribute('role','tab');b.textContent=(i+1)+'. '+v[0];b.addEventListener('click',()=>render(i));nav.append(b)});
function mini(label,info,extra){return '<div class="od-mini"><small>'+label+'</small><strong>'+info+'</strong>'+(extra?'<span>'+extra+'</span>':'')+'</div>'}
function fakeScreen(i){
 let inside='';
 if(i===0){
  inside='<h4>Comunicar ocorrência</h4>'+mini('LOCAL','Torre E • Corredor 12º andar')+mini('TIPO DE PROBLEMA','Limpeza')+mini('DESCRIÇÃO','Solicitação do morador','Descrição do problema encontrado')+mini('FOTO','Adicionar fotografia (opcional)')+'<div class="od-action">ENVIAR OCORRÊNCIA →</div>';
 }else if(i===1){
  inside='<h4>Registro de execução <span class="od-tag">Em andamento</span></h4>'+mini('LOCAL','Torre E • Corredor 12º andar')+mini('ATIVIDADE','Limpeza e zeladoria')+'<div class="od-fotos"><div class="od-foto"><b>▧</b>FOTO ANTES</div><div class="od-foto"><b>▧</b>FOTO DEPOIS</div></div>'+mini('ETAPAS','Iniciar → Executar → Concluir')+'<div class="od-action">REGISTRAR CONCLUSÃO</div>';
 }else if(i===2){
  inside='<h4>Operação de hoje <span class="od-tag alt">Gestor</span></h4><div class="od-cards"><div class="od-card"><strong>—</strong><span>REGISTROS</span></div><div class="od-card"><strong>—</strong><span>FOTOGRAFIAS</span></div><div class="od-card"><strong>—</strong><span>COLABORADORES</span></div><div class="od-card"><strong>—</strong><span>LOCAIS</span></div></div><div class="od-mini od-row"><div><small>DEMANDAS</small><strong>Em execução</strong></div><span class="od-tag warn">Acompanhar</span></div><div class="od-mini od-row"><div><small>OCORRÊNCIAS</small><strong>Aguardando confirmação</strong></div><span class="od-tag alt">Gestão</span></div>';
 }else{
  inside='<h4>Relatório de atividades</h4><div class="od-row">'+mini('DATA INICIAL','01/10/2026')+mini('DATA FINAL','21/10/2026')+'</div>'+mini('LOCAL','Torre E • Corredor 12º andar')+mini('SERVIÇO','Limpeza realizada','Horário e colaborador responsável')+'<div class="od-fotos"><div class="od-foto"><b>▧</b>ANTES</div><div class="od-foto"><b>▧</b>DEPOIS</div></div><div class="od-action">IMPRIMIR / PDF</div>';
 }
 return '<div class="od-app"><div class="od-app-header"><small>ORAQUI • EXEMPLO ILUSTRATIVO</small><strong>'+['Canal do morador','Área do colaborador','Painel de gestão','Relatório do gestor'][i]+'</strong></div><div class="od-app-main">'+inside+'</div></div>';
}
function render(index){
 step=(index+views.length)%views.length;
 const v=views[step];
 nav.querySelectorAll('button').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===step));b.tabIndex=i===step?0:-1});
 area.setAttribute('aria-labelledby','oraquiDemoTab'+step);
 area.innerHTML='<div class="od-copy"><span class="od-eyebrow">ETAPA '+String(step+1).padStart(2,'0')+' • '+v[1]+'</span><h3>'+v[2]+'</h3><p>'+v[3]+'</p><ul>'+v[4].map(x=>'<li>'+x+'</li>').join('')+'</ul></div><div class="od-stage-preview">'+fakeScreen(step)+'</div>';
 next.textContent=step===3?'VOLTAR AO INÍCIO ↺':'PRÓXIMA ETAPA →';
 scroll.scrollTop=0;
}
function abrir(){
 if(!root.hidden)return;
 focusBefore=document.activeElement;overflowBefore=document.body.style.overflow;
 render(0);root.hidden=false;document.body.style.overflow='hidden';close.focus();
}
function fechar(){
 if(root.hidden)return;
 root.hidden=true;document.body.style.overflow=overflowBefore;
 if(focusBefore?.isConnected)focusBefore.focus();
}
close.addEventListener('click',fechar);
next.addEventListener('click',()=>render(step+1));
root.addEventListener('click',e=>{if(e.target===root)fechar()});
root.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();fechar();return}
 if(e.target.getAttribute('role')==='tab'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();render(step+(e.key==='ArrowRight'?1:-1));nav.children[step].focus();return}
 if(e.key==='Tab'){
  const controls=Array.from(root.querySelectorAll('button:not([disabled])')).filter(el=>el.getClientRects().length);
  if(!controls.length)return;
  if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls[controls.length-1].focus()}
  else if(!e.shiftKey&&document.activeElement===controls[controls.length-1]){e.preventDefault();controls[0].focus()}
 }
});
document.querySelectorAll('[data-oraqui-como]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();abrir()}));
})();
