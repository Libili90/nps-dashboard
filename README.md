# 📊 Dashboard NPS Interactif

Dashboard professionnel pour l'analyse des retours clients NPS avec analyse IA des verbatims.

![Dashboard Preview](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Fonctionnalités

### 📈 Analyse de données
- **Upload dynamique** des fichiers Excel (Compo + NPS)
- **Correspondance automatique** via LogID (10 premiers caractères)
- **Calcul du NPS** global et par segment (TL, compétence, agent)
- **Taux de résolution** automatique
- **Gestion des doublons** intelligente

### 🔍 Filtres intelligents
- **Auto-complétion** pour Log et Nom d'agent
- **Cases à cocher** pour TL et Compétences
- **Filtre de date** (agents actifs, avant/après une date)
- **Période NPS** par mois
- **Filtres interconnectés** qui se recalculent automatiquement

### 📊 Visualisations
- **KPI Cards** : NPS Global, Nb Enquêtes, Taux Résolution, Évolution
- **Graphique en ligne** : Évolution du NPS mensuelle
- **Graphiques en barres** : Top/Bottom TL, NPS par Compétence
- **Distribution des scores** : Visualisation 0-10
- **Table détaillée** par agent avec tri et recherche

### 🤖 Analyse IA
- **Extraction des thèmes** principaux des verbatims
- **Identification des points faibles**
- **Plan d'action 30/60/90 jours** avec KPIs
- **Tags automatiques** (#délai, #empathie, #technique, etc.)
- **Support OpenAI GPT-4** et **Google Gemini**

### 📥 Export
- **Export CSV** complet avec toutes les données et métriques calculées

---

## 🛠️ Installation et déploiement

### Option 1 : Déploiement sur GitHub Pages (Recommandé)

#### 1️⃣ Créer un nouveau repository
Sur GitHub, créez un nouveau repository public (ex: nps-dashboard)

#### 2️⃣ Cloner et ajouter les fichiers
```bash
git clone https://github.com/VOTRE_USERNAME/nps-dashboard.git
cd nps-dashboard

# Copiez les 3 fichiers principaux :
# - index.html
# - style.css
# - main.js
```

#### 3️⃣ Pousser sur GitHub
```bash
git add .
git commit -m "Initial commit - Dashboard NPS"
git push origin main
```

#### 4️⃣ Activer GitHub Pages
1. Allez dans **Settings** > **Pages**
2. Source : sélectionnez **main branch**
3. Cliquez sur **Save**
4. Votre site sera disponible à : `https://VOTRE_USERNAME.github.io/nps-dashboard/`

---

## 📝 Format des fichiers Excel requis

### Fichier Compo (Logs)
**Colonnes obligatoires** :
- `Log` : Identifiant de l'agent
- `Nom et prénom` : Nom complet
- `Encadrants` : Nom du Team Leader
- `Compétence` : Compétence/Spécialité
- `Date fin` : Date de démission (vide si actif)

### Fichier NPS (Exportation)
**Colonnes obligatoires** :
- `ID_Agent` : Log de l'agent (10 caractères max)
- `Date d'appel` : Format dd/mm/yyyy
- Score NPS dans colonne `QID2`
- `QID3` : Verbatim du client
- Résolution : Oui/Non

---

## 🔑 Configuration de l'API IA

### OpenAI GPT-4
1. Créez un compte sur [OpenAI Platform](https://platform.openai.com/)
2. Générez une clé API
3. Format : `sk-proj-xxxxxxxxxxxxx`
4. Entrez la clé dans le dashboard

### Google Gemini
1. Créez un projet sur [Google AI Studio](https://makersuite.google.com/)
2. Générez une clé API
3. Format : `AIzaSyxxxxxxxxxxxxxx`
4. Entrez la clé dans le dashboard

⚠️ **Important** : Ne commitez JAMAIS vos clés API dans le repository !

---

## 🎯 Guide d'utilisation

### 1️⃣ Upload des fichiers
- Glissez-déposez le fichier **Compo** (logs)
- Glissez-déposez le fichier **NPS** (enquêtes)
- Cliquez sur **"Analyser les données"**

### 2️⃣ Filtrage intelligent
- **Log/Agent** : Tapez les premières lettres
- **TL/Compétences** : Cochez les cases
- **Date fin** : Sélectionnez les agents actifs ou par date
- **Période NPS** : Choisissez le mois

### 3️⃣ Analyse IA (optionnel)
- Entrez votre clé API
- Cliquez sur **"Lancer l'analyse IA"**
- Obtenez les insights automatiques

### 4️⃣ Export
- Cliquez sur **"📥 Exporter CSV"**
- Téléchargez toutes les données

---

## 🔒 Sécurité

- Les fichiers Excel sont traités **localement** dans le navigateur
- Aucune donnée envoyée à un serveur (sauf analyse IA)
- Les clés API ne sont **jamais stockées**

---

## 📄 Licence

Ce projet est sous licence MIT.

---

**Développé avec ❤️ pour améliorer l'expérience client**
```

---

## 📁 FICHIER 5/12 : .gitignore

Créez `.gitignore` :
```
# Fichiers Excel
*.xlsx
*.xls
*.xlsm
*.csv

# Dossier de données
/data/
/exports/

# API KEYS - NE JAMAIS COMMITER
.env
.env.local
config.js
secrets.json
api-keys.txt

# Système
.DS_Store
Thumbs.db
Desktop.ini

# Éditeurs
.vscode/
.idea/
*.sublime-*

# Logs
*.log
logs/

# Temporaires
tmp/
temp/
*.tmp
*.bak
