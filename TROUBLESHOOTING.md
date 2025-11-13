# 🔧 Guide de résolution des problèmes

## 📂 Problèmes d'upload

### ❌ "Erreur lors de la lecture du fichier"
**Solutions** :
- Vérifiez le format : `.xlsx` ou `.xls` uniquement
- Ouvrez le fichier dans Excel et ré-enregistrez
- Vérifiez les colonnes obligatoires

### ❌ "Aucune correspondance trouvée"
**Solutions** :
- Vérifiez que `ID_Agent` (NPS) correspond aux 10 premiers caractères de `Log` (Compo)
- Exemple : Compo `INF0135ABC` → NPS `INF0135` ✅

---

## 🔍 Problèmes de filtres

### ❌ "Les filtres ne fonctionnent pas"
**Solutions** :
- Cliquez sur **"Appliquer les filtres"**
- Vérifiez que vous avez des données dans la période
- Essayez **"Réinitialiser"**

---

## 📊 Problèmes d'affichage

### ❌ "Les graphiques sont vides"
**Solutions** :
- Ouvrez la console (F12) pour voir les erreurs
- Rechargez la page (Ctrl+R)
- Vérifiez qu'il y a au moins 3 enquêtes

### ❌ "404 - Page not found" (GitHub Pages)
**Solutions** :
- Attendez 2-3 minutes après activation
- Videz le cache (Ctrl+Shift+R)
- Vérifiez : Settings > Pages > Source = "main branch"

---

## 🤖 Problèmes d'analyse IA

### ❌ "Erreur API OpenAI: 401"
**Cause** : Clé API invalide
**Solutions** :
- Vérifiez votre clé sur https://platform.openai.com/api-keys
- Régénérez une nouvelle clé si nécessaire

### ❌ "Erreur API: 429"
**Cause** : Quota dépassé
**Solutions** :
- Vérifiez vos crédits sur https://platform.openai.com/usage
- Attendez quelques minutes

---

## 🆘 Besoin d'aide ?

- 📚 Consultez le [README.md](README.md)
- 🐛 Ouvrez une Issue sur GitHub
- 💬 Décrivez le problème avec captures d'écran

---

**💡 Astuce** : 90% des problèmes = vider le cache + réinitialiser les filtres !
