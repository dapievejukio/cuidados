import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const REDIRECT_DEFINIR_SENHA = "https://oraqui.app/definir-senha.html";
const PERFIS_AUTORIZADOS = ["gestor", "supervisor", "admin_cliente", "admin_oraqui"];

function resposta(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
function gerarPinCompatibilidade() {
  const valores = new Uint32Array(1);
  crypto.getRandomValues(valores);
  return String(1000 + (valores[0] % 9000));
}
function erroLog(etapa: string, error: unknown) {
  console.error(`[convidar-colaborador] ${etapa}:`, error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return resposta({ error: "Método não permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return resposta({ error: "Configuração interna incompleta." }, 500);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) return resposta({ error: "Sessão não encontrada." }, 401);

    const usuario = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { user }, error: userError } = await usuario.auth.getUser();
    if (userError || !user) return resposta({ error: "Sessão inválida ou expirada." }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return resposta({ error: "JSON inválido." }, 400); }

    // Nunca deduzir o condomínio pelo primeiro vínculo do gestor.
    const condominioId = Number(body.condominio_id);
    if (!Number.isSafeInteger(condominioId) || condominioId <= 0) {
      return resposta({ error: "Selecione o condomínio antes de cadastrar o colaborador.", codigo: "CONDOMINIO_OBRIGATORIO" }, 400);
    }

    const nome = String(body.nome ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const matricula = String(body.matricula ?? "").trim();
    const funcao = String(body.funcao ?? "").trim();
    const modulos = ["chat", "demandas", "cronograma", "atividades", "registros_posteriores", "documentos"];
    for (const modulo of modulos) {
      const valor = body[modulo + "_ativo"];
      if (valor !== undefined && typeof valor !== "boolean") {
        return resposta({ error: "Permissão de módulo inválida: " + modulo }, 400);
      }
    }
    const permissoes = Object.fromEntries(modulos.map(modulo => [modulo + "_ativo", body[modulo + "_ativo"] ?? true]));
    const pontoAtivo = body.ponto_ativo === true;
    const selfieObrigatoria = pontoAtivo && body.selfie_ponto_obrigatoria === true;
    const geolocalizacaoObrigatoria = pontoAtivo && body.geolocalizacao_ponto_obrigatoria === true;
    const intervaloAtivo = pontoAtivo && body.intervalo_ativo === true;
    const intervaloMinutos = intervaloAtivo ? Number(body.intervalo_minutos ?? 60) : 0;

    if (nome.length < 2) return resposta({ error: "Informe o nome do colaborador." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return resposta({ error: "Informe um e-mail válido." }, 400);
    if (!matricula) return resposta({ error: "Informe a matrícula." }, 400);
    if (!funcao) return resposta({ error: "Informe a função." }, 400);
    if (!Number.isInteger(intervaloMinutos) || intervaloMinutos < 0 || intervaloMinutos > 300) {
      return resposta({ error: "Intervalo inválido." }, 400);
    }

    // A autorização precisa ser específica para o condomínio selecionado.
    const { data: vinculos, error: vinculosError } = await admin
      .from("usuarios_gestao")
      .select("id,perfil,ativo,condominio_id,acesso_temporario,acesso_ativado_em,acesso_expira_em")
      .eq("auth_user_id", user.id)
      .eq("condominio_id", condominioId)
      .eq("ativo", true);
    if (vinculosError) throw vinculosError;
    const agora = Date.now();
    const gestor = (vinculos ?? []).find((g) => {
      if (!PERFIS_AUTORIZADOS.includes(g.perfil)) return false;
      if (g.acesso_temporario === true) {
        return !!g.acesso_ativado_em && !!g.acesso_expira_em && new Date(g.acesso_expira_em).getTime() > agora;
      }
      return g.acesso_temporario === false && g.acesso_expira_em == null;
    });
    if (!gestor) return resposta({ error: "Você não possui permissão de gestão válida neste condomínio." }, 403);

    const { data: condominio, error: condominioError } = await admin
      .from("condominios")
      .select("id,nome,ativo,ambiente_demo")
      .eq("id", condominioId)
      .eq("ativo", true)
      .maybeSingle();
    if (condominioError) throw condominioError;
    if (!condominio) return resposta({ error: "Condomínio não encontrado ou inativo." }, 403);

    // Impede que um convidado de demonstração crie acessos permanentes.
    if (condominio.ambiente_demo === true) {
      return resposta({ error: "O cadastro de novos usuários está desativado em ambientes de demonstração. Utilize os colaboradores fictícios disponíveis." }, 403);
    }

    const { data: emailRows, error: emailError } = await admin
      .from("colaboradores")
      .select("id,nome,email,matricula,funcao,ativo,condominio_id,auth_user_id")
      .eq("condominio_id", condominioId)
      .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
      .limit(2);
    if (emailError) throw emailError;
    if ((emailRows ?? []).length > 1) return resposta({ error: "Há cadastros duplicados com este e-mail no condomínio. Solicite revisão administrativa." }, 409);
    const existenteNoCondominio = emailRows?.[0] ?? null;

    const { data: matriculaRows, error: matriculaError } = await admin
      .from("colaboradores")
      .select("id,email")
      .eq("condominio_id", condominioId)
      .eq("matricula", matricula)
      .limit(2);
    if (matriculaError) throw matriculaError;
    if ((matriculaRows ?? []).some((c) => c.id !== existenteNoCondominio?.id)) {
      return resposta({ error: "Já existe um colaborador com essa matrícula neste condomínio." }, 409);
    }

    // Reaproveita o mesmo Auth em outros condomínios, sem duplicar identidade.
    const { data: outrosVinculos, error: outrosError } = await admin
      .from("colaboradores")
      .select("id,auth_user_id")
      .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
      .not("auth_user_id", "is", null)
      .limit(100);
    if (outrosError) throw outrosError;
    const ids = [...new Set((outrosVinculos ?? []).map((c) => c.auth_user_id).filter(Boolean))];
    if (ids.length > 1) return resposta({ error: "Este e-mail está vinculado a mais de uma conta de autenticação. Solicite revisão administrativa." }, 409);

    let authUserId: string | null = existenteNoCondominio?.auth_user_id ?? ids[0] ?? null;
    let authUser: { id: string; email?: string | null; email_confirmed_at?: string | null } | null = null;
    let authCriadoAgora = false;

    if (authUserId) {
      const { data, error } = await admin.auth.admin.getUserById(authUserId);
      if (error || !data?.user) {
        erroLog("localizar Auth", error);
        return resposta({ error: "Conta de autenticação vinculada não encontrada." }, 409);
      }
      authUser = data.user;
      if ((authUser.email ?? "").toLowerCase() !== email) {
        return resposta({ error: "O e-mail cadastrado não corresponde ao da conta de autenticação." }, 409);
      }
    } else {
      // O usuário pode já existir no Auth como gestor ou colaborador sem vínculo local.
      // A API administrativa não oferece busca por e-mail: paginamos a lista.
      for (let page = 1; page <= 100; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        const found = (data.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);
        if (found) { authUser = found; authUserId = found.id; break; }
        if ((data.users ?? []).length < 1000) break;
      }
    }

    if (existenteNoCondominio) {
      if (!existenteNoCondominio.ativo) return resposta({ error: "Colaborador inativo. Reative o cadastro antes de reenviar o acesso." }, 409);
      if (!existenteNoCondominio.auth_user_id) return resposta({ error: "Cadastro existente sem vínculo Auth. É necessária regularização administrativa." }, 409);
      if (!authUserId) return resposta({ error: "Cadastro existente sem conta de acesso. É necessária regularização administrativa." }, 409);
      const authPublico = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = authUser?.email_confirmed_at
        ? await authPublico.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT_DEFINIR_SENHA })
        : await authPublico.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: REDIRECT_DEFINIR_SENHA } });
      if (error) { erroLog("reenviar acesso", error); return resposta({ error: "Não foi possível reenviar o acesso.", detalhe: error.message }, 400); }
      return resposta({ ok: true, reenviado: true, tipo: "acesso_existente", mensagem: "Novo link de acesso enviado.", colaborador: existenteNoCondominio });
    }

    if (!authUserId) {
      const { data: convite, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: REDIRECT_DEFINIR_SENHA,
        data: { nome, perfil: "colaborador", condominio_id: condominioId, condominio: condominio.nome },
      });
      if (error || !convite?.user?.id) {
        erroLog("enviar convite", error);
        return resposta({ error: "Não foi possível enviar o convite.", detalhe: error?.message ?? null }, 400);
      }
      authUserId = convite.user.id;
      authCriadoAgora = true;
    }

    const { data: colaborador, error: criarError } = await admin
      .from("colaboradores")
      .insert({
        condominio: condominio.nome,
        condominio_id: condominioId,
        auth_user_id: authUserId,
        nome, email, matricula, funcao,
        ativo: true,
        ...permissoes,
        ponto_ativo: pontoAtivo,
        selfie_ponto_obrigatoria: selfieObrigatoria,
        geolocalizacao_ponto_obrigatoria: geolocalizacaoObrigatoria,
        intervalo_ativo: intervaloAtivo,
        intervalo_minutos: intervaloMinutos,
        pin: gerarPinCompatibilidade(),
      })
      .select("id,nome,email,matricula,funcao,ativo,condominio_id,auth_user_id")
      .single();
    if (criarError) {
      erroLog("inserir colaborador", criarError);
      // Auth é compartilhado entre condomínios. Em uma corrida de cadastros,
      // outra requisição pode já ter vinculado esta identidade. Nunca excluir
      // a conta como compensação de uma falha no cadastro local; uma nova
      // tentativa a encontra por e-mail e reaproveita a mesma identidade.
      return resposta({ error: "Não foi possível salvar o colaborador.", detalhe: criarError.message }, 400);
    }

    if (!authCriadoAgora) {
      const authPublico = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error } = authUser?.email_confirmed_at
        ? await authPublico.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT_DEFINIR_SENHA })
        : await authPublico.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: REDIRECT_DEFINIR_SENHA } });
      if (error) {
        erroLog("enviar acesso para conta reutilizada", error);
        return resposta({ ok: true, aviso: "Colaborador vinculado, mas o envio do link falhou. Reenvie o convite pela Gestão.", colaborador }, 200);
      }
    }
    return resposta({ ok: true, success: true, reenviado: false, tipo: "novo_colaborador", mensagem: "Colaborador cadastrado e acesso enviado.", colaborador });
  } catch (error) {
    erroLog("erro geral", error);
    return resposta({ error: "Erro interno ao cadastrar colaborador.", detalhe: error instanceof Error ? error.message : String(error) }, 500);
  }
});

