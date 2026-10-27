# 🛍️ E-commerce Regional de Picuí – PB

> **Projeto acadêmico — Disciplina de Desenvolvimento e Execução de Projeto de Software**
>
> Plataforma de comércio eletrônico voltada à valorização dos comerciantes, artesãs e pequenos empreendedores de Picuí, Paraíba.

---

## 📌 Sobre o projeto

O **E-commerce Regional de Picuí – PB** consiste no desenvolvimento de uma plataforma de comércio eletrônico destinada à divulgação e comercialização de produtos de comerciantes, artesãs e pequenos empreendedores locais.

A proposta é reunir produtos e negócios regionais em um único ambiente digital, facilitando o acesso dos consumidores às ofertas disponíveis na cidade e ampliando a visibilidade dos empreendimentos locais.

Inicialmente, o projeto terá como foco o município de **Picuí, Paraíba**, considerando a possibilidade de expansão futura para outras cidades do Seridó Oriental Paraibano.

Além de seu propósito comercial, o projeto é desenvolvido como atividade avaliativa final da disciplina de **Desenvolvimento e Execução de Projeto de Software**, com o objetivo de aplicar conhecimentos relacionados ao planejamento, levantamento de requisitos, desenvolvimento, implementação, testes e acompanhamento de um projeto de software.

---

## 🎯 Objetivos

### Objetivo geral

Desenvolver uma plataforma de comércio eletrônico para Picuí–PB, destinada à divulgação de produtos e negócios locais, aplicando conhecimentos e práticas de desenvolvimento e execução de projetos de software.

### Objetivos específicos

- 🏪 Ampliar a visibilidade dos comerciantes, artesãs e pequenos empreendedores locais.
- 🛒 Disponibilizar um catálogo digital para consulta dos produtos.
- 🔎 Facilitar a pesquisa e a navegação por categorias de produtos.
- 👥 Permitir a apresentação dos vendedores e de seus empreendimentos.
- 📦 Implementar funcionalidades de carrinho e gerenciamento de pedidos, conforme o escopo definido.
- 📱 Desenvolver uma interface responsiva e intuitiva.
- 🗂️ Utilizar ferramentas de gerenciamento para organizar e acompanhar as atividades.
- 💻 Aplicar tecnologias de desenvolvimento web e banco de dados.
- 🧪 Realizar testes para verificar o funcionamento das funcionalidades implementadas.

---

## 💡 Justificativa

A transformação digital tem ampliado as possibilidades de comercialização de produtos e serviços. Entretanto, pequenos comerciantes e artesãs nem sempre dispõem de recursos técnicos ou financeiros para manter suas próprias lojas virtuais.

Diante desse cenário, o projeto propõe uma plataforma centralizada que facilite a divulgação dos negócios locais, aproxime comerciantes e consumidores e contribua para a valorização da economia regional.

A iniciativa também possui relevância acadêmica, pois permite aplicar, na prática, os conhecimentos adquiridos na disciplina de Desenvolvimento e Execução de Projeto de Software. O trabalho envolve a identificação de necessidades, o levantamento e a validação de requisitos, o planejamento das funcionalidades, a implementação da aplicação, a realização de testes e a documentação técnica.

Dessa forma, o projeto busca aliar o desenvolvimento de uma solução tecnológica a uma necessidade do comércio local, utilizando ferramentas e práticas que auxiliem na organização e na execução das atividades.

---

## ⚙️ Tecnologias e ferramentas

| Tecnologia / Ferramenta | Finalidade |
|:--|:--|
| 🐍 **Python** | Linguagem de programação utilizada no back-end. |
| 🌶️ **Flask** | Framework web responsável pelas rotas, regras de negócio e processamento das requisições. |
| 🧩 **Jinja** | Mecanismo de templates para geração dinâmica de páginas HTML a partir do Flask. |
| 🌐 **HTML5** | Estruturação do conteúdo das páginas. |
| 🎨 **CSS3** | Estilização e responsividade da interface. |
| ⚡ **JavaScript** | Implementação de interações e comportamentos dinâmicos no front-end. |
| 🗄️ **Supabase / PostgreSQL** | Persistência e gerenciamento dos dados da aplicação. |
| 📋 **Jira** | Organização, distribuição e acompanhamento das tarefas do projeto. |
| 🔀 **Git** | Controle de versão do código-fonte. |
| 🐙 **GitHub** | Hospedagem do repositório e colaboração no desenvolvimento. |

> **Nota técnica:** o Flask utiliza normalmente o Jinja2 como mecanismo de templates. A versão efetivamente utilizada deverá ser definida e registrada nas dependências do projeto.

---

## 🏗️ Arquitetura da aplicação

A aplicação será estruturada utilizando Flask no back-end e templates Jinja para a renderização das páginas.

O Flask será responsável por receber as requisições, processar as regras de negócio, consultar ou atualizar os dados e disponibilizar as informações necessárias à interface.

O Supabase será utilizado como solução de persistência, com PostgreSQL como banco de dados relacional. A integração poderá ser realizada por meio de uma biblioteca cliente ou de uma conexão apropriada com o banco de dados, conforme a arquitetura adotada.

A interface será construída com HTML, CSS e JavaScript, buscando manter a separação entre apresentação, processamento e armazenamento dos dados.

### 🔄 Fluxo simplificado

```text
👤 Usuário
    |
    v
🌐 Interface Web
 HTML + CSS + JavaScript
    |
    v
🌶️ Flask + Jinja
 Rotas e regras de negócio
    |
    v
🗄️ Supabase / PostgreSQL
 Persistência dos dados
```

---

## 🛒 Funcionalidades previstas

### 👥 Área pública

- Página inicial com apresentação da plataforma.
- Catálogo de produtos.
- Pesquisa e filtragem por categorias.
- Página de detalhes dos produtos.
- Página de comerciantes e artesãs.
- Perfil individual dos vendedores.
- Layout adaptado a computadores e dispositivos móveis.

### 🛍️ Área do consumidor

- Cadastro e autenticação, caso adotados.
- Consulta de produtos e vendedores.
- Carrinho de compras.
- Alteração de quantidades e remoção de itens.
- Finalização de pedidos.
- Consulta do histórico e do estado dos pedidos, caso implementada.

### 🏪 Área do comerciante

- Cadastro e edição de produtos.
- Gerenciamento de preços e disponibilidade.
- Consulta de pedidos relacionados aos seus produtos.
- Atualização do estado dos pedidos, conforme as permissões definidas.
- Edição das informações do próprio empreendimento.

### 🛡️ Área administrativa

- Gerenciamento de usuários e vendedores.
- Gerenciamento de produtos e categorias.
- Consulta e administração de pedidos.
- Controle das permissões de acesso.
- Moderação das informações publicadas na plataforma.

> As funcionalidades descritas representam o escopo previsto. A implementação definitiva dependerá dos requisitos validados e das prioridades estabelecidas para a primeira versão.

---

## 🗄️ Estrutura de dados prevista

O banco de dados deverá contemplar as principais entidades necessárias ao funcionamento da plataforma.

| Entidade | Descrição |
|:--|:--|
| 👤 Usuários | Dados de identificação e informações necessárias à autenticação. |
| 🏪 Vendedores | Informações dos comerciantes, artesãs e empreendimentos. |
| 📦 Produtos | Nome, descrição, preço, categoria, imagens e disponibilidade. |
| 🏷️ Categorias | Classificação dos produtos. |
| 🛒 Pedidos | Informações gerais das compras realizadas. |
| 🧾 Itens do pedido | Produtos, quantidades e valores de cada pedido. |
| 📍 Endereços | Informações necessárias à entrega, quando aplicável. |

O modelo definitivo será estabelecido durante o desenvolvimento, considerando os relacionamentos entre as entidades e as regras de negócio aprovadas.

---

## 📋 Gerenciamento e acompanhamento com Jira

O **Jira** será utilizado para organizar e acompanhar as atividades relacionadas ao desenvolvimento da plataforma.

A ferramenta permitirá dividir o trabalho em tarefas menores, definir prioridades e monitorar o andamento das atividades durante a execução do projeto.

### Organização das atividades

- 🗂️ **Épicos:** agrupamento de grandes funcionalidades do sistema.
- 📝 **Histórias de usuário:** descrição das necessidades dos usuários.
- ⚙️ **Tarefas:** atividades necessárias à implementação.
- 🔹 **Subtarefas:** divisão de atividades complexas em etapas menores.
- 🚦 **Status:** acompanhamento das atividades, como *A fazer*, *Em andamento* e *Concluído*.
- 🔝 **Prioridades:** identificação das tarefas mais importantes.
- ✅ **Critérios de aceitação:** condições necessárias para considerar uma atividade concluída.

### Etapas de desenvolvimento

1. 🔍 Levantamento e validação de requisitos.
2. 📝 Definição do escopo do sistema.
3. 📋 Planejamento e organização das tarefas no Jira.
4. 🎨 Prototipação e definição das interfaces.
5. 🗄️ Modelagem do banco de dados.
6. 💻 Desenvolvimento do front-end e do back-end.
7. 🔗 Integração com o banco de dados.
8. 🧪 Testes e correções.
9. 📚 Documentação e avaliação dos resultados.

As etapas poderão ser ajustadas conforme as necessidades identificadas durante a execução do projeto.

---

## 🔐 Segurança e qualidade

O desenvolvimento deverá considerar boas práticas de segurança e qualidade, incluindo:

- 🔒 Validação dos dados enviados pelos usuários.
- 🔑 Proteção das credenciais e das informações de conexão.
- 👮 Controle de acesso às funcionalidades administrativas.
- 🔐 Armazenamento seguro de senhas, caso exista autenticação própria.
- 🛡️ Aplicação das políticas de segurança do Supabase, incluindo Row Level Security (RLS), quando aplicável.
- 🧪 Testes dos principais fluxos de navegação e compra.
- 📱 Verificação da responsividade em diferentes dispositivos.
- ⚖️ Tratamento dos dados pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD).

As chaves privadas e as credenciais administrativas não deverão ser disponibilizadas no código-fonte público ou no front-end.

---

## 📈 Resultados esperados

Espera-se desenvolver um protótipo funcional de uma plataforma de comércio eletrônico para Picuí–PB, com interface responsiva, catálogo de produtos, apresentação dos vendedores e funcionalidades compatíveis com o escopo estabelecido.

No âmbito acadêmico, o projeto deverá demonstrar a aplicação prática dos conhecimentos relacionados ao desenvolvimento e à execução de projetos de software, incluindo levantamento de requisitos, planejamento, implementação, testes, acompanhamento das tarefas e documentação técnica.

Também se espera evidenciar como uma solução tecnológica pode contribuir para a divulgação e a valorização dos pequenos negócios locais.

---

## 🚧 Status do projeto

**Situação:** Planejamento e desenvolvimento.

O escopo, as funcionalidades e as decisões técnicas poderão ser ajustados conforme a validação dos requisitos e o andamento das atividades.

---

## 🎓 Contexto acadêmico

Este projeto é desenvolvido como **atividade avaliativa final da disciplina de Desenvolvimento e Execução de Projeto de Software**, com o propósito de integrar conhecimentos de desenvolvimento web às práticas de planejamento, implementação, testes e acompanhamento de projetos de software.

---

<div align="center">

**💚 Valorizando o comércio local por meio da tecnologia.**

*Picuí – Paraíba, Brasil*

</div>
