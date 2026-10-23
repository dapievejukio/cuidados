import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function resposta(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...corsHeaders, "Content-Type": "application/json; charset=utf-8"},
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers: corsHeaders});

  try {
    if (req.method !== "POST") return resposta({error:"Método não permitido."},405);

    const supabaseUrl=Deno.env.get("SUPABASE_URL");
    const anonKey=Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!supabaseUrl||!anonKey||!serviceRoleKey) throw new Error("Configuração interna incompleta.");

    const authorization=req.headers.get("Authorization");
    if(!authorization) return resposta({error:"Sessão não encontrada."},401);

    const supabaseUsuario=createClient(supabaseUrl,anonKey,{
      global:{headers:{Authorization:authorization}},
    });

    const {data:{user},error:userError}=await supabaseUsuario.auth.getUser();
    if(userError||!user) return resposta({error:"Sessão inválida ou expirada."},401);

    const admin=createClient(supabaseUrl,serviceRoleKey,{
      auth:{autoRefreshToken:false,persistSession:false},
    });

    const body=await req.json();
    const colaboradorId=Number(body?.colaborador_id);
    const condominioSolicitado=Number(body?.condominio_id);
    if(!Number.isSafeInteger(colaboradorId)||colaboradorId<=0)
      return resposta({error:"Colaborador inválido."},400);
    if(!Number.isSafeInteger(condominioSolicitado)||condominioSolicitado<=0)
      return resposta({error:"Condomínio inválido: selecione o condomínio antes de reenviar."},400);

    // Identifica a pessoa pelo cadastro e nunca confia apenas no condomínio informado pelo navegador.
    const {data:colaborador,error:colaboradorError}=await admin
      .from("colaboradores")
      .select("id,nome,email,ativo,auth_user_id,condominio_id")
      .eq("id",colaboradorId)
      .eq("condominio_id",condominioSolicitado)
      .maybeSingle();
    if(colaboradorError) throw colaboradorError;
    if(!colaborador) return resposta({error:"Colaborador não encontrado no condomínio selecionado."},404);

    // Gestores podem ter vários vínculos: nunca usar maybeSingle() sem filtrar condomínio.
    const {data:gestores,error:gestorError}=await admin
      .from("usuarios_gestao")
      .select("id,perfil,ativo,condominio_id,acesso_temporario,acesso_ativado_em,acesso_expira_em")
      .eq("auth_user_id",user.id)
      .eq("condominio_id",colaborador.condominio_id)
      .eq("ativo",true);
    if(gestorError) throw gestorError;
    const perfisAutorizados=["gestor","supervisor","admin_cliente","admin_oraqui"];
    if(!(gestores||[]).some(g=>perfisAutorizados.includes(g.perfil) && (
      (g.acesso_temporario === false && g.acesso_expira_em == null) ||
      (g.acesso_temporario === true && !!g.acesso_ativado_em && !!g.acesso_expira_em && new Date(g.acesso_expira_em).getTime() > Date.now())
    )))
      return resposta({error:"Você não possui permissão para reenviar convites neste condomínio."},403);

    if(!colaborador.ativo) return resposta({error:"A colaboradora está inativa. Reative o cadastro antes de reenviar."},409);
    if(!colaborador.email||!colaborador.auth_user_id)
      return resposta({error:"Colaborador sem acesso Auth/e-mail configurado."},409);

    const {data:condominio,error:condominioError}=await admin
      .from("condominios")
      .select("id,nome,slug,ativo,ambiente_demo")
      .eq("id",colaborador.condominio_id)
      .eq("ativo",true)
      .maybeSingle();
    if(condominioError) throw condominioError;
    if(!condominio) return resposta({error:"Condomínio não encontrado ou inativo."},403);

    if(condominio.ambiente_demo === true) return resposta({error:"O envio de convites está desativado em ambientes de demonstração."},403);
    const redirectTo="https://oraqui.app/definir-senha.html";

    // Conta convidada que ainda não confirmou o e-mail não deve receber
    // um link de recuperação de senha: ela ainda não possui uma senha válida.
    // Para esse caso geramos Magic Link, que autentica/confirma a conta e
    // entrega uma sessão válida à página definir-senha.html.
    const {data:authData,error:authError}=await admin.auth.admin.getUserById(colaborador.auth_user_id);
    if(authError||!authData?.user){
      console.error("Erro ao localizar conta Auth:",authError);
      return resposta({error:"Conta de acesso não encontrada.",detalhe:authError?.message||null},409);
    }
    const authUser=authData.user;
    if((authUser.email||"").trim().toLowerCase()!==String(colaborador.email||"").trim().toLowerCase()){
      return resposta({error:"O e-mail do cadastro não corresponde à conta de acesso.",codigo:"EMAIL_AUTH_DIVERGENTE"},409);
    }

    // O próprio destinatário confirma o e-mail ao usar o link. O reenvio não
    // altera a conta, a senha nem os vínculos de outros condomínios.
    const authPublico=createClient(supabaseUrl,anonKey,{
      auth:{autoRefreshToken:false,persistSession:false},
    });
    const tipoLink=authUser.email_confirmed_at ? "recovery" : "magiclink";
    const {error:envioError}=authUser.email_confirmed_at
      ? await authPublico.auth.resetPasswordForEmail(colaborador.email,{redirectTo})
      : await authPublico.auth.signInWithOtp({email:colaborador.email,options:{shouldCreateUser:false,emailRedirectTo:redirectTo}});
    if(envioError) return resposta({error:"Não foi possível reenviar o acesso.",detalhe:envioError.message},502);

    return resposta({
      ok:true,
      mensagem:"Novo link para criação de senha enviado.",
      tipo:tipoLink,
      colaborador_id:colaborador.id,
      email:colaborador.email,
    },200);

  } catch(error) {
    console.error("Erro ao reenviar convite:",error);
    return resposta({
      error:"Erro interno ao reenviar convite.",
      detalhe:error instanceof Error?error.message:String(error),
    },500);
  }
});
