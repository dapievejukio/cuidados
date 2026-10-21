/* ORAQUI - apresentação ilustrativa das funcionalidades no canal do morador */
(function(){
'use strict';
const views=[
 ['Morador','SOLICITAÇÃO','O morador informa o problema','Seleciona torre, ponto e categoria, descreve a ocorrência e pode anexar uma foto. O registro fica disponível para encaminhamento.',['Local exato da solicitação','Descrição e foto opcional','Protocolo do atendimento']],
 ['Equipe','EXECUÇÃO','Equipe registra as atividades','A tela inicial atual permite consultar tarefas, cronograma e documentos e registrar as atividades realizadas no condomínio.',['Minhas tarefas e cronograma','Registrar atividade por local','Fotografias dos serviços']],
 ['Gestão','ACOMPANHAMENTO','Gestor acompanha o condomínio','O Gestor 3.0 organiza chamados, demandas, cronograma, documentos, administração, operação e relatórios.',['Comunicação e demandas','Histórico e administração','Operação e relatórios']],
 ['Operação','CONTROLE DIÁRIO','Acompanhamento dos serviços do dia','O painel mostra registros concluídos, fotografias recebidas e locais atendidos, além das atividades mais recentes.',['Indicadores da operação','Locais e serviços registrados','Consulta de fotografias']],
 ['Relatórios','DOCUMENTAÇÃO','Relatórios fotográficos por período','O gestor filtra o período, o local e o colaborador e consulta os registros e fotografias de antes e depois.',['Datas inicial e final','Locais e histórico','Fotos reais de antes e depois']]
];
const root=document.createElement('div');
root.id='oraquiComoModal';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','oraquiComoTitulo');
root.innerHTML='<section class="od-box"><header class="od-head"><div><div class="od-brand"><img src="assets/gestor-3/simbolo.svg" alt=""><span>ORAQUI • RESERVA IGARA</span></div><h2 id="oraquiComoTitulo">Como o ORAQUI funciona no dia a dia</h2><p>Da solicitação do morador ao controle das atividades executadas.</p></div><button class="od-close" id="oraquiComoClose" aria-label="Fechar apresentação" type="button">×</button></header><div class="od-scroll"><nav class="od-tabs" id="oraquiComoTabs" role="tablist" aria-label="Etapas do aplicativo"></nav><div class="od-stage" id="oraquiComoStage" role="tabpanel"></div><div class="od-flow">📍 Morador → 📷 Equipe → ✓ Gestão → ▥ Operação → ▤ Relatórios</div></div><footer class="od-bottom"><div class="od-note"><span>Interfaces atuais em demonstração, sem nomes, rostos ou identificações pessoais.</span><span class="od-email">Contato: <a href="mailto:atendimento@oraqui.app">atendimento@oraqui.app</a></span></div><button class="od-next" id="oraquiComoNext" type="button">PRÓXIMA ETAPA →</button></footer></section>';
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
/* Apresentação visual com a interface VERDE atual do ORAQUI.
   A etapa 1 do morador permanece inalterada. */
function telaColaborador(){
return '<div class="ora-demo-top"><div class="ora-demo-brand"><img src="assets/marca/oraqui-transparente.webp" alt="OraQui"><span>SAIR</span></div></div>'+
'<div class="ora-demo-intro"><small>RESERVA IGARA</small><h4>Seu trabalho faz a diferença.</h4><p>Escolha um ícone para começar.</p></div>'+
'<div class="ora-demo-main"><div class="ora-demo-person"><i>●</i><div><b>Colaborador</b><small>Limpeza • dados reservados</small></div><em>ATIVO</em></div>'+
'<div class="ora-demo-actions"><div><span>☑</span><b>Minhas tarefas</b></div><div><span>▦</span><b>Cronograma</b></div><div><span>▤</span><b>Meus documentos</b></div><div><span>☏</span><b>Conversas</b></div><div class="green"><span>＋</span><b>Registrar atividade</b></div></div>'+
'<div class="ora-demo-connected"><b>🟢 Conectado • 0 pendente(s)</b><p>Nenhum registro pendente neste condomínio.</p><span>SINCRONIZAR AGORA</span></div></div>';
}
function telaGestor(){
return '<div class="ora-demo-top"><div class="ora-demo-brand"><img src="assets/marca/oraqui-transparente.webp" alt="OraQui"><span>SAIR</span></div></div>'+
'<div class="ora-demo-intro"><small>RESERVA IGARA</small><h4>Seu condomínio em boas mãos.</h4><p>Organize as rotinas, acompanhe a equipe e transforme registros em cuidado.</p><em>GESTOR 3.0</em></div>'+
'<div class="ora-demo-main"><div class="ora-demo-person"><i>▥</i><div><b>Gestão • Reserva Igara</b><small>Acesso autenticado</small></div><em>● ONLINE</em></div>'+
'<h4 class="ora-demo-heading">O que você quer acompanhar?</h4><div class="ora-demo-modules"><div><span>☏</span><b>Comunicação</b></div><div><span>⚠</span><b>Demandas</b></div><div><span>▦</span><b>Cronograma</b></div><div><span>▱</span><b>Documentos</b></div><div><span>⚙</span><b>Administração</b></div><div><span>▥</span><b>Operação e relatórios</b></div></div>'+
'<div class="ora-demo-nav"><span>Chat</span><b>Chamados</b><strong>＋ CRIAR DEMANDA</strong><span>Documentos</span></div></div>';
}
function telaOperacao(){
return '<div class="ora-demo-main ora-demo-operacao"><h4>▾ Resumo do dia</h4><div class="ora-demo-daily"><b>Hoje</b><span>21/10/2026</span></div>'+
'<div class="ora-demo-stats"><div><b>33</b><small>REGISTROS HOJE</small></div><div><b>29</b><small>FOTOS RECEBIDAS</small></div><div><b>2</b><small>COLABORADORES HOJE</small></div><div><b>20</b><small>LOCAIS REGISTRADOS</small></div></div>'+
'<div class="ora-demo-line"><b>Operação de hoje</b><small>Registros concluídos pela equipe.</small></div>'+
'<div class="ora-demo-line"><b>Relatório de trabalho</b><small>Consulte por colaborador, local ou histórico.</small></div>'+
'<div class="ora-demo-line"><b>Relatório de ponto</b><small>Entradas, intervalos e saídas.</small></div>'+
'<div class="ora-demo-line"><b>Últimos registros</b><small>Fotografias de atividades concluídas.</small></div>'+
'<div class="ora-demo-activity"><span>📷 VER</span><div><b>Atividade avulsa</b><small>Torre E • Corredor 3º andar</small></div><em>11:39</em></div></div>';
}
function telaRelatorio(){
return '<div class="ora-demo-top"><div class="ora-demo-brand"><img src="assets/marca/oraqui-transparente.webp" alt="OraQui"><span>RELATÓRIO</span></div></div>'+
'<div class="ora-demo-main"><h4 class="ora-demo-heading">Relatório de trabalho</h4><div class="ora-demo-segments"><span>Colaboradores</span><b>Locais</b><span>Histórico</span></div>'+
'<div class="ora-demo-filters"><div><small>DATA INICIAL</small><b>01/10/2026</b></div><div><small>DATA FINAL</small><b>21/10/2026</b></div><div><small>LOCAL</small><b>Resíduos • Torre D</b></div><div><small>COLABORADOR</small><b>Todos</b></div></div>'+
'<div class="ora-demo-generate">▤ RELATÓRIO</div><div class="ora-demo-report"><h4>Relatório de Serviços</h4><p>21/10/2026 às 08:20</p><b>LIXO • Área de resíduos Torre D</b><p>Registros operacionais • Antes e depois</p>'+
'<div class="ora-demo-comparison"><div><strong>ANTES</strong><figure><img src="https://rhiosvsohvqqrxzwohqu.supabase.co/storage/v1/object/public/fotos-atividades/inicios/1/9/programacao/4aad42b4-7a44-4d22-a94a-fb361a4a0574/ebd718bf-9897-4c31-bb0c-59040243bfe2.jpg" alt="Foto real do local antes do serviço"></figure></div><div><strong>DEPOIS</strong><figure><img src="https://rhiosvsohvqqrxzwohqu.supabase.co/storage/v1/object/public/fotos-atividades/v2/1/9/2026-10-21/b523fb39-0621-4e02-835b-779c9ac6bc30.jpg" alt="Foto real do local depois do serviço"></figure></div></div>'+
'<small class="ora-demo-privacy">Fotografias operacionais reais • Dados pessoais não apresentados</small></div></div>';
}
function fakeScreen(i){
 const screens=[telaMorador,telaColaborador,telaGestor,telaOperacao,telaRelatorio];
 return '<div class="odm-wrap"><div class="odm-example">DEMONSTRAÇÃO VISUAL • ORAQUI ATUAL</div><div class="odm-device odm-theme-'+i+'">'+screens[i]()+'</div></div>';
}
function render(index){
 step=(index+views.length)%views.length;
 const v=views[step];
 nav.querySelectorAll('button').forEach((b,i)=>{b.setAttribute('aria-selected',String(i===step));b.tabIndex=i===step?0:-1});
 area.setAttribute('aria-labelledby','oraquiDemoTab'+step);
 area.innerHTML='<div class="od-copy"><span class="od-eyebrow">ETAPA '+String(step+1).padStart(2,'0')+' • '+v[1]+'</span><h3>'+v[2]+'</h3><p>'+v[3]+'</p><ul>'+v[4].map(x=>'<li>'+x+'</li>').join('')+'</ul></div><div class="od-stage-preview">'+fakeScreen(step)+'</div>';
 next.textContent=step===views.length-1?'VOLTAR AO INÍCIO ↺':'PRÓXIMA ETAPA →';
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
