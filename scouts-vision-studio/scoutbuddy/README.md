# Q&A Assistance (backend chat)

Serveur Flask pour le chat **Q&A Assistance** dans l’app `scouts-vision-studio`. Réponses sur le scoutisme via **Groq** ou **Anthropic**.

## Prérequis

- Python 3.10+
- Une clé **Groq** (`gsk_...`, [console.groq.com](https://console.groq.com)) **ou** **Anthropic** (`sk-ant-...`, [console.anthropic.com](https://console.anthropic.com))

## Configuration

```bash
# Depuis la racine scouts-vision-studio
cp scoutbuddy/.env.example scoutbuddy/.env
# Éditer scoutbuddy/.env :
#   GROQ_API_KEY=gsk_...
#   ou
#   ANTHROPIC_API_KEY=sk-ant-...
```

Ne commitez pas `scoutbuddy/.env` (déjà dans `.gitignore`).

## Installation des dépendances Python

```bash
# Racine du repo front
npm run setup:chat-api
```

ou :

```bash
pip install -r scoutbuddy/requirements.txt
```

## Lancer le serveur chat

```bash
npm run qa-api
```

ou `npm run scoutbuddy` (alias). Le serveur écoute sur **http://127.0.0.1:5000**.

- Page standalone : http://127.0.0.1:5000  
- Santé : http://127.0.0.1:5000/health (`provider`, clés chargées)

## Intégration workspace

Avec **`npm run dev`**, les requêtes **`POST /api/scoutbuddy/chat`** sont traitées **directement par Node (Vite)** vers Groq — tu n’as **pas besoin** de lancer Python pour le chat dans l’app web (utile si Python ne peut pas joindre Groq sous Windows).

Pour la page autonome `http://localhost:5000`, lance encore **`npm run qa-api`**.

1. `npm run dev` (suffit pour **Q&A Assistance** dans le workspace)
2. Optionnel : `npm run qa-api` (page Flask seule ou secours)

## Fichiers

- `app.py` — routes `/`, `/chat`, `/health`
- `templates/index.html`, `static/` — UI autonome (même nom **Q&A Assistance**)
