// ========================================================================
// 1. VARIÁVEIS GLOBAIS (ELEMENTOS HTML)
// Estas variáveis referenciam os IDs dos elementos que criamos no index.html.
// ========================================================================

const unidadesLista = document.getElementById('unidadesLista');
const inputBusca = document.getElementById('inputBusca');
const formFeedback = document.getElementById('formFeedback');
const anonimoCheck = document.getElementById('anonimoCheck');
const nomeInput = document.getElementById('nome');
const sobrenomeInput = document.getElementById('sobrenome');

// Array que irá armazenar todos os dados das unidades lidos do Firebase
// Isso permite que o filtro funcione localmente sem novas consultas ao banco de dados.
let todasUnidades = [];

// ========================================================================
// 2. FUNÇÕES DE RENDERIZAÇÃO E EXIBIÇÃO
// ========================================================================

/**
 * Cria o HTML de um único Card de Unidade de Saúde usando dados do Firebase.
 * @param {Object} unidade - Objeto contendo os dados da unidade.
 * @returns {string} String HTML do card.
 */
function criarCardUnidade(unidade) {
    // Tratamento de serviços: Cria badges para cada serviço
    const servicosHtml = (unidade.servicos || [])
        .map(servico => `<span class="badge bg-secondary badge-servico">${servico}</span>`)
        .join('');

    return `
        <div class="col">
            <div class="card unidade-card shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${unidade.nome}</h5>
                    <p class="card-text text-muted mb-1">${unidade.tipo_unidade} - ${unidade.bairro}</p>
                    <p class="card-text">
                        <i class="bi bi-geo-alt-fill me-1"></i> Endereço: ${unidade.endereco || 'Não informado'}
                    </p>
                    <p class="card-text">
                        <i class="bi bi-clock me-1"></i> Horário: ${unidade.horario_funcionamento || 'Verificar localmente'}
                    </p>
                    <p class="card-text">
                        <i class="bi bi-telephone me-1"></i> Contato: ${unidade.telefone || 'Sem telefone de contato'}
                    </p>
                    <hr>
                    <h6>Serviços Oferecidos:</h6>
                    <div class="d-flex flex-wrap">${servicosHtml}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Exibe a lista de unidades na tela, renderizando os cards.
 * @param {Array} unidades - Array de objetos de unidades a serem exibidas.
 */
function exibirUnidades(unidades) {
    if (unidadesLista) {
        if (unidades && unidades.length > 0) {
            // Mapeia o array de unidades para um array de strings HTML e junta tudo.
            unidadesLista.innerHTML = unidades.map(criarCardUnidade).join('');
        } else {
            // Mensagem de erro/alerta se não houver unidades
            unidadesLista.innerHTML = '<div class="col-12"><p class="alert alert-warning text-center">Nenhuma unidade encontrada com os critérios de busca.</p></div>';
        }
    }
}

// ========================================================================
// 3. FUNÇÃO DE BUSCA E FILTRO (LÓGICA ADICIONADA)
// ========================================================================

/**
 * Filtra as unidades de saúde com base em um termo de busca no array local 'todasUnidades'.
 * @param {string} termo - O texto digitado pelo usuário.
 */
function filtrarUnidades(termo) {
    const termoNormalizado = termo.toLowerCase().trim();

    if (!termoNormalizado) {
        // Se o termo estiver vazio, exibe todas as unidades sem filtro
        exibirUnidades(todasUnidades);
        return;
    }

    const unidadesFiltradas = todasUnidades.filter(unidade => {
        // Converte os campos para minúsculas para comparação (case-insensitive)
        const nome = unidade.nome ? unidade.nome.toLowerCase() : '';
        const bairro = unidade.bairro ? unidade.bairro.toLowerCase() : '';
        
        // Verifica se o termo está no NOME ou BAIRRO
        if (nome.includes(termoNormalizado) || bairro.includes(termoNormalizado)) {
            return true;
        }

        // Verifica se o termo está na lista de SERVIÇOS
        if (unidade.servicos && Array.isArray(unidade.servicos)) {
            // O .some() verifica se PELO MENOS UM serviço contém o termo
            const servicoEncontrado = unidade.servicos.some(servico => 
                servico.toLowerCase().includes(termoNormalizado)
            );
            return servicoEncontrado;
        }

        return false;
    });

    // Exibe o resultado do filtro
    exibirUnidades(unidadesFiltradas);
}

// ========================================================================
// 4. FUNÇÃO PRINCIPAL DE LEITURA DO FIREBASE
// ========================================================================

/**
 * Carrega todas as unidades de saúde do Cloud Firestore na inicialização.
 */
async function carregarUnidadesFirebase() {
    // Exibe mensagem de carregamento inicial
    exibirUnidades(null); 

    try {
        // Acessa o módulo Firestore (db) e a coleção 'unidades_saude'
        const snapshot = await db.collection('unidades_saude').get();
        
        // Mapeia os dados do Firebase para o array JavaScript, incluindo o ID
        const unidadesDoFirestore = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Salva os dados na variável global 'todasUnidades'
        todasUnidades = unidadesDoFirestore;

        // Exibe a lista completa
        exibirUnidades(todasUnidades);

        console.log(`Sucesso! ${todasUnidades.length} unidades carregadas do Firebase.`);

    } catch (error) {
        console.error("Erro ao carregar dados do Firebase Firestore:", error);
        unidadesLista.innerHTML = '<div class="col-12"><p class="alert alert-danger text-center">Erro ao conectar com o banco de dados. Verifique sua conexão ou a configuração do Firebase.</p></div>';
    }
}


// ========================================================================
// 5. INICIALIZAÇÃO DA PÁGINA (EVENT LISTENERS)
// ========================================================================

// Garante que o código seja executado após o HTML estar completamente carregado
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Inicia o carregamento dos dados do Back-end
    carregarUnidadesFirebase();

    // 2. Evento de Busca e Filtro (Input 'on the fly')
    // O evento 'input' dispara a função a cada tecla digitada
    if (inputBusca) {
        inputBusca.addEventListener('input', (e) => {
            filtrarUnidades(e.target.value); 
        });
    }

    // 3. Controle de Modo Anônimo (Habilita/Desabilita Nome/Sobrenome)
    if (anonimoCheck) {
        anonimoCheck.addEventListener('change', () => {
            const isAnonimo = anonimoCheck.checked;
            nomeInput.disabled = isAnonimo;
            sobrenomeInput.disabled = isAnonimo;
            if (isAnonimo) { // Limpa os campos se voltar para anônimo
                nomeInput.value = '';
                sobrenomeInput.value = '';
            }
        });
    }

    // 4. Envio de Feedback (A ser implementado no Dia 3)
    if (formFeedback) {
        formFeedback.addEventListener('submit', (e) => {
            e.preventDefault();
            // Função enviarFeedbackHandler será implementada aqui
            console.log("Tentativa de envio de feedback... (Lógica será implementada a seguir)");
        });
    }
});