// Modelos prontos (exemplos). Os dados do escritório vêm de Configurações → Dados da empresa.
// São carregados no editor em "Inserir → Modelo pronto" e depois salvos como um modelo normal.
// Os dados pessoais dos documentos originais foram trocados por campos automáticos.

import type { ImagemModelo, PaginaModelo } from "./documento";

const c = (chave: string) => `<span data-campo="${chave}"></span>`;
const J = 'style="text-align: justify"';
const JR = 'style="text-align: justify; text-indent: 1.25cm"';
const C = 'style="text-align: center"';
const VAZIO = "<p></p>";
const LINHA = "______________________________________________";

/** Timbrado oficial (cabeçalho com logo e rodapé com contatos), servido pelo próprio site. */
const TIMBRADO = {
  topo: { arquivo: "/timbrado/demo-cabecalho.png", largura: 210, x: 0, y: 0, proporcao: 0.1194 },
  rodape: { arquivo: "/timbrado/demo-rodape.png", largura: 126, x: 0, y: 0, proporcao: 0.248 },
};

export type ModeloPronto = {
  id: string;
  nome: string;
  categoria: string;
  descricao: string;
  html: string;
  pagina: Partial<PaginaModelo>;
  /** Formulário de terceiro (banco etc.): usa o cabeçalho/rodapé próprio no lugar do timbrado do escritório. */
  timbrado?: { topo: (typeof TIMBRADO)["topo"] | null; rodape: (typeof TIMBRADO)["rodape"] | null };
};

const CONTRATADA = `Dr(a). <strong>${c("advogado_responsavel")}</strong>, ${c("oab_responsavel")}, com endereço profissional em ${c("escritorio_endereco")}, telefone ${c("escritorio_telefone")}`;

// Contratos de honorários (cível e criminal): a advogada como CONTRATADA, com e-mail do escritório.
const CONTRATADA_CONTRATO = `<strong>${c("advogado_responsavel")}</strong>, advogado(a), inscrito(a) na ${c("oab_responsavel")}, com endereço profissional em ${c("escritorio_endereco")}, telefone/WhatsApp ${c("escritorio_telefone")}, e-mail ${c("escritorio_email")}`;

const OUTORGADOS = `Dr(a). <strong>${c("advogado_responsavel")}</strong>, ${c("oab_responsavel")}, com endereço profissional em ${c("escritorio_endereco")}, telefone ${c("escritorio_telefone")}`;

const PODERES = `
<p ${J}>O <strong>objeto</strong> desta procuração é representar o(a) outorgante em todos os atos processuais ou administrativos, perante qualquer juiz, tribunal ou repartição pública.</p>${VAZIO}
<p ${J}>Para tanto, confere-se <strong>todos os poderes</strong> da cláusula “ad judicia” bem como aqueles contidos no foro em geral, necessários e permitidos em direito para o bom e fiel cumprimento deste mandato, em especial os de representar o(a) outorgante, judicial ou extrajudicialmente, podendo ainda: contestar, agravar, acordar, conciliar, desistir da ação, receber e dar quitação, transigir, pedir indébito ou indenização, recorrer, impetrar mandados de segurança, requerer e/ou impugnar avaliações ou perícias, requerer medidas cautelares e prestação de contas, assim como responder ou ingressar com quaisquer ações relativas ao objeto desta procuração, requerer documentos e cadastrar senha junto ao INSS, podendo ainda substabelecer no todo ou em parte, com ou sem reservas de poderes.</p>${VAZIO}
<p ${J}><span style="font-size: 10pt"><strong>PODERES ESPECÍFICOS:</strong> A presente procuração outorga aos advogados acima descritos os poderes para, em nome do(a) outorgante, receber citação e intimações, confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber valores, dar quitação, firmar compromisso, acordo, pedir a justiça gratuita e assinar declaração de hipossuficiência econômica, conforme dispõe o art. 105 do Código de Processo Civil, bem como declarar e requerer isenção de imposto de renda, praticar quaisquer atos necessários à plena defesa dos interesses do(a) outorgante perante a Autarquia Previdenciária, bem como solicitar pagamentos não recebidos perante o INSS.</span></p>${VAZIO}`;

export const MODELOS_PRONTOS: ModeloPronto[] = [
  {
    id: "contrato-honorarios",
    nome: "Contrato de Honorários",
    categoria: "Contrato",
    descricao: "Contrato de prestação de serviços advocatícios (administrativo/judicial), com cláusula de renúncia à impenhorabilidade.",
    pagina: {
      fonte: "Courier New", tamanho: 12, espacamento: 1.15,
      margens: { topo: 35, direita: 20, base: 38, esquerda: 30 },
    },
    html: `
<p ${C}><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS</strong></p>${VAZIO}
<p ${JR}>Pelo presente instrumento particular de contrato de prestação de serviço de advocacia, de um lado, na qualidade de <strong>CONTRATANTE</strong>: ${c("qualificacao")}; e, de outro lado, na qualidade de <strong>CONTRATADO</strong>, ${CONTRATADA}, doravante denominado CONTRATADO, firmam o presente contrato, sob as cláusulas e condições seguintes:</p>${VAZIO}
<p ${J}><strong><u>CLÁUSULA PRIMEIRA</u></strong>: Mediante outorga de instrumento procuratório ou assinatura do presente contrato por parte do CONTRATANTE ao CONTRATADO, compromete-se o segundo, por si ou através de quaisquer dos causídicos enumerados no instrumento procuratório ou por ele substabelecido com reservas, a intentar ação própria ou proceder administrativamente para obter seus direitos.</p>${VAZIO}
<p ${J}><strong><u>PARÁGRAFO PRIMEIRO</u></strong>: O termo inicial do presente contrato é o de sua assinatura, e seu termo final quando do último ato de defesa que resolver, definitivamente, a última demanda, judicial ou administrativa, ainda em curso.</p>${VAZIO}
<p ${J}><strong><u>PARÁGRAFO SEGUNDO</u></strong>: Na hipótese de revogação do presente mandato sem culpa do CONTRATADO ou circunstância não determinada pelo mesmo que impossibilite o seu prosseguimento na demanda, o total dos honorários poderá ser exigido imediatamente e, se já fora pago, não será devolvido.</p>${VAZIO}
<p ${J}><strong><u>CLÁUSULA SEGUNDA – DA REMUNERAÇÃO</u></strong></p>
<p ${J}>Pelos serviços profissionais prestados no âmbito ________________ (administrativo/judicial), consistentes na análise documental, protocolo e acompanhamento do pedido de ______________________________________, pagará o(a) CONTRATANTE ao CONTRATADO:</p>${VAZIO}
<p ${J}>– No processo administrativo: o valor de R$ ______________ (__________________________________), a ser pago/descontado conforme definido entre as partes.</p>${VAZIO}
<p ${J}>– No processo judicial: o valor de R$ ______________ (__________________________________), equivalente a ______% (______________ por cento) sobre o proveito econômico obtido, entendido este como o valor total recebido a título de benefício, inclusive os valores atrasados pagos administrativa ou judicialmente, não podendo, em nenhuma hipótese, ser inferior ao percentual estabelecido para a via administrativa.</p>${VAZIO}
<p ${J}><strong>PARÁGRAFO ÚNICO</strong>: O pagamento dos honorários previstos nesta cláusula será efetuado no momento do recebimento dos valores pelo(a) CONTRATANTE, seja por acordo, pagamento administrativo, cumprimento de sentença ou execução.</p>${VAZIO}
<p ${J}><strong><u>CLÁUSULA TERCEIRA – DO NEGÓCIO JURÍDICO PROCESSUAL E DA RENÚNCIA À IMPENHORABILIDADE</u></strong></p>
<p ${J}>As partes, com base no <strong>artigo 190 do Código de Processo Civil</strong>, celebram o presente <strong>negócio jurídico processual</strong>, dispondo expressamente sobre ônus, poderes, faculdades e deveres no processo, inclusive no que diz respeito à execução dos honorários contratados.</p>${VAZIO}
<p ${J}>O CONTRATANTE <strong>renuncia expressamente</strong>, de forma consciente, livre e informada, ao <strong>benefício da impenhorabilidade</strong> previsto no artigo 833, inciso IV, do Código de Processo Civil, <strong>autorizando a penhora de valores recebidos a título de salário, vencimento, soldo, subsídios, proventos de aposentadoria, benefícios assistenciais</strong>, <strong>pensões</strong>, até o limite de <strong>30% (trinta por cento)</strong> dos montantes mensais percebidos, exclusivamente para garantir o pagamento dos honorários advocatícios ora contratados.</p>${VAZIO}
<p ${J}>O CONTRATANTE <strong>autoriza também expressamente a realização de medida cautelar de arresto ou bloqueio judicial (via Bacenjud/Sisbajud ou outro meio eletrônico equivalente)</strong>, até o limite de 30% dos proventos que estiver percebendo, como forma de garantia da efetividade do crédito alimentar do CONTRATADO, nos termos do artigo 301 do CPC.</p>${VAZIO}
<p ${J}>A presente cláusula tem por fundamento:</p>
<ul>
<li><p ${J}>o art. 833, §2º, do CPC, que afasta a impenhorabilidade quando se trata de crédito de natureza alimentar, inclusive <strong>honorários advocatícios</strong>;</p></li>
<li><p ${J}>o <strong>princípio da função social do contrato</strong> (art. 421 do Código Civil);</p></li>
<li><p ${J}>e o entendimento do <strong>Superior Tribunal de Justiça</strong>, que admite a relativização da impenhorabilidade de salário e benefícios para garantir <strong>prestação de natureza alimentar, como os honorários advocatícios</strong> (REsp 1.813.684/SP, REsp 1.679.909/SP, entre outros).</p></li>
</ul>${VAZIO}
<p ${J}>Esta cláusula representa manifestação inequívoca da vontade do CONTRATANTE, com plena ciência de seus efeitos jurídicos, autorizando o CONTRATADO a apresentar este contrato como instrumento hábil para instrução de eventuais pedidos de arresto, penhora, bloqueio ou cumprimento forçado, na forma da lei.</p>${VAZIO}
<p ${J}><strong><u>CLÁUSULA QUARTA</u></strong>: O CONTRATADO se obriga a acompanhar a demanda com zelo e dedicação, empenhando-se, com afinco, na defesa dos interesses do CONTRATANTE, além de, quando solicitado, relatar o andamento da ação realizada.</p>${VAZIO}
<p ${J}><strong><u>CLÁUSULA QUINTA</u></strong>: Obriga-se, ainda, o CONTRATANTE a suprir todas as despesas necessárias ao andamento do processo, tais como despesas decorrentes do deslocamento do profissional encarregado da causa, da sede do escritório para quaisquer outras, dentro e fora do Município ou do Estado, tais como passagens, hotel, táxi, adiantando os valores ao CONTRATADO, ou, no caso deste excepcionalmente arcar com quaisquer despesas dessa ordem, o CONTRATANTE o reembolsará tão logo sejam apresentados os respectivos comprovantes.</p>${VAZIO}
<p ${J}><strong><u>CLÁUSULA SEXTA</u></strong>: O CONTRATANTE se obriga a providenciar todos os documentos solicitados pelo CONTRATADO, ressalvando-se aqueles que este se comprometer a providenciar.</p>${VAZIO}
<p ${J}><strong>§ 1º.</strong> Os documentos necessários ao ajuizamento ou à apresentação de defesa que estiverem a cargo do CONTRATANTE e cujo atraso ou não entrega cause a prescrição ou decadência da ação, ou ainda impliquem em revelia ou preclusão, isentam o contratado de qualquer infração ética ou ressarcimento por danos no desempenho profissional.</p>${VAZIO}
<p ${J}><strong><u>CLÁUSULA SÉTIMA</u></strong>: O presente contrato terá vigência condicionada ao término da ação judicial citada na cláusula segunda.</p>${VAZIO}
<p ${J}><strong><u>CLÁUSULA OITAVA</u></strong>: A presente contratação é de meio, isto é, assunção por parte do CONTRATADO de obrigação em zelar pelo cumprimento do pactuado, mas não se obrigando a garantir resultado eventualmente esperado pelo CONTRATANTE, cuja não obtenção não implicará em qualquer infração ética ou indenização.</p>${VAZIO}
<p ${J}><strong><u>CLÁUSULA NONA</u></strong>: Acaso descumpra o CONTRATANTE as obrigações assumidas neste termo de contrato, poderá o CONTRATADO, na forma prevista no art. 784, III, da Lei Instrumental Civil e no art. 24, § 1º, da Lei nº 8.906, de 04 de julho de 1994, imediatamente, após ocorrida a condição, executar o contrato, com juros e correção monetária.</p>${VAZIO}
<p ${J}><strong><u>CLÁUSULA DÉCIMA</u></strong>: Elegem as partes, para dirimir quaisquer questões oriundas do presente contrato, o Foro da Comarca de ${c("escritorio_cidade")}, renunciando a qualquer outro, por mais privilegiado que seja.</p>${VAZIO}
<p ${J}>E por estarem justos e contratados, assinam o presente instrumento, em duas vias de igual teor e forma e para um só fim, na presença de duas testemunhas, que a tudo assistiram e que também o assinam.</p>${VAZIO}
<p style="text-align: right">${c("escritorio_cidade")}, ${c("data_extenso")}.</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("assinante_nome")}</strong></p>
<p ${C}>Contratante</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("advogado_responsavel")}</strong> – ${c("oab_responsavel")}</p>
<p ${C}>Contratado</p>${VAZIO}${VAZIO}
<p><strong>Testemunhas:</strong></p>${VAZIO}${VAZIO}
<p>01. ${LINHA}</p>
<p>CPF: ____________________</p>${VAZIO}${VAZIO}
<p>02. ${LINHA}</p>
<p>CPF: ____________________</p>`,
  },

  {
    id: "declaracao-hipossuficiencia",
    nome: "Declaração de Hipossuficiência",
    categoria: "Declaração",
    descricao: "Declaração de hipossuficiência econômica para a justiça gratuita (art. 98 do CPC).",
    pagina: {
      fonte: "Courier New", tamanho: 12, espacamento: 1.5,
      margens: { topo: 40, direita: 30, base: 38, esquerda: 30 },
    },
    html: `
<p ${C}><strong>DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA</strong></p>${VAZIO}${VAZIO}
<p ${JR}>Eu, ${c("qualificacao")}, DECLARO, para os devidos fins de direito, especialmente para obtenção dos benefícios da Justiça Gratuita, nos termos do art. 98 do Código de Processo Civil e art. 5º, inciso LXXIV, da Constituição Federal, que não possuo condições financeiras de arcar com as custas processuais, despesas processuais e honorários advocatícios sem prejuízo do meu próprio sustento e de minha família.</p>
<p ${JR}>Declaro, ainda, serem verdadeiras as informações aqui prestadas, estando ciente das sanções civis, administrativas e penais aplicáveis em caso de falsidade da presente declaração.</p>
<p ${JR}>Por ser verdade, firmo a presente.</p>${VAZIO}
<p style="text-align: right"><strong>${c("escritorio_cidade")}, ${c("data_extenso")}.</strong></p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("assinante_nome")}</strong></p>
<p ${C}>CPF nº ${c("assinante_cpf")}</p>`,
  },

  {
    id: "procuracao-a-rogo",
    nome: "Procuração a Rogo",
    categoria: "Procuração",
    descricao: "Procuração ad judicia et extra assinada a rogo (outorgante que não sabe assinar), com testemunhas.",
    pagina: {
      fonte: "Courier New", tamanho: 12, espacamento: 1.15,
      margens: { topo: 40, direita: 17.5, base: 38, esquerda: 17.5 },
    },
    html: `
<p ${C}><strong>PROCURAÇÃO AD JUDICIA ET EXTRA</strong></p>${VAZIO}
<p ${J}><strong>OUTORGANTE:</strong> ${c("qualificacao")}.</p>${VAZIO}
<p ${J}><strong>OUTORGADOS:</strong> ${OUTORGADOS}.</p>${VAZIO}
${PODERES}
<p style="text-align: right">${c("cidade")}/${c("uf")}, ${c("data_extenso")}.</p>${VAZIO}
<p ${J}>A rogo de <strong>${c("assinante_nome")}</strong>, por não saber assinar, assina o(a) rogado(a) <strong>${c("rogado_nome")}</strong>, RG nº ${c("rogado_rg")} e CPF nº ${c("rogado_cpf")}, residente em ${c("rogado_endereco")}.</p>${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("rogado_nome")}</strong></p>
<p ${C}>Rogado(a)</p>${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}>A rogo de <strong>${c("assinante_nome")}</strong></p>${VAZIO}${VAZIO}
<p><strong>TESTEMUNHAS:</strong></p>${VAZIO}
<p ${J}><strong>NOME</strong>: _________________________________, RG nº __________________, CPF nº _________________, residente e domiciliado(a) na rua ______________________________, município de ________________/___, CEP ______________</p>${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}>(testemunha 1)</p>${VAZIO}
<p ${J}><strong>NOME</strong>: _________________________________, RG nº __________________, CPF nº _________________, residente e domiciliado(a) na rua ______________________________, município de ________________/___, CEP ______________</p>${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}>(testemunha 2)</p>`,
  },

  {
    id: "procuracao-ad-judicia",
    nome: "Procuração Ad Judicia et Extra",
    categoria: "Procuração",
    descricao: "Mesma procuração do escritório, assinada pelo(a) próprio(a) outorgante.",
    pagina: {
      fonte: "Courier New", tamanho: 12, espacamento: 1.15,
      margens: { topo: 40, direita: 17.5, base: 38, esquerda: 17.5 },
    },
    html: `
<p ${C}><strong>PROCURAÇÃO AD JUDICIA ET EXTRA</strong></p>${VAZIO}
<p ${J}><strong>OUTORGANTE:</strong> ${c("qualificacao")}.</p>${VAZIO}
<p ${J}><strong>OUTORGADOS:</strong> ${OUTORGADOS}.</p>${VAZIO}
${PODERES}
<p style="text-align: right">${c("cidade")}/${c("uf")}, ${c("data_extenso")}.</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("assinante_nome")}</strong></p>
<p ${C}>CPF nº ${c("assinante_cpf")}</p>`,
  },

  {
    id: "contrato-honorarios-criminal",
    nome: "Contrato de Honorários — Área Criminal",
    categoria: "Contrato",
    descricao: "Prestação de serviços advocatícios na área criminal, com delimitação da atuação e honorários fixos.",
    pagina: {
      fonte: "Courier New", tamanho: 12, espacamento: 1.15,
      margens: { topo: 35, direita: 20, base: 38, esquerda: 30 },
    },
    html: `
<p ${C}><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS<br>E HONORÁRIOS CONTRATUAIS – ÁREA CRIMINAL</strong></p>${VAZIO}
<p ${J}><strong>CONTRATADA:</strong> ${CONTRATADA_CONTRATO}, doravante denominada <strong>CONTRATADA</strong>.</p>${VAZIO}
<p ${J}><strong>CONTRATANTE:</strong> ${c("qualificacao")}, telefone ${c("telefone")}, e-mail ${c("email")}.</p>${VAZIO}
<p ${J}><strong>ASSISTIDO(A)/INVESTIGADO(A)/ACUSADO(A), SE DIFERENTE DO CONTRATANTE:</strong> ____________________________________________; CPF: ___________________; vínculo com o contratante: ___________________.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 01 – DO OBJETO</strong></p>
<p ${J}>O(A) CONTRATANTE contrata a CONTRATADA para acompanhar o processo criminal de natureza/tipo: ______________________________________, processo/inquérito nº ${c("processo_numero")}, perante ${c("processo_vara")}, em favor do(a) assistido(a) acima identificado(a). O objeto compreende orientação jurídica e defesa técnica, nos limites expressamente definidos neste instrumento.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 02 – DA DELIMITAÇÃO DA ATUAÇÃO</strong></p>
<p ${J}>Estão incluídos, na fase e instância contratadas: análise dos autos e documentos, reuniões necessárias, petições e manifestações ordinárias, acompanhamento de atos processuais, audiências e diligências judiciais pertinentes, até a sentença em primeiro grau, salvo ajuste escrito diverso. Atuação em inquérito policial, audiência de custódia, habeas corpus, medidas cautelares autônomas, Tribunal do Júri (inclusive sessão plenária), recursos, tribunais superiores, execução penal, revisão criminal, incidentes extraordinários e processos conexos depende de ajuste específico escrito, salvo se expressamente incluída no campo seguinte: ______________________________________________.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 03 – DOS HONORÁRIOS CONTRATUAIS</strong></p>
<p ${J}>Pelos serviços delimitados, o(a) CONTRATANTE pagará honorários fixos de R$ __________________ (____________________________________ reais), independentemente do resultado do processo. Entrada de R$ __________________, vencível em ____/____/______, e saldo em ______ parcelas de R$ __________________, com vencimento todo dia ______ de cada mês, iniciando em ____/____/______. Forma de pagamento: ______________________________. Os valores devem respeitar a tabela aplicável da OAB e a legislação e ética profissionais.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 04 – DA EXIGIBILIDADE E DOS ATRASOS</strong></p>
<p ${J}>O atraso de parcela poderá acarretar correção monetária pelo IPCA, juros moratórios de 1% ao mês, calculados proporcionalmente, e multa de 2% sobre a parcela vencida, observada a legislação aplicável. Eventual cobrança será realizada pelos meios legalmente admitidos, preservados o sigilo profissional, a dignidade do assistido e a vedação ao abandono da causa.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 05 – DA NATUREZA DA OBRIGAÇÃO E DOS RISCOS</strong></p>
<p ${J}>A advocacia constitui obrigação de meio, não havendo promessa de absolvição, arquivamento, liberdade, revogação de cautelares, redução de pena ou qualquer resultado específico. Decisões competem às autoridades competentes; a atuação será pautada por independência técnica, zelo, diligência e ética.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 06 – DAS DESPESAS EXTRAORDINÁRIAS</strong></p>
<p ${J}>Custas, taxas, certidões, cópias, autenticações, deslocamentos intermunicipais, hospedagem, alimentação em viagem, assistentes técnicos, pareceres e outras despesas extraordinárias não estão incluídos nos honorários, salvo acordo escrito. Serão previamente informados quando possível, com prestação de contas dos adiantamentos e comprovantes pertinentes.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 07 – DOS DEVERES DO CONTRATANTE E DO ASSISTIDO</strong></p>
<p ${J}>Fornecer informações verdadeiras e completas, documentos, contatos atualizados, comunicar intimações e alterações de endereço, comparecer aos atos quando exigido, cumprir determinações judiciais e colaborar com a defesa. A omissão ou atraso de informações poderá prejudicar a estratégia, sem atribuição automática de responsabilidade à CONTRATADA.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 08 – DA COMUNICAÇÃO E DAS DECISÕES DEFENSIVAS</strong></p>
<p ${J}>A CONTRATADA informará os acontecimentos relevantes pelos contatos indicados. A estratégia técnico-jurídica compete ao(à) advogado(a), assegurada a participação do assistido nas decisões que dependam de sua vontade ou consentimento, especialmente acordos penais, confissão, colaboração, aceitação de condições e renúncia a direitos, observadas as exigências legais.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 09 – DO SIGILO PROFISSIONAL E DA PROTEÇÃO DE DADOS</strong></p>
<p ${J}>As informações recebidas serão tratadas sob sigilo profissional, inclusive após o término da contratação, ressalvadas hipóteses legais. Dados pessoais e sensíveis serão utilizados na medida necessária à prestação dos serviços, ao exercício regular de direitos e ao cumprimento de obrigações legais, nos termos da LGPD.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 10 – DA ATUAÇÃO POR SUBSTABELECIMENTO</strong></p>
<p ${J}>A CONTRATADA poderá atuar com advogados associados, correspondentes ou substabelecidos, respeitados os deveres profissionais e a necessidade de ciência do cliente quando cabível. A contratação de profissional externo com custo adicional dependerá de ajuste prévio.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 11 – DOS ACORDOS E NEGOCIAÇÕES</strong></p>
<p ${J}>Eventual proposta de acordo de não persecução penal, transação penal, suspensão condicional do processo, colaboração ou outra solução consensual será examinada com o assistido, observados seus requisitos legais. A contratação não assegura oferta, aceitação ou homologação de qualquer medida, nem autoriza o(a) advogado(a) a decidir unilateralmente por ato que dependa de consentimento pessoal.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 12 – DA REVOGAÇÃO, RENÚNCIA E RESCISÃO</strong></p>
<p ${J}>O(A) CONTRATANTE poderá revogar o mandato, e a CONTRATADA poderá renunciar na forma legal, mediante comunicação e observância do prazo de responsabilidade profissional previsto na legislação, sem abandono da defesa. Na extinção antecipada, serão devidos os honorários proporcionais aos serviços efetivamente prestados, considerando complexidade, tempo, fase processual e tabela profissional, com acerto dos valores pagos, vedado enriquecimento sem causa. Eventual divergência será resolvida pelos meios adequados.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 13 – DA INADIMPLÊNCIA E CONTINUIDADE DA DEFESA</strong></p>
<p ${J}>A inadimplência não autoriza abandono imediato do processo nem retenção indevida de documentos indispensáveis. Se necessário, a CONTRATADA poderá promover renúncia regular ao mandato, preservando os prazos e deveres legais, além de cobrar valores efetivamente devidos.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 14 – DA PRESTAÇÃO DE CONTAS E DOS DOCUMENTOS</strong></p>
<p ${J}>A CONTRATADA prestará contas de quantias eventualmente recebidas em nome do(a) CONTRATANTE, quando autorizadas, e restituirá documentos originais mediante recibo, preservando cópias necessárias nos limites legais. Valores de fiança, restituição ou indenização não integram automaticamente os honorários e dependerão de ajuste expresso.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 15 – DAS INTIMAÇÕES E DA PROCURAÇÃO</strong></p>
<p ${J}>A atuação processual pressupõe a outorga de procuração com poderes adequados e demais documentos necessários, ressalvadas hipóteses legais de atuação urgente. Este contrato não substitui a procuração judicial e não confere, por si só, poderes especiais.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 16 – DA VIGÊNCIA E DOS SERVIÇOS ADICIONAIS</strong></p>
<p ${J}>O contrato vigora a partir da assinatura e se encerra com a conclusão da fase expressamente contratada ou por extinção regular da relação profissional. Serviços supervenientes, novas imputações, novos procedimentos, deslocamentos extraordinários e mudança relevante de escopo serão objeto de aditivo escrito, com honorários próprios.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 17 – DO TÍTULO EXECUTIVO E DA SOLUÇÃO DE CONTROVÉRSIAS</strong></p>
<p ${J}>Este contrato escrito constitui título executivo na forma do art. 24 da Lei nº 8.906/1994, respeitados os requisitos legais. As partes buscarão solução consensual para divergências, sem prejuízo do acesso ao Poder Judiciário e das regras legais de competência.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA 18 – DO FORO</strong></p>
<p ${J}>Fica eleito o foro da Comarca de ${c("escritorio_cidade")} para controvérsias contratuais, desde que juridicamente admissível, ressalvadas as normas de competência absoluta e de proteção aplicáveis.</p>${VAZIO}
<p ${J}>E, por estarem de acordo, assinam o presente instrumento em duas vias de igual teor, podendo a assinatura ocorrer também por meio eletrônico válido.</p>${VAZIO}
<p ${C}>${c("escritorio_cidade")}, ${c("data_extenso")}.</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("advogado_responsavel")}</strong> – ${c("oab_responsavel")}</p>
<p ${C}>CONTRATADA</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("assinante_nome")}</strong></p>
<p ${C}>CONTRATANTE</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}>ASSISTIDO(A), se diferente do(a) contratante (ciência)</p>`,
  },

  {
    id: "contrato-honorarios-civel",
    nome: "Contrato de Honorários — Área Cível",
    categoria: "Contrato",
    descricao: "Prestação de serviços advocatícios na área cível (inclusive família), com honorários fixos e/ou de êxito.",
    pagina: {
      fonte: "Courier New", tamanho: 12, espacamento: 1.15,
      margens: { topo: 35, direita: 20, base: 38, esquerda: 30 },
    },
    html: `
<p ${C}><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS<br>E HONORÁRIOS – ÁREA CÍVEL</strong></p>${VAZIO}
<p ${J}><strong>CONTRATANTE:</strong> ${c("qualificacao")}, telefone ${c("telefone")}, e-mail ${c("email")}.</p>${VAZIO}
<p ${J}><strong>CONTRATADA:</strong> ${CONTRATADA_CONTRATO}.</p>${VAZIO}
<p ${J}>As partes celebram o presente contrato, observados o Estatuto da Advocacia, o Código de Ética e Disciplina da OAB e as disposições legais aplicáveis.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA PRIMEIRA – OBJETO</strong></p>
<p ${J}>A CONTRATANTE contrata a CONTRATADA para orientação, propositura e/ou acompanhamento de demanda judicial na área CÍVEL, inclusive de família, conforme identificação: natureza da ação ___________________________; parte adversa ${c("parte_contraria")}; processo nº ${c("processo_numero")} (se existente); comarca/juízo ${c("processo_vara")}. O objeto limita-se à demanda e à fase expressamente indicadas neste instrumento.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA SEGUNDA – EXTENSÃO DOS SERVIÇOS</strong></p>
<p ${J}>A atuação compreende análise documental, elaboração de peças, acompanhamento de atos ordinários, manifestações e audiências pertinentes à fase contratada, até ___________________________. Recursos, cumprimento de sentença, execução, incidentes autônomos, reconvenção, ações conexas, atuação em outros tribunais ou medidas extrajudiciais independentes dependerão de ajuste escrito específico, salvo inclusão expressa neste contrato.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA TERCEIRA – NATUREZA DA OBRIGAÇÃO</strong></p>
<p ${J}>A prestação advocatícia constitui obrigação de meio, com atuação técnica diligente e independente, sem promessa de resultado, prazo de tramitação, êxito ou valor de condenação.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA QUARTA – HONORÁRIOS CONTRATUAIS</strong></p>
<p ${J}>Pelos serviços contratados, serão devidos honorários de R$ __________________ (__________________________________), pagos da seguinte forma: ________________________________________. Quando expressamente pactuados honorários de êxito, corresponderão a ______% do proveito econômico efetivamente obtido, com critério de cálculo: ________________________________________. Na ausência de preenchimento e assinatura da condição de êxito, não se presume percentual. Eventual composição deverá observar a tabela vigente da OAB e os parâmetros éticos aplicáveis.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA QUINTA – PROVEITO ECONÔMICO E ACORDOS</strong></p>
<p ${J}>Se houver honorários percentuais expressamente ajustados, o proveito econômico abrangerá valores efetivamente recebidos e vantagens patrimoniais economicamente mensuráveis relacionadas ao objeto, conforme critério da cláusula quarta. Acordos judiciais ou extrajudiciais relativos ao objeto não afastam os honorários ajustados; a incidência sobre prestações futuras, bens ou obrigações não pecuniárias exige estipulação expressa e mensurável.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA SEXTA – SUCUMBÊNCIA</strong></p>
<p ${J}>Os honorários sucumbenciais fixados judicialmente pertencem ao(à) advogado(a), nos termos da legislação aplicável, e não se confundem com os honorários contratuais, ressalvadas disposições legais e pactos válidos.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA SÉTIMA – CUSTAS E DESPESAS</strong></p>
<p ${J}>Custas, emolumentos, taxas, diligências, deslocamentos, hospedagem, cópias, autenticações, certidões, honorários periciais e despesas de terceiros são de responsabilidade da CONTRATANTE, mediante informação e comprovação, salvo convenção expressa diversa. A concessão de gratuidade da justiça não garante isenção de toda obrigação em qualquer circunstância.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA OITAVA – DEVERES DA CONTRATANTE</strong></p>
<p ${J}>Compete à CONTRATANTE fornecer documentos e informações verdadeiras, informar alterações de endereço e contatos, comparecer aos atos convocados, respeitar prazos de entrega documental, comunicar intimações recebidas e efetuar os pagamentos pactuados. A omissão ou inexatidão de informações poderá comprometer a estratégia e o resultado.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA NONA – DEVERES DA CONTRATADA</strong></p>
<p ${J}>Compete à CONTRATADA atuar com zelo, sigilo, boa-fé, independência técnica, prestar informações razoáveis sobre os atos relevantes e comunicar riscos processuais conhecidos, respeitados os deveres profissionais e os limites do mandato.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA – ACORDOS E DECISÕES</strong></p>
<p ${J}>Nenhum acordo que implique disposição de direitos será firmado sem autorização da CONTRATANTE. A CONTRATADA poderá recomendar conciliação, mediação ou solução negociada, cabendo à CONTRATANTE decidir sobre sua aceitação, após esclarecimento de riscos e consequências.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA PRIMEIRA – RECEBIMENTO DE VALORES</strong></p>
<p ${J}>Valores devidos à CONTRATANTE serão recebidos preferencialmente em conta de sua titularidade ou por levantamento autorizado. Havendo poderes específicos e autorização legal, a CONTRATADA poderá requerer destaque/reserva de honorários contratuais, prestar contas e repassar o saldo devido, com demonstrativo discriminado.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA SEGUNDA – ATRASO NO PAGAMENTO</strong></p>
<p ${J}>O inadimplemento de parcelas vencidas sujeitará a CONTRATANTE, após comunicação, à correção monetária pelo IPCA e juros moratórios de 1% ao mês, calculados proporcionalmente, observados os limites legais aplicáveis. Medidas de cobrança deverão preservar o sigilo profissional e a dignidade da relação contratual.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA TERCEIRA – REVOGAÇÃO, RENÚNCIA E RESCISÃO</strong></p>
<p ${J}>A CONTRATANTE poderá revogar o mandato e a CONTRATADA poderá renunciar na forma legal, resguardados os deveres de comunicação e continuidade pelo prazo legal quando cabível. Em caso de encerramento antecipado, serão devidos honorários proporcionais ao trabalho efetivamente realizado, considerados a complexidade, as etapas cumpridas e o ajuste firmado, sem multa que inviabilize o direito de substituição de patrono.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA QUARTA – SUBSTABELECIMENTO E COLABORAÇÃO</strong></p>
<p ${J}>A CONTRATADA poderá atuar em conjunto com outros profissionais e substabelecer poderes, respeitadas as regras éticas, o instrumento de mandato e a ciência ou autorização da CONTRATANTE quando exigível. A contratação de profissionais externos que gere despesa adicional será previamente informada.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA QUINTA – COMUNICAÇÕES E DADOS PESSOAIS</strong></p>
<p ${J}>As partes poderão comunicar-se pelos contatos informados, inclusive meios eletrônicos, comprometendo-se a atualizar seus dados. Os dados pessoais e documentos serão tratados para execução do contrato, exercício regular de direitos e cumprimento de obrigações legais, com medidas adequadas de confidencialidade e segurança, nos termos da LGPD.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA SEXTA – DOCUMENTOS E PRESTAÇÃO DE CONTAS</strong></p>
<p ${J}>Os documentos originais entregues serão devolvidos mediante solicitação e recibo, ressalvadas necessidades legais de guarda. A CONTRATADA prestará contas de valores administrados em nome da CONTRATANTE, com identificação de recebimentos, despesas e repasses.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA SÉTIMA – LIMITES DA REPRESENTAÇÃO</strong></p>
<p ${J}>Este contrato não substitui procuração judicial e não autoriza, por si só, atos que dependam de poderes especiais. Demandas de outros familiares, herdeiros, litisconsortes ou terceiros não estão incluídas sem contratação própria.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA OITAVA – TÍTULO EXECUTIVO E SOLUÇÃO DE CONTROVÉRSIAS</strong></p>
<p ${J}>O presente instrumento escrito constitui contrato de honorários advocatícios, com a eficácia executiva prevista em lei, observados os requisitos de exigibilidade. As partes buscarão inicialmente solução consensual; eventual controvérsia será submetida ao juízo competente, respeitadas as regras legais de competência e proteção do consumidor, quando aplicáveis.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA NONA – DISPOSIÇÕES FINAIS</strong></p>
<p ${J}>Alterações de objeto, honorários ou forma de pagamento deverão constar de aditivo escrito. A eventual invalidade de disposição não prejudicará as demais. A CONTRATANTE declara ter recebido oportunidade de leitura e esclarecimento das cláusulas, inclusive sobre custos, riscos e delimitação dos serviços.</p>${VAZIO}
<p ${J}>E, por estarem de acordo, firmam o presente instrumento em duas vias de igual teor.</p>${VAZIO}
<p style="text-align: right">${c("escritorio_cidade")}, ${c("data_extenso")}.</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("assinante_nome")}</strong></p>
<p ${C}>CONTRATANTE</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("advogado_responsavel")}</strong> – ${c("oab_responsavel")}</p>
<p ${C}>CONTRATADA</p>${VAZIO}${VAZIO}
<p>Testemunha 1: __________________________ CPF: __________________</p>${VAZIO}
<p>Testemunha 2: __________________________ CPF: __________________</p>`,
  },

  {
    id: "declaracao-residencia",
    nome: "Declaração de Residência",
    categoria: "Declaração",
    descricao: "Declaração de residência e domicílio, sob as penas da lei (art. 299 do Código Penal).",
    pagina: {
      fonte: "Courier New", tamanho: 12, espacamento: 1.5,
      margens: { topo: 40, direita: 30, base: 38, esquerda: 30 },
    },
    html: `
<p ${C}><strong>DECLARAÇÃO DE RESIDÊNCIA</strong></p>${VAZIO}${VAZIO}
<p ${JR}>Eu, <strong>${c("nome_maiusculo")}</strong>, nacionalidade ${c("nacionalidade")}, estado civil ${c("estado_civil")}, profissão ${c("profissao")}, portador(a) do RG nº ${c("rg")}, inscrito(a) no CPF sob o nº ${c("cpf")}, DECLARO, para os devidos fins de direito, especialmente para apresentação perante órgãos públicos, administrativos e judiciais, que resido e sou domiciliado(a) no endereço abaixo indicado:</p>${VAZIO}
<p><strong>Logradouro (Rua/Avenida):</strong> ${c("rua")}</p>
<p><strong>Número:</strong> ${c("numero")} &nbsp;&nbsp; <strong>Complemento:</strong> ${c("complemento")}</p>
<p><strong>Bairro:</strong> ${c("bairro")}</p>
<p><strong>Cidade:</strong> ${c("cidade")} &nbsp;&nbsp; <strong>Estado:</strong> ${c("uf")}</p>
<p><strong>CEP:</strong> ${c("cep")}</p>${VAZIO}
<p ${JR}>Declaro, sob as penas da lei, que as informações acima prestadas são verdadeiras, estando ciente de que a prestação de declaração falsa poderá acarretar responsabilização civil, administrativa e criminal, especialmente nos termos do artigo 299 do Código Penal Brasileiro.</p>
<p ${JR}>Por ser expressão da verdade, firmo a presente declaração para que produza seus devidos efeitos legais.</p>${VAZIO}
<p style="text-align: right">${c("cidade")}/${c("uf")}, ${c("data_extenso")}.</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("assinante_nome")}</strong></p>
<p ${C}>ASSINATURA DO(A) DECLARANTE</p>
<p ${C}>CPF nº ${c("assinante_cpf")}</p>`,
  },

  {
    id: "contrato-honorarios-trabalhista",
    nome: "Contrato de Honorários — Área Trabalhista",
    categoria: "Contrato",
    descricao: "Reclamação trabalhista com reconhecimento de vínculo; honorários de 30% do proveito econômico.",
    pagina: {
      fonte: "Courier New", tamanho: 12, espacamento: 1.15,
      margens: { topo: 35, direita: 20, base: 38, esquerda: 30 },
    },
    html: `
<p ${C}><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS<br>E HONORÁRIOS CONTRATUAIS – ÁREA TRABALHISTA</strong></p>${VAZIO}
<p ${J}><strong>CONTRATADA:</strong> ${CONTRATADA_CONTRATO}, doravante denominada <strong>CONTRATADA</strong>.</p>${VAZIO}
<p ${J}><strong>CONTRATANTE:</strong> ${c("qualificacao")}, telefone/WhatsApp ${c("telefone")}, e-mail ${c("email")}, doravante denominado(a) <strong>CONTRATANTE</strong>.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA PRIMEIRA – DO OBJETO</strong></p>
<p ${J}>A CONTRATANTE contrata os serviços profissionais da CONTRATADA para análise, preparação, ajuizamento e acompanhamento de RECLAMAÇÃO TRABALHISTA COM PEDIDO DE RECONHECIMENTO DE VÍNCULO EMPREGATÍCIO, cumulada, conforme viabilidade jurídica e provas disponíveis, com verbas trabalhistas e rescisórias, depósitos de FGTS, multas, indenizações e demais pedidos pertinentes em face de ${c("parte_contraria")}. A definição dos pedidos e valores dependerá da análise técnica do caso. Atuação em ação autônoma, recurso a tribunais superiores, ação rescisória ou demandas conexas não está incluída, salvo ajuste escrito.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA SEGUNDA – DA EXTENSÃO DOS SERVIÇOS</strong></p>
<p ${J}>A contratação abrange os atos ordinários de primeiro grau, audiências, manifestações, negociações, cumprimento ou execução da decisão no mesmo processo e recursos ordinários cabíveis na instância regional, quando tecnicamente recomendados. Deslocamentos extraordinários, perícias, diligências externas especiais e atuação perante tribunais superiores poderão exigir ajuste complementar prévio. Não há promessa ou garantia de resultado.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA TERCEIRA – DOS HONORÁRIOS CONTRATUAIS</strong></p>
<p ${J}>Pelos serviços, o(a) CONTRATANTE pagará à CONTRATADA honorários equivalentes a 30% (trinta por cento) do proveito econômico efetivamente obtido na demanda, por sentença, execução, acordo judicial ou extrajudicial relacionado ao objeto, inclusive valores pagos diretamente pela parte adversa ao(à) CONTRATANTE. A base corresponde aos créditos econômicos do(a) CONTRATANTE reconhecidos e efetivamente recebidos ou disponibilizados, antes de descontos tributários e previdenciários legalmente incidentes sobre tais créditos, excluídos os honorários sucumbenciais pertencentes ao(à) advogado(a) e os valores destinados exclusivamente a terceiros. O cálculo será demonstrado por prestação de contas.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA QUARTA – DO PAGAMENTO E DA RETENÇÃO</strong></p>
<p ${J}>Os honorários tornam-se exigíveis à medida que o proveito econômico for recebido ou disponibilizado, inclusive em parcelas de acordo. O(a) CONTRATANTE autoriza expressamente, observadas as regras legais e éticas aplicáveis, o destaque e pagamento direto dos honorários contratuais mediante juntada deste instrumento aos autos, antes da expedição de alvará ou requisição, quando cabível, bem como o recebimento e repasse dos valores mediante prestação de contas. Caso receba diretamente valores da parte contrária, comunicará à CONTRATADA em até 2 (dois) dias úteis e quitará os honorários correspondentes em até 5 (cinco) dias úteis.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA QUINTA – DOS HONORÁRIOS SUCUMBENCIAIS</strong></p>
<p ${J}>Os honorários de sucumbência eventualmente fixados judicialmente pertencem exclusivamente à CONTRATADA, nos termos do art. 23 da Lei nº 8.906/1994, e não compensam nem substituem os honorários contratuais. Eventuais honorários de sucumbência devidos à parte contrária observarão a legislação e as determinações judiciais, não sendo obrigação pessoal da CONTRATADA.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA SEXTA – DOS ACORDOS</strong></p>
<p ${J}>Toda proposta de acordo será comunicada ao(à) CONTRATANTE, a quem cabe autorizar sua aceitação. Acordos celebrados diretamente com a parte contrária, sem ciência da CONTRATADA, não afastam os honorários incidentes sobre o proveito econômico efetivamente obtido. A CONTRATADA não poderá transigir ou dar quitação sem poderes específicos e autorização do(a) CONTRATANTE.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA SÉTIMA – DAS DESPESAS</strong></p>
<p ${J}>Custas, emolumentos, honorários periciais, cópias, certidões, autenticações, deslocamentos e outras despesas necessárias, quando não cobertos por gratuidade ou pela parte adversa, são de responsabilidade do(a) CONTRATANTE, mediante comunicação e comprovação, salvo ajuste escrito em contrário. Adiantamentos serão discriminados e objeto de prestação de contas.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA OITAVA – DA JUSTIÇA GRATUITA E DOS RISCOS</strong></p>
<p ${J}>A concessão de justiça gratuita depende de decisão judicial e dos requisitos legais. O(a) CONTRATANTE declara ter sido informado(a) sobre riscos de improcedência total ou parcial, prescrição, produção de provas, condenação em custas e honorários, conforme o regime legal aplicável, bem como sobre a possibilidade de resultado inferior ao esperado.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA NONA – DAS OBRIGAÇÕES DO(A) CONTRATANTE</strong></p>
<p ${J}>Compete ao(à) CONTRATANTE fornecer documentos autênticos e informações verdadeiras, relatar integralmente os fatos, indicar testemunhas de forma lícita, atualizar contatos e endereço, comparecer às audiências e perícias, cumprir determinações judiciais e informar imediatamente qualquer pagamento, proposta, contato da parte adversa ou mudança relevante. A omissão de informações pode prejudicar a demanda.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA – DAS OBRIGAÇÕES DA CONTRATADA</strong></p>
<p ${J}>A CONTRATADA exercerá o patrocínio com zelo, independência técnica, sigilo profissional, diligência e observância dos prazos processuais, mantendo o(a) CONTRATANTE informado(a) sobre os atos relevantes. Poderá atuar com outros advogados ou substabelecer poderes, respeitados os deveres éticos e a ciência do(a) CONTRATANTE quando exigida.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA PRIMEIRA – DA REVOGAÇÃO, RENÚNCIA E RESCISÃO</strong></p>
<p ${J}>O(a) CONTRATANTE poderá revogar o mandato e a CONTRATADA poderá renunciar, observados os deveres legais e éticos. Em caso de encerramento antecipado, serão devidos honorários proporcionais ao trabalho efetivamente realizado e à relevância dos atos praticados, considerados os parâmetros da tabela da OAB aplicável e a remuneração contratada, vedada cobrança desproporcional ou duplicada. Havendo posterior proveito econômico decorrente do trabalho realizado, o valor devido será apurado proporcionalmente, mediante acordo ou arbitramento, sem exigibilidade automática dos 30% integrais.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA SEGUNDA – DA DESISTÊNCIA E INÉRCIA</strong></p>
<p ${J}>A desistência da ação, a ausência injustificada a atos processuais ou a falta de colaboração não elimina o direito à remuneração proporcional pelos serviços efetivamente prestados, conforme a cláusula anterior, sem prejuízo do ressarcimento de despesas comprovadas. Nenhuma cláusula impede o exercício do direito de desistir ou de substituir patrono.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA TERCEIRA – DA COMUNICAÇÃO E DOS DADOS</strong></p>
<p ${J}>As partes poderão comunicar-se pelos contatos informados, inclusive por meios eletrônicos. Os dados pessoais e documentos serão tratados na medida necessária à execução do contrato, ao exercício regular de direitos e ao cumprimento de obrigações legais, observada a LGPD e o sigilo profissional. O(a) CONTRATANTE deverá comunicar prontamente qualquer alteração cadastral.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA QUARTA – DA PRESTAÇÃO DE CONTAS</strong></p>
<p ${J}>Havendo recebimento de valores pela CONTRATADA, esta apresentará demonstrativo dos créditos recebidos, honorários, despesas autorizadas e saldo a repassar, com os comprovantes pertinentes, em prazo razoável. O repasse será efetuado após a efetiva disponibilidade bancária e as verificações necessárias.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA QUINTA – DA MORA</strong></p>
<p ${J}>Honorários vencidos e não pagos após comunicação escrita estarão sujeitos a correção monetária pelo IPCA desde o vencimento e juros moratórios de 1% ao mês, calculados proporcionalmente, respeitada a legislação aplicável. Eventual cobrança observará os limites legais e éticos, sem retenção abusiva de documentos ou valores.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA SEXTA – DO TÍTULO EXECUTIVO E DAS DISPOSIÇÕES FINAIS</strong></p>
<p ${J}>Este contrato escrito constitui título executivo na forma do art. 24 da Lei nº 8.906/1994, observados os requisitos de exigibilidade e liquidez. Alterações dependerão de ajuste escrito. A eventual invalidade de disposição específica não prejudica as demais. As partes declaram ter lido, compreendido e recebido oportunidade de esclarecer as condições contratuais.</p>${VAZIO}
<p ${J}><strong>CLÁUSULA DÉCIMA SÉTIMA – DO FORO</strong></p>
<p ${J}>Para controvérsias relativas a este instrumento, fica eleito o foro da Comarca de ${c("escritorio_cidade")}, ressalvadas as regras de competência absoluta e as normas legais de proteção aplicáveis ao caso concreto.</p>${VAZIO}
<p style="text-align: right">${c("escritorio_cidade")}, ${c("data_extenso")}.</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("assinante_nome")}</strong></p>
<p ${C}>CONTRATANTE</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("advogado_responsavel")}</strong> – ${c("oab_responsavel")}</p>
<p ${C}>CONTRATADA</p>${VAZIO}${VAZIO}
<p>Testemunha 1: __________________________ CPF: __________________</p>${VAZIO}
<p>Testemunha 2: __________________________ CPF: __________________</p>`,
  },

  {
    id: "procuracao-judicial",
    nome: "Procuração Judicial (advogado responsável)",
    categoria: "Procuração",
    descricao: "Procuração ad judicia tendo somente o(a) advogado(a) responsável como outorgado(a), com poderes específicos.",
    pagina: {
      fonte: "Courier New", tamanho: 12, espacamento: 1.15,
      margens: { topo: 40, direita: 19, base: 38, esquerda: 19 },
    },
    html: `
<p ${C}><strong>PROCURAÇÃO JUDICIAL</strong></p>${VAZIO}
<p ${J}><strong>OUTORGANTE:</strong> ${c("qualificacao")}.</p>${VAZIO}
<p ${J}><strong>OUTORGADO(A):</strong> Dr(a). <strong>${c("advogado_responsavel")}</strong>, ${c("oab_responsavel")}, com endereço profissional em ${c("escritorio_endereco")}, telefone ${c("escritorio_telefone")}.</p>${VAZIO}
<p ${J}>O <strong>objeto</strong> desta procuração é representar o(a) outorgante em todos os atos processuais ou administrativos, perante qualquer juiz, tribunal ou repartição pública.</p>${VAZIO}
<p ${J}>Para tanto, confere-se <strong>todos os poderes</strong> da cláusula “ad judicia” bem como aqueles contidos no foro em geral, necessários e permitidos em direito para o bom e fiel cumprimento deste mandato, em especial os de representar o(a) outorgante, judicial ou extrajudicialmente, podendo ainda: contestar, agravar, acordar, conciliar, desistir da ação, receber e dar quitação, transigir, pedir indébito ou indenização, recorrer, impetrar mandados de segurança, requerer e/ou impugnar avaliações ou perícias, requerer medidas cautelares e prestação de contas, assim como responder ou ingressar com quaisquer ações relativas ao objeto desta procuração, requerer documentos e cadastrar senha junto ao INSS, podendo ainda substabelecer no todo ou em parte, com ou sem reservas de poderes.</p>${VAZIO}
<p ${J}><span style="font-size: 10pt"><strong>PODERES ESPECÍFICOS:</strong> A presente procuração outorga ao(à) advogado(a) acima descrito(a) os poderes para, em nome do(a) outorgante, receber citação e intimações, confessar, reconhecer a procedência do pedido, transigir, desistir, renunciar ao direito sobre o qual se funda a ação, receber valores, dar quitação, firmar compromisso, acordo, pedir a justiça gratuita e assinar declaração de hipossuficiência econômica, conforme dispõe o art. 105 do Código de Processo Civil, bem como declarar e requerer isenção de imposto de renda.</span></p>${VAZIO}
<p style="text-align: right">${c("escritorio_cidade")}, ${c("data_extenso")}.</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("assinante_nome")}</strong></p>
<p ${C}>CPF nº ${c("assinante_cpf")}</p>`,
  },

  {
    id: "declaracao-isencao-irrf-rpv",
    nome: "Declaração de Não Incidência de IRRF (saque RPV)",
    categoria: "Declaração",
    descricao: "Declaração para não retenção de imposto de renda no saque de RPV/precatório da Justiça Federal (art. 27 da Lei nº 10.833/2003).",
    pagina: {
      fonte: "Courier New", tamanho: 12, espacamento: 1.5,
      margens: { topo: 40, direita: 25, base: 38, esquerda: 30 },
    },
    html: `
<p ${C}><strong>DECLARAÇÃO PARA NÃO INCIDÊNCIA DE IRRF</strong></p>${VAZIO}${VAZIO}
<p ${J}><strong>${c("nome_maiusculo")}</strong>, ${c("nacionalidade")}, ${c("profissao")}, inscrito(a) no CPF nº ${c("cpf")}, residente e domiciliado(a) em ${c("endereco_completo")}, para fins da não retenção do imposto de renda de que trata o art. 27 da Lei nº 10.833, de 29 de dezembro de 2003, sobre rendimentos em cumprimento de decisão da Justiça Federal, conforme Processo nº ${c("processo_numero")}, ${c("processo_vara")}, pagos pela Caixa Econômica Federal, declara que:</p>${VAZIO}
<p ${J}>(&nbsp;&nbsp;&nbsp;) o montante de R$ ____________________ constitui rendimento isento ou não tributável.</p>${VAZIO}
<p ${J}>(&nbsp;&nbsp;&nbsp;) está inscrito(a) no Sistema Integrado de Pagamento de Impostos e Contribuições das Microempresas e das Empresas de Pequeno Porte (Simples).</p>${VAZIO}
<p ${J}>O(a) beneficiário(a) fica ciente de que a falsidade na prestação destas informações o(a) sujeitará, juntamente com as demais pessoas que para ela concorrerem, às penalidades previstas na legislação tributária e penal, relativas à falsidade ideológica (art. 299 do Código Penal) e ao crime contra a ordem tributária (art. 1º da Lei nº 8.137, de 27 de dezembro de 1990).</p>${VAZIO}
<p ${J}>${c("cidade")}/${c("uf")}, ${c("data_extenso")}.</p>
<p>Local/Data</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}><strong>${c("assinante_nome")}</strong></p>
<p ${C}>Assinatura do(a) beneficiário(a) ou de seu representante legal</p>${VAZIO}${VAZIO}${VAZIO}
<p ${C}>${LINHA}</p>
<p ${C}>Abono da assinatura pela instituição</p>`,
  },

  {
    id: "autorizacao-credito-rpv-caixa",
    nome: "Autorização para Crédito em Conta — RPV (CAIXA)",
    categoria: "Outros",
    descricao: "Formulário da CAIXA (15.162) para crédito do Precatório/RPV em conta do beneficiário. Sem o timbrado do escritório.",
    timbrado: {
      topo: { arquivo: "/timbrado/caixa-cabecalho.png", largura: 148.2, x: 17.6, y: 13.4, proporcao: 0.0857 },
      rodape: null,
    },
    pagina: {
      fonte: "Arial", tamanho: 11, espacamento: 1.15,
      margens: { topo: 30, direita: 17, base: 22, esquerda: 16 },
      textoRodape: `<table style="width: 100%"><tbody><tr><td><p><span style="font-size: 8pt">15.162 v001&nbsp;&nbsp;&nbsp;micro</span></p></td><td><p style="text-align: right"><span style="font-size: 8pt">${c("pagina")}</span></p></td></tr></tbody></table>`,
      distTextoRodape: 15,
    },
    html: `
<p style="text-align: right"><span style="font-size: 8pt">Grau de sigilo<br>#PÚBLICO</span></p>${VAZIO}
<p ${J}>Eu <strong>${c("nome_maiusculo")}, ${c("nacionalidade")}, ${c("profissao")}, inscrito(a) no CPF nº ${c("cpf")}, residente em ${c("endereco_completo")}</strong>, por este intermédio, autorizo a CAIXA – Agência __________ a proceder com o pagamento do Precatório/Requisição de Pequeno Valor – RPV referente ao processo nº ${c("processo_numero")} que sou beneficiário(a), por meio do crédito na(s) conta(s) de minha titularidade, conforme abaixo:</p>${VAZIO}
<table style="width: 100%"><tbody>
<tr><td><p ${C}>Banco</p></td><td><p ${C}>Agência</p></td><td><p ${C}>Tipo de Conta (Op/CC/Poupança)</p></td><td><p ${C}>Nº Conta com DV</p></td></tr>
<tr><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>
<tr><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>
<tr><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>
<tr><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>
</tbody></table>${VAZIO}
<p>Em anexo, envio cópia dos seguintes documentos:</p>
<p>☐&nbsp;&nbsp;Documento de Identidade;</p>
<p>☐&nbsp;&nbsp;CPF;</p>${VAZIO}
<p ${J}>Informo a autenticidade dos documentos encaminhados e assumo a total responsabilidade, civil e criminal, pelos documentos apresentados.</p>${VAZIO}
<p>${c("cidade")}/${c("uf")}, ${c("data_extenso")}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Local/Data</p>${VAZIO}
<p>De acordo:</p>${VAZIO}${VAZIO}${VAZIO}
<p>${LINHA}</p>
<p>Nome do Sacador: ______________________________</p>
<p>CPF: ____________________</p>
<p>(Assinatura física ou digital)</p>${VAZIO}${VAZIO}${VAZIO}
<p>${LINHA}</p>
<p>Assinatura do Gerente (física ou digital)</p>
<hr class="quebra-pagina">
<p ${C}><strong>SAC CAIXA</strong>: 0800 726 0101 (informações, reclamações, sugestões e elogios)<br><strong>Para pessoas com deficiência auditiva ou de fala</strong>: 0800 726 2492<br><strong>Ouvidoria</strong>: 0800 725 7474<br><strong>caixa.gov.br</strong></p>`,
  },
];

/** Página completa do modelo pronto, com o timbrado apontando para o endereço atual do site. */
export function paginaDoPronto(m: ModeloPronto, origem: string): Partial<PaginaModelo> {
  const img = (t: (typeof TIMBRADO)["topo"]): ImagemModelo => ({
    url: origem + t.arquivo, caminho: "", largura: t.largura, x: t.x, y: t.y, proporcao: t.proporcao,
  });
  const t = m.timbrado ?? TIMBRADO;
  return { ...m.pagina, topo: t.topo && img(t.topo), rodape: t.rodape && img(t.rodape), fundo: null };
}
