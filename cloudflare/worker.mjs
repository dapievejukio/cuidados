// Preserva /colaborador para atalhos antigos e a lógica de navegação do iOS.
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/colaborador'){
   url.pathname='/colaborador.html';
   return env.ASSETS.fetch(new Request(url,request));
  }
  return new Response('Not Found',{status:404});
 }
};
