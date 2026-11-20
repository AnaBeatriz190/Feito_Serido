/**
 * Script de Autenticação com Supabase para o Projeto Feito no Seridó
 * Gerencia login, cadastro, recuperação de senha, login social e autenticação via SMS (OTP).
 */
(() => {
  let clientPromise;
  let phoneForOtp = "";
  let otpCodeSent = false;

  /**
   * Exibe mensagens de feedback (toasts) na tela para o usuário.
   * @param {string} message - A mensagem a ser exibida.
   * @param {boolean} success - Define se é uma mensagem de sucesso (verde) ou erro (vermelha/primária).
   */
  function showAuthMessage(message, success = true) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-on-primary font-label-md text-label-md ${success ? "bg-secondary" : "bg-primary"}`;
    const icon = document.createElement("span");
    icon.className = "material-symbols-outlined text-[18px]";
    icon.textContent = success ? "check_circle" : "info";
    const text = document.createElement("span");
    text.textContent = message;
    toast.append(icon, text);
    container.appendChild(toast);
    // Remove o toast automaticamente após 5 segundos
    window.setTimeout(() => toast.remove(), 5000);
  }

  /**
   * Inicializa e retorna a instância do cliente Supabase de forma assíncrona (Singleton).
   * Busca as credenciais de configuração na API do backend Flask.
   */
  async function getClient() {
    if (!clientPromise) {
      clientPromise = (async () => {
        const response = await fetch("/api/supabase-config");
        const config = await response.json();
        if (!response.ok) throw new Error(config.error || "Não foi possível carregar a configuração do Supabase.");
        if (!window.supabase?.createClient) throw new Error("A biblioteca do Supabase não foi carregada.");
        return window.supabase.createClient(config.url, config.key);
      })();
    }
    return clientPromise;
  }

  /**
   * Traduz erros técnicos do Supabase em mensagens amigáveis para o usuário final.
   * @param {Error} error - O objeto de erro retornado pelo Supabase.
   * @returns {string} Mensagem traduzida e compreensível.
   */
  function friendlyError(error) {
    const message = error?.message || "Ocorreu um erro inesperado. Tente novamente.";
    if (/invalid login credentials/i.test(message)) return "E-mail ou senha inválidos.";
    if (/user already registered/i.test(message)) return "Este e-mail já possui uma conta. Entre ou recupere sua senha.";
    if (/password should be at least/i.test(message)) return "A senha precisa ter pelo menos 6 caracteres.";
    if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar.";
    return message;
  }

  /**
   * Determina a página de destino do usuário com base no seu papel (role) no sistema.
   * Verifica primeiro nos metadados do usuário e depois na tabela "profiles" do banco.
   * @param {object} client - Cliente do Supabase.
   * @param {object} user - Objeto do usuário autenticado.
   * @returns {string} Rota de redirecionamento (/painel_produtores ou /home).
   */
  async function destinationForUser(client, user) {
    let role = user.user_metadata?.role;
    const { data } = await client.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = data?.role || role || "buyer";
    return role === "artisan" ? "/painel_produtores" : "/home";
  }

  /**
   * Redireciona o usuário para a sua respectiva página baseada no perfil.
   */
  async function goToUserPage(client, user) {
    window.location.assign(await destinationForUser(client, user));
  }

  /**
   * Alterna o estado visual de carregamento (loading) do botão de envio do formulário.
   */
  function setBusy(form, busy) {
    const button = form?.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
    button.classList.toggle("opacity-60", busy);
  }

  // Expõe a função de toast globalmente
  window.showToast = showAuthMessage;

  /**
   * Manipula o envio do formulário de Login tradicional (E-mail e Senha).
   */
  window.handleLoginSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(form, true);
    try {
      const client = await getClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: document.getElementById("login-identifier").value.trim(),
        password: document.getElementById("login-password").value,
      });
      if (error) throw error;
      await goToUserPage(client, data.user);
    } catch (error) {
      showAuthMessage(friendlyError(error), false);
    } finally {
      setBusy(form, false);
    }
  };

  /**
   * Manipula o envio do formulário de Cadastro de nova conta.
   * Coleta dados adicionais (como nome, WhatsApp, tipo de usuário e dados de artesão, se aplicável).
   */
  window.handleRegisterSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const password = document.getElementById("reg-password").value;
    if (password !== document.getElementById("reg-password-confirm").value) {
      showAuthMessage("As senhas não coincidem. Confira os campos e tente novamente.", false);
      return;
    }

    const role = document.querySelector('input[name="userRole"]:checked')?.value || "buyer";
    const metadata = {
      full_name: document.getElementById("reg-name").value.trim(),
      phone: document.getElementById("reg-whatsapp").value.trim(),
      role,
    };
    if (role === "artisan") {
      metadata.artisan_city = document.getElementById("artisan-city").value;
      metadata.artisan_craft = document.getElementById("artisan-craft").value;
    }

    setBusy(form, true);
    try {
      const client = await getClient();
      const { data, error } = await client.auth.signUp({
        email: document.getElementById("reg-email").value.trim(),
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/cadastrar_login`,
        },
      });
      if (error) throw error;
      if (data.session && data.user) {
        showAuthMessage("Conta criada. Boas-vindas ao Feito no Seridó!");
        await goToUserPage(client, data.user);
      } else {
        showAuthMessage("Cadastro recebido. Confirme seu e-mail para ativar a conta.");
        window.switchAuthTab("login");
      }
    } catch (error) {
      showAuthMessage(friendlyError(error), false);
    } finally {
      setBusy(form, false);
    }
  };

  /**
   * Gerencia o login social (OAuth) utilizando provedores externos (ex: Google).
   */
  window.simulateSocialLogin = async (provider) => {
    if (provider !== "Google") return;
    try {
      const client = await getClient();
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/cadastrar_login` },
      });
      if (error) throw error;
    } catch (error) {
      showAuthMessage(friendlyError(error), false);
    }
  };

  /**
   * Abre o modal e reseta o estado para o fluxo de login rápido via WhatsApp/SMS (OTP).
   */
  window.triggerWhatsAppFastLogin = () => {
    phoneForOtp = "";
    otpCodeSent = false;
    document.getElementById("otp-phone-input").value = "";
    document.getElementById("otp-code-container").classList.add("hidden");
    document.getElementById("btn-otp-label").textContent = "Enviar código por SMS";
    document.getElementById("otp-modal").classList.remove("hidden");
  };

  /**
   * Controla as etapas do OTP (envio do código SMS e posterior verificação do token digitado).
   */
  window.proceedOtpSimulation = async () => {
    const button = document.getElementById("btn-send-otp");
    button.disabled = true;
    try {
      const client = await getClient();
      // Etapa 1: Enviar o código para o telefone informado
      if (!otpCodeSent) {
        const digits = document.getElementById("otp-phone-input").value.replace(/\D/g, "");
        const normalizedPhone = digits.startsWith("55") ? digits : `55${digits}`;
        if (![12, 13].includes(normalizedPhone.length)) {
          throw new Error("Informe um telefone brasileiro com DDD.");
        }
        phoneForOtp = `+${normalizedPhone}`;
        const { error } = await client.auth.signInWithOtp({
          phone: phoneForOtp,
          options: { channel: "sms", shouldCreateUser: false },
        });
        if (error) throw error;
        otpCodeSent = true;
        document.getElementById("otp-code-container").classList.remove("hidden");
        document.getElementById("btn-otp-label").textContent = "Confirmar código e entrar";
        showAuthMessage("Código enviado por SMS.");
        return;
      }

      // Etapa 2: Validar o token informado pelo usuário
      const token = document.getElementById("otp-code-input").value.trim();
      const { data, error } = await client.auth.verifyOtp({ phone: phoneForOtp, token, type: "sms" });
      if (error) throw error;
      if (data.user) await goToUserPage(client, data.user);
    } catch (error) {
      showAuthMessage(friendlyError(error), false);
    } finally {
      button.disabled = false;
    }
  };

  /**
   * Envia o e-mail de solicitação de recuperação de senha.
   */
  window.handleForgotSubmit = async () => {
    const email = document.getElementById("forgot-input").value.trim();
    if (!email) {
      showAuthMessage("Informe o e-mail associado à sua conta.", false);
      return;
    }
    try {
      const client = await getClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/cadastrar_login`,
      });
      if (error) throw error;
      showAuthMessage("Enviamos um link de recuperação para seu e-mail.");
      window.closeForgotModal();
    } catch (error) {
      showAuthMessage(friendlyError(error), false);
    }
  };

  /**
   * Modifica dinamicamente o modal para exibir o formulário de definição de nova senha
   * quando o usuário acessa o sistema através do link de recuperação enviado por e-mail.
   */
  function showPasswordRecovery() {
    const modal = document.getElementById("forgot-modal");
    const panel = modal.querySelector(":scope > div");
    panel.innerHTML = `
      <h3 class="font-headline-sm text-headline-sm text-center text-on-surface mb-4">Definir nova senha</h3>
      <form id="recovery-form" class="space-y-4">
        <label class="block font-label-md text-label-md font-semibold text-on-surface" for="recovery-password">Nova senha</label>
        <input class="w-full h-11 px-4 rounded-lg bg-surface text-on-surface font-body-md text-body-md" id="recovery-password" type="password" minlength="6" required placeholder="Mínimo 6 caracteres" />
        <button class="w-full h-11 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg font-bold" type="submit">Salvar nova senha</button>
      </form>`;
    modal.classList.remove("hidden");
    
    // Escuta o envio da nova senha para atualizar no Supabase
    document.getElementById("recovery-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = document.getElementById("recovery-password").value;
      try {
        const client = await getClient();
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        showAuthMessage("Senha atualizada. Entre com sua nova senha.");
        modal.classList.add("hidden");
        window.switchAuthTab("login");
      } catch (error) {
        showAuthMessage(friendlyError(error), false);
      }
    });
  }

  // Inicialização e escuta de eventos de estado de autenticação ao carregar a página
  getClient().then(async (client) => {
    // Monitora eventos de mudança de estado do Auth do Supabase
    client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") window.setTimeout(showPasswordRecovery, 0);
    });
    
    // Verifica se já existe uma sessão ativa e se a URL contém parâmetros de callback de autenticação
    const { data: { session } } = await client.auth.getSession();
    const isAuthCallback = new URLSearchParams(window.location.search).has("code") || window.location.hash.includes("access_token=");
    if (session && isAuthCallback) await goToUserPage(client, session.user);
  }).catch((error) => showAuthMessage(friendlyError(error), false));
})();