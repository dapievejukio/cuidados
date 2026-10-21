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
/* Telas demonstrativas alinhadas ao layout do ORAQUI 3.0 em produção.
 * Não utilizam registros reais nem fingem ser capturas autenticadas. */
function telaMorador(){
 return '<div class="odm-public-banner"><div class="odm-public-brand"><img src="assets/marca/oraqui-transparente.webp" alt="OraQui"></div><span>Organiza&nbsp; • &nbsp;Acompanha&nbsp; • &nbsp;Resolve</span></div>'+
  '<div class="odm-condo-bar"><img src="assets/relatorios/rni-reserva-igara.jpg" alt="Reserva Igara"><span>RESERVA IGARA<br><b>Comunicar ocorrência</b></span></div>'+
  '<div class="odm-public-content"><h4>Onde está o problema?</h4>'+
  '<div class="odm-selected"><span>Torre E</span><small>TROCAR ÁREA</small></div>'+
  '<div class="odm-selected"><span>Corredor 12º andar</span><small>TROCAR PONTO</small></div>'+
  '<div class="odm-monitored"><div class="odm-monitor-head"><span class="odm-monitor-icon">◷</span><div><b>Este local é acompanhado pelo ORAQUI</b><small>Registros operacionais do espaço selecionado</small></div></div>'+
  '<div class="odm-last"><small>ÚLTIMA ATIVIDADE REGISTRADA</small><b>Limpeza ou zeladoria realizada</b><span>Hoje, 09:01</span><em>📷 VER REGISTRO</em></div></div>'+
  '<div class="odm-ghost-section"><b>Qual é o problema?</b><span>Limpeza&nbsp; • &nbsp;Manutenção&nbsp; • &nbsp;Outros</span></div></div>';
}
function telaColaborador(){
 return '<div class="odm-app-head"><div class="odm-app-brand"><img src="assets/marca/oraqui-transparente.webp" alt="OraQui"><span>SAIR</span></div><small>RESERVA IGARA</small><h4>Seu trabalho faz a diferença.</h4><p>Escolha um ícone para começar.</p></div>'+
 '<div class="odm-app-content"><div class="odm-user-card"><span class="odm-avatar">●</span><div><b>Colaborador</b><small>Equipe operacional</small></div><em>ATIVO</em></div>'+
 '<div class="odm-app-title">Registrar execução <small>LOCAL → FOTOS → CONCLUSÃO</small></div>'+
 '<div class="odm-workflow"><div class="odm-work-card"><span class="odm-work-num">1</span><div><b>Torre E • Corredor 12º andar</b><small>Limpeza / Zeladoria</small></div></div>'+
 '<div class="odm-work-card"><span class="odm-work-num">2</span><div><b>📷 ANTES — Registre a situação</b><small>Fotografe antes de iniciar</small></div><em class="odm-work-badge">FOTO</em></div>'+
 '<div class="odm-work-card"><span class="odm-work-num">3</span><div><b>▶ Iniciar atividade</b><small>Horário registrado na execução</small></div></div>'+
 '<div class="odm-work-card"><span class="odm-work-num">4</span><div><b>📷 DEPOIS — Registre o resultado</b><small>Concluir com registro fotográfico</small></div><em class="odm-work-badge done">CONCLUIR</em></div></div>'+
 '<div class="odm-mini-nav"><span>▤<small>Minhas tarefas</small></span><span>▦<small>Cronograma</small></span><span class="selected">＋<small>Registrar atividade</small></span></div></div>';
}
function telaGestor(){
 return '<div class="odm-app-head"><div class="odm-app-brand"><img src="assets/marca/oraqui-transparente.webp" alt="OraQui"><span>GESTOR 3.0</span></div><small>RESERVA IGARA</small><h4>Seu condomínio em boas mãos.</h4><p>Organize as rotinas e acompanhe a equipe.</p></div>'+
 '<div class="odm-app-content"><div class="odm-user-card"><span class="odm-avatar">▥</span><div><b>Gestão</b><small>Gestor autenticado</small></div><em>● ONLINE</em></div>'+
 '<div class="odm-app-title">O que você quer acompanhar?</div>'+
 '<div class="odm-hub-row"><span>◉</span><b>Comunicação</b><small>⌄</small></div>'+
 '<div class="odm-hub-row"><span>⚑</span><b>Demandas</b><small>⌄</small></div>'+
 '<div class="odm-hub-row"><span>▦</span><b>Cronograma</b><small>⌄</small></div>'+
 '<div class="odm-hub-row chosen"><span>▥</span><b>Operação e relatórios</b><small>⌄</small></div>'+
 '<div class="odm-app-title">Operação de hoje <small>VISÃO GERAL</small></div>'+
 '<div class="odm-kpis"><div><b>—</b><small>REGISTROS HOJE</small></div><div><b>—</b><small>FOTOS RECEBIDAS</small></div><div><b>—</b><small>COLABORADORES</small></div><div><b>—</b><small>LOCAIS REGISTRADOS</small></div></div>'+
 '<div class="odm-mini-nav"><span>◉<small>Chat</small></span><span>⌂<small>Chamados</small></span><span class="selected">＋<small>Criar demanda</small></span></div></div>';
}
function telaRelatorio(){
 return '<div class="odm-app-head"><div class="odm-app-brand"><img src="assets/marca/oraqui-transparente.webp" alt="OraQui"><span>GESTOR 3.0</span></div><small>RESERVA IGARA</small><h4>Relatório de trabalho</h4><p>Consulte por colaborador, local ou histórico.</p></div>'+
 '<div class="odm-app-content"><div class="odm-report-tabs"><span>Colaboradores</span><span class="chosen">Locais</span><span>Histórico</span></div>'+
 '<div class="odm-date-grid"><div><small>DATA INICIAL</small><b>01/10/2026</b></div><div><small>DATA FINAL</small><b>21/10/2026</b></div></div>'+
 '<div class="odm-date-grid"><div><small>LOCAL</small><b>Torre E • 12º andar</b></div><div><small>COLABORADOR</small><b>Todos</b></div></div>'+
 '<div class="odm-report-button">▤ GERAR RELATÓRIO</div>'+
 '<div class="odm-report-preview"><div class="odm-report-logos"><img src="assets/marca/oraqui-transparente.webp" alt="OraQui"><img src="assets/relatorios/rni-reserva-igara.jpg" alt="Reserva Igara"></div>'+
 '<b>Relatório de Serviços</b><small>Período: 01/10/2026 a 21/10/2026</small>'+
 '<div class="odm-report-line">Torre E • Corredor 12º andar <em>CONCLUÍDA</em></div>'+
 '<div class="odm-report-pics"><span>▧<small>ANTES</small></span><span>▧<small>DEPOIS</small></span></div></div></div>';
}
function fakeScreen(i){
 const screens=[telaMorador,telaColaborador,telaGestor,telaRelatorio];
 return '<div class="odm-wrap"><div class="odm-example">DEMONSTRAÇÃO VISUAL • ORAQUI ATUAL</div><div class="odm-device odm-theme-'+i+'">'+screens[i]()+'</div></div>';
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
