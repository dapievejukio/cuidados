const CACHE_NAME="oraqui-push-v1";

self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));

self.addEventListener("push",event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch{data={body:event.data?.text()||""}}
  const title=data.title||"ORAQUI";
  const options={
    body:data.body||"Você tem uma nova atualização.",
    tag:data.tag||"oraqui",
    renotify:true,
    data:{url:data.url||"/reservaigara/colaborador.html"}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const destino=new URL(event.notification.data?.url||"/reservaigara/colaborador.html",self.location.origin).href;
  event.waitUntil((async()=>{
    const windows=await clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of windows){
      if("focus" in client){
        if("navigate" in client)await client.navigate(destino);
        return client.focus();
      }
    }
    if(clients.openWindow)return clients.openWindow(destino);
  })());
});
