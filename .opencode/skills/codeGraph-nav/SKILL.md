---
name: codeGraph-nav
description: "Optimized CodeGraph MCP usage for code exploration and relationship queries. Use when the agent needs to trace code flows, find callers/callees, analyze class hierarchies, find dead code, or answer 'how does X work?' questions. NOT for simple text search — use grep for that."
compatibility: Requires codegraph MCP server (configured in opencode.json)
metadata:
  author: sisyphus
  version: "3.1"
---

# CodeGraph Navigator — Token-Optimized Queries

**Core principle (HARD RULE)**: Follow the **CodeGraph → grep** order strictly.

| Fase | Herramienta | Cuándo |
|------|-------------|--------|
| **🔷 1** | `codegraph_explore` (MCP tool) | Relaciones precisas (¿quién llama a quién?), flujos |
| **🔷 2** | `grep` / `glob` / `read` | **Solo si Fase 1 falló**, o texto literal (logs, strings, config) |

> **CRITICAL**: `codegraph_explore` is an **MCP tool**, NOT a CLI command. Never use `bash` to call `codegraph`. Always invoke it as an MCP tool directly (e.g., `codegraph_explore(query="...")`).

CodeGraph es una **base de datos de grafos**, no un buscador de texto. Antes de cualquier `grep`, verifica que CodeGraph no pueda responder primero.

---

## ⚡ Token Cost Reference

| Tool | Cost | Best for |
|------|------|----------|
| `grep` / `glob` | **~100-300 tokens** | "Where is X file?" |
| `read` (full file) | **~500-2000 tokens** | "What does this function/class do?" |
| `codegraph_explore` | **~200-800 tokens** | **PREFERRED** — relationships, flows, hierarchies, dead code |

---

## ⚠️ Known Limitations (this project)

1. **`codegraph_explore`** searches by **function/symbol name**. Class names may return partial results — use method names: `register`, `createUser`.
2. **`codegraph_explore`** cannot trace async flows (Outbox → EventBus → Listener). Only compile-time CALLS edges.
3. **Always exclude tests**: `AND NOT n.path CONTAINS '/test/'`
4. **Always LIMIT** Cypher queries to 15-30 resultados

---

## Query Templates (via MCP tool `codegraph_explore`)

All queries below are passed to the **MCP tool** `codegraph_explore` as natural language or Cypher.

> **Remember**: Call `codegraph_explore(query="...")` as an MCP tool. Do NOT use `bash` or any shell command.

### Trace function calls
```
MATCH (src:Function)-[:CALLS]->(dst:Function)  
WHERE src.name = 'register' AND src.path CONTAINS 'UserService'
  AND NOT dst.path CONTAINS '/test/'
RETURN src.name, dst.name, dst.path
```

### Multi-hop call chain
```
MATCH path = (src:Function)-[:CALLS*1..4]->(dst:Function)
WHERE src.name = 'createUser' AND src.path CONTAINS 'UserResource'
RETURN [n IN nodes(path) | n.name + ' @ ' + substring(n.path, 60)] AS chain
```

### Find files by path pattern
```
MATCH (n:Function)
WHERE n.path CONTAINS '/organization/'
  AND NOT n.path CONTAINS '/test/'
RETURN n.name, n.path
LIMIT 30
```

### Verify delegation / composition
```
MATCH (src:Function)-[:CALLS]->(dst:Function)
WHERE src.path CONTAINS 'Expediente'
  AND dst.path CONTAINS 'UnidadInformativaBase'
  AND NOT src.path CONTAINS '/test/'
  AND NOT dst.path CONTAINS '/test/'
RETURN src.name, dst.name, dst.path
ORDER BY src.name
```

### Cross-module dependencies
```
MATCH (src:Function)-[:CALLS]->(dst:Function)
WHERE src.path CONTAINS '/identity/'
  AND dst.path CONTAINS '/organization/'
  AND NOT src.path CONTAINS '/test/'
RETURN src.name, src.path, dst.name, dst.path
```

### Find function by partial name
```
MATCH (f:Function)
WHERE f.name CONTAINS 'pending'
  AND NOT f.path CONTAINS '/test/'
RETURN f.name, f.path
LIMIT 15
```

### Find dead code candidates
```
MATCH (f:Function)
WHERE NOT (f)-[:CALLS]-()
  AND NOT f.path CONTAINS '/test/'
  AND f.path CONTAINS '.java'
RETURN f.name, f.path
LIMIT 30
```

---

## Decision Matrix (orden estricto: CodeGraph → grep)

| Need | 1st (CodeGraph) | 2nd (grep/read) |
|------|-----------|-----------------|
| "Who calls this function?" | `codegraph_explore` ⭐ | `grep -r "funcName"` |
| "Does X delegate to Y?" | `codegraph_explore` ⭐ | Read both files |
| "Verify interface contract" | `codegraph_explore` ⭐ | Read implementation |
| "Full flow start to end?" | `codegraph_explore` ⭐ | `grep` + `read` sequential |
| "Explain user registration" | `codegraph_explore` ⭐ | grep+read |
| "What are the god nodes?" | `codegraph_explore` ⭐ | N/A |
| "Where is this file?" | `codegraph_explore` | `glob` / `grep` ⭐ |
| "What does this function do?" | N/A | `read` ⭐ |
| "Find text 'X' in code" | N/A | `grep` ⭐ |
| "Dead/unused code?" | `codegraph_explore` ⭐ | grep manual |
| "What does X do in **otro proyecto**?" | `codegraph_explore` + `projectPath` ⭐ | `grep` en ese repo |
| "How is Y used in **microservicio Z**?" | `codegraph_explore` + `projectPath` ⭐ | `grep` en ese repo |

> ⚠️ **Antes de cada grep**: intenta CodeGraph primero. grep es SIEMPRE el último recurso.
> 🌐 **Para otros proyectos**: SIEMPRE pasar `projectPath` — no asumas que todo está en el proyecto actual.

---

## 🌐 Cross-Project Queries (projectPath)

Para consultar un **proyecto diferente** al actual, usa el parámetro `projectPath` en `codegraph_explore`:

```
codegraph_explore(query="...", projectPath="/home/urgosxd/Desktop/js/otro-proyecto")
```

### Requisitos
- El proyecto debe tener un directorio `.codegraph/` en su raíz
- Si no existe, indexarlo primero: `cd /ruta/al/proyecto && codegraph init`
- Verificar estado: `codegraph status --project /ruta/al/proyecto`

### Ejemplos

| Query | projectPath |
|-------|-------------|
| `codegraph_explore(query="auth flow", projectPath="/home/urgosxd/Desktop/js/cmsPataRutera")` | Otro repo local |
| `codegraph_explore(query="UserService", projectPath="/home/urgosxd/Desktop/js/api-gateway")` | Microservicio distinto |
| `codegraph_explore(query="login")` | Sin projectPath = proyecto actual (sge) |

### CLI equivalente (fuera de MCP)

```bash
codegraph explore "auth flow" --project /ruta/otro-proyecto
codegraph files --project /ruta/otro-proyecto
codegraph status --project /ruta/otro-proyecto
```

> **Regla**: cuando el usuario pregunte por código de **otro proyecto/repo**, SIEMPRE pasar `projectPath`. No asumas que todo está en el proyecto actual.

---

## Guardrails (HARD RULES)

### 🚫 Orden de exploración (obligatorio)
1. **Antes de cualquier `grep`**: verifica que CodeGraph no pueda responder
2. **Si CodeGraph responde**: no uses grep para verificar — confía en el grafo
3. **grep = último recurso**: solo para texto literal (logs, strings, config) o cuando CodeGraph falló

### ✅ Reglas técnicas
- **Empieza siempre con `codegraph_explore`** (MCP tool) — nunca grep como primera opción
- **NUNCA uses `bash` para ejecutar `codegraph`** — no es un CLI, es un MCP tool
- **Nunca dupliques resultados de CodeGraph con grep** — confía en el grafo, luego lee
- **Siempre filtra tests** (`NOT n.path CONTAINS '/test/'`)
- **Siempre LIMIT** queries a 15-30 resultados
- **Para otros proyectos**: usar `projectPath` en `codegraph_explore`, nunca grep en otro repo


