#!/bin/bash

# Ein Skript, um lokale Dateien in das GitHub-Repository hochzuladen.
# Führe dieses Skript in dem Ordner aus, der die Dateien enthält, die du hochladen möchtest.

# URL des Repositories
REPO_URL="https://github.com/ChrisRichGith/Mobile-Bastion/tree/feature/3d-tower-defense-game.git"

# --- Skript beginnt hier ---

# Überprüfe, ob git installiert ist
if ! command -v git &> /dev/null
then
    echo "Git ist nicht installiert. Bitte installiere es zuerst von https://git-scm.com/"
    exit 1
fi

echo "Git-Repository wird initialisiert..."
git init

echo "Dateien werden zum Commit hinzugefügt..."
git add .

echo "Commit wird erstellt..."
git commit -m "Initial commit: Projektdateien hochgeladen"

echo "Hauptbranch wird auf 'main' gesetzt..."
git branch -M main

echo "Remote-Repository wird hinzugefügt..."
# Prüfen, ob "origin" bereits existiert
if git remote | grep -q "origin"; then
    git remote set-url origin $REPO_URL
else
    git remote add origin $REPO_URL
fi

echo "Dateien werden in das GitHub-Repository hochgeladen..."
git push -u origin main

echo ""
echo "Fertig! Deine Dateien wurden erfolgreich zu GitHub hochgeladen."
echo "Du kannst sie unter https://github.com/ChrisRichGith/Fragmented-Realms-Alpha einsehen."
