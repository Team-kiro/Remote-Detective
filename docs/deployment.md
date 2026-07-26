# Despliegue — Remote Detective

_Requirements: 21.1_

Frontend y backend se despliegan de forma **completamente independiente**. El frontend publicado en Amplify funciona en modo local aunque el backend no exista, no esté disponible o tenga errores.

---

## Frontend — AWS Amplify

### Prerequisitos

- Cuenta de AWS con permisos para crear aplicaciones Amplify.
- Repositorio conectado a GitHub (o fork propio).

### Pasos de despliegue

1. **Conectar el repositorio en Amplify**

   En la consola de AWS Amplify → *Create new app* → *From Git* → seleccionar `Escarlatus/Remote-Detective` → rama `main`.

2. **Configuración de build**

   Amplify detecta `amplify.yml` en la raíz. El archivo define:
   - `npm ci` para instalar dependencias.
   - `npm run build` para compilar TypeScript y generar el bundle en `dist/`.
   - `dist/` como directorio de artefactos.
   - Caché de `node_modules` para builds más rápidos.

3. **Variables de entorno en Amplify (opcional)**

   Si se quiere habilitar el modo Bedrock, configurar en *App settings → Environment variables*:

   | Variable | Valor |
   |---|---|
   | `VITE_API_URL` | URL del API Gateway (obtenida tras el despliegue del backend) |
   | `VITE_INTERROGATION_MODE` | `bedrock` |

   Sin estas variables el frontend publicado funciona en modo local completo.

4. **Primera publicación**

   Amplify ejecuta el build automáticamente al conectar el repositorio. Las publicaciones posteriores ocurren en cada push a `main`.

### Verificación

- La URL HTTPS de Amplify debe mostrar la pantalla inicial del juego.
- El juego debe ser completamente jugable (iniciar partida, interrogar, arrastrar contradicciones, acusar) sin depender del backend.

---

## Backend — AWS SAM

### Prerequisitos

- AWS CLI configurado con credenciales (`aws configure`).
- AWS SAM CLI instalado (`brew install aws-sam-cli` o [instrucciones oficiales](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)).
- Permisos de IAM para crear funciones Lambda, APIs Gateway, roles IAM y acceder a Bedrock.
- Modelo Bedrock habilitado en la región destino (consola Bedrock → *Model access*).

### Compilar el backend

```bash
cd backend
npm ci
npm run build
```

Esto transpila TypeScript a JavaScript en `backend/dist/`.

### Ejecución local con SAM

```bash
cd backend
sam local start-api \
  --parameter-overrides \
    AllowedOrigins=http://localhost:5173 \
    BedrockModelId=anthropic.claude-3-haiku-20240307-v1:0
```

El endpoint queda disponible en `http://localhost:3000/interrogate`. Para que Bedrock responda se necesitan credenciales de AWS válidas con permiso `bedrock:InvokeModel`. Sin ellas el backend devuelve error y el frontend cae al fallback local automáticamente.

### Despliegue guiado (primera vez)

```bash
cd backend
sam deploy --guided
```

SAM solicita los parámetros interactivamente:

| Parámetro | Descripción | Ejemplo |
|---|---|---|
| Stack name | Nombre del stack CloudFormation | `remote-detective-backend` |
| AWS Region | Región de despliegue | `us-east-1` |
| AllowedOrigins | Orígenes CORS permitidos | `https://tu-app.amplifyapp.com,http://localhost:5173` |
| BedrockModelId | Modelo a invocar | `anthropic.claude-3-haiku-20240307-v1:0` |

SAM guarda los parámetros en `backend/samconfig.toml` (no incluir credenciales en este archivo).

### Despliegues posteriores

```bash
cd backend
npm run build
sam deploy
```

### Obtener la URL del API Gateway

```bash
aws cloudformation describe-stacks \
  --stack-name remote-detective-backend \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text
```

Esta URL es el valor de `VITE_API_URL` que se configura en Amplify.

### Recursos creados por SAM

| Recurso | Tipo | Descripción |
|---|---|---|
| `InterrogateFunction` | Lambda (Node.js 20) | Handler del endpoint `/interrogate` |
| API Gateway REST | API Gateway | Endpoint público con CORS |
| Rol IAM | IAM Role | Permisos mínimos: `bedrock:InvokeModel` |

### Eliminación del backend

```bash
aws cloudformation delete-stack --stack-name remote-detective-backend
```

---

## CI/CD — GitHub Actions

El archivo `.github/workflows/run-tests.yml` ejecuta automáticamente en cada PR a `main` y en cada push a `main`:

| Job | Comando | Descripción |
|---|---|---|
| `lint` | `npm run lint` | ESLint con `--max-warnings 0` |
| `type-check` | `npm run typecheck` | TypeScript estricto |
| `unit-tests` | `npm run test` | Suite Vitest (Vitest, no interactivo) |
| `e2e-tests` | `npm run test:e2e` | Suite Playwright con Chromium |

Los cuatro jobs corren en paralelo. Si alguno falla, el PR no puede fusionarse.

El CI **no despliega** ni a Amplify ni a SAM; el despliegue es un paso manual o se puede configurar por separado como workflow adicional de Amplify/CloudFormation.

---

## Resumen de URLs por entorno

| Entorno | Frontend | Backend |
|---|---|---|
| Desarrollo local | `http://localhost:5173` | `http://localhost:3000` (SAM local) |
| Producción | `https://<branch>.<app-id>.amplifyapp.com` | `https://<api-id>.execute-api.<region>.amazonaws.com/prod` |
