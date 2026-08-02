// ==========================================
// VARIÁVEIS GLOBAIS
// ==========================================
let pecasExcel = [];          // Lista de peças
let funcionarios = {};        // { "cracha": "Nome" }
let frotadepositos = {};      // { "frota": "Deposito" }
let mapaFiliaisCidades = {};  // { "15": "Rondon" }
let equipamentosValidos = []; // Lista de códigos de Equipamentos válidos
let contador = 1;             // Contador da tabela de peças

// ⚠️ SUBS-TITUIR PELO GID REAL DA ABA EQUIPAMENTO NO GOOGLE SHEETS
const GID_EQUIPAMENTO = "1995966328";

// ==========================================
// INICIALIZAÇÃO DA PÁGINA E EVENTOS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Atualiza Data e Hora iniciais
  atualizarInputsDataHora();

  // 2. Carrega todos os CSVs externos em paralelo
  carregarTodasAsPlanilhas();

  // Mapeamento dos Elementos do DOM
  const codigoInput = document.getElementById("codigo");
  const descricaoInput = document.getElementById("descricao");
  const quantidadeInput = document.getElementById("quantidade");
  const btnAdd = document.getElementById("btnAdd");
  const crachaInput = document.getElementById("cracha");
  const frotaInput = document.getElementById("frota");
  const filialInput = document.getElementById("filial");
  const equipamentoInput = document.getElementById("equipamento");
  const form = document.getElementById("formulario");
  const trilho = document.getElementById("trilho");

  // Alternador de Tema Dark/Light (Com suporte a Teclado)
  if (trilho) {
    const alternarTema = () => {
      trilho.classList.toggle("dark");
      document.body.classList.toggle("dark");
    };

    trilho.addEventListener("click", alternarTema);
    trilho.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        alternarTema();
      }
    });
  }

  // Validação do EQUIPAMENTO (Frota do Veículo)
  if (equipamentoInput) {
    equipamentoInput.addEventListener("change", function () {
      const eqDigitado = String(this.value).trim();

      if (!eqDigitado) return;

      // Verifica se o equipamento digitado existe na lista carregada
      const existe = equipamentosValidos.some(
        (eq) => eq.toLowerCase() === eqDigitado.toLowerCase()
      );

      if (!existe) {
        alert(`❌ ERRO: O equipamento "${eqDigitado}" não está cadastrado na planilha!`);
        this.value = "";
        this.focus();
      }
    });
  }

  // Tratamento do campo FILIAL
  if (filialInput) {
    filialInput.addEventListener("change", function () {
      const valorInput = String(this.value).trim();
      const campoUnidade = document.getElementById("unidade");

      if (!valorInput) {
        if (campoUnidade) campoUnidade.value = "";
        return;
      }

      // Extrai apenas o código antes do hífen
      const codFilial = valorInput.split("-")[0].trim().toLowerCase();
      const cidadeEncontrada = mapaFiliaisCidades[codFilial];

      if (cidadeEncontrada) {
        if (campoUnidade) campoUnidade.value = cidadeEncontrada;
        this.value = codFilial;
      } else {
        alert(`❌ ERRO: A filial "${valorInput}" não está cadastrada na planilha!`);
        if (campoUnidade) campoUnidade.value = "";
        this.value = "";
        this.focus();
      }
    });
  }

  // Validação do CRACHÁ
  if (crachaInput) {
    crachaInput.addEventListener("change", function () {
      const crachaDigitado = String(this.value).trim();
      const campoNome = document.getElementById("nome");

      if (!crachaDigitado) {
        if (campoNome) campoNome.value = "";
        return;
      }

      const nomeEncontrado = funcionarios[crachaDigitado];

      if (nomeEncontrado) {
        if (campoNome) campoNome.value = nomeEncontrado;
      } else {
        alert(`❌ ERRO: O crachá "${crachaDigitado}" não está cadastrado!`);
        if (campoNome) campoNome.value = "";
        this.value = "";
        this.focus();
      }
    });
  }

  // Validação da FROTA -> Puxa DEPÓSITO e FRENTE
  if (frotaInput) {
    frotaInput.addEventListener("change", function () {
      const frotaDigitada = String(this.value).trim().toLowerCase();
      const campoDeposito = document.getElementById("deposito");
      const campoFrente = document.getElementById("frente");

      if (!frotaDigitada) {
        if (campoDeposito) campoDeposito.value = "";
        if (campoFrente) campoFrente.value = "";
        return;
      }

      const dadosEncontrados = frotadepositos[frotaDigitada];

      if (dadosEncontrados) {
        if (campoDeposito) campoDeposito.value = dadosEncontrados.deposito;
        if (campoFrente) campoFrente.value = dadosEncontrados.frente;
      } else {
        alert(`❌ ERRO: A frota "${this.value.trim()}" não está cadastrada!`);
        if (campoDeposito) campoDeposito.value = "";
        if (campoFrente) campoFrente.value = "";
        this.value = "";
        this.focus();
      }
    });
  }

  // Validação do CÓDIGO DA PEÇA
  if (codigoInput) {
    codigoInput.addEventListener("change", () => {
      const codDigitado = String(codigoInput.value).trim();

      if (!codDigitado) {
        descricaoInput.value = "";
        descricaoInput.readOnly = false;
        return;
      }

      const pecaEncontrada = pecasExcel.find(
        (item) => String(item.CODIGO).trim().toLowerCase() === codDigitado.toLowerCase()
      );

      if (pecaEncontrada) {
        descricaoInput.value = pecaEncontrada.DESCRICAO || "";
        descricaoInput.readOnly = true;
        quantidadeInput.focus();
      } else {
        alert(`❌ ERRO: Peça código "${codDigitado}" não encontrada no catálogo!`);
        descricaoInput.value = "";
        descricaoInput.readOnly = false;
        codigoInput.value = "";
        codigoInput.focus();
      }
    });
  }

  // Busca Inversa pela Descrição (Com suporte a acentuação)
  if (descricaoInput) {
    descricaoInput.addEventListener("input", () => {
      if (descricaoInput.readOnly) return;

      const descDigitada = normalizarTexto(descricaoInput.value);
      if (descDigitada.length < 3) return;

      const pecaEncontrada = pecasExcel.find((item) =>
        normalizarTexto(item.DESCRICAO || "").includes(descDigitada)
      );

      if (pecaEncontrada) {
        codigoInput.value = pecaEncontrada.CODIGO || "";
      }
    });
  }

  // Adicionar Peça via Tecla Enter no Campo Quantidade
  if (quantidadeInput) {
    quantidadeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        adicionarPeca();
      }
    });
  }

  // Adicionar Peça na Tabela
  if (btnAdd) {
    btnAdd.addEventListener("click", adicionarPeca);
  }

  // Evento de Submit do Formulário
  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
});

// ==========================================
// CARREGAMENTO PARALELO DAS PLANILHAS (FAST LOAD)
// ==========================================
async function carregarTodasAsPlanilhas() {
  const URL_BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5hLpWHoGUwXfsusRwEYiHGp5dUAuyGt0xpACkMGHzBWrOhOVHyMw0lU-6PfzvQ1v_SMpuv_VO8ljv/pub?output=csv&gid=";

  const endpoints = {
    filiais: `${URL_BASE}1082708150`,
    frotas: `${URL_BASE}1471806045`,
    funcionarios: `${URL_BASE}69189727`,
    catalogo: `${URL_BASE}0`,
    equipamentos: `${URL_BASE}${GID_EQUIPAMENTO}`
  };

  try {
    const [resFiliais, resFrotas, resFunc, resCat, resEq] = await Promise.all([
      fetch(endpoints.filiais).then(r => r.text()),
      fetch(endpoints.frotas).then(r => r.text()),
      fetch(endpoints.funcionarios).then(r => r.text()),
      fetch(endpoints.catalogo).then(r => r.text()),
      fetch(endpoints.equipamentos).then(r => r.text())
    ]);

    processarFiliais(resFiliais);
    processarFrotas(resFrotas);
    processarFuncionarios(resFunc);
    processarCatalogo(resCat);
    processarEquipamentos(resEq);

    console.log("🚀 Todos os dados (inclusive Equipamentos) foram carregados com sucesso!");
  } catch (erro) {
    console.error("❌ Falha no carregamento dos dados das planilhas:", erro);
  }
}

// Processadores dos CSVs
function processarFiliais(csvTexto) {
  const linhas = csvTexto.split(/\r?\n/);
  const datalist = document.getElementById("lista-filiais");
  if (datalist) datalist.innerHTML = "";

  linhas.forEach((linha, index) => {
    if (index === 0 || !linha.trim()) return;
    const colunas = parseCSVLine(linha);
    if (colunas.length >= 2) {
      const filial = colunas[0];
      const cidade = colunas[1];
      if (filial && cidade) {
        mapaFiliaisCidades[filial.toLowerCase()] = cidade;
        if (datalist) {
          const option = document.createElement("option");
          option.value = `${filial} - ${cidade}`;
          datalist.appendChild(option);
        }
      }
    }
  });
}

// Atualize o processador de Frotas para guardar Depósito e Frente
function processarFrotas(csvTexto) {
  const linhas = csvTexto.split(/\r?\n/);
  frotadepositos = {}; // Ex: { "11110058": { deposito: "35", frente: "FRENTE - 01" } }

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    const colunas = parseCSVLine(linha);
    if (colunas.length >= 2 && colunas[0]) {
      const codFrota = colunas[0].toLowerCase().trim();
      frotadepositos[codFrota] = {
        deposito: colunas[1] || "",
        frente: colunas[2] || "" // Puxa a Coluna C (FRENTE)
      };
    }
  }
}

function processarFuncionarios(csvTexto) {
  const linhas = csvTexto.split(/\r?\n/);
  funcionarios = {};

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    const colunas = parseCSVLine(linha);
    if (colunas.length >= 2 && colunas[0]) {
      funcionarios[String(colunas[0]).trim()] = colunas[1];
    }
  }
}

function processarCatalogo(csvTexto) {
  const linhas = csvTexto.split(/\r?\n/);
  pecasExcel = [];

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    const colunas = parseCSVLine(linha);
    if (colunas.length >= 2 && colunas[0]) {
      pecasExcel.push({ CODIGO: colunas[0], DESCRICAO: colunas[1] });
    }
  }
}

function processarEquipamentos(csvTexto) {
  const linhas = csvTexto.split(/\r?\n/);
  equipamentosValidos = [];

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;

    const colunas = parseCSVLine(linha);
    if (colunas.length >= 1 && colunas[0]) {
      equipamentosValidos.push(String(colunas[0]).trim());
    }
  }
}

// ==========================================
// FUNÇÕES AUXILIARES DE PARSE E FORMATAÇÃO
// ==========================================
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

function normalizarTexto(str) {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function atualizarInputsDataHora() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  const hora = String(agora.getHours()).padStart(2, "0");
  const minuto = String(agora.getMinutes()).padStart(2, "0");

  const elData = document.getElementById("data");
  const elHorario = document.getElementById("horario");

  if (elData) elData.value = `${ano}-${mes}-${dia}`;
  if (elHorario) elHorario.value = `${hora}:${minuto}`;
}

// ==========================================
// OPERAÇÕES DA TABELA DE PEÇAS
// ==========================================
function adicionarPeca() {
  const codigoInput = document.getElementById("codigo");
  const descricaoInput = document.getElementById("descricao");
  const quantidadeInput = document.getElementById("quantidade");

  const codigo = codigoInput.value.trim();
  const descricao = descricaoInput.value.trim();
  const quantidade = quantidadeInput.value.trim();

  if (!codigo) {
    alert("Digite um código de peça válido.");
    codigoInput.focus();
    return;
  }

  if (!descricao) {
    alert("Descrição da peça não encontrada ou vazia.");
    descricaoInput.focus();
    return;
  }

  if (!quantidade || Number(quantidade) <= 0) {
    alert("Digite uma quantidade válida (maior que 0).");
    quantidadeInput.focus();
    return;
  }

  const tbody = document.getElementById("tabelaintens");
  const linha = document.createElement("tr");

  linha.innerHTML = `
    <td>${contador}</td>
    <td>${codigo}</td>
    <td>${descricao}</td>
    <td>${quantidade}</td>
    <td>
      <button type="button" class="btn-excluir" title="Remover item" aria-label="Remover item">
        <i class="fa-solid fa-trash" aria-hidden="true"></i>
      </button>
    </td>
  `;

  tbody.appendChild(linha);

  linha.querySelector(".btn-excluir").addEventListener("click", () => {
    linha.remove();
    reordenarTabela();
  });

  contador++;

  // Reseta campos do formulário de inclusão de peça
  codigoInput.value = "";
  descricaoInput.value = "";
  quantidadeInput.value = "";
  descricaoInput.readOnly = false;
  codigoInput.focus();
}

function reordenarTabela() {
  const linhas = document.querySelectorAll("#tabelaintens tr");
  contador = 1;
  linhas.forEach((linha) => {
    if (linha.cells.length >= 4) {
      linha.cells[0].textContent = contador++;
    }
  });
}

// ==========================================
// SUBMIT FORMULARIO (GOOGLE APPS SCRIPT)
// ==========================================
async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const btnSubmit = form.querySelector('button[type="submit"]');

  const pecas = [];
  document.querySelectorAll("#tabelaintens tr").forEach((linha) => {
    const colunas = linha.querySelectorAll("td");
    if (colunas.length < 4) return;

    pecas.push({
      codigo: colunas[1].textContent.trim(),
      descricao: colunas[2].textContent.trim(),
      quantidade: colunas[3].textContent.trim()
    });
  });

  if (pecas.length === 0) {
    alert("⚠️ Adicione pelo menos uma peça à tabela antes de enviar.");
    return;
  }

  // Trava o botão contra duplo clique acidental
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Enviando...';
  }

  const params = new URLSearchParams();
  params.append("filial", document.getElementById("filial").value);
  params.append("unidade", document.getElementById("unidade").value);
  params.append("frota", document.getElementById("frota").value); // FROTA OFICINA
  params.append("deposito", document.getElementById("deposito").value); // DEPÓSITO

  const elEquipamento = document.getElementById("equipamento");
  params.append("equipamento", elEquipamento ? elEquipamento.value : ""); // EQUIPAMENTO (Frota do Veículo)

  params.append("data", document.getElementById("data").value);
  params.append("horario", document.getElementById("horario").value);
  params.append("os", document.getElementById("os").value);
  params.append("cracha", document.getElementById("cracha").value);
  params.append("responsavel", document.getElementById("nome").value);

  // Peças
  params.append("codigo", pecas.map((p) => p.codigo).join("\n"));
  params.append("descricao", pecas.map((p) => p.descricao).join("\n"));
  params.append("quantidade", pecas.map((p) => p.quantidade).join("\n"));

  try {
    const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbxh0ljjI9PV4tKj-gQnk-DR6Vdjye-JpObR_rt9b95g-BXEQ7f64gfAT-8k8sVhvp2Y/exec";

    await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });

    alert("✅ Requisição enviada com sucesso!");

    form.reset();
    document.getElementById("tabelaintens").innerHTML = "";
    contador = 1;
    atualizarInputsDataHora();

  } catch (erro) {
    console.error("❌ Erro no Envio:", erro);
    alert(`❌ Erro no envio: ${erro.message}\nVerifique sua conexão e tente novamente.`);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Enviar Relatório';
    }
  }
}


const btnSair = document.getElementById('btnSair');

if (btnSair) {
  btnSair.addEventListener('click', function (e) {
    e.preventDefault();

    if (confirm("Deseja realmente fechar o aplicativo?")) {
      // 1. Tenta fechar a janela/aba/PWA diretamente
      window.close();

      // 2. Se o navegador/sistema bloquear o fechamento (comum em mobile/PWA),
      // redireciona para uma tela em branco ou limpa o formulário e avisa
      setTimeout(() => {
        // Redireciona para o index limpo
        window.location.href = './index.html';
        
        // Exibe o aviso para o usuário fechar a aba/app no botão do celular
        alert("Para fechar completamente o aplicativo, feche a aba do seu navegador ou deslize o app na tela do celular.");
      }, 300);
    }
  });
}