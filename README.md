# MusicBoxd

## Tech Stack

- Frontend:
  - **React (Vite):** Rychlý vývoj a renderování uživatelského rozhraní.
  - **React Router DOM:** Routování na straně klienta (SPA).
  - **Tailwind CSS:** Stylování aplikace pomocí utility tříd, tvorba responzivního glassmorphism designu a plynulých animací.
- Backend & Služby:
  - **Supabase:** Kompletní správa backendu.
    - _**Authentication:**_ Registrace, přihlášení a ověřování e-mailů
    - **_Database (PostgreSQL):_** Ukládání recenzí, uživatelských profilů a oblíbených alb
    - **_Storage:_** Zabezpečené ukládání a servírování uživatelských avatarů
  - **Spotify Web API:** Vyhledávání interpretů, získávání obalů alb, metadat a integrace audio přehrávače.

## Features

1. **Autentizace a Bezpečnost**
- Bezpečná registrace s nutností potvrzení e-mailové adresy
- Chráněné cesty (uživatel musí být přihlášen k zanechání recenze nebo úpravě profilu)
2. **Vyhledávání a Katalog**
- Live search s integrovaným "debounce" efektem napojený na Spotify API
- Zobrazení trendujících alb a detailní stránka každého alba včetně interaktivního Spotify iframe přehrávače
3. **Sociální funkce a Recenze** 
- Možnost hodnotit alba (1-5 hvězdiček) a psát vlastní textové recenze
- Zobrazení globálního feedu nejnovějších recenzí na domovské stránce
4. **Uživatelské profily**
- _**Soukromý profil:**_ Uživatel si může nastavit profilovou fotku (upload přes Supabase Storage), bio a vybrat svá "Top 4" (Essential Records) alba
- _**Veřejný profil:**_ Ostatní uživatelé si mohou prohlížet oblíbená alba a recenze daného autora bez přístupu k jeho citlivým datům (jako je e-mail), k čemuž se využívá dedikovaná SQL funkce v databázi



---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
