import type * as types from './types';
import type { ConfigOptions, FetchResponse } from 'api/dist/core'
import Oas from 'oas';
import APICore from 'api/dist/core';
import definition from './openapi.json';

class SDK {
  spec: Oas;
  core: APICore;

  constructor() {
    this.spec = Oas.init(definition);
    this.core = new APICore(this.spec, 'developer-sankhya/1.0 (api/6.1.3)');
  }

  /**
   * Optionally configure various options that the SDK allows.
   *
   * @param config Object of supported SDK options and toggles.
   * @param config.timeout Override the default `fetch` request timeout of 30 seconds. This number
   * should be represented in milliseconds.
   */
  config(config: ConfigOptions) {
    this.core.setConfig(config);
  }

  /**
   * If the API you're using requires authentication you can supply the required credentials
   * through this method and the library will magically determine how they should be used
   * within your API request.
   *
   * With the exception of OpenID and MutualTLS, it supports all forms of authentication
   * supported by the OpenAPI specification.
   *
   * @example <caption>HTTP Basic auth</caption>
   * sdk.auth('username', 'password');
   *
   * @example <caption>Bearer tokens (HTTP or OAuth 2)</caption>
   * sdk.auth('myBearerToken');
   *
   * @example <caption>API Keys</caption>
   * sdk.auth('myApiKey');
   *
   * @see {@link https://spec.openapis.org/oas/v3.0.3#fixed-fields-22}
   * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-22}
   * @param values Your auth credentials for the API; can specify up to two strings or numbers.
   */
  auth(...values: string[] | number[]) {
    this.core.setAuth(...values);
    return this;
  }

  /**
   * If the API you're using offers alternate server URLs, and server variables, you can tell
   * the SDK which one to use with this method. To use it you can supply either one of the
   * server URLs that are contained within the OpenAPI definition (along with any server
   * variables), or you can pass it a fully qualified URL to use (that may or may not exist
   * within the OpenAPI definition).
   *
   * @example <caption>Server URL with server variables</caption>
   * sdk.server('https://{region}.api.example.com/{basePath}', {
   *   name: 'eu',
   *   basePath: 'v14',
   * });
   *
   * @example <caption>Fully qualified server URL</caption>
   * sdk.server('https://eu.api.example.com/v14');
   *
   * @param url Server URL
   * @param variables An object of variables to replace into the server URL.
   */
  server(url: string, variables = {}) {
    this.core.setServer(url, variables);
  }

  /**
   * <h1>Regras de negócio</h1> O procedimento de autenticação é realizado utilizando o
   * usuário e senha válidos e vinculado ao <b>SankhyaID</b>, e deve ser o primeiro passo em
   * uma sessão de chamadas de serviços. <br /> Com uma autenticação é possível chamar outros
   * serviços em sequência, como por exemplo os serviços loadrecords e saverecords. Isso
   * porque o <i><b> bearer token </i></b> obtido a partir dessa requisição é que deverá ser
   * informado no cabeçalho das chamadas subsequentes, permite que a sessão fique aberta pelo
   * período definido no sistema, que por padrão são 30 minutos de inatividade.<br/>Para
   * alterar o tempo de expiração do <i><b> bearer token </i></b> acesse a tela Preferências
   * no SankhyaOM e altere o parâmetro INATSESSTIMEOUT, que pode varia de 1 à 30 minutos.
   * <br><b>Atenção:</b> A URL para o login é específica e diferente das demais requisições:
   * </b> https://api.sankhya.com.br/login
   * <br>No entanto, é fortemente recomendado realizar logoff após realizar as requisições
   * desejadas. Veja a seguir um fluxo de integração recomendado:
   * <ol>
   *   <li>login</li>
   *   <li>requisição 1</li>
   *   <li>requisição 2</li>
   *   <li>requisição N</li>
   *   <li>logout</li>
   * </ol>
   * <h3>Dependências</h3> <b><font color=red> - O Token é gerado na tela Configurações
   * Gateway do SankhyaOm que deseja realizar a integração.</font></b>
   * <br /> <h3>Detalhes Técnicos:</h3> 
   * <b>Corpo de requisição para realizar login</b>
   *
   *       {
   *           curl --location --request POST 'https://api.sankhya.com.br/login' \
   *           --header 'token: 8fedf240-ea7f-11ed-a05b-0242ac120003' \
   *           --header 'appkey: db654b42-ea7f-11ed-a05b-0242ac120003' \
   *           --header 'username: user@dominio.com.br' \
   *           --header 'password: *******' \
   *           --data-raw '
   *       }
   *     
   *   <font size=2px><b>Retorno em json:</b></font><br />
   *   
   *       {
   *           "bearerToken": "bearerToken_da_sessao_ativa_retorna_bem_aqui",
   *               "error": null
   *       }
   *       
   * <b>Corpo de requisição para realizar logout</b>
   *
   *       {
   *           curl --location
   * 'https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=MobileLoginSP.logout&outputType=json'
   * \
   *           --header 'appkey: db654b42-ea7f-11ed-a05b-0242ac120003' \
   *           --header 'Content-Type: application/json' \
   *           --header 'Authorization: Bearer bearerToken_da_sessao_ativa_enviado_bem_aqui'
   *       }
   *       
   *  <font size=2px><b>Retorno em json:</b></font><br />
   *  
   *       {
   *           "serviceName": "MobileLoginSP.logout",
   *           "status": "1",
   *           "pendingPrinting": "false",
   *           "transactionId": "F35F4D5A07D74B06C86301D00E897ADC",
   *           "responseBody": {}
   *       }
   *
   * @summary Serviço de Autenticação via Json
   */
  login(metadata: types.LoginMetadataParam): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Login', 'post', metadata);
  }

  /**
   * <h1>Regras de negócio</h1> O cadastro de pedidos no sistema, permite que você registre e
   * gerencie o que foi vendido e precisa ser faturado e entregue indicando, para qual
   * cliente ou parceiro, quais as condições comerciais e financeiras negociadas e demais
   * informações, proporcionando uma clara visão do que está em cada etapa do processo.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044612654-Portal-de-Vendasbr
   * <h3>Dependências</h3> Para realizar a inclusão do pedido, os seguintes itens são
   * obrigatórios:<br />
   * <b>1) </b>Logar no sistema utilizando o Serviço de Login descrito nesta documentação em
   * Login;<br /> <b>2) </b>Produtos/Serviços  preeviamente cadastrados e ativos;<br /> <b>3)
   * </b>Empresas previamente cadastradas e ativas;<br /> <b>4) </b>Top's configuradas
   * devidamente tipo de movimentação <b>"Pedido de venda"</b>;<br /> <b>5) </b>Tipo de
   * negociação cadastrados seja  a vista, a prazo, parcelada, cheque.<br /> <b>6) </b>O
   * parceiro deve estar cadastrado e ativo antes da geração do pedido.<br />
   * <h3>Detalhes Técnicos</h3> O serviço utilizado para inclusão de notas é o
   * CACSP.IncluirNota que instancia as entidades principais para o envio de pedido, as
   * entidades que este serviço utiliza são: <br />
   *   <b>• CabecalhoNota;</b>
   *   <b>• ItemNota.</b><br />
   *   Os campos obrigatórios dependem estritamente da configuração de TOP,empresa, produto,
   * etc. Portanto, neste exemplo colocamos os campos tipicamente obrigatórios em todos os
   * casos de uso. Este exemplo não tenta exaurir as possibilidades,que são muitas, então em
   * alguns casos a chamada a esse serviço pode resultar em mensagem de erro exigindo que
   * outros campos sejam enviados. Apenas um pedido/nota pode ser enviado por vez. <br />
   *   Para realizar a inclusão do pedido através do Json, os campos abaixo são
   * obrigatórios:<br /><br />
   *             <b>CABEÇALHO DO PEDIDO</b>
   *
   *             • NUNOTA – Numero Único da nota;
   *             • CODPARC – Código do Parceiro;
   *             • DTNEG – Data de Negociação;
   *             • CODTIPOPER – Código do Tipo de Operação;
   *             • CODTIPVENDA – Tipo de Negociação;
   *             • CODVEND – Código do vendedor;
   *             • CODEMP – Código da Empresa;
   *             • TIPMOV – Tipo de Movimento.
   *
   * <h3></h3> <b>ITENS DO PEDIDO</b>
   *
   *             • CODPROD – Código do Produto;
   *             • QTDNEG – Quantidade;
   *             • CODLOCALORIG – Código local de Origem;
   *             • CODVOL – Código do Volume;
   *             • IGNOREDESCPROMOQTD - Quando "True" garante que os valores enviados na API
   * não serão alterados devido a algum disconto promocional vigente.
   *
   * <h3></h3> Conforme explicado anteriormente, os campos enviados acima são obrigatórios e
   * são os campos padrões. Os campos abaixo só serão obrigatórios se na requisição o campo
   * "<b><font color=red>INFORMARPRECO</font>"</b> for igual a <b>true</b>, caso contrário os
   * campos abaixo não serão obrigatórios.<br /><br /> <b>• VLRUNIT</b> – Valor Unitário;<br
   * /> <b>• PERCDESC</b> – Percentual de desconto;   <br />
   * <b><font color=red>IMPORTANTE</font>:</b> O campo <b>INFORMARPRECO</b> serve para enviar
   * o pedido com os valores já negociados e neste caso, o preço e o desconto terão que serem
   * enviados para serem calculados. Caso o campo <b>informarPreço</b> = N então o ERP irá
   * utilizar  valor da tabela de preços vigente no momento da inclusão do pedido.
   * <h3>Descritivo de Campos das Entidades</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCAB.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela <b>TGFCAB</b><br />
   * Acesse <a href="http://swagger.sankhya.com.br/tabelas/TGFITE.html"
   * target="_blank"><b><font size="4px">aqui</font></b></a> o dicionário de dados da tabela
   * <b>TGFITE</b><br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:      
   * https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirNota&outputType=json
   * <br />
   * <font color=red>IMPORTANTE</font>:</b> <H3>OBSERVAÇÃO: EXEMPLO DE REQUISIÇÃO BASEADO NA
   * BASE DE TESTE. TODOS OS CAMPOS DEVEM SER REVISTOS E AJUSTADOS PARA UM NOVO PEDIDO DE
   * VENDA PARA AMBIENTE PRODUTIVO.<br /> <br /> </b>Corpo de requisição</b>
   *
   *     {
   *        "serviceName":"CACSP.incluirNota",
   *        "requestBody":{
   *           "nota":{
   *              "cabecalho":{
   *                 "NUNOTA":{
   *                 },
   *                 "CODPARC":{
   *                    "$":"1"
   *                 },
   *                 "DTNEG":{
   *                    "$":"09/12/2022"
   *                 },
   *                 "CODTIPOPER":{
   *                    "$":"2000"
   *                 },
   *                 "CODTIPVENDA":{
   *                    "$":"12"
   *                 },
   *                 "CODVEND":{
   *                    "$":"0"
   *                 },
   *                 "CODEMP":{
   *                    "$":"1"
   *                 },
   *                 "TIPMOV":{
   *                    "$":"O"
   *                 }
   *              },
   *              "itens":{
   *                 "INFORMARPRECO":"True",
   *                 "item":[
   *                       {
   *                        "NUNOTA":{
   *                       },
   *                       "IGNOREDESCPROMOQTD": {
   *                           "$": "True"
   *                       },
   *                       "CODPROD":{
   *                          "$":"8"
   *                       },
   *                       "QTDNEG":{
   *                          "$":"1"
   *                       },
   *                       "CODLOCALORIG":{
   *                          "$":"0"
   *                       },
   *                       "CODVOL":{
   *                          "$":"UN"
   *                       },
   *                       "PERCDESC": {
   *                         "$": "0"
   *                       },
   *                      "VLRUNIT": {
   *                         "$": "1.75"
   *                       }
   *                    }               
   *                 ]
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CACSP.incluirNota",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "1484EE05236C4B33DE6355DAA8443EFF",
   *         "responseBody": {
   *             "pk": {
   *                 "NUNOTA": {
   *                     "$": "740"
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Cadastro de Pedidos
   */
  postPedidos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Pedidos', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Permite a consulta das informações relacionadas aos pedidos
   * de venda e permite validar os valores e condições negociadas entre empresa e parceiro.O
   * detalhamento de cada parametrização e/ou preenchimento, deve ser verificado junto aos
   * gestores de sua empresa e/ou consultores Sankhya.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044612654-Portal-de-Vendas#oqueumpedidodevenda<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>CabecalhoNota</b> que por sua vez
   * instancia a tabela TGFCAB  mapeando os campos principais na busca de pedidos.<br /> Para
   * realizarmos a busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * DTNEG, porém pode ser utilizados outros campos da entidade.<br /><br />
   *
   *  <b>• DTNEG</b> – Data da negociação.<br />           
   *
   * <h3></h3> Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *                   "criteria": {
   *                       "expression": {
   *                           "$": "(this.DTNEG = ? )"
   *                       },
   *                       "parameter": [
   *                          {
   *                             "$": "28/10/2016",
   *                             "type": "D"
   *                          }
   *                       ]
   *                   }
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCAB.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFCAB<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *       {
   *           "serviceName": "CRUDServiceProvider.loadRecords",
   *           "requestBody": {
   *               "dataSet": {
   *                   "rootEntity": "CabecalhoNota",
   *                   "includePresentationFields": "S",
   *                   "offsetPage": "0",
   *                   "criteria": {
   *                       "expression": {
   *                           "$": "(this.DTNEG = ? )"
   *                       },
   *                       "parameter": {
   *                           "$": "28/10/2016",
   *                           "type": "D"
   *                       }
   *                   },
   *                   "entity": {
   *                       "fieldset": {
   *                           "list": "NUNOTA,CODEMP,CODPARC,DTNEG"
   *                       }
   *                   }
   *               }
   *           }
   *       }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *       {
   *           "serviceName": "CRUDServiceProvider.loadRecords",
   *           "status": "1",
   *           "pendingPrinting": "false",
   *           "transactionId": "AD583F694F1AC8CD86D328EE246B7A1B",
   *           "responseBody": {
   *               "entities": {
   *                   "total": "12",
   *                   "hasMoreResult": "false",
   *                   "offsetPage": "0",
   *                   "offset": "0",
   *                   "metadata": {
   *                       "fields": {
   *                           "field": [
   *                               {
   *                                   "name": "NUNOTA"
   *                               },
   *                               {
   *                                   "name": "CODEMP"
   *                               },
   *                               {
   *                                   "name": "CODPARC"
   *                               },
   *                               {
   *                                   "name": "DTNEG"
   *                               },
   *                               {
   *                                   "name": "Empresa_NOMEFANTASIA"
   *                               },
   *                               {
   *                                   "name": "Parceiro_NOMEPARC"
   *                               }
   *                           ]
   *                       }
   *                   },
   *                   "entity": [
   *                       {
   *                           "f0": {
   *                               "$": "5996"
   *                           },
   *                           "f1": {
   *                               "$": "2"
   *                           },
   *                           "f2": {
   *                               "$": "3"
   *                           },
   *                           "f3": {
   *                               "$": "28/10/2016"
   *                           },
   *                           "f4": {
   *                               "$": "EMPRESA MODELO"
   *                           },
   *                           "f5": {
   *                               "$": "BRASIL TECIDOS"
   *                           }
   *                       },
   *                       {
   *                           "f0": {
   *                               "$": "5998"
   *                           },
   *                           "f1": {
   *                               "$": "2"
   *                           },
   *                           "f2": {
   *                               "$": "3"
   *                           },
   *                           "f3": {
   *                               "$": "28/10/2016"
   *                           },
   *                           "f4": {
   *                               "$": "EMPRESA MODELO"
   *                           },
   *                           "f5": {
   *                               "$": "BRASIL TECIDOS"
   *                           }
   *                       }
   *                   ]
   *               }
   *           }
   *       }
   *
   * @summary Consulta de pedidos
   */
  getPedidos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Pedidos', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> O objetivo é incluir no ERP um <b>pedido de venda</b> ou
   * <b>pedido de compra</b> negociado, por exemplo em 01/01 para ser entregue em até 31/12,
   * durante esse prazo de negociação, ocorrem algumas variações do preço na quantidade dos
   * itens, assim como itens excluídos e incluídos na negociação, por isso existe a
   * necessidade de manter um <b>pedido de venda</b> faturado parcialmente e que poderá
   * sofrer manutenções/alterações.<br />
   * Para realizar configuração no sistema com o <b><u>tipo de operação - Top</u></b> e
   * habilitar algumas marcações "Permitir Alteração após confirmar" e "Permite alterar itens
   * após faturar parcialmente" e "Gravar histórico de alterações do pedido" que possibilita
   * a alteração do <b>pedido de compra</b> ou <b>pedido de venda</b>, faturado parcialmente
   * no sistema.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045109773-Altera%C3%A7%C3%A3o-de-Pedidos-Parcialmente-Faturados#prefer%C3%AAncias<br
   * />
   * <h3>Dependências</h3> Para realizar a inclusão ou alteração de itens no pedido, os
   * seguintes itens são obrigatórios:<br />
   * <b>1) </b>Logar no sistema utilizando o Serviço de Login descrito nesta documentação em
   * Login; <br /> <b>2) </b>Produtos/Serviços  preeviamente cadastrados e ativos;<br />
   * <b>3) </b>Empresas previamente cadastradas e ativas;<br /> <b>4) </b>Top's configuradas
   * devidamente tipo de movimentação <b>"Pedido de venda"</b>;<br /> <b>5) </b>Tipo de
   * operação(TOP) utilizado no pedido deve estar configurada para permitir a alteração do
   * <b>"pedido"</b> após a <b>"confirmação"</b> do mesmo. <br />
   * <h3>Detalhes Técnicos</h3> O serviço utilizado para inclusão e alteração de itens no
   * pedido  é o <b>CACSP.incluirAlterarItemNota</b> que instancia as entidades principais
   * para o envio de item no pedido, as entidades que este serviço utiliza são: <br />
   *   <b>• CabecalhoNota;</b>
   *   <b>• ItemNota.</b><br />
   *   Os campos obrigatórios dependem estritamente da configuração de TOP,empresa, produto,
   * etc. Portanto, neste exemplo colocamos os campos tipicamente obrigatórios em todos os
   * casos de uso. Este exemplo não tenta exaurir as possibilidades,que são muitas, então em
   * alguns casos a chamada a esse serviço pode resultar em mensagem de erro exigindo que
   * outros campos sejam enviados. <br />
   *   Apenas um item pedido/nota pode ser enviado por vez. <br />
   *   Para realizar a inclusão do item no pedido através do Json, os campos abaixo são
   * obrigatórios:<br /><br />
   *   <b>CABEÇALHO DO PEDIDO</b><br />
   *   
   *             • NUNOTA – Numero Único da nota;
   *
   * <h3></h3> <b>ITENS DO PEDIDO</b>
   *
   *             • CODPROD – Código do Produto;
   *             • QTDNEG – Quantidade;
   *             • CODLOCALORIG – Código local de Origem;
   *             • CODVOL – Código do Volume;
   *             • SEQUENCIA - Sequência do item no pedido;
   *             • VLRUNIT - Valor Unitário;
   *             • VLRTOT - Valor total do item(QTDNEG x VLRUNIT);
   *             • VLRDESC - Valor do Desconto;
   *             • PERCDESC - Percentual de Desconto.
   *                      
   * <h3></h3> Para realizar a alteração de itens do pedido basta informar o número da
   * SEQUÊNCIA do item a ser alterado pelo JSON, segue exemplo:
   *
   *             "SEQUENCIA":{
   *                 "$":"10"
   *              }
   *
   *
   * <h3>Descritivo de Campos das Entidades</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCAB.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela <b>TGFCAB</b><br />
   * Acesse <a href="http://swagger.sankhya.com.br/tabelas/TGFITE.html"
   * target="_blank"><b><font size="4px">aqui</font></b></a> o dicionário de dados da tabela
   * <b>TGFITE</b><br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.incluirAlterarItemNota&outputType=json
   * <br />
   * <b>Corpo de Requisição Padrão para Inclusão:</b>
   *
   *     {
   *        "serviceName":"CACSP.incluirAlterarItemNota",
   *        "requestBody":{
   *           "nota":{
   *              "NUNOTA":"7468",
   *              "itens":{
   *                 "item":{
   *                    "CODPROD":{
   *                       "$":"129"
   *                    },
   *                    "NUNOTA":{
   *                       "$":"7468"
   *                    },
   *                    "SEQUENCIA":{
   *                       "$":""
   *                    },
   *                    "QTDNEG":{
   *                       "$":"10"
   *                    },
   *                    "VLRUNIT":{
   *                       "$":"10"
   *                    },
   *                    "VLRTOT":{
   *                       "$":"432.38"
   *                    },
   *                    "CODVOL":{
   *                       "$":"UN"
   *                    },
   *                    "VLRDESC":{
   *                       "$":"0"
   *                    },
   *                    "PERCDESC":{
   *                       "$":"0"
   *                    }
   *                 }
   *              }
   *           }
   *        }
   *     }
   * <h3></h3> <b>Corpo de Requisição Padrão para Alteração:</b>
   *
   *     {
   *        "serviceName":"CACSP.incluirAlterarItemNota",
   *        "requestBody":{
   *           "nota":{
   *              "NUNOTA":"7468",
   *              "itens":{
   *                 "item":{
   *                    "CODPROD":{
   *                       "$":"129"
   *                    },
   *                    "NUNOTA":{
   *                       "$":"7468"
   *                    },
   *                    "SEQUENCIA":{
   *                       "$":"10"
   *                    },
   *                    "QTDNEG":{
   *                       "$":"8"
   *                    },
   *                    "VLRUNIT":{
   *                       "$":"10"
   *                    },
   *                    "VLRTOT":{
   *                       "$":"432.38"
   *                    },
   *                    "CODVOL":{
   *                       "$":"UN"
   *                    },
   *                    "VLRDESC":{
   *                       "$":"0"
   *                    },
   *                    "PERCDESC":{
   *                       "$":"0"
   *                    }
   *                 }
   *              }
   *           }
   *        }
   *     }              
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CACSP.incluirAlterarItemNota",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "46457EBA87743376561485A6021C8D8A",
   *         "responseBody": {
   *             "pk": {
   *                 "NUNOTA": {
   *                     "$": "7468"
   *                 },
   *                 "SEQUENCIA": {
   *                     "$": "8"
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Inclusão e Alteração de Itens no Pedido
   */
  postIncaltitempedido(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/IncAltItemPedido', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> O objetivo é incluir um <b>pedido de venda</b> ou <b>pedido
   * de compra</b> negociado, por exemplo em 01/01 para ser entregue em até 31/12, durante
   * esse prazo de negociação, ocorrem algumas variações do preço e quantidade dos itens,
   * assim como itens excluídos e incluídos na negociação, por isso existe a necessidade de
   * manter um <b>pedido de venda</b> faturado parcialmente e que poderá sofrer
   * manutenções/alterações.<br />
   * Será necessário efetuar algumas, configurações como do tipo de operação - top e
   * habilitar algumas marcações "Permitir Alteração após confirmar" e "Permite alterar itens
   * após faturar parcialmente" e "Gravar histórico de alterações do pedido" que possibilita
   * a alteração do <b>pedido de compra</b> ou <b>pedido de venda</b>, faturado parcialmente
   * no sistema.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045109773-Altera%C3%A7%C3%A3o-de-Pedidos-Parcialmente-Faturados#prefer%C3%AAncias<br
   * />
   * <h3>Dependências</h3> Para realizar a exclusão de itens no pedido, os seguintes itens
   * são obrigatórios:<br />
   * <b>1) </b>Logar no sistema utilizando o Serviço de Login descrito nesta documentação em
   * Login;<br /> <b>2) </b>Produtos/Serviços  preeviamente cadastrados e ativos;<br /> <b>3)
   * </b>Empresas previamente cadastradas e ativas;<br /> <b>4) </b>Top's configuradas
   * devidamente tipo de movimentação <b>"Pedido de venda"</b>;<br /> <b>5) </b>Tipo de
   * operação(TOP) utilizado no pedido deve estar configurada para permitir a alteração do
   * <b>"pedido"</b> após a <b>"confirmação"</b> do mesmo. <br />
   * <h3>Detalhes Técnicos</h3> O serviço utilizado para exclusão de itens no pedido  é o
   * <b>CACSP.excluirItemNota</b> que instancia as entidades principais para exclusão de item
   * no pedido, as entidades que este serviço utiliza são: <br />
   *   <b>• CabecalhoNota;</b>
   *   <b>• ItemNota.</b><br />
   *   Os campos obrigatórios dependem estritamente da configuração de TOP,empresa, produto,
   * etc. Portanto, neste exemplo colocamos os campos tipicamente obrigatórios em todos os
   * casos de uso. Este exemplo não tenta exaurir as possibilidades,que são muitas, então em
   * alguns casos a chamada a esse serviço pode resultar em mensagem de erro exigindo que
   * outros campos sejam enviados. <br />
   *   Apenas um item pedido/nota pode ser enviado por vez. <br />
   *   Para realizar a exclusão do item no pedido através do Json, os campos abaixo são
   * obrigatórios:<br /><br />
   *   <b>CABEÇALHO DO PEDIDO</b><br />
   *   
   *             • NUNOTA – Numero Único da nota;
   *
   * <h3></h3> <b>ITENS DO PEDIDO</b>
   *
   *             • SEQUENCIA - Sequência do item no pedido;
   *
   * <h3>Descritivo de Campos das Entidades</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCAB.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela <b>TGFCAB</b><br />
   * Acesse <a href="http://swagger.sankhya.com.br/tabelas/TGFITE.html"
   * target="_blank"><b><font size="4px">aqui</font></b></a> o dicionário de dados da tabela
   * <b>TGFITE</b><br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.excluirItemNota&outputType=json
   * <br />
   * <b>Corpo de Requisição Padrão para Inclusão:</b>
   *
   *     {
   *        "serviceName":"CACSP.excluirItemNota",
   *        "requestBody":{
   *           "nota":{
   *              "itens":{
   *                 "item":{
   *                    "NUNOTA":{
   *                       "$":"7468"
   *                    },
   *                    "SEQUENCIA":{
   *                       "$":"4"
   *                    }
   *                 }
   *              }
   *           }
   *        }
   *     }
   * <h3></h3>
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CACSP.excluirItemNota",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "6E87F2164B6D912C169CA006E6FACC2F",
   *         "responseBody": {}
   *     }
   *
   * @summary Exclusão de de Itens do Pedido
   */
  postExcaltitempedido(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/ExcAltItemPedido', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar consulta de status dos pedidos será necessário
   * realizar uma consulta envolvendo 3 tabelas, são elas: <b>TGFCAB,TGFVAR</b> e
   * <b>TGFCAN</b>.<br />
   * OBS: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou acesso
   * o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044612654-Portal-de-Vendas#oqueumpedidodevenda<br
   * />
   * <h3>Dependências</h3> <b>É</b> necessário a criação da view VW_STPEDIDOS_JSON para poder
   * efetuar a consulta do(s) status dos pedido(s).<br />
   * Clique <a href="http://swagger.sankhya.com.br/tabelas/VW_STPEDIDOS_JSON.sql"
   * target="_blank"><b><font size="4px">aqui</font></b></a> para baixar o arquivo contendo o
   * código <b>SQL</b> com a view a para ser executada no banco de dados Oracle do ERP.<br
   * /><br /> <h3>Detalhes Técnicos</h3> As entidades utilizadas para esta consulta foram a
   * <b>CabecalhoNota,CompraVendavariosPedido</b> e <b>NotaCancelada</b> que por sua vez
   * instanciam as tabelas TGFCAB,TGFVAR e TGFCAN respectivamente.<br />
   * Para realizarmos a busca através do Json, utilizamos o serviço
   * <i><b>"DbExplorerSP.executeQuery".</b></i><br /><br /> O serviço
   * DbExplorerSP.executeQuery é um serviço para ser utilizado para execução de consultas SQL
   * através do JSON.<br /><br /> Este serviço é utilizado apenas para consulta de dados,
   * portanto, não é possível realizar deleções e inserções através do serviço.<br /><br />
   * No exemplo abaixo o único filtro utilizado foi um limitador para controlar o número de
   * linhas de retorno para que a consulta seja mais rápida de eficiente.<br /> <h3></h3> Por
   * se tratar de uma consulta SQL, foi inserido na cláusula WHERE um limitador de linhas
   * para melhor eficiência da consulta, segue exemplo:
   *
   *     "requestBody": {
   *         "sql":"SELECT * FROM VW_STPEDIDOS_JSON WHERE TO_CHAR(DTALTER, 'YYYY-MM-DD') >
   * '2020-01-01' AND TO_CHAR(DTALTER, 'YYYY-MM-DD') < '2020-12-31'"
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCAB.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFCAB<br /><br /> Acesse
   * <a href="http://swagger.sankhya.com.br/tabelas/TGFVAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFVAR<br /><br />       
   *    Acesse <a href="http://swagger.sankhya.com.br/tabelas/TGFCAN.html"
   * target="_blank"><b><font size="4px">aqui</font></b></a> o dicionário de dados da tabela
   * TGFCAN<br /><br /> <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executeQuery&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *       {
   *         "serviceName":"DbExplorerSP.executeQuery",
   *         "requestBody": {
   *         "sql":"SELECT * FROM VW_STPEDIDOS_JSON WHERE TO_CHAR(DTALTER, 'YYYY-MM-DD') >
   * '2020-01-01' AND TO_CHAR(DTALTER, 'YYYY-MM-DD') < '2020-12-31'"
   *         }
   *       }
   *
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *       {
   *           "serviceName": "DbExplorerSP.executeQuery",
   *           "status": "1",
   *           "pendingPrinting": "false",
   *           "transactionId": "D83F911A954DA9CE10097ACC2DEA9A4F",
   *           "responseBody": {
   *               "fieldsMetadata": [
   *                   {
   *                       "name": "NUNOTA",
   *                       "description": "NUNOTA",
   *                       "order": 1,
   *                       "userType": "I"
   *                   },
   *                   {
   *                       "name": "STATUSNOTA",
   *                       "description": "STATUSNOTA",
   *                       "order": 2,
   *                       "userType": "S"
   *                   },
   *                   {
   *                       "name": "DESCRICAO",
   *                       "description": "DESCRICAO",
   *                       "order": 3,
   *                       "userType": "S"
   *                   },
   *                   {
   *                       "name": "DTALTER",
   *                       "description": "DTALTER",
   *                       "order": 4,
   *                       "userType": "H"
   *                   }
   *               ],
   *               "rows": [
   *                   [
   *                       142,
   *                       "L",
   *                       "Liberado",
   *                       "15052020 16:26:57"
   *                   ]
   *               ],
   *               "burstLimit": false,
   *               "timeQuery": "4ms",
   *               "timeResultSet": "1ms"
   *           }
   *       }
   *
   * @summary Consulta de Status do Pedido
   */
  getStatuspedidos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/StatusPedidos', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar o cancelamento de pedidos no ERP será
   * necessário efetuar criação de um filtro para acessar os títulos que precisam ser
   * cancelados e efetuar o preenchimento dos dados necessários para efetuar o
   * cancelamento.No ERP a partir do momento que é cancelada uma nota fiscal, não é mais
   * possível reverter este processo, sendo necessário lançar a nota fiscal novamente.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045107913-Notas-Canceladas<br />
   * <h3>Dependências</h3> Para realizar o cancelameno do pedido, os seguintes itens são
   * obrigatórios:<br />
   * <b>1) </b>Logar no sistema utilizando o Serviço de Login descrito nesta documentação em
   * Login; <br /> <b>2) </b>O pedido deve estar confirmado no ERP Sankhya-Om;<br /> <b>3)
   * </b>É obrigatório informar o número único da nota<br /> <b>4) </b>É obrigatorio informar
   * a justificativa de cancelamento</b>.<br />
   * <h3>Detalhes Técnicos</h3>
   * O serviço utilizado para cancelamento de notas é o CACSP.cancelarNota que utiliza a
   * entidade  CabecalhoNota que por sua vez instancia a tabela TGFCAB.<br />
   * Para usar serviços de módulos auxiliares, como é o caso do mgecom devemos enviar um
   * parâmetro adicional na URL, cujo nome é mgeSession e o valor será o ID adquirido no
   * serviço de autenticação. Isso não se aplica para serviços do módulo mge, que é o
   * principal.<br />
   *   Para realizar a exclusão do pedido através do Json, o campo abaixo é obrigatório:<br
   * /><br />
   *
   *             • NUNOTA – Numero Único da nota;
   * <h3></h3> A partir do momento em que a nota é cancelada, a nota é inserida na tabela
   * <b>TGFCAN</b> que por sua vez é instanciada pela entidade <b>"NotaCancelada"</b>, esta
   * tabela é responsável por armazenar todas as notas que foram confirmadas mas por algum
   * motivo ou divergência, foi cancelada.
   *
   * <h3>Descritivo de Campos das Entidades</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCAB.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela <b>TGFCAB</b><br />
   * Acesse <a href="http://swagger.sankhya.com.br/tabelas/TGFCAN.html"
   * target="_blank"><b><font size="4px">aqui</font></b></a> o dicionário de dados da tabela
   * <b>TGFCAN</b><br />          
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CACSP.cancelarNota&outputType=json
   * <br />
   *
   *     <b>Corpo de requisição</b>
   *
   *       {
   *          "serviceName":"CACSP.cancelarNota",
   *          "requestBody":{
   *             "notasCanceladas":{
   *                "nunota":[
   *                   {
   *                      "$":"3713703"
   *                   }
   *                ],
   *                "justificativa":"lançamento indevido",
   *                "validarProcessosWmsEmAndamento":"true"
   *             }
   *           }
   *       }    
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *       {
   *           "serviceName": "CACSP.cancelarNota",
   *           "status": "1",
   *           "pendingPrinting": "false",
   *           "transactionId": "BA6F5CEB2F1ED4B27E3E66F98C4BE084",
   *           "responseBody": {
   *               "resultadoCancelamento": {
   *                   "totalNotasCanceladas": "1"
   *               }
   *           }
   *       }
   *
   * @summary Cancelamento de Pedidos
   */
  postCancelamentopedidos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/CancelamentoPedidos', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Para finalizar uma venda, o pedido de vendas precisa ser
   * faturado, ou seja, transformado em nota fiscal ou Ordem de Entrega.<br />
   *   O conceito prático de faturamento, consiste em transformar um pedido de venda em uma
   * nota fiscal de Venda; porém, na passagem de um orçamento para um pedido de venda,
   * pode-se entender que também houve um faturamento, mas não com as mesmas validações
   * mencionadas acima.<br />
   *  <b>Vale ressaltar que, os comportamentos citados, poderão variar de acordo com o
   * processo de cada empresa.</b><br />
   *   <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor”
   * ou acesso o link de apoio:<br />
   *  
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044612654-Portal-de-Vendas#faturamento-comofazer<br
   * />
   *   
   * <h3>Dependências</h3> Para realizar o faturamento do pedido, os seguintes itens são
   * obrigatórios:<br />
   * <b>1) </b>Logar no sistema utilizando o Serviço de Login descrito nesta documentação em
   * Login; <br /> <b>2) </b>O pedido deve estar confirmado no ERP Sankhya-Om;<br /> <b>3)
   * </b>É obrigatório informar o número único do pedido.<br /> <b>4) </b>É obrigatório
   * configurar o tipo de operação(TOP) para atender a requisição de faturamento vindo do
   * json<br /> <b>5) </b>É obrigatório informar o tipo de operação(TOP) de faturamento para
   * a nota fiscal.<br />
   * <b>OBS:</b> O faturamento pelo json passa pelas mesmas regras definidas e configuradas
   * nas TOPs do ERP.<br /> <h3>Detalhes Técnicos</h3>
   * O serviço utilizado para o faturamento de pedidos é o SelecaoDocumentoSP.faturar que
   * utiliza a entidade CabecalhoNota que por sua vez instancia a tabela TGFCAB.<br />
   * Para realizar o faturamento do pedido o campo abaixo é obrigatório:<br /><br />  <b>•
   * NUNOTA</b> – Numero Único da nota;       <h3></h3>
   *   Ao realizar o faturamento deve-se passar no campo <b>NUNOTA</b> o número do pedido que
   * deseja faturar.<br />
   *   Após o serviço executar o faturamento no ERP ele retorna o NUNOTA da nota fiscal
   * gerada. ( Lembrando que o <b>NUNOTA</b> não é o número da nota e sim apenas a chave (PK)
   * interna que identifica o documento na tabela TGFCAB ).<br />
   *   Para obter os dados da nota fiscal gerada, deve-se fazer chamada ao serviço de
   * consulta de <b>pedidos/notas</b> passando como parâmetro o NUNOTA da nota fiscal que foi
   * retornado durante a chamada do serviço de faturamento.<br />
   *   Assim conseguirá obter todas as informações da nota fiscal que foi gerada no
   * faturamento.<br />
   *   Importante: A nota faturada fica ligada com o pedido pela tabela <b>TGFVAR</b> ( ver
   * serviço de consulta de "Ligação Nota x Pedido" )<br />
   * <h3></h3> <b>Filtros de para opções de Faturamento:</b><br />
   * <font color="red"><b>Faturamento normal:</b></font><br /> Faturamento da nota
   * independente dos itens, ao utilizar esta opção o faturamento é realizado juntamente com
   * a quantidade total de itens na nota.
   *
   *                "notas":{
   *                "codTipOper":167,
   *                "dtFaturamento":"04/02/2021",
   *                "tipoFaturamento":"FaturamentoNormal",
   *                "dataValidada":true,
   *                "notasComMoeda":{
   *                   
   *                },         
   *                "nota":[
   *                 {
   *                    "$":7434
   *                 }
   *              ],
   *              "faturarTodosItens":true
   *             }
   * <h3></h3> <font color="red"><b>Faturamento por Item e por quantidade:</b></font><br />
   * Faturamento por item, permite selecionar o item que será faturado e a sua quantidade,
   * permitindo assim, faturar parcialmente um pedido ou um item.
   *
   *            "nota":[
   *           {
   *              "NUNOTA":"7432",
   *              "itens":{
   *                 "item":[
   *                    {
   *                       "QTDFAT":2,
   *                       "$":1
   *                    }
   *                 ],
   *               "faturarTodosItens":false,
   *              }
   *           }
   *        ],
   * <h3></h3> <font color="red"><b>Faturamento por Estoque:</b></font><br /> Para realizar o
   * faturamento por estoque o parâmetro <b>FATEST-RESERV</b> deverá estar desligado no ERP.
   *
   *        "notas":{
   *        "codTipOper":167,
   *        "dtFaturamento":"04/02/2021",
   *        "serie":"",
   *        "dtSaida":"04/02/2021",
   *        "hrSaida":"",
   *        "tipoFaturamento":"FaturamentoEstoque",
   *        "dataValidada":true,
   *        "notasComMoeda":{
   *        },         
   *         "nota":[
   *                 {
   *                    "$":7434
   *                 }
   *              ],
   *              "faturarTodosItens":true
   *       }
   * <h3></h3> <font color="red"><b>Faturamento por Estoque deixando pendente:</b></font><br
   * /> Faturar pelo estoque deixando pendente, serve para atender os itens que possuem
   * estoque, sendo assim, os itens que não possuem estoque ficam como pendentes para serem
   * atendidos posteriormente em um novo faturamento.<br /> Para realizar o faturamento por
   * estoque o parâmetro <b>FATEST-RESERV</b> deverá estar desligado no ERP.
   *
   *        "notas":{
   *        "codTipOper":167,
   *        "dtFaturamento":"04/02/2021",
   *        "serie":"",
   *        "dtSaida":"04/02/2021",
   *        "hrSaida":"",
   *        "tipoFaturamento":"FaturamentoEstoqueDeixandoPendente",
   *        "dataValidada":true,
   *        "notasComMoeda":{
   *        },         
   *         "nota":[
   *                 {
   *                    "$":7439
   *                 }
   *              ],
   *              "faturarTodosItens":true
   *       }
   * <h3></h3> <h3></h3> <font color="red"><b>Faturamento Direto:</b></font><br />
   *
   *
   *        "notas":{
   *        "codTipOper":28600,
   *        "dtFaturamento":"27/07/2021",
   *        "tipoFaturamento":"FaturamentoDireto",
   *        "dataValidada":true,
   *        "serie":"1",
   *        "tipoFaturamento":"FaturamentoDireto",
   *        "notasComMoeda":{
   *        },         
   *         "nota":[
   *                 {
   *                    "$":7439
   *                 }
   *              ],
   *              "faturarTodosItens":true
   *       }
   * <h3></h3>
   *  <b><font color="red">OBSERVAÇÃO</font>:</b> Nota-se que que nas opções de por estoque a
   * tag <b>tipoFaturamento</b> é alterada para <b>"FaturamentoEstoque"</b> ou
   * <b>"FaturamentoEstoqueDeixandoPendente"</b> nos demais tag fica com a opção
   * <b>FaturamentoNormal</b>. <br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCAB.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela <b>TGFCAB</b><br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=SelecaoDocumentoSP.faturar&outputType=json
   * <br />
   * <b>Corpo de Requisição Padrão</b>
   *
   *       {
   *          "serviceName":"SelecaoDocumentoSP.faturar",
   *          "requestBody":{
   *             "notas":{
   *                "codTipOper":167,
   *                "dtFaturamento":"04/02/2021",
   *                "tipoFaturamento":"FaturamentoNormal",
   *                "dataValidada":true,
   *                "notasComMoeda":{
   *                   
   *                },
   *                "nota":[
   *                   {
   *                      "$":7434
   *                   }
   *                ],
   *                "codLocalDestino":"",
   *                "faturarTodosItens":true,
   *                "umaNotaParaCada":"false",
   *                "ehWizardFaturamento":true,
   *                "dtFixaVenc":"",
   *                "ehPedidoWeb":false,
   *                "nfeDevolucaoViaRecusa":false
   *             }
   *          }
   *       }
   *
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *       {
   *           "serviceName": "SelecaoDocumentoSP.faturar",
   *           "status": "1",
   *           "pendingPrinting": "false",
   *           "transactionId": "C688DB3E5193312092DC853D04B7BBE2",
   *           "responseBody": {
   *               "codUsuLogado": {
   *                   "$": "0"
   *               },
   *               "notas": {
   *                   "tipMov": "V",
   *                   "nota": {
   *                       "$": "7435"
   *                   }
   *               }
   *           }
   *       }
   *
   * @summary Faturamento de Pedidos
   */
  postFaturamentopedidos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/FaturamentoPedidos', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar o cadastramento no ERP de grupos de produtos o
   * serviço obrigatoriamente deve pertencer a um grupo. Para que seja definido uma forma de
   * classificação e agrupamento de produtos e serviços com características semelhantes,
   * objetivando facilitar operações como:Atualização de preços;Análises de relatórios
   * gerenciais;impressão de listas de preços, inventários etc.<br />
   * Porém no sistema é necessário evitar um grande número de níveis, pois isso torna os
   * lançamentos muito complicados e os relatórios gerenciais apresentam muitas quebras,
   * tornando-se difíceis de interpretar;<br />
   * <b>OBS</b>: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044598294-Grupos-de-Produtos-Servi%C3%A7os<br
   * />
   * <h3>Dependências</h3>
   *  <b><font color=red>Não possui dependências</font></b><br />
   *  <h3>Detalhes Técnicos</h3>
   *  A entidade utilizada é a <b>GrupoProduto</b> que por sua vez instancia a tabela TGFGRU
   * mapeando os campos principais pertinentes ao cadastro de transportadora.<br />
   *  Para realizar a importação do cadastro de transportadora através do Json, os campos
   * abaixo são obrigatórios:<br />
   *   <b>• CODGRUPOPROD</b> - Cód. do Grupo Produto;
   *   <b>• DESCRGRUPOPROD</b> - Descrição;
   *   <b>• CODGRUPAI</b> - Grupo pai;
   *   <b>• GRAU</b> - Grau.<br /><br />
   *
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFGRU.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFGRU<br />          
   * Exemplo de uso:<br /><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *     "serviceName":"CRUDServiceProvider.saveRecord",
   *      "requestBody":{
   *         "dataSet":{
   *            "rootEntity":"GrupoProduto",
   *            "includePresentationFields":"S",
   *            "dataRow":{
   *               "localFields":{
   *                  "CODGRUPOPROD":{
   *                     "$":"1001002011"
   *                  },               
   *                  "DESCRGRUPOPROD":{
   *                     "$":"Grupo de produto teste"
   *                  },               
   *                  "CODGRUPAI":{
   *                     "$":"1001002000"
   *                  },               
   *                  "GRAU":{
   *                     "$":"4"
   *                  }
   *               }
   *            }, "entity":{
   *               "fieldset":{
   *                  "list":"CODGRUPOPROD,DESCRGRUPOPROD,CODGRUPAI,GRAU"
   *               }
   *            }
   *         }
   *      }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.saveRecord",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "9B647AA5DE706B8B8E1E0D8640BD2548",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "entity": {
   *                   "DESCRGRUPOPROD": {
   *                       "$": "Grupo de produto teste"
   *                   },
   *                   "CODGRUPAI": {
   *                       "$": "1001002000"
   *                   },
   *                   "CODGRUPOPROD": {
   *                       "$": "1001002011"
   *                   },
   *                   "GRAU": {
   *                       "$": "4"
   *                   }
   *               }
   *           }
   *       }
   *     }
   *
   * @summary Grupo de Produtos
   */
  postGrupoproduto(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/GrupoProduto', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar o cadastro de produto no ERP é necessário
   * preencher os dados obrigatórios, pois todo produto/serviço obrigatoriamente deve
   * pertencer a um grupo. Esta tela permite que você defina uma forma de classificação e
   * agrupamento de produtos e serviços com características semelhantes, objetivando
   * facilitar operações como: atualização de preços,análises de relatórios gerenciais e
   * impressão de listas de preços.<br />
   * <b>OBS</b>: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045112113-Cadastro-de-Produtos-<br
   * /><br />
   * <h3>Dependências</h3> Para realizar a importação do cadastro, deve ser informado o
   * código do grupo de produto correspondente ou o código de grupo padrão, caso não exista o
   * código de grupo de produto no cadastro, basta cadastrá-lo e informar o código de grupo
   * de produto durante o cadastro.<br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Produto</b> que por sua vez
   * instancia a tabela TGFPRO mapeando os campos principais pertinentes ao cadastro de
   * produto.<br /> Para realizar a importação do cadastro de produtos através do Json, os
   * campos abaixo são obrigatórios:<br /><br /> <b>• DESCRPROD</b> – Descrição do
   * Produto;<br /> <b>• CODGRUPOPROD</b> – Código do Grupo de Produto (utilizar o código de
   * grupo de produtos da base MODELO);<br /> <b>• CODVOL</b> – Volume do Produto;<br /> <b>•
   * REFFORN</b> – Referência do Fornecedor;<br /> <b>• MARCA</b> – Marca do Produto.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPRO.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPRO<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <font color=red>IMPORTANTE</font>:</b> <H3>OBSERVAÇÃO: EXEMPLO DE REQUISIÇÃO BASEADO NA
   * BASE DE TESTE. TODOS OS CAMPOS DEVEM SER REVISTOS E AJUSTADOS PARA UM NOVO CADASTRO DE
   * PEDIDOS PARA AMBIENTE PRODUTIVO.<br/> <br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.saveRecord",
   *       "requestBody": {
   *           "dataSet": {
   *               "rootEntity": "Produto",
   *               "includePresentationFields": "N",
   *               "dataRow": {
   *                   "localFields": {
   *                       "DESCRPROD": {
   *               "$": "teste54321"
   *           },
   *           "CODGRUPOPROD": {
   *               "$": "0"
   *           },
   *           "CODVOL": {
   *               "$": "UN"
   *           },
   *           "REFFORN": {
   *            "$": "teste 1234"
   *           },                    
   *           "MARCA": {
   *               "$": "200"
   *           },                    
   *           "USOPROD": {
   *               "$": "B"
   *           },
   *           "NCM": {
   *               "$": "03078300"
   *                       }
   *                   }
   *               },
   *               "entity": {
   *                   "fieldset": {
   *                       "list": "CODPROD,DESCRPROD,CODGRUPOPROD,CODVOL,MARCA"
   *                   }
   *               }
   *           }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.saveRecord",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "F66577EDDEE27F429049083133144519",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "entity": {
   *                   "CODVOL": {
   *             "$": "UN"
   *         },
   *             "_rmd": {
   *                   "CODPROD": {
   *                 "$":
   * "{\"decVlr\":2,\"decQtd\":0,\"controle\":{\"tipoContEst\":\"N\",\"listaContEst\":[\"\"],\"usaMascara\":false}}",
   *                 "provider": "PRODUTORMP"
   *             }
   *         },
   *                 "MARCA": {
   *                   "$": "200"
   *         },
   *                 "DESCRPROD": {
   *                     "$": "TESTE54321"
   *         },
   *                 "CODGRUPOPROD": {
   *                     "$": "0"
   *         },
   *                 "CODPROD": {
   *                     "$": "28"
   *                   }
   *               }
   *           }
   *       }
   *     }
   *
   * @summary Cadastro de Produtos
   */
  postProduto(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Produto', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Atualmente, em uma empresa de comercialização de itens
   * palpáveis, o produto é considerado a ferramenta de cunho fundamental para os processos
   * de Compra e Venda. <br/>
   * A instituição adquire o(s) produto(s) para revenda ou a(s) matéria(s) prima(s) para
   * produção de itens próprios.<br /> Além disso, temos em meio ao processo de Compras, as 
   * solicitações internas, que tem por objetivo sanar as deficiências de materiais nos
   * vários setores da empresa.<br /><br /> Esta documentação permitirá que você tenha uma
   * visão completa de como efetuar o cadastro de um produto. Servirá também de apoio à
   * consultas futuras para esclarecimentos de dúvidas,  quanto à parametrização, principais
   * tipos de erros e as possíveis maneiras de corrigi-los.<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Produto</b> que por sua vez
   * instancia a tabela TGFPRO mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODPROD, porém você pode utilizar outros campos da entidade .<br /><br />  
   *
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *             "$": "this.CODPROD = ?"
   *           },
   *           "parameter": [
   *              {
   *                 "$": "7",
   *                 "type": "I"
   *              }
   *           ]
   *         }   "expression": {
   *                  
   * <h3></h3>                   Para melhor performance sempre utilize nas suas consultas
   * apenas os campos necessários, para evitar tráfego de dados que não serão utilizados.<br
   * />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPRO.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPRO<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Produto",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODPROD = ?"
   *             },
   *             "parameter": [
   *               {
   *                 "$": "7",
   *                 "type": "I"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODPROD,DESCRPROD,LOCAL,MARCA,CODVOL"
   *             }
   *           }
   *         }
   *       }
   *     }
   *   <br/>
   *
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *      {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "7EC52EBA04CF6E5DB89BA44EE3C5A4CF",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "entity": {
   *                     "f1": {
   *                         "$": "CANELA EM PO"
   *                     },
   *                     "f0": {
   *                         "$": "7"
   *                     },
   *                     "f3": {
   *                         "$": "UN"
   *                     },
   *                     "f2": {
   *                         "$": "JUNCO"
   *                     },
   *                     "f4": {
   *                         "$": "1000"
   *                     }
   *                 },
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "DESCRPROD"
   *                             },
   *                             {
   *                                 "name": "MARCA"
   *                             },
   *                             {
   *                                 "name": "CODVOL"
   *                             },
   *                             {
   *                                 "name": "CODLOCALPADRAO"
   *                             }
   *                         ]
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Produtos
   */
  getProduto(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Produto', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> A empresa pode possuir mais de uma tabela de preço cadastrada
   * para seus produtos, sendo que podem ser concedidos descontos promocionais com o mesmo
   * período e produto para tabelas diferentes com percentuais diferentes.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044600034-Descontos-Promocionais<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>EmpresaProdutoImpostos</b> que
   * por sua vez instancia a tabela TGFPEM mapeando os campos principais.<br /><br /> Para
   * realizarmos a busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro os campos
   * CODEMP e CODPROD, para poder pesquisar os produtos por empresa, porém você pode utilizar
   * outros campos da entidade .<br /><br /> <b>• CODEMP</b> – Código da Empresa.<br /> <b>•
   * CODPROD</b> – Código do Produto.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *                   "criteria": {
   *                      "expression": {
   *                         "$": "this.CODEMP = ? and this.CODPROD = ?"
   *                      },
   *                      "parameter": [
   *                        {
   *                          "$": "10",
   *                          "type": "I"
   *                        },
   *                        {
   *                          "$": "1",
   *                          "type": "I"
   *                        }
   *                      ]
   *                   }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPEM.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPEM<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "EmpresaProdutoImpostos",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODEMP = ? and this.CODPROD = ?"
   *             },
   *             "parameter": [
   *               {
   *                 "$": "10",
   *                 "type": "I"
   *               },
   *               {
   *                 "$": "1",
   *                 "type": "I"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODEMP,CODPROD"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "8A0582AF4F679BDCBA971C91E7AE1D00",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             },
   *                             {
   *                                 "name": "Produto_DESCRPROD"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "10"
   *                     },
   *                     "f1": {
   *                         "$": "1"
   *                     },
   *                     "f2": {
   *                         "$": "EMPRESA MODO CHECKOUT"
   *                     },
   *                     "f3": {
   *                         "$": "Bolsa Térmica"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Produtos x Empresa
   */
  getProdutoempresa(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/ProdutoEmpresa', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> O ERP permite o cadastro de descontos, restringindo este por
   * <b>"produto/serviço"</b>, <b>"grupo de produto"</b> ou <b>"Todos"</b>, sendo que quando
   * definido com esta última opção, todos os produtos sem exceção serão <b>"afetados"</b>
   * pelo desconto configurado.Para que o processo seja validado é importante efetuar as
   * devidas configurações no ERP e informar o produto para o qual será concedido o
   * desconto.<br />
   * OBS: Caso tenha alguma necessidade de configuração do ERP procure <b>“Consultor”</b> ou
   * acesso o link de apoio:<br /> 
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044600034-Descontos-Promocionais<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Desconto</b> que por sua vez
   * instancia a tabela TGFDES mapeando os campos principais.<br /><br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foram utilizados como filtro os
   * campos CODPROD,DTINICIAL e DTFINAL para poder pesquisar as promoções cadastradas por
   * <b>Produto</b> e por <b>período de vigência</b> da Promoção, porém você pode utilizar
   * outros campos da entidade. .<br /><br /> <b>• CODPROD</b> – Código do Produto.<br />
   * <b>• DTINICIAL</b> – Data Inicial.<br /> <b>• DTFINAL</b> – Data Final.<br />          
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODPROD = ? AND this.DTINICIAL = ? AND this.DTFINAL = ?"       
   *                 
   *             },
   *             "parameter": [
   *               {
   *                 "$": "542",
   *                 "type": "I"
   *               },
   *               {
   *                 "$": "15/03/2020",
   *                 "type": "D"
   *               },
   *               {
   *                 "$": "31/03/2020",
   *                 "type": "D"
   *               }
   *             ]
   *           }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFDES.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFDES<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Desconto",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODPROD = ? AND this.DTINICIAL = ? AND this.DTFINAL = ?"       
   *                 
   *             },
   *             "parameter": [
   *               {
   *                 "$": "542",
   *                 "type": "I"
   *               },
   *               {
   *                 "$": "15/03/2020",
   *                 "type": "D"
   *               },
   *               {
   *                 "$": "31/03/2020",
   *                 "type": "D"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list":
   * "DTINICIAL,DTFINAL,CODPROD,VLRDESC,CODEMP,NUPROMOCAO,DESCRPROMOCAO"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "9F5C7EB92A2865760E33F886DE469E57",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "DTINICIAL"
   *                             },
   *                             {
   *                                 "name": "DTFINAL"
   *                             },
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "VLRDESC"
   *                             },
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "NUPROMOCAO"
   *                             },
   *                             {
   *                                 "name": "DESCRPROMOCAO"
   *                             },
   *                             {
   *                                 "name": "Produto_DESCRPROD"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f6": {
   *                         "$": "CALCULADORA EMPRESA 1"
   *                     },
   *                     "f7": {
   *                         "$": "CALCULADORA HP12"
   *                     },
   *                     "f8": {
   *                         "$": "WCS PRESTAÇÃO DE SERVIÇOS"
   *                     },
   *                     "f0": {
   *                         "$": "15/03/2020"
   *                     },
   *                     "f1": {
   *                         "$": "31/03/2020"
   *                     },
   *                     "f2": {
   *                         "$": "542"
   *                     },
   *                     "f3": {
   *                         "$": "0"
   *                     },
   *                     "f4": {
   *                         "$": "1"
   *                     },
   *                     "f5": {
   *                         "$": "301"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Promoções - Produtos
   */
  getPromocaoproduto(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/PromocaoProduto', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar uma consulta por grupo de produtos,
   * primeiramente é necessário realizar uma venda com produto promocional  por <b>“grupo de
   * Produtos”</b> no ERP para que o desconto em percentual seja aplicado no produto. <br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044600034-Descontos-Promocionais<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Desconto</b> que por sua vez
   * instancia a tabela TGFDES mapeando os campos principais.<br /><br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foram utilizados como filtro os
   * campos GRUPODESCPROD, DTINICIAL e DTFINAL para poder pesquisar as promoções cadastradas
   * por <b>Grupo de produto</b> e por <b>período de vigência</b> da Promoção, porém você
   * pode utilizar outros campos da entidade. .<br /><br /> <b>• GRUPODESCPROD</b> – Grupo de
   * desconto por Produto.<br /> <b>• DTINICIAL</b> – Data Inicial.<br /> <b>• DTFINAL</b> –
   * Data Final.<br />    
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *             "expression": {
   *                "$": "this.GRUPODESCPROD = ? AND this.DTINICIAL = ? AND this.DTFINAL = ?"
   *                    
   *             },
   *             "parameter": [
   *                {
   *                  "$": "teste",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "01/01/2021",
   *                  "type": "D"
   *                },
   *                {
   *                  "$": "31/01/2021",
   *                  "type": "D"
   *                }
   *             ]
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFDES.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFDES<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Desconto",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *                "$": "this.GRUPODESCPROD = ? AND this.DTINICIAL = ? AND this.DTFINAL = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "teste",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "01/01/2021",
   *                  "type": "D"
   *                },
   *                {
   *                  "$": "31/01/2021",
   *                  "type": "D"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list":
   * "DTINICIAL,DTFINAL,CODPROD,VLRDESC,GRUPODESCPROD,NUPROMOCAO,DESCRPROMOCAO"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "593D8A841F043D7B6E8DAD2FF1286B72",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "DTINICIAL"
   *                             },
   *                             {
   *                                 "name": "DTFINAL"
   *                             },
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "VLRDESC"
   *                             },
   *                             {
   *                                 "name": "GRUPODESCPROD"
   *                             },
   *                             {
   *                                 "name": "NUPROMOCAO"
   *                             },
   *                             {
   *                                 "name": "DESCRPROMOCAO"
   *                             },
   *                             {
   *                                 "name": "Produto_DESCRPROD"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": [
   *                     {
   *                         "f6": {
   *                             "$": "LIQUIDA ESTOQUE"
   *                         },
   *                         "f7": {
   *                             "$": "<sem descrição>"
   *                         },
   *                         "f0": {
   *                             "$": "01/01/2021"
   *                         },
   *                         "f1": {
   *                             "$": "31/01/2021"
   *                         },
   *                         "f2": {
   *                             "$": "0"
   *                         },
   *                         "f3": {
   *                             "$": "0"
   *                         },
   *                         "f4": {
   *                             "$": "teste"
   *                         },
   *                         "f5": {
   *                             "$": "16"
   *                         }
   *                     }
   *                 ]
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Promoções - Grupo de Produtos
   */
  getPromocaogrupoproduto(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/PromocaoGrupoProduto', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar consulta de promoções por empresa é necessário
   * efetuar devidas configurações no ERP conforme configurações do tipo de negociação
   * aplicado e produto cadastrado precificado.A empresa pode, possuir mais de uma tabela de
   * preço, cadastrada para seus produtos, sendo que podem ser concedidos, descontos
   * promocionais com o mesmo período e produto para tabelas diferentes com percentuais
   * diferentes.<br />
   * <b>Importante:</b> Quando a promoção é por empresa no ERP (isolamento promocional por
   * empresa (Filiais), para cada tipo de chamada da consulta de produtos existem formas
   * diferentes de se contextualizar a empresa para buscar a promoção.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044600034-Descontos-Promocionais<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Desconto</b> que por sua vez
   * instancia a tabela TGFDES mapeando os campos principais.<br /><br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foram utilizados como filtro os
   * campos CODEMP, DTINICIAL e DTFINAL para poder pesquisar as promoções cadastradas por
   * <b>Empresa</b> e por <b>período de vigência</b> da Promoção, porém você pode utilizar
   * outros campos da entidade. .<br /><br /> <b>• CODEMP</b> – Código da Empresa.<br /> <b>•
   * DTINICIAL</b> – Data Inicial.<br /> <b>• DTFINAL</b> – Data Final.<br />  
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *                   "criteria": {
   *                     "expression": {
   *                        "$": "this.CODEMP = ? AND this.DTINICIAL = ? AND this.DTFINAL =
   * ?"
   *                     },
   *                     "parameter": [
   *                        {
   *                          "$": "1",
   *                          "type": "I"
   *                        },
   *                        {
   *                          "$": "15/01/2020",
   *                          "type": "D"
   *                        },
   *                        {
   *                          "$": "31/03/2020",
   *                          "type": "D"
   *                        }
   *                     ]
   *                   }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFDES.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFDES<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Desconto",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *                "$": "this.CODEMP = ? AND this.DTINICIAL = ? AND this.DTFINAL = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "1",
   *                  "type": "I"
   *                },
   *                {
   *                  "$": "15/01/2020",
   *                  "type": "D"
   *                },
   *                {
   *                  "$": "31/03/2020",
   *                  "type": "D"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list":
   * "DTINICIAL,DTFINAL,CODPROD,VLRDESC,CODEMP,NUPROMOCAO,DESCRPROMOCAO"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "07827BF346E6056BE30634A6FE479C60",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "DTINICIAL"
   *                             },
   *                             {
   *                                 "name": "DTFINAL"
   *                             },
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "VLRDESC"
   *                             },
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "NUPROMOCAO"
   *                             },
   *                             {
   *                                 "name": "DESCRPROMOCAO"
   *                             },
   *                             {
   *                                 "name": "Produto_DESCRPROD"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f6": {
   *                         "$": "CALCULADORA EMPRESA 1"
   *                     },
   *                     "f7": {
   *                         "$": "CALCULADORA HP12"
   *                     },
   *                     "f8": {
   *                         "$": "WCS PRESTAÇÃO DE SERVIÇOS"
   *                     },
   *                     "f0": {
   *                         "$": "15/03/2020"
   *                     },
   *                     "f1": {
   *                         "$": "31/03/2020"
   *                     },
   *                     "f2": {
   *                         "$": "542"
   *                     },
   *                     "f3": {
   *                         "$": "0"
   *                     },
   *                     "f4": {
   *                         "$": "1"
   *                     },
   *                     "f5": {
   *                         "$": "301"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Promoções - Empresa
   */
  getPromocaoempresa(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/PromocaoEmpresa', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar uma consulta de <b>“promoções por
   * parceiros”</b> no ERP devemos, efetuar configurações necessárias  para que seja possível
   * aplicar algum tipo de negociação e  informar no sistema qual o parceiro que receberá o
   * desconto é inserir o produto que receberá o desconto e confirmar a nota então o valor de
   * desconto será aplicado.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure
   * <b>“Consultor”</b> ou acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044600034-Descontos-Promocionais<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Desconto</b> que por sua vez
   * instancia a tabela TGFDES mapeando os campos principais.<br /><br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foram utilizados como filtro os
   * campos CODPARC, DTINICIAL e DTFINAL para poder pesquisar as promoções cadastradas por
   * <b>Parceiro</b> e por <b>período de vigência</b> da Promoção, porém você pode utilizar
   * outros campos da entidade. .<br /><br /> <b>• CODPARC</b> – Código do parceiro.<br />
   * <b>• DTINICIAL</b> – Data Inicial.<br /> <b>• DTFINAL</b> – Data Final.<br />  
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *              "$": "this.CODPARC = ? AND this.DTINICIAL = ? AND this.DTFINAL = ?"
   *           },
   *           "parameter": [
   *              {
   *                "$": "510",
   *                "type": "I"
   *              },
   *              {
   *                "$": "12/03/2020",
   *                "type": "D"
   *              },
   *              {
   *                "$": "20/03/2020",
   *                "type": "D"
   *              }
   *           ]
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFDES.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFDES<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Desconto",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *                "$": "this.CODPARC = ? AND this.DTINICIAL = ? AND this.DTFINAL = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "510",
   *                  "type": "I"
   *                },
   *                {
   *                  "$": "12/03/2020",
   *                  "type": "D"
   *                },
   *                {
   *                  "$": "20/03/2020",
   *                  "type": "D"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODEMP,CODPARC,CODPROD,PERCENTUAL,NUPROMOCAO,DTINICIAL,DTFINAL"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "EC2A8E46E64460A0308C0B7C0BF4A58F",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "CODPARC"
   *                             },
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "PERCENTUAL"
   *                             },
   *                             {
   *                                 "name": "NUPROMOCAO"
   *                             },
   *                             {
   *                                 "name": "DTINICIAL"
   *                             },
   *                             {
   *                                 "name": "DTFINAL"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             },
   *                             {
   *                                 "name": "Parceiro_NOMEPARC"
   *                             },
   *                             {
   *                                 "name": "Produto_DESCRPROD"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f6": {
   *                         "$": "20/03/2020"
   *                     },
   *                     "f7": {
   *                         "$": "EMPRESA MODELO"
   *                     },
   *                     "f8": {
   *                         "$": "ABIGOBALDO JUNIOR"
   *                     },
   *                     "f9": {
   *                         "$": "WILKER - ALCOOL EM GEL"
   *                     },
   *                     "f0": {
   *                         "$": "2"
   *                     },
   *                     "f1": {
   *                         "$": "510"
   *                     },
   *                     "f2": {
   *                         "$": "112"
   *                     },
   *                     "f3": {
   *                         "$": "0"
   *                     },
   *                     "f4": {
   *                         "$": "300"
   *                     },
   *                     "f5": {
   *                         "$": "12/03/2020"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Promoções - Parceiros
   */
  getPromocaoparceiro(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/PromocaoParceiro', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar consulta de promoções por quantidade é
   * necessário efetuar configurações necessárias de modo a restringir a quantidade a ser
   * considerada para aplicação do desconto promocional, se este desconto será em "valor" ou
   * "percentual" e o valor ou percentual de desconto propriamente dito.<br/>
   * Ressalto que o desconto por quantidade será válido apenas quando o 'Tipo de Negociação'
   * possuir a opção <b>"Considerar por Quantidade"</b>.<br />
   * <b>Importante:</b> Não é possível a configuração de desconto por quantidade,
   * considerando controle adicional de estoque.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044600034-Descontos-Promocionais<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Desconto</b> que por sua vez
   * instancia a tabela TGFDES mapeando os campos principais.<br /><br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foram utilizados como filtro os
   * campos USADESCQTD, DTINICIAL e DTFINAL para poder pesquisar as promoções cadastradas por
   * <b>Quantidade</b> e por <b>período de vigência</b> da Promoção, porém você pode utilizar
   * outros campos da entidade. .<br /><br /> <b>• USADESCQTD</b> – Usa desconto por
   * quantidade.<br /> <b>• DTINICIAL</b> – Data Inicial.<br /> <b>• DTFINAL</b> – Data
   * Final.<br />  
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *                   "criteria": {
   *                     "expression": {
   *                       "$": "this.USADESCQTD = ? AND this.DTINICIAL = ? AND this.DTFINAL
   * = ?"
   *                     },
   *                     "parameter": [
   *                        {
   *                          "$": "S",
   *                          "type": "S"
   *                        },
   *                        {
   *                          "$": "19/06/2020",
   *                          "type": "D"
   *                        },
   *                        {
   *                          "$": "01/08/2020",
   *                          "type": "D"
   *                        }
   *                     ]
   *                   }
   *                   
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFDES.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFDES<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Desconto",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.USADESCQTD = ? AND this.DTINICIAL = ? AND this.DTFINAL = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "S",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "19/06/2020",
   *                  "type": "D"
   *                },
   *                {
   *                  "$": "01/08/2020",
   *                  "type": "D"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list":
   * "DTINICIAL,DTFINAL,CODPROD,VLRDESC,CODEMP,NUPROMOCAO,DESCRPROMOCAO"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "E9683289E33A955307014CFA970A5AEF",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "2",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "DTINICIAL"
   *                             },
   *                             {
   *                                 "name": "DTFINAL"
   *                             },
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "VLRDESC"
   *                             },
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "NUPROMOCAO"
   *                             },
   *                             {
   *                                 "name": "DESCRPROMOCAO"
   *                             },
   *                             {
   *                                 "name": "Produto_DESCRPROD"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": [
   *                     {
   *                         "f6": {
   *                             "$": "EMPRESA 25 PROMOÇÕES SAZONAIS "
   *                         },
   *                         "f7": {
   *                             "$": "TELEVISÃO LED SONY 4K"
   *                         },
   *                         "f8": {
   *                             "$": "TESTE EFD ICMS/IPI"
   *                         },
   *                         "f0": {
   *                             "$": "19/06/2020"
   *                         },
   *                         "f1": {
   *                             "$": "01/08/2020"
   *                         },
   *                         "f2": {
   *                             "$": "869"
   *                         },
   *                         "f3": {
   *                             "$": "0"
   *                         },
   *                         "f4": {
   *                             "$": "25"
   *                         },
   *                         "f5": {
   *                             "$": "303"
   *                         }
   *                     }
   *                 ]
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Promoções - Quantidade
   */
  getPromocaoquantidade(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/PromocaoQuantidade', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Esta “Ligação Nota Pedido” recebe uma ação, que é feita no
   * portal de vendas que armazena o número do pedido original, ligando ele ao número da nota
   * gerado.Sendo assim, o sistema busca número da nota, quantidade atendida, status nota e
   * pedido de origem.<br />
   * <b><font color=red>IMPORTANTE:</font></b> Um pedido pode ser faturado várias vezes, caso
   * isto aconteça o mesmo pedido pode estar ligado a várias notas conforme o pedido foi
   * sendo faturado.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044593974-Central-de-Compras-Grade-Itens-Bot%C3%A3o-Outras-Op%C3%A7%C3%B5es<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>CompraVendavariosPedido</b> que
   * por sua vez instancia a tabela TGFVAR mapeando os campos principais.<br /><br /> Para
   * realizarmos a busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * <b>NUNOTA</b> para poder pesquisar as <b>notas com os Pedidos faturados</b>, porém você
   * pode utilizar outros campos da entidade. .<br /><br /> <b>• NUNOTA</b> – Número único da
   * nota.<br />   <b>• NUNOTAORIG</b> – Número único do Pedido.<br />  
   * <b><font color=red>IMPORTANTE:</font></b> Um pedido pode ser faturado várias vezes, caso
   * isto aconteça o mesmo pedido pode estar ligado a várias notas conforme o pedido foi
   * sendo faturado.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *                 "criteria": {
   *                     "expression": {
   *                         "$": "(this.NUNOTA = ? )"
   *                     },
   *                     "parameter": [
   *                         {
   *                             "$": "7438",
   *                             "type": "I"
   *                         }
   *                     ]
   *                 }
   *                   
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFVAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFVAR<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "requestBody": {
   *             "dataSet": {
   *                 "rootEntity": "CompraVendavariosPedido",
   *                 "includePresentationFields": "S",
   *                 "offsetPage": "0",
   *                 "criteria": {
   *                     "expression": {
   *                         "$": "(this.NUNOTA = ? )"
   *                     },
   *                     "parameter": [
   *                         {
   *                             "$": "7438",
   *                             "type": "I"
   *                         }
   *                     ]
   *                 },
   *                 "entity": {
   *                     "fieldset": {
   *                         "list": "NUNOTA,SEQUENCIA,QTDATENDIDA,STATUSNOTA,NUNOTAORIG"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "E59E754F1CB4FC5A4FDE4166D2438EBD",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "NUNOTA"
   *                             },
   *                             {
   *                                 "name": "SEQUENCIA"
   *                             },
   *                             {
   *                                 "name": "QTDATENDIDA"
   *                             },
   *                             {
   *                                 "name": "STATUSNOTA"
   *                             },
   *                             {
   *                                 "name": "NUNOTAORIG"
   *                             },
   *                             {
   *                                 "name": "SEQUENCIAORIG"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "_rmd": {
   *                         "SEQUENCIAORIG": {
   *                             "$":
   * "{\"decVlr\":6,\"decQtd\":0,\"controle\":{\"tipoContEst\":\"N\",\"listaContEst\":[\"\"]}}",
   *                             "provider": "TGFVARPRODUTORMP"
   *                         }
   *                     },
   *                     "f0": {
   *                         "$": "7438"
   *                     },
   *                     "f1": {
   *                         "$": "1"
   *                     },
   *                     "f2": {
   *                         "$": "10"
   *                     },
   *                     "f3": {
   *                         "$": "L"
   *                     },
   *                     "f4": {
   *                         "$": "7436"
   *                     },
   *                     "f5": {
   *                         "$": "1"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta - Ligação Nota x Pedido
   */
  getLigacaonotapedido(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/LigacaoNotaPedido', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Utilizando a API é possível realizar a inclusão, ou
   * atualização, de dados no SankhyaOm. Para isso, utilizamos o serviço "DatasetSP.save". O
   * mesmo serviço é utilizado para ambos os casos, o que vai indicar se é inclusão ou
   * atualização é o envio da chave primária do registro ou não, ou seja, ao enviar a chave
   * primária indica a necessidade de atualização, e caso a chave primária não seja enviada,
   * a API entende que é necessário fazer a inclusão do registro.<br />
   * <h3>Exemplo de uso</h3> <br /><b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json
   * <br /><br />
   * <b>Vejamos agora a estrutura base da requisição para incluir e atualizar dados via
   * API:</b>
   *
   *     {
   *        "serviceName":"DatasetSP.save",
   *        "requestBody":{
   *           "entityName":"NomeDaEntidade",
   *           "standAlone":false,
   *           "fields":[ "CAMPO_1",
   *             "CAMPO_2",
   *             "CAMPO_N"
   *           ],
   *           "records":[
   *              {
   *                 "pk":{  // deve ser enviado apenas para situação de atualização
   *                    "NOME_PK":"VALOR_PK"
   *                 },
   *                 "values":{
   *                    "0": "VALOR_1",
   *                    "1": "VALOR_2",
   *                    "2": "VALOR_N"
   *                 }
   *              }
   *           ]
   *        }
   *     }
   *
   * <br />Esta estrutura é padrão, e permite fazer inclusão, e atualização, em qualquer
   * entidade existente no SankhyaOm. Para isso, basta indicar a Entidade (entityName), os
   * campos (fields) e os respectivos valores (records).
   * <br />Veremos a seguir 2 exemplos práticos de inclusão e atualização de registros. <br
   * /><br /><br />
   * <h2>Como fazer a inclusão de dados?</h2> Agora que temos a estrutura base da requisição
   * para incluir e atualizar dados via API, vamos apresentar um exemplo de inclusão
   * utilizando registros com PK simples e com PK composta. Veja a seguir a inclusão de um
   * Parceiro e seu contato.
   * <b>Exemplo para incluir parceiro:</b>
   *
   *     {
   *        "serviceName":"DatasetSP.save",
   *        "requestBody":{
   *           "entityName":"Parceiro",
   *           "standAlone":false,
   *           "fields":[
   *              "CODPARC",
   *              "NOMEPARC",
   *              "ATIVO",
   *              "TIPPESSOA",
   *              "CODCID",
   *              "CODREG",
   *              "CLASSIFICMS",
   *              "ComplementoParc.SUGTIPNEGENTR",
   *              "ComplementoParc.SUGTIPNEGSAID"
   *           ],
   *           "records":[
   *              {
   *                 "values":{
   *                    "1":"NOME DO PARCEIRO BEM AQUI",
   *                    "2":"S",
   *                    "3":"F",
   *                    "4":"1",
   *                    "5":"0",
   *                    "6":"C",
   *                    "7":"13",
   *                    "8":"13"
   *                 }
   *              }
   *           ]
   *        }
   *     }
   *     
   * <b><font size=2px>Retorno em json:</b><br /></font>
   *
   *     {
   *         "serviceName": "DatasetSP.save",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "EAE26797DAF8A192B2FFF990097337A7",
   *         "responseBody": {
   *             "total": "1",
   *             "result": [
   *                 [
   *                     "4454",
   *                     "NOME DO PARCEIRO BEM AQUI",
   *                     "S",
   *                     "F",
   *                     "1",
   *                     "0",
   *                     "C",
   *                     "13",
   *                     "13"
   *                 ]
   *             ]
   *         }
   *     }
   *
   * <br />No retorno, a primeira linha da requisição indica o Código atribuído a este
   * parceiro (neste exemplo 4454).
   * <br />Agora, vamos fazer a inclusão de múltiplos registros utilizando PK do parceiro
   * como chave de ligação para registros de detalhe. O json a seguir inclui dois contatos
   * para o parceiro na entidade Contato que possui PK composta (CODPARC, CODCONTATO). Segue
   * json para incluir os contatos para o parceiro recém incluído:
   * <b>Exemplo para incluir os contatos do parceiro:</b>
   *
   *
   *     {
   *        "serviceName":"DatasetSP.save",
   *        "requestBody":{
   *           "entityName":"Contato",
   *           "standAlone":false,
   *           "fields":[
   *              "CODCONTATO",
   *              "ATIVO",
   *              "NOMECONTATO",
   *              "EMAIL",
   *              "CELULAR"
   *           ],
   *           "records":[
   *              {
   *                 "foreignKey":{
   *                    "CODPARC":"4454"
   *                 },
   *                 "values":{
   *                    "1":"S",
   *                    "2":"Nome do Contato 1",
   *                    "4":"33  999998888"
   *                 }
   *              },
   *              {
   *                 "foreignKey":{
   *                    "CODPARC":"4454"
   *                 },
   *                 "values":{
   *                    "1":"S",
   *                    "2":"Nome do Contato 2",
   *                    "4":"33  999998888"
   *                 }
   *              }
   *           ]
   *        }
   *     }
   *     
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *
   *     {
   *         "serviceName": "DatasetSP.save",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "A0B2291C8ED35C5DD22E42B36B98BE97",
   *         "responseBody": {
   *             "total": "2",
   *             "result": [
   *                 [
   *                     "1",
   *                     "S",
   *                     "NOME DO CONTATO 1",
   *                     "",
   *                     "33  999998888"
   *                 ],
   *                 [
   *                     "2",
   *                     "S",
   *                     "NOME DO CONTATO 2",
   *                     "",
   *                     "33  999998888"
   *                 ]
   *             ]
   *         }
   *     }
   *
   *
   * <br />Dessa forma, com uma requisição conseguimos realizar múltiplas inclusões. Note que
   * incluirmos o contato código 1 e 2 para o parceiro 4454.
   * <br />Vale ressaltar que não é necessário enviar todos os dados (records) indicados na
   * seção de campos (fields). O exemplo acima indica 5 campos, mas envia apenas 3
   * informações para realizar a inclusão do parceiro.
   * <br /><br />
   * <h2>Como fazer alterações em dados?</h2> Agora que vimos como incluir registros, vamos
   * fazer algumas atualizações nos cadastros incluídos recentemente. Vamos atualizar o nome
   * do parceiro e adicionar e-mails aos contatos que foram vinculados ao parceiro.
   * <br />Para realizar uma atualização de cadastro, basta indicar a PK forte do registro
   * desejado. Vejamos a seguir o json para atualizar o cadastro do parceiro 4454:
   *
   *     {
   *        "serviceName":"DatasetSP.save",
   *        "requestBody": {
   *           "entityName":"Parceiro",
   *           "standAlone":false,
   *           "fields": [
   *              "CODPARC",
   *              "NOMEPARC",
   *              "ATIVO",
   *              "TIPPESSOA"
   *           ],
   *           "records":[
   *              {
   *                 "pk": {
   *                    "CODPARC":"4454"
   *                 },
   *                 "values": {
   *                    "1":"JOSE DA SILVA XAVIER"
   *                 }
   *              }
   *           ]
   *        }
   *     }
   *     
   * <b><font size=2px>Retorno em json:</b><br /></font>
   *
   *     {
   *         "serviceName": "DatasetSP.save",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "E5526480FF334FF05DC6118028A60AE0",
   *         "responseBody": {
   *             "total": "1",
   *             "result": [
   *                 [
   *                     "4454",
   *                     "JOSE DA SILVA XAVIER",
   *                     "S",
   *                     "F"
   *                 ]
   *             ]
   *         }
   *     }
   *     
   * <br />Agora vamos atualizar o cadastro dos dois contatos, adicionando e-mails aos
   * mesmos. Segue json para realizar a requisição:
   *
   *     {
   *        "serviceName":"DatasetSP.save",
   *        "requestBody":{
   *           "entityName":"Contato",
   *           "standAlone":false,
   *           "fields":[
   *              "CODCONTATO",
   *              "ATIVO",
   *              "NOMECONTATO",
   *              "EMAIL",
   *              "CELULAR"
   *           ],
   *           "records":[
   *              {
   *                 "pk":{
   *                    "CODPARC":"4454",
   *                    "CODCONTATO":"1"
   *                 },
   *                 "values":{
   *                    "3":"financeiro@empresa.com.br"
   *                 }
   *              },
   *              {
   *                 "pk":{
   *                    "CODPARC":"4454",
   *                    "CODCONTATO":"2"
   *                 },
   *                 "values":{
   *                    "3":"comercial@empresa.com.br"
   *                 }
   *              }
   *           ]
   *        }
   *     }
   *     
   * <b><font size=2px>Retorno em json:</b><br /></font>
   *
   *     {
   *         "serviceName": "DatasetSP.save",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "42C865B17822AC52F3F58DFEA7394BE5",
   *         "responseBody": {
   *             "total": "2",
   *             "result": [
   *                 [
   *                     "1",
   *                     "S",
   *                     "NOME DO CONTATO 1",
   *                     "financeiro@empresa.com.br",
   *                     "33  999998888"
   *                 ],
   *                 [
   *                     "2",
   *                     "S",
   *                     "NOME DO CONTATO 2",
   *                     "comercial@empresa.com.br",
   *                     "33  999998888"
   *                 ]
   *             ]
   *         }
   *     }
   *
   * @summary Realizando a inclusão e alteração de dados
   */
  postSalve(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Salve', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta de clientes é necessário definir as
   * funções do parceiro no sistema.Quando você incluir um novo registro do tipo clientes ou
   * mesmo duplicar algum já existente ao salvar este novo registro, o sistema mantém tais
   * opções desmarcadas, ou seja, o novo cadastro não terá seu tipo definido
   * automaticamente.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044594494-Cadastro-de-Parceiroso<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Parceiro</b> que por sua vez
   * instancia a tabela TGFPAR mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro os campos
   * CODPARC e CLIENTE, porém você pode utilizar outros campos da entidade .<br /><br />
   * Para utilizar o filtro, basta acrescentar o corpo da requisição o código abaixo
   * utilizando o criteria: 
   *
   *                   "criteria": {
   *                     "expression": {
   *                       "$": "this.CLIENTE = ? and this.CODPARC = ?"
   *                     },
   *                     "parameter": [
   *                        {
   *                          "$": "S",
   *                          "type": "S"
   *                        },
   *                        {
   *                          "$": "648",
   *                          "type": "I"
   *                        }
   *                     ]
   *                   }
   * <h3></h3>                   Para melhor performance sempre utilize nas suas consultas
   * apenas os campos necessários, para evitar tráfego de dados que não serão utilizados.<br
   * />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPAR<br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Parceiro",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CLIENTE = ? and this.CODPARC = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "S",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "648",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODPARC,NOMEPARC,FORNECEDOR,CLIENTE,CODCID,CLIENTE,CLASSIFICMS"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *     
   * <b><font size=2px>Retorno em json:</b><br /></font>
   *           
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "11045006CD6E63CFD528873AA09448AE",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "hasMoreResult": "false",
   *               "offsetPage": "0",
   *               "offset": "0",
   *               "entity": {
   *                   "f1": {
   *                       "$": "TESTE123"
   *                   },
   *                   "f0": {
   *                       "$": "648"
   *                   },
   *                   "f3": {
   *                       "$": "S"
   *                   },
   *                   "f2": {
   *                       "$": "S"
   *                   },
   *                   "f5": {
   *                       "$": "C"
   *                   },
   *                   "f4": {
   *                       "$": "10"
   *                   }
   *               },
   *               "metadata": {
   *                   "fields": {
   *                       "field": [
   *                           {
   *                               "name": "CODPARC"
   *                           },
   *                           {
   *                               "name": "NOMEPARC"
   *                           },
   *                           {
   *                               "name": "FORNECEDOR"
   *                           },
   *                           {
   *                               "name": "CLIENTE"
   *                           },
   *                           {
   *                               "name": "CODCID"
   *                           },
   *                           {
   *                               "name": "CLASSIFICMS"
   *                           }
   *                       ]
   *                   }
   *               }
   *           }
   *       }
   *   }
   *
   * @summary Consulta de Clientes
   */
  getSalve(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Salve', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta de cliente x vendedores no ERP será
   * necessário efetuar o cadastramento preencher, inicialmente, os campos obrigatórios. Pois
   * este cadastro ligará o vendedor/Comprador ao seu parceiro, ou seja, se o vendedor ou
   * comprador é um cliente ou fornecedor da empresa.<br />
   * <b>OBS</b>: Caso tenha alguma necessidade de configuração do ERP procure “consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045111133-Vendedores-Compradores<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Parceiro</b> que por sua vez
   * instancia a tabela TGFPAR mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODVEND, porém você pode utilizar outros campos da entidade .<br /><br />
   * Para utilizar o filtro, basta acrescentar o corpo da requisição o código abaixo
   * utilizando o criteria: 
   *
   *                   "criteria": {
   *                     "expression": {
   *                       "$": "this.CODVEND = ?"
   *                     },
   *                     "parameter": [
   *                        {
   *                          "$": "17",
   *                          "type": "I"
   *                        }
   *                     ]
   *                   }
   * <h3></h3>                   Para melhor performance sempre utilize nas suas consultas
   * apenas os campos necessários, para evitar tráfego de dados que não serão utilizados.<br
   * />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPAR<br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Parceiro",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODVEND = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "17",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODVEND,CODPARC,NOMEPARC"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *     
   * <b><font size=2px>Retorno em json:</b><br /></font>
   *           
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "4696DC25A786AEC3E9E6967BBF97023C",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "2",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODVEND"
   *                             },
   *                             {
   *                                 "name": "CODPARC"
   *                             },
   *                             {
   *                                 "name": "NOMEPARC"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": [
   *                     {
   *                         "f0": {
   *                             "$": "17"
   *                         },
   *                         "f1": {
   *                             "$": "571"
   *                         },
   *                         "f2": {
   *                             "$": "TESTE INTEGRAÇÃO"
   *                         }
   *                     },
   *                     {
   *                         "f0": {
   *                             "$": "17"
   *                         },
   *                         "f1": {
   *                             "$": "572"
   *                         },
   *                         "f2": {
   *                             "$": "GENOVEVO"
   *                         }
   *                     }
   *                 ]
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Clientes x Vendedores
   */
  getClientesvendedores(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/ClientesVendedores', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar o cadastro de clientes é necessário definir as
   * funções do parceiro no sistema.Quando você incluir um novo registro do tipo contato de
   * clientes ou mesmo duplicar algum já existente ao salvar este novo registro, o sistema
   * mantém tais opções desmarcadas, ou seja, o novo cadastro não terá seu tipo definido
   * automaticamente.
   *  <br />
   *
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044594494-Cadastro-de-Parceiros#abacontatos<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Contato</b> que por sua vez
   * instancia a tabela TGFCTT mapeando os campos principais pertinentes ao cadastro de
   * contato de clientes.<br /> Para realizar a importação do cadastro de Contatos de
   * clientes através do Json, os campos abaixo são obrigatórios:<br /><br /> <b>•
   * CODPARC</b> – Código do parceiro(buscar no cadastro de parceiros);<br /> <b>•
   * NOMECONTATO</b> – Nome do Contato.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCTT.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFCTT<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"Contato",
   *              "includePresentationFields":"S",
   *              "dataRow":{
   *                 "localFields":{
   *                    "CODPARC":{
   *                       "$":"569"
   *                    },               
   *                    "NOMECONTATO":{
   *                       "$":"JAMIE LANNISTER"
   *                    },               
   *                    "TELEFONE":{
   *                       "$":"34999998888"
   *                    },               
   *                    "EMAIL":{
   *                       "$":"teste@teste.com.br"
   *                    }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                    "list":"CODPARC,CODCONTATO,NOMECONTATO,TELEFONE,EMAIL"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "4BD75BF4A6B537149505A36B00F09416",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "NOMECONTATO": {
   *                         "$": "JAMIE LANNISTER"
   *                     },
   *                     "Parceiro_NOMEPARC": {
   *                         "$": "JON SNOW"
   *                     },
   *                     "TELEFONE": {
   *                         "$": "34999998888"
   *                     },
   *                     "CODPARC": {
   *                         "$": "569"
   *                     },
   *                     "CODCONTATO": {
   *                         "$": "1"
   *                     },
   *                     "EMAIL": {
   *                         "$": "teste@teste.com.br"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Cadastro de Contato de Clientes
   */
  postContatocliente(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/ContatoCliente', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar consulta de contatos de clientes no sistema ERP
   * é necessário definir as funções do parceiro no sistema. Cada uma das possíveis
   * definições deste campo possuem uma simbologia própria. <br />
   * OBS: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou acesso
   * o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044594494-Cadastro-de-Parceiros#abacontatos<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Contato</b> que por sua vez
   * instancia a tabela TGFCTT mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> Na busca dos dados foi utilizado o campo CODPARC,
   * porém também podem ser utilizados os demais campos para consulta utilizando filtro no
   * corpo da requisição.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *                   "criteria": {
   *                     "expression": {
   *                       "$": "this.CODPARC = ?"
   *                     },
   *                     "parameter": [
   *                        {
   *                          "$": "55",
   *                          "type": "I"
   *                        }
   *                     ]
   *                   }
   *
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCTT.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFCTT<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Contato",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODPARC = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "55",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {   
   *               "list": "CODPARC,CODCONTATO,NOMECONTATO,APELIDO,TELEFONE,EMAIL"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "3ED27462A3E508FCC9E77D77624E5791",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "metadata": {
   *                   "fields": {
   *                       "field": [
   *                           {
   *                               "name": "CODPARC"
   *                           },
   *                           {
   *                               "name": "CODCONTATO"
   *                           },
   *                           {
   *                               "name": "NOMECONTATO"
   *                           },
   *                           {
   *                               "name": "APELIDO"
   *                           },
   *                           {
   *                               "name": "TELEFONE"
   *                           },
   *                           {
   *                               "name": "EMAIL"
   *                           }
   *                       ]
   *                   }
   *               },
   *               "entity": {
   *                   "f0": {
   *                       "$": "8"
   *                   },
   *                   "f1": {
   *                       "$": "1"
   *                   },
   *                   "f2": {
   *                       "$": "CONTATO"
   *                   },
   *                   "f3": {},
   *                   "f4": {},
   *                   "f5": {}
   *               }
   *           }
   *       }
   *   }
   *
   * @summary Consulta de Contatos de Cliente
   */
  getContatocliente(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/ContatoCliente', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta de crédito do cliente é necessário
   * acessar o ERP. O objetivo é agrupar os dados, relacionados às operações de venda do
   * parceiro junto à empresa, ou seja, às informações utilizadas para limitar crédito no ato
   * da venda.<br />
   * OBS: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou acesso
   * o link de apoio:<br />
   * http://grupo.sankhya.com.br/hs/skwajuda-3.16.0/pt_BR/br_com_sankhya_core_cad_parceiros.html#abacrdito<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Parceiro</b> que por sua vez
   * instancia a tabela TGFPAR mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODPARC, porém você pode utilizar outros campos da entidade .<br /><br />
   *
   *  <b>• CODPARC</b> – Código do Parceiro.<br />
   *
   *
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *                   "criteria": {
   *                     "expression": {
   *                       "$": "this.CODPARC = ?"
   *                     },
   *                     "parameter": [
   *                        {
   *                          "$": "1",
   *                          "type": "I"
   *                        }
   *                     ]
   *                   }
   *
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPAR<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Parceiro",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODPARC = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "1",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODPARC,NOMEPARC,LIMCRED,LIMCREDMENSAL"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "2911C09E194BD782FD070D5E3D766F56",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODPARC"
   *                             },
   *                             {
   *                                 "name": "NOMEPARC"
   *                             },
   *                             {
   *                                 "name": "LIMCRED"
   *                             },
   *                             {
   *                                 "name": "LIMCREDMENSAL"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "1"
   *                     },
   *                     "f1": {
   *                         "$": "SANKHYA JIVA GESTÃO DE NEGÓCIOS"
   *                     },
   *                     "f2": {
   *                         "$": "1000"
   *                     },
   *                     "f3": {
   *                         "$": "11"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Créditos de clientes
   */
  getCreditocliente(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/CreditoCliente', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> A API possui um serviço genérico para aplicar consultas em
   * todas as Entidades disponíveis no ERP: <b>CRUDServiceProvider.loadRecords</b>. Por
   * definição, uma entidade mapeia uma tabela que está no banco de dados, vejamos a seguir
   * alguns exemplos de Entidade:<br /> <b>•</b> Entidade Produtos mapena a tabela TGFPRO<br
   * /> <b>•</b> Entidade Parceiros mapeia a tabela TGFPAR<br />
   *
   * <br /> <h3>Exemplo de uso:</h3> <br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br />Vejamos a seguir a estrutura completa de uma requisição do serviço loadRecords:
   *
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "requestBody": {
   *             "dataSet": {
   *                 "rootEntity": "Produto",
   *                 "includePresentationFields": "N",
   *                 "tryJoinedFields": "true",
   *                 "modifiedSince": "2024-04-16T12:59:59",
   *                 "offsetPage": "0",
   *                 "criteria": {
   *                     "expression": {
   *                       "$": "CODPROD IN ( ?, ? ) AND DESCRPROD LIKE '%?%'"
   *                     },
   *                     "parameter": [
   *                         {
   *                             "$": "1",
   *                             "type": "I"
   *                         },
   *                         {
   *                             "$": "2",
   *                             "type": "I"
   *                         },
   *                         {
   *                             "$": "QUEIJO",
   *                             "type": "S"
   *                         }
   *                     ]
   *                 },
   *                 "entity": [
   *                     {
   *                         "path": "",
   *                         "fieldset": {
   *                             "list": "CODPROD, DESCRPROD"
   *                         }
   *                     },
   *                     {
   *                         "path": "GrupoProduto",
   *                         "fieldset": {
   *                             "list": "CODGRUPOPROD, DESCRGRUPOPROD"
   *                         }
   *                     }
   *                 ]
   *             }
   *         }
   *     }
   *
   * Agora, vamos detalhar as propriedades utilizadas:<br /> <ul>
   *   <li>serviceName: nome do serviço e por padrão, sempre será:
   * CRUDServiceProvider.loadRecords
   * rootEntity: nome da entidade a ser consultada.</li>
   *   <li>modifiedSince: faz referência a funcionalidade de logAlteracoesTabelas (<a
   * href="https://developer.sankhya.com.br/reference/get_logalteracoestabelas">clique
   * aqui</a> para mais detalhes sobre o recurso de LogAlteracoesTabelas). Quando esta
   * funcionalidade está habilitada, é possível trazer apenas registros que tiveram alteração
   * a partir de uma determinada data/hora. Vale ressaltar que este parâmetro é opcional, e
   * ao enviar valores o serviço irá considerar “apenas” registros contidos no
   * logAlteracoesTabelas. Caso não tenha informações logadas no sistema, o retorno do
   * serviço será vazio (ZERO registros).</li>
   *   <li>offsetPage: indica a página a ser retornada. A página tem início em 0 (zero) e
   * novas requisições devem ser realizadas, incrementando este valor, sempre que o retorno
   * indicar mais registros através do parametro "hasMoreResult" com valor "true".</li>
   *   <li>criteria -> expression: condição da consulta. Sempre que houver "parâmetros"
   * variáveis, deve ser utilizado os parâmetros (parameter) para indicar os valores para
   * critério da consulta.</li>
   *   <li>criteria -> parameter: deve ser informado os valores para os parâmetros utilizados
   * na consulta (clique aqui para mais detalhes sobre o recurso de critérios nos
   * filtros).</li>
   *   <li>entity: são indicados os campos a serem retornados na consulta. Os campos estão
   * disponíveis no <a
   * href="https://ajuda.sankhya.com.br/hc/pt-br/articles/360044597294-Dicion%C3%A1rio-de-Dados">Dicionário
   * de Dados</a> para identificar quais campos serão necessários em cada entidade
   * consultada. Esta propriedade também permite obter informações de entidades com ligação
   * direta ao registro consultado. Ex.: para buscar um parceiro, através do CODBAI é
   * possível trazer na consulta o nome do bairro. Isso se aplica a qualquer informação com
   * ligação similar a esta (cidade, endereço, perfil, etc.). Clique aqui e para mais
   * detalhes sobre "join" de dados nas consultas.</li>
   * </ul>
   * <br />Vejamos agora um exemplo de consulta de parceiros do tipo "Cliente" realizado na
   * entidade "Parceiro":
   *
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "requestBody": {
   *             "dataSet": {
   *                 "rootEntity": "Parceiro",
   *                 "includePresentationFields": "N",
   *                 "tryJoinedFields": "true",
   *                 "offsetPage": "0",
   *                 "criteria": {
   *                     "expression": {
   *                       "$": "CLIENTE = ?"
   *                     },
   *                     "parameter": [
   *                         {
   *                             "$": "S",
   *                             "type": "S"
   *                         }
   *                     ]
   *                 },
   *                 "entity": [
   *                     {
   *                         "path": "",
   *                         "fieldset": {
   *                             "list": "CODPARC, NOMEPARC, NUMEND, COMPLEMENTO, CEP"
   *                         }
   *                     },
   *                     {
   *                         "path": "Endereco",
   *                         "fieldset": {
   *                             "list":"CODEND, TIPO, NOMEEND"
   *                         }
   *                     },
   *                     {
   *                         "path": "Bairro",
   *                         "fieldset": {
   *                             "list": "CODBAI, NOMEBAI"
   *                         }
   *                     },
   *                     {
   *                         "path": "Cidade",
   *                         "fieldset": {
   *                             "list": "CODCID, NOMECID, UF"
   *                         }
   *                     }
   *                 ]
   *             }
   *         }
   *     }
   *
   * @summary Consultas utilizando loadRecords [para vários registros]
   */
  getLoadrecords(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/loadRecords', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> A API possui um serviço genérico para aplicar consultas em
   * todas as Entidades disponíveis no ERP: <b>CRUDServiceProvider.loadRecord</b> com o
   * objetivo de obter 1 registro. O escopo da requisição é mais simples que
   * <b>CRUDServiceProvider.loadRecord</b> e exige apenas o envio dos critérios por meio da
   * tag "rows".
   *
   * <br /> <h3>Exemplo de uso:</h3> <br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecord&outputType=json
   * <br />Vejamos a seguir a estrutura completa de uma requisição do serviço loadRecords:
   *
   *     {
   *        "serviceName": "CRUDServiceProvider.loadRecord",
   *        "requestBody": {
   *           "dataSet": {
   *              "rootEntity": "Produto",
   *              "entity": [
   *                 {
   *                    "path": "",
   *                    "fieldset": {
   *                       "list": "CODPROD, DESCRPROD"
   *                    }
   *                 },
   *                 {
   *                    "path": "GrupoProduto",
   *                    "fieldset": {
   *                       "list": "CODGRUPOPROD, DESCRGRUPOPROD"
   *                    }
   *                 },
   *                 {
   *                    "path": "AliquotaIPI",
   *                    "fieldset": {
   *                       "list": "CODIPI, PERCENTUAL"
   *                    }
   *                 }
   *              ],
   *              "rows": {
   *                 "row": {
   *                    "CODPROD": {
   *                       "$": "4"
   *                    }
   *                 }
   *              }
   *           }
   *        }
   *     }
   *
   * O retorno para esta requisição é:<br />
   *
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "2B265FCF92393625B097EDE09B031295",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "GrupoProduto_CODGRUPOPROD": {
   *                         "$": "10401"
   *                     },
   *                     "AliquotaIPI_PERCENTUAL": {
   *                         "$": "3"
   *                     },
   *                     "GrupoProduto_DESCRGRUPOPROD": {
   *                         "$": "REVENDA DE PRODUTO IMPORTADO"
   *                     },
   *                     "_rmd": {
   *                         "CODPROD": {
   *                             "$":
   * "{\"decVlr\":2,\"decQtd\":0,\"controle\":{\"tipoContEst\":\"N\",\"listaContEst\":[\"\"],\"usaMascara\":false}}",
   *                             "provider": "PRODUTORMP"
   *                         }
   *                     },
   *                     "DESCRPROD": {
   *                         "$": "AGUA TONICA "
   *                     },
   *                     "CODPROD": {
   *                         "$": "4"
   *                     },
   *                     "AliquotaIPI_CODIPI": {
   *                         "$": "2"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consultas utilizando loadRecord [para registro único]
   */
  getLoadrecord(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/loadRecord', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar consulta de bancos no ERP, será necessário
   * efetuar cadastro correspondente ao banco e sua nomenclatura para o qual você pode
   * pesquisar, inserir um novo registro, exibir a tela em modo grade, entre outras
   * possibilidades.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044598894-Bancos
   *
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Banco</b> que por sua vez
   * instancia a tabela TGFBCO mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * ABREVIATURA, porém você pode utilizar outros campos da entidade .<br /><br />
   *
   *  <b>• ABREVIATURA</b> – Abreviatura do nome do banco.<br />
   *
   *
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *                   "criteria": {
   *                     "expression": {
   *                       "$": "this.ABREVIATURA = ?"
   *                     },
   *                     "parameter": [
   *                        {
   *                          "$": "BB",
   *                          "type": "S"
   *                        }
   *                     ]
   *                   }
   * Caso deseje pesquisar por todos os bancos cadastrados, basta remover o trecho acima do
   * json para retornar todos os bancos cadastrados.
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIBCO.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSIBCO<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Banco",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.ABREVIATURA = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "BB",
   *                  "type": "S"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODBCO,ABREVIATURA,NOMEBCO"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "43AA056D4EC5D13062174576B74FC07F",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODBCO"
   *                             },
   *                             {
   *                                 "name": "ABREVIATURA"
   *                             },
   *                             {
   *                                 "name": "NOMEBCO"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "1"
   *                     },
   *                     "f1": {
   *                         "$": "BB"
   *                     },
   *                     "f2": {
   *                         "$": "Banco do Brasil S.A."
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Bancos
   */
  getBancos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Bancos', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Dado que o usuário precisa cadastrar uma nova conta bancária.
   * Quando a empresa houver uma nova conta, para <b>recebimentos\pagamentos</b> então este
   * será efetivado o cadastro.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044598894-Bancos<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>ContaBancaria</b> que por sua vez
   * instancia a tabela TSICTA mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODPARC, porém você pode utilizar outros campos da entidade .<br />
   *
   *  <b>• CODPARC</b> – Código do Parceiro.
   *  <b>• CODEMP</b> – Código da Empresa.
   *  <b>• CODBCO</b> – Código do Banco.
   *  <b>• CODAGE</b> – Código da Agência.
   *  <b>• CODCTABCO</b> – Número da conta bancária.
   *  <b>• DESCRICAO</b> – Descrição da conta. 
   * <h3></h3> Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *                   "criteria": {
   *                     "expression": {
   *                       "$": "this.CODPARC = ?"
   *                     },
   *                     "parameter": [
   *                        {
   *                          "$": "539",
   *                          "type": "I"
   *                        }
   *                     ]
   *                   }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSICTA.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSICTA<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "ContaBancaria",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODPARC = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "539",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"DESCRICAO,CODBCO,CODAGE,CODCTABCO,CODPARC,CODEMP"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "AED0B597895BFACA992B8B9597B3FC56",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "DESCRICAO"
   *                             },
   *                             {
   *                                 "name": "CODBCO"
   *                             },
   *                             {
   *                                 "name": "CODAGE"
   *                             },
   *                             {
   *                                 "name": "CODCTABCO"
   *                             },
   *                             {
   *                                 "name": "CODPARC"
   *                             },
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "CODCTABCOINT"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f6": {
   *                         "$": "5"
   *                     },
   *                     "f0": {
   *                         "$": "005-Conta Banco do Brasil"
   *                     },
   *                     "f1": {
   *                         "$": "1"
   *                     },
   *                     "f2": {
   *                         "$": "10014"
   *                     },
   *                     "f3": {
   *                         "$": "005"
   *                     },
   *                     "f4": {
   *                         "$": "539"
   *                     },
   *                     "f5": {
   *                         "$": "1"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Contas Bancárias
   */
  getContabancaria(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/ContaBancaria', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Esse serviço permite consultar a data de alteração de um
   * período específico que seja passado no campo dhAlter e entidades específicas passadas no
   * campo Entidade. <br /><br />Para utilizar a API, deve-se fazer uma requisição
   * <b>POST</b> para o endpoint correspondente ao serviço desejado. <br />
   * <h3>Dependências</h3>1) Para que o serviço retorne informações, é necessário habilitar o
   * parametro <b>LOGTABOPER</b> disponível nas Preferencias do SankhyaOm. Este liga ou
   * desliga a funcionalidade de Log. <br />  <img
   * src="https://images2.imgbox.com/44/7b/MmiPYv6O_o.png"></img></a></p> <b>IMPORTANTE:</b>
   * Ao ativar este parâmetro, serão criados gatilhos (triggers) no Banco de Dados. Durante o
   * processo de ativação, pode haver um bloqueio temporário das tabelas, o que pode impactar
   * a performance do SankhyaOM. Para minimizar qualquer impacto negativo no desempenho do
   * sistema, recomendamos que a ativação do parâmetro seja realizada fora do horário de
   * operação. <br> <br /> 2) Temos também o parâmetro <b>LOGTABMAXAGE</b> que permite
   * alterar a quantidade de dias que o Log ficará disponível. Por padrão, o tempo é de 3
   * dias corridos e este parâmetro permite alterar para até 7 dias corridos. Vale ressaltar
   * que não é possível guardar os logs por mais de 7 dias. <br />  <img
   * src="https://images2.imgbox.com/62/0b/eaPMSbWT_o.png"></img></a></p> <h3>Entidades e
   * tabelas logadas</h3> Ao habilitar o parâmetro LOGTABOPER as seguintes entidades terão
   * suas inserções, edições ou deleções logadas para consulta pela API Gateway: <a
   * target="_self"
   * href="https://developer.sankhya.com.br/reference/entidades-para-log-de-altera%C3%A7%C3%A3o">link</a>
   * </br></br> <h3>Detalhes Técnicos</h3> O campo <u>entidades</u> é <b>obrigatório</b>. Ao
   * menos uma entidade deve ser requisitada. <br />O campo <u>dhAlter</u> não é
   * <b>obrigatório</b>. Quando não especificado, todos os logs referentes às entidades são
   * consultados. Ao especificar a data e hora de alteração, são retornados os logs cuja a
   * data de alteração é maior ou igual à dhAlter. <br/><br/> <b>Importante:</b>
   *  - O parâmetro modifiedSince recebe o padrão da data da RFC3339: “YYYY-MM-DDTHH24:MI:SS”
   *  
   *  <br /> <h3>Requisitos Mínimos</h3>
   *  <p> > Versões do SankhyaOM:
   *       <p>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp-&nbsp 4.25b188
   *       <p>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp-&nbsp 4.26b109
   *       <p>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp-&nbsp 4.27 ou superior;
   *   <p> > Banco de dados Oracle 11G ou superior;
   *   <p> > Banco de Dados SQL Server 2017 ou superior.
   *  
   * <p><br /> Para realizarmos a busca através do Json, utilizamos o serviço
   * <i><b>"GatewayServiceProviderSP.logAlteracoesTabelas".</b></i><br />
   * <h3>Exemplo de uso:</h3><br />  <b>URL de chamada:</b>
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=GatewayServiceProviderSP.logAlteracoesTabelas&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "GatewayServiceProviderSP.logAlteracoesTabelas",
   *       "status": "1",
   *       "requestBody": {
   *       "dhAlter": "2023-01-27T11:00:28",
   *       "size":17,
   *       "page":0,
   *       "entidades": [
   *           {
   *             "nome": "Produto"
   *            },
   *            {
   *             "nome": "CabecalhoNota"
   *            },
   *            {
   *             "nome": "ItemNota"
   *            }
   *            {
   *             "nome": "Estoque"
   *            }
   *           ]
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "GatewayServiceProviderSP.logAlteracoesTabelas",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "2F153D4BD713800F9B770DCC4FA1FE12",
   *          "responseBody": {
   *             "registros": [
   *                 {
   *                   "entidade": "Produto",
   *                   "dtAlter": "2023-02-27T08:14:46",
   *                   "evento": "CHANGE",
   *                   "pk": [
   *                      {
   *                       "nomeColumnPk": "CODPROD",
   *                       "valorPk": 1254
   *                      }
   *                    ]
   *                 },
   *                 {
   *                   "entidade": "CabecalhoNota",
   *                   "dtAlter": "2023-02-27T08:14:46",
   *                   "evento": "CHANGE",
   *                   "pk": [
   *                      {
   *                       "nomeColumnPk": "NUNOTA",
   *                       "valorPk": 2144
   *                      }
   *                   ]
   *                 },
   *                 {
   *                     "entidade": "ItemNota",
   *                     "dtAlter": "2023-02-27T09:00:12",
   *                     "evento": "CHANGE",
   *                     "pk": [
   *                         {
   *                             "nomeColumnPk": "NUNOTA",
   *                             "valorPk": 27283
   *                         },
   *                         {
   *                             "nomeColumnPk": "SEQUENCIA",
   *                             "valorPk": 1
   *                         }
   *                     ]
   *                 },
   *                 {
   *                     "entidade": "Estoque",
   *                     "dtAlter": "2023-02-27T09:01:14",
   *                     "evento": "CHANGE",
   *                     "pk": [
   *                         {
   *                             "nomeColumnPk": "CONTROLE",
   *                             "valorPk": "018-23-76800"
   *                         },
   *                         {
   *                             "nomeColumnPk": "TIPO",
   *                             "valorPk": "P"
   *                         },
   *                         {
   *                             "nomeColumnPk": "CODPARC",
   *                             "valorPk": 0
   *                         },
   *                         {
   *                             "nomeColumnPk": "CODLOCAL",
   *                             "valorPk": 70180000
   *                         },
   *                         {
   *                             "nomeColumnPk": "CODPROD",
   *                             "valorPk": 504
   *                         },
   *                         {
   *                             "nomeColumnPk": "CODEMP",
   *                             "valorPk": 1
   *                         }
   *                     ]
   *                 }
   *             ]
   *          }
   *     }
   *     
   * Além disso, existe uma forma de otimizar o processo e utilizar um parametro na
   * requisição direta no loadRecords para puxar apenas registros que foram alterados a
   * partir de um determinado momento. Basta inclui a propriedade
   * <i><b>"modifiedSince".</b></i> na requisição. <br />
   * <h3>Exemplo de uso direto no end-point loadRecords:</h3> <br />
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Parceiro",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "modifiedSince":"2024-04-16T12:59:59",
   *           "criteria": {
   *             "expression": {
   *               "$": ""
   *             }
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODPARC,NOMEPARC,FORNECEDOR,CLIENTE,CODCID,CLIENTE,CLASSIFICMS"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   * O exemplo acima retorna todos os Parceiroso  que foram editados a partir de 16/04/2024
   * 12:59:59, conforme indicado no parametro <i><b>"modifiedSince".</b></i> presente na
   * requisição.
   *
   * @summary Consulta de Histórico de Entidades (LOG de Tabelas)
   */
  getLogalteracoestabelas(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/logAlteracoesTabelas', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> A API REST para cálculo de impostos foi criada para permitir
   * que usuários obtenham informações sobre impostos de pedidos e notas. A API fornece um
   * serviço para cálculo automático de impostos, a partir de dados informados pelo usuário.
   * Esta documentação tem o objetivo de apresentar as funcionalidades e operações da API,
   * bem como os parâmetros de entrada e saída necessários para cada operação.
   *
   *   <b>Como usar a API</b>
   * É necessário enviar uma requisição HTTPS para o endpoint
   * mgecom/CentralVendaRapidaSP.simularValoresNota, contendo os dados do pedido ou nota
   * fiscal. A API retornará informações sobre os impostos do pedido ou nota fiscal.
   * <b>Endpoint:</b> mgecom/CentralVendaRapidaSP.simularValoresNota
   *
   *
   *  <b>Impostos calculados:</b>
   *  - ICMS: ICMS_TGFDIN
   *  - ST (Substituição Tributária): SUBST_TGFDIN
   *  - IPI: IPI_TGFDIN
   *  - IRPJ: IRPJ_TGFDIN
   *  - CPP: CPP_TGFDIN
   *  - ISS: ISS_TGFDIN
   *  - INSS: INSS_TGFDIN
   *  - PIS: PIS_TGFDIN
   *  - COFINS: COFINS_TGFDIN
   *  - IRF: IRF_TGFDIN
   *  - CSSL: CSSL_TGFDIN
   *  - Outros: Outros_TGFDIN
   *
   * <h3>Dependências</h3> <b><font color=red> - Serviço disponível a partir da versão 4.19
   * do SankhyOm. </font></b><br /> <b><font color=red> - Os impostos retornados dependem das
   * configurações da base (EIP) consultada. Nem todas as bases trabalham com todos os
   * impostos.</font></b><br /> <h3>Detalhes Técnicos</h3> Os parâmetros obrigatórios para a
   * consulta:
   *   <br />Cabeçalho:
   *   - nuNotaModelo: Nota modelo usada para preencher campos opcionais não passados na
   * requisição.
   *   - codTipOper: Tipo de operação usada na nota para calculos.
   *   - codParc: Parceiro escolhido na negociação para o cálculo de imposto.
   *   - codEmp: Empresa escolhida na negociação para cálculo.
   *   - codVend: Vendedor escolhido na negociação.
   *   - codTipVend: Tipo Negociação da nota/pedido.
   *   
   *   Item:
   *   - codProd: Produto a ser usado para calculo de impostos. Apenas 1.
   *   - vlrUnit: Valor unitário para uso da venda do produto
   *   - qtdNeg: Quantidade de itens negociados.
   *   - vlrTot: Valor total dos produtos na venda.
   *  
   * Para realizarmos a busca através do Json, utilizamos o serviço
   * <i><b>"mgecom/CentralVendaRapidaSP.simularValoresNota".</b></i><br />
   * <h3>Exemplo de uso:</h3><br />  <b>URL de chamada:</b>
   * https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=CentralVendaRapidaSP.simularValoresNota&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CentralVendaRapidaSP.simularValoresNota",
   *       "requestBody": {
   *         "cabecalho": {
   *           "nuNotaModelo": 656,
   *           "codTipOper": 8,
   *           "codParc": 5,
   *           "codEmp": 2,
   *           "codVend": 2,
   *           "codTipVend": 11
   *           },
   *         "item": {
   *           "codProd": 20,
   *           "qtdNeg": 50,
   *           "vlrUnit": 27.87,
   *           "vlrTot": 1393.5
   *           }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CentralVendaRapidaSP.simularValoresNota",
   *       "status": "1",
   *       "pendingPrinting": "false"
   *       "transactionId": "D48054F8CE82BEC85448B335C770F2A4"
   *       "responseBody":{
   *           "cabecalho": {
   *             "nuNotaModelo": -9999999990,
   *             "codTipOper": 8,
   *             "codParc": 5,
   *             "codEmp": 2,
   *             "codVend": 2,
   *             "codTipVend": 11
   *           },
   *           "itens": [
   *             {
   *               "codProd": 20,
   *               "qtdNeg": 50,
   *               "vlrUnit": 27.87,
   *               "vlrTot": 1393.5,
   *               "impostos": [
   *                   {
   *                     "tipoImposto": "ICMS_TGFDIN",
   *                     "aliq": 12.000,
   *                     "base": 1393.50,
   *                     "vlr": 167.22,
   *                     "vlrFCP": 0,
   *                     "vlrDifalRem": 0,
   *                     "vlrDifalDest": 0
   *                   }
   *                   {
   *                     "tipoImposto": "SUBST_TGFDIN"
   *                     "aliq": 18.96,
   *                     "base": 1657.71,
   *                     "vlr": 174.95
   *                   }
   *                   {
   *                     "tipoImposto": "IPI_TGFDIN"
   *                     "aliq": 3,
   *                     "base": 1393.50,
   *                     "vlr": 41.80
   *                   }
   *                 ]
   *             }
   *            ]
   *        }
   *     }
   *
   * @summary Cálculo de impostos
   */
  getCentralvendarapidaspSimularvaloresnota(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/CentralVendaRapidaSP.simularValoresNota', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta de empresa no sistema ERP é
   * necessário efetuar o cadastramento da empresa com os dados fundamentais de cada uma
   * delas.Pois cada empresa será as unidades que centralizaram a análise dos resultados,
   * sejam de compras e vendas, receitas e despesas, entre outros. <br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045118293-Empresas<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Empresa</b> que por sua vez
   * instancia a tabela TSIEMP mapeando os campos principais.<br /><br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODEMP, porém você pode utilizar outros campos da entidade .<br /><br /> <b>• CODEMP</b>
   * – Código da Empresa.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *                   "criteria": {
   *                     "expression": {
   *                       "$": "this.CODEMP = ?"
   *                     },
   *                     "parameter": [
   *                        {
   *                          "$": "268",
   *                          "type": "I"
   *                        }
   *                     ]
   *                   }
   *
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIEMP.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSIEMP<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Empresa",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODEMP = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "268",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODEMP,RAZAOSOCIAL,NOMEFANTASIA,CGC,INSCESTAD"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "018BA3E66D04B4EC24815FC8A0435F12",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "RAZAOSOCIAL"
   *                             },
   *                             {
   *                                 "name": "NOMEFANTASIA"
   *                             },
   *                             {
   *                                 "name": "CGC"
   *                             },
   *                             {
   *                                 "name": "INSCESTAD"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "200"
   *                     },
   *                     "f1": {
   *                         "$": "SANY TECH LTDA"
   *                     },
   *                     "f2": {
   *                         "$": "SANY TECH LTDA"
   *                     },
   *                     "f3": {
   *                         "$": "13830597134"
   *                     },
   *                     "f4": {
   *                         "$": "07395207000151"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Empresas
   */
  getEmpresa(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Empresa', 'get');
  }

  /**
   * O serviço padrão "CRUDServiceProvider.loadRecords" é considerado padrão para realizar
   * consultas em entidades que estão no SankhyaOm. O retorno natural é trazer os dados que
   * estão na entidade. O objetivo deste tutorial é apresentar as vantagens de utilizar as
   * ligações nativas entre as entidades para retornar dados complementares aos registros,
   * como por exemplo, é possível retornar além do Código do Grupo do Produto, também a
   * descrição, informação esta que está em outra entidade. O código a seguir ilustra como
   * esta consulta pode ser realizada:<br />
   * Exemplo de uso:<br /><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "requestBody": {
   *             "dataSet": {
   *                 "rootEntity": "Produto",
   *                 "includePresentationFields": "N",
   *                 "tryJoinedFields":"true",
   *                 "offsetPage": "0",
   *                 "criteria": {
   *                     "expression": {
   *                       "$": "CODPROD = ?"
   *                     },
   *                     "parameter": [
   *                         {
   *                             "$": "1",
   *                             "type": "I"
   *                         }
   *                     ]
   *                 },
   *                 "entity": [
   *                     {
   *                         "path":"",  // fica em branco, representa a entidade principal
   *                         "fieldset": {
   *                             "list": "CODPROD, DESCRPROD"
   *                         }
   *                     },
   *                     {  // adicione as entidades que deseja fazer join
   *                         "path":"GrupoProduto",  // nome da entidade
   *                         "fieldset": {
   *                             "list":"CODGRUPOPROD, DESCRGRUPOPROD"  // campos a retornar
   *                         }
   *                     }
   *                 ]
   *             }
   *         }
   *     }
   *
   * <br />Agora vamos analisar o código com e sem a utilização das ligações. A principal
   * mudança está na tag “entity”. Veja:
   * <br />Sem utilizar ligações:
   *
   *     "entity": {
   *         "fieldset": {
   *             "list": "CODPROD, DESCRPROD"
   *         }
   *     }
   *
   * <br />Utilizando ligações:
   *
   *     "entity": [
   *         {
   *             "path":"",
   *             "fieldset": {
   *                 "list": "CODPROD, DESCRPROD"
   *             }
   *         },
   *         {
   *             "path":"GrupoProduto",
   *             "fieldset": {
   *                 "list":"CODGRUPOPROD, DESCRGRUPOPROD"
   *             }
   *         },
   *         {
   *             "path":"Volume",
   *             "fieldset": {
   *                 "list":"CODVOL, DESCRVOL"
   *             }
   *         }
   *     ]
   *
   * <br />O exemplo acima, retorna o cadastro de produto, a descrição do grupo de produto,
   * bem como a descrição do volume principal.
   *
   * @summary Retornando registros de outras entidades em um loadRecords
   */
  getLoadrecordscomligacoes(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/loadRecordsComLigacoes', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Dentro de uma empresa, o estoque é representado por produtos
   * que estão armazenados em locais que são utilizados para a produção de seu produto ou
   * para suprimir a necessidade da própria empresa.<br /><br /> No ERP Sankhya-Om devemos
   * entender um local de estoque, como uma maneira de classificação e organização dos
   * produtos no estoque da empresa; o destino dos itens a medida que as operações de compra,
   * venda e movimentação interna são realizadas.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044602894-Locais<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Estoque</b> que por sua vez
   * instancia a tabela TGFEST mapeando os campos principais.<br /><br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODPROD, porém você pode utilizar outros campos da entidade .<br /><br /> <b>•
   * CODPROD</b> – Código do Produto.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODPROD = ?"
   *           },
   *           "parameter": [
   *              {
   *                "$": "24",
   *                "type": "I"
   *              }
   *           ]
   *         }
   *
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFEST.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFEST<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Estoque",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODPROD = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "24",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODPROD,WMSBLOQUEADO,CODLOCAL"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "C373171E3E6F607586E03A22E26F1AAC",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "WMSBLOQUEADO"
   *                             },
   *                             {
   *                                 "name": "CODLOCAL"
   *                             },
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "CONTROLE"
   *                             },
   *                             {
   *                                 "name": "CODPARC"
   *                             },
   *                             {
   *                                 "name": "TIPO"
   *                             },
   *                             {
   *                                 "name": "Produto_DESCRPROD"
   *                             },
   *                             {
   *                                 "name": "LocalFinanceiro_DESCRLOCAL"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             },
   *                             {
   *                                 "name": "Parceiro_NOMEPARC"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f6": {
   *                         "$": "P"
   *                     },
   *                     "f7": {
   *                         "$": "KIT 1 (WESLEY)"
   *                     },
   *                     "f8": {
   *                         "$": "Corredor A"
   *                     },
   *                     "f9": {
   *                         "$": "EMPRESA MODELO"
   *                     },
   *                     "f10": {
   *                         "$": "<SEM PARCEIRO>"
   *                     },
   *                     "_rmd": {
   *                         "CODPROD": {
   *                             "$":
   * "{\"decVlr\":2,\"decQtd\":0,\"controle\":{\"tipoContEst\":\"N\",\"listaContEst\":[\"\"]}}",
   *                             "provider": "PRODUTORMP"
   *                         }
   *                     },
   *                     "f0": {
   *                         "$": "54"
   *                     },
   *                     "f1": {
   *                         "$": "0"
   *                     },
   *                     "f2": {
   *                         "$": "1100"
   *                     },
   *                     "f3": {
   *                         "$": "2"
   *                     },
   *                     "f4": {},
   *                     "f5": {
   *                         "$": "0"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Estoque
   */
  getEstoque(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Estoque', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> O cadastro de fornecedores no sistema ERP visa realizar
   * controle de gestão que definirá as funções do parceiro no sistema.Quando você incluir um
   * novo registro do tipo fornecedor ou mesmo duplicar algum já existente ao salvar este
   * novo registro, o sistema mantém tais opções desmarcadas, ou seja, o novo cadastro não
   * terá seu tipo definido automaticamente.<br />
   * OBS: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou acesso
   * o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044594494-Cadastro-de-Parceiros<br />
   * <h3>Dependências</h3> No cadastro de parceiro, a cidade deve constar no cadastro do ERP
   * Sankhya-Om.<br /><br /> Caso não seja informado o CPF ou CNPJ no campo CGC_CPF, deve se
   * informar no campo CLASSIFICMS como("C" - Consumidor Final Não Contribuinte ou P-Produtor
   * Rural). <br />
   *  Para cadastro de Fornecedores, basta acrescentar o campo "FORNECEDOR"no corpo da
   * requisição do JSON indicando "S" para Sim para indicar que o parceiro é fornecedor.
   *  
   *  <h3>Detalhes Técnicos</h3>
   * A entidade utilizada é a <b>Parceiro</b> que por sua vez instancia a tabela TGFPAR
   * mapeando os campos principais pertinentes ao cadastro de fornecedores.<br /> Para
   * realizar a importação do cadastro de fornecedores através do Json, os campos abaixo são
   * obrigatórios:<br /><br /> <b>• TIPPESSOA</b> – Pessoa Física ou Jurídica;<br /> <b>•
   * NOMEPARC</b> – Nome do Parceiro; <br /> <b>• CODCID</b> – Código de cidade;</b> <br />
   * <b>• ATIVO</b> – Parceiro ativo(S - Sim ou N - Não); <br /> <b>• FORNECEDOR</b> –
   * Parceiro é fornecedor(S - Sim ou N - Não); <br /> <b>• CLASSIFICMS</b> – ("C" -
   * Consumidor Final Não Contribuinte ou P-Produtor Rural). <br /><br /><br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPAR<br />          
   * Exemplo de uso:<br /><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"Parceiro",
   *              "includePresentationFields":"S",
   *              "dataRow":{
   *                 "localFields":{
   *                    "TIPPESSOA":{
   *                       "$":"F"
   *                    },               
   *                    "NOMEPARC":{
   *                       "$":"FORNECEDORXXX"
   *                    },               
   *                    "CODCID":{
   *                       "$":"10"
   *                    },               
   *                    "ATIVO":{
   *                       "$":"S"
   *                    },
   *                     "CLIENTE":{
   *                         "$":"S"
   *                     },
   *                     "CLASSIFICMS":{
   *                         "$":"C"
   *                     },
   *                     "FORNECEDOR":{
   *                         "$":"S"
   *                     }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                   
   * "list":"CODPARC,TIPPESSOA,NOMEPARC,CODCID,ATIVO,FORNECEDOR,CLASSIFICMS"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "F58A5ED2A26C41F5536A63B7DB34FAE8",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "TIPPESSOA": {
   *                         "$": "F"
   *                     },
   *                     "ATIVO": {
   *                         "$": "S"
   *                     },
   *                     "NOMEPARC": {
   *                         "$": "FORNECEDORXXX"
   *                     },
   *                     "CLASSIFICMS": {
   *                         "$": "C"
   *                     },
   *                     "CODPARC": {
   *                         "$": "566"
   *                     },
   *                     "CODCID": {
   *                         "$": "10"
   *                     },
   *                     "FORNECEDOR": {
   *                         "$": "S"
   *                     },
   *                     "Cidade_NOMECID": {
   *                         "$": "TESTE"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Cadastro de Fornecedores
   */
  postFornecedor(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Fornecedor', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta de fornecedores é necessário definir
   * as funções do parceiro no sistema.Quando você, incluir um novo registro do tipo
   * fornecedor ou mesmo duplicar algum já existente ao salvar este novo registro, o sistema
   * mantém tais opções desmarcadas, ou seja, o novo cadastro não terá seu tipo definido
   * automaticamente.<br />
   * OBS: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou acesso
   * o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044594494-Cadastro-de-Parceiros<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Parceiro</b> que por sua vez
   * instancia a tabela TGFPAR mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro os campos
   * CODPARC e FORNECEDOR, porém você pode utilizar outros campos da entidade .<br /><br />
   * Para utilizar o filtro, basta acrescentar o corpo da requisição o código abaixo
   * utilizando o criteria: 
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.FORNECEDOR = ? and this.CODPARC = ?"
   *           },
   *           "parameter": [
   *              {
   *                "$": "S",
   *                "type": "S"
   *              },
   *              {
   *                "$": "566",
   *                "type": "I"
   *              }
   *           ]
   *         }
   * <h3></h3>                   Para fins de performance na busca de dados, uzilize apenas
   * os campos pertinentes a sua busca, quanto mais campos forem inseridos no corpo da
   * requisição, poderá haver perda de performance no retono dos dados solicitados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPAR<br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Parceiro",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.FORNECEDOR = ? and this.CODPARC = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "S",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "566",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODPARC,NOMEPARC,FORNECEDOR,CLIENTE,CODCID,CLIENTE,CLASSIFICMS"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *     
   * <b><font size=2px>Retorno em json:</b><br /></font>
   *           
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "11045006CD6E63CFD528873AA09448AE",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "hasMoreResult": "false",
   *               "offsetPage": "0",
   *               "offset": "0",
   *               "entity": {
   *                   "f1": {
   *                       "$": "TESTE123"
   *                   },
   *                   "f0": {
   *                       "$": "648"
   *                   },
   *                   "f3": {
   *                       "$": "S"
   *                   },
   *                   "f2": {
   *                       "$": "S"
   *                   },
   *                   "f5": {
   *                       "$": "C"
   *                   },
   *                   "f4": {
   *                       "$": "10"
   *                   }
   *               },
   *               "metadata": {
   *                   "fields": {
   *                       "field": [
   *                           {
   *                               "name": "CODPARC"
   *                           },
   *                           {
   *                               "name": "NOMEPARC"
   *                           },
   *                           {
   *                               "name": "FORNECEDOR"
   *                           },
   *                           {
   *                               "name": "CLIENTE"
   *                           },
   *                           {
   *                               "name": "CODCID"
   *                           },
   *                           {
   *                               "name": "CLASSIFICMS"
   *                           }
   *                       ]
   *                   }
   *               }
   *           }
   *       }
   *   }
   *
   * @summary Consulta de Fornecedores
   */
  getFornecedor(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Fornecedor', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> O cadastro de motoristas no sistema ERP visa realizar
   * controle de gestão do responsável pelo veículo.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045111533-Ve%C3%ADculos-<br />
   * <h3>Dependências</h3> No cadastro de parceiro, a cidade deve constar no cadastro do ERP
   * Sankhya-Om.<br /><br /> Caso não seja informado o CPF ou CNPJ no campo CGC_CPF, deve se
   * informar no campo CLASSIFICMS como("C" - Consumidor Final Não Contribuinte ou P-Produtor
   * Rural). <br />
   *  Para cadastro de Motoristas, basta acrescentar o campo "MOTORISTA" no corpo da
   * requisição do JSON indicando "S" para Sim para indicar que o parceiro é motorista.
   *  
   *  <h3>Detalhes Técnicos</h3>
   * A entidade utilizada é a <b>Parceiro</b> que por sua vez instancia a tabela TGFPAR
   * mapeando os campos principais pertinentes ao cadastro de motoristas.<br /> Para realizar
   * a importação do cadastro de motoristas através do Json, os campos abaixo são
   * obrigatórios:<br /><br /> <b>• TIPPESSOA</b> – Pessoa Física ou Jurídica;<br /> <b>•
   * NOMEPARC</b> – Nome do Parceiro; <br /> <b>• CODCID</b> – Código de cidade;</b> <br />
   * <b>• ATIVO</b> – Parceiro ativo(S - Sim ou N - Não); <br /> <b>• MOTORISTA</b> –
   * Parceiro é motorista(S - Sim ou N - Não); <br /> <b>• CLASSIFICMS</b> – ("C" -
   * Consumidor Final Não Contribuinte ou P-Produtor Rural). <br /><br /><br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPAR<br />          
   * Exemplo de uso:<br /><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"Parceiro",
   *              "includePresentationFields":"S",
   *              "dataRow":{
   *                 "localFields":{
   *                    "TIPPESSOA":{
   *                       "$":"F"
   *                    },               
   *                    "NOMEPARC":{
   *                       "$":"JON SNOW"
   *                    },               
   *                    "CODCID":{
   *                       "$":"10"
   *                    },               
   *                    "ATIVO":{
   *                       "$":"S"
   *                    },
   *                     "MOTORISTA":{
   *                         "$":"S"
   *                     },
   *                     "CLASSIFICMS":{
   *                         "$":"C"
   *                     },
   *                     "MOTORISTA":{
   *                         "$":"S"
   *                     }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                   
   * "list":"CODPARC,TIPPESSOA,NOMEPARC,CODCID,ATIVO,FORNECEDOR,CLASSIFICMS"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "F58A5ED2A26C41F5536A63B7DB34FAE8",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "TIPPESSOA": {
   *                         "$": "F"
   *                     },
   *                     "ATIVO": {
   *                         "$": "S"
   *                     },
   *                     "NOMEPARC": {
   *                         "$": "JON SNOW"
   *                     },
   *                     "CLASSIFICMS": {
   *                         "$": "C"
   *                     },
   *                     "CODPARC": {
   *                         "$": "567"
   *                     },
   *                     "CODCID": {
   *                         "$": "10"
   *                     },
   *                     "MOTORISTA": {
   *                         "$": "S"
   *                     },
   *                     "Cidade_NOMECID": {
   *                         "$": "TESTE"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Cadastro de Motoristas
   */
  postMotorista(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/motorista', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Consulta de motoristas no sistema ERP visa realizar controle
   * de gestão do responsável pelo veículo.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045111533-Ve%C3%ADculos-<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Parceiro</b> que por sua vez
   * instancia a tabela TGFPAR mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro os campos
   * CODPARC e MOTORISTA, porém você pode utilizar outros campos da entidade .<br /><br />
   * Para utilizar o filtro, basta acrescentar o corpo da requisição o código abaixo
   * utilizando o criteria: 
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.MOTORISTA = ? and this.CODPARC = ?"
   *           },
   *           "parameter": [
   *              {
   *                "$": "S",
   *                "type": "S"
   *              },
   *              {
   *                "$": "566",
   *                "type": "I"
   *              }
   *           ]
   *         }
   * <h3></h3>                   Para melhor performance sempre utilize nas suas consultas
   * apenas os campos necessários, para evitar tráfego de dados que não serão utilizados.<br
   * />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPAR<br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Parceiro",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.MOTORISTA = ? and this.CODPARC = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "S",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "566",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODPARC,NOMEPARC,MOTORISTA,CODCID,CLASSIFICMS"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *     
   * <b><font size=2px>Retorno em json:</b><br /></font>
   *           
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "11045006CD6E63CFD528873AA09448AE",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "hasMoreResult": "false",
   *               "offsetPage": "0",
   *               "offset": "0",
   *               "entity": {
   *                   "f1": {
   *                       "$": "TESTE123"
   *                   },
   *                   "f0": {
   *                       "$": "567"
   *                   },
   *                   "f3": {
   *                       "$": "S"
   *                   },                            
   *                   "f5": {
   *                       "$": "C"
   *                   },
   *                   "f4": {
   *                       "$": "10"
   *                   }
   *               },
   *               "metadata": {
   *                   "fields": {
   *                       "field": [
   *                           {
   *                               "name": "CODPARC"
   *                           },
   *                           {
   *                               "name": "NOMEPARC"
   *                           },
   *                           {
   *                               "name": "MOTORISTA"
   *                           },                                    
   *                           {
   *                               "name": "CODCID"
   *                           },
   *                           {
   *                               "name": "CLASSIFICMS"
   *                           }
   *                       ]
   *                   }
   *               }
   *           }
   *       }
   *   }
   *
   * @summary Consulta de Motoristas
   */
  getMotorista(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/motorista', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> As principais funções do transporte na logística estão
   * ligadas basicamente às dimensões de tempo e utilidade do lugar. O transporte de
   * mercadorias é utilizado para disponibilizar produtos onde existe demanda potencial,
   * dentro do prazo adequado às necessidades do comprador.<br />
   * O parceiro transportador está vinculado à ordem de carga utilizada para entregar o item
   * do apontamento de entrega.Quando você efetuar a marcação sistema  <b>"transportadora
   * própria"</b>, estará indicando que o parceiro é ou possui a própria transportadora e,
   * portanto, não será gerado pedido de frete  para a conclusão da ordem de despacho.<br />
   * <b>OBS</b>: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044594494-Cadastro-de-Parceiros#abainformaes<br
   * />
   * <h3>Dependências</h3> No cadastro de parceiro, a cidade deve constar no cadastro do ERP
   * Sankhya-Om.<br /><br /> Caso não seja informado o CPF ou CNPJ no campo CGC_CPF, deve se
   * informar no campo CLASSIFICMS como("C" - Consumidor Final Não Contribuinte ou P-Produtor
   * Rural). <br />
   *  Para cadastro de Transportadora, basta acrescentar o campo "TRANSPORTADORA" no corpo da
   * requisição do JSON indicando "S" para Sim para indicar que o parceiro é transportadora.
   *  
   *  <h3>Detalhes Técnicos</h3>
   * A entidade utilizada é a <b>Parceiro</b> que por sua vez instancia a tabela TGFPAR
   * mapeando os campos principais pertinentes ao cadastro de transportadora.<br /> Para
   * realizar a importação do cadastro de transportadora através do Json, os campos abaixo
   * são obrigatórios:<br /><br /> <b>• TIPPESSOA</b> – Pessoa Física ou Jurídica;<br /> <b>•
   * NOMEPARC</b> – Nome do Parceiro; <br /> <b>• CODCID</b> – Código de cidade;</b> <br />
   * <b>• ATIVO</b> – Parceiro ativo(S - Sim ou N - Não); <br /> <b>• TRANSPORTADORA</b> –
   * Parceiro é transportadora(S - Sim ou N - Não); <br /> <b>• CLASSIFICMS</b> – ("C" -
   * Consumidor Final Não Contribuinte ou P-Produtor Rural). <br /><br /><br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPAR<br />          
   * Exemplo de uso:<br /><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"Parceiro",
   *              "includePresentationFields":"S",
   *              "dataRow":{
   *                 "localFields":{
   *                    "TIPPESSOA":{
   *                       "$":"F"
   *                    },               
   *                    "NOMEPARC":{
   *                       "$":"JON SNOW"
   *                    },               
   *                    "CODCID":{
   *                       "$":"10"
   *                    },               
   *                    "ATIVO":{
   *                       "$":"S"
   *                    },
   *                     "TRANSPORTADORA":{
   *                         "$":"S"
   *                     },
   *                     "CLASSIFICMS":{
   *                         "$":"C"
   *                     }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                   
   * "list":"CODPARC,TIPPESSOA,NOMEPARC,CODCID,ATIVO,TRANSPORTADORA,CLASSIFICMS"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "F58A5ED2A26C41F5536A63B7DB34FAE8",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "TIPPESSOA": {
   *                         "$": "F"
   *                     },
   *                     "ATIVO": {
   *                         "$": "S"
   *                     },
   *                     "NOMEPARC": {
   *                         "$": "JON SNOW"
   *                     },
   *                     "CLASSIFICMS": {
   *                         "$": "C"
   *                     },
   *                     "CODPARC": {
   *                         "$": "567"
   *                     },
   *                     "CODCID": {
   *                         "$": "10"
   *                     },
   *                     "TRANSPORTADORA": {
   *                         "$": "S"
   *                     },
   *                     "Cidade_NOMECID": {
   *                         "$": "TESTE"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Cadastro de Transportadora
   */
  postTransportadora(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/transportadora', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> As principais funções do transporte na logística estão
   * ligadas basicamente às dimensões de tempo e utilidade do lugar. O transporte de
   * mercadorias é utilizado para disponibilizar produtos onde existe demanda potencial,
   * dentro do prazo adequado às necessidades do comprador.<br />
   * O parceiro transportador está vinculado à ordem de carga utilizada para entregar o item
   * do apontamento de entrega.Quando você efetuar a marcação sistema  <b>"transportadora
   * própria"</b>, estará indicando que o parceiro é ou possui a própria transportadora e,
   * portanto, não será gerado pedido de frete  para a conclusão da ordem de despacho.<br />
   * <b>OBS</b>: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044594494-Cadastro-de-Parceiros#abainformaes<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Parceiro</b> que por sua vez
   * instancia a tabela TGFPAR mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro os campos
   * CODPARC e TRANSPORTADORA, porém você pode utilizar outros campos da entidade .<br /><br
   * /> Para utilizar o filtro, basta acrescentar o corpo da requisição o código abaixo
   * utilizando o criteria: 
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.TRANSPORTADORA = ? and this.CODPARC = ?"
   *           },
   *           "parameter": [
   *              {
   *                "$": "S",
   *                "type": "S"
   *              },
   *              {
   *                "$": "567",
   *                "type": "I"
   *              }
   *           ]
   *         }
   * <h3></h3>                   Para melhor performance sempre utilize nas suas consultas
   * apenas os campos necessários, para evitar tráfego de dados que não serão utilizados.<br
   * />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPAR<br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Parceiro",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.TRANSPORTADORA = ? and this.CODPARC = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "S",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "567",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODPARC,NOMEPARC,TRANSPORTADORA,CODCID,CLASSIFICMS"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *     
   * <b><font size=2px>Retorno em json:</b><br /></font>
   *           
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "11045006CD6E63CFD528873AA09448AE",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "hasMoreResult": "false",
   *               "offsetPage": "0",
   *               "offset": "0",
   *               "entity": {
   *                   "f1": {
   *                       "$": "TESTE123"
   *                   },
   *                   "f0": {
   *                       "$": "567"
   *                   },
   *                   "f3": {
   *                       "$": "S"
   *                   },                            
   *                   "f5": {
   *                       "$": "C"
   *                   },
   *                   "f4": {
   *                       "$": "10"
   *                   }
   *               },
   *               "metadata": {
   *                   "fields": {
   *                       "field": [
   *                           {
   *                               "name": "CODPARC"
   *                           },
   *                           {
   *                               "name": "NOMEPARC"
   *                           },
   *                           {
   *                               "name": "TRANSPORTADORA"
   *                           },                                    
   *                           {
   *                               "name": "CODCID"
   *                           },
   *                           {
   *                               "name": "CLASSIFICMS"
   *                           }
   *                       ]
   *                   }
   *               }
   *           }
   *       }
   *   }
   *
   * @summary Consulta de Transportadora
   */
  getTransportadora(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/transportadora', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar o cadastro de natureza no sistema ERP deverá
   * inicialmente configurar o parâmetro "Máscara para o Grupo de Naturezas -
   * MASCGRUPONAT".<br />
   * Após a configuração deste parâmetro é possível efetuar a configuração dos grupos de
   * natureza.Nesta tela são cadastrados os grupos de natureza e nesses grupos é possível
   * vincular as naturezas já existentes no sistema através da aba de naturezas.<br />
   * <b><font color=red>Importante</font></b>: O vínculo do Tipo de Natureza do Grupo de
   * Naturezas deve ser feito antes de vincular as Naturezas que farão parte deste ou buscar
   * somente as naturezas que condizem com o tipo de natureza vinculado ao Grupo.<br /> 
   * <b>OBS</b>: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044598514-Grupo-de-Naturezas<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Natureza</b> que por sua vez
   * instancia a tabela TGFNAT mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro os campos
   * CODNAT e CODNATPAI, porém você pode utilizar outros campos da entidade.
   * <h3></h3> Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODNAT = ? and this.CODNATPAI = ?" 
   *           },
   *           "parameter": [
   *              {
   *                "$": "1030000",
   *                "type": "I"
   *              },
   *              {
   *                "$": "1000000",
   *                "type": "I"
   *              }
   *           ]
   *         }
   *
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /><br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFNAT.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFNAT<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Natureza",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODNAT = ? and this.CODNATPAI = ?" 
   *             },
   *             "parameter": [
   *                {
   *                  "$": "1030000",
   *                  "type": "I"
   *                },
   *                {
   *                  "$": "1000000",
   *                  "type": "I"
   *                }
   *             ]
   *           },                                       
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODNAT,CODNATPAI,DESCRNAT"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "45C1D0D33709B2BE0B302B84F9934778",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODNAT"
   *                             },
   *                             {
   *                                 "name": "CODNATPAI"
   *                             },
   *                             {
   *                                 "name": "DESCRNAT"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "1030000"
   *                     },
   *                     "f1": {
   *                         "$": "1000000"
   *                     },
   *                     "f2": {
   *                         "$": "Direito de uso"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Natureza
   */
  getNatureza(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Natureza', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Kit é um conjunto de objetos ‘Produtos’ que são utilizados,
   * para um mesmo fim ou conjunto que podem ser usados, para fazer montagens de objetos ou
   * construções sendo possível encontrar Kit de barbear, kit de Higiene ou kit de primeiros
   * socorros.<br />
   * Através do ERP  sankhya será possível que você efetue o cadastro de produtos Kit e seu
   * respectivo produto substituto.<br />
   * OBS: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou acesso
   * o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044596554-Configura%C3%A7%C3%A3o-de-Kit<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3>
   *   A entidade utilizada é a <b>ConfiguracaoKit</b>, que por sua vez instancia a tabela
   * <b>TSIKIT</b> mapeando os campos principais pertinentes ao cadastro de produto.<br />
   *   Para realizar a importação dos kits através do Json, deve se observar os seguintes
   * campos utilizados no corpo da requisição:<br />
   * <b>• CODCONFKIT</b> – Código da natureza(Este campo não pode ser repetido);<br /> <b>•
   * DESCRCONFKIT</b> – Descrição da natureza;<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIKIT.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSIKIT<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"ConfiguracaoKit",
   *              "includePresentationFields":"S",
   *              "dataRow":{
   *                 "localFields":{
   *                    "CODCONFKIT":{
   *                       "$":"2"
   *                    },               
   *                    "DESCRCONFKIT":{
   *                       "$":"TESTE 2"
   *                    }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                    "list":"*"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.saveRecord",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "A90B6FB8576A41DB39F5BC33DEE04951",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "entity": {
   *                   "UTILPRECOABACOMP": {
   *                       "$": "S"
   *                   },
   *                   "DISTRIBUIKITCOMP": {
   *                       "$": "N"
   *                   },
   *                   "SOMACUSTOCOMPKIT": {
   *                       "$": "S"
   *                   },
   *                   "DISTDESCKITCOMP": {
   *                       "$": "N"
   *                   },
   *                   "SOMAICMSCOMPKIT": {
   *                       "$": "N"
   *                   },
   *                   "SOMAPRECOCOMPKIT": {
   *                       "$": "S"
   *                   },
   *                   "CODCONFKIT": {
   *                       "$": "2"
   *                   },
   *                   "CALCIMPKIT": {
   *                       "$": "S"
   *                   },
   *                   "DESCRCONFKIT": {
   *                       "$": "TESTE 2"
   *                   },
   *                   "EXPLODCOMP": {
   *                       "$": "S"
   *                   }
   *               }
   *           }
   *       }
   *   }
   *
   * @summary Cadastro de Kits de produtos
   */
  postKit(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Kit', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Kit é conjunto de objetos ‘Produtos’ que são utilizados para
   * um mesmo fim ou compõe-se um conjunto de objetos ou itens que para fazer montagens de
   * kits, como por exemplo, um kit de barbear, kit de Higiene ou kit de primeiros
   * socorros.<br /><br /> Através desta tela, tem-se o início de configurações da utilização
   * de Kit e que será possível que você efetue o cadastro de produtos para compor um kit e
   * também seus respectivos substitutos. Será possível realizar configurações e vincular
   * tais produtos que deverão constar na inclusão do kit na grade de matérias-primas na
   * Central-Compras/vendas e Mov.Internas. <br /><br /> Esta tela será apresentada para
   * utilização apenas se o parâmetro "Configuração para Kit Independente  “CONFKITIND"
   * estiver habilitado.
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   *
   *  <h3>Detalhes Técnicos</h3>
   * A entidade utilizada é a <b>ConfiguracaoKit</b> que por sua vez instancia a tabela
   * <b>TSIKIT</b> mapeando os campos principais.<br /> Para realizarmos a busca através do
   * Json, utilizamos o serviço <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br />
   * O serviço CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para
   * consulta de dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como
   * filtro o campo <b>CODCONFKIT</b>, porém você pode utilizar outros campos da entidade
   * .<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODCONFKIT = ?"
   *           },
   *           "parameter": [
   *              {
   *                "$": "999",
   *                "type": "I"
   *              }
   *           ]
   *         }
   *
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIKIT.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela <b>TSIKIT.</b>
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "ConfiguracaoKit",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODCONFKIT = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "999",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODCONFKIT,DESCRCONFKIT"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "87AEFBDA5FEDB977BA7DF9E35012B0F3",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODCONFKIT"
   *                             },
   *                             {
   *                                 "name": "DESCRCONFKIT"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "999"
   *                     },
   *                     "f1": {
   *                         "$": "KIT COVID 19"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Kits de produtos
   */
  getKit(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Kit', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta e plano de contas é necessário
   * efetuar o  cadastramento  das contas contábeis que irão compor o plano de contas da
   * empresa, para que seja possível fazer a inclusão/cadastro, exclusão, consulta e pesquisa
   * das Contas Contábeis.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044608054-Plano-de-Contas<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>PlanoConta</b> que por sua vez
   * instancia a tabela TCBPLA mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro os campos
   * CODCTACTB e CODEMP, porém você pode utilizar outros campos da entidade.
   * <h3></h3> Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODCTACTB = ? and this.CODEMP = ?" 
   *           },
   *           "parameter": [
   *              {
   *                "$": "142",
   *                "type": "I"
   *              },
   *              {
   *                "$": "201",
   *                "type": "I"
   *              }
   *           ]
   *         }
   *
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /><br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TCBPLA.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TCBPLA<br /><br />
   *
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "PlanoConta",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODCTACTB = ? and this.CODEMP = ?" 
   *             },
   *             "parameter": [
   *                {
   *                  "$": "142",
   *                  "type": "I"
   *                },
   *                {
   *                  "$": "201",
   *                  "type": "I"
   *                }
   *             ]
   *           },                                       
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODCTACTB,CODEMP,CTACTB,GRAU,DESCRCTA,CODCTACTBPAI,CODGRUPOCTA"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "CBBE81FDAF61695D8F66B438C03E4E55",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODCTACTB"
   *                             },
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "CTACTB"
   *                             },
   *                             {
   *                                 "name": "GRAU"
   *                             },
   *                             {
   *                                 "name": "DESCRCTA"
   *                             },
   *                             {
   *                                 "name": "CODCTACTBPAI"
   *                             },
   *                             {
   *                                 "name": "CODGRUPOCTA"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f6": {},
   *                     "f7": {
   *                         "$": "A CONSOLIDAR 2"
   *                     },
   *                     "f0": {
   *                         "$": "142"
   *                     },
   *                     "f1": {
   *                         "$": "201"
   *                     },
   *                     "f2": {
   *                         "$": "1.01"
   *                     },
   *                     "f3": {
   *                         "$": "2"
   *                     },
   *                     "f4": {
   *                         "$": "ATIVO CIRCULANTE"
   *                     },
   *                     "f5": {
   *                         "$": "141"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Plano de contas
   */
  getPlanocontas(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/PlanoContas', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta de centro de resultado no ERP
   * necessário, consultar os registros para que o subconjunto ou parte de uma empresa possa
   * ter suas receitas e despesas analisadas separadamente, possibilitando avaliar seu
   * desempenho e compará-lo ao da empresa como um todo.<br />
   * <b>OBS</b>: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044606754-Centros-de-Resultado<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>CentroResultado</b> que por sua
   * vez instancia a tabela TSICUS mapeando os campos principais.<br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODCENCUS, porém você pode utilizar outros campos da entidade .<br /><br /> <b>  •
   * DESCRCENCUS</b> – Descrição do Centro de Resultado;<br /> <b>  • CODCENCUSPAI</b> –
   * Código do Centro de Resultado Pai;<br /> <b>  • GRAU</b> – Grau do Centro de
   * Resultados.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODCENCUS = ? and this.GRAU = ?"
   *           },
   *           "parameter": [
   *              {
   *                "$": "10000",
   *                "type": "I"
   *              },
   *              {
   *                "$": "1",
   *                "type": "I"
   *              }
   *           ]
   *         }
   *         
   * <h3></h3>Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSICUS.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSICUS<br />
   *
   *  <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br />
   *
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "CentroResultado",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODCENCUS = ? and this.GRAU = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "10000",
   *                  "type": "I"
   *                },
   *                {
   *                  "$": "1",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODCENCUS,DESCRCENCUS,CODCENCUSPAI,GRAU"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "F8C6EFC0AA70B9D760BB4C79310FF3F0",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODCENCUS"
   *                             },
   *                             {
   *                                 "name": "DESCRCENCUS"
   *                             },
   *                             {
   *                                 "name": "CODCENCUSPAI"
   *                             },
   *                             {
   *                                 "name": "GRAU"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "10000"
   *                     },
   *                     "f1": {
   *                         "$": "Centro Administrativo"
   *                     },
   *                     "f2": {
   *                         "$": "-999999999"
   *                     },
   *                     "f3": {
   *                         "$": "1"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Centro de Resultados
   */
  getCentroresultado(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/CentroResultado', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> O cadastro de volume visa padronizar as unidades de medida
   * que serão utilizadas para os produtos. É permitida a utilização de várias unidades de
   * medida para o cadastro de um mesmo produto ou serviço; estas poderão ser empregadas nos
   * lançamentos de todos os tipos de movimento, desde a compra até a venda.No ERP efetuar
   * preenchimento dos campos obrigatórios.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044597094-Unidades<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Volume</b> que por sua vez
   * instancia a tabela TGFVOL mapeando os campos principais pertinentes ao cadastro de
   * volumes.<br /> Para realizar a importação do cadastro de Volumes através do Json, os
   * campos abaixo são obrigatórios:<br /><br /> <b>• CODVOL</b> – Código do Volume(Este
   * campo não pode ser repetido);<br /> <b>• DESCRVOL</b> – Descrição do Volume.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFVOL.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFVOL<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"Volume",
   *              "includePresentationFields":"S",
   *              "dataRow":{
   *                 "localFields":{
   *                    "CODVOL":{
   *                       "$":"UN"
   *                    },               
   *                    "DESCRVOL":{
   *                       "$":"Unidade"
   *                    }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                    "list":"*"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.saveRecord",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "9F88E74A9F8B8017D5B09A11BF91EAB5",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "entity": {
   *                   "DECQTD": {},
   *                   "DESCRVOL": {
   *                       "$": "Unidade"
   *                   },
   *                   "UTILIREGVOLWMS": {},
   *                   "UTILICONFPESO": {
   *                       "$": "N"
   *                   },
   *                   "CODVOLFCI": {},
   *                   "CODVOL": {
   *                       "$": "UN"
   *                   }
   *               }
   *           }
   *       }
   *   }
   *
   * @summary Cadastro de Volumes
   */
  postVolume(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Volume', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> A consulta  de volumes visa padronizar as unidades de medida
   * que serão utilizadas para os produtos.Como no sistema, e permitido a utilização de
   * várias unidades de medida para o cadastro de um mesmo produto ou serviço; estas poderão
   * ser empregadas nos lançamentos de todos os tipos de movimento,desde a compra até a
   * venda.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044597094-Unidades
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Volume</b> que por sua vez
   * instancia a tabela TGFVOL mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODVOL, porém você pode utilizar outros campos da entidade .<br /><br />
   *
   *  <b>• CODVOL</b> – Código do Volume(Este campo não pode ser repetido);<br />
   *
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODVOL = ?" 
   *           },
   *           "parameter": [
   *              {
   *                "$": "UN",
   *                "type": "S"
   *              }
   *           ]
   *         }
   *         
   * <h3></h3>Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFVOL.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFVOL<br />
   *
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Volume",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODVOL = ?" 
   *             },
   *             "parameter": [
   *                {
   *                  "$": "UN",
   *                  "type": "S"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODVOL,DESCRVOL"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "A070530ED9138D0953A3B565FE735A7D",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODVOL"
   *                             },
   *                             {
   *                                 "name": "DESCRVOL"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "UN"
   *                     },
   *                     "f1": {
   *                         "$": "Unidade"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Volumes
   */
  getVolume(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Volume', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> No ERP sankhya existe várias formas de configurar alíquotas
   * de ICMS para serem utilizadas como base para cálculos de impostos nas operações de
   * entrada e saída de produtos dos estados, isto é, são utilizadas para tributação e
   * fiscalização de empresas. Existem também a possibilidade de se configurar várias regras
   * e exceções de alíquotas de estado para estado.<br />
   * Existem situações que serão necessárias que a empresa configure suas regras de cálculo
   * de impostos nas notas fiscais de acordo com o NCM  “Nomenclatura Comum do Mercosul” dos
   * produtos, pois dessa forma as definições das regras ficam mais fáceis. <br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044602934-Al%C3%ADquotas-de-ICMS<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>AliquotaICMS</b> que por sua vez
   * instancia a tabela TGFICM mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é o serviço para ser utilizado para consulta de dados
   * através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro os campos
   * TIPRESTRICAO e CODRESTRICAO para buscar as alíquotas de ICMS por produtos. .<br /><br />
   *  <b>• TIPRESTRICAO</b> – Tipo de Restrição;         
   *  <b>• CODRESTRICAO</b> – Código da Restrição;<br />
   *  <b>OBS.:</b> O campo <b>CODRESTRIÇÃO</b> recebe os dados de acordo com o tipo e
   * restrição selecionado, por exemplo:<h3></h3><b>
   *  1 - Se a busca da aliquota for por <font color=red><i>"Produto"</i></font>, o campo
   * TIPRESTRICAO recebe a opção <font color=red><i><b>'P'</b> </i></font>e o campo <font
   * color=red><i>CODRESTRICAO</i></font> receberá o código do
   * produto<b>(CODPROD)</b>.</b><br />
   *  2 - Se a busca da aliquota for por <b>Grupo de Produto</b>, o campo <b>TIPRESTRICAO</b>
   * recebe a opção <b>'G'</b> e o campo <b>CODRESTRICAO</b> receberá o código do grupo de
   * produto<b>(CODGRUPOPROD)</b>.<br />
   *  3 - Se a busca da aliquota for por <b>Parceiros</b>, o campo <b>TIPRESTRICAO</b> recebe
   * a opção <b>'E'</b> e o campo <b>CODRESTRICAO</b> receberá o código do Grupo de ICMS do
   * Parceiro.
   *  <hr>
   * <h3></h3>  Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *           "criteria":{
   *              "expression": {
   *                "$": "this.TIPRESTRICAO = ? and this.CODRESTRICAO = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "P",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "127",
   *                  "type": "I"
   *                }
   *             ]
   *           }
   *           
   * <h3></h3>Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFICM.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFICM<br />
   *
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName":"CRUDServiceProvider.loadRecords",
   *       "requestBody":{
   *         "dataSet":{
   *           "rootEntity": "AliquotaICMS",
   *           "includePresentationFields": "N",
   *           "tryJoinedFields":"true",
   *           "offsetPage": "0",
   *           "criteria":{
   *             "expression": {
   *               "$": "this.TIPRESTRICAO = ? and CODRESTRICAO = ?"
   *             },
   *             "parameter": [
   *               {
   *                 "$": "P",
   *                 "type": "S"
   *               },
   *               {
   *                 "$": "127",
   *                 "type": "I"
   *               }
   *             ]
   *           },
   *           "entity": [
   *             {
   *               "path":"",
   *               "fieldset": {
   *                 "list": "DESCRRESTRICAO, CODRESTRICAO, ALIQUOTA"
   *               }
   *             },
   *             {
   *               "path":"UnidadeFederativaOrigem",
   *               "fieldset":{
   *                 "list":"UF"
   *               }
   *             },
   *             {
   *               "path":"UnidadeFederativaDestino",
   *               "fieldset":{
   *                 "list":"UF"
   *               }
   *             }
   *           ]
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "4D65956C491E6946CB573D1F2EF1D5DC",
   *         "responseBody": {
   *             "total": "3",
   *             "askRowsLimit": "0",
   *             "result": [
   *                 [
   *                     "MG",
   *                     "SP",
   *                     "127 PRODUTO PORTAL XML 2",
   *                     "127",
   *                     "25"
   *                 ],
   *                 [
   *                     "MG",
   *                     "SP",
   *                     "127 PRODUTO PORTAL XML 2",
   *                     "127",
   *                     "25"
   *                 ],
   *                 [
   *                     "MG",
   *                     "MG",
   *                     "127 PRODUTO PORTAL XML 2",
   *                     "127",
   *                     "25"
   *                 ]
   *             ]
   *         }
   *     }
   *
   * @summary Consulta de Imposto por Produtos
   */
  getIcmsprodutos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/ICMSProdutos', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> No ERP sankhya existe várias formas de configurar alíquotas
   * de ICMS para serem utilizadas como base para cálculos de impostos nas operações de
   * entrada e saída de produtos dos estados, isto é, são utilizadas para tributação e
   * fiscalização de empresas.Existe também, possibilidade de se configurar também várias
   * regras e exceções de alíquotas de estado para estado.<br />
   * Existem situações em que será necessário a empresa,configurar suas regras de cálculo de
   * impostos nas notas fiscais de acordo com o NCM  “Nomenclatura Comum do Mercosul” dos
   * produtos, pois dessa forma as definições das regras ficam mais fáceis. <br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044602934-Al%C3%ADquotas-de-ICMS<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>AliquotaICMS</b> que por sua vez
   * instancia a tabela TGFICM mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é o serviço para ser utilizado para consulta de dados
   * através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro os campos
   * TIPRESTRICAO e CODRESTRICAO para buscar as alíquotas de ICMS por grupo de produtos. .<br
   * /><br />
   *  <b>• TIPRESTRICAO</b> – Tipo de Restrição;         
   *  <b>• CODRESTRICAO</b> – Código da Restrição;<br />
   *  <b>OBS.:</b> O campo <b>CODRESTRIÇÃO</b> recebe os dados de acordo com o tipo e
   * restrição selecionado, por exemplo:<h3></h3>
   *  1 - Se a busca da aliquota for por <i>"Produto"</i>, o campo <b>TIPRESTRICAO</b> recebe
   * a opção <i><b>'P'</b> </i>e o campo <b><i>CODRESTRICAO</i></b> receberá o código do
   * produto<b>(CODPROD)</b>.<br />
   *  <b>2 - Se a busca da aliquota for por <font color=red><i><b>Grupo de
   * Produto</b></i></font>, o campo TIPRESTRICAO recebe a opção <font
   * color=red><i><b>'G'</b></i></font> e o campo <font
   * color=red><i><b>CODRESTRICAO</b></i></font> receberá o código do grupo de
   * produto<b>(CODGRUPOPROD)</b></b>.<br />
   *  3 - Se a busca da aliquota for por <b>Parceiros</b>, o campo <b>TIPRESTRICAO</b>recebe
   * a opção <b>'E'</b> e o campo CODRESTRICAO receberá o código do Grupo de ICMS do
   * Parceiro.
   *  <hr>
   * <h3></h3>  Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *           "criteria":{
   *              "expression": {
   *                "$": "this.TIPRESTRICAO = ? and this.CODRESTRICAO = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "G",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "1300000",
   *                  "type": "I"
   *                }
   *             ]
   *           }
   *
   * <h3></h3>Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFICM.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFICM<br />
   *
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName":"CRUDServiceProvider.loadRecords",
   *       "requestBody":{
   *         "dataSet":{
   *           "rootEntity": "AliquotaICMS",
   *           "includePresentationFields": "N",
   *           "tryJoinedFields":"true",
   *           "offsetPage": "0",
   *           "criteria":{
   *             "expression": {
   *               "$": "this.TIPRESTRICAO = ? and this.CODRESTRICAO = ?"
   *             },
   *             "parameter": [
   *               {
   *                 "$": "G",
   *                 "type": "S"
   *               },
   *               {
   *                 "$": "1300000",
   *                 "type": "I"
   *               }
   *             ]
   *           },
   *           "entity": [
   *             {
   *               "path":"",
   *               "fieldset": {
   *                 "list": "DESCRRESTRICAO, CODRESTRICAO, ALIQUOTA"
   *               }
   *             },
   *             {
   *               "path":"UnidadeFederativaOrigem",
   *               "fieldset":{
   *                 "list":"UF"
   *               }
   *             },
   *             {
   *               "path":"UnidadeFederativaDestino",
   *               "fieldset":{
   *                 "list":"UF"
   *               }
   *             }
   *           ]
   *         }
   *       }
   *     }
   *
   *
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "E0438B314FEE14E5643204579E60267F",
   *         "responseBody": {
   *             "total": "2",
   *             "askRowsLimit": "0",
   *             "result": [
   *                 [
   *                     "RJ",
   *                     "PI",
   *                     "EQUIPAMENTOS",
   *                     "1300000",
   *                     ""
   *                 ],
   *                 [
   *                     "PE",
   *                     "AL",
   *                     "EQUIPAMENTOS",
   *                     "1300000",
   *                     "0"
   *                 ]
   *             ]
   *         }
   *     }
   *
   * @summary Consulta de Imposto por Grupo de Produtos
   */
  getIcmsgrupoprodutos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/ICMSGrupoProdutos', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> No ERP sankhya existe várias formas de configurar alíquotas
   * de ICMS para serem utilizadas como base para cálculos de impostos nas operações de
   * entrada e saída de produtos dos estados, isto é, são utilizadas para tributação e
   * fiscalização de empresas.Existe também, possibilidade de se configurar também várias
   * regras e exceções de alíquotas de estado para estado.<br />
   * Existem situações em que será necessário a empresa,configurar suas regras de cálculo de
   * impostos nas notas fiscais de acordo com o NCM  “Nomenclatura Comum do Mercosul” dos
   * produtos, pois dessa forma as definições das regras ficam mais fáceis. <br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044602934-Al%C3%ADquotas-de-ICMS<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>AliquotaICMS</b> que por sua vez
   * instancia a tabela TGFICM mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é o serviço para ser utilizado para consulta de dados
   * através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro os campos
   * TIPRESTRICAO e CODRESTRICAO para buscar as alíquotas de ICMS por grupo de parceiros.
   * .<br /><br />
   *  <b>• TIPRESTRICAO</b> – Tipo de Restrição;         
   *  <b>• CODRESTRICAO</b> – Código da Restrição;<br />
   *  <b>OBS.:</b> O campo <b>CODRESTRIÇÃO</b> recebe os dados de acordo com o tipo e
   * restrição selecionado, por exemplo:<h3></h3>
   *  1 - Se a busca da aliquota for por <i>"Produto"</i>, o campo <b>TIPRESTRICAO</b> recebe
   * a opção <i><b>'P'</b> </i>e o campo <b><i>CODRESTRICAO</i></b> receberá o código do
   * parceiros<b>(CODPROD)</b>.<br />
   *  2 - Se a busca da aliquota for por <i><b>Grupo de Produto</b></i>, o campo
   * <b>TIPRESTRICAO</b> recebe a opção <i><b>'G'</b></i> e o campo
   * <i><b>CODRESTRICAO</b></i> receberá o código do grupo de
   * produto<b>(CODGRUPOPROD)</b>.<br />
   *  <b>3 - Se a busca da aliquota for por <font color=red><i><b>Parceiros</b></i></font>, o
   * campo <b>TIPRESTRICAO</b> recebe a opção <font color=red><i><b>'E'</b></i></font> e o
   * campo <font color=red>CODRESTRICAO</font> receberá o código do Grupo de ICMS do
   * Parceiro.</b>
   *  <hr>
   * <h3></h3>  Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *           "criteria":{
   *              "expression": {
   *                "$": "this.TIPRESTRICAO = ? and CODRESTRICAO = ?"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "E",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "10",
   *                  "type": "I"
   *                }
   *             ]
   *           }
   *
   * <h3></h3>Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFICM.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFICM<br />
   *
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *
   *     {
   *       "serviceName":"CRUDServiceProvider.loadRecords",
   *       "requestBody":{
   *         "dataSet":{
   *           "rootEntity": "AliquotaICMS",
   *           "includePresentationFields": "N",
   *           "tryJoinedFields":"true",
   *           "offsetPage": "0",
   *           "criteria":{
   *             "expression": {
   *               "$": "this.TIPRESTRICAO = ? and this.CODRESTRICAO = ?"
   *             },
   *             "parameter": [
   *               {
   *                 "$": "E",
   *                 "type": "S"
   *               },
   *               {
   *                 "$": "10",
   *                 "type": "I"
   *               }
   *             ]
   *           },
   *           "entity": [
   *             {
   *               "path":"",
   *               "fieldset": {
   *                 "list": "DESCRRESTRICAO, CODRESTRICAO, ALIQUOTA"
   *               }
   *             },
   *             {
   *               "path":"UnidadeFederativaOrigem",
   *               "fieldset":{
   *                 "list":"UF"
   *               }
   *             },
   *             {
   *               "path":"UnidadeFederativaDestino",
   *               "fieldset":{
   *                 "list":"UF"
   *               }
   *             }
   *           ]
   *         }
   *       }
   *     }
   *
   *
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "4322B08E0402C5933D5559F44CDCBE46",
   *         "responseBody": {
   *             "total": "2",
   *             "askRowsLimit": "0",
   *             "result": [
   *                 [
   *                     "MG",
   *                     "SP",
   *                     "",
   *                     "10",
   *                     "4"
   *                 ],
   *                 [
   *                     "MG",
   *                     "SP",
   *                     "",
   *                     "100",
   *                     "4"
   *                 ]
   *             ]
   *         }
   *     }
   *
   * @summary Consulta de Imposto por Grupo de Parceiros
   */
  getIcmsgrupoparceiros(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/ICMSGrupoParceiros', 'get');
  }

  /**
   * Quando temos parâmetros variáveis, como é o caso da expressão aqui usada, devemos
   * colocar um '?' onde o valor do parâmetro será injetado. Para cada '?' na expressão
   * devemos ter um elemento 'parameter'. Os possíveis valores para o atributo 'type' são:
   * <ul>
   *   <li>D = Data sem horário</li>
   *   <li>H = Data com horário (no seguinte formato: DD/MM/AAAA HH:MM:SS)</li>
   *   <li>F = Número decimal (decimal separado por '.')</li>
   *   <li>I = Número inteiro</li>
   *   <li>S = Texto</li>
   * </ul> <br />IMPORTANTE: Sempre usar parâmetro para critérios do tipo data, pois colocar
   * a data direto no SQL pode não funcionar corretamente devido ao charset, formato e tipo
   * do banco de dados.
   *
   * <h3>Segue exemplo utilizando filtro com parâmetros</h3> <br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "requestBody": {
   *             "dataSet": {
   *                 "rootEntity": "Produto",
   *                 "includePresentationFields": "N",
   *                 "tryJoinedFields":"true",
   *                 "offsetPage": "0",
   *                 "criteria": {
   *                     "expression": {
   *                       "$": "CODPROD IN ( ?, ? )"
   *                     },
   *                     "parameter":
   *                         [
   *                             {
   *                                 "$": "1",
   *                                 "type": "I"
   *                             },
   *                             {
   *                                 "$": "2",
   *                                 "type": "I"
   *                             }
   *                         ]
   *                 },
   *                 "entity": {
   *                     "fieldset": {
   *                         "list": "CODPROD, DESCRPROD"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * <br />Este exemplo retorna os produtos com código 1 e 2. A seguir um exemplo de
   * utilização com cada tipo de parâmetro, focando na tag “criteria” onde a mudança é
   * necessária:
   * <br />Aplicando filtro com número inteiro:
   *
   *     ...
   *                 "criteria": {
   *                     "expression": {
   *                       "$": "NUNOTA = ?"
   *                     },
   *                     "parameter": [
   *                         {
   *                             "$": "9120",
   *                             "type": "I"
   *                         }
   *                     ]
   *                 },
   *     ...
   *
   * <br />Aplicando filtro com número inteiro utilizando IN:
   *
   *     ...
   *                 "criteria": {
   *                     "expression": {
   *                       "$": "NUNOTA IN (?, ?, ?)"
   *                     },
   *                     "parameter": [
   *                         {
   *                             "$": "9120",
   *                             "type": "I"
   *                         },
   *                         {
   *                             "$": "9141",
   *                             "type": "I"
   *                         },
   *                         {
   *                             "$": "9159",
   *                             "type": "I"
   *                         }
   *                     ]
   *                 },
   *     ...
   *
   * <br />Aplicando filtro com data e hora:
   *
   *     ...
   *                 "criteria": {
   *                     "expression": {
   *                       "$": "DTFATUR >= ?"
   *                     },
   *                     "parameter": [
   *                         {
   *                             "$": "20/05/2022 09:31:43",
   *                             "type": "H"
   *                         }
   *                     ]
   *                 },
   *     ...
   *
   * <br />Aplicando filtro entre datas:
   *
   *     ...
   *                 "criteria": {
   *                     "expression": {
   *                       "$": "DHBAIXA IS NULL AND DTVENC BETWEEN ? AND ?"
   *                     },
   *                     "parameter": [
   *                         {
   *                             "$": "01/05/2022",
   *                             "type": "D"
   *                         },
   *                         {
   *                             "$": "31/05/2022",
   *                             "type": "D"
   *                         }
   *                     ]
   *                 },
   *     ...
   *
   * <br />Aplicando filtro com texto:
   *
   *     ...
   *                 "criteria": {
   *                     "expression": {
   *                       "$": "USOPROD = ? AND DESCRPROD LIKE '%?%'"
   *                     },
   *                     "parameter": [
   *                         {
   *                             "$": "V",
   *                             "type": "S"
   *                         },
   *                         {
   *                             "$": "CHEVE",
   *                             "type": "S"
   *                         }
   *                     ]
   *                 },
   *     ...
   *
   * @summary Utilizando Critérios em Consultas loadRecords
   */
  getLoadrecordscomcriterio(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/loadRecordsComCriterio', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> No ERP sankhya as unidades alternativas deverão ser
   * configuradas considerando a unidade padrão que poderá ser unidade ou caixa, pois o
   * sistema considera unidade padrão para o cálculo das  “unidades alternativas”.<br />
   * Caso haja alguma unidade alternativa já cadastrada, o sistema permitirá que a Unidade
   * Padrão seja alterada para a Unidade Alternativa já cadastrada, permitindo assim, que
   * estas duas sejam iguais.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045112113-Cadastro-de-Produtos-#abaunidadesalternativas<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>VolumeAlternativo</b> que por sua
   * vez instancia a tabela TGFVOA mapeando os campos principais pertinentes ao cadastro de
   * produto.<br /> Para realizar a importação do cadastro de volumes alternativos através do
   * Json, os campos abaixo são obrigatórios:<br /><br /> <b>• CODVOL</b> – Código do
   * Volume;<br /> <b>• CODPROD</b> – Código do Produto;<br /> <b>• DIVIDEMULTIPLICA</b> –
   * Operação;<br /> <b>• QUANTIDADE</b> – Quantidade de volume.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFVOA.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFVOA<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"VolumeAlternativo",
   *              "includePresentationFields":"S",
   *              "dataRow":{
   *                 "localFields":{
   *                    "CODVOL":{
   *                       "$":"UN"
   *                    },               
   *                    "CODPROD":{
   *                       "$":"115"
   *                    },               
   *                    "DIVIDEMULTIPLICA":{
   *                       "$":"M"
   *                    },               
   *                    "QUANTIDADE":{
   *                       "$":"1"
   *                    }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                    "list":"CODVOL,CODPROD,DIVIDEMULTIPLICA,QUANTIDADE"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.saveRecord",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "C8F67F91561AF48B8E9DEBB73A529A37",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "entity": {
   *                   "CONTROLE": {},
   *                   "CODVOL": {
   *                       "$": "UN"
   *                   },
   *                   "QUANTIDADE": {
   *                       "$": "1"
   *                   },
   *                   "Volume_DESCRVOL": {
   *                       "$": "Unidade"
   *                   },
   *                   "CODPROD": {
   *                       "$": "115"
   *                   },
   *                   "DIVIDEMULTIPLICA": {
   *                       "$": "M"
   *                   }
   *               }
   *           }
   *       }
   *     }
   *
   * @summary Cadastro de Volumes alternativos
   */
  postUnidadealternativa(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/UnidadeAlternativa', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> No ERP sankhya as Unidades Alternativas deverão ser
   * configuradas considerando a unidade padrão que poderá ser unidade ou caixa, pois o
   * sistema considera unidade padrão para o cálculo das  “Unidades Alternativas”.<br />
   * Caso haja alguma Unidade Alternativa  já cadastrada, o sistema permitirá que a Unidade
   * Padrão seja alterada para a Unidade Alternativa já cadastrada, permitindo assim, que
   * estas duas sejam iguais.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045112113-Cadastro-de-Produtos-#abaunidadesalternativas<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>VolumeAlternativo</b> que por sua
   * vez instancia a tabela TGFVOA mapeando os campos principais.<br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> Na busca dos dados foram utilizados os campos CODVOL
   * e o campo CODPROD, porém também podem ser utilizados os demais campos para consulta
   * utilizando filtro no corpo da requisição.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODVOL = 'UN' and CODPROD = 115"
   *           },
   *           "parameter": [
   *              {
   *                "$": "UN",
   *                "type": "S"
   *              },
   *              {
   *                "$": "115",
   *                "type": "I"
   *              }
   *           ]
   *         }
   *
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFVOA.html" target="_blank"><b>aqui</b></a>
   * o dicionário de dados da tabela TGFVOA<br /><br /> <h3>Exemplo de uso:</h3><br /> <b>URL
   * de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "VolumeAlternativo",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODVOL = 'UN' and CODPROD = 115"
   *             },
   *             "parameter": [
   *                {
   *                  "$": "UN",
   *                  "type": "S"
   *                },
   *                {
   *                  "$": "115",
   *                  "type": "I"
   *                }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODVOL,CODPROD,DIVIDEMULTIPLICA,QUANTIDADE"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "2FE21EBBD661F7A43DDB9743D839C709",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODVOL"
   *                             },
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "DIVIDEMULTIPLICA"
   *                             },
   *                             {
   *                                 "name": "QUANTIDADE"
   *                             },
   *                             {
   *                                 "name": "CONTROLE"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "UN"
   *                     },
   *                     "f1": {
   *                         "$": "115"
   *                     },
   *                     "f2": {
   *                         "$": "M"
   *                     },
   *                     "f3": {
   *                         "$": "1"
   *                     },
   *                     "f4": {}
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Volumes alternativos
   */
  getUnidadealternativa(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/UnidadeAlternativa', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> <b>CFOP</b> é a abreviação de (Código Fiscal de Operações e
   * Prestações) .É estabelecido pela Receita Federal e é utilizado desta forma no
   * <b>ERP</b>. Para realizar as consultas referente aos <b>CFOP</b>, os mesmos devem estar
   * cadastrados corretamente no <b>ERP</b>.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044600714-CFOP<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>ClassificacaoFiscalOperacao</b>
   * que por sua vez instancia a tabela TGFCFO mapeando os campos principais.<br /> Para
   * realizarmos a busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é o serviço para ser utilizado para consulta de dados
   * através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo CODCFO
   * para buscar os códigos fiscais de operação.<br />
   *  <b>• CODCFO</b> – Código Fiscal do tipo de operação;         
   *  <hr>
   * <h3></h3>  Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *           "criteria":{
   *              "expression": {
   *                 "$": "CODCFO = ?"
   *              },
   *              "parameter":[
   *                 {
   *                    "type":"I",
   *                    "value":3205
   *                 }
   *              ]
   *           }
   *
   * <h3></h3>Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCFO.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFCFO<br />
   *
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *
   *     {
   *       "serviceName":"CRUDServiceProvider.loadRecords",
   *       "requestBody":{
   *         "dataSet":{
   *           "rootEntity": "ClassificacaoFiscalOperacao",
   *           "includePresentationFields": "N",
   *           "tryJoinedFields":"true",
   *           "offsetPage": "0",
   *           "criteria":{
   *             "expression": {
   *               "$": "this.CODCFO = ?"
   *             },
   *             "parameter": [
   *               {
   *                 "$": "3205",
   *                 "type": "I"
   *               }
   *             ]
   *           },
   *           "entity": [
   *             {
   *               "path":"",
   *               "fieldset": {
   *                 "list": "CODCFO, DESCRCFO, TRIBUTADASCIAP, TIPICMS, CODCTACTB, GRUPOCFO,
   * TIPO, CONVPRODUZ, CALCDIFICMS, RECBRUTAEFDBLOCOP, TIPOPERPRODEP"
   *               }
   *             },
   *             {
   *               "path":"PlanoConta",
   *               "fieldset":{
   *                 "list":"DESCRCTA"
   *               }
   *             }
   *           ]
   *         }
   *       }
   *     }
   *
   *
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "AD7534B3BF89E1994F4C90C939AA2650",
   *         "responseBody": {
   *             "total": "1",
   *             "askRowsLimit": "0",
   *             "result": [
   *                 [
   *                     "3205",
   *                     "ANUL VAL REL PREST SERV COMUN",
   *                     "C",
   *                     "1",
   *                     "",
   *                     "",
   *                     "300",
   *                     "",
   *                     "N",
   *                     "N",
   *                     "N",
   *                     ""
   *                 ]
   *             ]
   *         }
   *     }
   *
   * @summary Consulta de CFOP
   */
  getCfop(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/CFOP', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar o cadastro de endereços no sistema ERP
   * necessário realizar o cadastro de forma padronizada.Onde você pode pesquisar, inserir um
   * novo registro, exibir a tela em modo grade, entre outras possibilidades.Uma vez definido
   * o padrão de cadastro para um nome, aconselhamos que este não seja alterado, visando
   * evitar que exista um mesmo registro cadastrado mais de uma vez com nomes diferentes.<br
   * />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure
   * <b>“Consultor”</b> ou acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044602274-Endere%C3%A7os<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Endereco</b> que por sua vez
   * instancia a tabela TSIEND mapeando os campos principais pertinentes ao cadastro de
   * endereço.<br /> Para realizar a importação do cadastro de endereços através do Json, os
   * campos abaixo são obrigatórios:<br /><br /> <b>• NOMEEND</b> – Nome do logradouro;<br />
   * <b>• TIPO</b> – Tipo(rua,avenida e etc.);<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIEND.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSIEND<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"Endereco",
   *              "includePresentationFields":"N",
   *              "dataRow":{
   *                 "localFields":{
   *                    "NOMEEND":{
   *                       "$":"OSVALDO CRUZ"
   *                    },               
   *                    "TIPO":{
   *                       "$":"AVENIDA"
   *                    }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                    "list":"CODEND,NOMEEND,TIPO,CODLOGRADOURO"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "47344F9EF84802BF3C37073E349C771F",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "NOMEEND": {
   *                         "$": "OSVALDO CRUZ"
   *                     },
   *                     "TIPO": {
   *                         "$": "AVENIDA"
   *                     },
   *                     "CODLOGRADOURO": {},
   *                     "CODEND": {
   *                         "$": "450"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Cadastro de Endereços
   */
  postEndereco(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Endereco', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Nesta rotina é realizado a consulta de endereços que serão
   * utilizados nos diversos procedimentos do sistema. Para aprimorar, todos os cadastros e
   * permitir a seleção uniforme, se faz necessário cadastrá-los de forma padronizada.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044602274-Endere%C3%A7os<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Endereco</b> que por sua vez
   * instancia a tabela TSIEND mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODEND, porém você pode utilizar outros campos da entidade .<br /><br />  
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODEND = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":450
   *             }
   *           ]
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIEND.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSIEND<br /> <h3>Exemplo
   * de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Endereco",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODEND = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":450
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODEND,NOMEEND,TIPO,CODLOGRADOURO"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "87BD1010D80509835CCA244A1F54CA94",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "hasMoreResult": "false",
   *               "offsetPage": "0",
   *               "offset": "0",
   *               "metadata": {
   *                   "fields": {
   *                       "field": [
   *                           {
   *                               "name": "CODEND"
   *                           },
   *                           {
   *                               "name": "NOMEEND"
   *                           },
   *                           {
   *                               "name": "TIPO"
   *                           },
   *                           {
   *                               "name": "CODLOGRADOURO"
   *                           }
   *                       ]
   *                   }
   *               },
   *               "entity": {
   *                   "f0": {
   *                       "$": "450"
   *                   },
   *                   "f1": {
   *                       "$": "OSVALDO CRUZ"
   *                   },
   *                   "f2": {
   *                       "$": "AVENIDA"
   *                   },
   *                   "f3": {}
   *               }
   *           }
   *       }
   *     }
   *
   * @summary Consulta de Endereços
   */
  getEndereco(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Endereco', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> No sistema ERP será necessário, efetuar de forma padrão para
   * cadastro do nome do bairro, para melhor organização e visualização dos mesmos; a seleção
   * dos registros se dá independentemente de conter letras maiúsculas ou minúsculas.<br />
   * No sistema a consulta de bairros é independente da consulta de cidades, sendo necessário
   * criar endereços ou bairros com o mesmo nome para cidades distintas; basta cadastrar uma
   * única vez e o mesmo servirá para todas as cidades. Logo, o sistema não permite o
   * cadastro repetido do mesmo bairro.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044599814-Bairro<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Bairro</b> que por sua vez
   * instancia a tabela TSIBAI mapeando os campos principais pertinentes ao cadastro de
   * bairros.<br /> Para realizar a importação do cadastro de bairros através do Json, o
   * campo abaixo é obrigatório:<br /><br /> <b>• NOMEBAI</b> – Nome do bairro.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIBAI.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSIBAI<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"Bairro",
   *              "includePresentationFields":"N",
   *              "dataRow":{
   *                 "localFields":{
   *                    "NOMEBAI":{
   *                       "$":"BOA VISTA"
   *                    }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                    "list":"CODBAI,NOMEBAI"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "EBE466BF0CB4845AF5BA56A06864C2C1",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "NOMEBAI": {
   *                         "$": "BOA VISTA"
   *                     },
   *                     "CODBAI": {
   *                         "$": "417"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Cadastro de Bairros
   */
  postBairro(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Bairro', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta Bairro no sistema, primeiramente
   * será necessário efetuar o cadastro do bairro para melhor organização e visualização dos
   * mesmos; a seleção dos registros se dá independentemente de conter letras maiúsculas ou
   * minúsculas.<br />
   * No sistema a consulta de bairros é independente da consulta de (cidades) sendo
   * necessário criar <b>endereços</b> ou <b>bairros</b> com o mesmo nome para <b>cidades</b>
   * distintas; basta cadastrar uma única vez e o mesmo servirá para todas as cidades.Logo, o
   * sistema não permite o cadastro repetido do mesmo bairro.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044599814-Bairro<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Bairro</b> que por sua vez
   * instancia a tabela TSIBAI mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODBAI, porém você pode utilizar outros campos da entidade .<br /><br />  
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODBAI = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"417"
   *             }
   *           ]
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIBAI.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSIBAI<br /> <h3>Exemplo
   * de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Bairro",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODBAI = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"417"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODBAI,NOMEBAI"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "7BB9E12043A4F153CD8EF0DBC6219F94",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODBAI"
   *                             },
   *                             {
   *                                 "name": "NOMEBAI"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "417"
   *                     },
   *                     "f1": {
   *                         "$": "BOA VISTA"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Bairros
   */
  getBairro(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Bairro', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar o cadastro de cidades no ERP é necessário
   * incluir o código referente a cidade que está sendo cadastrada. Este preenchimento pode
   * ser realizado automaticamente, ou de forma manual.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045110913-Cidades<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Cidade</b> que por sua vez
   * instancia a tabela TSICID mapeando os campos principais pertinentes ao cadastro de
   * produto.<br /> Para realizar a importação do cadastro de cidade através do Json, os
   * campos abaixo são obrigatórios:<br /><br /> <b>• NOMECID</b> – Nome da cidade;<br />
   * <b>• UF</b> – Código da Unidade Federativa;<br /><br /> <b><font
   * color=red>IMPORTANTE:</font></b> Consultar no sistema Sankhya-Om os códigos das Unidades
   * Federativas correspondentes as cidades do cadastro.
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSICID.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSICID<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"Cidade",
   *              "includePresentationFields":"N",
   *              "dataRow":{
   *                 "localFields":{
   *                    "NOMECID":{
   *                       "$":"UBERLANDIA"
   *                    },
   *                    "UF":{
   *                        "$":"2"
   *                    }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                    "list":"CODCID,NOMECID,UF"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "AF908959DEAB9339AE0ABDF26674BA99",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "UF": {
   *                         "$": "2"
   *                     },
   *                     "NOMECID": {
   *                         "$": "UBERLANDIA"
   *                     },
   *                     "CODCID": {
   *                         "$": "490"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Cadastro de Cidades
   */
  postCidade(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Cidade', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar o consulta de cidades no sistema ERP é
   * necessário efetuar o cadastro das cidades. Este preenchimento pode ser realizado
   * automaticamente, ou de forma manual.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045110913-Cidades<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Endereco</b> que por sua vez
   * instancia a tabela TSICID mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODCID, porém você pode utilizar outros campos da entidade.<br /><br /> Para utilizarmos
   * o filtro, basta acrescentar no corpo da requisição o código abaixo utilizando o
   * criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODCID = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"490"
   *             }
   *           ]
   *         }
   *
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSICID.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSICID<br /> <h3>Exemplo
   * de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Cidade",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODCID = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"490"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODCID,NOMECID,UF"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "A5AEA95E7F721374E2AC69B3486E444E",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "hasMoreResult": "false",
   *               "offsetPage": "0",
   *               "offset": "0",
   *               "metadata": {
   *                   "fields": {
   *                       "field": [
   *                           {
   *                               "name": "CODCID"
   *                           },
   *                           {
   *                               "name": "NOMECID"
   *                           },
   *                           {
   *                               "name": "UF"
   *                           },
   *                           {
   *                               "name": "UnidadeFederativa_UF"
   *                           }
   *                       ]
   *                   }
   *               },
   *               "entity": {
   *                   "f0": {
   *                       "$": "490"
   *                   },
   *                   "f1": {
   *                       "$": "UBERLANDIA"
   *                   },
   *                   "f2": {
   *                       "$": "2"
   *                   },
   *                   "f3": {
   *                       "$": "MG"
   *                   }
   *               }
   *           }
   *       }
   *     }
   *
   * @summary Consulta de Cidades
   */
  getCidade(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Cidade', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> O cadastro de regiões no sistema ERP possibilita o
   * fracionamento de determinado espaço geográfico em regiões, facilitando, por exemplo, a
   * cobrança de frete de acordo com a região e a definição de áreas de atuação de
   * vendedores.<br /> 
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br /> 
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044599074-Regi%C3%B5es<br /> 
   * <h3>Dependências</h3> Para realizar a importação do cadastro, deve ser informado o
   * código da Região pai correspondente, por exemplo: Região Triângulo mineiro -> Região pai
   * Minas Gerais.<br /> <br />  Caso não exista a região pai cadastrada, basta cadastrá-la
   * no cadastro de regiões.<br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Regiao</b> que por sua vez
   * instancia a tabela TSIREG mapeando os campos principais pertinentes ao cadastro de
   * produto.<br /> Para realizar a importação do cadastro de região através do Json, os
   * campos abaixo são obrigatórios:<br /><br /> <b>• NOMEREG</b> – Nome da região;<br />
   * <b>• CODREG</b> – Código da Região;<br /> <b>• CODREGPAI</b> – Código da Região pai;<br
   * /><br /> <b><font color=red>IMPORTANTE:</font></b> Consultar no sistema Sankhya-Om os
   * códigos das Regiões do cadastro para região pai.
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIREG.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSIREG<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"Regiao",
   *              "includePresentationFields":"N",
   *              "dataRow":{
   *                 "localFields":{
   *                    "CODREG":{
   *                       "$":"10999"
   *                    }, 
   *                    "NOMEREG":{
   *                       "$":"3 B's do TRIÂNGULO"
   *                    },
   *                    "CODREGPAI":{
   *                        "$":"10100"
   *                    }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                    "list":"CODREG,NOMEREG,CODREGPAI"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "5695FD3A24469EEC772295A2B8C2E5BC",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "CODREG": {
   *                         "$": "10999"
   *                     },
   *                     "CODREGPAI": {
   *                         "$": "10000"
   *                     },
   *                     "NOMEREG": {
   *                         "$": "3 B's do TRIÂNGULO"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Cadastro de Regiões
   */
  postRegiao(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Regiao', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> O cadastro de regiões no sistema ERP possibilita o
   * fracionamento de determinado espaço geográfico em regiões, facilitando, por exemplo, a
   * cobrança de frete de acordo com a região e a definição de áreas de atuação de
   * vendedores.<br /> 
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br /> 
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044599074-Regi%C3%B5es<br /> 
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Regiao</b> que por sua vez
   * instancia a tabela TSIREG mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> Na busca dos dados foi utilizado apenas o campo
   * CODREG, porém também podem ser utilizados os demais campos para consulta utilizando
   * filtro no corpo da requisição.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODREG = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"10999"
   *             }
   *           ]
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIREG.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSIREG<br /> <h3>Exemplo
   * de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Regiao",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODREG = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"10999"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODREG,NOMEREG,CODREGPAI"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "C4C7F19C971319FC582D366ECBE95AD2",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODREG"
   *                             },
   *                             {
   *                                 "name": "NOMEREG"
   *                             },
   *                             {
   *                                 "name": "CODREGPAI"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "10999"
   *                     },
   *                     "f1": {
   *                         "$": "3 B's do TRIÂNGULO"
   *                     },
   *                     "f2": {
   *                         "$": "10000"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Regiões
   */
  getRegiao(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Regiao', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Um projeto pode ser definido como uma decisão empresarial
   * cujos resultados devem ser apurados separadamente do restante do negócio, de modo a
   * avaliar se aquela iniciativa estará gerando os resultados financeiros esperados.<br /> 
   * Para realizar uma consulta de Projetos no ERP o usuário deverá efetuar cadastro
   * preenchendo os campos obrigatórios. <br />
   * <b><font color = red>Nota</font>:</b> As opções no sistema de  "Ativo" e "Analítico" são
   * automáticas do sistema, tem-se que estas já estarão marcadas na inclusão de um novo
   * projeto. Nas demais rotinas do sistema, apenas serão aceitas as linhas "Analíticas", ou
   * seja, os projetos analíticos.<br /> 
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045109073-Projetos<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Projeto</b> que por sua vez
   * instancia a tabela TCSPRJ mapeando os campos principais pertinentes ao cadastro de
   * projeto.<br /><br /> Para realizarmos a busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODPROJ, porém você pode utilizar outros campos da entidade.
   *        
   * <h3></h3> Para utilizarmos o filtro para os campos citados acima, basta acrescentar o
   * corpo da requisição o código abaixo utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODPROJ = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"7"
   *             }
   *           ]
   *         }
   *
   * Para melhor performance sempre utilize nas suas consultas apenas os campos necessários,
   * para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TCSPRJ.html" target="_blank"><b>aqui</b></a>
   * o dicionário de dados da tabela TCSPRJ<br /><br /> <br /> <h3>Exemplo de uso:</h3><br />
   * <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Projeto",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODPROJ = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"7"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODPROJ,IDENTIFICACAO"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "C7A0275CD886A6FDFD9201917C9A60D5",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "hasMoreResult": "false",
   *               "offsetPage": "0",
   *               "offset": "0",
   *               "metadata": {
   *                   "fields": {
   *                       "field": [
   *                           {
   *                               "name": "CODPROJ"
   *                           },
   *                           {
   *                               "name": "IDENTIFICACAO"
   *                           }
   *                       ]
   *                   }
   *               },
   *               "entity": {
   *                   "f0": {
   *                       "$": "1020000"
   *                   },
   *                   "f1": {
   *                       "$": "Projeto 2"
   *                   }
   *               }
   *           }
   *       }
   *     }
   *
   * @summary Consulta de Projetos
   */
  getProjetos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/projetos', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta de rotas no sistema ERP é necessário
   * preencher os dados obrigatórios.Para que seja possível,consultar a rota e o valor que
   * será gasto em cada trajeto do veículo.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:          <a
   * href="https://ajuda.sankhya.com.br/hc/pt-br/articles/360045108613-Rotas"
   * target=_blank>https://ajuda.sankhya.com.br/hc/pt-br/articles/360045108613-Rotas</d>
   *
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Rota</b> que por sua vez
   * instancia a tabela TGFROT mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODROTA, porém você pode utilizar outros campos da entidade .<br /><br /> <b>•
   * CODROTA</b> – Código da Rota.<br />
   * <h3></h3> Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODROTA = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"216"
   *             }
   *           ]
   *         }
   *
   * <h3></h3> Caso deseje pesquisar por todos as rotas cadastrados, basta remover o trecho
   * acima do json para retornar todas as rotas cadastradas previamente.
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFROT.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFROT<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Rota",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODROTA = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"216"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODROTA,DESCRROTA,DISTANCIA"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "DAF689FF87DEDAAF5942CBE75D934484",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODROTA"
   *                             },
   *                             {
   *                                 "name": "DESCRROTA"
   *                             },
   *                             {
   *                                 "name": "DISTANCIA"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "216"
   *                     },
   *                     "f1": {
   *                         "$": "UBERABA"
   *                     },
   *                     "f2": {
   *                         "$": "90"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Rotas
   */
  getRotas(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Rotas', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Por meio do ERP é possível realizar o cadastro de diversas
   * marcas a serem posteriormente utilizadas no cadastro de produtos; é uma configuração que
   * tem por objetivo a padronização das marcas empregadas nos produtos; uma vez que existem
   * algumas marcas que podem ser cadastradas de maneira equivocada (utilização de hífens,
   * espaços etc), a uniformidade deste cadastro atua na prevenção desse tipo de
   * ocorrência.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044602814-Marcas
   *
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>MarcaProduto</b> que por sua vez
   * instancia a tabela TGFMAR mapeando os campos principais pertinentes ao cadastro de
   * produto.<br /> Para realizar a importação do cadastro de marcas de produtos através do
   * Json, os campos abaixo são obrigatórios:<br /><br /> <b>• CODIGO</b> – Código da
   * marca(Este campo não pode ser repetido);<br /> <b>• DESCRICAO</b> – Nome da marca.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFMAR.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFMAR<br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"MarcaProduto",
   *              "includePresentationFields":"S",
   *              "dataRow":{
   *                 "localFields":{
   *                    "CODIGO":{
   *                       "$":"11"
   *                    },               
   *                    "DESCRICAO":{
   *                       "$":"MARCA TESTE"
   *                    }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                    "list":"*"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.saveRecord",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "FCFCF46C112A6792E2F0BD665797BB19",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "entity": {
   *                   "CODIGO": {
   *                       "$": "11"
   *                   },
   *                   "DESCRICAO": {
   *                       "$": "MARCATESTE"
   *                   }
   *               }
   *           }
   *       }
   *     }
   *
   * @summary Cadastro de Marcas de produtos
   */
  postMarcaproduto(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/marcaproduto', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar consulta de marca de produto primeiramente, se
   * deve realizar cadastramento da marca que tem por objetivo a padronização das marcas
   * empregadas nos produtos; uma vez que existem algumas marcas que podem ser cadastradas de
   * maneira equivocada (utilização de hífens, espaços etc), a uniformidade deste cadastro
   * atua na prevenção desse tipo de ocorrência.<br />
   * Além disso, ao inserir uma marca no ERP da mesma nomenclatura de uma marca contida, as
   * modificações efetuadas na nova marca não atingiram a marca anterior, reciprocamente.
   * Deste modo, mantêm-se dois cadastros diferentes que podem causar a perda de padronização
   * das marcas empregadas nos produtos. <b>OBS:</b> Caso tenha alguma necessidade de
   * configuração do ERP procure “Consultor” ou acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044602814-Marcas<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>MarcaProduto </b> que por sua vez
   * instancia a tabela TGFMAR mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODIGO, porém você pode utilizar outros campos da entidade.<br /><br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODIGO = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"666"
   *             }
   *           ]
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFMAR.html" target="_blank"><b>aqui</b></a>
   * o dicionário de dados da tabela TGFMAR<br /><br /> <h3>Exemplo de uso:</h3><br /> <b>URL
   * de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "MarcaProduto",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODIGO = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"666"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODIGO,DESCRICAO"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "status": "1",
   *       "pendingPrinting": "false",
   *       "transactionId": "79C87EB2A2F72A2AA50BF04410B9EC6D",
   *       "responseBody": {
   *           "entities": {
   *               "total": "1",
   *               "hasMoreResult": "false",
   *               "offsetPage": "0",
   *               "offset": "0",
   *               "metadata": {
   *                   "fields": {
   *                       "field": [
   *                           {
   *                               "name": "CODIGO"
   *                           },
   *                           {
   *                               "name": "DESCRICAO"
   *                           }
   *                       ]
   *                   }
   *               },
   *               "entity": {
   *                   "f0": {
   *                       "$": "666"
   *                   },
   *                   "f1": {
   *                       "$": "MARCATESTE"
   *                   }
   *               }
   *           }
   *       }
   *     }
   *
   * @summary Consulta de Marca de produto
   */
  getMarcaproduto(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/marcaproduto', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta de supervisores no sistema ERP,será
   * necessário efetuar o cadastro no sistema,preenchendo os dados obrigatórios como
   * parceiros e cadastro de empresa para que seja possível realizar a consulta e acompanhar
   * negociações de preços e prazos de entrega e estabelecer metas para cumprimento dos
   * objetivos,assim como acompanhar os pedidos dos clientes e identificar suas necessidades,
   * para definir a melhor forma de atendimento.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045111133-Vendedores-Compradores<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Vendedor</b> que por sua vez
   * instancia a tabela TGFVEN mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * TIPVEND setando o campo para 'S' para Supervisor, porém você pode utilizar outros campos
   * da entidade na consulta .<br /><br />
   * Para utilizar o filtro, basta acrescentar o corpo da requisição o código abaixo
   * utilizando o criteria: 
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.TIPVEND = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"S",
   *                "value":"S"
   *             }
   *           ]
   *         }
   *
   * <h3></h3>Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFVEN.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFVEN<br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Vendedor",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.TIPVEND = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"S",
   *                  "value":"S"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODPARC,CODVEND,APELIDO,TIPVEND"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *     
   * <b><font size=2px>Retorno em json:</b><br /></font>
   *           
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "FA8D8B41A84133AD84D8ED6EBB14EEBF",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODPARC"
   *                             },
   *                             {
   *                                 "name": "CODVEND"
   *                             },
   *                             {
   *                                 "name": "APELIDO"
   *                             },
   *                             {
   *                                 "name": "TIPVEND"
   *                             },
   *                             {
   *                                 "name": "Parceiro_NOMEPARC"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "124"
   *                     },
   *                     "f1": {
   *                         "$": "7"
   *                     },
   *                     "f2": {
   *                         "$": "Wanderley"
   *                     },
   *                     "f3": {
   *                         "$": "S"
   *                     },
   *                     "f4": {
   *                         "$": "SUPERVISOR"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Supervisores
   */
  getSupervisores(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Supervisores', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar consulta “Tabela de Preço” no carregamento das
   * regras/exceções da tabela de preço, o sistema irá trazer os registros de forma paginada,
   * ou seja, os dados não irão ser carregados todos de uma vez só. O sistema irá trazer aos
   * poucos os registros, para que você possa ir utilizando a tela enquanto as informações
   * não são totalmente carregadas.<br /> 
   * Além disso, é possível que seja editado um registro (somente no modo formulário)
   * enquanto os demais registros são carregados na tela. Quando estiver sendo feita a edição
   * de um registro e o carregamento de todos os registros for concluído, o sistema irá
   * emitir uma mensagem para  confirmação da edição.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044603854-Tabelas-de-Pre%C3%A7os<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3>
   *  A entidade utilizada é a <b>TabelaPreco</b> que por sua vez instancia a tabela TGFTAB
   * mapeando os campos principais.<br />
   * Para realizarmos a busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords"</b></i><br /><br />
   * O serviço CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para
   * consulta de dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado o campo
   * NUTAB, porém você pode utilizar outros campos da entidade na consulta .<br /><br /> Para
   * utilizar o filtro, basta acrescentar o corpo da requisição o código abaixo utilizando o
   * criteria: 
   *
   *           "criteria": {
   *             "expression": {
   *               "$": "this.NUTAB = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"607"
   *               }
   *             ]
   *           }
   *
   * <b><font color=red>Importante:</font></b> <H3></H3> O elemento criterio motrado acima é
   * utilizado para inserção do filtro desejado. O filtro pode ser de acordo com o campo de
   * pesquisa desejado, como por exemplo:<br /><br /> <b>• NUTAB</b> – Número da Tabela de
   * Preço.<br />
   * <h3></h3>Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFTAB.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFTAB<br />
   * <h3>Exemplo de uso:</h3>
   *   <b>URL de
   * chamada</b>:https://api.sankhya.com.br/gateway/v1/mgecom/service.sbr?serviceName=ConsultaProdutosSP.consultaProdutos&outputType=json
   * <br />
   *
   *
   * <b>Corpo de requisição</b>
   *
   *     {
   *         "serviceName": "ConsultaProdutosSP.consultaProdutos",
   *           "requestBody": {
   *               "filtros": {
   *                   "criterio": {
   *                       "resourceID": "br.com.sankhya.com.cons.consultaProdutos",
   *                       "PERCDESC": "0",
   *                       "CODPROD": {
   *                           "$": "6"
   *                       }
   *                   },
   *                   "isPromocao": {
   *                       "$": "false"
   *                   },
   *                   "isLiquidacao": {
   *                       "$": "false"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "ConsultaProdutosSP.consultaProdutos",
   *           "status": "1",
   *           "pendingPrinting": "false",
   *           "transactionId": "DA7090050593CA45FA74E760480BAA0B",
   *           "responseBody": {
   *               "produtos": {
   *                   "maxregconsprod": {
   *                       "$": "0"
   *                   },
   *                   "produto": {
   *                       "ISPROMOCAO": "false",
   *                       "ISLIQUIDACAO": "false",
   *                       "Cadastro_COMPLDESC": {},
   *                       "Cadastro_CODPROD": {
   *                           "$": "6"
   *                       },
   *                       "Cadastro_DESCRPROD": {
   *                           "$": "AR CONDICIONADO YORK 18.000 BTU'S"
   *                       },
   *                       "TIPCONTEST": {
   *                           "$": "N"
   *                       },
   *                       "TIPLANCNOTA": {
   *                           "$": "A"
   *                       },
   *                       "Preço_1": {
   *                           "$": "0.00",
   *                           "PRECOBASE_Preço_1": "0"
   *                       },
   *                       "DECQTD": {
   *                           "$": "0"
   *                       },
   *                       "ORDEMMEDIDA": {
   *                           "$": "0"
   *                       },
   *                       "Estoque_1": {},
   *                       "DECVLR": {
   *                           "$": "2"
   *                       },
   *                       "CODVOL": {
   *                           "$": "UN"
   *                       },
   *                       "DESCRPROD": {
   *                           "$": "AR CONDICIONADO YORK 18.000 BTU'S"
   *                       },
   *                       "CODPROD": {
   *                           "$": "6"
   *                       },
   *                       "TEMIMAGEM": {
   *                           "$": "N"
   *                       },
   *                       "PRECOBASE": {
   *                           "$": "0.00"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta Tabela de Preços
   */
  getTabelapreco(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/tabelapreco', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Usuários são todas as pessoas que irão executar qualquer
   * rotina no sistema, seja administrativa, financeira, comercial, etc.Para efetuar,consulta
   * de usuários primeiro é necessário efetuar cadastramento no ERP preenchendo os campos
   * obrigatórios com nome da pessoa responsável pelo acesso logo após criar uma senha, feito
   * isso salvar os dados.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044597874-Usu%C3%A1rios<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Usuario</b> que por sua vez
   * instancia a tabela TSIUSU mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * usuários através do JSON.<br /><br /> Na busca dos dados foi utilizado o campo NOMEUSU,
   * porém também podem ser utilizados os demais campos para consulta utilizando filtro no
   * corpo da requisição.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.NOMEUSU = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"S",
   *                "value":"NILSON"
   *             }
   *           ]
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TSIUSU.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TSIUSU<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Usuario",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.NOMEUSU = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"S",
   *                  "value":"NILSON"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODUSU,NOMEUSU,EMAIL"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "EEDF13D8A7B5D9B142B6484764C4EFEE",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODUSU"
   *                             },
   *                             {
   *                                 "name": "NOMEUSU"
   *                             },
   *                             {
   *                                 "name": "EMAIL"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "10"
   *                     },
   *                     "f1": {
   *                         "$": "TESTE"
   *                     },
   *                     "f2": {
   *                         "$": "teste@teste.com.br"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Usuários
   */
  getUsuarios(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Usuarios', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para efetuar consulta vendedores/compradores, e otimizar
   * controle de pagamentos de comissões e acompanhamento de desempenho de vendas e de
   * compras com determinadas características.<br />
   * Para efetuar, consulta necessário efetuar cadastramento dos vendedores/compradores
   * preenchendo no sistema os campos obrigatórios,como parceiros e cadastro da empresa, para
   * que seja possível realizar consulta.<br />
   * OBS: Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou acesso
   * o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045111133-Vendedores-Compradores<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Vendedor</b> que por sua vez
   * instancia a tabela TGFVEN mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> Na busca dos dados foram utilizados os campos
   * CODPARC, porém também podem ser utilizados os demais campos para consulta utilizando
   * filtro no corpo da requisição.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODPARC = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"268"
   *             }
   *           ]
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFVEN.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFVEN<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Vendedor",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODPARC = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"268"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *               "list": "CODVEND,CODPARC,CODPARC,APELIDO"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "DD0EDD0BD9C180F5AEFEE5E3F0BE1F79",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODVEND"
   *                             },
   *                             {
   *                                 "name": "CODPARC"
   *                             },
   *                             {
   *                                 "name": "APELIDO"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "20"
   *                     },
   *                     "f1": {
   *                         "$": "268"
   *                     },
   *                     "f2": {
   *                         "$": "VENDEDOR 1"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Vendedor
   */
  getVendedores(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Vendedores', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar a consulta de metas por vendedor no ERP,
   * necessário efetuar as devidas configurações e definição de metas por vendedor
   * primeiramente, pois logo que uma vez que as metas já estão configuradas, você também
   * poderá definir metas por períodos mensais. Além de lançar metas, você poderá também
   * configurar para quais TOP's o sistema considerará na atualização do realizado.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045117773-Metas-Simplificadas-de-Vendas
   *
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br /> 
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>MetaAtual</b> que por sua vez
   * instancia a tabela TGMMET mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODVEND, porém você pode utilizar outros campos da entidade .<br /><br />
   *
   *  <b>• CODVEND</b> – Código do vendedor.<br />
   *
   * <h3></h3> Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODVEND = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"22"
   *             }
   *           ]
   *         }
   *
   * Caso deseje pesquisar por todos os bancos cadastrados, basta remover o trecho acima do
   * json para retornar todos os bancos cadastrados.
   * Para melhor performance sempre utilize nas suas consultas apenas os campos necessários,
   * para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo de campos da
   * entidade</h3> Acesse <a href="http://swagger.sankhya.com.br/tabelas/TGMMET.html"
   * target="_blank"><b><font size="4px">aqui</font></b></a> o dicionário de dados da tabela
   * TGMMET<br /><br /> <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "MetaAtual",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODVEND = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"22"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODMETA,DTREF,CODEMP"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *       {
   *           "serviceName": "CRUDServiceProvider.loadRecords",
   *           "status": "1",
   *           "pendingPrinting": "false",
   *           "transactionId": "EB05070B28133E0DFCAD20E00300682E",
   *           "responseBody": {
   *               "entities": {
   *                   "total": "5",
   *                   "hasMoreResult": "false",
   *                   "offsetPage": "0",
   *                   "offset": "0",
   *                   "metadata": {
   *                       "fields": {
   *                           "field": [
   *                               {
   *                                   "name": "CODMETA"
   *                               },
   *                               {
   *                                   "name": "DTREF"
   *                               },
   *                               {
   *                                   "name": "CODEMP"
   *                               },
   *                               {
   *                                   "name": "CODPROD"
   *                               },
   *                               {
   *                                   "name": "CODGRUPOPROD"
   *                               },
   *                               {
   *                                   "name": "CODLOCAL"
   *                               },
   *                               {
   *                                   "name": "CODPROJ"
   *                               },
   *                               {
   *                                   "name": "CODCENCUS"
   *                               },
   *                               {
   *                                   "name": "CODNAT"
   *                               },
   *                               {
   *                                   "name": "CODREG"
   *                               },
   *                               {
   *                                   "name": "CODGER"
   *                               },
   *                               {
   *                                   "name": "CODVEND"
   *                               },
   *                               {
   *                                   "name": "CODPARC"
   *                               },
   *                               {
   *                                   "name": "CODUF"
   *                               },
   *                               {
   *                                   "name": "CODCID"
   *                               },
   *                               {
   *                                   "name": "CODPAIS"
   *                               },
   *                               {
   *                                   "name": "CODTIPPARC"
   *                               },
   *                               {
   *                                   "name": "CONTROLE"
   *                               },
   *                               {
   *                                   "name": "MARCA"
   *                               },
   *                               {
   *                                   "name": "DIA"
   *                               },
   *                               {
   *                                   "name": "CODGRUPONAT"
   *                               },
   *                               {
   *                                   "name": "ConfiguracaoMeta_DESCRMETA"
   *                               },
   *                               {
   *                                   "name": "Empresa_NOMEFANTASIA"
   *                               },
   *                               {
   *                                   "name": "Produto_DESCRPROD"
   *                               },
   *                               {
   *                                   "name": "GrupoProduto_DESCRGRUPOPROD"
   *                               },
   *                               {
   *                                   "name": "LocalFinanceiro_DESCRLOCAL"
   *                               },
   *                               {
   *                                   "name": "Projeto_IDENTIFICACAO"
   *                               },
   *                               {
   *                                   "name": "CentroResultado_DESCRCENCUS"
   *                               },
   *                               {
   *                                   "name": "Natureza_DESCRNAT"
   *                               },
   *                               {
   *                                   "name": "Regiao_NOMEREG"
   *                               },
   *                               {
   *                                   "name": "Gerente_APELIDO"
   *                               },
   *                               {
   *                                   "name": "Vendedor_APELIDO"
   *                               },
   *                               {
   *                                   "name": "Parceiro_NOMEPARC"
   *                               },
   *                               {
   *                                   "name": "UnidadeFederativaOrigem_UF"
   *                               },
   *                               {
   *                                   "name": "Cidade_NOMECID"
   *                               },
   *                               {
   *                                   "name": "Pais_DESCRICAO"
   *                               },
   *                               {
   *                                   "name": "Perfil_DESCRTIPPARC"
   *                               },
   *                               {
   *                                   "name": "GrupoNaturezas_DESCRGRUPONAT"
   *                               }
   *                           ]
   *                       }
   *                   },
   *                   "entity": [
   *                       {
   *                           "f30": {
   *                               "$": "<SEM VENDEDOR>"
   *                           },
   *                           "f10": {
   *                               "$": "0"
   *                           },
   *                           "f32": {
   *                               "$": "<SEM PARCEIRO>"
   *                           },
   *                           "f31": {
   *                               "$": "MAURA"
   *                           },
   *                           "f12": {
   *                               "$": "0"
   *                           },
   *                           "f34": {
   *                               "$": "<SEM DESCRIÇÃO>"
   *                           },
   *                           "f11": {
   *                               "$": "22"
   *                           },
   *                           "f33": {
   *                               "$": "0"
   *                           },
   *                           "f14": {
   *                               "$": "0"
   *                           },
   *                           "f36": {
   *                               "$": "<SEM TIPO PARCEIRO>"
   *                           },
   *                           "f13": {
   *                               "$": "0"
   *                           },
   *                           "f35": {
   *                               "$": "<SEM PAIS>"
   *                           },
   *                           "f0": {
   *                               "$": "196"
   *                           },
   *                           "f16": {
   *                               "$": "0"
   *                           },
   *                           "f1": {
   *                               "$": "15/10/2020"
   *                           },
   *                           "f15": {
   *                               "$": "0"
   *                           },
   *                           "f37": {
   *                               "$": "<SEM GRUPONATUREZA>"
   *                           },
   *                           "f2": {
   *                               "$": "0"
   *                           },
   *                           "f18": {},
   *                           "f3": {
   *                               "$": "0"
   *                           },
   *                           "f17": {},
   *                           "f4": {
   *                               "$": "0"
   *                           },
   *                           "f5": {
   *                               "$": "0"
   *                           },
   *                           "f19": {
   *                               "$": "15"
   *                           },
   *                           "f6": {
   *                               "$": "0"
   *                           },
   *                           "f7": {
   *                               "$": "0"
   *                           },
   *                           "f8": {
   *                               "$": "0"
   *                           },
   *                           "f9": {
   *                               "$": "0"
   *                           },
   *                           "f21": {
   *                               "$": "META DIÁRIA GENUINA"
   *                           },
   *                           "f20": {
   *                               "$": "0"
   *                           },
   *                           "f23": {
   *                               "$": "<sem descrição>"
   *                           },
   *                           "f22": {},
   *                           "f25": {
   *                               "$": "<SEM LOCAL>"
   *                           },
   *                           "f24": {
   *                               "$": "<SEM GRUPO>"
   *                           },
   *                           "f27": {
   *                               "$": "<SEM CENTRO DE RESULTADO>"
   *                           },
   *                           "f26": {
   *                               "$": "<SEM PROJETO>"
   *                           },
   *                           "f29": {
   *                               "$": "<SEM REGIAO>"
   *                           },
   *                           "f28": {
   *                               "$": "<SEM NATUREZA>"
   *                           }
   *                       }
   *                   ]
   *               }
   *           }
   *       }
   *
   * @summary Consulta de Metas por vendedor
   */
  getMetasvenda(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/MetasVenda', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar consultas de metas é necessário efetuar a 
   * configuração no ERP e definir quais <b>metas por grupo de produtos</b> e quais seções
   * grupo de produto. Permite ainda configurar se a meta será lançada em termos de
   * <b>"quantidade"</b>, <b>"Peso"</b>, ou <b>"Valor"</b>.<br />
   * No ERP é possível selecionar o ano para qual as metas mensais serão lançadas, e dos anos
   * anteriores, podem ser consultados.Também é possível gravar no banco de dados metas e
   * descartar as digitações realizadas e recarregar os dados para eventual consulta dos
   * dados.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045117773-Metas-Simplificadas-de-Vendas<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>MetaAtual</b> que por sua vez
   * instancia a tabela TGMMET mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODVEND, porém você pode utilizar outros campos da entidade .<br /><br />
   *
   *  <b>• CODGRUPOPROD</b> – Código de Grupo de Produto.<br />
   *
   * <h3></h3> Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODGRUPOPROD = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"100000"
   *             }
   *           ]
   *         }
   *
   * Caso deseje pesquisar por todos os bancos cadastrados, basta remover o trecho acima do
   * json para retornar todos os bancos cadastrados.
   * Para melhor performance sempre utilize nas suas consultas apenas os campos necessários,
   * para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo de campos da
   * entidade</h3> Acesse <a href="http://swagger.sankhya.com.br/tabelas/TGMMET.html"
   * target="_blank"><b><font size="4px">aqui</font></b></a> o dicionário de dados da tabela
   * TGMMET<br /><br /> <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "MetaAtual",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODGRUPOPROD = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"100000"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODMETA,DTREF,CODEMP"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "00505BB9102E36F82FFB40865471FA8A",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "2",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODMETA"
   *                             },
   *                             {
   *                                 "name": "DTREF"
   *                             },
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "CODGRUPOPROD"
   *                             },
   *                             {
   *                                 "name": "CODLOCAL"
   *                             },
   *                             {
   *                                 "name": "CODPROJ"
   *                             },
   *                             {
   *                                 "name": "CODCENCUS"
   *                             },
   *                             {
   *                                 "name": "CODNAT"
   *                             },
   *                             {
   *                                 "name": "CODREG"
   *                             },
   *                             {
   *                                 "name": "CODGER"
   *                             },
   *                             {
   *                                 "name": "CODVEND"
   *                             },
   *                             {
   *                                 "name": "CODPARC"
   *                             },
   *                             {
   *                                 "name": "CODUF"
   *                             },
   *                             {
   *                                 "name": "CODCID"
   *                             },
   *                             {
   *                                 "name": "CODPAIS"
   *                             },
   *                             {
   *                                 "name": "CODTIPPARC"
   *                             },
   *                             {
   *                                 "name": "CONTROLE"
   *                             },
   *                             {
   *                                 "name": "MARCA"
   *                             },
   *                             {
   *                                 "name": "DIA"
   *                             },
   *                             {
   *                                 "name": "CODGRUPONAT"
   *                             },
   *                             {
   *                                 "name": "ConfiguracaoMeta_DESCRMETA"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             },
   *                             {
   *                                 "name": "Produto_DESCRPROD"
   *                             },
   *                             {
   *                                 "name": "GrupoProduto_DESCRGRUPOPROD"
   *                             },
   *                             {
   *                                 "name": "LocalFinanceiro_DESCRLOCAL"
   *                             },
   *                             {
   *                                 "name": "Projeto_IDENTIFICACAO"
   *                             },
   *                             {
   *                                 "name": "CentroResultado_DESCRCENCUS"
   *                             },
   *                             {
   *                                 "name": "Natureza_DESCRNAT"
   *                             },
   *                             {
   *                                 "name": "Regiao_NOMEREG"
   *                             },
   *                             {
   *                                 "name": "Gerente_APELIDO"
   *                             },
   *                             {
   *                                 "name": "Vendedor_APELIDO"
   *                             },
   *                             {
   *                                 "name": "Parceiro_NOMEPARC"
   *                             },
   *                             {
   *                                 "name": "UnidadeFederativaOrigem_UF"
   *                             },
   *                             {
   *                                 "name": "Cidade_NOMECID"
   *                             },
   *                             {
   *                                 "name": "Pais_DESCRICAO"
   *                             },
   *                             {
   *                                 "name": "Perfil_DESCRTIPPARC"
   *                             },
   *                             {
   *                                 "name": "GrupoNaturezas_DESCRGRUPONAT"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": [
   *                     {
   *                         "f30": {
   *                             "$": "<SEM VENDEDOR>"
   *                         },
   *                         "f10": {
   *                             "$": "0"
   *                         },
   *                         "f32": {
   *                             "$": "<SEM PARCEIRO>"
   *                         },
   *                         "f31": {
   *                             "$": "<SEM VENDEDOR>"
   *                         },
   *                         "f12": {
   *                             "$": "0"
   *                         },
   *                         "f34": {
   *                             "$": "<SEM DESCRIÇÃO>"
   *                         },
   *                         "f11": {
   *                             "$": "0"
   *                         },
   *                         "f33": {
   *                             "$": "0"
   *                         },
   *                         "f14": {
   *                             "$": "0"
   *                         },
   *                         "f36": {
   *                             "$": "<SEM TIPO PARCEIRO>"
   *                         },
   *                         "f13": {
   *                             "$": "0"
   *                         },
   *                         "f35": {
   *                             "$": "<SEM PAIS>"
   *                         },
   *                         "f0": {
   *                             "$": "10"
   *                         },
   *                         "f16": {
   *                             "$": "0"
   *                         },
   *                         "f1": {
   *                             "$": "01/04/2014"
   *                         },
   *                         "f15": {
   *                             "$": "0"
   *                         },
   *                         "f37": {
   *                             "$": "<SEM GRUPONATUREZA>"
   *                         },
   *                         "f2": {
   *                             "$": "0"
   *                         },
   *                         "f18": {},
   *                         "f3": {
   *                             "$": "0"
   *                         },
   *                         "f17": {},
   *                         "f4": {
   *                             "$": "100000"
   *                         },
   *                         "f5": {
   *                             "$": "0"
   *                         },
   *                         "f19": {
   *                             "$": "0"
   *                         },
   *                         "f6": {
   *                             "$": "0"
   *                         },
   *                         "f7": {
   *                             "$": "0"
   *                         },
   *                         "f8": {
   *                             "$": "0"
   *                         },
   *                         "f9": {
   *                             "$": "0"
   *                         },
   *                         "f21": {
   *                             "$": "META WESLEY COMERCIAL 4"
   *                         },
   *                         "f20": {
   *                             "$": "0"
   *                         },
   *                         "f23": {
   *                             "$": "<sem descrição>"
   *                         },
   *                         "f22": {},
   *                         "f25": {
   *                             "$": "<SEM LOCAL>"
   *                         },
   *                         "f24": {
   *                             "$": "0100001"
   *                         },
   *                         "f27": {
   *                             "$": "<SEM CENTRO DE RESULTADO>"
   *                         },
   *                         "f26": {
   *                             "$": "<SEM PROJETO>"
   *                         },
   *                         "f29": {
   *                             "$": "<SEM REGIAO>"
   *                         },
   *                         "f28": {
   *                             "$": "<SEM NATUREZA>"
   *                         }
   *                     }
   *                 ]
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Metas por Grupo de Produto
   */
  getMetasgrupoprod(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/MetasGrupoProd', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Para realizar consultas de metas por produtos é necessário
   * efetuar configurações no ERP e definir <b>“Metas por Produto”</b> .Uma vez que as metas
   * já estão configuradas, você poderá definir metas por períodos mensais. Estas metas podem
   * ser estabelecidas para Produtos e ainda configurar se a meta será lançada em termos de
   * <b>"quantidade"</b>, <b>"peso"</b>, ou <b>"valor"</b>. No painel <b>“produto”</b>
   * teremos além dos recursos de filtros rápidos, a opção de se exibir o complemento do
   * produto de modo a se obter maior agilidade na consulta e visualização dos itens.<br
   * /><br /> O sistema permite a escolha da apresentação ou não do complemento do produto.
   * Se a opção <b>"Exibir o complemento"</b> estiver marcada, será exibida a descrição do
   * produto acompanhada do complemento do produto, na mesma linha mas separado por
   * colchetes. Se não existir complemento cadastrado para o  “produto” o sistema exibe
   * apenas a descrição.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045117773-Metas-Simplificadas-de-Vendas<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>MetaAtual</b> que por sua vez
   * instancia a tabela TGMMET mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODPROD, porém você pode utilizar outros campos da entidade .<br /><br />
   *
   *  <b>• CODPROD</b> – Código do Produto.<br />
   *
   * <h3></h3> Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODPROD = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"368"
   *             }
   *           ]
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGMMET.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGMMET<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "MetaAtual",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODPROD = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"368"
   *             }
   *           ]
   *         },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODMETA,DTREF,CODEMP"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "43C20E373580387C83508906C69A1A96",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "2",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODMETA"
   *                             },
   *                             {
   *                                 "name": "DTREF"
   *                             },
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "CODPROD"
   *                             },
   *                             {
   *                                 "name": "CODGRUPOPROD"
   *                             },
   *                             {
   *                                 "name": "CODLOCAL"
   *                             },
   *                             {
   *                                 "name": "CODPROJ"
   *                             },
   *                             {
   *                                 "name": "CODCENCUS"
   *                             },
   *                             {
   *                                 "name": "CODNAT"
   *                             },
   *                             {
   *                                 "name": "CODREG"
   *                             },
   *                             {
   *                                 "name": "CODGER"
   *                             },
   *                             {
   *                                 "name": "CODVEND"
   *                             },
   *                             {
   *                                 "name": "CODPARC"
   *                             },
   *                             {
   *                                 "name": "CODUF"
   *                             },
   *                             {
   *                                 "name": "CODCID"
   *                             },
   *                             {
   *                                 "name": "CODPAIS"
   *                             },
   *                             {
   *                                 "name": "CODTIPPARC"
   *                             },
   *                             {
   *                                 "name": "CONTROLE"
   *                             },
   *                             {
   *                                 "name": "MARCA"
   *                             },
   *                             {
   *                                 "name": "DIA"
   *                             },
   *                             {
   *                                 "name": "CODGRUPONAT"
   *                             },
   *                             {
   *                                 "name": "ConfiguracaoMeta_DESCRMETA"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             },
   *                             {
   *                                 "name": "Produto_DESCRPROD"
   *                             },
   *                             {
   *                                 "name": "GrupoProduto_DESCRGRUPOPROD"
   *                             },
   *                             {
   *                                 "name": "LocalFinanceiro_DESCRLOCAL"
   *                             },
   *                             {
   *                                 "name": "Projeto_IDENTIFICACAO"
   *                             },
   *                             {
   *                                 "name": "CentroResultado_DESCRCENCUS"
   *                             },
   *                             {
   *                                 "name": "Natureza_DESCRNAT"
   *                             },
   *                             {
   *                                 "name": "Regiao_NOMEREG"
   *                             },
   *                             {
   *                                 "name": "Gerente_APELIDO"
   *                             },
   *                             {
   *                                 "name": "Vendedor_APELIDO"
   *                             },
   *                             {
   *                                 "name": "Parceiro_NOMEPARC"
   *                             },
   *                             {
   *                                 "name": "UnidadeFederativaOrigem_UF"
   *                             },
   *                             {
   *                                 "name": "Cidade_NOMECID"
   *                             },
   *                             {
   *                                 "name": "Pais_DESCRICAO"
   *                             },
   *                             {
   *                                 "name": "Perfil_DESCRTIPPARC"
   *                             },
   *                             {
   *                                 "name": "GrupoNaturezas_DESCRGRUPONAT"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": [
   *                     {
   *                         "f30": {
   *                             "$": "<SEM VENDEDOR>"
   *                         },
   *                         "f10": {
   *                             "$": "0"
   *                         },
   *                         "f32": {
   *                             "$": "<SEM PARCEIRO>"
   *                         },
   *                         "f31": {
   *                             "$": "<SEM VENDEDOR>"
   *                         },
   *                         "f12": {
   *                             "$": "0"
   *                         },
   *                         "f34": {
   *                             "$": "<SEM DESCRIÇÃO>"
   *                         },
   *                         "f11": {
   *                             "$": "0"
   *                         },
   *                         "f33": {
   *                             "$": "0"
   *                         },
   *                         "f14": {
   *                             "$": "0"
   *                         },
   *                         "f36": {
   *                             "$": "<SEM TIPO PARCEIRO>"
   *                         },
   *                         "f13": {
   *                             "$": "0"
   *                         },
   *                         "f35": {
   *                             "$": "<SEM PAIS>"
   *                         },
   *                         "f0": {
   *                             "$": "48"
   *                         },
   *                         "f16": {
   *                             "$": "0"
   *                         },
   *                         "f1": {
   *                             "$": "01/04/0001"
   *                         },
   *                         "f15": {
   *                             "$": "0"
   *                         },
   *                         "f37": {
   *                             "$": "<SEM GRUPONATUREZA>"
   *                         },
   *                         "f2": {
   *                             "$": "1"
   *                         },
   *                         "f18": {},
   *                         "f3": {
   *                             "$": "368"
   *                         },
   *                         "f17": {},
   *                         "f4": {
   *                             "$": "0"
   *                         },
   *                         "f5": {
   *                             "$": "0"
   *                         },
   *                         "f19": {
   *                             "$": "0"
   *                         },
   *                         "f6": {
   *                             "$": "0"
   *                         },
   *                         "f7": {
   *                             "$": "0"
   *                         },
   *                         "f8": {
   *                             "$": "0"
   *                         },
   *                         "f9": {
   *                             "$": "0"
   *                         },
   *                         "f21": {
   *                             "$": "48-Metas sem componentes"
   *                         },
   *                         "f20": {
   *                             "$": "0"
   *                         },
   *                         "f23": {
   *                             "$": "COMPONENTE 2 - CESTA MASTER 1"
   *                         },
   *                         "f22": {
   *                             "$": "WCS PRESTAÇÃO DE SERVIÇOS"
   *                         },
   *                         "f25": {
   *                             "$": "<SEM LOCAL>"
   *                         },
   *                         "f24": {
   *                             "$": "<SEM GRUPO>"
   *                         },
   *                         "f27": {
   *                             "$": "<SEM CENTRO DE RESULTADO>"
   *                         },
   *                         "f26": {
   *                             "$": "<SEM PROJETO>"
   *                         },
   *                         "f29": {
   *                             "$": "<SEM REGIAO>"
   *                         },
   *                         "f28": {
   *                             "$": "<SEM NATUREZA>"
   *                         }
   *                     }
   *                 ]
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Metas por Produtos
   */
  getMetasprodutos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/MetasProdutos', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Permite gerar uma ordem de carga com base nos pedidos de
   * venda e informando os dados da entrega,como região, veículo e motorista. Uma ordem de
   * carga é emitida e utilizada na rotina de formação de cargas, agrupando e vinculando os
   * pedidos a elas.<br> 
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br> 
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045119713-Ordens-de-Carga<br> 
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>OrdemCarga</b> que por sua vez
   * instancia a tabela TGFORD mapeando os campos principais pertinentes ao cadastro de
   * produto.<br /> Para realizar a inclusão de Ordens de carga através do Json, os campo(s)
   * abaixo são(é) obrigatório(s):<br /><br /> <b>• CODEMP</b> – Código da Empresa;<br /><br
   * />
   * <h3></h3> <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFORD.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFORD<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {  "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"OrdemCarga",
   *              "includePresentationFields":"N",
   *              "dataRow":{
   *                 "localFields":{
   *                    "CODEMP":{
   *                       "$":"11"
   *                    }
   *                 }
   *              }, "entity":{
   *                 "fieldset":{
   *                    "list":"CODEMP,ORDEMCARGA"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "4D8FFD485B20CAC93FD0008A9ED40D41",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "ORDEMCARGA": {
   *                         "$": "233"
   *                     },
   *                     "CODEMP": {
   *                         "$": "11"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Inclusão de Ordem de Carga
   */
  postOrdemcarga(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/OrdemCarga', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Permite gerar uma ordem de carga com base nos pedidos de
   * venda e informando os dados da entrega,como região, veículo e motorista. Uma ordem de
   * carga é emitida e utilizada na rotina de formação de cargas, agrupando e vinculando os
   * pedidos a elas.<br> 
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br> 
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045119713-Ordens-de-Carga<br> 
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>OrdemCarga</b> que por sua vez
   * instancia a tabela TGFORD mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foram utilizados como filtro os
   * campos CODEMP e ORDEMCARGA, porém você pode utilizar outros campos da entidade .<br
   * /><br />
   *
   *  <b>• CODEMP</b> – Código da Empresa.<br />
   *  <b>• ORDEMCARGA</b> – Número da Ordem de carga.<br />           
   *
   * <h3></h3> Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código
   * abaixo utilizando o criteria: <br/>
   *
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODEMP = ? and this.ORDEMCARGA = ?" 
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"1"
   *               },
   *               {
   *                  "type":"I",
   *                  "value":"19"
   *               }
   *             ]
   *           }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFORD.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFORD<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "OrdemCarga",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODEMP = ? and this.ORDEMCARGA = ?" 
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"1"
   *               },
   *               {
   *                  "type":"I",
   *                  "value":"19"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODEMP,ORDEMCARGA,TOTALCARGA,CODREG"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "1F8B41F8F96622039906D599031ECF9E",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "ORDEMCARGA"
   *                             },
   *                             {
   *                                 "name": "TOTALCARGA"
   *                             },
   *                             {
   *                                 "name": "CODREG"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             },
   *                             {
   *                                 "name": "Regiao_NOMEREG"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "1"
   *                     },
   *                     "f1": {
   *                         "$": "19"
   *                     },
   *                     "f2": {},
   *                     "f3": {
   *                         "$": "10200"
   *                     },
   *                     "f4": {
   *                         "$": "WCS PRESTAÇÃO DE SERVIÇOS"
   *                     },
   *                     "f5": {
   *                         "$": "Sul de Minas"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Ordens de Carga
   */
  getOrdemcarga(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/OrdemCarga', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Como o objetivo é vincular os pedidos a uma ordem de carga,
   * pesquisar somente os pedidos de venda pendentes. Quando se define que serão pesquisados
   * apenas lançamentos do Tipo de Movimento <b>"pedido de venda"</b>, através do painel de
   * filtros, o sistema habilita as opções <b>"exibir pedidos não confirmados"</b> e
   * <b>"exibir somente pedidos pendentes"</b>.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045119713-Ordens-de-Carga<br />
   * <h3>Dependências</h3> Para realizar a vinculação da Ordem de Carga o seguinte fluxo deve
   * ser seguido: <br /> <h3></h3> <b>1.</b> Criar o pedido de venda;<br /> <b>2.</b> Criar a
   * Ordem de Carga;<br /> <b>3.</b> Vincular o(s) pedido(s) à Ordem de carga.<br /><br />
   * <b><font color=red>IMPORTANTE:</font></b><br />  1 - Uma ordem de carga pode ser
   * vinculada a um ou mais pedidos.<br /> 2 - Para vincular os pedidos à Ordem de Carga, os
   * pedidos devem pertencer a mesma Empresa.<br /> <h3>Detalhes Técnicos</h3> A entidade
   * utilizada é a <b>CabecalhoNota</b> que por sua vez instancia a tabela TGFCAB mapeando os
   * campos principais pertinentes ao cadastro de notas.<br /> Para realizar a vinculação
   * do(s) pedido(s) na Ordem de carga através do Json, os campo(s) abaixo são(é)
   * obrigatório(s):<br /><br /> <b>• ORDEMCARGA</b> – Número da Ordem de carga;<br /> <b>•
   * NUNOTA</b> – Número único da Nota;<br />
   * Deve ser utilizado o filtro de pedido abaixo para fazer a vinculação da ordem de carga:
   *
   *             "key":{
   *                      "NUNOTA":{
   *                         "$":"3713614"
   *                       }
   *                   }
   * <h3></h3>
   *  O campo <b>NUNOTA</b> deve ser utilizado como filtro para fazer a vinculação da Ordem
   * de carga.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCAB.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFCAB<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br /><br /> <b><font color=red>IMPORTANTE:</font></b><br /> O json para realizar esta
   * vinculação permite apenas a gravação de um pedido por vez, caso a ordem de carga tenha
   * vários pedidos, deve ser feita a vinculação de pedido <b>um a um</b> pelo json com o
   * mesmo número de ordem de carga diferenciando apenas o <b>número</b> do pedido.<br /><br
   * /> <b>Corpo de requisição</b>
   *
   *     {
   *        "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"CabecalhoNota",
   *              "includePresentationFields":"S",
   *              "dataRow":{
   *                 "localFields":{
   *                    "ORDEMCARGA":{
   *                       "$":"247"
   *                    }
   *                 },
   *                 "key":{
   *                    "NUNOTA" :[{
   *                         "$":"3713614"
   *                     }]
   *                 }
   *              },
   *              "entity":{
   *                 "fieldset":{
   *                    "list":"NUNOTA,CODEMP,CODPARC,ORDEMCARGA"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "02533A425C2B872F33CA26401BAD500B",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "Parceiro_NOMEPARC": {
   *                         "$": "SANKHYA JIVA GESTÃO DE NEGÓCIOS"
   *                     },
   *                     "ORDEMCARGA": {
   *                         "$": "247"
   *                     },
   *                     "NUNOTA": {
   *                         "$": "3713614"
   *                     },
   *                     "CODPARC": {
   *                         "$": "1"
   *                     },
   *                     "CODEMP": {
   *                         "$": "1"
   *                     },
   *                     "Empresa_NOMEFANTASIA": {
   *                         "$": "WCS PRESTAÇÃO DE SERVIÇOS"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Vincular de Ordem de Carga
   */
  postVincularordemcarga(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/VincularOrdemCarga', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> A sequência de ordem de carga tem a função de informar quais
   * cidades farão parte da rota de entrega.Será necessário efetuar o cadastro no ERP da
   * sequência de entrega.A primeira cidade da rota deverá ter a sequência 1, a segunda a
   * sequência 2, e assim por diante.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045108613-Rotas#abasequenciadeentrega<br
   * />
   * <h3>Dependências</h3> Para realizar o sequenciamento da Ordem de Carga o seguinte fluxo
   * deve ser seguido: <br /> <h3></h3> <b>1.</b> Criar o pedido de venda;<br /> <b>2.</b>
   * Criar a Ordem de Carga;<br /> <b>3.</b> Vincular a Ordem de carga ao Pedido de venda
   * criado.<br /> <b>4.</b> Sequenciar os pedidos da Ordem de carga.<br />
   * <b><font color=red>IMPORTANTE:</font></b><br />  1 - Uma ordem de carga pode ser
   * vinculada a um ou mais pedidos.<br /> 2 - Para sequenciar os pedidos, os mesmos devem
   * pertencer a mesma Ordem de carga.<br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>CabecalhoNota</b> que por sua vez
   * instancia a tabela TGFCAB mapeando os campos principais pertinentes ao cadastro de
   * notas.<br /> Para realizar o sequenciamento de pedidos na ordem de carga  através do
   * Json, os campo(s) abaixo são(é) obrigatório(s):<br />
   * <b>• SEQCARGA</b> – Sequência da carga;<br /> <b>• NUNOTA</b> – Número único da nota;<br
   * />
   * Deve ser utilizado o filtro abaixo para fazer o sequenciamento dos pedidos na ordem de
   * carga:
   *
   *             "key":{
   *                      "NUNOTA":{
   *                         "$":"3713614"
   *                       }
   *                   }
   * <h3></h3> O campo <b>NUNOTA</b> deve ser utilizado como filtro para fazer o
   * sequenciamento.<br /><br /> <b>OBSERVAÇÃO:</b> Os pedidos devem estar na mesma Ordem de
   * carga para fazer o sequenciamento.<br />
   * <h3></h3> <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFCAB.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFCAB<br /><br />
   * <h3>Exemplo de uso:</h3> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json
   * <br />
   *  <b><font color=red>IMPORTANTE:</font></b><br /> O json para realizar este
   * sequenciamento permite apenas a gravação de um número de sequencia por vez.<br />
   * Este sequenciamento entre os pedidos da ordem deverão ser feitos manualmente e após isto
   * inserir no campo <b>SEQCARGA</b> o número de sequenciamento deste pedido, lembrando que
   * os números de sequenciamentos não deve ser repetidos nos pedidos da Ordem de carga.<br
   * /><br /> <b>Corpo de requisição</b>
   *
   *     {
   *        "serviceName":"CRUDServiceProvider.saveRecord",
   *        "requestBody":{
   *           "dataSet":{
   *              "rootEntity":"CabecalhoNota",
   *              "includePresentationFields":"S",
   *              "dataRow":{
   *                 "localFields":{
   *                    "SEQCARGA":{
   *                       "$":"70"
   *                    }
   *                 },
   *                 "key":{
   *                    "NUNOTA":{
   *                         "$":"3713614"
   *                     }
   *                 }
   *              },
   *              "entity":{
   *                 "fieldset":{
   *                    "list":"NUNOTA,CODEMP,CODPARC,ORDEMCARGA,SEQCARGA"
   *                 }
   *              }
   *           }
   *        }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.saveRecord",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "5DB148EC68A6C599957555A2B798A7F0",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "entity": {
   *                     "Parceiro_NOMEPARC": {
   *                         "$": "SANKHYA JIVA GESTÃO DE NEGÓCIOS"
   *                     },
   *                     "ORDEMCARGA": {
   *                         "$": "247"
   *                     },
   *                     "NUNOTA": {
   *                         "$": "3713614"
   *                     },
   *                     "CODPARC": {
   *                         "$": "1"
   *                     },
   *                     "SEQCARGA": {
   *                         "$": "70"
   *                     },
   *                     "CODEMP": {
   *                         "$": "1"
   *                     },
   *                     "Empresa_NOMEFANTASIA": {
   *                         "$": "WCS PRESTAÇÃO DE SERVIÇOS"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Sequenciar Ordem de Carga
   */
  postSequenciarordemcarga(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/SequenciarOrdemCarga', 'post');
  }

  /**
   * <h1>Regras de negócio</h1> Os tipos de títulos que, ao serem vinculados a um tipo de
   * negociação, serão utilizados pela empresa na geração de documentos para pagamento ou
   * recebimento tais como, boletos, duplicatas e etc; são empregados nas centrais em
   * emissões de notas, de modo a alimentar o financeiro além de compor os lançamentos.<br
   * /><br /> <b><font color=red>OBS</font></b>: Caso tenha alguma necessidade de
   * configuração do ERP procure “Consultor” ou acesso o link de apoio:
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360044606494-Tipos-de-T%C3%ADtulo
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>TipoTitulo</b> que por sua vez
   * instancia a tabela TGFTIT mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODTIPTIT, porém você pode utilizar outros campos da entidade .<br /><br /> <b>•
   * CODTIPTIT</b> – Código do Tipo de Título.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODTIPTIT = ?" 
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"274"
   *             }
   *           ]
   *         }
   *
   * <h3></h3>Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFTIT.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFTIT<br />
   *
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "TipoTitulo",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODTIPTIT = ?" 
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"274"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODTIPTIT,DESCRTIPTIT"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "A091E3880901577B90A4A43FD24E187A",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODTIPTIT"
   *                             },
   *                             {
   *                                 "name": "DESCRTIPTIT"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "274"
   *                     },
   *                     "f1": {
   *                         "$": "PAGAMENTO ANUAL"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Tipos de Título
   */
  getTipotitulo(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/TipoTitulo', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> É tudo aquilo que é arrecadado pela empresa, a título de
   * Lançamentos financeiros a pagar com status “Em Aberto” ou “Parcialmente Baixado”.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045114753-Movimenta%C3%A7%C3%A3o-Financeira#oquesoreceitasedespesas<br
   * />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Financeiro</b> que por sua vez
   * instancia a tabela TGFFIN mapeando os campos principais.<br /> Para realizarmos a busca
   * através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foram utilizados como filtro os
   * campos CODTIPTIT, DHBAIXA e RECDESP, porém você pode utilizar outros campos da entidade
   * .<br /><br />
   *
   *  <b>• NUFIN</b> – Nro Único;<br />
   *  <b>• DHBAIXA</b> – Data da baixa;<br />
   *  <b>• RECDESP</b> – Receita/Despesa.<br />
   *
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *           "criteria": {
   *             "expression": {
   *               "$": "this.DHBAIXA IS NULL and this.RECDESP = ? and this.NUFIN = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"1"
   *               },
   *               {
   *                  "type":"I",
   *                  "value":"186"
   *               }
   *             ]
   *           }
   *
   * <h3></h3>Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br />
   * <h3>Descritivo de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFFIN.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFFIN<br />
   *
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Financeiro",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.DHBAIXA IS NULL and this.RECDESP = ? and this.NUFIN = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"1"
   *               },
   *               {
   *                  "type":"I",
   *                  "value":"186"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"NUFIN,CODEMP,NUMNOTA,DTNEG,DTVENC"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "E4B45548D6742C423A674A76FADEAF74",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "NUFIN"
   *                             },
   *                             {
   *                                 "name": "CODEMP"
   *                             },
   *                             {
   *                                 "name": "NUMNOTA"
   *                             },
   *                             {
   *                                 "name": "DTNEG"
   *                             },
   *                             {
   *                                 "name": "DTVENC"
   *                             },
   *                             {
   *                                 "name": "Empresa_NOMEFANTASIA"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "186"
   *                     },
   *                     "f1": {
   *                         "$": "2"
   *                     },
   *                     "f2": {
   *                         "$": "0"
   *                     },
   *                     "f3": {
   *                         "$": "29/05/2014"
   *                     },
   *                     "f4": {
   *                         "$": "03/06/2014"
   *                     },
   *                     "f5": {
   *                         "$": "EMPRESA MODELO"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Títulos em Aberto
   */
  getTituloaberto(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/TituloAberto', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Os tipos de negociação se referem às formas de pagamento
   * utilizadas pela empresa, seja nas operações de compra ou venda. Nos tipos de negociação
   * são realizadas diversas parametrizações que serão utilizadas nas negociações com os
   * parceiros da empresa; portanto, tem-se aqui um cadastro de extrema importância.<br />
   * <b><font color=red>OBS</font></b>: Caso tenha alguma necessidade de configuração do ERP
   * procure “Consultor” ou acesso o link de apoio:
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045109173-Tipos-de-Negocia%C3%A7%C3%A3o
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>TipoNegociacao</b> que por sua
   * vez instancia a tabela TGFTPV mapeando os campos principais.<br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODTIPVENDA, porém você pode utilizar outros campos da entidade.<br />
   *  <b>• CODTIPVENDA</b> – Código do tipo de negociação.<br />
   * O cadastro de tipos de negociação é histórico e para efetuar a busca da ultima versão é
   * necessário buscar utilizando os campos CODTIPVENDA e ATIVO, após isto o retorno do JSON
   * trará o ultimo tipo de negociação ordenando pela data e hora de alteração. Para
   * utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODTIPVENDA = ? AND this.ATIVO = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"11"
   *             },
   *             {
   *                "type":"S",
   *                "value":"S"
   *             }
   *           ]
   *         }
   *
   * <h3></h3> Ao realizar a busca pelo código do tipo de negociação, o retono trará os
   * títulos cadastrados para este código de negociação, sendo assim pode trazer diversos
   * tipos de negociação como:<br />
   * <b>1 - </b>Cartão de Débito;<br /> <b>2 - </b>A vista;<br /> <b>3 - </b>A prazo;<br />
   * <b>4 - </b>Parcelada;<br /> <b>5 - </b>Cheque pré-datado;<br /> <b>6 - </b>Crediário;<br
   * /> <b>7 - </b>Financeira;<br /> <b>8 - </b>Cartão de Crédito.<br />
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFTPV.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFTPV<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "TipoNegociacao",
   *           "includePresentationFields": "S",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODTIPVENDA = ? AND this.ATIVO = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"11"
   *               },
   *               {
   *                  "type":"S",
   *                  "value":"S"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODTIPVENDA,DHALTER,DESCRTIPVENDA,TAXAJURO"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "F44CF8381F02E59494DAC151AEDBFACE",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "1",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODTIPVENDA"
   *                             },
   *                             {
   *                                 "name": "DHALTER"
   *                             },
   *                             {
   *                                 "name": "DESCRTIPVENDA"
   *                             },
   *                             {
   *                                 "name": "TAXAJURO"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": {
   *                     "f0": {
   *                         "$": "11"
   *                     },
   *                     "f1": {
   *                         "$": "16/07/2020 16:42:15"
   *                     },
   *                     "f2": {
   *                         "$": "À VISTA"
   *                     },
   *                     "f3": {}
   *                 }
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Tipos de Negociação
   */
  getTiponegociacao(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/TipoNegociacao', 'get');
  }

  /**
   * <h1>Regras de negócio</h1> Os tipos de negociação se referem às formas de pagamento
   * utilizadas pela empresa, seja nas operações de compra ou venda. Nos tipos de negociação
   * são realizadas diversas parametrizações que serão utilizadas nas negociações com os
   * parceiros da empresa; portanto, tem-se aqui um cadastro de extrema importância.<br />
   * <b><font color=red>OBS</font></b>: Caso tenha alguma necessidade de configuração do ERP
   * procure “Consultor” ou acesso o link de apoio:
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045109173-Tipos-de-Negocia%C3%A7%C3%A3o
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>ParcelaPagamento</b> que por sua
   * vez instancia a tabela TGFPPG mapeando os campos principais.<br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODTIPVENDA, porém você pode utilizar outros campos da entidade.<br />
   *  <b>• CODTIPVENDA</b> – Código do tipo de NEGOCIAÇÃO.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODTIPVENDA = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"33"
   *             }
   *           ]
   *         }
   *
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFPPG.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFPPG<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "ParcelaPagamento",
   *           "includePresentationFields": "S",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODTIPVENDA = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"33"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODTIPVENDA,CODTIPTITPAD"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "1E021F0999BD46800093FAFBC9586918",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "2",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODTIPVENDA"
   *                             },
   *                             {
   *                                 "name": "CODTIPTITPAD"
   *                             },
   *                             {
   *                                 "name": "SEQUENCIA"
   *                             },
   *                             {
   *                                 "name": "TipoTitulo_DESCRTIPTIT"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": [
   *                     {
   *                         "f0": {
   *                             "$": "33"
   *                         },
   *                         "f1": {
   *                             "$": "7"
   *                         },
   *                         "f2": {
   *                             "$": "1"
   *                         },
   *                         "f3": {
   *                             "$": "Cartão de Crédtio VISA"
   *                         }
   *                     },
   *                     {
   *                         "f0": {
   *                             "$": "33"
   *                         },
   *                         "f1": {
   *                             "$": "7"
   *                         },
   *                         "f2": {
   *                             "$": "2"
   *                         },
   *                         "f3": {
   *                             "$": "Cartão de Crédtio VISA"
   *                         }
   *                     }
   *                 ]
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Parcelas de Tipos de Negociação
   */
  getParcelastiponegociacao(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/ParcelasTipoNegociacao', 'get');
  }

  /**
   * A API disponibiliza o serviço loadView (CRUDServiceProvider.loadView) para realizar
   * consulta em VIEWs.
   * <br />Existem algumas considerações importantes que devem ser levadas em consideração
   * antes de sua utilização. Seguem: <ul>
   *   <li>O serviço não possui paginação nativa, portanto, a paginação deve ser feita pelo
   * integrador que realiza a requisição.</li>
   *   <li>Caso a view não seja performática, é indicado a utilização de mecanismos de
   * indexação para que a performance seja adequada, como Materialized Views (fique atento
   * com as regras de atualização dos dados desse tipo de objeto).</li>
   *   <li>Para um volume muito grande de dados, pode ser utilizado um indicador de linha
   * para criar a paginação de maneira mais simples. Segue um exemplo para ORACLE e SQL
   * Server:</li>
   * </ul>
   * <b>Oracle</b>
   *
   *
   *     CREATE VIEW VW_ITENS_PEDIDO 
   *     AS
   *     SELECT T.* 
   *     FROM (
   *         SELECT ROWNUM AS LINHA
   *         , PRO.CODPROD
   *         , PRO.DESCRPROD
   *         , ITE.NUNOTA
   *         , ITE.SEQUENCIA
   *         , ITE.QTDNEG
   *         , ITE.VLRUNIT
   *         , ITE.VLRTOT
   *         FROM TGFITE ITE
   *         INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
   *     ) T
   *
   * <b>SQL Server</b>
   *
   *     CREATE VIEW VW_ITENS_PEDIDO 
   *     AS
   *     SELECT T.* 
   *     FROM (
   *         SELECT ROW_NUMBER() OVER(ORDER BY NUNOTA, SEQUENCIA) AS LINHA
   *         , PRO.CODPROD
   *         , PRO.DESCRPROD
   *         , ITE.NUNOTA
   *         , ITE.SEQUENCIA
   *         , ITE.QTDNEG
   *         , ITE.VLRUNIT
   *         , ITE.VLRTOT
   *         FROM TGFITE ITE
   *         INNER JOIN TGFPRO PRO ON PRO.CODPROD = ITE.CODPROD
   *     ) T
   *
   * <br />Nos exemplos acima foi utilizado a TGFITE que detém um grande volume de dados, na
   * maioria das vezes.
   * <br />Segue exemplo de utilização do serviço com a VIEW criada no exemplo acima:
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadView&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *     {
   *         "serviceName": "CRUDServiceProvider.loadView",
   *         "requestBody": {
   *             "query": {
   *                 "viewName": "VW_ITENS_PEDIDO",
   *                 "where": {
   *                     "$": "LINHA BETWEEN 15000 AND 15499"
   *                 },
   *                 "fields": {
   *                     "field": {
   *                         "$": "CODPROD, DESCRPROD, NUNOTA, SEQUENCIA, QTDNEG, VLRUNIT,
   * VLRTOT"
   *                     }
   *                 }
   *             }
   *         }
   *     }
   *
   * <br />A requisição acima retorna 500 registros, considerando linhas de 15.000 a 15.499.
   *
   * @summary Obtendo dados utilizando loadView
   */
  getLoadview(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/loadView', 'get');
  }

  /**
   * <h1>Regras de negócio</h1>
   * Para realizar consulta de veículos é necessário efetuar cadastro pois é primordial para
   * funcionamento da rotina de controle de veículos.Depois de efetuados os cadastros
   * corretamente e realizados os lançamentos dos devidos registros como por exemplo, nota de
   * compra, despesas ou requisições referentes ao veículo.<br />
   * <b><font color=red>Nota</font></b>: É possível realizar o cadastro de vários veículos no
   * ERP para o mesmo produto desde que o código vinculado seja diferente uns dos outros. Por
   * outro lado, caso seja cadastrado outro veículo com o mesmo Produto e Código do bem já
   * utilizado,será apresentada a seguinte mensagem no sistema.<br />
   * <b>OBS:</b> Caso tenha alguma necessidade de configuração do ERP procure “Consultor” ou
   * acesso o link de apoio:<br />
   * https://ajuda.sankhya.com.br/hc/pt-br/articles/360045111533-Ve%C3%ADculos-<br />
   * <h3>Dependências</h3> <b><font color=red>Não possui dependências</font></b><br />
   * <h3>Detalhes Técnicos</h3> A entidade utilizada é a <b>Veiculo</b> que por sua vez
   * instancia a tabela TGFVEI mapeando os campos principais.<br /><br /> Para realizarmos a
   * busca através do Json, utilizamos o serviço
   * <i><b>"CRUDServiceProvider.loadRecords".</b></i><br /><br /> O serviço
   * CRUDServiceProvider.loadRecords é um otimo serviço para ser utilizado para consulta de
   * dados através do JSON.<br /><br /> No exemplo abaixo foi utilizado como filtro o campo
   * CODPARC, para poder pesquisar os veículos cadastrados dos parceiros, porém você pode
   * utilizar outros campos da entidade .<br /><br /> <b>• CODPARC</b> – Código do
   * Parceiro.<br />
   * Para utilizarmos o filtro, basta acrescentar no corpo da requisição o código abaixo
   * utilizando o criteria: <br/>
   *
   *         "criteria": {
   *           "expression": {
   *             "$": "this.CODPARC = ?"
   *           },
   *           "parameter":[
   *             {
   *                "type":"I",
   *                "value":"1"
   *             }
   *           ]
   *         }
   *
   * <h3></h3> Para melhor performance sempre utilize nas suas consultas apenas os campos
   * necessários, para evitar tráfego de dados que não serão utilizados.<br /> <h3>Descritivo
   * de campos da entidade</h3> Acesse <a
   * href="http://swagger.sankhya.com.br/tabelas/TGFVEI.html" target="_blank"><b><font
   * size="4px">aqui</font></b></a> o dicionário de dados da tabela TGFVEI<br /><br />
   * <h3>Exemplo de uso:</h3><br /> <b>URL de chamada</b>:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json
   * <br /><br />
   * <b>Corpo de requisição</b>
   *
   *      {
   *       "serviceName": "CRUDServiceProvider.loadRecords",
   *       "requestBody": {
   *         "dataSet": {
   *           "rootEntity": "Veiculo",
   *           "includePresentationFields": "N",
   *           "offsetPage": "0",
   *           "criteria": {
   *             "expression": {
   *               "$": "this.CODPARC = ?"
   *             },
   *             "parameter":[
   *               {
   *                  "type":"I",
   *                  "value":"1"
   *               }
   *             ]
   *           },
   *           "entity": {
   *             "fieldset": {
   *                   "list":"CODPARC,CODVEICULO,PLACA,MARCAMODELO,ANOFABRIC"
   *             }
   *           }
   *         }
   *       }
   *     }
   *     
   *   <b><font size=2px>Retorno em json:</b><br /></font>
   *   
   *     {
   *         "serviceName": "CRUDServiceProvider.loadRecords",
   *         "status": "1",
   *         "pendingPrinting": "false",
   *         "transactionId": "E5FFE235E263FE4F4396735332007FA2",
   *         "responseBody": {
   *             "entities": {
   *                 "total": "11",
   *                 "hasMoreResult": "false",
   *                 "offsetPage": "0",
   *                 "offset": "0",
   *                 "metadata": {
   *                     "fields": {
   *                         "field": [
   *                             {
   *                                 "name": "CODPARC"
   *                             },
   *                             {
   *                                 "name": "CODVEICULO"
   *                             },
   *                             {
   *                                 "name": "PLACA"
   *                             },
   *                             {
   *                                 "name": "MARCAMODELO"
   *                             },
   *                             {
   *                                 "name": "ANOFABRIC"
   *                             }
   *                         ]
   *                     }
   *                 },
   *                 "entity": [
   *                     {
   *                         "f0": {
   *                             "$": "1"
   *                         },
   *                         "f1": {
   *                             "$": "1"
   *                         },
   *                         "f2": {
   *                             "$": "AAAA123"
   *                         },
   *                         "f3": {
   *                             "$": "VM"
   *                         },
   *                         "f4": {
   *                             "$": "2012"
   *                         }
   *                     }
   *                 ]
   *             }
   *         }
   *     }
   *
   * @summary Consulta de Veículos
   */
  getVeiculo(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/Veiculo', 'get');
  }

  /**
   * <h1>Anexando documentos em registros específicos</h1>
   * A maioria das entidades do sistema permite anexar documentos em suas respectivas telas
   * (ex.: cadastro de parceiros, cadastro de produtos, item da nota, contratos, etc.). O
   * objetivo deste tutorial é apresentar como isso pode ser feito via API.
   * O processo é realizado em duas etapas: <ul>
   *   <li>o primeiro passo é enviar o arquivo para o servidor.</li>
   *   <li>o segundo passo salva o anexo e endereça ao respectivo registro.</li>
   * </ul>
   * Para ilustrar, apresentamos a seguir as duas requisições, detalhando o objetivo e
   * impacto de cada ação, bem como o papel de cada atributo utilizado nas requisições.  <br
   * /><br /> <h2>Parte 1: Envio do arquivo</h2>
   * A requisição basicamente faz um POST de um formulário do tipo multipart, enviando o
   * documento utilizando uma sessionKey que será utilizada posteriormente, no serviço de
   * endereçamento do anexo ao registro desejado. Seguem os principais atributos dessa
   * requisição:<br /> <br /> Endereço:
   * https://api.sankhya.com.br/gateway/v1/mge/sessionUpload.mge<br /> Com os seguintes
   * parâmetros na URL: <ul>
   *   <li>sessionkey=ANEXO_SISTEMA_ItemNota_2097_1</li>
   *   <li>fitem=S</li>
   *   <li>salvar=S</li>
   *   <li>useCache=N</li>
   * </ul>
   * Dentre esses atributos, o parâmetro mais importante é o sessionkey, que sempre varia.
   * Este parâmetro deve ser enviado no seguinte formato:<br /><br /> ANEXO_SISTEMA: sempre
   * fixo<br /> nomeEntidade<br /> pkRegistro<br /> <br /> No exemplo acima, a entidade é
   * ItemNota e a PK do item nota (que é composto) é NUNOTA 2097 e SEQUENCIA 1. Com isso
   * temos: ANEXO_SISTEMA_ItemNota_2097_1<br /><br />
   * Em seguida, é necessário preparar o "formulário", onde o tipo (Content-Type) deve ser
   * "multipart/form-data" com uma variável chamada "arquivo" contendo o endereço do anexo a
   * ser enviado.<br /><br />
   * Veja a seguir um exemplo prático desta requisição em formato curl:<br /><br />
   *
   *     curl --location
   * 'https://api.sankhya.com.br/gateway/v1/mge/sessionUpload.mge?sessionkey=ANEXO_SISTEMA_ItemNota_2097_1&fitem=S&salvar=S&useCache=N'
   * \
   *     --header 'appkey: APPKEY_DA_SUA_APLICACAO_BEM_AQUI' \
   *     --header 'Content-Type: application/json' \
   *     --header 'Authorization: Bearer BEAR_TOKEN_VALIDO_BEM_AQUI' \
   *     --header 'Accept: text/html' \
   *     --header 'Content-Type: multipart/form-data' \
   *     --form 'arquivo=@"MtBz0s5kk/foto_atualizada.jpg"'
   *
   *
   * <br /> Nesta requsição, estamos enviando a imagem "foto_atualizada.jpg". <br /><br />
   * <h2>Parte 2: Salvar  e Vincular anexo ao registro</h2> Agora que o anexo foi enviado
   * para o servidor, é hora de realizar o “vínculo” do mesmo com o respectivo registro
   * desejado.<br />
   * Veja os principais parâmetros variáveis desta requisição:<br />
   * <ul>
   *   <li>Nome do serviço: AnexoSistemaSP.salvar</li>
   *   <li>pkEntity: chave primária da entidade. No caso de chave composta, separa com _</li>
   *   <li>keySession: utilizar exatamente a mesma utilizada no serviço anterior.</li>
   *   <li>nameEntity: nome da entidade</li>
   *   <li>description: descrição desejada para anexo (texto com até 20 caracteres).</li>
   *   <li>nameAttach: nome para o anexo. Sugestão de enviar o mesmo nome que o documento
   * tem, ao utilizar o serviço de enviar o anexo.</li>
   * </ul> Os demais parâmetros contidos na requisição, devem permanecer sempre fixos,
   * conforme exemplo a seguir. <br /><br /> A seguir um exemplo da requisição:<br /> URL
   * POST:
   * https://api.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=AnexoSistemaSP.salvar&outputType=json
   *
   *     {
   *        "serviceName":"AnexoSistemaSP.salvar",
   *        "requestBody":{
   *           "params":{
   *              "pkEntity":"2097_1",
   *              "keySession":"ANEXO_SISTEMA_ItemNota_2097_1",
   *              "nameEntity":"ItemNota",
   *              "description":"Foto Atualizada 1",
   *              "keyAttach":"",
   *              "typeAcess":"ALL",
   *              "typeApres":"GLO",
   *              "nuAttach":"",
   *              "nameAttach":"foto_atualizada.jpg",
   *              "fileSelect":1,
   *              "oldFile":""
   *           }
   *        }
   *     }
   *
   * @summary Anexar Arquivos
   */
  getAnexararquivos(): Promise<FetchResponse<number, unknown>> {
    return this.core.fetch('/AnexarArquivos', 'get');
  }

  /**
   * Inclui um Cupom Fiscal eletronico modelo 59 emitido em um PDV externo.
   *
   * @summary Incluir Cupom Fiscal eletronico
   * @throws FetchError<400, types.AddCfeSatResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AddCfeSatResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AddCfeSatResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AddCfeSatResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AddCfeSatResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AddCfeSatResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AddCfeSatResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AddCfeSatResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AddCfeSatResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  addCfeSat(body: types.AddCfeSatBodyParam): Promise<FetchResponse<200, types.AddCfeSatResponse200>> {
    return this.core.fetch('/v1/vendas/cfe-sat', 'post', body);
  }

  /**
   * Cancela um Cupom Fiscal eletronico modelo 59 emitido em um PDV externo.
   *
   * @summary Cancela Cupom Fiscal eletronico
   * @throws FetchError<400, types.CancelaCfeSatResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.CancelaCfeSatResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.CancelaCfeSatResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.CancelaCfeSatResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.CancelaCfeSatResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.CancelaCfeSatResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.CancelaCfeSatResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.CancelaCfeSatResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.CancelaCfeSatResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  cancelaCfeSat(body: types.CancelaCfeSatBodyParam): Promise<FetchResponse<200, types.CancelaCfeSatResponse200>> {
    return this.core.fetch('/v1/vendas/cfe-sat/cancelar', 'post', body);
  }

  /**
   * Inutiliza Numeração de Cupom Fiscal eletronico modelo 59 emitido em um PDV externo.
   *
   * @summary Inutiliza Numeração de Cupom Fiscal eletronico
   * @throws FetchError<400, types.InutilizaCfeSatResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.InutilizaCfeSatResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.InutilizaCfeSatResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.InutilizaCfeSatResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.InutilizaCfeSatResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.InutilizaCfeSatResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.InutilizaCfeSatResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.InutilizaCfeSatResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.InutilizaCfeSatResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  inutilizaCfeSat(body: types.InutilizaCfeSatBodyParam): Promise<FetchResponse<200, types.InutilizaCfeSatResponse200>> {
    return this.core.fetch('/v1/vendas/cfe-sat/inutilizar', 'post', body);
  }

  /**
   * Inclui uma Nota Fiscal de Consumidor eletronico modelo 65 emitido em um PDV externo.
   *
   * @summary Incluir Nota Fiscal de Consumidor eletronico
   * @throws FetchError<400, types.AddNfceResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AddNfceResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AddNfceResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AddNfceResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AddNfceResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AddNfceResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AddNfceResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AddNfceResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AddNfceResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  addNfce(body: types.AddNfceBodyParam): Promise<FetchResponse<200, types.AddNfceResponse200>> {
    return this.core.fetch('/v1/vendas/nfce', 'post', body);
  }

  /**
   * Autoriza um Nota Fiscal de Consumidor eletronico modelo 59 emitido em um PDV externo que
   * está armazenado no SankhyaOm. É importante ressaltar que a NFC-e deve ter sido
   * previamente emitida em modo contingência (tipoEmissao = 9).
   *
   * @summary Autoriza Nota Fiscal de Consumidor eletronico que está em contigência
   * @throws FetchError<400, types.AutorizaCfeSatResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AutorizaCfeSatResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AutorizaCfeSatResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AutorizaCfeSatResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AutorizaCfeSatResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AutorizaCfeSatResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AutorizaCfeSatResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AutorizaCfeSatResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AutorizaCfeSatResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  autorizaCfeSat(body: types.AutorizaCfeSatBodyParam): Promise<FetchResponse<200, types.AutorizaCfeSatResponse200>> {
    return this.core.fetch('/v1/vendas/nfce/autorizar', 'post', body);
  }

  /**
   * Cancela uma Nota Fiscal de Consumidor eletronico modelo 65 emitido em um PDV externo.
   *
   * @summary Cancela Nota Fiscal de Consumidor eletronico
   * @throws FetchError<400, types.CancelaNfceResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.CancelaNfceResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.CancelaNfceResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.CancelaNfceResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.CancelaNfceResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.CancelaNfceResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.CancelaNfceResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.CancelaNfceResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.CancelaNfceResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  cancelaNfce(body: types.CancelaNfceBodyParam): Promise<FetchResponse<200, types.CancelaNfceResponse200>> {
    return this.core.fetch('/v1/vendas/nfce/cancelar', 'post', body);
  }

  /**
   * Inutiliza Numeração de Nota Fiscal de Consumidor eletronico modelo 65 emitido em um PDV
   * externo.
   *
   * @summary Inutiliza Numeração de Nota Fiscal de Consumidor eletronico
   * @throws FetchError<400, types.InutilizaNfceResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.InutilizaNfceResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.InutilizaNfceResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.InutilizaNfceResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.InutilizaNfceResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.InutilizaNfceResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.InutilizaNfceResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.InutilizaNfceResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.InutilizaNfceResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  inutilizaNfce(body: types.InutilizaNfceBodyParam): Promise<FetchResponse<200, types.InutilizaNfceResponse200>> {
    return this.core.fetch('/v1/vendas/nfce/inutilizar', 'post', body);
  }

  /**
   * Este endpoint permite realizar a abertura de um Caixa/PDV no SankhyaOm. Para que o
   * processo ocorra corretamente, o operador deve estar previamente vinculado ao cadastro do
   * PDV no SankhyaOm. 
   *
   * É importante observar que o SankhyaOm não permite mais de um "Caixa Aberto"
   * simultaneamente para o mesmo PDV, isso para garantir a integridade da operação.
   *
   * Ao abrir o Caixa/PDV, a API retornará o identificador codigoCaixa, que representa o
   * "Caixa Aberto" para o período em questão. Esse codigoCaixa deve ser utilizado para
   * realizar o fechamento do caixa e vincular todos os movimentos de venda ao respectivo
   * "Caixa Aberto", garantindo a correta rastreabilidade das operações.
   *
   * @summary Registra a abertura do Caixa/PDV
   * @throws FetchError<400, types.AddAbreCaixaPdvResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AddAbreCaixaPdvResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AddAbreCaixaPdvResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AddAbreCaixaPdvResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AddAbreCaixaPdvResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AddAbreCaixaPdvResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AddAbreCaixaPdvResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AddAbreCaixaPdvResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AddAbreCaixaPdvResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  addAbreCaixaPDV(body: types.AddAbreCaixaPdvBodyParam): Promise<FetchResponse<200, types.AddAbreCaixaPdvResponse200>> {
    return this.core.fetch('/v1/caixa/abertura', 'post', body);
  }

  /**
   * Retorna o codigoCaixa que está aberto para o critério enviado para consulta.
   *
   * @summary Busca o codigoCaixa aberto para o Caixa/PDV e Operador.
   * @throws FetchError<400, types.GetCaixaAbertoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.GetCaixaAbertoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.GetCaixaAbertoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.GetCaixaAbertoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.GetCaixaAbertoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.GetCaixaAbertoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.GetCaixaAbertoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.GetCaixaAbertoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.GetCaixaAbertoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  getCaixaAberto(metadata: types.GetCaixaAbertoMetadataParam): Promise<FetchResponse<200, types.GetCaixaAbertoResponse200>> {
    return this.core.fetch('/v1/caixa/aberto', 'get', metadata);
  }

  /**
   * Este serviço realiza o fechamento do Caixa/PDV que está aberto. Este processo permite
   * enviar os valores transacionados no Caixa/PDV por "Tipo de Pagamento", isso irá apoiar
   * no processo de Gestão de Caixa disponível no SankhyaOm.
   *
   * @summary Registra o fechamento do Caixa/PDV
   * @throws FetchError<400, types.AddFechaCaixaPdvResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AddFechaCaixaPdvResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AddFechaCaixaPdvResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AddFechaCaixaPdvResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AddFechaCaixaPdvResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AddFechaCaixaPdvResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AddFechaCaixaPdvResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AddFechaCaixaPdvResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AddFechaCaixaPdvResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  addFechaCaixaPDV(body: types.AddFechaCaixaPdvBodyParam): Promise<FetchResponse<200, types.AddFechaCaixaPdvResponse200>> {
    return this.core.fetch('/v1/caixa/fechamento', 'post', body);
  }

  /**
   * Registra sagria para um Caixa/PDV.
   *
   * @summary Registra sangria para um Caixa/PDV
   * @throws FetchError<400, types.AddSangriaCaixaPdvResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AddSangriaCaixaPdvResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AddSangriaCaixaPdvResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AddSangriaCaixaPdvResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AddSangriaCaixaPdvResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AddSangriaCaixaPdvResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AddSangriaCaixaPdvResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AddSangriaCaixaPdvResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AddSangriaCaixaPdvResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  addSangriaCaixaPDV(body: types.AddSangriaCaixaPdvBodyParam): Promise<FetchResponse<200, types.AddSangriaCaixaPdvResponse200>> {
    return this.core.fetch('/v1/caixa/sangria', 'post', body);
  }

  /**
   * Registra suprimento para um Caixa/PDV.
   *
   * @summary Registra suprimento para um Caixa/PDV
   * @throws FetchError<400, types.AddSuprimentoCaixaPdvResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AddSuprimentoCaixaPdvResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AddSuprimentoCaixaPdvResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AddSuprimentoCaixaPdvResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AddSuprimentoCaixaPdvResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AddSuprimentoCaixaPdvResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AddSuprimentoCaixaPdvResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AddSuprimentoCaixaPdvResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AddSuprimentoCaixaPdvResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  addSuprimentoCaixaPDV(body: types.AddSuprimentoCaixaPdvBodyParam): Promise<FetchResponse<200, types.AddSuprimentoCaixaPdvResponse200>> {
    return this.core.fetch('/v1/caixa/suprimento', 'post', body);
  }

  /**
   * Registra recebimento para um Caixa/PDV.
   *
   * @summary Registra recebimento para um Caixa/PDV
   * @throws FetchError<400, types.AddRecebimentoCaixaPdVincResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AddRecebimentoCaixaPdVincResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AddRecebimentoCaixaPdVincResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AddRecebimentoCaixaPdVincResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AddRecebimentoCaixaPdVincResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AddRecebimentoCaixaPdVincResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AddRecebimentoCaixaPdVincResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AddRecebimentoCaixaPdVincResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AddRecebimentoCaixaPdVincResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  addRecebimentoCaixaPDVinc(body: types.AddRecebimentoCaixaPdVincBodyParam): Promise<FetchResponse<200, types.AddRecebimentoCaixaPdVincResponse200>> {
    return this.core.fetch('/v1/caixa/recebimento', 'post', body);
  }

  /**
   * Registra recebimento para um Caixa/PDV.
   *
   * @summary Registra recebimento para um Caixa/PDV
   * @throws FetchError<400, types.AddRecebimentoCaixaPdVbaixaResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AddRecebimentoCaixaPdVbaixaResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AddRecebimentoCaixaPdVbaixaResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AddRecebimentoCaixaPdVbaixaResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AddRecebimentoCaixaPdVbaixaResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AddRecebimentoCaixaPdVbaixaResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AddRecebimentoCaixaPdVbaixaResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AddRecebimentoCaixaPdVbaixaResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AddRecebimentoCaixaPdVbaixaResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  addRecebimentoCaixaPDVbaixa(body: types.AddRecebimentoCaixaPdVbaixaBodyParam): Promise<FetchResponse<200, types.AddRecebimentoCaixaPdVbaixaResponse200>> {
    return this.core.fetch('/v1/caixa/recebimento/baixa', 'post', body);
  }

  /**
   * Este serviço retorna os preços do produto enviado no contexto e que estão associados à
   * tabela de preços enviada no contexto. Pode haver mais de um preço, pois o produto pode
   * ter volume alternativo, variação de preço por local de armazenamento e também preço
   * variado por controle (ex.: sabor, cor, tamanho, etc.). Este serviço retorna até 50
   * registros por página.
   *
   * @summary Obter preços vinculados a um produto e uma tabela de preço
   * @throws FetchError<400, types.GetPrecoProdutoTabelaResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.GetPrecoProdutoTabelaResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.GetPrecoProdutoTabelaResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.GetPrecoProdutoTabelaResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.GetPrecoProdutoTabelaResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.GetPrecoProdutoTabelaResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.GetPrecoProdutoTabelaResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.GetPrecoProdutoTabelaResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.GetPrecoProdutoTabelaResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  getPrecoProdutoTabela(metadata: types.GetPrecoProdutoTabelaMetadataParam): Promise<FetchResponse<200, types.GetPrecoProdutoTabelaResponse200>> {
    return this.core.fetch('/v1/precos/produto/{codigoProduto}/tabela/{codigoTabela}', 'get', metadata);
  }

  /**
   * Este serviço retorna os preços do produto enviado no contexto, bem como as tabelas de
   * preços nele relacionado. Vale ressaltar que cada produto x tabela de preços pode possuir
   * mais de um preço, pois o produto pode ter volume alternativo, variação de preço por
   * local de armazenamento e também preço variado por controle (ex.: sabor, cor, tamanho,
   * etc.). Este serviço retorna até 50 registros por página.
   *
   * @summary Obter preços vinculados a um produto independente da tabela de preço
   * @throws FetchError<400, types.GetPrecoProdutoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.GetPrecoProdutoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.GetPrecoProdutoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.GetPrecoProdutoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.GetPrecoProdutoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.GetPrecoProdutoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.GetPrecoProdutoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.GetPrecoProdutoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.GetPrecoProdutoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  getPrecoProduto(metadata: types.GetPrecoProdutoMetadataParam): Promise<FetchResponse<200, types.GetPrecoProdutoResponse200>> {
    return this.core.fetch('/v1/precos/produto/{codigoProduto}', 'get', metadata);
  }

  /**
   * Este serviço retorna os preços de todos os produtos vinculados à tabela de preços
   * enviada no contexto. Vale ressaltar que cada produto x tabela de preços pode possuir
   * mais de um preço, pois o produto pode ter volume alternativo, variação de preço por
   * local de armazenamento e também preço variado por controle (ex.: sabor, cor, tamanho,
   * etc.). Este serviço retorna até 50 registros por página.
   *
   * @summary Obter preços vinculados a um produto e uma tabela de preço
   * @throws FetchError<400, types.GetPrecoTabelaResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.GetPrecoTabelaResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.GetPrecoTabelaResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.GetPrecoTabelaResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.GetPrecoTabelaResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.GetPrecoTabelaResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.GetPrecoTabelaResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.GetPrecoTabelaResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.GetPrecoTabelaResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  getPrecoTabela(metadata: types.GetPrecoTabelaMetadataParam): Promise<FetchResponse<200, types.GetPrecoTabelaResponse200>> {
    return this.core.fetch('/v1/precos/tabela/{codigoTabela}', 'get', metadata);
  }

  /**
   * Este serviço retorna os preços dos produtos de forma contextualizada, levando em conta
   * as condições específicas de uma negociação. O preço pode variar com base em diversos
   * fatores, como forma de pagamento, localização do cliente, vendedor responsável pela
   * negociação, entre outros. A consulta permite até 50 produtos por solicitação.
   *
   * @summary Obter preços de produtos de forma contextualizada
   * @throws FetchError<400, types.GetPrecoContextoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.GetPrecoContextoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.GetPrecoContextoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.GetPrecoContextoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.GetPrecoContextoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.GetPrecoContextoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.GetPrecoContextoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.GetPrecoContextoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.GetPrecoContextoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  getPrecoContexto(body: types.GetPrecoContextoBodyParam): Promise<FetchResponse<200, types.GetPrecoContextoResponse200>> {
    return this.core.fetch('/v1/precos/contextualizado', 'post', body);
  }

  /**
   * Este endpoint permite o registro de uma nova requisição de admissão, incluindo
   * informações detalhadas sobre o trabalhador, seu cargo, categoria, dados contratuais e
   * cadastrais.
   *
   * @summary Criar uma nova requisição de admissão
   * @throws FetchError<400, types.PostV1FuncionariosAdmissaoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.PostV1FuncionariosAdmissaoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.PostV1FuncionariosAdmissaoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.PostV1FuncionariosAdmissaoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.PostV1FuncionariosAdmissaoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.PostV1FuncionariosAdmissaoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.PostV1FuncionariosAdmissaoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.PostV1FuncionariosAdmissaoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.PostV1FuncionariosAdmissaoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  postV1FuncionariosAdmissao(body: types.PostV1FuncionariosAdmissaoBodyParam): Promise<FetchResponse<200, types.PostV1FuncionariosAdmissaoResponse200>> {
    return this.core.fetch('/v1/funcionarios/admissao', 'post', body);
  }

  /**
   * Este endpoint permite buscar os detalhes de uma requisição de admissão existente.
   *
   * @summary Buscar detalhes de uma requisição de admissão
   */
  getV1FuncionariosAdmissaoCodigorequisicaoadmissao(metadata: types.GetV1FuncionariosAdmissaoCodigorequisicaoadmissaoMetadataParam): Promise<FetchResponse<200, types.GetV1FuncionariosAdmissaoCodigorequisicaoadmissaoResponse200>> {
    return this.core.fetch('/v1/funcionarios/admissao/{codigoRequisicaoAdmissao}', 'get', metadata);
  }

  /**
   * Disponível a partir da versão 4.32 do SankhyaOm, a API de Importação de Notas Fiscais de
   * Serviços Tomados foi projetada para simplificar e automatizar o processo de importação
   * de notas fiscais emitidas por fornecedores. Essa integração permite que empresas
   * importem de forma eficiente e segura os dados fiscais diretamente para seus sistemas de
   * gestão, eliminando a necessidade de inserção manual e reduzindo erros humanos.
   * - Benefícios de utilizar a API estão na eficiência operacional, redução de erros,
   * conformidade legal, integração flexivel e escalabilidade.
   * - Para evitar a duplicidade na escrituração de documentos, o serviço utiliza uma chave
   * única composta pelos seguintes elementos: CNPJ do Prestador, Número da Nota, Número do
   * RPS, Série da Nota e data de emissão. Essa chave única garante que cada documento fiscal
   * seja registrado apenas uma vez, prevenindo inconsistências e duplicações.
   *
   * @summary Importar Nota Fiscal de Serviço
   * @throws FetchError<400, types.PostV1FiscalServicosTomadosNfseResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.PostV1FiscalServicosTomadosNfseResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.PostV1FiscalServicosTomadosNfseResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.PostV1FiscalServicosTomadosNfseResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.PostV1FiscalServicosTomadosNfseResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.PostV1FiscalServicosTomadosNfseResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.PostV1FiscalServicosTomadosNfseResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.PostV1FiscalServicosTomadosNfseResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.PostV1FiscalServicosTomadosNfseResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  postV1FiscalServicosTomadosNfse(body: types.PostV1FiscalServicosTomadosNfseBodyParam): Promise<FetchResponse<200, types.PostV1FiscalServicosTomadosNfseResponse200>> {
    return this.core.fetch('/v1/fiscal/servicos-tomados/nfse', 'post', body);
  }

  /**
   * Inclui um Pedido de Venda no Sankhya Om, SEMPRE A CONFIRMAR. Os financeiros que serão
   * enviados não serão registrados como baixados, e sim pendentes. Obs.: a API não preve
   * configurações de parceiro, alíquotas de impostos, etc, os mesmos já devem estar
   * previamente configurados.
   *
   * @summary Incluir Pedido de Venda
   * @throws FetchError<400, types.AddPedidoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.AddPedidoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.AddPedidoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.AddPedidoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.AddPedidoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.AddPedidoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.AddPedidoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.AddPedidoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.AddPedidoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  addPedido(body: types.AddPedidoBodyParam): Promise<FetchResponse<200, types.AddPedidoResponse200>> {
    return this.core.fetch('/v1/vendas/pedidos', 'post', body);
  }

  /**
   * "A atualização de um Pedido de Venda já confirmado só é permitida se a TOP do pedido
   * estiver configurada com a opção 'Permitir Alteração após Confirmar' ativada. Alem disto,
   * na alteração de pedido, sempre enviar o itens e os financeiros."
   *
   * @summary Atualizar Pedido de Venda
   * @throws FetchError<400, types.PutPedidoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.PutPedidoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.PutPedidoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.PutPedidoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.PutPedidoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.PutPedidoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.PutPedidoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.PutPedidoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.PutPedidoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  putPedido(body: types.PutPedidoBodyParam, metadata: types.PutPedidoMetadataParam): Promise<FetchResponse<200, types.PutPedidoResponse200>> {
    return this.core.fetch('/v1/vendas/pedidos/{codigoPedido}', 'put', body, metadata);
  }

  /**
   * Cancela um Pedido de Venda disponível do Sankhya Om. Obs.: Pedidos faturados não serão
   * cancelados.
   *
   * @summary Cancela Pedido de Venda
   * @throws FetchError<400, types.PostCancelaPedidoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.PostCancelaPedidoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.PostCancelaPedidoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.PostCancelaPedidoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.PostCancelaPedidoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.PostCancelaPedidoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.PostCancelaPedidoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.PostCancelaPedidoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.PostCancelaPedidoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  postCancelaPedido(body: types.PostCancelaPedidoBodyParam, metadata: types.PostCancelaPedidoMetadataParam): Promise<FetchResponse<200, types.PostCancelaPedidoResponse200>> {
    return this.core.fetch('/v1/vendas/pedidos/{codigoPedido}/cancela', 'post', body, metadata);
  }

  /**
   * Permite acessar a lista de clientes cadastrados no ERP. A resposta da API contém apenas
   * os clientes ativos ou inativos que já foram cadastrados previamente no ERP.
   *
   * @summary Retornar lista de clientes
   * @throws FetchError<400, types.GetClienteResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.GetClienteResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.GetClienteResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.GetClienteResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.GetClienteResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.GetClienteResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.GetClienteResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.GetClienteResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.GetClienteResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  getCliente(metadata: types.GetClienteMetadataParam): Promise<FetchResponse<200, types.GetClienteResponse200>> {
    return this.core.fetch('/v1/parceiros/clientes', 'get', metadata);
  }

  /**
   * Permite incluir um cliente no ERP.
   *
   * @summary Incluir cliente
   * @throws FetchError<400, types.PostClienteResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.PostClienteResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.PostClienteResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.PostClienteResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<409, types.PostClienteResponse409> Conflito na operação. Geralmente ocorre quando o cadastro já existe. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.PostClienteResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.PostClienteResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.PostClienteResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.PostClienteResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.PostClienteResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  postCliente(body: types.PostClienteBodyParam): Promise<FetchResponse<200, types.PostClienteResponse200>> {
    return this.core.fetch('/v1/parceiros/clientes', 'post', body);
  }

  /**
   * Permite incluir um contato para um cliente já cadastrado.
   *
   * @summary Incluir contatos para o cliente
   * @throws FetchError<400, types.PostContatoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.PostContatoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.PostContatoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.PostContatoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<409, types.PostContatoResponse409> Conflito na operação. Geralmente ocorre quando o cadastro já existe. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.PostContatoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.PostContatoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.PostContatoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.PostContatoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.PostContatoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  postContato(body: types.PostContatoBodyParam, metadata: types.PostContatoMetadataParam): Promise<FetchResponse<200, types.PostContatoResponse200>> {
    return this.core.fetch('/v1/parceiros/clientes/{codigoCliente}/contatos', 'post', body, metadata);
  }

  /**
   * Permite atualizar um cliente previamente cadastrado.
   *
   * @summary Atualizar cliente
   * @throws FetchError<400, types.PutClienteResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.PutClienteResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.PutClienteResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.PutClienteResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<409, types.PutClienteResponse409> Conflito na operação. Geralmente ocorre quando o cadastro já existe. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.PutClienteResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.PutClienteResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.PutClienteResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.PutClienteResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.PutClienteResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  putCliente(body: types.PutClienteBodyParam, metadata: types.PutClienteMetadataParam): Promise<FetchResponse<200, types.PutClienteResponse200>> {
    return this.core.fetch('/v1/parceiros/clientes/{codigoCliente}', 'put', body, metadata);
  }

  /**
   * Permite atualizar um contato de um cliente previamente cadastrado
   *
   * @summary Atualizar contato do cliente
   * @throws FetchError<400, types.PutContatoClienteResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.PutContatoClienteResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.PutContatoClienteResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.PutContatoClienteResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<409, types.PutContatoClienteResponse409> Conflito na operação. Geralmente ocorre quando o cadastro já existe. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.PutContatoClienteResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.PutContatoClienteResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.PutContatoClienteResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.PutContatoClienteResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.PutContatoClienteResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  putContatoCliente(body: types.PutContatoClienteBodyParam, metadata: types.PutContatoClienteMetadataParam): Promise<FetchResponse<200, types.PutContatoClienteResponse200>> {
    return this.core.fetch('/v1/parceiros/clientes/{codigoCliente}/contatos/{codigoContato}', 'put', body, metadata);
  }

  /**
   * - Este serviço verifica apenas o estoque registrado no ERP Sankhya, sem considerar o
   * estoque do WMS.
   * - Ele leva em conta apenas o estoque próprio da empresa, ignorando produtos armazenados
   * por terceiros ou produtos de terceiros armazenados na empresa.
   * - Além disso, a API só retorna informações sobre produtos que tiveram movimentação de
   * estoque (entrada ou saída). Caso um produto tenha sido cadastrado, mas nunca tenha tido
   * movimentação, ele não aparecerá na resposta da API, em vez de retornar um valor "estoque
   * = zero".
   *
   * @summary Obter dados de estoque de um produto
   * @throws FetchError<400, types.GetEstoquePorProdutoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.GetEstoquePorProdutoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.GetEstoquePorProdutoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.GetEstoquePorProdutoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.GetEstoquePorProdutoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.GetEstoquePorProdutoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.GetEstoquePorProdutoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.GetEstoquePorProdutoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.GetEstoquePorProdutoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  getEstoquePorProduto(metadata: types.GetEstoquePorProdutoMetadataParam): Promise<FetchResponse<200, types.GetEstoquePorProdutoResponse200>> {
    return this.core.fetch('/v1/estoque/produtos/{codigoProduto}', 'get', metadata);
  }

  /**
   * - Permite obter o estoque de vários produtos. - Este serviço verifica apenas os estoques
   * registrado no ERP Sankhya, sem considerar os estoques do WMS.
   * - Ele leva em conta apenas os estoques próprio da empresa, ignorando produtos
   * armazenados por terceiros ou produtos de terceiros armazenados na empresa.
   * - Além disso, a API só retorna informações sobre produtos que tiveram movimentação de
   * estoque (entrada ou saída). Caso produtos tenham sido cadastrados, mas nunca tenham tido
   * movimentação, eles não aparecerão na resposta da API, em vez de retornar um valor
   * "estoque = zero".
   *
   * @summary Obter dados de estoque de vários produtos
   * @throws FetchError<400, types.GetEstoqueProdutosResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.GetEstoqueProdutosResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.GetEstoqueProdutosResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.GetEstoqueProdutosResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.GetEstoqueProdutosResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.GetEstoqueProdutosResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.GetEstoqueProdutosResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.GetEstoqueProdutosResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.GetEstoqueProdutosResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  getEstoqueProdutos(metadata: types.GetEstoqueProdutosMetadataParam): Promise<FetchResponse<200, types.GetEstoqueProdutosResponse200>> {
    return this.core.fetch('/v1/estoque/produtos', 'get', metadata);
  }

  /**
   * Este endpoint calcula os impostos incidentes sobre uma operação de venda. Com base nos
   * dados fornecidos, como empresa, cliente, produtos e despesas acessórias, a API retorna
   * os valores calculados, incluindo base de cálculo, alíquotas e valores de impostos.
   *
   * É importante ressaltar que toda a parametrização tributária deve ser previamente
   * configurada no SankhyaOm, pois o endpoint não realiza essa configuração, apenas aplica
   * as regras já definidas no SankhyaOm.
   *
   * @summary Calcular Impostos em Vendas
   * @throws FetchError<400, types.PostV1FiscalImpostosCalculoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.PostV1FiscalImpostosCalculoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.PostV1FiscalImpostosCalculoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.PostV1FiscalImpostosCalculoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.PostV1FiscalImpostosCalculoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.PostV1FiscalImpostosCalculoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.PostV1FiscalImpostosCalculoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.PostV1FiscalImpostosCalculoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.PostV1FiscalImpostosCalculoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  postV1FiscalImpostosCalculo(body: types.PostV1FiscalImpostosCalculoBodyParam): Promise<FetchResponse<200, types.PostV1FiscalImpostosCalculoResponse200>> {
    return this.core.fetch('/v1/fiscal/impostos/calculo', 'post', body);
  }

  /**
   * Endpoint `GET /v1/financeiros/receitas` - Fornece acesso aos dados financeiros de
   * receitas cadastrados no SankhyaOM.
   *
   * @summary Obter receitas
   * @throws FetchError<400, types.GetFinanceirosResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.GetFinanceirosResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.GetFinanceirosResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.GetFinanceirosResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.GetFinanceirosResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.GetFinanceirosResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.GetFinanceirosResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.GetFinanceirosResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.GetFinanceirosResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  getFinanceiros(metadata: types.GetFinanceirosMetadataParam): Promise<FetchResponse<200, types.GetFinanceirosResponse200>> {
    return this.core.fetch('/v1/financeiros/receitas', 'get', metadata);
  }

  /**
   * Registra financeiro de receita
   *
   * @summary Registra financeiro de receita
   * @throws FetchError<400, types.AddFinanceiroReceitaInclusaoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AddFinanceiroReceitaInclusaoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AddFinanceiroReceitaInclusaoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AddFinanceiroReceitaInclusaoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AddFinanceiroReceitaInclusaoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AddFinanceiroReceitaInclusaoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AddFinanceiroReceitaInclusaoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AddFinanceiroReceitaInclusaoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AddFinanceiroReceitaInclusaoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  addFinanceiroReceitaInclusao(body: types.AddFinanceiroReceitaInclusaoBodyParam): Promise<FetchResponse<200, types.AddFinanceiroReceitaInclusaoResponse200>> {
    return this.core.fetch('/v1/financeiros/receitas', 'post', body);
  }

  /**
   * Endpoint `PUT /v1/financeiros/receitas/{codigoFinanceiro}` - Atualiza os dados
   * financeiros de receitas cadastrados no SankhyaOM.
   *
   * @summary Atualizar Financeiro
   */
  addFinanceiroReceitaAtualizar(body: types.AddFinanceiroReceitaAtualizarBodyParam, metadata: types.AddFinanceiroReceitaAtualizarMetadataParam): Promise<FetchResponse<200, types.AddFinanceiroReceitaAtualizarResponse200>> {
    return this.core.fetch('/v1/financeiros/receitas/{codigoFinanceiro}', 'put', body, metadata);
  }

  /**
   * Realiza baixa da Receitas
   *
   * @summary Realiza baixa da Receitas
   */
  addFinanceiroReceitasBaixa(body: types.AddFinanceiroReceitasBaixaBodyParam, metadata: types.AddFinanceiroReceitasBaixaMetadataParam): Promise<FetchResponse<200, types.AddFinanceiroReceitasBaixaResponse200>> {
    return this.core.fetch('/v1/financeiros/receitas/{codigoFinanceiro}/baixa', 'post', body, metadata);
  }

  /**
   * Endpoint `GET /v1/financeiros/despesas` - Fornece acesso aos dados financeiros de
   * despesas lançados no SankhyaOM.
   *
   * @summary Obter Despesas
   * @throws FetchError<400, types.GetFinanceirosDespesasResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.GetFinanceirosDespesasResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.GetFinanceirosDespesasResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.GetFinanceirosDespesasResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.GetFinanceirosDespesasResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.GetFinanceirosDespesasResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.GetFinanceirosDespesasResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.GetFinanceirosDespesasResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.GetFinanceirosDespesasResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  getFinanceirosDespesas(metadata: types.GetFinanceirosDespesasMetadataParam): Promise<FetchResponse<200, types.GetFinanceirosDespesasResponse200>> {
    return this.core.fetch('/v1/financeiros/despesas', 'get', metadata);
  }

  /**
   * Registra financeiro de despesa
   *
   * @summary Registra financeiro de despesa
   * @throws FetchError<400, types.AddFinanceiroDespesaInclusaoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<401, types.AddFinanceiroDespesaInclusaoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<403, types.AddFinanceiroDespesaInclusaoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<404, types.AddFinanceiroDespesaInclusaoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<500, types.AddFinanceiroDespesaInclusaoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<501, types.AddFinanceiroDespesaInclusaoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<502, types.AddFinanceiroDespesaInclusaoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<503, types.AddFinanceiroDespesaInclusaoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   * @throws FetchError<504, types.AddFinanceiroDespesaInclusaoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   */
  addFinanceiroDespesaInclusao(body: types.AddFinanceiroDespesaInclusaoBodyParam): Promise<FetchResponse<200, types.AddFinanceiroDespesaInclusaoResponse200>> {
    return this.core.fetch('/v1/financeiros/despesas', 'post', body);
  }

  /**
   * Endpoint `PUT /v1/financeiros/despesas/{codigoFinanceiro}` - Atualiza os dados
   * financeiros de despesas cadastrados no SankhyaOM.
   *
   * @summary Atualizar Financeiro
   */
  addFinanceiroDespesaAtualizar(body: types.AddFinanceiroDespesaAtualizarBodyParam, metadata: types.AddFinanceiroDespesaAtualizarMetadataParam): Promise<FetchResponse<200, types.AddFinanceiroDespesaAtualizarResponse200>> {
    return this.core.fetch('/v1/financeiros/despesas/{codigoFinanceiro}', 'put', body, metadata);
  }

  /**
   * Realiza baixa da Despesa
   *
   * @summary Realiza baixa da Despesa
   */
  addFinanceiroDespesaBaixa(body: types.AddFinanceiroDespesaBaixaBodyParam, metadata: types.AddFinanceiroDespesaBaixaMetadataParam): Promise<FetchResponse<200, types.AddFinanceiroDespesaBaixaResponse200>> {
    return this.core.fetch('/v1/financeiros/despesas/{codigoFinanceiro}/baixa', 'post', body, metadata);
  }

  /**
   * Retorna a relação de naturezas com paginação.
   *
   * @summary Retorna Naturezas disponíveis
   */
  getV1Naturezas(metadata: types.GetV1NaturezasMetadataParam): Promise<FetchResponse<200, types.GetV1NaturezasResponse200>> {
    return this.core.fetch('/v1/naturezas', 'get', metadata);
  }

  /**
   * Retorna uma lista de centros de resultado analíticos e ativos com paginação.
   *
   * @summary Buscar Centros de Resultado Analíticos e Ativos
   * @throws FetchError<400, types.GetV1CentrosResultadoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.GetV1CentrosResultadoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.GetV1CentrosResultadoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.GetV1CentrosResultadoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.GetV1CentrosResultadoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.GetV1CentrosResultadoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.GetV1CentrosResultadoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.GetV1CentrosResultadoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.GetV1CentrosResultadoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  getV1CentrosResultado(metadata?: types.GetV1CentrosResultadoMetadataParam): Promise<FetchResponse<200, types.GetV1CentrosResultadoResponse200>> {
    return this.core.fetch('/v1/centros-resultado', 'get', metadata);
  }

  /**
   * Retorna uma lista de Tipos de Operação ativas com paginação.
   *
   * @summary Buscar Tipos de Operação Ativas no SankhyaOm
   * @throws FetchError<400, types.GetV1TiposOperacaoResponse400> Informações Inválidas. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<401, types.GetV1TiposOperacaoResponse401> Não autenticado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<403, types.GetV1TiposOperacaoResponse403> Autenticação inválida. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<404, types.GetV1TiposOperacaoResponse404> Dados não encontrados. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<500, types.GetV1TiposOperacaoResponse500> Erro interno no servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<501, types.GetV1TiposOperacaoResponse501> Não implementado. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<502, types.GetV1TiposOperacaoResponse502> Retorno inválido do servidor. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<503, types.GetV1TiposOperacaoResponse503> Serviço indisponível no momento. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   * @throws FetchError<504, types.GetV1TiposOperacaoResponse504> Tempo de execução excedido. Clique
   * [aqui](https://developer.sankhya.com.br/reference/c%C3%B3digos-de-retorno-da-api) para
   * mais detalhes.
   *
   */
  getV1TiposOperacao(metadata?: types.GetV1TiposOperacaoMetadataParam): Promise<FetchResponse<200, types.GetV1TiposOperacaoResponse200>> {
    return this.core.fetch('/v1/tipos-operacao', 'get', metadata);
  }
}

const createSDK = (() => { return new SDK(); })()
;

export default createSDK;

export type { AddAbreCaixaPdvBodyParam, AddAbreCaixaPdvResponse200, AddAbreCaixaPdvResponse400, AddAbreCaixaPdvResponse401, AddAbreCaixaPdvResponse403, AddAbreCaixaPdvResponse404, AddAbreCaixaPdvResponse500, AddAbreCaixaPdvResponse501, AddAbreCaixaPdvResponse502, AddAbreCaixaPdvResponse503, AddAbreCaixaPdvResponse504, AddCfeSatBodyParam, AddCfeSatResponse200, AddCfeSatResponse400, AddCfeSatResponse401, AddCfeSatResponse403, AddCfeSatResponse404, AddCfeSatResponse500, AddCfeSatResponse501, AddCfeSatResponse502, AddCfeSatResponse503, AddCfeSatResponse504, AddFechaCaixaPdvBodyParam, AddFechaCaixaPdvResponse200, AddFechaCaixaPdvResponse400, AddFechaCaixaPdvResponse401, AddFechaCaixaPdvResponse403, AddFechaCaixaPdvResponse404, AddFechaCaixaPdvResponse500, AddFechaCaixaPdvResponse501, AddFechaCaixaPdvResponse502, AddFechaCaixaPdvResponse503, AddFechaCaixaPdvResponse504, AddFinanceiroDespesaAtualizarBodyParam, AddFinanceiroDespesaAtualizarMetadataParam, AddFinanceiroDespesaAtualizarResponse200, AddFinanceiroDespesaBaixaBodyParam, AddFinanceiroDespesaBaixaMetadataParam, AddFinanceiroDespesaBaixaResponse200, AddFinanceiroDespesaInclusaoBodyParam, AddFinanceiroDespesaInclusaoResponse200, AddFinanceiroDespesaInclusaoResponse400, AddFinanceiroDespesaInclusaoResponse401, AddFinanceiroDespesaInclusaoResponse403, AddFinanceiroDespesaInclusaoResponse404, AddFinanceiroDespesaInclusaoResponse500, AddFinanceiroDespesaInclusaoResponse501, AddFinanceiroDespesaInclusaoResponse502, AddFinanceiroDespesaInclusaoResponse503, AddFinanceiroDespesaInclusaoResponse504, AddFinanceiroReceitaAtualizarBodyParam, AddFinanceiroReceitaAtualizarMetadataParam, AddFinanceiroReceitaAtualizarResponse200, AddFinanceiroReceitaInclusaoBodyParam, AddFinanceiroReceitaInclusaoResponse200, AddFinanceiroReceitaInclusaoResponse400, AddFinanceiroReceitaInclusaoResponse401, AddFinanceiroReceitaInclusaoResponse403, AddFinanceiroReceitaInclusaoResponse404, AddFinanceiroReceitaInclusaoResponse500, AddFinanceiroReceitaInclusaoResponse501, AddFinanceiroReceitaInclusaoResponse502, AddFinanceiroReceitaInclusaoResponse503, AddFinanceiroReceitaInclusaoResponse504, AddFinanceiroReceitasBaixaBodyParam, AddFinanceiroReceitasBaixaMetadataParam, AddFinanceiroReceitasBaixaResponse200, AddNfceBodyParam, AddNfceResponse200, AddNfceResponse400, AddNfceResponse401, AddNfceResponse403, AddNfceResponse404, AddNfceResponse500, AddNfceResponse501, AddNfceResponse502, AddNfceResponse503, AddNfceResponse504, AddPedidoBodyParam, AddPedidoResponse200, AddPedidoResponse400, AddPedidoResponse401, AddPedidoResponse403, AddPedidoResponse404, AddPedidoResponse500, AddPedidoResponse501, AddPedidoResponse502, AddPedidoResponse503, AddPedidoResponse504, AddRecebimentoCaixaPdVbaixaBodyParam, AddRecebimentoCaixaPdVbaixaResponse200, AddRecebimentoCaixaPdVbaixaResponse400, AddRecebimentoCaixaPdVbaixaResponse401, AddRecebimentoCaixaPdVbaixaResponse403, AddRecebimentoCaixaPdVbaixaResponse404, AddRecebimentoCaixaPdVbaixaResponse500, AddRecebimentoCaixaPdVbaixaResponse501, AddRecebimentoCaixaPdVbaixaResponse502, AddRecebimentoCaixaPdVbaixaResponse503, AddRecebimentoCaixaPdVbaixaResponse504, AddRecebimentoCaixaPdVincBodyParam, AddRecebimentoCaixaPdVincResponse200, AddRecebimentoCaixaPdVincResponse400, AddRecebimentoCaixaPdVincResponse401, AddRecebimentoCaixaPdVincResponse403, AddRecebimentoCaixaPdVincResponse404, AddRecebimentoCaixaPdVincResponse500, AddRecebimentoCaixaPdVincResponse501, AddRecebimentoCaixaPdVincResponse502, AddRecebimentoCaixaPdVincResponse503, AddRecebimentoCaixaPdVincResponse504, AddSangriaCaixaPdvBodyParam, AddSangriaCaixaPdvResponse200, AddSangriaCaixaPdvResponse400, AddSangriaCaixaPdvResponse401, AddSangriaCaixaPdvResponse403, AddSangriaCaixaPdvResponse404, AddSangriaCaixaPdvResponse500, AddSangriaCaixaPdvResponse501, AddSangriaCaixaPdvResponse502, AddSangriaCaixaPdvResponse503, AddSangriaCaixaPdvResponse504, AddSuprimentoCaixaPdvBodyParam, AddSuprimentoCaixaPdvResponse200, AddSuprimentoCaixaPdvResponse400, AddSuprimentoCaixaPdvResponse401, AddSuprimentoCaixaPdvResponse403, AddSuprimentoCaixaPdvResponse404, AddSuprimentoCaixaPdvResponse500, AddSuprimentoCaixaPdvResponse501, AddSuprimentoCaixaPdvResponse502, AddSuprimentoCaixaPdvResponse503, AddSuprimentoCaixaPdvResponse504, AutorizaCfeSatBodyParam, AutorizaCfeSatResponse200, AutorizaCfeSatResponse400, AutorizaCfeSatResponse401, AutorizaCfeSatResponse403, AutorizaCfeSatResponse404, AutorizaCfeSatResponse500, AutorizaCfeSatResponse501, AutorizaCfeSatResponse502, AutorizaCfeSatResponse503, AutorizaCfeSatResponse504, CancelaCfeSatBodyParam, CancelaCfeSatResponse200, CancelaCfeSatResponse400, CancelaCfeSatResponse401, CancelaCfeSatResponse403, CancelaCfeSatResponse404, CancelaCfeSatResponse500, CancelaCfeSatResponse501, CancelaCfeSatResponse502, CancelaCfeSatResponse503, CancelaCfeSatResponse504, CancelaNfceBodyParam, CancelaNfceResponse200, CancelaNfceResponse400, CancelaNfceResponse401, CancelaNfceResponse403, CancelaNfceResponse404, CancelaNfceResponse500, CancelaNfceResponse501, CancelaNfceResponse502, CancelaNfceResponse503, CancelaNfceResponse504, GetCaixaAbertoMetadataParam, GetCaixaAbertoResponse200, GetCaixaAbertoResponse400, GetCaixaAbertoResponse401, GetCaixaAbertoResponse403, GetCaixaAbertoResponse404, GetCaixaAbertoResponse500, GetCaixaAbertoResponse501, GetCaixaAbertoResponse502, GetCaixaAbertoResponse503, GetCaixaAbertoResponse504, GetClienteMetadataParam, GetClienteResponse200, GetClienteResponse400, GetClienteResponse401, GetClienteResponse403, GetClienteResponse404, GetClienteResponse500, GetClienteResponse501, GetClienteResponse502, GetClienteResponse503, GetClienteResponse504, GetEstoquePorProdutoMetadataParam, GetEstoquePorProdutoResponse200, GetEstoquePorProdutoResponse400, GetEstoquePorProdutoResponse401, GetEstoquePorProdutoResponse403, GetEstoquePorProdutoResponse404, GetEstoquePorProdutoResponse500, GetEstoquePorProdutoResponse501, GetEstoquePorProdutoResponse502, GetEstoquePorProdutoResponse503, GetEstoquePorProdutoResponse504, GetEstoqueProdutosMetadataParam, GetEstoqueProdutosResponse200, GetEstoqueProdutosResponse400, GetEstoqueProdutosResponse401, GetEstoqueProdutosResponse403, GetEstoqueProdutosResponse404, GetEstoqueProdutosResponse500, GetEstoqueProdutosResponse501, GetEstoqueProdutosResponse502, GetEstoqueProdutosResponse503, GetEstoqueProdutosResponse504, GetFinanceirosDespesasMetadataParam, GetFinanceirosDespesasResponse200, GetFinanceirosDespesasResponse400, GetFinanceirosDespesasResponse401, GetFinanceirosDespesasResponse403, GetFinanceirosDespesasResponse404, GetFinanceirosDespesasResponse500, GetFinanceirosDespesasResponse501, GetFinanceirosDespesasResponse502, GetFinanceirosDespesasResponse503, GetFinanceirosDespesasResponse504, GetFinanceirosMetadataParam, GetFinanceirosResponse200, GetFinanceirosResponse400, GetFinanceirosResponse401, GetFinanceirosResponse403, GetFinanceirosResponse404, GetFinanceirosResponse500, GetFinanceirosResponse501, GetFinanceirosResponse502, GetFinanceirosResponse503, GetFinanceirosResponse504, GetPrecoContextoBodyParam, GetPrecoContextoResponse200, GetPrecoContextoResponse400, GetPrecoContextoResponse401, GetPrecoContextoResponse403, GetPrecoContextoResponse404, GetPrecoContextoResponse500, GetPrecoContextoResponse501, GetPrecoContextoResponse502, GetPrecoContextoResponse503, GetPrecoContextoResponse504, GetPrecoProdutoMetadataParam, GetPrecoProdutoResponse200, GetPrecoProdutoResponse400, GetPrecoProdutoResponse401, GetPrecoProdutoResponse403, GetPrecoProdutoResponse404, GetPrecoProdutoResponse500, GetPrecoProdutoResponse501, GetPrecoProdutoResponse502, GetPrecoProdutoResponse503, GetPrecoProdutoResponse504, GetPrecoProdutoTabelaMetadataParam, GetPrecoProdutoTabelaResponse200, GetPrecoProdutoTabelaResponse400, GetPrecoProdutoTabelaResponse401, GetPrecoProdutoTabelaResponse403, GetPrecoProdutoTabelaResponse404, GetPrecoProdutoTabelaResponse500, GetPrecoProdutoTabelaResponse501, GetPrecoProdutoTabelaResponse502, GetPrecoProdutoTabelaResponse503, GetPrecoProdutoTabelaResponse504, GetPrecoTabelaMetadataParam, GetPrecoTabelaResponse200, GetPrecoTabelaResponse400, GetPrecoTabelaResponse401, GetPrecoTabelaResponse403, GetPrecoTabelaResponse404, GetPrecoTabelaResponse500, GetPrecoTabelaResponse501, GetPrecoTabelaResponse502, GetPrecoTabelaResponse503, GetPrecoTabelaResponse504, GetV1CentrosResultadoMetadataParam, GetV1CentrosResultadoResponse200, GetV1CentrosResultadoResponse400, GetV1CentrosResultadoResponse401, GetV1CentrosResultadoResponse403, GetV1CentrosResultadoResponse404, GetV1CentrosResultadoResponse500, GetV1CentrosResultadoResponse501, GetV1CentrosResultadoResponse502, GetV1CentrosResultadoResponse503, GetV1CentrosResultadoResponse504, GetV1FuncionariosAdmissaoCodigorequisicaoadmissaoMetadataParam, GetV1FuncionariosAdmissaoCodigorequisicaoadmissaoResponse200, GetV1NaturezasMetadataParam, GetV1NaturezasResponse200, GetV1TiposOperacaoMetadataParam, GetV1TiposOperacaoResponse200, GetV1TiposOperacaoResponse400, GetV1TiposOperacaoResponse401, GetV1TiposOperacaoResponse403, GetV1TiposOperacaoResponse404, GetV1TiposOperacaoResponse500, GetV1TiposOperacaoResponse501, GetV1TiposOperacaoResponse502, GetV1TiposOperacaoResponse503, GetV1TiposOperacaoResponse504, InutilizaCfeSatBodyParam, InutilizaCfeSatResponse200, InutilizaCfeSatResponse400, InutilizaCfeSatResponse401, InutilizaCfeSatResponse403, InutilizaCfeSatResponse404, InutilizaCfeSatResponse500, InutilizaCfeSatResponse501, InutilizaCfeSatResponse502, InutilizaCfeSatResponse503, InutilizaCfeSatResponse504, InutilizaNfceBodyParam, InutilizaNfceResponse200, InutilizaNfceResponse400, InutilizaNfceResponse401, InutilizaNfceResponse403, InutilizaNfceResponse404, InutilizaNfceResponse500, InutilizaNfceResponse501, InutilizaNfceResponse502, InutilizaNfceResponse503, InutilizaNfceResponse504, LoginMetadataParam, PostCancelaPedidoBodyParam, PostCancelaPedidoMetadataParam, PostCancelaPedidoResponse200, PostCancelaPedidoResponse400, PostCancelaPedidoResponse401, PostCancelaPedidoResponse403, PostCancelaPedidoResponse404, PostCancelaPedidoResponse500, PostCancelaPedidoResponse501, PostCancelaPedidoResponse502, PostCancelaPedidoResponse503, PostCancelaPedidoResponse504, PostClienteBodyParam, PostClienteResponse200, PostClienteResponse400, PostClienteResponse401, PostClienteResponse403, PostClienteResponse404, PostClienteResponse409, PostClienteResponse500, PostClienteResponse501, PostClienteResponse502, PostClienteResponse503, PostClienteResponse504, PostContatoBodyParam, PostContatoMetadataParam, PostContatoResponse200, PostContatoResponse400, PostContatoResponse401, PostContatoResponse403, PostContatoResponse404, PostContatoResponse409, PostContatoResponse500, PostContatoResponse501, PostContatoResponse502, PostContatoResponse503, PostContatoResponse504, PostV1FiscalImpostosCalculoBodyParam, PostV1FiscalImpostosCalculoResponse200, PostV1FiscalImpostosCalculoResponse400, PostV1FiscalImpostosCalculoResponse401, PostV1FiscalImpostosCalculoResponse403, PostV1FiscalImpostosCalculoResponse404, PostV1FiscalImpostosCalculoResponse500, PostV1FiscalImpostosCalculoResponse501, PostV1FiscalImpostosCalculoResponse502, PostV1FiscalImpostosCalculoResponse503, PostV1FiscalImpostosCalculoResponse504, PostV1FiscalServicosTomadosNfseBodyParam, PostV1FiscalServicosTomadosNfseResponse200, PostV1FiscalServicosTomadosNfseResponse400, PostV1FiscalServicosTomadosNfseResponse401, PostV1FiscalServicosTomadosNfseResponse403, PostV1FiscalServicosTomadosNfseResponse404, PostV1FiscalServicosTomadosNfseResponse500, PostV1FiscalServicosTomadosNfseResponse501, PostV1FiscalServicosTomadosNfseResponse502, PostV1FiscalServicosTomadosNfseResponse503, PostV1FiscalServicosTomadosNfseResponse504, PostV1FuncionariosAdmissaoBodyParam, PostV1FuncionariosAdmissaoResponse200, PostV1FuncionariosAdmissaoResponse400, PostV1FuncionariosAdmissaoResponse401, PostV1FuncionariosAdmissaoResponse403, PostV1FuncionariosAdmissaoResponse404, PostV1FuncionariosAdmissaoResponse500, PostV1FuncionariosAdmissaoResponse501, PostV1FuncionariosAdmissaoResponse502, PostV1FuncionariosAdmissaoResponse503, PostV1FuncionariosAdmissaoResponse504, PutClienteBodyParam, PutClienteMetadataParam, PutClienteResponse200, PutClienteResponse400, PutClienteResponse401, PutClienteResponse403, PutClienteResponse404, PutClienteResponse409, PutClienteResponse500, PutClienteResponse501, PutClienteResponse502, PutClienteResponse503, PutClienteResponse504, PutContatoClienteBodyParam, PutContatoClienteMetadataParam, PutContatoClienteResponse200, PutContatoClienteResponse400, PutContatoClienteResponse401, PutContatoClienteResponse403, PutContatoClienteResponse404, PutContatoClienteResponse409, PutContatoClienteResponse500, PutContatoClienteResponse501, PutContatoClienteResponse502, PutContatoClienteResponse503, PutContatoClienteResponse504, PutPedidoBodyParam, PutPedidoMetadataParam, PutPedidoResponse200, PutPedidoResponse400, PutPedidoResponse401, PutPedidoResponse403, PutPedidoResponse404, PutPedidoResponse500, PutPedidoResponse501, PutPedidoResponse502, PutPedidoResponse503, PutPedidoResponse504 } from './types';
