# Conditional URL

## Description
[Conditional URL](https://conditionalurl.web.app) is a link shortener app that allows you to create a url that conditionally redirects visitors based on some specified conditions. It runs serverless using Microsoft Azure Functions.

![Conditional URL](demo.png)

## Technologies
- [Azure Functions](https://azure.microsoft.com/en-us/products/functions/)
- [Azure Cosmos DB](https://azure.microsoft.com/en-us/services/cosmos-db/)
- [Redis](https://redis.com/redis-enterprise-cloud/overview/)
- [TypeScript](https://www.typescriptlang.org/download)
- [Vue 3](https://v3.vuejs.org/guide/introduction.html)
- [Tailwind CSS](https://tailwindcss.com/docs/guides/create-react-app)

## Installation
- Clone this repository 
```
git clone https://github.com/tamandrew/conditional-url.git
```
- Set up [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local?tabs=windows%2Ccsharp%2Cbash) and [Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/quickstart-portal).
- Set up environmental variables:
    - In `/frontend`, rename `.env.template` to `.env` and change the URLs if desired.
    - In `/functions`, rename `.env.template` to `.env` and add your Cosmos DB details, and a JWT Secret. 
        - GOOGLE_API_KEY is optional for scanning URLs with Google's Safe Browsing API. -
        - Redis credentials are optional for caching data. 


- To start Azure Functions Core Tools, run `npm start` in `/functions`
```
cd functions
npm start
```
- To start the frontend, in `/frontend` install npm dependencies and run `npm run dev`
```
cd frontend
npm install
npm run dev
```
