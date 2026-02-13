# StaiDOC — Integração Frontend (Lovable)

## Instruções para Bruno

Copie cada prompt abaixo e cole no chat do Lovable, UM POR VEZ, na ordem.
Espere o Lovable terminar de processar antes de colar o próximo.

Os valores do Supabase já estão preenchidos nos prompts abaixo.
Basta copiar e colar diretamente no Lovable.

---

## PROMPT 1: Instalar Supabase e configurar o cliente

```
Instale o pacote @supabase/supabase-js e crie a integração com o Supabase.

Crie o arquivo src/integrations/supabase/client.ts com:

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://unirrreopafdxjdxbplc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaXJycmVvcGFmZHhqZHhicGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDk4NTgsImV4cCI6MjA4NjU4NTg1OH0.uiyq1Fge_iUvAIwvCh_tZ7p9vmP9giLrIE-O65iGlL4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Também crie o arquivo src/integrations/supabase/types.ts com os tipos do banco de dados. As tabelas são:
- profiles (id uuid, full_name text, crm_number text, crm_state text, specialty text, created_at timestamptz, updated_at timestamptz)
- conversations (id uuid, user_id uuid, title text, status text enum active/completed/archived, started_at timestamptz, ended_at timestamptz, created_at timestamptz)
- messages (id uuid, conversation_id uuid, user_id uuid, role text enum user/assistant/system, content text, content_hash text, has_image boolean, tokens_used integer, model_used text, created_at timestamptz)
- consent_records (id uuid, user_id uuid, consent_type text, consent_version text, granted boolean, granted_at timestamptz, revoked_at timestamptz, ip_address text, user_agent text, legal_basis text, created_at timestamptz)
- data_subject_requests (id uuid, requester_user_id uuid, request_type text, status text, description text, response text, requested_at timestamptz, acknowledged_at timestamptz, completed_at timestamptz, deadline_at timestamptz, export_format text, created_at timestamptz)
- explainability_logs (id uuid, user_id uuid, message_id uuid, conversation_id uuid, ai_model_used text, explanation_level smallint, explanation_content text, confidence_score numeric, disclaimer_shown boolean, human_in_the_loop_confirmed boolean, created_at timestamptz)

Gere o tipo Database com todas essas tabelas para uso com o cliente Supabase tipado.
```

---

## PROMPT 2: Autenticação com Google e proteção de rotas

```
Adicione autenticação com Google usando Supabase Auth. Crie os seguintes componentes e hooks:

1. src/contexts/AuthContext.tsx — Context provider que:
   - Gerencia o estado de autenticação (user, session, loading)
   - Escuta mudanças de auth via supabase.auth.onAuthStateChange
   - Expõe funções: signInWithGoogle, signOut
   - signInWithGoogle usa supabase.auth.signInWithOAuth({ provider: 'google' })
   - signOut usa supabase.auth.signOut()
   - Busca o perfil do médico na tabela profiles após login

2. src/components/auth/ProtectedRoute.tsx — Componente que:
   - Verifica se o usuário está autenticado
   - Se não estiver, redireciona para /login
   - Se estiver autenticado mas crm_number for "PENDENTE", redireciona para /onboarding

3. src/pages/Login.tsx — Página de login com:
   - Design limpo e profissional (fundo claro, card centralizado)
   - Logo do StaiDOC (usar o SVG que já existe em src/assets/staidoc-logo.svg)
   - Título: "StaiDOC" e subtítulo: "Suporte Diagnóstico Baseado em Evidências"
   - Botão "Entrar com Google" que chama signInWithGoogle
   - Texto no rodapé: "Prevvine Tratamento de Dados Ltda. | Sandbox Regulatório ANPD 2025-2026"
   - Texto: "Seus dados são protegidos pela LGPD (Lei 13.709/2018)"
   - Sem emojis, sem asteriscos, design elegante e médico

4. src/pages/Onboarding.tsx — Página para completar o perfil do médico:
   - Formulário com campos: Nome Completo, Número do CRM, Estado do CRM (select com todos os estados BR), Especialidade (campo de texto)
   - Ao submeter, atualiza a tabela profiles via Supabase
   - Após salvar, redireciona para a página principal /
   - Design consistente com a página de login

5. Atualizar App.tsx com as rotas:
   - /login — página de login (pública)
   - /onboarding — página de onboarding (protegida, só para CRM pendente)
   - / — página principal do chat (protegida)
   - Envolver tudo com AuthProvider

Não use emojis em nenhum lugar. Use linguagem em português do Brasil.
```

---

## PROMPT 3: Conectar o chat com a Edge Function (streaming)

```
Agora conecte o chat existente (página Index.tsx) com o backend Supabase. Substitua completamente o sistema de mock responses por chamadas reais à Edge Function com streaming.

Faça as seguintes alterações:

1. Criar src/hooks/useConversations.ts:
   - Buscar conversas do usuário autenticado via supabase.from('conversations').select().order('created_at', { ascending: false })
   - Função createConversation: insere nova conversa e retorna o id
   - Função deleteConversation: deleta conversa
   - Função updateConversationTitle: atualiza o título

2. Criar src/hooks/useMessages.ts:
   - Buscar mensagens de uma conversa via supabase.from('messages').select().eq('conversation_id', id).order('created_at')
   - Função sendMessage que:
     a) Chama a Edge Function via fetch com streaming SSE:
        const response = await fetch('https://unirrreopafdxjdxbplc.supabase.co/functions/v1/process-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuaXJycmVvcGFmZHhqZHhicGxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDk4NTgsImV4cCI6MjA4NjU4NTg1OH0.uiyq1Fge_iUvAIwvCh_tZ7p9vmP9giLrIE-O65iGlL4'
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            content: messageText,
            has_image: false
          })
        });
     b) Lê o streaming SSE:
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  // Acumular o texto progressivamente no estado da mensagem do assistant
                  // Atualizar o estado em tempo real para o usuário ver o texto aparecendo
                }
              } catch {}
            }
          }
        }

3. Modificar src/pages/Index.tsx:
   - Usar useConversations e useMessages em vez do estado local
   - Quando o usuário enviar mensagem:
     a) Mostrar a mensagem do usuário imediatamente na tela
     b) Mostrar uma mensagem do assistant vazia com indicador de carregamento
     c) Conforme o streaming retorna texto, ir preenchendo a mensagem do assistant progressivamente (efeito de digitação suave, como ChatGPT)
     d) Quando o streaming terminar ([DONE]), marcar a mensagem como completa
   - As conversas do sidebar devem vir do banco de dados
   - Ao criar nova conversa, criar via supabase.from('conversations').insert()
   - O título da conversa pode ser gerado automaticamente a partir das primeiras palavras da primeira mensagem

4. Modificar src/components/chat/MessageBubble.tsx:
   - Renderizar o conteúdo da mensagem com formatação adequada
   - Detectar e renderizar links de referências PubMed como links clicáveis
   - Formatar os blocos da resposta (RESUMO CLINICO, RACIOCINIO CLINICO, HIPOTESES DIAGNOSTICAS, etc.) com tipografia clara usando tamanhos de fonte e espaçamento, sem usar asteriscos ou emojis
   - O texto "[HUMAN-IN-THE-LOOP]" e "[TRANSPARENCIA]" devem aparecer em estilo discreto (cor cinza, fonte menor)
   - O texto "[AVISO DE PRIVACIDADE]" deve aparecer com fundo amarelo claro

5. Remover completamente:
   - src/data/mock-responses.ts (não é mais necessário)
   - Qualquer referência a mock data ou respostas simuladas

Não use emojis em nenhum lugar. Mantenha o design profissional atual.
```

---

## PROMPT 4: Consentimento LGPD (obrigatório no primeiro acesso)

```
Adicione uma tela de consentimento LGPD que aparece obrigatoriamente no primeiro acesso do médico (após o onboarding, antes de acessar o chat).

1. Criar src/pages/Consent.tsx:
   - Título: "Termos de Uso e Consentimento para Tratamento de Dados"
   - Texto explicando:
     - O StaiDOC é uma ferramenta de suporte ao diagnóstico baseada em IA
     - Os dados clínicos inseridos são anonimizados automaticamente antes do processamento
     - Nenhum dado pessoal identificável de pacientes é armazenado
     - Imagens enviadas são processadas em memória e descartadas imediatamente
     - A IA não faz diagnósticos, apenas sugere hipóteses baseadas em evidências
     - O médico é o único responsável pela decisão clínica
     - Base legal: Art. 7, V e Art. 11, II, "g" da LGPD
   - 4 checkboxes obrigatórios:
     a) "Li e aceito os Termos de Uso" (consent_type: terms_of_service)
     b) "Autorizo o processamento dos dados clínicos inseridos" (consent_type: data_processing)
     c) "Compreendo que a IA é uma ferramenta de suporte e não substitui minha decisão clínica" (consent_type: ai_processing)
     d) "Autorizo o processamento temporário de imagens clínicas em memória" (consent_type: image_processing)
   - Botão "Aceitar e Continuar" (habilitado somente quando todos os checkboxes estiverem marcados)
   - Ao clicar, inserir 4 registros na tabela consent_records via Supabase:
     Cada registro com: user_id, consent_type, consent_version: "1.0", granted: true, granted_at: now(), legal_basis: "LGPD Art. 7, V e Art. 11, II, g", ip_address e user_agent do navegador

2. Atualizar ProtectedRoute.tsx:
   - Após verificar autenticação e CRM, verificar se o usuário já deu consentimento
   - Buscar consent_records do usuário: supabase.from('consent_records').select().eq('user_id', userId).eq('granted', true)
   - Se não tiver os 4 tipos de consentimento, redirecionar para /consent

3. Atualizar App.tsx adicionando a rota /consent (protegida)

Design limpo, sem emojis, texto formal em português do Brasil.
```

---

## PROMPT 5: Modelo selector fixo (somente Claude Opus 4.6)

```
Simplifique o ModelSelector. O StaiDOC usa exclusivamente o Claude Opus 4.6 da Anthropic. Não há opção de escolher modelo.

Modifique src/components/chat/ModelSelector.tsx para:
- Exibir apenas um badge/tag fixo com o texto "Claude Opus 4.6" em estilo discreto
- Remover o dropdown de seleção
- Remover as opções de claude-4-sonnet e claude-3.5-haiku do arquivo de tipos
- Manter o componente pequeno e elegante, sem chamar atenção

Atualize src/types/chat.ts para ter apenas um modelo:
- ModelId: "claude-opus-4-6"
- Model: { id: "claude-opus-4-6", name: "Claude Opus 4.6", description: "Modelo avançado para suporte diagnóstico" }
```

---

## Ordem de execução

1. PROMPT 1 — Supabase client (base)
2. PROMPT 2 — Auth + Login + Onboarding (autenticação)
3. PROMPT 3 — Chat com streaming (funcionalidade principal)
4. PROMPT 4 — Consentimento LGPD (compliance)
5. PROMPT 5 — Modelo fixo (ajuste fino)

Após cada prompt, teste no preview do Lovable antes de prosseguir.
