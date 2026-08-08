# Medicinlager

En enkel, installerbar webbapp (PWA) för att hålla koll på dina läkemedel: hur många tabletter du har hemma, hur många som väntar på apoteket, och hur många dagar det räcker. Appen varnar dig när det är dags att hämta ut mer och när det är dags att kontakta läkaren för ett nytt recept.

All data sparas lokalt i telefonens webbläsare (`localStorage`) – inget skickas till någon server.

## Använda appen på Android

1. Öppna appens `index.html` i Chrome på din Android-telefon (t.ex. via GitHub Pages, eller genom att servera mappen lokalt, se nedan).
2. Tryck på menyn (⋮) i Chrome och välj **"Lägg till på startskärmen"**.
3. Appen får en egen ikon och öppnas i helskärm som en vanlig app, och fungerar även offline efter första besöket.

## Testa lokalt

Mappen behöver bara serveras som statiska filer, t.ex.:

```bash
cd medication-tracker
python3 -m http.server 8080
```

Öppna sedan `http://localhost:8080` i webbläsaren.

## Hur varningarna fungerar

Två inställningar styr varningarna (kan ändras under ⚙️ Inställningar i appen):

- **Hämta ut** (standard: 14 dagar) – varnar när tabletterna *hemma* räcker kortare tid än detta, och det finns något som väntar på apoteket att hämta ut.
- **Kontakta läkare** (standard: 21 dagar) – varnar när den *totala* mängden (hemma + apoteket) räcker kortare tid än detta. Tröskeln är längre än för uttag eftersom det ofta tar tid att få en läkartid och ett nytt recept.

Om tabletterna hemma tar helt slut visas en extra tydlig "Slut hemma"-varning.

## Lägga till/uppdatera ett läkemedel

För varje läkemedel anger du:

- Namn
- Antal tabletter hemma just nu
- Antal tabletter som väntar på apoteket
- Antal tabletter per dag (din dos)

Appen räknar sedan ut hur många dagar det räcker, live, varje gång du öppnar appen eller ändrar antal.
